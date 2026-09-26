// The checks that are worth running against any build of the app, local or deployed.
//
// Each one is a question a student would notice the wrong answer to: does the page render anything, does
// searching find the thing you searched for, does the report show what it reads from the event log. They
// live here rather than inside one runner so that the smoke test and the live check ask exactly the same
// questions — a check that only ever ran locally is a check that never covered what students have.
import type { Page } from 'playwright-core';
import { answerCurrent, switchUnit } from './browser.ts';
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
  '#/plan', '#/placement', '#/glossary', '#/revision',
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

/**
 * A review session, start to finish on the first question.
 *
 * The session reuses the app's own question components, so the thing that can break is the wiring around
 * them: dealing a question, recording the answer, showing why it was picked, and moving on. Formats vary,
 * so the answer is given the way a student would give it — pick an option, or type something — and a
 * session that offers neither is a failure, not something to pass over quietly.
 */
export async function checkReviewSession(c: Ctx): Promise<void> {
  await visit(c, '#/review');
  const start = c.page.getByRole('button', { name: /^Start the session/ });
  if ((await start.count()) === 0) {
    c.fail('#/review: a seeded history offered no session to start');
    return;
  }
  const planned = await c.page.locator('.rv-start-n').innerText();
  await start.click();
  await c.page.waitForTimeout(2000);

  const dots = await c.page.locator('.rs-dot').count();
  if (dots === 0) {
    c.fail(`#/review: starting a session of ${planned} dealt nothing`);
    return;
  }
  // Any title will do; an empty one means the question never loaded.
  if ((await c.page.locator('.rs-title').innerText().catch(() => '')).trim() === '') {
    c.fail('#/review: the first question in the session has no title');
    return;
  }

  // Walk the whole session, not just the first question. The formats vary, and a check that stopped
  // after one was a check that only ever saw whichever format happened to be dealt first.
  const total = await c.page.locator('.rs-dot').count();
  for (let i = 0; i < total; i++) {
    const format = await c.page.locator('.rs-fmt').innerText().catch(() => 'unknown');
    if ((await answerCurrent(c.page)) === 'none') {
      c.fail(`#/review: a "${format}" question offered no way to answer it`);
      return;
    }
    const check = c.page.getByRole('button', { name: /Check answer/i }).first();
    if ((await check.count()) === 0) {
      c.fail(`#/review: a "${format}" question has no check button`);
      return;
    }
    if (await check.isDisabled()) {
      c.fail(`#/review: a "${format}" question would not accept the answer given to it`);
      return;
    }
    await check.click();
    await c.page.waitForTimeout(1200);

    if ((await c.page.locator('.rs-after').count()) === 0) {
      c.fail(`#/review: checking a "${format}" answer showed no verdict`);
      return;
    }
    // Every pick carries a reason, and the reason is the whole point of a session over a random question.
    if ((await c.page.locator('.rs-why').innerText().catch(() => '')).trim() === '') {
      c.fail('#/review: the verdict does not say why the question was picked');
      return;
    }
    const on = c.page.getByRole('button', { name: /^(Next|Finish)/ }).first();
    if ((await on.count()) === 0) {
      c.fail('#/review: there is no way on from the verdict');
      return;
    }
    await on.click();
    await c.page.waitForTimeout(900);
  }

  // Answering the last one ends the session, and the end says how it went.
  if ((await c.page.locator('.rv-done').count()) === 0) {
    c.fail(`#/review: answering all ${total} questions did not finish the session`);
    return;
  }
  if ((await c.page.locator('.rv-done-h').innerText().catch(() => '')).trim() === '') {
    c.fail('#/review: the finished session says nothing about how it went');
  }
}

/**
 * The run-in: days left, the pace, the weeks between here and the paper.
 *
 * The numbers are the point — a plan that says "0 topics left in 0 weeks" to someone who has barely
 * started is worse than no plan — so this checks the figures agree with a seeded history rather than
 * only that the page rendered.
 */
