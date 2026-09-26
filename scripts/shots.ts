// Screenshots of named parts of the app, from a profile that has practised.
//
// Looking at a single section used to mean writing a throwaway script: launch Chrome, seed a history,
// find the element, screenshot it, delete the script, and write it again next week. These are the same
// steps with names on them, so checking how something looks is one command and the list grows by a line.
//
// Usage:
//   npm run shots                       # every shot, into scratch/shots
//   npm run shots -- --only skills,calibration
//   npm run shots -- --list
//   npm run shots -- --base https://jen-nguyenx.github.io/python-practice-hub/
import { mkdirSync, readFileSync } from 'node:fs';
import { answerCurrent, arg, chooseUnit, dismissTour, flag, importProgress, openBrowser, startPreview, switchUnit, writeSeed } from './lib/browser.ts';
import type { SeedQuestion } from './lib/browser.ts';

interface Shot {
  name: string;
  hash: string;
  /** The part of the page to photograph. Omitted means the whole viewport. */
  selector?: string;
  /** Run before the photograph, for anything that needs opening or typing first. */
  prepare?: (page: import('playwright-core').Page) => Promise<void>;
}

const index: SeedQuestion[] = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'));

/** Where the shots run from; set once the preview is up. */
let root = '';
async function go(page: import('playwright-core').Page, hash: string) {
  await page.goto(root + hash, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
}
async function toStat(page: import('playwright-core').Page) {
  await switchUnit(page, root, 'STAT2402');
}
// Past the seeded history, so the question is one this profile has not checked yet.
const FRESH_QID = (index[41] ?? index[index.length - 1]).qid;

const SHOTS: Shot[] = [
  // Taken at start-up, on the fresh profile, before the question is answered.
  { name: 'unit-chooser', hash: '#/' },
  { name: 'landing', hash: '#/' },
  { name: 'today', hash: '#/', selector: '.td' },
  { name: 'report', hash: '#/report' },
  { name: 'skills', hash: '#/report', selector: 'section:has(#rp-concepts)' },
  { name: 'calibration', hash: '#/report', selector: '.rp-cal' },
  { name: 'reference', hash: '#/reference' },
  {
    name: 'reference-search',
    hash: '#/reference',
    prepare: async (page) => {
      await page.locator('.rf-search-in').fill('');
      await page.locator('.rf-search-in').type('sort a dict by value', { delay: 10 });
      await page.waitForTimeout(400);
    },
  },
  { name: 'lessons', hash: '#/lessons' },
  { name: 'glossary', hash: '#/glossary' },
  { name: 'revision', hash: '#/revision' },
  { name: 'build', hash: '#/build/t12-s1' },
  {
    // The Markets track, switched on: the exemplar lesson's payoff experiment with its sliders.
    name: 'markets',
    hash: '#/settings',
    prepare: async (page) => {
      await page.locator('[role="switch"][aria-labelledby="set-markets-label"]').first().click().catch(() => {});
      await page.waitForTimeout(300);
      await page.goto(page.url().replace(/#.*$/, '#/lesson/the-storage-trade'), { waitUntil: 'load' });
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: 'Next', exact: true }).click().catch(() => {});
      await page.waitForTimeout(800);
    },
  },
  {
    // A Python lesson's chart: the plot is shared, so a change for the Markets curves must hold here too.
    name: 'plot-python',
    hash: '#/lesson/efficiency-and-big-o',
    selector: '.wi-vis',
    prepare: async (page) => {
      await page.waitForTimeout(1200);
      for (let i = 0; i < 6; i++) {
        if (await page.locator('.wi-plot').count()) break;
        await page.getByRole('button', { name: 'Next', exact: true }).click().catch(() => {});
        await page.waitForTimeout(500);
      }
    },
  },
  {
    // A glossary word marked in lesson prose, with its definition open.
    name: 'term-hover',
    hash: '#/lesson/core-recursion',
    prepare: async (page) => {
      await page.waitForTimeout(1200);
      const mark = page.locator('.ls-body .tm').first();
      if (await mark.count()) {
        await mark.hover();
        await page.waitForTimeout(400);
      }
    },
  },
  {
    name: 'glossary-search',
    hash: '#/glossary',
    prepare: async (page) => {
      await page.locator('.gl-search-in').fill('');
      await page.locator('.gl-search-in').type('mutable', { delay: 10 });
      await page.waitForTimeout(400);
    },
  },
  { name: 'plan', hash: '#/plan' },
  { name: 'placement', hash: '#/placement' },
  {
    name: 'placement-q',
    hash: '#/placement',
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Start/ }).first().click().catch(() => {});
      await page.waitForTimeout(2500);
    },
  },
  {
    // The whole climb, to whatever level the answers reach.
    name: 'placement-done',
    hash: '#/placement',
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Start$/ }).click().catch(() => {});
      await page.waitForTimeout(2500);
      for (let i = 0; i < 14; i++) {
        if (await page.locator('.pl-done').count()) break;
        await answerCurrent(page, '.pl-answer').catch(() => 'none');
        await page.getByRole('button', { name: /Check answer|Submit answer/i }).first().click().catch(() => {});
        await page.waitForTimeout(800);
        const on = page.getByRole('button', { name: /^Next/ }).first();
        if (!(await on.count())) break;
        await on.click();
        await page.waitForTimeout(800);
      }
    },
  },
  // The shell scrolls an inner container, so a "full page" screenshot still stops at the fold. An element
  // shot does capture the whole element, which is how anything below it gets looked at.
  { name: 'plan-weeks', hash: '#/plan', selector: '.xp-weeks' },
  { name: 'plan-ready', hash: '#/plan', selector: '.xp-checks' },
  { name: 'review', hash: '#/review' },
  {
    name: 'review-session',
    hash: '#/review',
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Start the session/ }).click().catch(() => {});
      await page.waitForTimeout(1500);
    },
  },
  {
    // The whole loop: start, answer every question, and land on the summary.
    name: 'review-done',
    hash: '#/review',
    prepare: async (page) => {
      await page.getByRole('button', { name: /^Start the session/ }).click().catch(() => {});
      await page.waitForTimeout(1800);
      for (let i = 0; i < 8; i++) {
        await answerCurrent(page).catch(() => 'none');
        await page.getByRole('button', { name: /Check answer/i }).first().click().catch(() => {});
        await page.waitForTimeout(900);
        const on = page.getByRole('button', { name: /^(Next|Finish)/ }).first();
        if (!(await on.count())) break;
        await on.click();
        await page.waitForTimeout(900);
        if (await page.locator('.rv-done').count()) break;
      }
    },
  },
  { name: 'confidence', hash: `#/q/${FRESH_QID}`, selector: '.qp-conf' },
  {
    name: 'palette',
    hash: '#/',
    prepare: async (page) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);
      await page.locator('.pal-input').type('sort a dict', { delay: 10 });
      await page.waitForTimeout(400);
    },
  },
  // STAT2402, last: each switches unit through Settings first, and the run switches back at the end.
  { name: 'stat-home', hash: '#/settings', prepare: async (page) => { await toStat(page); await go(page, '#/'); } },
  {
    name: 'stat-lesson',
    hash: '#/settings',
    prepare: async (page) => {
      await toStat(page);
      await go(page, '#/lesson/regression-in-r');
      await page.locator('.ls-step', { hasText: 'Where the line comes from' }).first().click().catch(() => {});
      await page.waitForTimeout(800);
    },
  },
  { name: 'stat-exams', hash: '#/settings', prepare: async (page) => { await toStat(page); await go(page, '#/exam'); } },
  {
    name: 'r-playground',
    hash: '#/settings',
    prepare: async (page) => {
      await toStat(page);
      await go(page, '#/r');
      await page.getByRole('button', { name: /^Run/ }).first().click().catch(() => {});
      await page.waitForFunction(() => /Residual standard error/.test(document.body.innerText), null, { timeout: 150000 }).catch(() => {});
      await page.waitForTimeout(400);
    },
  },
  {
    // A lesson quiz under way: the runner, the question map and a question with R's output. Last, because
    // a paper in progress guards against leaving it.
    name: 'stat-quiz',
    hash: '#/settings',
    prepare: async (page) => {
      await toStat(page);
      await go(page, '#/quiz/regression-in-r');
      await page.getByRole('button', { name: /^Start the quiz/ }).click().catch(() => {});
      await page.waitForTimeout(600);
      await page.locator('.tr .ib-option').first().click().catch(() => {});
      await page.waitForTimeout(300);
    },
  },
];

