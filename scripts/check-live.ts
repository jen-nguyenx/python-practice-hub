// Is what students actually have working?
//
// The smoke test proves a local build is sound; this asks the same questions of a deployed one, which is
// where a bad chunk split, a stale asset or a failed workflow shows up and nowhere else. It takes under a
// minute and needs no build, so it is the thing to run after a deploy finishes.
//
// Usage:
//   npm run check:live                  # the deployed site
//   npm run check:live -- --local       # the local production build, serving it for the run
//   npm run check:live -- --base http://localhost:5173/
import { readFileSync } from 'node:fs';
import { arg, dismissTour, flag, importProgress, LIVE, openBrowser, startPreview, waitForPython, writeSeed } from './lib/browser.ts';
import type { SeedQuestion } from './lib/browser.ts';
import {
  checkCalibration, checkConfidence, checkMainRoutes, checkPaletteReference,
  checkReferenceSearch, checkReportSections, checkReviewSession, visit,
} from './lib/checks.ts';
import type { Ctx } from './lib/checks.ts';

// --local serves the build here rather than asking for a server that is already running: forgetting to
// start one is how this gets run against nothing and passes for the wrong reason.
let base = arg('--base', '');
let server;
if (flag('--local')) ({ base, server } = await startPreview());
else if (!base) base = LIVE;
const seedDir = arg('--scratch', 'scratch/live');
const index: SeedQuestion[] = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'));

/**
 * Which build is actually being served?
 *
 * A check run straight after a deploy can reach the previous build while the CDN catches up, and then
 * reports a failure about code that is not live yet — which is exactly what happened the first time this
 * ran after a deploy. Comparing the page's main script against the local one turns that confusion into a
 * line of output. It is a note rather than a failure: this is also run without a fresh local build.
 */
function localBuildAsset(): string | null {
  try {
    const html = readFileSync('dist/index.html', 'utf8');
    return /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(html)?.[1] ?? null;
  } catch {
    return null;
  }
}

const failures: string[] = [];
const { browser, page, errors } = await openBrowser();
const c: Ctx = { page, base, index, fail: (m) => failures.push(m) };

console.log(`Checking ${base}`);

try {
  await visit(c, '#/');
  const mine = localBuildAsset();
  if (mine) {
    const served = /assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(await page.content())?.[1] ?? 'nothing recognisable';
    console.log(served === mine
      ? `Serving your local build (${mine}).`
      : `NOTE: serving ${served}, your local build is ${mine}. If you just deployed, the CDN may still be catching up.`);
  }
  if (!(await waitForPython(page))) failures.push('Python never reported itself ready');
  // A first visit opens the welcome tour, whose dialog swallows every click after it.
  await dismissTour(page);

  await checkMainRoutes(c);
  await checkReferenceSearch(c);
  await checkPaletteReference(c);

  // Everything below needs a profile with history: the report's sections do not exist without one. The
  // browser context is thrown away at the end, so this touches nothing but this run.
  const seed = writeSeed(`${seedDir}/seed.json`, index, { confidence: true });
  await importProgress(page, base, seed);
  await checkReportSections(c);
  await checkCalibration(c);
  await checkReviewSession(c);
  // Just past the seeded history, in a topic that history has unlocked.
  await checkConfidence(c, (index[41] ?? index[index.length - 1]).qid);
} catch (e) {
  // A check that throws is a failed check, not a crashed script: say which one and keep the rest.
  failures.push(`check threw: ${(e as Error).message.split('\n')[0]}`);
}

if (errors.length) failures.push(...errors.slice(0, 20).map((e) => `console: ${e}`));
await browser.close();
server?.kill();

if (failures.length) {
  console.log(`LIVE CHECK FAILED (${failures.length})`);
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
console.log('LIVE CHECK PASSED');
