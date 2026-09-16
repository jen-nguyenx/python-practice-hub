# PyLadder: implementation plan

A practice app for CITS1401 Python students. **Status: awaiting approval (Checkpoint 0). No code is written until the decisions below are made.** Date: 2026-09-16.

> **Read the amendments first.** Two reviewers checked this plan after it was written. Every item in "Amendments after review" overrides the section it names. Research inputs are in `docs/plan/research/`.

## 0. Amendments after review (these override the sections below)

### 0.1 Decisions for the user at Checkpoint 0

1. **Timing and content order.** Today is week 8 of UWA Semester 2 2026. Exams run 26 October to the week of 2 November (askUWA 2026 dates). If the app is for a student sitting CITS1401 now, author content in urgency order after the engine is ready: recursion (T13), files and CSV (T9), project simulator (T12) with paper mode, then the rest. Otherwise use the topic order.
2. **Unlock default.** Add an `opened` mode that matches the literal request (topic N+1 unlocks once topic N has been opened). Offer `opened`, `attempt` (recommended: opened and one question submitted) and `mastery`. Topic 1 is always open. §2 must stop calling `attempt` the literal wording.
3. **Topic order.** Reading A: if/else, then for loops, then functions (the plan's current order). Reading B: if/else, then functions, then for loops. Variables stays as a short warm-up topic unless the user wants it merged into if/else. The order is data in `topics.ts`.
4. **Build and hosting.** Vite + TypeScript, deployed as a static site (recommended), or a no-build page set like sql-practice-hub using Monaco 0.52.2 (the last classic CDN build; its worker file was confirmed on cdnjs). Free GitHub Pages needs a public repo. Answers ship in the bundle either way.

### 0.2 Scope changes

- **Playground moves into the MVP (M2).** A free coding space with scratch files saved in IndexedDB, Run, a terminal with input, Problems and Explain. "Open in Playground" on every snippet. Only step-through stays an extra.
- **Beginner layout by default.** Prompt, editor and one Output/Tests panel. The full VS Code chrome (activity bar, explorer, six panel tabs, command palette) is opt-in under "More". A 60-second first-run tour. Plain words in the UI: "Hint 1-3", "Show answer", "score", "skill". Internal terms (L4, credit, channel, ladder rung) never appear in the UI.
- **Session data visible from the first attempt.** A "This session" card on the landing page and at session end: questions done, time, new mistakes, topics touched. A minimal session and mistake view ships in M6.
- **Report opens with one card:** "Strengths" and "Work on next". The detailed sections fold below it.
- **Topic test** (the test-out engine) is available on every open topic from M6.
- **Difficulty legend** on the chips: Easy is one idea and under 2 minutes; Medium combines two ideas, 2-6 minutes; Hard needs planning or hidden edge cases, 6-15 minutes.
- **Solution code is required** for every code format, enforced by the verifier. Paper mode reveals a model answer and a marks breakdown after Submit, and deducts 1 mark per syntax error (capped) instead of the removed "half penalty" rule.
- **Visual approval before build.** Checkpoint 1 reviews static mockups of the landing page and workbench in both themes.

### 0.3 Corrections to numbers

- Topic 3 gains one `multi` item so its format mix sums to 13. Totals: 155 questions, 42 easy / 64 medium / 49 hard, **102** core (not 104). The pilot of topics 1-4 is 42 questions.
- Totals are computed from `topics.ts` in a unit test so the plan and code cannot drift.
- Re-estimated effort if built by hand: M1 2.5 d, M2 3 d, M4 split into M4a runner and harness and M4b code-format UI (7 d total), M7 4 d, M10 4 d, content 1.75 d per topic. About 48 working days in total.
- Browser matrix: current Chrome, Firefox and Safari on macOS. Safari 16.4 cannot be tested on this machine.

### 0.4 Runtime and grading fixes

- **Import blocking:** wrap `builtins.__import__` and check that the caller's `co_filename` is `'<student>'`. A meta_path hook does not block modules already loaded, such as `os`. Do not purge stdlib modules after runs. Grader modules live in a private package `/pyladder/_pl/` so students cannot shadow them. Restore `input`, `print` and `open` in a `finally` block.
- **Recursion:** set a measured `sys.setrecursionlimit` (about 300-500) around student runs, map `RecursionError` to "no base case reached", detect Pyodide fatal errors and respawn automatically. M1 go/no-go includes `def f(n): return f(n+1)` with and without the tracer.
- **Output flooding:** count bytes inside the worker with `setStdout({write})`, raise `OutputLimit` at 64 KB, and flush to the main thread every 50 ms or 4 KB.
- **Top-level code:** exec once as a pre-flight. If module-level code crashes, times out or calls `input`, return one "top-level code crashed at line N" result (`top_level_code`) instead of failing every test.
- **Mutated arguments:** optional `setup` plus `argsUnchanged` on tests; the harness deep-copies and compares after the call, logging `mutated_input`.
- **Floats:** the verifier fails when `expect` contains a float and `cmp` is `eq` without `strictNum`; warns near round-half boundaries. `unordered` is a greedy match using the float comparison. testWriter compares with NaN equal to NaN and compares exception types separately, calling `ast.literal_eval` separately for each implementation.
- **Nondeterminism:** the verifier runs read-format snippets under two hash seeds and fails if outputs differ. Ban printing sets of strings and `id()` in read formats. Seed `random` only for tests and replays, not plain Playground runs.
- **Predict inputs:** `autocorrect`, `autocapitalize` and `spellcheck` off; map smart quotes and dashes to ASCII; no literal tabs in predict code; `stdoutFloat` rejected for predict, trace and twins.
- **Trace tables:** snapshot exactly once per execution of `anchorLine` (pending flag, then next line or return event). Fixture test with the §3.4 example.
- **Watchdog:** start only when the worker acknowledges `started {id}`; cap at min(sum + 3000, 6000) ms; stop the request on the first soft timeout and mark the rest "not run".
- **Frozen completion:** core counts only shipped questions, and a `topic_completed` event is never recomputed downward.
- **Concept checker:** before topic 4, allow exactly one top-level `def` in any code field whose name matches `fnName`.
- **Guessing:** twins get one check for "differs". Re-solves of revealed read-format items count only via a different question with the same concepts. The 0.9 cap applies only to code formats.

### 0.5 Editor, theme and accessibility fixes

- Register Run, Submit, F1 and Ctrl/Cmd+K chords with `editor.addCommand` so they override Monaco defaults. Single-key shortcuts are ignored in editable fields and can be turned off in Settings.
- Tab focus mode (Ctrl+M) is documented in the status bar and shortcut sheet. Textarea: Esc then Tab leaves the editor.
- Theme CSS: light palette on bare `:root`, dark under `prefers-color-scheme: dark` guarded by `:not([data-theme=light])`, and again under `[data-theme=dark]`. Set `color-scheme` per theme. Listen for OS changes and re-apply the Monaco theme.
- Await `document.fonts.load` for JetBrains Mono before creating Monaco, and call `remeasureFonts()` when fonts are ready.
- Set `editorBracketHighlight.foreground1-6` to palette colours (Monaco's default orchid breaks the no-purple rule). The hue-ban and contrast tests also scan the Monaco theme objects.
- Extend the Monarch Python tokenizer for function, builtin and def/class names, or drop those syntax rows. Contrast tests include editor line and selection colours.
- Add a `--border-control` token at 3:1 or more for inputs and toggles. Heat-map cells get their own text colour per step. The contrast test checks every text token against every surface, including hover.
- Accessibility is part of every milestone's definition of done (keyboard pass, labels, aria-live for results and runtime status, axe-core on renderers). M10 only audits.
- Choose Monaco with `(any-pointer: fine)` and width ≥ 700 px.
- Keep Monaco's word-based suggestions; the custom provider adds only keywords and builtins. Both are off in paper mode.
- Render user and imported text with DOM nodes and `textContent` only, never `innerHTML`. Validate imports against a schema and cap string lengths.

### 0.6 Storage and hosting fixes

- Every event gets `eid: crypto.randomUUID()`; import deduplicates on `eid` only.
- Session end is derived from the last event plus an idle tail; `focusedMs` is written on each attempt or run, not on `pagehide`.
- Call `navigator.storage.persist()` from a Settings button or after the first export, not at startup. Safari users get a stronger backup reminder at 5 days.
- One tab owns writes and the Pyodide worker (Web Locks or BroadcastChannel); other tabs show "PyLadder is open in another tab". Handle IndexedDB `versionchange`.
- Vite `base: './'`. Handle `vite:preloadError` with one reload. `verify --check` compares regenerated JSON in memory, not with git. The deploy workflow sets `pages: write` and `id-token: write`.
- Service worker: network-first for `index.html`, cache-first for hashed assets and the versioned Pyodide URLs, full CORS responses stored, caches named by build hash.
- `verbatimModuleSyntax: true`; content modules have no Vite-only imports; a CI step imports every content module under plain Node.
- The verifier emits `generated/question-index.json` for the landing page; topic content loads with dynamic `import()`; cheat-sheet code uses a small regex highlighter so Monaco stays lazy.

### 0.7 Design direction change

The draft look (near-black, Inter, neon green accent) is a common template look. The revised direction takes its accent colours from Python's own logo, which UWA's blue and gold happen to echo: Python blue for links, focus and the current item, and Python yellow for hints only. Green and red stay reserved for pass and fail. UI type is IBM Plex Sans; code stays JetBrains Mono. Tokens (all text tokens measured at 4.5:1 or more on every surface in both themes):

| Token | Light | Dark |
|---|---|---|
| bg | #f4f6f8 | #0d1117 |
| surface / surface-2 / surface-3 | #ffffff / #eceff3 / #e2e7ed | #141a21 / #1a2129 / #222a34 |
| border / border-control | #d5dbe2 / #7d8794 | #2a333e / #66717e |
| text / muted / faint | #14181d / #4a5460 / #5b6571 | #e3e8ee / #9ba6b3 / #8b96a3 |
| accent (Python blue) | #2c64a3 | #6aa6e6 |
| hint (Python yellow) / hint fill | #825c00 / #fff1bf | #f2c230 / #3a2f0a |
| pass / fail | #17753f / #b8322a | #4fc488 / #f07a6e |
| hard | #a8420c | #f59a5b |

---


---

## 1. Summary and recommendation

**Build PyLadder as one static single-page app: Vite 8.3.0 with vanilla TypeScript and no UI framework.**

- **Editor:** monaco-editor 0.56.0 from npm, with its worker bundled from the same origin. This gives the real VS Code editor.
- **Python:** Pyodide 314.0.7 runs real CPython in one long-lived module Web Worker, loaded from jsdelivr. The UI never hard-codes a Python version. It reads `sys.version` at boot. Expect 3.14, and confirm it in M1.
- **Storage:** progress lives in IndexedDB on the device, with JSON export and import.
- **Hosting:** GitHub Pages, deployed by a GitHub Actions workflow. Locally, run `npm run dev`. Opening the file directly (`file://`) is not supported, and the app detects it.

**Why this design:** two of the three judges picked the learner-first design. It fits the brief best:

- Every topic climbs a READ, then REPAIR, then WRITE ladder.
- One mistake catalogue feeds feedback, hints and reports.
- The workbench feels like VS Code.
- The default unlock rule is the user's literal one.

Vite avoids the fragile no-build Monaco 0.56 setup. It skips React, CI-heavy scaffolding and self-hosting Pyodide, which cuts the weight the judges criticised.

**Grafted from the other designs:**

- A verifier that runs every question in Node Pyodide.
- One typed content schema with committed generated outputs.
- A "Topic complete" moment.
- Resuming each question where the student left off.
- "Report this question".
- VS Code Dark+ and Light+ syntax colours.
- A textarea fallback on touch devices.
- A WCAG contrast test.

**Timeline:** a pilot of topics 1–4 reaches the student at the end of M6 (about 14 working days). The MVP that meets every requirement arrives at M7 (about 17 days). All 13 topics land at M10 (about 32 days).

---

## 2. Curriculum

The topic order follows the user's request: decisions come before for loops, and for loops before functions. Everything else follows the CITS1401 lecture and lab order. All 13 topics are listed below.

Format ids map to the curriculum research as follows:

| Format id | Covers |
|---|---|
| `mcq` | Single-answer questions and true/false |
| `multi` | Select all that apply |
| `predict` | Predict the output |
| `trace` | Trace table |
| `twins` | Spot the difference |
| `errorTranslator` | Error translator and which line raises |
| `cloze` | Fill in the blank |
| `parsons` | Parsons puzzle |
| `fixBug` | Fix the bug |
| `write` | Write a function. `mode:"paper"` gives a paper-exam item and `kind:"project"` gives a CSV project |
| `refactor` | Refactor to idiom |
| `testWriter` | Test writer |

Formats marked † arrive in M8, not in the launch set.

| # | id | Title | Band | Covers | Question mix (format × count) | E / M / H | Core |
|---|---|---|---|---|---|---|---|
| 1 | `variables-expressions` | Variables, types and expressions | Core · mid-sem | `/ // % **`, precedence, int/float/str/bool, conversions (`int('12.0')` raises), assignment tracing, snake_case names, `round`, f-strings (Lab 01) | mcq 3, multi 1, predict 3, trace† 1, cloze 1, fixBug 1, write 2 | 5 / 5 / 2 | 8 |
| 2 | `if-elif-else` | Decisions: if, elif, else and Boolean logic | Core · mid-sem | Comparisons, `and/or/not`, chained comparisons, `in`, elif vs separate ifs, flattening nested ifs, returning booleans (L7–8, Lab 03) | mcq 3, predict 2, twins† 1, multi 1, parsons 1, fixBug 1, write 2, refactor† 1 | 4 / 5 / 3 | 8 |
| 3 | `for-loops-range` | Definite loops with for and range() | Core · mid-sem | `range` bounds, accumulators, trace tables, loop plus if filters, Fibonacci and sums of squares (L5) | mcq 1, multi 1, predict 3, trace† 2, cloze 1, parsons 2, fixBug 1, write 2 (1 paper) | 4 / 6 / 3 | 9 |
| 4 | `functions-basics` | Functions part 1: def, parameters, return | Core · mid-sem | def, docstrings, parameters vs arguments, return vs print, using return values, built-ins (L9, Lab 02) | mcq 2, cloze 1, predict 2, errorTranslator† 1, parsons 1, fixBug 1, write 3, refactor† 1 | 4 / 5 / 3 | 8 |
| 5 | `strings` | Strings: indexing, slicing, methods | Core · mid-sem | Indexing and slicing, `[::-1]`, methods return new strings, building strings in loops, case-insensitive compare, ord/chr (L10–11) | mcq 1, predict 3, twins† 1, errorTranslator† 1, cloze 1, fixBug 1, write 4 (1 paper) | 4 / 5 / 3 | 8 |
| 6 | `lists-tuples` | Lists, tuples and sorting | Core · mid-sem | append, sort vs sorted, `key`/`reverse` and tie-breaks, tuple packing, multiple returns, lists of lists, aliasing (L12, Lab 04) | mcq 2, predict 2, trace† 1, twins† 1, parsons 1, fixBug 1, write 4 (1 paper), refactor† 1 | 4 / 5 / 4 | 9 |
| 7 | `while-nested-loops` | While loops, nested loops and series | Core · mid-sem | Sentinels, digit loops with `% //`, gcd, series until tolerance, combinations, merging sorted lists (L16–18) | mcq 1, predict 2, trace† 2, cloze 1, parsons 1, fixBug 1, write 5 (2 paper) | 3 / 5 / 5 | 8 |
| 8 | `dictionaries` | Dictionaries: counting, grouping, ranking | Core · mid-sem | get/items, counting, dict to sorted tuple list with tie-breaks, grouping, tuple keys (L20–21, Lab 05) | mcq 1, predict 2, errorTranslator† 1, cloze 1, parsons 1, fixBug 1, write 4 (1 paper), refactor† 1 | 3 / 5 / 4 | 8 |
| 9 | `files-csv-by-hand` | Text files and CSV parsing without imports | Projects + final | `with open`, strip/split, header-index lookup, skipping bad rows, writing files, one pass (L13–14) | mcq 1, predict 1, multi 1, cloze 1, parsons 1, fixBug 2, write 4 (virtual files; 1 paper) | 2 / 5 / 4 | 7 |
| 10 | `exceptions-graceful` | Exceptions and graceful termination | Projects + final | Reading tracebacks, specific `except`, returning `[]`/`None` instead of crashing, input validation (L19) | mcq 1, multi 1, predict 2, errorTranslator† 2, fixBug 1, write 3, testWriter† 1 | 3 / 5 / 3 | 7 |
| 11 | `functions-project-patterns` | Functions part 2: scope, defaults, the main() contract | Projects + final | Local/global scope, `None` defaults, helpers called from `main(csvfile)`, Moodle rules (no import/input/print, round at output) (L15 plus project specs) | mcq 1, predict 2, errorTranslator† 1, multi 1, fixBug 1, refactor† 2, write 4 (1 project) | 2 / 5 / 5 | 8 |
| 12 | `project-simulator` | Project simulator: CSV statistics and ranking | Projects + final | Mean, std and standard error by hand, cosine similarity, multi-level ranking, nested dicts, messy CSVs, one pass | mcq 1, predict 1, fixBug 1, write 5 (3 project), refactor† 1, testWriter† 1 | 1 / 4 / 5 | 6 |
| 13 | `recursion` | Recursion (mandatory exam question) | Projects + final | Base and recursive case, call-stack tracing, sum_digits and power, recursion over nested lists, no loops allowed (L27–28) | mcq 1, predict 2, trace† 2, errorTranslator† 1, parsons 1, fixBug 1, write 4 (2 paper, no-loop check) | 3 / 4 / 5 | 8 |
| | | **Total** | | | **155 questions** | **42 / 64 / 49** | **102** |

Scenario structure:

- Each topic has 3–4 scenarios with a Perth or UWA flavour, such as "Rottnest ferry" or "Transperth tap-ons".
- Each scenario holds a ladder of 3–5 questions.
- A scenario's displayed difficulty is **derived** (the min to max of its questions). It is never authored.

**Topic 2 card note:** "In lectures, for loops (week 3) come before if/else. Here decisions come first, as you asked. Nothing assessed is skipped."

**Pilot (M6):** topics 1–4 ship without their 7 † items, so 42 questions go out. Those 7 items are authored in M8.

**Early def use:** topics 1–3 need functions before topic 4, so their `write` items ship the `def` line, a docstring and `pass` as starter scaffolding. The concept checker allows `def` in starters only (see §3, verifier).

### Topic states

Each topic is in one of these states: `locked`, `open`, `in-progress`, `completed`, or `completed · review due`. Topics never lock again.

A topic is **completed** when all three of these hold:

- (a) Every core question has at least one submitted attempt.
- (b) Mastery is at least 70%. Mastery is the mean over core questions of the best *credit* per question. Credit is the score multiplied by the hint multiplier: 1.0 / 0.9 / 0.75 / 0.5 / 0.
- (c) At least one REPAIR item (parsons, fixBug or cloze) and one WRITE item (write or refactor) are solved without viewing L4.

Completion triggers the "Topic complete" moment in every unlock mode.

A revealed solution scores 0. Solving the same question again at least 24 hours later with no L4 replaces that 0, capped at 0.9. Parameterised variants (§11) would lift the cap.

### Unlock rule

The rule lives in one pure, tested function: `engine/unlock.ts → topicStatus(topicIndex, events, settings)`. It returns `{status, reason, progress}`.

`settings.unlockMode` (the "Topic N" in each row is the previous topic):

| Mode | Topic N+1 unlocks when… | Locked-card text example |
|---|---|---|
| `attempt` **(default: the user's literal wording)** | Topic N has been opened **and** at least one question in it submitted. A bare page view doesn't count. | "Unlocks when you try a question in Strings" |
| `checkpoint` | Every question in topic N's first scenario has been attempted | "Finish the Strings checkpoint: 3 of 5 attempted" |
| `mastery` | Topic N is **completed** (rule above) | "6/8 core attempted · 64% of 70% · write done · repair needed" |

- **Unlock everything** is a separate boolean, `settings.unlockAll`, not a mode. It is logged as an `override` event, and the report carries a caveat: "Topics 9–13 were opened before 8 was completed".
- **Test out** works in every mode. A locked topic whose predecessor is open offers a test on that predecessor:
  - 5 questions (1 predict or trace, 1 mcq, 1 fixBug or parsons, 2 write).
  - Medium and hard only, no hints, a 15-minute timer.
  - Scoring 4/5 or better marks the predecessor `completed (tested out)` and unlocks the topic.
  - After a failure, the student can retry after 3 practice questions in that topic or after 24 hours.
- **Never locked:** a locked topic's title, blurb, cheat sheet, worked example and "common mistakes here" preview stay readable. Only its questions are gated.

**Confirm with the user at the M2 checkpoint:** keep `attempt` as the default, or switch to `checkpoint` or `mastery`. Changing it is a one-line default change.

---

## 3. Question formats and grading

### 3.1 Shared schema

Content is written as TypeScript object literals, validated by the types and by the verifier. They are shown as JSON below.

`Format`, `MistakeId`, `AstFlag`, `ConceptId` and `RuleId` are closed string-literal unions derived from `as const` catalogues. A typo in a tag is a **type error**.

Every question has these base fields:

```json
{
  "id": "t03-s2-q4",
  "format": "write",
  "diff": "medium",
  "ladder": "write",
  "core": true,
  "concepts": ["for-range", "accumulator"],
  "detects": ["off_by_one_range", "accumulator_init"],
  "expectedSec": 240,
  "prompt": "Markdown-lite. Always states the return type exactly (e.g. 'return a tuple').",
  "hints": ["L1 nudge", "L2 subgoal plan", "L3 partial code"],
  "solution": { "code": "optional", "walkthrough": "L4 annotated explanation" },
  "selfExplain": "One-line question shown after L4",
  "allowFlags": [],
  "budgetMs": 1000
}
```

The test case type has **one expected encoding**:

```json
{ "id": "t1", "call": "min_max_mean([38.1, 41.2, 29.5])", "expect": "(29.5, 41.2, 36.27)",
  "cmp": "eq", "tol": 1e-6, "label": "three days", "hidden": false, "tag": "accumulator_init",
  "callTwice": false, "stdin": [], "files": [{ "name": "data_b", "content": "..." }] }
```

- `expect` is always a Python repr string, parsed in the harness with `ast.literal_eval`.
- `cmp` is one of `eq | float | dp4 | unordered | stdout`.

### 3.2 Comparison semantics

These are defined once and shared by the graders and the verifier.

**Value comparisons** happen in Python only (`harness.compare`):

- **`eq` (default):** structural and type-strict for containers, `str`, `bool` and `None`. A tuple never equals a list. `True` never equals `1`. `int` and `float` compare numerically (2 == 2.0) unless `strictNum:true`. A type mismatch reports "expected tuple, got list" and logs `return_type_wrong`.
- **`float`:** same as `eq`, but floats use `math.isclose(rel_tol=1e-9, abs_tol=tol ?? 1e-6)` recursively.
- **`dp4`:** each float must already equal `round(x, 4)` and match the expected value. Otherwise it reports "not rounded to 4 dp" (`return_type_wrong`). Used only when the prompt says "rounded to 4 dp".
- **`unordered`:** list-as-multiset comparison, used only when the prompt says "in any order".

**Stdout comparisons** happen in TypeScript only (`engine/normalize.ts → normalizeStdout`):

- Convert CRLF to LF, strip trailing whitespace from each line, drop trailing blank lines. Internal spaces are significant.
- `stdoutFloat` also compares numeric tokens with abs_tol 1e-6.
- The predict grader, program-kind tests and the verifier all import this one function.

### 3.3 Grader contract, hints and reveal

```ts
interface Grader<Q, R> {
  needsPython: boolean;
  grade(q: Q, response: R, ctx: { run: PyClient; expected: Generated }): Promise<GradeResult>;
}
interface GradeResult {
  correct: boolean; score: number;                 // 0..1 before hint weighting
  perItem?: { key: string; ok: boolean }[];
  mistakes: { id: MistakeId; channel: 'R'|'S'|'D'|'T'; line?: number }[];
  warnings: { flag: AstFlag; line: number }[];     // Problems panel; never lower score
  feedback: FeedbackItem[];
}
```

Detection channels: R = runtime, S = static AST, D = distractor, T = tagged test.

**Hint gates (same for every format, in `engine/hints.ts`):**

- **L1:** after the first check, or after 45 s.
- **Each later tier:** one more check, or 20 s spent on the previous tier.
- **L4 (solution):** after 2 failed checks, or when the student confirms "Show solution? This counts as practised, not mastered."
- **Runtime errors:** an auto-generated *Explain this error* card from the mistake catalogue appears as a free L0.
- **Skims:** a tier viewed for under 2 s is logged as a skim.
- **After L4:** the `selfExplain` prompt appears. Skipping it is logged.

**CodeRunner-style penalties are not used anywhere.** Scores are affected only by hint tiers. The report shows "first-submit pass rate" instead. This resolves the "penalty shown but not applied" confusion.

**AST warnings never reduce the score.** An AST-detected mistake is logged only when a tagged test for the same id also fails, or when the question's `detects` list names it and the student sets no `allowFlags`. Otherwise it stays a style warning.

| Format | Checks allowed | Auto-reveal |
|---|---|---|
| mcq, multi | 1 | Immediately after submit (the chosen option's `why`, then the correct explanation) |
| predict, trace, twins | 2 | After the 2nd check, with a "Run it" button |
| errorTranslator | 1 per step | After each step |
| cloze, parsons, testWriter | 3 (parsons adapts at 2) | After the 3rd check |
| fixBug, write, refactor | Unlimited Runs (visible tests); Submits run hidden tests | L4 offered after 2 failed Submits |

If checks run out without a correct answer, the best partial score is kept and the item is marked "retry later".

### 3.4 The twelve formats

#### 1. `mcq` (true/false uses `variant:"truefalse"` with 2 options)

- **Shape:** `code?`, `options:[{id, text, correct?, mistake?, why}]`
- **Grading:** by option id. A distractor logs its `mistake` on channel D.
- **Hints:** only L1–L2 are available before submitting.

```json
{
  "id": "t04-s1-q1", "format": "mcq", "diff": "easy", "ladder": "read", "core": true,
  "concepts": ["def", "return"], "detects": ["print_vs_return", "forgot_to_call"], "expectedSec": 60,
  "prompt": "Transperth fares. What does this program display?",
  "code": "def fare(zones):\n    print(zones * 2.5)\n\nx = fare(2)\nprint(x)",
  "options": [
    { "id": "a", "text": "5.0\nNone", "correct": true, "why": "fare prints 5.0 but has no return, so it returns None." },
    { "id": "b", "text": "5.0\n5.0", "mistake": "print_vs_return", "why": "Printing is not returning. x holds the return value, None." },
    { "id": "c", "text": "None", "mistake": "print_vs_return", "why": "The print inside fare still runs when fare(2) is called." },
    { "id": "d", "text": "An error", "mistake": "forgot_to_call", "why": "A function without return is valid; it returns None." }
  ],
  "hints": ["What does fare give back to the line x = fare(2)?", "Separate what is shown on screen from what is returned.", "fare(2) shows 5.0, then returns ..."],
  "solution": { "walkthrough": "Line 4 calls fare, which prints 5.0. With no return statement it returns None, so line 5 prints None." },
  "selfExplain": "What one-word change to fare would make x equal 5.0?"
}
```

#### 2. `multi` (select all that apply)

- **Shape:** `options:[{id, text, correct, mistakeIfPicked?, mistakeIfMissed?, why}]`
- **Grading:** score = max(0, TP − FP) / |correct|. Each wrong pick or miss logs its id.

```json
{
  "id": "t01-s3-q2", "format": "multi", "diff": "medium", "ladder": "read", "core": true,
  "concepts": ["conversion", "str-concat"], "detects": ["int_of_float_string", "str_int_concat"], "expectedSec": 90,
  "prompt": "Bus timetable clean-up. Select every line that raises an error.",
  "options": [
    { "id": "a", "text": "int('12.0')", "correct": true, "mistakeIfMissed": "int_of_float_string", "why": "ValueError: int() cannot parse a decimal string." },
    { "id": "b", "text": "float('12.0')", "correct": false, "mistakeIfPicked": "int_of_float_string", "why": "Valid: 12.0." },
    { "id": "c", "text": "int(12.9)", "correct": false, "mistakeIfPicked": "int_of_float_string", "why": "Valid: int() truncates a float to 12." },
    { "id": "d", "text": "'Bus ' + 950", "correct": true, "mistakeIfMissed": "str_int_concat", "why": "TypeError: can only concatenate str (not \"int\") to str." },
    { "id": "e", "text": "str(950) + ' bus'", "correct": false, "mistakeIfPicked": "str_int_concat", "why": "Valid: '950 bus'." }
  ],
  "hints": ["Two lines fail, for different reasons.", "Ask: is the argument text or a number? Is + joining the same types?", "Look closely at int('12.0') and 'Bus ' + 950."],
  "solution": { "walkthrough": "(a) ValueError, (d) TypeError. The others succeed." },
  "selfExplain": "How would you turn '12.0' into the integer 12?"
}
```

#### 3. `predict` (predict the output)

- **Shape:** `code`, `stdin?`, `answerMode:"text"|"choice"`, `options?`, `mutants:[{code, mistake}]`
- **Expected output:** generated by the verifier into `generated/expected.json`. Nobody hand-types expected output.
- **Mutants:** the verifier also runs each mutant. If the student's normalised answer equals a mutant's output, that mutant's mistake is logged on channel D.
- **Choice mode:** easy items use MCQ options built from the mutant outputs.
- **After 2 checks:** shows a line-diff and a "Run it" button (and "Step through" once the playground extra exists).

```json
{
  "id": "t01-s1-q1", "format": "predict", "diff": "easy", "ladder": "read", "core": true,
  "concepts": ["floor-division", "modulo"], "detects": ["int_vs_float_division"], "expectedSec": 90,
  "prompt": "Rottnest ferry timetable. Type exactly what is printed.",
  "code": "trip_minutes = 135\nprint(trip_minutes // 60, 'h', trip_minutes % 60, 'min')\nprint(7 / 2, 7 // 2, -7 // 2)",
  "answerMode": "text",
  "mutants": [
    { "code": "trip_minutes = 135\nprint(trip_minutes // 60, 'h', trip_minutes % 60, 'min')\nprint(int(7 / 2), 7 // 2, int(-7 / 2))", "mistake": "int_vs_float_division" }
  ],
  "hints": ["print puts one space between its arguments.", "// rounds down towards negative infinity, not towards zero.", "Line 2 prints 2 h 15 min."],
  "solution": { "walkthrough": "135 // 60 = 2 and 135 % 60 = 15. 7 / 2 = 3.5, 7 // 2 = 3, and -7 // 2 = -4 because floor goes down." },
  "selfExplain": "Why is -7 // 2 not -3?"
}
```

Generated expected output: `"2 h 15 min\n3.5 3 -4"`. Mutant output: `"2 h 15 min\n3 3 -3"`.

#### 4. `trace` (trace table) †

- **Shape:** `code`, `watch:[names]`, `anchorLine`, `maxRows`, `blankCells?`
- **Row generation:** the verifier's `tracer.py` runs the reference under `sys.settrace`. It snapshots the watched names at the first line event *after* `anchorLine` executes, or on frame return.
- **Grading:** per cell, with partial credit.
- **Diagnostics:**
  - Wrong row 1 logs `accumulator_init`.
  - A missing or extra final row logs `off_by_one_range`.
  - A loop variable that jumps by more than the step logs `modify_loop_var`.
- **Keyboard:** Tab and Enter move between cells.

```json
{
  "id": "t03-s1-q2", "format": "trace", "diff": "easy", "ladder": "read", "core": true,
  "concepts": ["for-range", "accumulator"], "detects": ["off_by_one_range", "accumulator_init"], "expectedSec": 120,
  "prompt": "Jacob's Ladder training plan. Fill in day and total after line 3 runs each time.",
  "code": "total = 0\nfor day in range(1, 5):\n    total += day * 2",
  "watch": ["day", "total"], "anchorLine": 3, "maxRows": 6,
  "hints": ["How many values does range(1, 5) produce?", "Row 1 is after the first pass: day is 1.", "Rows start (1, 2), (2, 6), ..."],
  "solution": { "walkthrough": "day takes 1, 2, 3, 4 (5 is excluded). total goes 2, 6, 12, 20." },
  "selfExplain": "Which change to range would add a fifth row?"
}
```

Generated rows: `[[1,2],[2,6],[3,12],[4,20]]`.

#### 5. `twins` (spot the difference) †

- **Shape:** `left`, `right`, `mistake`
- **Generated:** `differs`, `outLeft`, `outRight`.
- **Grading:** 0.5 for the "do they differ?" answer, plus 0.25 for each correctly predicted output. The differing token is highlighted.

```json
{
  "id": "t02-s2-q3", "format": "twins", "diff": "medium", "ladder": "read", "core": false,
  "concepts": ["elif"], "detects": ["elif_vs_if"], "expectedSec": 120,
  "prompt": "Perth heatwave alert. Do these print the same thing? Then predict both outputs.",
  "left": "temp = 41\nif temp > 35:\n    print('Hot')\nif temp > 40:\n    print('Extreme')",
  "right": "temp = 41\nif temp > 35:\n    print('Hot')\nelif temp > 40:\n    print('Extreme')",
  "mistake": "elif_vs_if",
  "hints": ["Only one token differs.", "An elif is skipped once an earlier branch in the chain ran.", "Left prints two lines."],
  "solution": { "walkthrough": "Left: two independent ifs, both true → Hot, Extreme. Right: one chain; the first true branch wins → Hot." },
  "selfExplain": "When would you want separate ifs instead of elif?"
}
```

Generated: `differs: true`, `outLeft: "Hot\nExtreme"`, `outRight: "Hot"`.

#### 6. `errorTranslator` (error translator and which line raises) †

- **Shape:** `code`, `causes:[{id, text, correct?, mistake?}]`, `exceptionOptions`
- **Generated:** the real Pyodide traceback, the raising line and the exception type.
- **Step 1:** click the line and pick the type. This is worth 0.5.
- **Step 2:** pick the cause and fix. This is worth 0.5, and a wrong pick logs its mistake on channel D.

```json
{
  "id": "t08-s1-q2", "format": "errorTranslator", "diff": "easy", "ladder": "read", "core": true,
  "concepts": ["dict-get"], "detects": ["dict_keyerror"], "expectedSec": 90,
  "prompt": "Campus café stock counter. The program printed 0, then crashed. Click the line that raised, pick the exception, then pick the fix.",
  "code": "stock = {'flat white': 3}\nprint(stock.get('latte', 0))\nstock['latte'] += 1",
  "exceptionOptions": ["KeyError", "TypeError", "NameError", "IndexError"],
  "causes": [
    { "id": "a", "text": "'latte' is not a key yet; use stock['latte'] = stock.get('latte', 0) + 1", "correct": true },
    { "id": "b", "text": "get() added 'latte' to the dict, so += should work", "mistake": "dict_keyerror" },
    { "id": "c", "text": "+= cannot be used on dictionary values", "mistake": "dict_keyerror" }
  ],
  "hints": ["Did line 2 change the dictionary?", "d[k] += 1 reads d[k] first.", "The error names the missing key."],
  "solution": { "walkthrough": "get() only reads with a default; it never inserts. Line 3 reads stock['latte'] → KeyError: 'latte'." },
  "selfExplain": "Why did line 2 not crash?"
}
```

#### 7. `cloze` (fill in the blank)

- **Shape:** `template` (with `⟦n⟧` markers), `blanks:[{id, width, accept}]`, `tests`, `runnable` (default true)
- **Grading:** the blanks are substituted into the template and the tests run, so equivalent answers pass. Token comparison against `accept` is used only when `runnable:false`.
- **Verifier:** checks that every `accept` combination passes the tests.

```json
{
  "id": "t07-s1-q3", "format": "cloze", "diff": "easy", "ladder": "repair", "core": true,
  "concepts": ["while", "floor-division", "modulo"], "detects": ["infinite_while", "int_vs_float_division"], "expectedSec": 120,
  "prompt": "SmartRider checksum. Complete digit_sum(n), which returns the sum of the digits of a non-negative int.",
  "template": "def digit_sum(n):\n    total = 0\n    while n ⟦1⟧ 0:\n        total += n ⟦2⟧ 10\n        n ⟦3⟧ 10\n    return total",
  "blanks": [
    { "id": "1", "width": 2, "accept": [">", "!="] },
    { "id": "2", "width": 1, "accept": ["%"] },
    { "id": "3", "width": 3, "accept": ["//="] }
  ],
  "tests": [
    { "id": "v1", "call": "digit_sum(4096)", "expect": "19", "label": "4096", "hidden": false, "tag": "int_vs_float_division" },
    { "id": "h1", "call": "digit_sum(0)", "expect": "0", "label": "zero", "hidden": true },
    { "id": "h2", "call": "digit_sum(7)", "expect": "7", "label": "one digit", "hidden": true }
  ],
  "hints": ["The loop stops when there are no digits left.", "Take the last digit, then remove it.", "Last digit: n % 10. Remove it with whole-number division."],
  "solution": { "code": "while n > 0:\n    total += n % 10\n    n //= 10", "walkthrough": "% 10 gives the last digit; //= 10 drops it and keeps n an int." },
  "selfExplain": "What goes wrong if blank 3 is /= ?"
}
```

#### 8. `parsons` (Parsons puzzle)

- **Shape:** `lines:[{text, indent}]` in solution order, `distractors:[{text, indent, pairedWith, mistake}]`, `indentMode:"fixed"|"2d"`, `tests`
- **Display:** lines are shuffled with a stable seed per attempt.
- **Grading:** the assembled program runs against the tests, so any valid order passes. A distractor that is used logs its mistake.
- **Adaptation:** after 2 failed checks, one distractor is removed. After 3, the first line locks (this is also L3).
- **Input:** keyboard (Alt+↑/↓ moves a line, Tab or Shift+Tab indents) and pointer.
- **Verifier:** checks that the solution order passes and that each distractor swap fails a test tagged with its mistake.

```json
{
  "id": "t03-s2-q2", "format": "parsons", "diff": "medium", "ladder": "repair", "core": true,
  "concepts": ["for-range", "accumulator"], "detects": ["off_by_one_range", "accumulator_init"], "expectedSec": 180,
  "prompt": "Build sum_of_squares(n), returning 1² + 2² + … + n². Not every line is needed.",
  "indentMode": "2d",
  "lines": [
    { "text": "def sum_of_squares(n):", "indent": 0 },
    { "text": "total = 0", "indent": 1 },
    { "text": "for k in range(1, n + 1):", "indent": 1 },
    { "text": "total += k ** 2", "indent": 2 },
    { "text": "return total", "indent": 1 }
  ],
  "distractors": [
    { "text": "for k in range(1, n):", "indent": 1, "pairedWith": 2, "mistake": "off_by_one_range" },
    { "text": "total = k ** 2", "indent": 2, "pairedWith": 3, "mistake": "accumulator_init" }
  ],
  "tests": [
    { "id": "v1", "call": "sum_of_squares(3)", "expect": "14", "label": "n = 3", "hidden": false, "tag": "off_by_one_range" },
    { "id": "h1", "call": "sum_of_squares(0)", "expect": "0", "label": "n = 0", "hidden": true },
    { "id": "h2", "call": "sum_of_squares(2)", "expect": "5", "label": "n = 2", "hidden": true, "tag": "accumulator_init" }
  ],
  "hints": ["Where must total start, and where does it grow?", "Plan: start at 0 → loop 1..n → add k² → return after the loop.", "The loop header is for k in range(1, n + 1):"],
  "solution": { "walkthrough": "range stops before its end, so n + 1 includes n. += keeps the running total." },
  "selfExplain": "Why is return total not indented inside the loop?"
}
```

#### 9. `fixBug` (fix the bug)

- **Shape:** `buggy`, `bugMistake`, `maxChangedLines`, `tests`
- **Grading:** Run executes visible tests. Submit runs all tests.
  - Passing gets full credit.
  - Changing no more than `maxChangedLines` lines also earns a "minimal fix" badge. Changing more lines does *not* lower the score.
  - A failing test tagged `bugMistake` logs it.

```json
{
  "id": "t02-s3-q1", "format": "fixBug", "diff": "medium", "ladder": "repair", "core": true,
  "concepts": ["boolean-ops"], "detects": ["or_with_literal", "compare_to_true"], "expectedSec": 180,
  "prompt": "Cottesloe swim check: safe when UV is under 8 and wind is under 25 km/h. swim_ok returns True for every input. Fix it.",
  "buggy": "def swim_ok(uv, wind_kmh):\n    if uv < 8 and wind_kmh < 25 or 30:\n        return True\n    else:\n        return False",
  "bugMistake": "or_with_literal", "maxChangedLines": 1,
  "tests": [
    { "id": "v1", "call": "swim_ok(5, 10)", "expect": "True", "label": "calm day", "hidden": false },
    { "id": "v2", "call": "swim_ok(9, 10)", "expect": "False", "label": "high UV", "hidden": false, "tag": "or_with_literal" },
    { "id": "h1", "call": "swim_ok(5, 40)", "expect": "False", "label": "windy", "hidden": true, "tag": "or_with_literal" },
    { "id": "h2", "call": "swim_ok(8, 10)", "expect": "False", "label": "UV exactly 8", "hidden": true }
  ],
  "hints": ["Is 30 on its own true or false in Python?", "The condition groups as (uv < 8 and wind_kmh < 25) or 30.", "Delete the part that is always truthy."],
  "solution": { "code": "def swim_ok(uv, wind_kmh):\n    return uv < 8 and wind_kmh < 25", "walkthrough": "A non-zero number is truthy, so 'or 30' made every call True." },
  "selfExplain": "What would 'wind_kmh < 25 or wind_kmh < 30' mean instead?"
}
```

The `if … return True / else return False` pattern also raises a `compare_to_true` warning in the Problems panel. It does not affect the score.

#### 10. `write` (function, program, paper exam or CSV project)

- **Shape:** `kind:"function"|"program"|"project"`, `fnName`, `starter`, `tests`, `mode?:"practice"|"paper"`, `marks?`, `rules?:RuleId[]`, `restate?:boolean`, `noLoops?:boolean`
- **Visible tests:** shown as a Moodle-style Test | Expected | Got table, and as a read-only `tests_visible.py` file in the explorer.
- **Hidden-test failures:** show only the label and tag ("fails on: empty list").
- **Special detections:**
  - Returns `None` while stdout equals the expected repr: `print_vs_return`.
  - `<function ` appears in stdout: `forgot_to_call`.
  - Two calls with `callTwice` differ: `mutable_default_arg`.
  - `main` is missing or has the wrong signature: `missing_main`.
  - Any `rules` violation (import, input, print outside except, round in a loop, a `.csv` literal): a lint error that states the Moodle consequence.
- **Program kind:** each test supplies `stdin` lines. Stdout is compared with `normalizeStdout`.
- **Project kind:** `files` are written to `/work` before each test.
- **Paper mode:** plaintext editor, no Run button, one Submit, marks shown. Syntax errors score half of what they would lose in practice mode.

```json
{
  "id": "t06-s2-q1", "format": "write", "kind": "function", "diff": "medium", "ladder": "write", "core": true,
  "concepts": ["list-iteration", "tuple-return", "round"], "detects": ["index_out_of_range", "accumulator_init", "return_type_wrong"], "expectedSec": 360,
  "prompt": "Perth February maxima. Write min_max_mean(temps) that returns a **tuple** (lowest, highest, mean rounded to 2 dp) using one loop. Return None for an empty list.",
  "fnName": "min_max_mean",
  "starter": "def min_max_mean(temps):\n    \"\"\"Return (lowest, highest, mean to 2 dp), or None if temps is empty.\"\"\"\n    pass",
  "tests": [
    { "id": "v1", "call": "min_max_mean([38.1, 41.2, 29.5])", "expect": "(29.5, 41.2, 36.27)", "cmp": "float", "label": "three days", "hidden": false },
    { "id": "v2", "call": "min_max_mean([30.0])", "expect": "(30.0, 30.0, 30.0)", "cmp": "float", "label": "one day", "hidden": false },
    { "id": "h1", "call": "min_max_mean([])", "expect": "None", "label": "empty list", "hidden": true, "tag": "index_out_of_range" },
    { "id": "h2", "call": "min_max_mean([-2.0, -5.5])", "expect": "(-5.5, -2.0, -3.75)", "cmp": "float", "label": "all below zero", "hidden": true, "tag": "accumulator_init" }
  ],
  "hints": ["Handle the empty list before touching temps[0].", "Plan: guard empty → start low and high at temps[0] → loop updating low, high, total → return a tuple.", "low = high = temps[0]\ntotal = 0\nfor t in temps:"],
  "solution": { "code": "def min_max_mean(temps):\n    if len(temps) == 0:\n        return None\n    low = temps[0]\n    high = temps[0]\n    total = 0\n    for t in temps:\n        if t < low:\n            low = t\n        if t > high:\n            high = t\n        total += t\n    return (low, high, round(total / len(temps), 2))", "walkthrough": "Starting low/high at 0 fails for all-negative weeks; start from the first element." },
  "selfExplain": "Why does starting high at 0 break the second hidden test?"
}
```

**Project kind:** the item adds `"rules": ["noImport","noInput","noPrint","roundAtEnd","noCsvExt"]`, and its tests use `"call": "main('data_b', 'city of stirling')"` with `files` supplied.

#### 11. `refactor` (refactor to idiom) †

- **Shape:** `code`, `tests`, `mustRemove:AstFlag[]`, `mustAdd?:AstFlag[]`, `patternCard`
- **Grading:** 1.0 when the tests pass and the flags are satisfied. 0.5 when the tests pass but the idiom check fails (the pattern card opens). 0 when the tests fail.

```json
{
  "id": "t04-s3-q2", "format": "refactor", "diff": "medium", "ladder": "write", "core": false,
  "concepts": ["return-bool"], "detects": ["compare_to_true"], "expectedSec": 150,
  "prompt": "Rewrite is_weekend as a single return statement. Behaviour must not change.",
  "code": "def is_weekend(day):\n    if day == 'Sat' or day == 'Sun':\n        return True\n    else:\n        return False",
  "mustRemove": ["if_return_bool_literal"], "patternCard": "return-boolean-directly",
  "tests": [
    { "id": "v1", "call": "is_weekend('Sat')", "expect": "True", "label": "Saturday", "hidden": false },
    { "id": "h1", "call": "is_weekend('Mon')", "expect": "False", "label": "Monday", "hidden": true },
    { "id": "h2", "call": "is_weekend('sun')", "expect": "False", "label": "lower-case (unchanged behaviour)", "hidden": true }
  ],
  "hints": ["The condition is already True or False.", "Return the condition itself.", "return day == 'Sat' or ..."],
  "solution": { "code": "def is_weekend(day):\n    return day == 'Sat' or day == 'Sun'", "walkthrough": "A comparison evaluates to a bool, so the if/else adds nothing." },
  "selfExplain": "Why is 'return day == \"Sat\" or \"Sun\"' wrong?"
}
```

#### 12. `testWriter` (break the buggy code) †

- **Shape:** `spec`, `fnName`, `reference`, `buggy`, `bugMistake`
- **Student input:** an argument tuple as a Python literal, parsed with `ast.literal_eval`, so no arbitrary code runs.
- **Grading:** the worker runs the reference and the buggy version. The answer is correct if their return values or exception types differ. 3 checks.

```json
{
  "id": "t10-s3-q1", "format": "testWriter", "diff": "hard", "ladder": "write", "core": false,
  "concepts": ["try-except", "validation"], "detects": ["zero_division"], "expectedSec": 300,
  "prompt": "Fringe World ticket form. safe_average(values) converts each string, skips invalid ones, and returns the mean, or None if nothing is valid. One implementation is secretly buggy. Enter arguments that make it misbehave.",
  "fnName": "safe_average",
  "reference": "def safe_average(values):\n    total = 0\n    count = 0\n    for v in values:\n        try:\n            total += float(v)\n            count += 1\n        except ValueError:\n            pass\n    if count == 0:\n        return None\n    return total / count",
  "buggy": "def safe_average(values):\n    total = 0\n    count = 0\n    for v in values:\n        try:\n            total += float(v)\n            count += 1\n        except ValueError:\n            pass\n    return total / count",
  "bugMistake": "zero_division",
  "hints": ["Read the spec's last clause again.", "Which inputs leave count at 0?", "Try an input with nothing valid in it."],
  "solution": { "walkthrough": "([],) or (['n/a'],): the reference returns None; the buggy one raises ZeroDivisionError." },
  "selfExplain": "What single line fixes the buggy version?"
}
```

### 3.5 Verifier

`scripts/verify-content.ts` runs in Node 26 with `pyodide@314.0.7`, the same interpreter the browser uses. It fails on any of these:

- **Referential integrity:**
  - Every id is unique across all topics.
  - Every `detects`, tag, distractor mistake, `allowFlags` entry and rule exists in the catalogues. (The types catch this too.)
  - Every `patternCard` exists.
- **Reference runs:** every reference or solution passes 100% of its tests.
  - Every buggy variant (a fixBug `buggy`, a Parsons distractor swap, a testWriter `buggy`, a cloze wrong fill in `mutants`) fails at least one test tagged with its declared mistake.
- **Parsons and cloze:** the Parsons solution passes, and every combination in a cloze `accept` list passes.
- **Generated outputs:** predict outputs and mutant outputs, trace rows, errorTranslator tracebacks, twins outputs, and error-catalogue fixtures (each runtime matcher's trigger snippet must match its regex against real Pyodide text) are written to `src/content/generated/*.json`. That folder is committed and never hand-edited.
- **Concept order:** each question's `concepts` must be introduced at or before its topic. An AST scan of references and starters confirms this:
  - `For` needs topic 3 or later, `While` 7, `Dict` 8, `open` 9, `Try` 10, recursion 13.
  - `FunctionDef` is allowed before topic 4 only inside `starter`.
  - Comprehensions are never required.
- **Budgets:** the reference runtime is measured under the tracer. The verifier warns above 20% of `budgetMs`.
- **Rubric:** it warns when `expectedSec` contradicts the difficulty tag (easy over 120 s, hard under 360 s), and when a hard write item has no hidden tagged edge-case test.
- **Replay safety:** questions with `stdin` must not use `random`, `time`, or `open(..., 'w'|'a')`.

`npm run verify` regenerates the outputs. `npm run verify -- --check` regenerates and fails when `git diff` is not empty; CI uses this.

---

## 4. Editor and Python runner

### 4.1 Libraries (pinned exactly)

| Package | Version | Use |
|---|---|---|
| vite | 8.3.0 | Dev server and build. `base: '/python-practice-hub/'`, `worker.format: 'es'` |
| typescript | 7.0.2 | Type-check only (`tsc --noEmit`). Vite transpiles. If TS 7 misbehaves, pin the latest 5.x or 6.x (a fallback that needs no code change). Use `erasableSyntaxOnly` and `allowImportingTsExtensions` so Node can run `.ts` scripts directly |
| vitest | 5.0.1 | Engine, grader, unlock and report tests, plus `slow`-tagged Node Pyodide tests |
| monaco-editor | 0.56.0 | ESM API with `?worker` import, bundled from the same origin |
| pyodide (runtime) | 314.0.7 via `https://cdn.jsdelivr.net/pyodide/v314.0.7/full/` | Browser runtime, shared HTTP cache |
| pyodide (devDependency) | 314.0.7 | Verifier and slow tests in Node |
| Inter / JetBrains Mono | Google Fonts css2 | UI and code fonts. Can be self-hosted in M10 |

One constant, `src/runtime/version.ts → export const PYODIDE_VERSION = '314.0.7'`, builds the CDN URL. A Vitest test checks that it equals the `pyodide` version in `package.json`.

No chart library, no router library, no drag-and-drop library, no IndexedDB wrapper library. Each of those jobs is under 150 lines of our own code.

### 4.2 Monaco setup (`src/ui/editor/monaco.ts`, lazy chunk)

```ts
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/editor.all';                         // find, comment toggle, bracket features
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
```

- **Import paths:** confirm these 0.56 ESM paths and the chunk size in M1. The fallback is `editor.main`, which pulls in every language.
- **Options:** `tabSize 4`, `insertSpaces`, `detectIndentation:false`, `renderWhitespace:'boundary'`, `rulers:[79]`, `minimap:false`, `bracketPairColorization`, `guides.indentation`, `fontFamily:'JetBrains Mono'`, `fontLigatures:false`, `stickyScroll`.
- **Completions:** a custom provider for about 60 Python keywords and builtins, plus names already in the file. There is no AI completion.
- **Themes:** `pyladder-dark` and `pyladder-light` via `defineTheme`, using the §7 tokens. They swap on theme change.
- **Markers:** runtime errors show an error squiggle and a glyph dot. AST warnings show a warning squiggle. Both mirror into the Problems panel.
- **Paper mode:** language `plaintext`, suggestions off, Run hidden.
- **Touch and narrow screens:** on `(pointer: coarse)`, below 700 px, or if Monaco fails to load, a `<textarea>` editor is used. It has a mono font, Tab inserts 4 spaces, and line numbers show in a gutter.

### 4.3 Worker design

```
main thread                                   module worker (src/runtime/pyWorker.ts)
pyClient.ts ── postMessage {id, op, …} ──▶   const { loadPyodide } = await import(/* @vite-ignore */ PYODIDE_URL + 'pyodide.mjs')
  queue (one request at a time)               py = await loadPyodide({ indexURL: PYODIDE_URL })
  watchdog timer per request                  FS.writeFile('/lib/*.py', ?raw strings); sys.path.insert(0,'/lib')
  status events → StatusBar pill       ◀──   {type:'status', stage} | {type:'ready', python: sys.version, pyodide}
                                        ◀──   {id, ok, result} | {id, ok:false, error}
```

- **Loading, settled:** a module worker created with `new Worker(new URL('./pyWorker.ts', import.meta.url), {type:'module'})`, which loads `pyodide.mjs` through a **dynamic `import()`**. `importScripts` is never used in the module worker.
- **Fallback (only if M1 fails in Safari 16.4+ or Firefox):** a classic worker `pyWorkerClassic.js` that calls `importScripts(PYODIDE_URL + 'pyodide.js')`.
- **One instance per visit:** a Pyodide instance uses 50–100 MB. Warm-up starts at idle priority when the landing page mounts.
- **Protocol (`src/runtime/protocol.ts`, discriminated unions):**
  - `run {code, stdin, files?, budgetMs}`
  - `tests {code, tests, kind, fnName, rules?, files?}`
  - `ast {code}`
  - `pair {reference, buggy, fnName, argsRepr}`
  - `repl {line}`
  - `trace {code, watch, anchorLine}` (playground extra only)
- **Isolation:**
  - Each run gets a fresh `{'__name__':'__main__'}` namespace.
  - `/work` is rewritten before every run.
  - Student-imported modules are dropped from `sys.modules` after the run.
  - A meta-path hook blocks `js`, `pyodide`, `os` and `subprocess`. This is for UX only, since Pyodide is already sandboxed.
  - `random.seed(1401)` is applied before every run.

### 4.4 Timeouts

| Layer | Mechanism | Default | Result |
|---|---|---|---|
| Soft | `tracer.py` installs `sys.settrace`. The global function returns a local tracer only for frames with `co_filename == '<student>'`, and checks `time.perf_counter()` every 1,000 line events | 2,000 ms per `run`, 1,000 ms per test. `budgetMs` overrides per question | Raises `StudentTimeout` at line N: "Your loop didn't finish (line 7). Which variable in the while condition should change?" Logs `infinite_while` if line N is inside a `While`. The worker survives |
| Hard | `pyClient` watchdog, then `worker.terminate()` and a respawn | Request budget (sum of test budgets) + 3,000 ms | Terminal shows "Python restarted". The event logs `timedOut`. Editor text lives on the main thread and in snapshots, so nothing is lost |

- Long C-level calls such as `sum(range(10**10))` or `10**10**7` fire no line events, so only the hard layer stops them.
- M1 measures:
  - Respawn time (expected 2–5 s, including unpacking the stdlib).
  - Tracer overhead on a 10⁶-iteration loop.
  - Whether `sys.monitoring` (PEP 669, in 3.12+) is cheaper. If so, the tracer uses it behind the same API.

### 4.5 stdout and input()

- **Output streaming:** `pyodide.setStdout/setStderr({batched})` streams to the Terminal.
- **Per-test capture:** tests capture output with `contextlib.redirect_stdout` into a `StringIO`.
- **Output cap:** 64 KB per run, then `[output truncated]`.
- **Warnings:** `warnings.simplefilter('always')` surfaces `SyntaxWarning` (for example `"is" with a literal`).
- **Queued stdin** (tests, and the INPUT tab): the harness replaces `builtins.input` with a function that echoes the prompt, pops the next line and echoes it. When the queue is empty:
  - In a test, `EOFError` with "Your program asked for more input than this test provides".
  - In a project-kind test, `InputCalled`, which logs `input_called`.
- **Replay stdin** (Terminal and Playground, for program-kind questions): an empty queue raises `NeedInput(prompt)`. The Terminal shows the prompt with a caret. When the student presses Enter, the program re-runs from the start with the queue plus the new line, and output already shown is hidden by prefix.
  - Side effects repeat safely: `random` is re-seeded, `/work` is reset before each replay, and the verifier forbids `random`, `time` and file writes in stdin questions.
  - The Playground shows a one-line note: "Input replays your program from the top."

### 4.6 Hidden tests (`harness.py → run_tests`)

For each test:

1. Build a fresh namespace.
2. `exec(compile(src, '<student>', 'exec'))`, with module-level prints captured separately.
3. Look up `fnName`. If it is missing, report "Define a function called min_max_mean(temps)" and log `missing_function`. For `main`, also check `inspect.signature`, logging `missing_main`.
4. Write `files`, queue `stdin`, and `eval(call)` under the per-test budget. Arguments are literals inside the call string, so every test gets a fresh object and no mutation leaks between tests.
5. Capture the return value, stdout and exception (type, message, student line).
6. Compare using §3.2.
7. Apply the special detections (§3.4 #10).
8. Return JSON: `{testId, pass, gotRepr, stdout, exc?, tag?, flags[]}`.

The UI shows `gotRepr` only for visible tests. For hidden tests, before the solution is revealed, it shows only the label and tag.

### 4.7 Traceback mapping and explanations

- **SyntaxError:** `compile()` catches it with `lineno`, `offset`, `end_offset` and the message, including "expected ':'" and "Did you mean". It becomes a precise squiggle.
- **Runtime errors:** `errors.py` filters `traceback.extract_tb` to `'<student>'` frames, so line numbers match the editor with no wrapper offset. It returns `{type, msg, lineno, frames}`.
- **Explanations:** `engine/mistakes.ts` matches the type plus a message regex from the catalogue to a mistake id. The EXPLAIN panel shows:
  - The Python message word for word.
  - What it means.
  - Why it happened here (with the line highlighted).
  - The typical fix.
  - A link to the matching pattern card.
- **Regex source:** regexes are written against real Pyodide 314 messages, and the verifier's error fixtures enforce this. Students using Thonny locally may see slightly different wording. A footnote in the EXPLAIN panel says so.

### 4.8 AST checks (`astchecks.py`)

One `ast.NodeVisitor` returns `{flag, line}`:

- **Mistake flags:** `import_used`, `print_call`, `input_call`, `global_stmt`, `while_no_update`, `while_true_no_break`, `acc_reset_in_loop`, `range_len_index`, `mutate_while_iterating`, `shadow_builtin`, `mutable_default`, `missing_return`, `return_print`, `bare_function_name`, `compare_to_true`, `if_return_bool_literal`, `is_literal`, `or_with_literal`, `none_from_inplace`, `discarded_str_method`, `open_without_with`, `round_in_loop`, `csv_ext_literal`, `bare_except`, `loop_present`.
- **Idiom flags** (feed "Already using"): `for_each`, `enumerate_used`, `dict_get_used`, `fstring_used`, `early_return`, `with_open`, `header_index_lookup`, `recursion_present`.

The checks run on every Run after a successful parse, and are unit-tested in Node Pyodide.

### 4.9 First-load UX

1. **Before any JS:** an inline script in `index.html` applies the theme with no flash. If `location.protocol === 'file:'`, it shows a full-width banner: "Open this app with `npm run dev` or the GitHub Pages link. Double-clicking index.html can't run Python."
2. **Landing page:** renders immediately. The status-bar pill moves through stages: `Downloading Python runtime… 6 s` → `Unpacking standard library` → `Loading grader` → `Python 3.x.y · ready`. Stages come from worker events plus elapsed time, because Pyodide gives no byte-level progress.
3. **Before Python is ready:** mcq, multi, predict, trace, twins and errorTranslator are fully usable, because their expected data is pre-generated. On code questions, Run shows "Python is starting (≈10–30 s on first visit)" and queues the request.
4. **If loading fails** (CDN blocked or offline): the pill turns red. A callout offers **Retry** and names the non-code formats still available.
5. **Monaco:** loads only when the workbench first opens, with a skeleton editor of the same size to prevent layout shift.
6. **Service worker (M10):** caches the app shell and the pinned Pyodide URLs for campus Wi-Fi and offline revision.

---

## 5. Data model and persistence

### 5.1 Storage choice

| Data | Store | Why |
|---|---|---|
| Profiles list, active profile | `localStorage['pyladder:profiles']` | Tiny and synchronous |
| Settings | `localStorage['pyladder:<pid>:settings']` | Read before first paint (theme) |
| Event log, snapshots | IndexedDB database `pyladder-<pid>` (a wrapper of about 70 lines) | No 5 MB limit; append-only |
| Derived caches | IndexedDB store `derived` plus memory | Can be thrown away and rebuilt from events |

At startup, the app calls `navigator.storage.persist()` and shows the result in Settings as "Browser may clear data: yes/no". Namespacing by profile id starts on day one. The profile picker UI arrives in M10.

### 5.2 Events (store `events`, auto-increment key; indexes `ts`, `qid`, `sessionId`, `type`)

Every event carries `v: 1`. Migrations live in one file, `store/migrations.ts`.

```ts
type Event =
 | { v:1; type:'session_start'; sessionId; ts; mode:'practice'|'review'|'exam'|'testout'|'playground' }
 | { v:1; type:'session_end';   sessionId; ts; durationMs; focusedMs }        // visibilitychange-aware
 | { v:1; type:'topic_open';    sessionId; ts; topicId }
 | { v:1; type:'run';           sessionId; ts; qid; kind:'run'|'submit'; passed; total; runtimeMs;
                                timedOut; errorType?; mistakes: MistakeId[]; snapshotId }
 | { v:1; type:'attempt';       sessionId; ts; qid; topicId; scenarioId; format; diff; ladder; mode;
                                checkNo; correct; score; credit; hintTier:0|1|2|3|4; hintSkims; timeMs;
                                expectedSec; confidence?:'sure'|'unsure'; response: unknown;
                                perItem?; mistakes:{id;channel;line?}[]; revealed; testedOut? }
 | { v:1; type:'hint';          sessionId; ts; qid; tier; dwellPrevMs }
 | { v:1; type:'mistake';       sessionId; ts; qid; id: MistakeId; channel:'R'|'S'|'D'|'T'; line? }
 | { v:1; type:'mistake_fixed'; sessionId; ts; qid; id; fixMs }   // first detection → next passing run
 | { v:1; type:'self_explain';  sessionId; ts; qid; text; skipped }
 | { v:1; type:'restate';       sessionId; ts; qid; text }
 | { v:1; type:'override';      sessionId; ts; what:'unlockAll'|'unlockMode'; value }
 | { v:1; type:'testout';       sessionId; ts; topicId; score; passed }
 | { v:1; type:'flag';          sessionId; ts; qid; reason:'wrong-answer'|'unclear'|'too-hard'|'other'; note }
 | { v:1; type:'export';        ts }
```

**Sessions:** a session starts on the first interaction after 30 minutes idle. It ends after 30 minutes idle, or on `pagehide`, when the closing event is flushed.

### 5.3 Other stores

- **`snapshots`:** keyed by `qid`: `{draft, draftStdin, updatedAt, submitted:[last 3 {code, ts, passed}]}`.
  - The draft autosaves after 800 ms idle, which gives resume.
  - "Compare with my last attempt" shows a Monaco diff view against `submitted`.
  - `run.snapshotId` points into a separate `runCode` store capped at the last 20 per question, so the report's "see your code" links work.
- **`derived`:** `{key:'topics'|'mistakes'|'schedule', value, builtFromEventId}`, rebuilt incrementally.

### 5.4 Derived views (pure functions in `engine/`, tested with fixture event logs)

| Function | Inputs | Output |
|---|---|---|
| `topicStatus` | events, settings | locked, open, in-progress, completed or review-due, plus reason and progress |
| `topicMastery` | `attempt` events | Mean of best credit per core question, with the 24-hour re-solve rule |
| `mistakeStats` | `mistake` and `mistake_fixed` | count, sessions, distinct questions, repeats, median fixMs, last ts |
| `ladderMatrix` | attempts | Accuracy per topic × read/repair/write |
| `timeFlags` | attempts | Counts of RUSHED and STUCK |
| `patternStatus` | mistakes, AST idiom flags from passing runs | Recommended, Already using or Later |

**Retention:** attempt, mistake, hint, override and flag events are **never** dropped or compacted. Past 20k events, only `run` events older than 90 days are compacted into daily aggregates. Mastery, unlock state and mistake stats are computed only from events that are never compacted, so compaction cannot change progress.

### 5.5 Export and import

- **Settings → Export progress:** downloads `pyladder-<profile>-<date>.json` containing `{format:'pyladder-export', version:1, exportedAt, profile, settings, events, snapshots}`, and logs an `export` event.
- **Import:** validates the format and version, runs migrations, and merges events by deduplicating on `(ts, type, qid, sessionId)`. The student chooses "Merge" or "Replace", and Replace needs a confirm step.
- **Backup reminder:** a toast after every 10 sessions or 7 days since the last export: "Your progress lives only in this browser. Export a backup."
- **Where the note appears:** the report footer and Settings both show "Last backup: 3 days ago · No sync between devices".

### 5.6 Privacy note (shown in Settings and the README)

- All progress stays in this browser on this device. There are no accounts, no analytics and no server.
- The only network requests are the pinned Pyodide files (jsdelivr) and fonts (Google Fonts). Both disappear if self-hosting is enabled in M10.
- Answers and hidden tests ship inside the app, so a curious student can read them in DevTools. That is acceptable for self-study. PyLadder is practice, not assessment.
- PyLadder is not affiliated with UWA. Footer text: "Aligned with public CITS1401 materials (2020–2023). Check your LMS unit outline for this semester's order and rules."
- No UWA logos or crest.

---

## 6. Pages and UX

Routes use a hash router, so Pyodide loads once per visit:

`#/` · `#/topic/:topicId` · `#/q/:qid` · `#/report` · `#/report/:topicId` · `#/settings` · `#/testout/:topicId` · extras: `#/review`, `#/exam`, `#/playground`

### 6.1 Landing (`#/`)

- **Header:** left-aligned "CITS1401 Python practice", a one-line progress sentence ("5 of 13 topics open · 62 questions tried · last session yesterday"), a primary **Continue: Strings · Student ID checker · q3** button, and the runtime pill.
- **Topic rail** (main column, vertical): 13 numbered nodes joined by a 1 px line. Phase dividers read "Core · mid-semester" (1–8) and "Projects + final exam" (9–13). Each card shows:
  - The number (mono), title and 3 concept chips.
  - A mastery ring and "attempted/total" counts.
  - A 3-segment difficulty bar (for example 5 E · 5 M · 2 H).
  - A state icon (lock, play, check, refresh) with a text label.
  - **When locked:** the exact rule and progress, plus "Read cheat sheet" and "Test out" links.
- **Right column** (stacks below 900 px): "Recent mistakes" (top 3 ids with "Practise this" links), a session summary for today, and the backup status.

### 6.2 Topic page (`#/topic/:id`)

- **Top:** a cheat-sheet tab (never locked), a worked example with subgoal labels, and a "Common mistakes here" preview (3 ids with bad and good snippets).
- **Filter bar:**
  - Difficulty segmented control: Easy / Medium / Hard / All, remembered per topic.
  - Format chips: Read / Repair / Write, plus individual formats.
  - Toggle: "Weak spots first" orders by the student's mistake ids.
  - Toggle: "Unsolved only".
- **Scenario sections:** a title, a one-paragraph story, and the derived range ("Easy → Hard"). Each question row shows:
  - A format icon and label.
  - The title.
  - A difficulty chip.
  - A ladder pip (read, repair or write).
  - A status: new, tried, solved, or solution seen.
  - The best credit.
  - Tags (concepts and detectable mistakes, shown on hover or focus).
- **Actions:** "Start at first unsolved" and "Test out of this topic".

### 6.3 Question view (`#/q/:qid`, the workbench)

```
┌ActivityBar┬ EXPLORER ────────┬ tab: prompt.md │ solution.py ● │ tests_visible.py ─────────────┐
│ Topics    │ ▾ Strings        │ breadcrumb: strings › plates › is_palindrome_plate.py         │
│ Search    │   ▾ plates       │ ┌ Prompt (rendered, collapsible) ┐┌ Monaco editor ───────────┐ │
│ Report    │     q1.out  ●    │ │ story, spec, visible examples  ││                          │ │
│ Settings  │     q2.py   ◐    │ │ [Restate box on hard items]    ││                          │ │
│           │     q3.table     │ └────────────────────────────────┘└──────────────────────────┘ │
│           │     data_b (ro)  ├──── PROBLEMS │ TESTS │ TERMINAL │ INPUT │ HINTS │ EXPLAIN ─────┤
│           │                  │  Test | Expected | Got | ✓/✗   (hidden: label + tag only)      │
└───────────┴──────────────────┴───────────────────────────────────────────────────────────────┘
 StatusBar: Python 3.x.y · ready │ Ln 4, Col 12 │ Spaces: 4 │ UTF-8 │ Medium │ Check 2 │ Strings 64%
```

- **Explorer file names show the format:** `.py` for code, `.out` for predict, `.table` for trace, `.pz` for Parsons, `.md` for mcq, read-only data files for projects.
- **Non-code formats:** render as a document tab in the editor area, so the layout never jumps.
- **Actions:** Run (visible tests or program), Submit (hidden tests), Reset to starter, Compare with last attempt, Report this question.
- **After a result:** a banner shows the credit, the minimal-fix badge if earned, and **Next question**. Confidence (Sure / Not sure) is asked before revealing mcq, predict and twins answers.
- **Focus mode:** hides the activity bar, sidebar and panel, and collapses the prompt to one line.
- **Command palette and Quick Open:** "Go to topic", "Next unsolved", "Reveal hint", "Reset code", "Toggle theme", "Export progress", and a fuzzy question search.
- **Responsive:**
  - 700–900 px: the explorer becomes a drawer and prompt, editor and panel stack.
  - Below 700 px: the activity bar moves to a bottom tab bar and the textarea editor is used.
  - Parsons supports touch pointer events.
- **Topic complete moment:** when a submit completes a topic, a quiet full-width banner opens `#/report/:topicId` with **Retry these 3**, **Try hard questions** and **Start next topic**. No confetti.

### 6.4 Reports (`#/report`, `#/report/:topicId`)

Filters: last session / 7 days / 30 days / all time, and practice vs exam. **Print / Save as PDF** uses `print.css`, which forces the light palette and hides the panels. Each section shows an empty state until there are at least 5 attempts. All numbers come from pure functions.

1. **Summary strip:** questions, sessions, focused time, hint-weighted accuracy with a 10-session sparkline, and first-submit pass rate. Below it, a 3-line generated headline, for example "Strongest: Decisions (92%). Needs work: Lists and tuples (54%, 4× mutate_while_iterating). Next step: Fix-the-bug set in Lists, Medium."
2. **What to do next:** up to 3 deep-linked actions drawn from the weakest (topic, rung, difficulty) combination.
3. **Topic heatmap:** rows are topics. Columns are Mastery, Easy, Medium, Hard, Hint dependence (share of correct answers needing L3 or higher) and Freshness. Every cell prints its number. STRONG/WEAK labels are text:
   - **STRONG:** 85% or more with hints at L1 or lower on at least 5 items.
   - **WEAK:** under 60%, OR hint dependence over 50%, OR the same mistake id 3+ times in 14 days, OR a failed test-out or review.
   - Each row expands into scenario results and a **Practise weak spots** button, which builds a 10-question interleaved set.
4. **Skill ladder matrix:** topic × read, repair and write, with a generated sentence such as "You trace for loops well (90%) but writing them lands at 40%. Do the Parsons items in For loops next."
5. **Mistake profile:** bars grouped Conceptual / Strategic / Project rules / Style / Syntax, with syntax slips muted.
   - Sort order: severity × repeats × log(median time-to-fix).
   - Each row shows count, distinct questions, sessions, median fix time, channels and last seen, with a **see your code** link to the run snapshot.
   - Buttons: **Practise this** (3 questions whose `detects` includes the id) and **Explain** (bad and good example).
6. **CITS1401 readiness:**
   - (a) Paper-mode and exam-mode accuracy by topic, calling out recursion and series-with-tolerance.
   - (b) Project-rules checklist over the last 10 project submissions: no import, no input, no print, round at the end, header lookup, no `.csv` assumption, graceful failure. Each shows a tick or cross and its marking consequence.
7. **Behaviour signals** (shown only when present, worded kindly): rushed, stuck without hints, hint skims, "Sure" answers that were wrong, and solutions revealed without self-explanation.
8. **Session history:** date, duration, mode, questions, accuracy, new mistake ids and topics. A row expands into a timeline of question, result, hint tier and time.
9. **Recommended patterns:** about 22 cards, each labelled **Recommended** (its trigger fired 2+ times in 14 days, or a refactor on it failed), **Already using** (the idiom appeared in 3+ passing submissions) or **Later** (its topic is not open yet). Each card has a title, why, bad and good snippets, a reference (PEP 8 section or CITS1401 rule) and **Try the refactor question**.
   - Cards: snake_case names of 3+ characters; 4-space indent; don't shadow built-ins; `for item in items`; `enumerate`; `in` for membership; `dict.get(k, 0)`; sort `key` tuples for tie-breaks; `with open` + `strip` + `split(',')`; find columns by header; guard clauses and early return; `if flag:`; `is` only for None; None as the default for mutable parameters; initialise accumulators before loops; build a new list instead of mutating while iterating; return, don't print; round only at output; small `try` blocks with specific exceptions; one function per subtask with a docstring; test empty, one and many; recursion checklist (base case first, smaller input).
   - List comprehensions: a single *optional* card, shown only after topic 6 is completed.
10. **Footer:** "No sync between devices · Last backup: … · Export now".

### 6.5 Settings (`#/settings`)

- **Theme:** System / Light / Dark.
- **Editor:** font size 12–20, minimap, textarea editor forced on or off.
- **Unlock mode:** Attempt (default) / Checkpoint / Mastery, each with a one-line explanation, plus an **Unlock all topics** toggle marked "logged in your report".
- **Motion:** reduced motion follows the OS, with an override.
- **Profile:** name, switch or add a profile (M10).
- **Data:** Export, Import (merge or replace), Reset profile (typed confirmation), storage-persisted status, last-backup date.
- **Flagged questions:** a list with **Copy as JSON** so the author can triage wrong autograding.
- **About:** version, `sys.version`, Pyodide version, privacy note, non-affiliation disclaimer.

### 6.6 Keyboard shortcuts (`?` opens the sheet; every action also has a button)

| Action | Shortcut | Notes |
|---|---|---|
| Run | Cmd/Ctrl+Enter | |
| Submit | Cmd/Ctrl+Shift+Enter | |
| Command palette | F1 or Cmd/Ctrl+Shift+P | F1 is the guaranteed binding. Firefox reserves Ctrl+Shift+P for a private window on Windows and Linux |
| Quick open question | Cmd/Ctrl+P | Stops the browser's print dialog while the app has focus |
| Next hint tier | Cmd/Ctrl+' | |
| Toggle panel | Cmd/Ctrl+J | |
| Toggle sidebar | Cmd/Ctrl+B | |
| Focus mode | Cmd/Ctrl+K then Z; Esc Esc exits | |
| Toggle theme | Cmd/Ctrl+K then T | |
| Next / previous question | `]` / `[` outside the editor; Cmd/Ctrl+Alt+] / [ inside | Alt+letter types characters on macOS, so it is avoided |
| MCQ option | 1–4, then Enter | |
| Parsons | ↑/↓ select, Alt+↑/↓ move, Tab / Shift+Tab indent, Space pick up or drop | |
| Trace table | Tab / Shift+Tab / Enter | |
| Comment line, move line, find | Cmd/Ctrl+/, Alt+↑/↓, Cmd/Ctrl+F | Monaco built-ins |
| Shortcut sheet | ? | |

All bindings live in `ui/shortcuts.ts`. Conflicts are checked in Chrome, Firefox and Safari during M2.

---

## 7. Design system

**Direction: "editor-grade calm".** Flat surfaces and 1 px borders. Type weight and spacing carry the hierarchy. Colour carries meaning only: green for pass and the accent, amber for hints and warnings, red for errors, blue for info, links and focus, teal for in-progress. Density is close to VS Code.

### 7.1 Tokens (`src/styles/tokens.css`)

- Dark is set on `:root`. `html[data-theme=light]` overrides it, and `system` follows `prefers-color-scheme`.
- Semantic colours are used as text only on `--surface-1` (light) or `--bg` and `--surface-2` (dark). The contrast test enforces this.

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#0f1115` | `#f4f5f7` |
| `--bg-inset` (terminal, gutter) | `#0a0c0f` | `#eceef1` |
| `--surface-1` (cards, sidebar) | `#161a20` | `#ffffff` |
| `--surface-2` (panels, tabs) | `#1c2129` | `#f9fafb` |
| `--surface-3` (hover, active) | `#242a33` | `#eef0f3` |
| `--border` | `#2a3039` | `#dde1e6` |
| `--border-strong` | `#3a424d` | `#c5cbd3` |
| `--text` | `#e6e8eb` | `#1a1d23` |
| `--text-muted` | `#9aa3ad` | `#525b66` |
| `--text-faint` | `#808a95` | `#687280` |
| `--accent` | `#4ade80` | `#15803d` |
| `--accent-hover` | `#6ee79a` | `#166534` |
| `--accent-soft` | `#4ade801f` | `#15803d14` |
| `--text-on-accent` | `#07130b` | `#ffffff` |
| `--info` / `--focus` | `#60a5fa` | `#2563eb` |
| `--warn` | `#facc15` | `#a16207` |
| `--danger` | `#f87171` | `#dc2626` |
| `--progress` | `#2dd4bf` | `#0f766e` |
| `--lock` | `#808a95` | `#687280` |
| `--diff-easy` | `#4ade80` | `#15803d` |
| `--diff-medium` | `#facc15` | `#a16207` |
| `--diff-hard` | `#fb923c` | `#c2410c` |
| `--editor-bg` | `#0f1115` | `#ffffff` |
| `--editor-line` | `#161a20` | `#f4f5f7` |
| `--editor-selection` | `#264f78` | `#add6ff` |
| Heat scale 0→100 | `#1c2129 #173a2a #1f5a3a #2f8a53 #4ade80` | `#eef0f3 #d3eedb #a7dcb6 #5fb57c #15803d` |

**Checked contrast ratios** (text on its ground): dark text-faint 5.4:1 on bg, danger 6.8, diff-hard 8.4; light accent 5.0 on white, warn 4.9, danger 4.8, text-faint 4.9, text-on-accent 5.0.

**Syntax colours** (VS Code Dark+ / Light+ values, so the editor looks familiar):

| Role | Dark | Ratio vs `#0f1115` | Light | Ratio vs `#ffffff` |
|---|---|---|---|---|
| Keyword (all, including control flow; no purple) | `#569cd6` | 6.4 | `#0000ff` | 8.6 |
| String | `#ce9178` | 7.2 | `#a31515` | 7.9 |
| Number | `#b5cea8` | 11.1 | `#098658` | 4.6 |
| Comment (italic) | `#6a9955` | 5.7 | `#008000` | 5.1 |
| Function | `#dcdcaa` | 13.4 | `#795e26` | 6.1 |
| Builtin / type | `#4ec9b0` | 9.3 | `#267f99` | 4.6 |
| Variable | `#9cdcfe` | 12.7 | `#001080` | 15.2 |
| Error / warning squiggle | `#f87171` / `#facc15` | | `#dc2626` / `#a16207` | |

**Hue ban:** no colour with a hue between 250° and 320° appears anywhere. A Vitest check enforces this, so there is no purple or violet.

### 7.2 Type

- **UI:** `Inter, system-ui, -apple-system, 'Segoe UI', sans-serif`. Weights 400, 500 and 600.
- **Code, terminal, ids and numbers in stats:** `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`. Weights 400 and 600.
- **Scale (px):** 11 (uppercase section labels, +0.06em tracking, `--text-faint`), 12 (chips, status bar), **13 (default UI)**, 14 (prose, editor), 16 (card titles), 20 (page titles), 28 (landing H1 only).
- **Line height:** 1.5 for UI and prose, 1.6 for code.
- **Headings:** 600 weight, −0.01em tracking from 20 px up.
- **Stats:** `font-variant-numeric: tabular-nums` everywhere.

### 7.3 Spacing, shape and elevation

- **Spacing:** 4 px base: 4, 8, 12, 16, 24, 32, 48.
- **Radius:** 4 (chips, inputs), 6 (buttons, cards), 8 (dialogs, command palette). Never pill-shaped, except status dots.
- **Shadows:** overlays only: `0 8px 24px rgba(0,0,0,.35)` dark and `rgba(16,24,40,.12)` light.
- **Focus:** a 2 px `--focus` outline with a 2 px offset, always visible for keyboard use.
- **Layout sizes:** activity bar 44 px, sidebar 240 px, panel minimum 160 px. Splitters store their sizes in settings.

### 7.4 Component inventory

- **Shell:** AppHeader, ActivityBar, SideBar/ExplorerTree, TabStrip, Breadcrumb, SplitPane, PanelArea, StatusBar, RuntimePill, CommandPalette, QuickOpen, Toast, Dialog/Confirm, ShortcutSheet, Banner (file:// warning, topic complete).
- **Navigation and progress:** TopicCard (5 states), LockBadge with rule progress, MasteryRing (SVG), FreshnessRing, DifficultyBar, ScenarioSection, QuestionRow, DiffChip, FormatChip, LadderPip, FilterBar, SegmentedControl, Toggle, Button (primary, secondary, ghost, danger), IconButton, Kbd, Tooltip, Callout (info, warn, danger, success), EmptyState, Markdown renderer (in-house; code blocks use `monaco.editor.colorize`).
- **Formats:** McqOption, SelectAllList, OutputBox with diff, TraceGrid, LinePicker, CausePicker, ClozeInline, ParsonsBoard, TwinsSplit, TestTable, TestExplorerTree, ProblemsList, Terminal (with stdin caret), ExplainErrorCard, HintLadder (4 steps, locked tiers show their gate), SolutionReveal, SelfExplainPrompt, ConfidenceToggle, RestateBox, ResultBanner, TextareaEditor.
- **Reports:** KpiStrip, Heatmap (SVG), LadderMatrix, BarRow, Sparkline (SVG), PatternCard (bad/good split), SessionTable, SessionTimeline, ReadinessChecklist.
- **Icons:** about 30 inline SVGs with a 1.5 px stroke, drawn in the repo.

### 7.5 Motion

- 120–150 ms `ease-out`, **opacity and transform only**. Used on state changes: panel open, toast in, a ring filling once when a value changes.
- No looping animation except the runtime pill's loading dot. No bounce, no parallax, no confetti.
- `prefers-reduced-motion: reduce` (or the setting) sets all durations to 0 ms.

### 7.6 Anti-patterns (banned, and checked in code review)

- No gradients of any kind. No purple or violet anywhere.
- No glassmorphism, backdrop blur, glow or neon shadows.
- No emoji as section markers, bullets or icons in the UI chrome.
- No hero illustrations, stock art, 3D blobs, or "AI sparkle" icons.
- No filler copy ("Unlock your potential"). Every sentence says something specific.
- No colour-only signals. Every state has text or an icon.
- No pill-shaped cards, no rounded corners over 8 px, no drop shadows on flat cards.
- No centred marketing-style landing. The first screen is the topic map.

---

## 8. File and folder layout

```
python-practice-hub/
  index.html                      # mount, <title>, fonts, inline theme + file:// detection script
  package.json                    # pinned versions (§4.1); scripts: dev, build, preview, test, test:slow,
                                  #   verify, verify:check, typecheck, check (= typecheck+test+verify:check), new-question
  vite.config.ts                  # base '/python-practice-hub/', worker.format 'es'
  tsconfig.json                   # strict, noEmit, erasableSyntaxOnly, allowImportingTsExtensions
  vitest.config.ts                # 'slow' tag for Node-Pyodide tests
  README.md                       # run (npm run dev / Pages URL), NOT file://, deploy, author, privacy
  CLAUDE.md                       # rules: pinned versions, layer imports, token names, never hand-edit generated/
  .claude/docs/
    architecture.md  runner-and-grading.md  content-authoring.md (1 worked example per format + rubric)
    design-system.md  data-model.md  unlock-and-reports.md  mistakes.md
  .github/workflows/deploy.yml    # npm ci → typecheck → test → test:slow → verify:check → build → deploy-pages
  public/
    favicon.svg  sw.js (M10)  fonts/ (optional self-host, M10)
  scripts/
    verify-content.ts             # Node 26 + pyodide@314.0.7; writes src/content/generated/*.json
    new-question.ts               # `npm run new-question -- t05 s2 write` → typed stub with hints/tests/tags pre-filled
  src/
    main.ts  router.ts  state.ts
    styles/  tokens.css  base.css  shell.css  components.css  formats.css  report.css  print.css
    content/                      # imports only content/schema + catalogues (no ui/runtime)
      schema.ts                   # Question unions, Test, Scenario, Topic
      concepts.ts                 # ConceptId catalogue + AST node → concept map
      mistakes.ts                 # ~52 MistakeDef (as const) → MistakeId union
      astflags.ts  rules.ts  patterns.ts (~22 PatternCard)
      topics.ts                   # ordered TopicMeta[] (introduces, band, week, blurb)
      topics/
        01-variables-expressions/{index.ts, s1-rottnest-ferry.ts, s2-parking.ts, s3-bus-timetable.ts, cheatsheet.md}
        02-if-elif-else/…  03-for-loops-range/…  …  13-recursion/…
      datasets/                   # synthetic CSVs (shuffled headers, bad rows, no extension)
      generated/                  # expected.json, traces.json, tracebacks.json, error-fixtures.json (committed)
    engine/                       # pure; imports only content types
      graders/{index,mcq,multi,predict,trace,twins,errorTranslator,cloze,parsons,fixBug,write,refactor,testWriter}.ts
      normalize.ts  compareHelpers.ts  hints.ts  scoring.ts  unlock.ts  mastery.ts  sessions.ts
      mistakes.ts (runtime matcher)  report.ts  patterns.ts  practiceSet.ts  scheduler.ts (extra)
      __tests__/  fixtures/events-*.json  fixtures/runresults-*.json
    runtime/                      # imports engine types only
      version.ts  protocol.ts  pyClient.ts  pyWorker.ts  pyWorkerClassic.js (fallback, unused unless M1 fails)
      python/{harness.py, astchecks.py, tracer.py, errors.py, stdin.py}   # loaded ?raw
      __tests__/pyodide.slow.test.ts
    store/  idb.ts  events.ts  snapshots.ts  settings.ts  profiles.ts  migrations.ts  exportImport.ts
    ui/
      shell/{ActivityBar,SideBar,TabStrip,PanelArea,StatusBar,CommandPalette,QuickOpen,Toast,Dialog,ShortcutSheet}.ts
      screens/{Landing,Topic,Workbench,Report,TopicReport,Settings,TestOut}.ts
      formats/{Mcq,MultiSelect,Predict,TraceTable,Twins,ErrorTranslator,Cloze,Parsons,FixBug,Write,Refactor,TestWriter}.ts
      components/…                # §7.4
      editor/{monaco.ts, themes.ts, markers.ts, textareaEditor.ts}
      shortcuts.ts  theme.ts  dom.ts (h())
    __tests__/layers.test.ts      # content/engine never import ui/runtime/store
    __tests__/contrast.test.ts    # WCAG ratios + hue ban from tokens.css, both themes
```

---

## 9. Build order

Sizes: **S** ≤ 1 day · **M** 1.5–3 days · **L** 3.5–7 days. There are three user checkpoints.

| # | Milestone | Scope | Definition of done | Size |
|---|---|---|---|---|
| **M1** | **Scaffold and runtime spike (go/no-go)** | `npm create vite` (vanilla-ts) and pin versions. Minimal page with Monaco (0.56 ESM paths, `?worker`), the Pyodide module worker via dynamic `import()`, stdout batching, `compile` to `<student>` traceback markers, the settrace soft budget plus the terminate/respawn watchdog, queued `input()` and a NeedInput replay prototype. GitHub Pages workflow deploys the spike | On **both localhost and the Pages URL**, in Chrome, Firefox and Safari 16.4+: `print` works; `while True: pass` recovers through the soft budget; `sum(range(10**10))` recovers through the hard watchdog; `input()` works queued and replayed; a SyntaxError squiggles the right column. **Recorded in `.claude/docs/runner-and-grading.md`:** the real `sys.version`, respawn time, tracer overhead (settrace vs `sys.monitoring`), Monaco chunk size. If a browser fails, switch to the documented fallback now (classic worker; `editor.main`) | M (1.5 d) |
| **M2** | **Design system and app shell** | `tokens.css` in both themes, no-flash theme boot, file:// banner, router, shell (activity bar, sidebar, tabs, panel, status bar), command palette and quick open skeleton, shortcut map, contrast and hue tests, landing rail with 13 topic stubs and mocked states, CLAUDE.md and `.claude/docs` stubs, README | App navigable in both themes at 400 px and 1440 px. Contrast and layer tests are green. Shortcut conflicts checked in 3 browsers. **Checkpoint 1 with the user:** look and feel, topic order (the T2/T3 note), unlock default | M (1.5 d) |
| **M3** | **Content pipeline** | `schema.ts`, concept, mistake (about 52), flag, rule and pattern catalogues. `verify-content.ts` with every §3.5 check. `new-question.ts` scaffolder. `content-authoring.md` with one worked example per format and the rubric. Topic 1 scenario 1 authored (4 questions) as the reference | `npm run verify` generates JSON for T1-s1. A deliberate typo in a mistake tag fails `tsc`. A wrong reference, a buggy variant that passes, or a later-topic concept fails `verify`. `verify:check` fails on stale generated files. CI runs all of it | M (2 d) |
| **M4** | **Workbench and code grading** | Monaco themes and markers, Problems, Tests (Moodle table plus `tests_visible.py`), Terminal, Input and Explain panels. `harness.py` (§3.2 comparisons, special detections, files, rules), `astchecks.py`, `errors.py` plus matcher. Graders and renderers for **write, fixBug, cloze, parsons** (keyboard and pointer, adaptive). Focus mode. Draft autosave | Every §3.4 example for these 4 formats grades correctly in the browser. Grader unit tests pass on fixture RunResults. The slow Node Pyodide harness tests pass. Hidden-test failures show only label and tag. AST warnings never change the score | L (3 d) |
| **M5** | **Read formats, hints, event log** | **mcq, multi, predict** (text and choice modes, mutants). HintLadder with gates, skims, L0 explain card, SolutionReveal plus self-explain, confidence toggle. IndexedDB wrapper, events v1, sessions, `persist()` | T1-s1 is fully playable, with Python loaded and not. Every check writes correct `attempt`, `hint` and `mistake` events (checked in DevTools and a unit test). Credit multipliers are unit-tested | M (2 d) |
| **M6** | **Progress, locking, pilot content** | `unlock.ts` (attempt, checkpoint, mastery, plus unlockAll), `mastery.ts`, live landing cards with lock reasons, topic page filters and tags, resume and "compare with last attempt", Report-this-question, export/import plus backup toast. **Author topics 1–4 (42 questions)** | `topicStatus` exhaustively tested across all modes. A fresh profile walks topic 1 → 2 → 3 in default mode. Export, reset, import restores state exactly. All 42 questions verified. **Pilot deployed; Checkpoint 2 with the user and student:** tone, difficulty, editor speed on their laptop, friction notes | L (1.5 d eng + 3 d content) |
| **M7** | **Reports and patterns (MVP)** | `report.ts` aggregations, heatmap, ladder matrix, mistake profile with time-to-fix and "Practise this", readiness checklist, behaviour signals, sessions table and timeline, pattern cards (Recommended, Already using, Later), Topic complete moment and topic report, Practise weak spots, print CSS, no-sync footer | A fixture event log renders a sensible report, and its snapshot test is stable. Every section links to a next action. **All hard requirements are now met** for topics 1–4. **Checkpoint 3:** is the report useful or noisy? | M (2 d) |
| **M8** | **Extended formats and topics 5–8** | **trace, twins, errorTranslator, refactor, testWriter** (renderers, graders, tracer generation, fixture tests). Restate box on hard writes. Author the 7 deferred T1–4 items plus topics 5–8 (50 questions) | Each new format has an example question and fixture tests passing. 99 questions verified in CI. Pilot feedback from M6 addressed | L (2 d eng + 4.5 d content) |
| **M9** | **Topics 9–13, projects, paper mode, test-out** | Virtual-file project tests, rule lint consequences, `kind:"project"` datasets (shuffled headers, extra column, bad and duplicate rows, no extension, missing file), paper mode, Test-out flow and UI. Author topics 9–13 (56 questions) | All 155 questions verified. A deliberately rule-breaking project draft shows every lint with its consequence. Test-out pass and fail paths are tested (including the retry rule). Paper mode hides Run and colouring | L (2 d eng + 5 d content) |
| **M10** | **Hardening** | Keyboard-only walkthrough of every format, screen-reader labels and aria-live results, textarea fallback on touch, narrow layouts, service worker caching the shell and pinned Pyodide, optional self-hosted fonts, profile picker UI, empty, loading and error states, copy review, performance budget (landing JS under 150 KB gzipped; Monaco chunk lazy), tag v1.0 | Lighthouse accessibility ≥ 95 on landing, topic and report. Offline reload works after the first visit. No console errors in the 3 browsers. README and CLAUDE.md final | M (2.5 d) |

**Totals:**

- **Engineering:** about 19.5 days.
- **Content:** about 12.5 days (roughly 1 day per topic).
- **Total:** about 32 working days.
- **Milestone dates:** pilot at the end of M6 (about 14.5 days), MVP at M7 (about 16.5 days), v1.0 at M10.

The extras (§11) come only after M10, or replace M8/M9 scope if the user asks.

---

## 10. Risks and mitigations

Every judge concern is covered below.

| # | Risk or concern | Decision and mitigation | Where |
|---|---|---|---|
| 1 | Pyodide 314 is probably CPython 3.14, not 3.12. Error wording may differ from Thonny | No hard-coded version anywhere; the status bar and About page show `sys.version`. Every generated output, traceback and error-regex fixture comes from Node `pyodide@314.0.7`, never the local CPython 3.12.13. One version constant is tested against `package.json`. The Explain panel notes that Thonny wording can differ | M1, M3 |
| 2 | Contradiction: `importScripts` vs dynamic `import()` | Settled: module worker plus dynamic `import()` of `pyodide.mjs`. A classic `importScripts(pyodide.js)` worker is the written fallback, used only if M1 fails | §4.3, M1 |
| 3 | Browser coverage untested (module worker, Monaco ESM worker, Safari) | The M1 go/no-go runs on localhost and the Pages URL in Chrome, Firefox and Safari 16.4+ before any content work | M1 |
| 4 | Unlock default is ambiguous; "open" vs "all" naming invites bugs | Default `attempt` (the literal wording: opened plus one attempt). `checkpoint` and `mastery` are the other modes. Unlock-all is a separate boolean. One pure `topicStatus` function, exhaustively tested. Every locked card states the rule and progress. **Confirmed with the user at Checkpoint 1** | §2, M2, M6 |
| 5 | Topic order differs from lectures | Follow the user's order and put a note on the topic 2 card. The verifier's concept checker blocks later-topic constructs, and `def` is allowed early only as starter scaffolding | §2, §3.5 |
| 6 | Replay-stdin repeats side effects | `random.seed(1401)` before every run, `/work` reset before replays, and the verifier forbids random, time and file writes in stdin questions. Tests always use queued stdin, never replay. Project mode treats `input()` as a rule violation. A Playground note explains it | §4.5 |
| 7 | Content volume is the main schedule risk | 155 questions, not 200. The scaffolder removes blank-page authoring. A 42-question pilot of topics 1–4 goes to the user and student before bulk authoring. Content is budgeted at about 1 day per topic, never less | M3, M6 |
| 8 | Dev workflow changes from double-clicking HTML files | README and CLAUDE.md say "npm run dev or the Pages URL" in the first lines. An inline script detects `file:` and shows a banner instead of failing silently | §4.9, M2 |
| 9 | Progress is device-only and can be lost | IndexedDB plus `navigator.storage.persist()`, export/import with merge, backup toast after 10 sessions or 7 days, last-backup date and "No sync between devices" on Report and Settings | §5 |
| 10 | settrace overhead (3–20×) causes false timeouts | Tracer only on `<student>` frames, `sys.monitoring` measured in M1, per-question `budgetMs`, and the verifier warns when the reference exceeds 20% of budget | §4.4, §3.5 |
| 11 | Long C-level calls bypass the soft budget; respawn time unknown | The hard watchdog covers them. Respawn time is measured in M1 (expect 2–5 s). The pill shows "restarting". Editor text lives on the main thread and in snapshots | §4.4 |
| 12 | Autograding false negatives (tuple vs list, floats, whitespace) | One `expect` encoding (Python repr). Comparison semantics defined once (§3.2): type-strict containers, numeric int/float equality, declared tolerances, and one stdout normaliser shared by grader and verifier. Prompts must state the return type. Report-this-question logs `flag` events that the author can export | §3.2, M6 |
| 13 | AST detector false positives | Warnings never lower the score. A mistake is logged only with a matching failing tagged test or an explicit `detects` entry. Per-question `allowFlags`. Report thresholds need 2–3 repeats. Detectors are unit-tested in Node Pyodide | §3.3, §4.8 |
| 14 | "CodeRunner penalty shown but not applied" confuses students | Dropped entirely. Only hint tiers affect credit. The report shows first-submit pass rate | §3.3 |
| 15 | Scope creep (playground step-through, exam presets, spaced review, adaptive mode) | All moved to §11 extras after v1.0. The MVP at M7 meets every hard requirement. The command palette stays in M2/M4 because it is part of the VS Code feel | §9, §11 |
| 16 | Monaco is heavy and weak on touch | Lazy chunk loaded only in the workbench. Textarea editor on coarse pointers, widths under 700 px, or load failure | §4.2, M10 |
| 17 | UWA branding and implied endorsement | No logos or crest. Footer disclaimer: "aligned with public CITS1401 materials; check your LMS outline" | §5.6 |
| 18 | Untyped content lets typos slip through silently | TS discriminated unions, `as const` catalogues, closed `MistakeId`/`AstFlag`/`ConceptId`/`RuleId` unions | §3.1 |
| 19 | Referential integrity | The verifier checks ids, tags, pattern cards, Parsons reassembly, cloze accept lists, buggy variants failing their tagged test, and concept order | §3.5 |
| 20 | Generated artifacts go stale | Committed in `generated/`. `verify:check` regenerates and fails on diff in CI and in `npm run check`. CLAUDE.md says never hand-edit | §3.5, M3 |
| 21 | 14 formats means 14 renderers and graders to maintain | 12 formats (true/false folded into mcq; paper, project and program folded into write). 7 at launch (M4–M5), 5 more in M8 behind the same interface, each with fixture tests | §2, §9 |
| 22 | Event schema drift; pruning changes derived state | `v` on every event, one migrations file, attempt, mistake, hint, override and flag events never pruned; only `run` events are compacted, and they don't feed mastery or unlock | §5.2, §5.4 |
| 23 | Huge per-topic files and `questionIds` indirection | One file per scenario with questions nested inline. No id-reference lists | §8 |
| 24 | localStorage quota (5 MB) | Event log and snapshots in IndexedDB; only settings and profiles in localStorage | §5.1 |
| 25 | Monaco 0.56 ESM import paths unverified | Confirmed in M1, with `editor.main` as the fallback (bigger chunk) | §4.2, M1 |
| 26 | TypeScript 7 native compiler is new | Used for type-checking only; fall back to the latest 5.x or 6.x with no code changes | §4.1 |
| 27 | jsdelivr is a single point of failure; 13.5 MB first load | Stage pill, non-code formats work without Python, HTTP cache, service worker in M10. Self-hosting Pyodide (copying from the npm devDependency into `dist/`) is a documented switch, not the default | §4.9, M10 |
| 28 | CI failures block small content fixes; toolchain weight | No React and no custom Vite plugin. CI stages are fast. A `workflow_dispatch` input `skipSlow` exists for urgent content-only deploys, and verify still runs | §8 |
| 29 | Answers ship in the bundle; progress can be faked | Stated in the README and About page: self-study only, never assessment | §5.6 |
| 30 | Grading harness code untested (a design-A weakness) | `harness.py`, `astchecks.py` and `tracer.py` are covered by `slow` Vitest tests in Node Pyodide | M4 |
| 31 | Layer rot as the app grows | `layers.test.ts` scans imports: content and engine never import ui, runtime or store | M2 |
| 32 | Curriculum drift (2026 outline not retrievable) | Topic order, weeks and bands are data in `topics.ts`, so reordering is a one-line edit guarded by the concept checker. The disclaimer points to the LMS | §2 |
| 33 | Browser shortcut conflicts (Cmd+P, Ctrl+Shift+P in Firefox, Alt+letter on macOS) | F1 is always the palette key, the next/previous bindings avoid Alt+letter, and all bindings are tested in 3 browsers | §6.6, M2 |

---

## 11. Extra ideas beyond the brief (opt-in)

Ranked by value for effort. None are in the M1–M10 estimate.

| Rank | Idea | Value | Effort | Notes |
|---|---|---|---|---|
| 1 | **Spaced review warm-up**: reviews at +2/+7/+21 days after completion; 3 unseen questions weighted to the weakest format; a "Warm-up: N due" card; interleaves up to 3 topics; a failed review flags the topic | High (retrieval practice is linked to exam gains) | S–M (1.5 d) | Uses the existing event log; adds `scheduler.ts` |
| 2 | **Exam simulator presets**: "Mid-semester" (20 read items, 40 min) and "Final" (6 paper write items weighted 5/5/10/10/15/20, one guaranteed recursion item, 90 min) | High (the final is closed-book and on paper, worth 55–60%) | M (1.5 d) | Reuses paper mode and the readiness report |
| 3 | **Playground with step-through**: persistent REPL, "Open in Playground" on any snippet, a slider over per-line variable snapshots | High (a simple model of how code runs) | M (2–3 d) | `trace` op already in the protocol |
| 4 | **Project style and efficiency estimate**: auto-estimate the 5 style marks (names, docstrings, name header) and 3 efficiency marks (counts `open`/`readline` calls and nested full scans) on project items | Med–High (mirrors the real 30-mark rubric) | M (2 d) | Uses `style_naming` and `efficiency_repeat_pass` |
| 5 | **Parameterised variants and practice-set builder**: `vary(seed)` on questions, re-verified in the worker; builder for topics × difficulty × formats × count; variant solves lift the 0.9 cap after a revealed solution | Med–High | M–L (3 d) | Verifier must check variant generators over N seeds |
| 6 | **Adaptive difficulty suggestion**: "Next: Medium Parsons" from per-difficulty mastery (the lowest difficulty under 80%, one ladder rung above the strongest) | Medium | S (0.5 d) | Pure function over existing data |
| 7 | **"This week in CITS1401" card**: semester and week picker with an offset, mapping to 2026 teaching weeks (S2 week 1 = 20 Jul) | Medium | S (0.5 d) | Week tags already in `topics.ts` |
| 8 | **Streak and daily goal**: credit for each day with ≥ 5 questions and a 14-day strip, with no loss-aversion nagging | Low–Med | S (0.5 d) | |
| 9 | **Live-expression challenges** in the Playground ("make this evaluate to 7 using //") | Low–Med | S (1 d) | Auto-graded by eval |
| 10 | **Printable cheat-sheet pack**: all topic cheat sheets plus pattern cards as one print-CSS page for pen-and-paper revision | Medium | S (0.5 d) | |
| 11 | **Vim keybindings** | Low | S | Needs `monaco-vim`; its version was not checked in the research |
| 12 | **Cross-device sync**: small backend with accounts | Medium for multi-device use | L (5+ d, plus hosting and privacy work) | Changes the privacy model; only if asked |