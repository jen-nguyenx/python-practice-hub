// Is what students actually have working?
//
// The smoke test proves a local build is sound; this asks the same questions of a deployed one, which is
// where a bad chunk split, a stale asset or a failed workflow shows up and nowhere else. It takes under a
// minute and needs no build, so it is the thing to run after a deploy finishes.
//
// Usage:
//   node scripts/check-live.ts                    # the deployed site
//   node scripts/check-live.ts --base http://localhost:4173/
//   npm run check:live
import { readFileSync } from 'node:fs';
import { arg, dismissTour, importProgress, LIVE, openBrowser, waitForPython, writeSeed } from './lib/browser.ts';
import type { SeedQuestion } from './lib/browser.ts';
import {
  checkCalibration, checkConfidence, checkMainRoutes, checkPaletteReference,
  checkReferenceSearch, checkReportSections, visit,
} from './lib/checks.ts';
import type { Ctx } from './lib/checks.ts';

const base = arg('--base', LIVE);
const seedDir = arg('--scratch', 'scratch/live');
const index: SeedQuestion[] = JSON.parse(readFileSync('src/content/generated/question-index.json', 'utf8'));

const failures: string[] = [];
const { browser, page, errors } = await openBrowser();
const c: Ctx = { page, base, index, fail: (m) => failures.push(m) };

console.log(`Checking ${base}`);

try {
  await visit(c, '#/');
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
  // Just past the seeded history, in a topic that history has unlocked.
  await checkConfidence(c, (index[41] ?? index[index.length - 1]).qid);
} catch (e) {
  // A check that throws is a failed check, not a crashed script: say which one and keep the rest.
  failures.push(`check threw: ${(e as Error).message.split('\n')[0]}`);
}

if (errors.length) failures.push(...errors.slice(0, 20).map((e) => `console: ${e}`));
await browser.close();

if (failures.length) {
  console.log(`LIVE CHECK FAILED (${failures.length})`);
  for (const f of failures) console.log(' - ' + f);
  process.exit(1);
}
console.log('LIVE CHECK PASSED');
