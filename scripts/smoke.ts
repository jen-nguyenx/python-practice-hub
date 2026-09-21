// End-to-end smoke test against a production build, in real Chrome.
// Usage: npm run build && node scripts/smoke.ts [--base http://localhost:4173/] [--shots scratch/smoke]
//
// The checks that are equally true of a deployed build live in scripts/lib/checks.ts and are shared with
// scripts/check-live.ts; what stays here is the heavy walking a local build can afford — every question
// format, every lesson, every sandbox escape route.
import type { Page } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { arg, dismissTour, importProgress, openBrowser, startPreview, waitForPython, writeSeed } from './lib/browser.ts';
import type { SeedQuestion } from './lib/browser.ts';
import {
  checkCalibration, checkConfidence, checkExamPlan, checkLessonLibrary, checkMainRoutes, checkPaletteReference,
  checkReferenceSearch, checkReportSections, checkReviewSession, visit as visitRoute,
} from './lib/checks.ts';
import type { Ctx } from './lib/checks.ts';

const SHOTS = arg('--shots', 'scratch/smoke');
mkdirSync(SHOTS, { recursive: true });

let base = arg('--base', '');
let server;
if (!base) ({ base, server } = await startPreview());

const index: SeedQuestion[] = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'));
const TOPICS: { id: string }[] = [...new Set(index.map((q) => q.topicId))].map((id) => ({ id }));

const failures: string[] = [];
const { browser, page, errors: consoleErrors } = await openBrowser();
const c: Ctx = { page, base, index, fail: (m) => failures.push(m) };

/** Open a route, fail on any placeholder text, and photograph it when asked. */
async function visit(_p: Page, hash: string, shot?: string) {
  await visitRoute(c, hash, shot, SHOTS);
}

await visit(page, '#/', 'landing');
if (!(await waitForPython(page))) failures.push('Python runtime never showed ready');

// The welcome tour opens over the landing page on a first visit and swallows clicks everywhere after it,
// so it is shown, photographed, and then dismissed exactly as a student would dismiss it.
if (!(await dismissTour(page))) failures.push('#/: the welcome tour did not offer a way out');

await checkMainRoutes(c);

// Every section that reads the event log needs a history behind it, and importing one exercises the
// import path at the same time. Confidence is recorded too, so the calibration card has something to say.
const seedPath = writeSeed(join(SHOTS, 'seed-progress.json'), index, { confidence: true });
await importProgress(page, base, seedPath);
await visit(page, '#/report', 'report-seeded');
await checkReportSections(c);
await checkCalibration(c);

// Just past the seeded history, in a topic that history has unlocked.
await checkConfidence(c, (index[41] ?? index[index.length - 1]).qid);

await checkReviewSession(c);
await checkExamPlan(c);
await checkPaletteReference(c);
await checkReferenceSearch(c);

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


// The tour's own "Next" button collides with the lesson's, so make sure it is gone before walking one.
await dismissTour(page);

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
await checkLessonLibrary(c, LESSONS.length);
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
await dismissTour(page);
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
