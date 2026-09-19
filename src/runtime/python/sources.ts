// Vite-only helper for the browser worker: the grading package sources as strings, keyed by file name.
// Node code (the verifier) reads the .py files from disk instead; see scripts/verify/pyodide.ts.
import { PY_BROWSER_MODULES } from './manifest.ts';

// verify.py is excluded at the glob, not just filtered afterwards: an eager glob bundles every file it
// matches, so filtering the list alone would still ship the source to every student.
const raw = import.meta.glob<string>(['./*.py', '!./verify.py'], { query: '?raw', import: 'default', eager: true });

/** [fileName, source] pairs in load order. Verifier-only modules are not included. */
export const PY_SOURCES: ReadonlyArray<readonly [string, string]> = PY_BROWSER_MODULES.map((name) => {
  const src = raw[`./${name}`];
  if (typeof src !== 'string') throw new Error(`Python module ${name} is missing from src/runtime/python`);
  return [name, src] as const;
});