export async function checkExamPlan(c: Ctx): Promise<void> {
  await visit(c, '#/plan');
  if ((await c.page.locator('.xp-verdict').count()) === 0) {
    c.fail('#/plan: the run-in did not render its verdict');
    return;
  }
  const days = Number((await c.page.locator('.xp-days-n').innerText()).trim());
  if (!Number.isFinite(days) || days < 0) c.fail(`#/plan: days to exams read as "${days}"`);

  const figures = await c.page.locator('.xp-num-v').allInnerTexts();
  if (figures.length !== 4) c.fail(`#/plan: expected four figures, found ${figures.length}`);
  // A seeded history has finished some topics and not others, so neither extreme is right here.
  const finished = Number(figures[0]?.split('/')[0]);
  if (!Number.isFinite(finished)) c.fail(`#/plan: "topics finished" read as "${figures[0]}"`);

  const weeks = await c.page.locator('.xp-week').count();
  if (weeks === 0) c.fail('#/plan: no weeks were laid out between now and the exams');
  // The last week is the exam week and must not ask for anything new.
  const last = (await c.page.locator('.xp-week').last().innerText()).toLowerCase();
  if (!last.includes('exam')) c.fail(`#/plan: the last week is not the exams, it is "${last.slice(0, 40)}"`);
  if (/^start |\bstart [a-z]/m.test(last)) c.fail('#/plan: the exam week asks the student to start something');

  const checks = await c.page.locator('.xp-check').count();
  if (checks === 0) c.fail('#/plan: nothing listed under "before the paper"');
  // "Every topic looked at" must not claim a history that has practised topics never opened one.
  const ready = await c.page.locator('.xp-checks').innerText();
  if (/13 never opened/.test(ready)) c.fail('#/plan: a practised history is reported as having opened no topics');
}

/**
 * The placement check, start to finish.
 *
 * Answers are given the way a student gives them, which means they are usually wrong — so this walks the
 * check to wherever that lands and requires it to end somewhere sensible. What the answers unlock is
 * decided by engine code with its own tests; what is checked here is the journey: a question per topic,
 * a verdict after each, and a result that says where it left you.
 */
export async function checkPlacement(c: Ctx): Promise<void> {
  await visit(c, '#/placement');
  const start = c.page.getByRole('button', { name: /^Start$/ });
  if ((await start.count()) === 0) {
    c.fail('#/placement: there is no way to start the check');
    return;
  }
  await start.click();
  await c.page.waitForTimeout(2500);

  if ((await c.page.locator('.pl-tick').count()) === 0) {
    c.fail('#/placement: starting the check dealt no questions');
    return;
  }

  // At most the whole ladder; it stops itself after two wrong in a row.
  for (let i = 0; i < 14; i++) {
    if ((await c.page.locator('.pl-done').count()) > 0) break;
    const format = await c.page.locator('.pl-topic').innerText().catch(() => 'unknown');
    // Help must stay shut: a check you can look up measures nothing.
    if ((await c.page.getByRole('button', { name: /hint/i }).count()) > 0) {
      c.fail(`#/placement: a hint was offered on the ${format} question`);
      return;
    }
    if ((await answerCurrent(c.page, '.pl-answer')) === 'none') {
      c.fail(`#/placement: the ${format} question offered no way to answer it`);
      return;
    }
    const check = c.page.getByRole('button', { name: /Check answer|Submit answer/i }).first();
    if ((await check.count()) === 0 || (await check.isDisabled())) {
      c.fail(`#/placement: the ${format} question would not accept an answer`);
      return;
    }
    await check.click();
    await c.page.waitForTimeout(900);
    const on = c.page.getByRole('button', { name: /^Next/ }).first();
    if ((await on.count()) === 0) {
      c.fail(`#/placement: no way on from the ${format} question`);
      return;
    }
    await on.click();
    await c.page.waitForTimeout(900);
  }

  if ((await c.page.locator('.pl-done').count()) === 0) {
    c.fail('#/placement: the check never finished');
    return;
  }
  const said = await c.page.locator('.pl-done-h').innerText().catch(() => '');
  if (said.trim() === '') c.fail('#/placement: the result does not say where it left you');
}

