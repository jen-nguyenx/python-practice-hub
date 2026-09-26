// The R packages the STAT2402 lessons use beyond base R, kept in public/r-packages/ and pinned by hash in
// src/runtime/r/packages.json.
//
// Why they live in the repository rather than being fetched from repo.r-wasm.org at run time: that repo
// keeps only the newest build of each package, so a pinned URL stops existing the day the package updates
// (MASS 7.3-64 was already gone when this was written). Kept here, a lesson's recorded output and a
// student's run use byte-for-byte the same package, forever, and neither depends on a third party being up.
//
//   node scripts/r-packages.ts            check every file is present and matches its hash
//   node scripts/r-packages.ts --update   fetch the newest builds of the listed packages and rewrite the pins
//
// After --update, run `npm run verify`: a new package version can change what a lesson prints.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ROOT } from './verify/pyodide.ts';
import type { RPackage } from '../src/runtime/r/packages.ts';

export const R_PACKAGE_DIR = join(PROJECT_ROOT, 'public', 'r-packages');
const MANIFEST = join(PROJECT_ROOT, 'src', 'runtime', 'r', 'packages.json');
/** The contrib folder for webR's R version (R 4.6 for webR 0.6.x). */
const REPO = 'https://repo.r-wasm.org/bin/emscripten/contrib/4.6';
/** What the lessons ask for. Their dependencies outside base R are found and pinned too. */
const WANTED = ['MASS', 'pscl', 'survival'];
const BASE = new Set(['R', 'base', 'compiler', 'datasets', 'grDevices', 'graphics', 'grid', 'methods', 'parallel', 'splines', 'stats', 'stats4', 'tcltk', 'tools', 'utils']);

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function readManifest(): Record<string, RPackage> {
  return JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, RPackage>;
}

/** Every pinned file present and unchanged. Returns the problems, empty when all is well. */
export function checkPackages(): string[] {
  const problems: string[] = [];
  for (const p of Object.values(readManifest())) {
    const path = join(R_PACKAGE_DIR, p.file);
    if (!existsSync(path)) problems.push(`${p.file} is missing from public/r-packages`);
    else if (sha256(readFileSync(path)) !== p.sha256) problems.push(`${p.file} does not match its pinned hash`);
  }
  return problems;
}

/** Parse the repo's PACKAGES index into name -> fields. */
function parseIndex(text: string): Map<string, Record<string, string>> {
  const out = new Map<string, Record<string, string>>();
  for (const block of text.split(/\n\s*\n/)) {
    const fields: Record<string, string> = {};
    let last = '';
    for (const line of block.split('\n')) {
      if (/^\s/.test(line) && last) fields[last] += ` ${line.trim()}`;
      else {
        const m = /^([A-Za-z]+):\s*(.*)$/.exec(line);
        if (m) { fields[m[1]] = m[2]; last = m[1]; }
      }
    }
    if (fields.Package) out.set(fields.Package, fields);
  }
  return out;
}

const names = (field: string | undefined) => (field ?? '').split(',').map((s) => s.trim().replace(/\s*\(.*\)$/, '')).filter((s) => s && !BASE.has(s));

async function update(): Promise<void> {
  const index = parseIndex(await (await fetch(`${REPO}/PACKAGES`)).text());
  const pinned: Record<string, RPackage> = {};
  const visit = (name: string) => {
    if (pinned[name]) return;
    const f = index.get(name);
    if (!f) throw new Error(`${name} is not in ${REPO}/PACKAGES`);
    const deps = [...names(f.Depends), ...names(f.Imports)];
    pinned[name] = { name, version: f.Version, file: `${name}_${f.Version}.tgz`, sha256: '', deps };
    deps.forEach(visit);
  };
  WANTED.forEach(visit);
  mkdirSync(R_PACKAGE_DIR, { recursive: true });
  for (const p of Object.values(pinned)) {
    const res = await fetch(`${REPO}/${p.file}`);
    if (!res.ok) throw new Error(`${p.file}: HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    p.sha256 = sha256(bytes);
    writeFileSync(join(R_PACKAGE_DIR, p.file), bytes);
    console.log(`${p.file}  ${(bytes.length / 1e6).toFixed(1)} MB`);
  }
  // Old versions go, so the folder holds exactly what the manifest names.
  const keep = new Set(Object.values(pinned).map((p) => p.file));
  for (const f of readdirSync(R_PACKAGE_DIR)) if (!keep.has(f)) rmSync(join(R_PACKAGE_DIR, f));
  const sorted = Object.fromEntries(Object.keys(pinned).sort().map((k) => [k, pinned[k]]));
  writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`Pinned ${Object.keys(pinned).length} packages. Now run npm run verify.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--update')) await update();
  const problems = checkPackages();
  for (const p of problems) console.log(`- ${p}`);
  if (problems.length) process.exit(1);
  console.log(`All ${Object.keys(readManifest()).length} R packages present and matching their pins.`);
}
