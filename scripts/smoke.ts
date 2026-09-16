// End-to-end smoke test against a production build, in real Chrome.
// Usage: npm run build && node scripts/smoke.ts [--base http://localhost:4173/] [--shots scratch/smoke]
import { chromium, type ConsoleMessage, type Page } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const argVal = (name: string, def: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const SHOTS = argVal('--shots', 'scratch/smoke');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
mkdirSync(SHOTS, { recursive: true });

let server: ReturnType<typeof spawn> | undefined;
let base = argVal('--base', '');
if (!base) {
  server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'pipe' });
  base = 'http://localhost:4173/';
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('preview server did not start')), 20000);
    server!.stdout!.on('data', (d: Buffer) => { if (String(d).includes('4173')) { clearTimeout(t); resolve(); } });
  });
}

type Index = { qid: string; topicId: string; format: string; diff: string }[];
const index: Index = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'));

const failures: string[] = [];
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const consoleErrors: string[] = [];
page.on('console', (m: ConsoleMessage) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) consoleErrors.push(`${page.url()} :: ${m.text()}`); });
page.on('pageerror', (e) => consoleErrors.push(`${page.url()} :: pageerror ${e.message}`));

async function visit(p: Page, hash: string, shot?: string) {
  await p.goto(base + hash, { waitUntil: 'load' });
  await p.waitForTimeout(700);
  const body = await p.textContent('body') ?? '';
  for (const bad of ['is being built', 'not implemented', 'Grader not implemented', 'answer data is missing']) {
    if (body.includes(bad)) failures.push(`${hash}: page shows "${bad}"`);
  }
  if (shot) await p.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: false });
}

await visit(page, '#/', 'landing');
// Python should become ready.
try {
  await page.waitForFunction(() => /ready/i.test(document.querySelector('header')?.textContent ?? ''), null, { timeout: 90000 });
} catch { failures.push('Python runtime never showed ready in the header'); }

for (const hash of ['#/playground', '#/report', '#/midsem', '#/settings']) await visit(page, hash, hash.replace(/[#/]/g, '') || 'root');

// One question per (topic, format).
const seen = new Set<string>();
for (const q of index) {
  const key = `${q.topicId}:${q.format}`;
  if (seen.has(key)) continue;
  seen.add(key);
  await visit(page, `#/topic/${q.topicId}`);
  await visit(page, `#/q/${q.qid}`, `q-${q.qid}`);
}

console.log(`Visited ${seen.size} question samples across ${new Set(index.map((q) => q.topicId)).size} topics.`);
if (consoleErrors.length) failures.push(...consoleErrors.slice(0, 30).map((e) => `console: ${e}`));
await browser.close();
server?.kill();
if (failures.length) {
  console.log(`SMOKE FAILED (${failures.length})`);
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
console.log('SMOKE PASSED');
