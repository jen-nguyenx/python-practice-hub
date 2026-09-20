// End-to-end smoke test against a production build, in real Chrome.
// Usage: npm run build && node scripts/smoke.ts [--base http://localhost:4173/] [--shots scratch/smoke]
import { chromium, type ConsoleMessage, type Page } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
  // Exact placeholder sentences, not fragments: lesson prose legitimately contains phrases like
  // "what is being built", and a loose match turns real teaching into a false alarm.
  for (const bad of [
    'for this topic is being written', 'for this topic are being written',
    'These lessons are being written', 'This experiment is being written',
    'not implemented', 'Grader not implemented', 'answer data is missing',
  ]) {
    if (body.includes(bad)) failures.push(`${hash}: page shows "${bad}"`);
  }
  if (shot) await p.screenshot({ path: `${SHOTS}/${shot}.png`, fullPage: false });
}

await visit(page, '#/', 'landing');
// Python should become ready.
try {
  await page.waitForFunction(() => /ready/i.test(document.body.innerText), null, { timeout: 90000 });
} catch { failures.push('Python runtime never showed ready'); }

// The welcome tour opens over the landing page on a first visit and swallows clicks everywhere after it,
// so it is shown, photographed, and then dismissed exactly as a student would dismiss it.
await page.getByRole('button', { name: 'Skip' }).click({ timeout: 5000 }).catch(() => {
  failures.push('#/: the welcome tour did not offer a way out');
});
await page.waitForTimeout(300);