/**
 * The glossary: a word, a plainer sentence, and — where the word is a claim about Python — the claim
 * running. The cross-references between entries are the part most likely to rot, since they are written
 * by hand as [[links]] inside prose, so one is followed here.
 */
export async function checkGlossary(c: Ctx): Promise<void> {
  await visit(c, '#/glossary');
  const box = c.page.locator('.gl-search-in');
  if ((await box.count()) === 0) {
    c.fail('#/glossary: no search box');
    return;
  }
  await box.fill('');
  await box.click();
  await box.type('mutable', { delay: 10 });
  await c.page.waitForTimeout(400);

  const top = c.page.locator('.gl-card').first();
  if ((await top.count()) === 0) {
    c.fail('#/glossary: searching for "mutable" found nothing');
    return;
  }
  if ((await top.locator('.gl-term').innerText()).trim().toLowerCase() !== 'mutable') {
    c.fail(`#/glossary: the top result for "mutable" was "${await top.locator('.gl-term').innerText()}"`);
  }
  // A definition that makes a claim about Python has to show it, not assert it.
  if ((await top.locator('.gl-out').count()) === 0) c.fail('#/glossary: the mutable entry shows no output for its example');

  // A [[link]] inside a definition must reach the entry it names.
  const xref = top.locator('.gl-xref').first();
  if ((await xref.count()) === 0) {
    c.fail('#/glossary: the mutable entry has no cross-reference to follow');
    return;
  }
  const word = (await xref.innerText()).trim().toLowerCase();
  await xref.click();
  await c.page.waitForTimeout(600);
  const opened = await c.page.locator('.gl-card.is-open .gl-term').innerText().catch(() => '');
  if (opened.trim().toLowerCase() !== word) {
    c.fail(`#/glossary: following the link to "${word}" opened "${opened || 'nothing'}"`);
  }
}

/**
 * Glossary words marked in lesson prose.
 *
 * Two things can go wrong and both are quiet. The marking can stop happening at all, which nothing else
 * would notice; or it can start marking inside code, where `return` is a keyword and a definition of it
 * would be nonsense. Recursion is used because its prose genuinely contains the vocabulary.
 */
export async function checkTermMarks(c: Ctx): Promise<void> {
  await visit(c, '#/lesson/core-recursion');
  await c.page.waitForTimeout(600);
  const marks = c.page.locator('.ls-body .tm');
  const n = await marks.count();
  if (n === 0) {
    c.fail('#/lesson/core-recursion: no glossary words are marked in the prose');
    return;
  }
  // Never inside code: a marked keyword would be explained as English.
  if ((await c.page.locator('.ls-body code .tm, .ls-body pre .tm').count()) > 0) {
    c.fail('a glossary word was marked inside code');
  }

  const word = (await marks.first().innerText()).split('\n')[0].trim();
  await marks.first().hover();
  await c.page.waitForTimeout(400);
  const pop = c.page.locator('.tm-pop');
  if ((await pop.count()) === 0) {
    c.fail(`hovering "${word}" showed no definition`);
    return;
  }
  const text = await pop.innerText();
  if (text.trim().length < 20) c.fail(`the definition of "${word}" is empty or near enough`);
  if (!/glossary/i.test(text)) c.fail(`the definition of "${word}" does not offer the glossary entry`);

  // Escape closes it, which is the only way out for a keyboard.
  await c.page.keyboard.press('Escape');
  await c.page.waitForTimeout(250);
  if ((await c.page.locator('.tm-pop').count()) > 0) c.fail('Escape did not close the definition');
}

/** The revision pack: every cheat sheet on one page, built to be printed. */
export async function checkRevisionPack(c: Ctx): Promise<void> {
  await visit(c, '#/revision');
  await c.page.waitForTimeout(1500);
  const sheets = await c.page.locator('.rvp-sheet').count();
  // Thirteen topics, so a pack with one or two means the topic chunks did not load.
  if (sheets < 10) c.fail(`#/revision: only ${sheets} cheat sheets made it into the pack`);
  if ((await c.page.locator('.rvp-patterns li').count()) === 0) c.fail('#/revision: the pattern cards are missing');
}

