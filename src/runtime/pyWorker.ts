// Python module worker. Loads Pyodide from the CDN, installs the grading package (src/runtime/python) and
// answers one request at a time. Created by pyClient.ts with
//   new Worker(new URL('./pyWorker.ts', import.meta.url), { type: 'module' })
//
// Messages in:  { id, op: 'run' | 'tests' | 'analyze' | 'pair', payload }
// Messages out: status stages, ready, loadError, and per request `started` then `result` (or `fatal`).
import type { PyodideAPI, PyodideConfig } from 'pyodide';
import type { PairRequest, RunRequest, TestsRequest } from './protocol.ts';
import { PY_ENTRY, PY_PACKAGE, PY_ROOT } from './python/manifest.ts';
import { PY_SOURCES } from './python/sources.ts';
import { PYODIDE_URL, PYODIDE_VERSION } from './version.ts';

export type WorkerOp = 'run' | 'tests' | 'analyze' | 'pair';

export type ClientToWorker =
  | { id: number; op: 'run'; payload: RunRequest }
  | { id: number; op: 'tests'; payload: TestsRequest }
  | { id: number; op: 'analyze'; payload: { code: string } }
  | { id: number; op: 'pair'; payload: PairRequest };

export type WorkerToClient =
  | { type: 'status'; stage: string }
  | { type: 'ready'; python: string; pyodide: string; loadMs: number }
  | { type: 'loadError'; message: string }
  | { type: 'started'; id: number }
  | { type: 'result'; id: number; ok: true; data: unknown }
  | { type: 'result'; id: number; ok: false; error: string }
  | { type: 'fatal'; id?: number; message: string };

/** Stage names shown in the runtime pill, in order. */
export const STAGES = { download: 'Downloading Python', start: 'Starting Python', grader: 'Loading grader' } as const;

type PyFn = (...args: unknown[]) => string;
interface HarnessFns { run_program: PyFn; run_tests: PyFn; analyze: PyFn; pair: PyFn }

const scope = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: WorkerToClient) {
  scope.postMessage(msg);
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message || e.name;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') return (e as { message: string }).message;
  try {
    return JSON.stringify(e) ?? String(e);
  } catch {
    return String(e);
  }
}

/** A Pyodide PythonError means the harness raised; anything else (RangeError, wasm traps, flagged errors) is fatal. */
function isFatal(e: unknown): boolean {
  if (!e || typeof e !== 'object') return true;
  const err = e as { pyodide_fatal_error?: boolean; name?: string; constructor?: { name?: string } };
  if (err.pyodide_fatal_error) return true;
  return !(err.name === 'PythonError' || err.constructor?.name === 'PythonError');
}

let harness: HarnessFns | null = null;
let dead = false;

/**
 * Pyodide hangs instead of rejecting when pyodide.asm.wasm cannot be fetched, so watch the CDN fetches made during
 * loading and fail fast when a core file does not arrive.
 */
function watchCdnFetches(onFail: (err: Error) => void): () => void {
  const realFetch = scope.fetch;
  scope.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const p = realFetch.call(scope, input, init);
    if (url.startsWith(PYODIDE_URL) && /\.(wasm|zip|m?js)$/.test(url)) {
      const file = url.slice(PYODIDE_URL.length);
      p.then(
        (res) => { if (!res.ok) onFail(new Error(`${file} returned HTTP ${res.status}`)); },
        (err: unknown) => onFail(new Error(`${file}: ${messageOf(err)}`)),
      );
    }
    return p;
  };
  return () => { scope.fetch = realFetch; };
}

