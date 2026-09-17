// Pinned Pyodide version for the browser runtime. Must equal the `pyodide` devDependency in package.json
// (checked by src/runtime/__tests__/client.version.test.ts) so browser runs match the verifier's outputs.

export const PYODIDE_VERSION = '314.0.7';

/** CDN folder holding pyodide.mjs, pyodide.asm.wasm and python_stdlib.zip. Ends with a slash. */
export const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
