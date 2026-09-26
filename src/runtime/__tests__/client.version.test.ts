// The browser Pyodide version must match the npm devDependency the verifier generates outputs with.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PYODIDE_URL, PYODIDE_VERSION, WEBR_URL, WEBR_VERSION } from '../version.ts';

describe('pyodide version', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  it('equals the pyodide version in package.json', () => {
    const pinned = pkg.devDependencies?.pyodide ?? pkg.dependencies?.pyodide;
    expect(pinned).toBeDefined();
    expect(PYODIDE_VERSION).toBe(pinned);
    expect(PYODIDE_VERSION).toBe('314.0.7');
  });

  it('builds the jsdelivr folder URL from the version', () => {
    expect(PYODIDE_URL).toBe('https://cdn.jsdelivr.net/pyodide/v314.0.7/full/');
    expect(PYODIDE_URL.endsWith('/')).toBe(true);
  });
});

// The same rule for R: lesson outputs come from the npm copy of webR, a student's runs from the CDN one.
describe('webR version', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
    devDependencies?: Record<string, string>;
  };

  it('equals the webr version in package.json', () => {
    expect(pkg.devDependencies?.webr).toBeDefined();
    expect(WEBR_VERSION).toBe(pkg.devDependencies?.webr);
  });

  it('is a CDN folder the sandbox will accept', () => {
    expect(WEBR_URL).toBe(`https://cdn.jsdelivr.net/npm/webr@${WEBR_VERSION}/dist/`);
    const sandbox = readFileSync(new URL('../../../public/r-sandbox.js', import.meta.url), 'utf8');
    expect(sandbox).toContain("'https://cdn.jsdelivr.net/npm/webr@'");
  });
});