/** A project build: stages derived from a scenario, in the order the work happens. */
export async function checkProjectBuild(c: Ctx): Promise<void> {
  await visit(c, '#/build/t12-s1');
  await c.page.waitForTimeout(1500);
  const steps = await c.page.locator('.pb-step').count();
  if (steps === 0) {
    c.fail('#/build/t12-s1: the build has no stages');
    return;
  }
  // The brief first and the check last: the order is the whole point of the page.
  const labels = (await c.page.locator('.pb-step-l').allInnerTexts()).map((t) => t.trim());
  if (labels[0] !== 'The brief') c.fail(`#/build: the first stage is "${labels[0]}"`);
  if (labels[labels.length - 1] !== 'Check it') c.fail(`#/build: the last stage is "${labels[labels.length - 1]}"`);
  // Somewhere in the middle there has to be something to actually write.
  if (!labels.some((l) => /^Piece|^Assemble/.test(l))) c.fail('#/build: no code to write in any stage');
}

/** The left bar opens to show the names, which is the point of it for a beginner. */
export async function checkNavExpands(c: Ctx): Promise<void> {
  await visit(c, '#/');
  const toggle = c.page.locator('.actbar-toggle');
  if ((await toggle.count()) === 0) {
    c.fail('the menu has no way to collapse or expand');
    return;
  }
  const named = await c.page.locator('.actbar.is-wide .actbar-label').count();
  if (named === 0) c.fail('the menu opens without showing any names');
  await toggle.click();
  await c.page.waitForTimeout(400);
  if ((await c.page.locator('.actbar.is-wide').count()) > 0) c.fail('collapsing the menu did nothing');
  await toggle.click();
  await c.page.waitForTimeout(400);
  if ((await c.page.locator('.actbar.is-wide').count()) === 0) c.fail('the menu would not open again');
}

/**
 * The Markets track is hidden until its switch is on.
 *
 * Both halves matter: a first-year must never see a lesson on futures in the library by default, and
 * the person who does want it must be able to turn it on and find it. Checked through Settings rather
 * than by poking storage, because the switch is what a person would use.
 */
export async function checkMarketsSwitch(c: Ctx): Promise<void> {
  await visit(c, '#/lessons');
  await c.page.waitForTimeout(600);
  const before = await c.page.locator('.lx-track-title', { hasText: /^Markets$/ }).count();
  if (before > 0) c.fail('#/lessons: the Markets track is showing with its switch off');

  await visit(c, '#/settings');
  const sw = c.page.locator('[role="switch"][aria-labelledby="set-markets-label"]').first();
  if ((await sw.count()) === 0) {
    c.fail('#/settings: there is no Markets switch');
    return;
  }
  await sw.click();
  await c.page.waitForTimeout(300);

  await visit(c, '#/lessons');
  await c.page.waitForTimeout(600);
  const after = await c.page.locator('.lx-track-title', { hasText: /^Markets$/ }).count();
  if (after === 0) c.fail('#/lessons: turning the Markets switch on did not show the track');
  const cards = await c.page.locator('.lx-track:has(.lx-track-title:text-is("Markets")) .lx-card').count();
  if (cards < 1) c.fail('#/lessons: the Markets track has no lessons in it');

  // Put it back the way a student would find it.
  await visit(c, '#/settings');
  await sw.click().catch(() => {});
  await c.page.waitForTimeout(300);
}

/**
 * The bottom bar on a phone.
 *
 * Eight destinations share about 45px each, so a label that will not shrink runs into its neighbour —
 * which is exactly what happened when a desktop rule leaked a 14px size into the phone layout and the
 * whole bar became one unbroken string. Checked at the narrowest phone still in common use.
 */
