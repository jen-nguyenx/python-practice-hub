// The checks that are worth running against any build of the app, local or deployed.
//
// Each one is a question a student would notice the wrong answer to: does the page render anything, does
// searching find the thing you searched for, does the report show what it reads from the event log. They
// live here rather than inside one runner so that the smoke test and the live check ask exactly the same
// questions — a check that only ever ran locally is a check that never covered what students have.
import type { Page } from 'playwright-core';
import type { SeedQuestion } from './browser.ts';

export interface Ctx {
  page: Page;
  base: string;
  index: readonly SeedQuestion[];
  fail: (message: string) => void;
}

/** Placeholder sentences that mean a page rendered its "nothing here yet" state in production. */
const PLACEHOLDERS = [
  'for this topic is being written', 'for this topic are being written',
  'These lessons are being written', 'This experiment is being written',
  'not implemented', 'Grader not implemented', 'answer data is missing',
];

/**
 * Open a route and fail if it shows a placeholder. Exact sentences, not fragments: lesson prose
 * legitimately contains phrases like "what is being built", and a loose match turns teaching into alarm.
 */
export async function visit(c: Ctx, hash: string, shot?: string, shotsDir?: string): Promise<void> {
  await c.page.goto(c.base + hash, { waitUntil: 'load' });
  await c.page.waitForTimeout(700);
  const body = (await c.page.textContent('body')) ?? '';
  for (const bad of PLACEHOLDERS) if (body.includes(bad)) c.fail(`${hash}: page shows "${bad}"`);
  if (shot && shotsDir) await c.page.screenshot({ path: `${shotsDir}/${shot}.png`, fullPage: false });
}

/** Every top-level route the icon bar and the palette offer. */
export const MAIN_ROUTES = [
  '#/playground', '#/report', '#/exam', '#/settings', '#/review', '#/error', '#/reference', '#/lessons',
];

export async function checkMainRoutes(c: Ctx): Promise<void> {
  for (const hash of MAIN_ROUTES) await visit(c, hash);
}

/**
 * The report, on a profile that has practised. Needs a seeded history: without one the page shows its
 * "not enough practice" card and none of these sections exist at all.
 */
export async function checkReportSections(c: Ctx): Promise<void> {
  await visit(c, '#/report');
  if ((await c.page.locator('.rp-stats').count()) === 0) {
    c.fail('#/report: a seeded history did not produce a report');
    return;
  }
  // Skills reads concept tags nothing else reads, so it is the section most likely to drop out silently.
  if ((await c.page.locator('#rp-concepts').count()) === 0) c.fail('#/report: the Skills section is missing');
  if ((await c.page.locator('.rp-cq, .rp-cchip').count()) === 0) c.fail('#/report: Skills named no skill at all');
  // Tags are ours, not the reader's: a lowercase kebab run in that section is a leaked internal id.
  const skills = await c.page.locator('#rp-concepts').locator('xpath=..').innerText();
  const leaked = skills.split('\n').map((l) => l.trim()).filter((l) => /^[a-z0-9]+(-[a-z0-9]+)+$/.test(l));
  if (leaked.length) c.fail(`#/report: Skills shows raw tags: ${leaked.slice(0, 3).join(', ')}`);
}

/** The calibration card, on a profile whose history says how sure it was. */
export async function checkCalibration(c: Ctx): Promise<void> {
  await visit(c, '#/report');
  if ((await c.page.locator('.rp-cal').count()) === 0) {
    c.fail('#/report: a history with confidence in it showed no calibration card');
    return;
  }
  const text = await c.page.locator('.rp-cal').innerText();
  if (!/when you said you were sure/i.test(text)) c.fail('#/report: the calibration card does not say what was compared');
  if (!/\d/.test(text)) c.fail('#/report: the calibration card shows no numbers');
}

/**
 * "How sure are you?" is asked once, before the first check. It has to reach all twelve formats from a
 * single place, so one real question is opened and answered.
 *
 * The question must be past the seeded history and inside a topic that history has unlocked: where checks
 * are already recorded the control is meant to be gone, because the first check is the only moment it
 * means anything.
 */
export async function checkConfidence(c: Ctx, qid: string): Promise<void> {
  await visit(c, `#/q/${qid}`);
  const conf = c.page.locator('.qp-conf');
  if ((await conf.count()) === 0) {
    c.fail(`#/q/${qid}: the confidence question was not asked`);
    return;
  }
  const sure = c.page.getByRole('button', { name: "I'm sure" });
  await sure.click();
  await c.page.waitForTimeout(200);
  if ((await sure.getAttribute('aria-pressed')) !== 'true') c.fail('the confidence question did not record an answer');
}

/** Searching the reference has to put the entry you searched for at the top, and show what it prints. */
export async function checkReferenceSearch(c: Ctx): Promise<void> {
  await visit(c, '#/reference');
  const box = c.page.locator('.rf-search-in');
  // Arriving from the palette leaves that entry's words in the box, and navigating to the hash the page
  // is already on does not reload, so the box is emptied rather than appended to.
  await box.fill('');
  await box.click();
  await box.type('sort a dict by value', { delay: 10 });
  await c.page.waitForTimeout(400);
  const hits = await c.page.locator('.rf-card').count();
  if (hits === 0) {
    c.fail('#/reference: searching for "sort a dict by value" found nothing');
    return;
  }
  const top = await c.page.locator('.rf-card .rf-task').first().innerText().catch(() => '');
  if (!/sort a dict/i.test(top)) c.fail(`#/reference: the top result for that search was "${top}"`);
  if ((await c.page.locator('.rf-card .rf-out').count()) === 0) c.fail('#/reference: no entry shows what it prints');

  // A plural is not a different word to someone typing a rough phrase.
  await box.fill('');
  await box.type('count things', { delay: 10 });
  await c.page.waitForTimeout(400);
  const plural = await c.page.locator('.rf-card .rf-task').first().innerText().catch(() => '');
  if (!/count/i.test(plural)) c.fail(`#/reference: searching "count things" led with "${plural || 'nothing'}"`);
}

/** The palette is where a question gets typed from any page, so it has to answer "how do I ...?" too. */
export async function checkPaletteReference(c: Ctx): Promise<void> {
  await visit(c, '#/');
  await c.page.keyboard.press('Meta+k');
  await c.page.waitForTimeout(400);
  await c.page.locator('.pal-input').type('sort a dict by value', { delay: 10 });
  await c.page.waitForTimeout(400);
  const hit = c.page.locator('[role="option"]', { hasText: 'Sort a dictionary' }).first();
  if ((await hit.count()) === 0) {
    c.fail('command palette: the reference entry for sorting a dictionary was not offered');
    return;
  }
  await hit.click();
  await c.page.waitForTimeout(700);
  if (!c.page.url().includes('#/reference')) c.fail('command palette: choosing a reference entry did not open the reference');
  const landed = await c.page.locator('.rf-card .rf-task').first().innerText().catch(() => '');
  if (!/sort a dict/i.test(landed)) c.fail(`command palette: the reference opened on "${landed}"`);
}

/** The lesson library must list every lesson the index knows about. */
export async function checkLessonLibrary(c: Ctx, expected: number): Promise<void> {
  await visit(c, '#/lessons');
  const cards = await c.page.locator('.lx-card').count();
  if (cards !== expected) c.fail(`lessons: the library shows ${cards} cards but the index has ${expected}`);
}