async function boot(): Promise<boolean> {
  const t0 = performance.now();
  let py: PyodideAPI;
  let unwatch = () => {};
  try {
    post({ type: 'status', stage: STAGES.download });
    let failLoad: (err: Error) => void = () => {};
    const failed = new Promise<never>((_, reject) => { failLoad = reject; });
    failed.catch(() => {});
    unwatch = watchCdnFetches((err) => failLoad(err));
    const mod = (await import(/* @vite-ignore */ `${PYODIDE_URL}pyodide.mjs`)) as {
      loadPyodide: (config: PyodideConfig) => Promise<PyodideAPI>;
    };
    let started = false;
    const markStarted = () => {
      if (started) return;
      started = true;
      post({ type: 'status', stage: STAGES.start });
    };
    const loading = mod.loadPyodide({
      indexURL: PYODIDE_URL,
      stdout: () => {},
      stderr: () => {},
      // Runs once the WebAssembly module is compiled. The standard library zip is written to /lib/pythonXY.zip as soon
      // as it has downloaded, and Python starts straight after that (synchronously), so post the stage from that write.
      fsInit: async (FS) => {
        try {
          const fs = FS as unknown as { writeFile: (path: string, ...rest: unknown[]) => unknown };
          const realWrite = fs.writeFile;
          fs.writeFile = function (this: unknown, path: string, ...rest: unknown[]) {
            if (typeof path === 'string' && /^\/lib\/python\d+\.zip$/.test(path)) {
              fs.writeFile = realWrite;
              markStarted();
            }
            return realWrite.call(this, path, ...rest);
          };
        } catch {
          /* stage labels are cosmetic */
        }
      },
    });
    py = await Promise.race([loading, failed]);
    markStarted();
  } catch (e) {
    post({ type: 'loadError', message: `Python could not be downloaded or started (${messageOf(e)}). Check your internet connection, then try again.` });
    return false;
  } finally {
    unwatch();
  }

  try {
    post({ type: 'status', stage: STAGES.grader });
    const pkgDir = `${PY_ROOT}/${PY_PACKAGE}`;
    py.FS.mkdirTree(pkgDir);
    for (const [name, source] of PY_SOURCES) py.FS.writeFile(`${pkgDir}/${name}`, source);
    py.runPython(`import sys\nif ${JSON.stringify(PY_ROOT)} not in sys.path:\n    sys.path.insert(0, ${JSON.stringify(PY_ROOT)})`);
    const mod = py.pyimport(PY_ENTRY) as unknown as Record<string, unknown>;
    const pick = (name: keyof HarnessFns): PyFn => {
      const f = mod[name];
      if (typeof f !== 'function') throw new Error(`harness.${name} is missing`);
      return f as PyFn;
    };
    const h: HarnessFns = { run_program: pick('run_program'), run_tests: pick('run_tests'), analyze: pick('analyze'), pair: pick('pair') };
    // Warm the imports used on the first real request (ast, json, traceback, the sandbox) so it answers quickly.
    JSON.parse(h.analyze('x = 1\n'));
    JSON.parse(h.run_program('pass\n', '[]', '[]', 2000));
    const python = String(py.runPython('import sys\nsys.version.split()[0]'));
    harness = h;
    post({ type: 'ready', python, pyodide: String(py.version || PYODIDE_VERSION), loadMs: Math.round(performance.now() - t0) });
    return true;
  } catch (e) {
    post({ type: 'loadError', message: `The Python grader could not be loaded (${messageOf(e)}).` });
    return false;
  }
}

const json = (v: unknown) => JSON.stringify(v ?? []);
/** Optional values must reach Python as None. JS null becomes pyodide's jsnull, so pass undefined instead. */
const opt = <T>(v: T | null | undefined): T | undefined => (v === null ? undefined : v);

function callHarness(h: HarnessFns, msg: ClientToWorker): string {
  switch (msg.op) {
    case 'run': {
      const p = msg.payload;
      return h.run_program(String(p.code ?? ''), json(p.stdin), json(p.files), opt(p.budgetMs));
    }
    case 'tests': {
      const p = msg.payload;
      return h.run_tests(String(p.code ?? ''), json(p.tests), p.kind || 'function', opt(p.fnName), json(p.rules), opt(p.budgetMsPerTest));
    }
    case 'analyze':
      return h.analyze(String(msg.payload?.code ?? ''));
    case 'pair': {
      const p = msg.payload;
      return h.pair(String(p.reference ?? ''), String(p.buggy ?? ''), String(p.fnName ?? ''), String(p.argsRepr ?? ''));
    }
  }
}

async function handle(msg: ClientToWorker) {
  if (!msg || typeof msg.id !== 'number') return;
  const loaded = await booting;
  const h = harness;
  if (!loaded || !h) {
    post({ type: 'result', id: msg.id, ok: false, error: 'Python is not loaded.' });
    return;
  }
  if (dead) {
    post({ type: 'fatal', id: msg.id, message: 'Python stopped working and must be restarted.' });
    return;
  }
  post({ type: 'started', id: msg.id });
  let text: string;
  try {
    text = callHarness(h, msg);
  } catch (e) {
    if (isFatal(e)) {
      dead = true;
      post({ type: 'fatal', id: msg.id, message: messageOf(e) });
    } else {
      post({ type: 'result', id: msg.id, ok: false, error: `The Python grader failed: ${messageOf(e)}` });
    }
    return;
  }
  try {
    post({ type: 'result', id: msg.id, ok: true, data: JSON.parse(text) as unknown });
  } catch (e) {
    post({ type: 'result', id: msg.id, ok: false, error: `The Python grader returned bad data: ${messageOf(e)}` });
  }
}

const booting = boot();
let chain: Promise<void> = Promise.resolve();

scope.onmessage = (ev: MessageEvent<ClientToWorker>) => {
  const msg = ev.data;
  chain = chain.then(() => handle(msg)).catch((e: unknown) => {
    dead = true;
    post({ type: 'fatal', id: msg?.id, message: messageOf(e) });
  });
};

scope.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
  if (!harness) return; // load failures are reported by boot()
  dead = true;
  post({ type: 'fatal', message: messageOf(ev.reason) });
});