export async function checkPhoneNav(c: Ctx): Promise<void> {
  const page = c.page;
  const before = page.viewportSize();
  await page.setViewportSize({ width: 320, height: 800 });
  await visit(c, '#/');
  await page.waitForTimeout(500);

  const problems = await page.evaluate(() => {
    const out: string[] = [];
    const items = [...document.querySelectorAll('.actbar-item')] as HTMLElement[];
    if (items.length === 0) return ['the bar has no items at all'];
    items.forEach((el, i) => {
      const lab = el.querySelector('.actbar-tiny') as HTMLElement | null;
      if (!lab || getComputedStyle(lab).display === 'none') { out.push('an item shows no label'); return; }
      if (lab.scrollWidth > lab.clientWidth + 1) out.push(`"${lab.textContent}" is cut off`);
      const mine = lab.getBoundingClientRect();
      const next = items[i + 1]?.querySelector('.actbar-tiny')?.getBoundingClientRect();
      if (next && mine.right > next.left + 0.5) out.push(`"${lab.textContent}" runs into the next label`);
      // Anything tappable wants about a finger's width.
      if (el.getBoundingClientRect().height < 44) out.push(`"${lab.textContent}" is too short to tap`);
    });
    return out;
  });
  for (const p of problems) c.fail(`phone nav: ${p}`);

  if (before) await page.setViewportSize(before);
}

/**
 * The question a first visit asks: which unit? Needs a fresh profile on the home page.
 *
 * It has to come before anything else -- the tour describes CITS1401, so opening it over a STAT2402
 * student's first screen would be the app answering the question for them. Answers CITS1401, the unit
 * every other check is written for, and confirms the ladder follows.
 */
export async function checkUnitChooser(c: Ctx): Promise<void> {
  const page = c.page;
  const heading = page.getByRole('heading', { name: 'Which unit are you studying?' });
  if (!(await heading.isVisible().catch(() => false))) {
    c.fail('#/: a first visit does not ask which unit');
    return;
  }
  if ((await page.locator('.up-card').count()) !== 2) c.fail('#/: the unit question does not offer both units');
  if (await page.getByRole('button', { name: /^Skip/ }).first().isVisible().catch(() => false)) {
    c.fail('#/: the welcome tour opened over the unit question');
  }
  await page.locator('.up-card', { hasText: 'CITS1401' }).first().click();
  await page.waitForTimeout(600);
  if ((await page.locator('.tiles').count()) === 0) c.fail('#/: choosing CITS1401 did not show the topic ladder');
}

/**
 * The STAT2402 path, end to end in a real browser: switching unit changes home, the bar and the library;
 * R starts in its sandbox and runs a model; an R exercise in a lesson can be completed; and R cannot
 * reach the app. Puts the unit back to CITS1401 afterwards, as the other checks expect.
 *
 * The isolation half is the one that matters most. R runs in an iframe with an opaque origin precisely so
 * that webr::eval_js() -- a route from R to JavaScript that R itself provides -- lands somewhere with no
 * access to the app's IndexedDB. If the frame ever became same-origin, pasted R could read a student's
 * whole history. See SECURITY.md.
 */
