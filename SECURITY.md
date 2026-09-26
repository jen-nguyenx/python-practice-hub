# Security

PyLadder is a static site. There is no server, no accounts, no login and no database we control. Everything
a student does stays in their own browser, in IndexedDB and `localStorage`, and is only shared if they
export a file themselves.

That shape decides what matters here. There is no other user's data to steal and no session to hijack, so
the realistic risks are: code the student pastes turning against them, a file they import corrupting or
freezing their own app, and the supply chain that delivers the page.

## What is defended, and how

**Python cannot reach JavaScript.** Student code runs through Pyodide in a Web Worker. The worker shares
the site's origin, so a route from Python to JavaScript would let a pasted snippet open the app's IndexedDB
and post a student's whole progress log to any server. The denylist in `src/runtime/python/sandbox.py`
cannot prevent this on its own: it decides by inspecting the calling frame, so `exec(compile(src, "<x>",
"exec"))` walks past it, and it can be sidestepped without importing anything at all, because an allowed
module reaches the others (`traceback.sys.modules["importlib"].import_module("js")`).

So the capability is removed rather than filtered. After the harness has imported what it needs,
`src/runtime/pyWorker.ts` runs `SEVER_JS_BRIDGE`, which drops Pyodide's `JsFinder` from `sys.meta_path` and
unloads the `js` and `pyodide` modules. There is then nothing to bypass. `scripts/smoke.ts` runs four known
escape routes against a production build on every CI run and fails the build if any of them reaches
JavaScript; the check has been verified to fail when the fix is removed.

The denylist stays as a teaching aid: it gives a clear "Importing sys is not available here" instead of a
confusing traceback. It is not the security boundary.

**R cannot reach the app either, by a different route.** STAT2402 runs R through webR, and R can run
JavaScript by design (`webr::eval_js()`); webR itself will not start unless its page allows `eval`. So R is
not given a page that has anything worth reaching. It runs in `public/r-sandbox.html`, loaded in an iframe
with `sandbox="allow-scripts"` and without `allow-same-origin`, which gives it an opaque origin: JavaScript
there has no storage of its own and cannot open the app's IndexedDB or localStorage, and the app's document
is cross-origin to it. webR's worker is a `blob:` worker created by that page, so it inherits both the
opaque origin and the frame's policy, which limits scripts and network to the pinned CDN. The console driver
(`src/runtime/r/driver.ts`) runs on the app side and only ever exchanges text with the frame over
`postMessage`. `scripts/lib/checks.ts` (`checkStatPath`, run by smoke and check:live) runs R that calls
`eval_js` to read its own origin and open IndexedDB, and fails unless the origin is opaque and storage is
refused; it also fails if the frame ever gains `allow-same-origin`. A runaway R program is stopped the same
way as Python's: the watchdog in `src/runtime/rClient.ts` removes the iframe, which ends its worker.

**Verifier-only code is not shipped.** `probe()` and `repl()` evaluate expressions in the namespace a
program left behind, so a lesson's outputs and pictures come from the interpreter rather than an author.
They are wrappers around `exec`/`eval` and only the content verifier calls them, so they live in
`_pl/verify.py`, which `PY_BROWSER_MODULES` excludes and the browser glob in `sources.ts` does not match.
They grant pasted code nothing it does not already have — the student can call `exec` directly — but
there is no reason to ship the surface, and a build check confirms it stays out.

What student code can still do, by design: use the in-memory virtual filesystem the CSV questions need, and
read the harness and test expectations. Neither matters, because the whole question bank including answers
already ships to the browser.

**A lesson never asserts what Python did.** Every output, value and error message in the lesson library is
recorded by the verifier running that code. The renderer will not fill a gap: when a block has no recorded
run, it shows nothing rather than claiming the program printed nothing, and a picture whose data is not
exactly the expected shape is not drawn at all rather than drawn from a filtered subset.

**A runaway program is always stoppable.** `src/runtime/pyClient.ts` arms a watchdog and calls
`Worker.terminate()`, which kills a thread spinning inside WebAssembly. Python code has no handle on it.

