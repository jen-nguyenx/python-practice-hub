// Python grading package manifest. Node-safe (no Vite-only syntax): used by the browser worker and the verifier.
//
// Loading contract (browser worker and scripts/verify/pyodide.ts do the same):
//   1. FS.mkdirTree(`${PY_ROOT}/${PY_PACKAGE}`)
//   2. for each name in PY_MODULES: FS.writeFile(`${PY_ROOT}/${PY_PACKAGE}/${name}`, source)
//   3. runPython(`import sys; sys.path.insert(0, '${PY_ROOT}')`) then pyimport(`${PY_PACKAGE}.harness`)
//   4. call harness.run_program / run_tests / analyze / pair / trace / run_capture; each returns a JSON string.
// Sources: `import.meta.glob('./*.py', { query: '?raw', import: 'default', eager: true })` (see sources.ts).

/** Package name student code cannot import. */
export const PY_PACKAGE = '_pl';

/** Directory added to sys.path. The harness uses `${PY_ROOT}/work` as the virtual working directory. */
export const PY_ROOT = '/pyladder';

/** File names in load order (dependencies first). */
export const PY_MODULES: readonly string[] = [
  '__init__.py',
  'errors.py',
  'compare.py',
  'sandbox.py',
  'astchecks.py',
  'tracer.py',
  'harness.py',
];

/** Python entry module to pyimport after writing the files. */
export const PY_ENTRY = `${PY_PACKAGE}.harness`;