export async function checkStatPath(c: Ctx, lessonCount: number): Promise<void> {
  const page = c.page;
  if (!(await switchUnit(page, c.base, 'STAT2402'))) {
    c.fail('#/settings: there is no way to switch unit');
    return;
  }
  try {
    await visit(c, '#/');
    if ((await page.locator('.stat-home').count()) === 0) c.fail('#/: switching to STAT2402 did not change the home page');
    const steps = await page.locator('.sh-step').count();
    if (steps !== lessonCount) c.fail(`#/: the STAT2402 path lists ${steps} lessons, not ${lessonCount}`);
    const bar = await page.locator('.actbar-item').allInnerTexts();
    if (bar.length !== 5) c.fail(`STAT2402 bar: ${bar.length} destinations, expected Home, Lessons, Exams, R Playground and Settings`);
    if (bar.some((t) => /Review|Progress|Look up/.test(t))) c.fail('STAT2402 bar: still offers a CITS1401 destination');

    await visit(c, '#/lessons');
    const tracks = await page.locator('.lx-track-title').allInnerTexts();
    if (!tracks.includes('STAT2402')) c.fail('#/lessons: the STAT2402 track is missing for a STAT2402 student');
    if (tracks.some((t) => t === 'Core' || t === 'Foundations')) c.fail('#/lessons: a STAT2402 student is shown the Python tracks');

    // Real R: the Playground's own starting script fits a model and prints its summary.
    await visit(c, '#/r');
    await page.getByRole('button', { name: /^Run/ }).first().click();
    const ran = await page.waitForFunction(
      () => /Residual standard error/.test(document.querySelector('.pg-out-body')?.textContent ?? ''), null, { timeout: 150000 },
    ).then(() => true).catch(() => false);
    if (!ran) {
      const said = ((await page.locator('.pg-out-body').textContent().catch(() => '')) ?? '').slice(0, 160);
      c.fail(`#/r: R never printed the model summary (${said || 'nothing'})`);
      return;
    }

    // A pinned package, fetched from the app's own folder, checked against its hash, installed on first use.
    const editorForPkg = page.locator('.pg-editor .monaco-editor').first();
    if (await editorForPkg.count()) {
      await editorForPkg.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('library(MASS); class(glm.nb(breaks ~ tension, data = warpbreaks))[1]');
      await page.getByRole('button', { name: /^Run/ }).first().click();
      const loaded = await page.waitForFunction(
        () => /"negbin"/.test(document.querySelector('.pg-out-body')?.textContent ?? ''), null, { timeout: 120000 },
      ).then(() => true).catch(() => false);
      if (!loaded) {
        const said = ((await page.locator('.pg-out-body').textContent().catch(() => '')) ?? '').slice(0, 200);
        c.fail(`#/r: library(MASS) did not load a working glm.nb (${said || 'nothing'})`);
      }
    }

    // The frame R lives in must be cross-origin to the app: its document is not ours to read.
    const isolated = await page.evaluate(() => {
      const f = document.querySelector('iframe[title="R"]') as HTMLIFrameElement | null;
      if (!f) return 'no R frame';
      if (!(f.getAttribute('sandbox') ?? '').split(/\s+/).includes('allow-scripts')) return 'frame is not sandboxed';
      if ((f.getAttribute('sandbox') ?? '').includes('allow-same-origin')) return 'frame is allowed the same origin';
      try { return f.contentDocument === null ? 'ok' : 'frame document is readable from the app'; } catch { return 'ok'; }
    });
    if (isolated !== 'ok') c.fail(`R sandbox: ${isolated}`);

    // R can run JavaScript (webr::eval_js is part of webR, and webR needs eval to start), so the question
    // is what that JavaScript can reach. It must find itself in an opaque origin, and be refused storage.
    // The marker is joined at run time, so it is on the page only if JavaScript really opened a database.
    const editor = page.locator('.pg-editor .monaco-editor').first();
    if (await editor.count()) {
      await editor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type(
        `cat("origin", webr::eval_js("self.origin"), webr::eval_js("(() => { try { indexedDB.open('pyladder'); return 'PL' + '_IDB_OPEN'; } catch (e) { return 'storage ' + e.name; } })()"), "\\n")`,
      );
      await page.getByRole('button', { name: /^Run/ }).first().click();
      await page.waitForFunction(() => /Finished|Stopped/.test(document.querySelector('.pg-out-body')?.textContent ?? ''), null, { timeout: 30000 }).catch(() => {});
      const said = (await page.locator('.pg-out-body').innerText().catch(() => '')) ?? '';
      if (said.includes('PL_IDB_OPEN')) c.fail('R sandbox: JavaScript run from R opened IndexedDB');
      if (!/origin null storage/.test(said)) c.fail(`R sandbox: JavaScript run from R is not in an opaque, storage-less origin (${said.slice(0, 160)})`);
    }

    // An exercise inside a lesson, checked by R.
    await visit(c, '#/lesson/regression-in-r');
    await page.locator('.ls-step', { hasText: 'Your turn' }).first().click();
    await page.waitForTimeout(400);
    const taskEditor = page.locator('.ib-task .monaco-editor, .ib-task textarea').first();
    if ((await taskEditor.count()) === 0) {
      c.fail('regression-in-r: the exercise has no editor');
    } else {
      await taskEditor.click();
      await page.keyboard.press('ControlOrMeta+A');
      await page.keyboard.type('slope_of <- function(x, y) unname(coef(lm(y ~ x))[2])');
      await page.getByRole('button', { name: 'Check my code' }).click();
      const passed = await page.waitForFunction(
        () => /All tests pass/.test(document.querySelector('.ib-task')?.textContent ?? ''), null, { timeout: 150000 },
      ).then(() => true).catch(() => false);
      if (!passed) {
        const said = ((await page.locator('.ib-task-out').textContent().catch(() => '')) ?? '').slice(0, 200);
        c.fail(`regression-in-r: a correct answer to the exercise did not pass (${said || 'no result'})`);
      }
    }
  } finally {
    if (!(await switchUnit(page, c.base, 'CITS1401'))) c.fail('#/settings: could not switch back to CITS1401');
  }
}

