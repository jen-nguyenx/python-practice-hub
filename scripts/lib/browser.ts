// Shared plumbing for every script that drives the app in a real browser.
//
// Three scripts need the same five things — a Chrome, a served build, a page that remembers its console
// errors, a way past the first-run tour, and a profile with some history in it. They lived as copies
// inside smoke.ts and as throwaway files beside it; here they are written once so a new check is a few
// lines rather than another copy.
import { chromium } from 'playwright-core';
import type { Browser, BrowserContext, ConsoleMessage, Page } from 'playwright-core';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** System Chrome: playwright-core ships no browser of its own. */
export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/** The deployed site, for checking what students actually have. */
export const LIVE = 'https://jen-nguyenx.github.io/python-practice-hub/';

export function arg(name: string, def: string): string {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? def) : def;
}

export function flag(name: string): boolean {
  return process.argv.slice(2).includes(name);
}

/** Serve the production build. Returns the base URL and the server to kill when done. */
export async function startPreview(port = 4173): Promise<{ base: string; server: ChildProcess }> {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'pipe' });
  const base = `http://localhost:${port}/`;
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`preview server did not start on port ${port}`)), 20000);
    server.stdout?.on('data', (d: Buffer) => {
      if (String(d).includes(String(port))) { clearTimeout(t); resolve(); }
    });
  });
  return { base, server };
}

export interface Session {
  browser: Browser;
  ctx: BrowserContext;
  page: Page;
  /** Console errors and uncaught exceptions seen so far, newest last. */
  errors: string[];
}

/** A browser with a page that records its own console errors, so no check has to remember to look. */
export async function openBrowser(width = 1280, height = 900): Promise<Session> {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  // Favicons and webfonts fail in headless runs for reasons that have nothing to do with the app.
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errors.push(`${page.url()} :: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${page.url()} :: pageerror ${e.message}`));
  return { browser, ctx, page, errors };
}

/**
 * The welcome tour opens over the landing page on a first visit, and its dialog swallows clicks
 * everywhere after it — including on controls whose names collide with its own ("Next").
 */
export async function dismissTour(page: Page): Promise<boolean> {
  const skip = page.getByRole('button', { name: /^Skip/ }).first();
  const gone = await skip.click({ timeout: 5000 }).then(() => true).catch(() => false);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(300);
  return gone;
}

/**
 * Answer the question a first visit asks on the home page: which unit? Clicks the card for `unit` if the
 * question is showing, and reports whether it was.
 */
export async function chooseUnit(page: Page, unit: 'CITS1401' | 'STAT2402'): Promise<boolean> {
  const card = page.locator('.up-card', { hasText: unit }).first();
  const shown = await card.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
  if (shown) {
    await card.click();
    await page.waitForTimeout(500);
  }
  return shown;
}