for (const hash of ['#/playground', '#/report', '#/exam', '#/settings', '#/review', '#/error', '#/reference']) {
  await visit(page, hash, hash.replace(/[#/]/g, '') || 'root');
}

// A fresh profile has no practice, so the report shows its "not enough practice" card and none of the
// sections that read the event log ever render. Importing a small made-up history through the app's own
// import path is the only way to see them, and it exercises that path at the same time.
const seedPath = join(SHOTS, 'seed-progress.json');
{
  const picked = index.slice(0, 40);
  const day = 24 * 60 * 60 * 1000;
  const start = Date.now() - 6 * day;
  const events = [
    { eid: 'seed-s', v: 1, ts: start, sessionId: 'seed', type: 'session_start' },
    ...picked.map((q, i) => ({
      eid: `seed-a${i}`, v: 1, ts: start + i * 60000, sessionId: 'seed', type: 'attempt',
      qid: q.qid, topicId: q.topicId, format: q.format, diff: q.diff, mode: 'practice',
      // Every third one wrong, so both "Worth another go" and "Holding up" have something in them.
      checkNo: 1, correct: i % 3 !== 0, score: i % 3 !== 0 ? 1 : 0, credit: i % 3 !== 0 ? 1 : 0,
      hintTier: 0, revealed: false, timeMs: 45000, mistakes: [],
    })),
  ];
  // Replacing progress replaces settings too, so the file carries a student who has already seen the
  // welcome tour — otherwise the tour reopens over every page checked after the import.
  writeFileSync(seedPath, JSON.stringify({
    format: 'pyladder-export', version: 1, exportedAt: start, settings: { seenTour: true }, events,
  }));
}
await visit(page, '#/settings');
await page.locator('#set-import').scrollIntoViewIfNeeded().catch(() => {});
await page.locator('input[type="file"]').setInputFiles(seedPath);
await page.locator('input[name="import-mode"][value="replace"]').check();
await page.getByRole('button', { name: 'Replace my progress' }).click();
await page.waitForTimeout(1200);

await visit(page, '#/report', 'report-seeded');
if (await page.locator('.rp-stats').count() === 0) {
  failures.push('#/report: importing a history did not produce a report');
} else {
  // The Skills section reads concept tags nothing else reads, so it is the one most likely to drop out
  // silently: it must be present, and it must have named at least one skill.
  if (await page.locator('#rp-concepts').count() === 0) failures.push('#/report: the Skills section is missing');
  if (await page.locator('.rp-cq, .rp-cchip').count() === 0) failures.push('#/report: Skills named nothing after 40 attempts');
  // Tags are ours, not the reader's: a lowercase kebab run in that section is a leaked id.
  const skills = await page.locator('#rp-concepts').locator('xpath=..').innerText();
  const leaked = skills.split('\n').filter((line) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(line.trim()));
  if (leaked.length) failures.push(`#/report: Skills shows raw tags: ${leaked.slice(0, 3).join(', ')}`);
}

// The palette is where a question gets typed from any page, so the reference has to be reachable there
// and has to land on the entry that was chosen, not on the whole shelf.
await visit(page, '#/');
await page.keyboard.press('Meta+k');
await page.waitForTimeout(400);
await page.locator('.pal-input').type('sort a dict by value', { delay: 10 });
await page.waitForTimeout(400);
const palRef = page.locator('[role="option"]', { hasText: 'Sort a dictionary' }).first();
if (await palRef.count() === 0) {
  failures.push('command palette: the reference entry for sorting a dictionary was not offered');
} else {
  await palRef.click();
  await page.waitForTimeout(700);
  if (!page.url().includes('#/reference')) failures.push('command palette: choosing a reference entry did not open the reference');
  const landed = await page.locator('.rf-card .rf-task').first().innerText().catch(() => '');
  if (!/sort a dict/i.test(landed)) failures.push(`command palette: the reference opened on "${landed}"`);
}

// The reference is only useful if searching it finds things, so one real search is run end to end.
await visit(page, '#/reference');
const refBox = page.locator('.rf-search-in');
// Arriving here from the palette leaves that entry's words in the box, and navigating to the hash the
// page is already on does not reload, so the box is emptied before this search rather than appended to.
await refBox.fill('');
await refBox.click();
await refBox.type('sort a dict by value', { delay: 10 });
await page.waitForTimeout(400);
const refHits = await page.locator('.rf-card').count();
if (refHits === 0) failures.push('#/reference: searching for "sort a dict by value" found nothing');
// Finding it is not enough: the entry that IS the search has to be the one at the top.
const top = await page.locator('.rf-card .rf-task').first().innerText().catch(() => '');
if (refHits > 0 && !/sort a dict/i.test(top)) failures.push(`#/reference: top result for that search was "${top}"`);
const refOut = await page.locator('.rf-card .rf-out').count();
if (refOut === 0) failures.push('#/reference: no entry shows what it prints');

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


// A fresh profile opens the first-run tour, whose dialog would swallow every click below and whose own
// "Next" button collides with the lesson's.
await page.getByRole('button', { name: /^Skip/ }).first().click({ timeout: 2500 }).catch(() => {});
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(400);

// Every topic must lead somewhere readable. #/learn/:id resolves to that topic's authored lesson when
// one exists and falls back to the derived path when it does not; either way it must render steps. The
// library walk below is what checks the lesson content itself, so this only checks the resolution.
for (const t of TOPICS) {
  await visit(page, `#/learn/${t.id}`);
  const steps = await page.locator('.ls-step-l').count();
  if (steps < 2) failures.push(`lesson: #/learn/${t.id} resolved to a page with ${steps} steps`);
  const body = await page.locator('.ls-body').innerText();
  if (body.includes('being written')) failures.push(`lesson: #/learn/${t.id} opens on a step with no content`);
}
console.log(`Resolved the lesson route for ${TOPICS.length} topics.`);

// The lesson library: every lesson must open, walk to its last section, and render something in each one.
// An empty section means generated output is missing for a block that needs it.
const LESSONS: { id: string; title: string; sections: number }[] =
  JSON.parse(readFileSync('src/content/generated/lesson-index.json', 'utf8'));
await visit(page, '#/lessons', 'lessons');
const cardCount = await page.locator('.lx-card').count();
if (cardCount !== LESSONS.length) failures.push(`lessons: library shows ${cardCount} cards but the index has ${LESSONS.length}`);
for (const l of LESSONS) {
  await visit(page, `#/lesson/${l.id}`);
  const steps = await page.locator('.ls-step-l').count();
  if (steps !== l.sections) {
    failures.push(`lesson ${l.id}: ${steps} steps shown but the index says ${l.sections} sections`);
    continue;
  }
  let exercised = false;
  for (let i = 0; i < steps; i++) {
    if (i > 0) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.waitForTimeout(120);
    }
    const body = (await page.locator('.ls-body').innerText()).trim();
    if (body.length < 40) failures.push(`lesson ${l.id}: step ${i + 1} renders almost nothing`);
    // Every card on the step must have found its data. A card showing the empty state means its picks
    // addressed a combination that does not exist -- which is what happens when component state leaks
    // between sections, and is invisible to a check that only asks whether the page has content.
    const cards = page.locator('.wi-card');
    const cardCount = await cards.count();
    for (let c = 0; c < cardCount; c++) {
      const card = cards.nth(c);
      const outEl = card.locator('.wi-out').first();
      const out = (await outEl.count()) ? (await outEl.innerText()).trim() : '';
      const drew = await card.locator('.wi-vis').count();
      if (out === 'This prints nothing at all.' && drew === 0) {
        failures.push(`lesson ${l.id}: step ${i + 1} card ${c + 1} shows no output and no picture, so it found no data for its controls`);
      }
      // Exercise one card per lesson: the generated answers must actually be wired to the controls.
      // What the reader is meant to watch is the output, the variable table and the picture -- not the
      // authored note, which moves per combination whether or not the data does.
      if (!exercised && (await card.locator('.wi-knob').count()) > 0) {
        exercised = true;
        const shown = async () => {
          const text = await card.locator('.wi-out, .wi-table').allInnerTexts();
          const lit = await card.locator('.wi-cell.is-picked, .wi-tick.is-hit, .wi-bar, .wi-curve').count();
          // Geometry, so a chart that redraws to the same element count still counts as having moved.
          // Guarded by count(): a .catch() here would cost the full default timeout each time.
          const curve = card.locator('.wi-curve').first();
          const bar = card.locator('.wi-bar').first();
          const geom = (await curve.count()) ? await curve.getAttribute('points') : null;
          const style = (await bar.count()) ? await bar.getAttribute('style') : null;
          return `${text.join('|')}#${lit}#${geom ?? ''}#${style ?? ''}`;
        };
        const before = await shown();
        const slider = card.locator('.wi-slider').first();
        if (await slider.count()) {
          await slider.focus();
          await page.keyboard.press('End');
          await page.waitForTimeout(150);
          if (await shown() === before) await page.keyboard.press('Home');
        } else {
          const opts = card.locator('.wi-knob').first().locator('[role="radio"]');
          const n = await opts.count();
          await opts.nth(n - 1).click();
          await page.waitForTimeout(150);
          if (await shown() === before) await opts.nth(0).click();
        }
        await page.waitForTimeout(220);
        if (await shown() === before) {
          failures.push(`lesson ${l.id}: step ${i + 1} card ${c + 1} shows the same result whichever way its controls move`);
        }
      }
    }
  }
  // Every answer must be hidden until asked for, or the checkpoint teaches nothing.
  const open = await page.locator('.lb-check-answer').count();
  if (open > 0) failures.push(`lesson ${l.id}: a checkpoint answer is visible before it is asked for`);
}
console.log(`Walked ${LESSONS.length} lessons in the library, exercising the controls in each.`);

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
await page.getByRole('button', { name: /^Skip/ }).first().click({ timeout: 2500 }).catch(() => {});
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