/**
 * STAT2402's exams in a real browser: a lesson quiz sat, marked and remembered on the home page, and a mock
 * final built to 100 marks and marked. Answers are left mostly blank on purpose -- what is checked is that a
 * paper can be started, finished and scored, and that the result reaches the event log, not the content.
 */
export async function checkStatExams(c: Ctx): Promise<void> {
  const page = c.page;
  if (!(await switchUnit(page, c.base, 'STAT2402'))) {
    c.fail('#/settings: there is no way to switch unit');
    return;
  }
  const finishPaper = async (where: string) => {
    await page.getByRole('button', { name: 'Finish', exact: true }).first().click();
    // The dialog only opens when something is unanswered or flagged, and it animates in, so wait for it.
    const confirm = page.getByRole('button', { name: 'Finish and mark' });
    if (await confirm.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)) await confirm.click();
    const marked = await page.locator('.trs-big').first().waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);
    if (!marked) c.fail(`${where}: finishing the paper did not show a mark`);
    return marked;
  };
  try {
    // A lesson quiz: answer the first question, finish, get a mark and a review.
    await visit(c, '#/quiz/regression-in-r');
    const start = page.getByRole('button', { name: /^Start the quiz/ });
    if (!(await start.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false))) {
      c.fail('#/quiz/regression-in-r: no way to start the quiz');
      return;
    }
    await start.click();
    const option = page.locator('.tr .ib-option').first();
    if (await option.count()) await option.click();
    else await page.locator('.tr .sq-number-in').first().fill('1').catch(() => {});
    if (await finishPaper('#/quiz/regression-in-r')) {
      const rows = await page.locator('.sx-review-row').count();
      if (rows < 6) c.fail(`#/quiz/regression-in-r: the review lists ${rows} questions`);
      await page.locator('.sx-review-head').first().click();
      if ((await page.locator('.sq-review .sq-explain').count()) === 0) c.fail('#/quiz/regression-in-r: an opened review row shows no explanation');
    }
    await visit(c, '#/');
    if ((await page.locator('.sh-quiz').count()) === 0) c.fail('#/: a finished quiz does not show on the STAT2402 path');

    // The mock final: built to 100 marks, finished blank, marked.
    await visit(c, '#/exam');
    await page.getByRole('radio', { name: 'Mock final' }).click().catch(() => {});
    // Its label reads "Loading questions…" until the bank has arrived.
    const sit = page.getByRole('button', { name: /^Sit the mock final/ });
    if (!(await sit.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false))) {
      c.fail('#/exam: the mock final cannot be started');
      return;
    }
    await sit.click();
    const title = (await page.locator('.tr-bar-title h1').textContent().catch(() => '')) ?? '';
    if (!/100 marks/.test(title)) c.fail(`#/exam: the mock final is titled "${title}", not out of 100 marks`);
    if (await finishPaper('#/exam mock final')) {
      const total = ((await page.locator('.trs-big span').first().textContent().catch(() => '')) ?? '').replace(/\D/g, '');
      if (total !== '100') c.fail(`#/exam: the mock final was marked out of ${total || 'nothing'}, not 100`);
    }
  } finally {
    if (!(await switchUnit(page, c.base, 'CITS1401'))) c.fail('#/settings: could not switch back to CITS1401');
  }
}
