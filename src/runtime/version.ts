// Pinned Pyodide version for the browser runtime. Must equal the `pyodide` devDependency in package.json
// (checked by src/runtime/__tests__/client.version.test.ts) so browser runs match the verifier's outputs.

export const PYODIDE_VERSION = '314.0.7';

/** CDN folder holding pyodide.mjs, pyodide.asm.wasm and python_stdlib.zip. Ends with a slash. */
export const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

// Pinned webR version for STAT2402's R. Must equal the `webr` devDependency in package.json (the verifier
// runs that copy in Node), checked by the same test, so what a student's R prints matches the lessons.
export const WEBR_VERSION = '0.6.0';

/** CDN folder holding webr.js (the browser build), its worker, R.wasm and the R library. Ends with a slash. */
export const WEBR_URL = `https://cdn.jsdelivr.net/npm/webr@${WEBR_VERSION}/dist/`;
