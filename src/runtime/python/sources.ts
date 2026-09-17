// Vite-only helper for the browser worker: the grading package sources as strings, keyed by file name.
// Node code (the verifier) reads the .py files from disk instead; see scripts/verify/pyodide.ts.
import { PY_MODULES } from './manifest.ts';

const raw = import.meta.glob<string>('./*.py', { query: '?raw', import: 'default', eager: true });

/** [fileName, source] pairs in PY_MODULES load order. */
export const PY_SOURCES: ReadonlyArray<readonly [string, string]> = PY_MODULES.map((name) => {
  const src = raw[`./${name}`];
  if (typeof src !== 'string') throw new Error(`Python module ${name} is missing from src/runtime/python`);
  return [name, src] as const;
});