**Imported files are treated as hostile.** `src/store/validate.ts` allowlists every field against the id
catalogues, drops anything unknown, and caps string lengths, event counts, snapshot and scratch-file counts.
Timestamps are clamped to a believable window, because a merge keeps whichever record is newer and a
year-3000 timestamp would otherwise silently overwrite real work. Parsons indents and cloze answers are
range- and type-checked, since a crafted draft could otherwise freeze or blank a question permanently.

**A Content Security Policy ships with the page.** `scripts/vite-csp.ts` injects it at build time and hashes
every inline script, so the policy cannot drift from the page. `connect-src` limits where the page may talk
to. Two honest limits: a `<meta>` CSP cannot set `frame-ancestors`, and it does not cover the Python worker,
which takes its policy from response headers that GitHub Pages cannot set. The worker is protected by
severing the JavaScript bridge, not by the policy.

**No HTML is ever built from strings.** There is no `innerHTML`, `dangerouslySetInnerHTML`, `eval`,
`new Function` or `document.write` anywhere in the app. Markdown renders to Preact nodes, and link hrefs are
restricted to `http`/`https` in the parser, so `javascript:` URLs cannot be formed.

**Supply chain.** Dependency versions are exact, the lockfile carries integrity hashes for every package,
and Monaco is bundled from npm rather than a CDN. GitHub Actions are pinned to commit SHAs, not moving tags,
and the job that runs `npm ci` cannot publish: only the deploy job holds `pages: write`.

## Known and accepted

**Pyodide is fetched from jsdelivr at runtime.** The version is pinned and a test enforces it, but a dynamic
`import()` cannot carry an integrity hash, and Pyodide fetches its own WebAssembly and standard library
afterwards. A compromise of that CDN would mean arbitrary code in the worker for every user. Vendoring
Pyodide into `public/` would close this and make the app work offline, at the cost of roughly 10-25 MB in
the repository. Offline use was considered and deliberately set aside, so this risk is accepted rather
than merely outstanding: the pin plus its test is the mitigation. Revisit if the CDN dependency ever
becomes a practical problem rather than a theoretical one.

**R packages come from the app itself, not a package repository.** MASS, pscl and survival (with Matrix
and lattice) are kept in `public/r-packages/` and pinned by SHA-256 in `src/runtime/r/packages.json`. The app
fetches a package from its own origin, checks the hash with `crypto.subtle`, and only then hands the bytes to
the sandbox to unpack; the verifier checks the same hash before installing. Nothing is fetched from
repo.r-wasm.org at run time, and `install.packages()` is masked. `node scripts/r-packages.ts --update` is the
one way to change them.

**webR is fetched from jsdelivr at runtime,** like Pyodide: the version is pinned and a test checks it
against `package.json`, but the files cannot carry integrity hashes. The same risk, accepted for the same
reason, and smaller in effect: a compromised copy would run inside the opaque-origin sandbox described above,
with no access to a student's data. It is only downloaded by students who run R.

**Monaco depends on a version of DOMPurify with published advisories.** They are markdown-sanitiser bypasses.
Monaco only sanitises hover and suggestion markdown, and the only content reaching those paths here is the
student's own Python plus Monaco's built-in strings, so there is nothing for an attacker to author. The
advised fix is a Monaco downgrade, which would be a regression; the right move is to wait for a patched
Monaco. Tracked, not urgent.

**All GitHub Pages projects under one account share an origin.** Anything else published under the same
account can read and write PyLadder's stored data. Today everything there is the owner's own work. If
untrusted pages are ever hosted under that account, PyLadder should move to its own domain. Renaming storage
keys would not help; same-origin is same-origin.

**Google Fonts is a third-party request.** Each cold load sends the student's IP to Google. Not a security
defect, but it is the reason "nothing leaves your browser" is true of student work and not of page loads.
Self-hosting the three families would remove it.

**The time budget in `sandbox.py` can be dodged** by running code under a different filename, for the same
frame-inspection reason as the import check. The consequence is only that a runaway hits the hard worker
restart instead of a friendly "check that every loop can finish" message.

## Reporting

Open an issue at https://github.com/jen-nguyenx/python-practice-hub/issues. There is no user data to breach,
so please just describe it in the open.