/** Switch unit the way a student would after the first visit: the segmented control in Settings. */
export async function switchUnit(page: Page, base: string, unit: 'CITS1401' | 'STAT2402'): Promise<boolean> {
  await page.goto(`${base}#/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const opt = page.locator('[role="radiogroup"][aria-labelledby="set-course-label"] [role="radio"]', { hasText: unit }).first();
  if ((await opt.count()) === 0) return false;
  await opt.click();
  await page.waitForTimeout(300);
  return (await opt.getAttribute('aria-checked')) === 'true';
}

/** Wait for the Python worker to report itself ready. */
export async function waitForPython(page: Page, timeout = 90000): Promise<boolean> {
  return page
    .waitForFunction(() => /ready/i.test(document.body.innerText), null, { timeout })
    .then(() => true)
    .catch(() => false);
}

export interface SeedOptions {
  /** How many questions from the front of the index to answer. */
  count?: number;
  /** One in every this many is wrong, so weak and strong both have something in them. */
  wrongEvery?: number;
  /** Also record what the student said before checking, to fill the calibration card. */
  confidence?: boolean;
}

export interface SeedQuestion { qid: string; topicId: string; format: string; diff: string }

/**
 * A small made-up history, in the shape of the app's own export file.
 *
 * A fresh profile has no practice, so the report shows its "not enough practice" card and every section
 * that reads the event log stays unrendered — which is why checks that only visited /report for years
 * would have passed with those sections deleted. Importing this through the app's own import path is the
 * only way to see them, and it exercises that path at the same time.
 */
export function writeSeed(path: string, index: readonly SeedQuestion[], opts: SeedOptions = {}): string {
  const count = opts.count ?? 40;
  const wrongEvery = opts.wrongEvery ?? 3;
  const day = 24 * 60 * 60 * 1000;
  // Spread over three weeks rather than packed into one afternoon. A real history has old answers in it,
  // and several things only exist for one: spaced recall has nothing to offer if everything was answered
  // the same day, and neither does a streak or a "last practised" line.
  const start = Date.now() - 21 * day;
  const gap = day / 2;
  const events: unknown[] = [{ eid: 'seed-s', v: 1, ts: start, sessionId: 'seed', type: 'session_start' }];
  // A real history records opening a topic before answering anything in it.
  for (const topicId of [...new Set(index.slice(0, count).map((q) => q.topicId))]) {
    events.push({ eid: `seed-o-${topicId}`, v: 1, ts: start, sessionId: 'seed', type: 'topic_open', topicId });
  }
  index.slice(0, count).forEach((q, i) => {
    const correct = i % wrongEvery !== 0;
    events.push({
      eid: `seed-a${i}`, v: 1, ts: start + i * gap, sessionId: 'seed', type: 'attempt',
      qid: q.qid, topicId: q.topicId, format: q.format, diff: q.diff, mode: 'practice',
      checkNo: 1, correct, score: correct ? 1 : 0, credit: correct ? 1 : 0,
      hintTier: 0, revealed: false, timeMs: 45000, mistakes: [],
      ...(opts.confidence ? { confidence: i % 2 === 0 ? 'sure' : 'unsure' } : {}),
    });
  });
  mkdirSync(dirname(path), { recursive: true });
  // Replacing progress replaces settings too, so the file carries a CITS1401 student who has already seen
  // the welcome tour — otherwise the unit question and the tour reopen over every page checked after it.
  writeFileSync(path, JSON.stringify({
    format: 'pyladder-export', version: 1, exportedAt: start, settings: { seenTour: true, unit: 'cits1401' }, events,
  }));
  return path;
}

/** Load a seed file the way a student loads a backup: through Settings, replacing what is there. */
export async function importProgress(page: Page, base: string, file: string): Promise<void> {
  await page.goto(`${base}#/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(700);
  await dismissTour(page);
  await page.locator('#set-import').scrollIntoViewIfNeeded().catch(() => {});
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.locator('input[name="import-mode"][value="replace"]').check();
  await page.getByRole('button', { name: 'Replace my progress' }).click();
  await page.waitForTimeout(1200);
}

/**
 * Answer whatever question is on screen, the way its format allows.
 *
 * The formats a review session deals are not all the same shape: multiple choice and spot-the-difference
 * use radios, "select all" uses checkboxes, predict and fill-in-the-blank take typing. A helper that knew
 * only about radios passed for as long as the first question happened to be multiple choice, which is a
 * check that reports luck. Returns what it did, so a caller can say so rather than guess.
 */
export async function answerCurrent(page: Page, within = '.rs-answer'): Promise<'picked' | 'typed' | 'none'> {
  let did: 'picked' | 'typed' | 'none' = 'none';

  const radio = page.locator(`${within} [role="radio"], ${within} input[type="radio"]`).first();
  if (await radio.count()) {
    await radio.click();
    did = 'picked';
  } else {
    const box = page.locator(`${within} [role="checkbox"], ${within} input[type="checkbox"]`).first();
    if (await box.count()) {
      await box.click();
      did = 'picked';
    }
  }

  // Every text field, not just the first: spot-the-difference wants a choice AND both outputs before it
  // will accept anything, and a helper that filled one box left the button greyed out.
  const boxes = page.locator(`${within} textarea, ${within} input[type="text"]`);
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    await boxes.nth(i).fill('something').catch(() => {});
    did = did === 'picked' ? 'picked' : 'typed';
  }
  return did;
}
