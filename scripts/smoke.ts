// End-to-end smoke test against a production build, in real Chrome.
// Usage: npm run build && node scripts/smoke.ts [--base http://localhost:4173/] [--shots scratch/smoke]
import { chromium, type ConsoleMessage, type Page } from 'playwright-core';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

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
const TOPICS: { id: string }[] = [...new Set(index.map((q) => q.topicId))].map((id) => ({ id }));

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
  await page.waitForFunction(() => /ready/i.test(document.body.innerText), null, { timeout: 90000 });
} catch { failures.push('Python runtime never showed ready'); }

for (const hash of ['#/playground', '#/report', '#/exam', '#/settings']) await visit(page, hash, hash.replace(/[#/]/g, '') || 'root');

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

// "What if": every outcome is generated at verify time, so a control must change the output without
// Python running at all. A stale or missing generated file would silently show the same thing forever.
// A fresh profile opens the first-run tour, whose dialog would swallow every click below.
await page.getByRole('button', { name: /^Skip/ }).first().click({ timeout: 5000 }).catch(() => {});
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(400);
const withExperiments: string[] = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'))
  .map((q: { topicId: string }) => q.topicId)
  .filter((id: string, i: number, all: string[]) => all.indexOf(id) === i)
  .filter((id: string) => existsSync(`src/content/generated/experiments/${id}.json`));
for (const topicId of withExperiments) {
  await visit(page, `#/topic/${topicId}`);
  const tab = page.getByRole('tab', { name: 'What if' });
  if (!(await tab.count())) {
    failures.push(`what if: ${topicId} has generated experiments but no tab`);
    continue;
  }
  await tab.click();
  await page.waitForTimeout(500);
  const cards = page.locator('.wi-card');
  const n = await cards.count();
  if (n === 0) failures.push(`what if: ${topicId} shows no experiments`);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const knobs = card.locator('.wi-knob');
    const knobCount = await knobs.count();
    // What the student is meant to observe: the printed output, the variable table, and how much of the
    // picture is lit. Deliberately NOT the note, which is authored per combination and so would move even
    // if the generated data were frozen -- that would make this check pass for the wrong reason.
    const shown = async () => {
      const text = await card.locator('.wi-out, .wi-table').allInnerTexts();
      const lit = await card.locator('.wi-cell.is-picked, .wi-tick.is-hit').count();
      return `${text.join('|')}#${lit}`;
    };
    const program = () => card.locator('.wi-code').innerText();
    const openingShown = await shown();
    let outputMoved = false;

    // Each control is tried from the state the card opens in, and put back afterwards. Without the reset,
    // an earlier control can move the card into a region where a later one genuinely has no effect.
    for (let k = 0; k < knobCount; k++) {
      const knob = knobs.nth(k);
      const beforeProgram = await program();
      const slider = knob.locator('.wi-slider');
      const opts = knob.locator('[role="radio"]');

      if (await slider.count()) {
        const original = await slider.inputValue();
        await slider.focus();
        await page.keyboard.press('End');
        await page.waitForTimeout(150);
        if (await program() === beforeProgram) await page.keyboard.press('Home');
        await page.waitForTimeout(200);
        if (await program() === beforeProgram) failures.push(`what if: ${topicId} experiment ${i + 1} control ${k + 1} does not change the program`);
        if (await shown() !== openingShown) outputMoved = true;
        await slider.evaluate((el, v) => {
          (el as HTMLInputElement).value = v as string;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }, original);
      } else {
        const count = await opts.count();
        let original = 0;
        for (let o = 0; o < count; o++) {
          if (await opts.nth(o).getAttribute('aria-checked') === 'true') { original = o; break; }
        }
        await opts.nth(count - 1).click();
        await page.waitForTimeout(150);
        if (await program() === beforeProgram) await opts.nth(0).click();
        await page.waitForTimeout(200);
        if (await program() === beforeProgram) failures.push(`what if: ${topicId} experiment ${i + 1} control ${k + 1} does not change the program`);
        if (await shown() !== openingShown) outputMoved = true;
        await opts.nth(original).click();
      }
      await page.waitForTimeout(120);
    }
    if (!outputMoved) {
      failures.push(`what if: ${topicId} experiment ${i + 1} shows the same result whichever control is moved`);
    }
  }
  await page.screenshot({ path: `${SHOTS}/whatif-${topicId}.png`, fullPage: false });
}
console.log(`Checked "what if" controls on ${withExperiments.length} topic(s).`);

// Lesson mode: every topic must give a walkable sequence that ends on the practise step, and every step
// must render something. A step showing the "being written" placeholder means generated data is missing.
for (const t of TOPICS) {
  await visit(page, `#/learn/${t.id}`);
  const labels = await page.locator('.ls-step-l').allInnerTexts();
  if (labels.length < 2) {
    failures.push(`lesson: ${t.id} has ${labels.length} steps`);
    continue;
  }
  for (let i = 1; i < labels.length; i++) {
    await page.getByRole('button', { name: /^Next/ }).click();
    await page.waitForTimeout(150);
    const body = await page.locator('.ls-body').innerText();
    if (body.includes('being written')) failures.push(`lesson: ${t.id} step ${i + 1} (${labels[i]}) has no content`);
  }
  const last = await page.locator('.ls-count').innerText();
  if (!last.includes(`of ${labels.length}`)) failures.push(`lesson: ${t.id} did not reach the last step (${last})`);
}
console.log(`Walked the lesson for ${TOPICS.length} topics.`);

// The Python worker must not hand student code a route to JavaScript. With one, pasted code could read the
// app's IndexedDB (same origin) and POST a student's whole progress log anywhere. The import denylist in
// sandbox.py cannot enforce this on its own, so pyWorker.ts removes the bridge; this checks it stayed gone.
// Payloads are single-line: the editor auto-indents, which would corrupt a typed block.
await visit(page, '#/playground');
await page.waitForFunction(() => /ready/i.test(document.body.innerText), null, { timeout: 90000 }).catch(() => {});
// The marker is assembled at run time ("PL" + "_JS_OK"), so it never appears in the typed source on
// screen: finding it anywhere on the page means Python really did reach JavaScript.
const MARK = 'print("PL" + "_JS_OK")';
const ESCAPES: [string, string][] = [
  ['import js', `import js; ${MARK}`],
  ['importlib via an allowed module', `import traceback; traceback.sys.modules["importlib"].import_module("js"); ${MARK}`],
  ['exec under another filename', `exec(compile("import js", "<x>", "exec")); ${MARK}`],
  ['pyodide.code.run_js', `import traceback; traceback.sys.modules["importlib"].import_module("pyodide.code").run_js("1"); ${MARK}`],
];
// A fresh profile opens the first-run tour, whose dialog would swallow the clicks below.
await page.getByRole('button', { name: /^Skip/ }).first().click({ timeout: 5000 }).catch(() => {});
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);
await page.locator('.monaco-editor').first().waitFor({ state: 'visible', timeout: 60000 });
for (const [name, code] of ESCAPES) {
  await page.locator('.monaco-editor').first().click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(code);
  const run = page.getByRole('button', { name: /^Run/ }).first();
  await run.waitFor({ state: 'visible', timeout: 60000 });
  await run.click({ timeout: 60000 });
  await page.waitForTimeout(6000);
  // innerText, not textContent: the output panel's text only shows up in the rendered text.
  const shown = await page.evaluate(() => document.body.innerText);
  if (shown.includes('PL_JS_OK')) failures.push(`sandbox: student code reached JavaScript via ${name}`);
}
console.log(`Checked ${ESCAPES.length} sandbox escape routes.`);
if (consoleErrors.length) failures.push(...consoleErrors.slice(0, 30).map((e) => `console: ${e}`));
await browser.close();
server?.kill();
if (failures.length) {
  console.log(`SMOKE FAILED (${failures.length})`);
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
console.log('SMOKE PASSED');