if (flag('--list')) {
  for (const s of SHOTS) console.log(`${s.name.padEnd(18)} ${s.hash}${s.selector ? ` (${s.selector})` : ''}`);
  process.exit(0);
}

const out = arg('--out', 'scratch/shots');
const only = arg('--only', '').split(',').map((s) => s.trim()).filter(Boolean);
const wanted = only.length ? SHOTS.filter((s) => only.includes(s.name)) : SHOTS;
if (only.length && wanted.length !== only.length) {
  const missing = only.filter((n) => !SHOTS.some((s) => s.name === n));
  console.log(`No shot named ${missing.join(', ')}. Run with --list to see the names.`);
  process.exit(1);
}
mkdirSync(out, { recursive: true });

let base = arg('--base', '');
let server;
if (!base) ({ base, server } = await startPreview());

root = base;
const { browser, page } = await openBrowser(1280, 1000);
await page.goto(`${base}#/`, { waitUntil: 'load' });
await page.waitForTimeout(1500);
// The very first screen is the unit question; photograph it when asked for, then answer it.
if (wanted.some((s) => s.name === 'unit-chooser')) {
  await page.screenshot({ path: `${out}/unit-chooser.png` });
  console.log(`- unit-chooser -> ${out}/unit-chooser.png`);
}
await chooseUnit(page, 'CITS1401');
await dismissTour(page);

// Everything interesting on the report needs a history behind it, and the confidence question needs one
// that has not touched the question being photographed.
const seed = writeSeed(`${out}/seed.json`, index, { confidence: true });
await importProgress(page, base, seed);

for (const shot of wanted) {
  if (shot.name === 'unit-chooser') continue;
  await page.goto(base + shot.hash, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await shot.prepare?.(page);
  const path = `${out}/${shot.name}.png`;
  if (shot.selector) {
    const el = page.locator(shot.selector).first();
    if ((await el.count()) === 0) {
      console.log(`- ${shot.name}: nothing matched ${shot.selector} on ${shot.hash}`);
      continue;
    }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await el.screenshot({ path });
  } else {
    await page.screenshot({ path });
  }
  console.log(`- ${shot.name} -> ${path}`);
}

// Leave the profile as the other shots expect it, in case a STAT2402 shot switched it. A quiz shot leaves a
// paper running whose guard refuses to navigate away, so this is best effort: the context is thrown away anyway.
await switchUnit(page, base, 'CITS1401').catch(() => false);
await browser.close();
server?.kill();
console.log(`${wanted.length} shot${wanted.length === 1 ? '' : 's'} in ${out}`);
