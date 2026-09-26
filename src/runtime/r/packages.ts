// The R packages available beyond base R, and which of them a piece of code needs.
//
// The files are in public/r-packages/, pinned by hash in packages.json (scripts/r-packages.ts explains
// why they are kept here rather than fetched from repo.r-wasm.org). A package is installed into R the
// first time code asks for it -- library(MASS), require(pscl), survival::Surv -- so a lesson that never
// uses one never downloads it. The verifier and the browser install from the same files.
import MANIFEST from './packages.json' with { type: 'json' };

export interface RPackage {
  name: string;
  version: string;
  /** File name in public/r-packages/, e.g. "MASS_7.3-65.tgz". */
  file: string;
  /** SHA-256 of the file, hex. Checked before anything is installed. */
  sha256: string;
  /** Packages outside base R this one needs installed first. */
  deps: string[];
}

export const R_PACKAGES: Record<string, RPackage> = MANIFEST as Record<string, RPackage>;

// library(MASS), library("MASS"), require(pscl), requireNamespace("survival"), and MASS::glm.nb or
// MASS:::x. A comment is stripped first, so "# see library(MASS)" does not install anything.
const CALL = /\b(?:library|require|requireNamespace|loadNamespace)\s*\(\s*["']?([A-Za-z][A-Za-z0-9.]*)["']?/g;
const QUALIFIED = /\b([A-Za-z][A-Za-z0-9.]*):::?/g;

/** Packages from the manifest that some code asks for, by name. Unknown names are left for R to refuse. */
export function packagesUsed(...codes: readonly (string | undefined)[]): string[] {
  const found = new Set<string>();
  for (const code of codes) {
    if (!code) continue;
    const text = code.split('\n').map((line) => line.replace(/#.*$/, '')).join('\n');
    for (const re of [CALL, QUALIFIED]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text))) if (R_PACKAGES[m[1]]) found.add(m[1]);
    }
  }
  return [...found].sort();
}

/** The packages to install for `names`, dependencies before the packages that need them. */
export function installOrder(names: readonly string[]): RPackage[] {
  const out: RPackage[] = [];
  const seen = new Set<string>();
  const visit = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    const p = R_PACKAGES[name];
    if (!p) return;
    p.deps.forEach(visit);
    out.push(p);
  };
  names.forEach(visit);
  return out;
}
