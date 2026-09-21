import { describe, expect, it } from 'vitest';
import type { TopicId } from '../content/ids.ts';
import { MISTAKES } from '../content/mistakes.ts';
import type { PatternCard } from '../content/patterns.ts';
import { buildReport, mistakeOccurrences, patternStatuses, sessionTimeline } from './report.ts';
import type { AppEvent } from './types.ts';
import { MIN, T0, attempt, hint, meta, mistake, open, reveal, selfExplain, sessionStart, testResult } from './util/testUtil.ts';

const DAY = 86_400_000;
const D18 = T0 + 18 * DAY;
const D19 = T0 + 19 * DAY;
const NOW = T0 + 20 * DAY;

const index = [
  meta('t01-s1-q1', 'mcq'), meta('t01-s1-q2', 'predict'), meta('t01-s1-q3', 'multi'), meta('t01-s2-q1', 'trace'),
  meta('t01-s2-q2', 'cloze'), meta('t01-s2-q3', 'write'),
  meta('t02-s1-q1', 'mcq', { detects: ['elif_vs_if'] }), meta('t02-s1-q2', 'twins', { detects: ['elif_vs_if'] }),
  meta('t02-s1-q3', 'parsons'), meta('t02-s2-q1', 'write', { detects: ['elif_vs_if'] }),
  meta('t03-s1-q1', 'predict'), meta('t03-s1-q2', 'write', { paper: true }), meta('t03-s1-q3', 'fixBug', { detects: ['off_by_one_range'] }),
  meta('t12-s1-q1', 'write', { expectedSec: 600, detects: ['import_used', 'print_in_main', 'round_mid_calc'] }),
  meta('t13-s1-q1', 'write', { expectedSec: 600, detects: ['loop_in_recursion'] }),
];
const unlocked: TopicId[] = ['variables-expressions', 'if-elif-else', 'for-loops-range'];

const t01 = index.filter((m) => m.topicId === 'variables-expressions');

const events: AppEvent[] = [
  // Session s1, 20 days ago: strong work in topic 1.
  sessionStart(T0, 's1'),
  open('variables-expressions', T0 + 1000, 's1'),
  ...t01.map((m, i) => attempt({ ts: T0 + (i + 1) * 2 * MIN, sessionId: 's1', qid: m.qid, format: m.format, timeMs: 60_000, flags: m.format === 'write' ? ['for_each'] : undefined })),

  // Session s2, 2 days ago: struggling in topic 2.
  sessionStart(D18, 's2'),
  open('if-elif-else', D18 + 1000, 's2'),
  attempt({ ts: D18 + MIN, sessionId: 's2', qid: 't02-s1-q1', correct: false, timeMs: 5000, mistakes: ['elif_vs_if'] }),
  mistake('t02-s1-q1', 'elif_vs_if', D18 + MIN, 's2'),
  hint('t02-s1-q2', 3, D18 + 2 * MIN, 1000, 's2'),
  attempt({ ts: D18 + 3 * MIN, sessionId: 's2', qid: 't02-s1-q2', format: 'twins', correct: false, hintTier: 3, timeMs: 60_000, mistakes: ['elif_vs_if'] }),
  reveal('t02-s1-q2', D18 + 4 * MIN, 's2'),
  attempt({ ts: D18 + 10 * MIN, sessionId: 's2', qid: 't02-s2-q1', format: 'write', diff: 'medium', correct: false, timeMs: 400_000, mistakes: ['elif_vs_if'] }),
  mistake('t02-s2-q1', 'elif_vs_if', D18 + 10 * MIN + 5, 's2'),
  attempt({ ts: D18 + 15 * MIN, sessionId: 's2', qid: 't02-s2-q1', format: 'write', diff: 'medium', correct: true, timeMs: 200_000 }),
  reveal('t02-s1-q3', D18 + 16 * MIN, 's2'),
  selfExplain('t02-s1-q3', D18 + 17 * MIN, 's2'),
  testResult('topic-test', ['if-elif-else'], 2, 5, false, D18 + 25 * MIN, 's2'),

  // Session s3, yesterday: mixed topics.
  sessionStart(D19, 's3'),
  open('for-loops-range', D19 + 1000, 's3'),
  hint('t03-s1-q1', 1, D19 + MIN, 500, 's3'),
  attempt({ ts: D19 + 2 * MIN, sessionId: 's3', qid: 't03-s1-q1', format: 'predict', hintTier: 1, credit: 0.9, timeMs: 90_000 }),
  attempt({ ts: D19 + 10 * MIN, sessionId: 's3', qid: 't03-s1-q2', format: 'write', mode: 'paper', correct: false, score: 0.5, credit: 0.5, timeMs: 300_000, mistakes: ['off_by_one_range'] }),
  mistake('t03-s1-q2', 'off_by_one_range', D19 + 10 * MIN, 's3'),
  attempt({ ts: D19 + 20 * MIN, sessionId: 's3', qid: 't12-s1-q1', format: 'write', correct: false, score: 0.5, credit: 0.5, timeMs: 600_000, mistakes: ['import_used'] }),
  mistake('t12-s1-q1', 'import_used', D19 + 20 * MIN, 's3'),
  attempt({ ts: D19 + 30 * MIN, sessionId: 's3', qid: 't13-s1-q1', format: 'write', timeMs: 300_000, flags: ['recursion_present'] }),
  testResult('practice-test', ['variables-expressions', 'if-elif-else'], 12, 30, false, D19 + 40 * MIN, 's3'),
];

const label = (id: keyof typeof MISTAKES) => MISTAKES[id].label;

describe('mistakeOccurrences', () => {
  it('does not double count mistake events and attempt.mistakes', () => {
    const occ = mistakeOccurrences(events);
    expect(occ.filter((o) => o.id === 'elif_vs_if')).toHaveLength(3);
    expect(occ.filter((o) => o.id === 'off_by_one_range')).toHaveLength(1);
    expect(occ.filter((o) => o.id === 'import_used')).toHaveLength(1);
  });
});

describe('buildReport (all time)', () => {
  const r = buildReport(events, index, 'all', unlocked, NOW);

  it('totals', () => {
    expect(r.range).toBe('all');
    expect(r.hasEnoughData).toBe(true);
    expect(r.totals.questions).toBe(14);
    expect(r.totals.attempts).toBe(14);
    expect(r.totals.sessions).toBe(3);
    expect(r.totals.accuracy).toBeCloseTo(9.9 / 14);
    expect(r.totals.firstTryRate).toBeCloseTo(8 / 13);
    expect(r.totals.hintRate).toBeCloseTo(2 / 14);
    expect(r.totals.revealRate).toBeCloseTo(2 / 14);
    expect(r.totals.focusedMinutes).toBeGreaterThan(12);
  });

  it('labels topics with plain reasons', () => {
    const byId = Object.fromEntries(r.topics.map((t) => [t.topicId, t]));
    expect(r.topics).toHaveLength(13);
    expect(byId['variables-expressions']).toMatchObject({ label: 'strong', attempted: 6, total: 6, score: 1, hintReliance: 0 });
    expect(byId['variables-expressions'].reasons).toEqual(['You scored 100% across 6 questions, mostly without hints.']);
    expect(byId['variables-expressions'].byDiff.easy).toEqual({ attempted: 6, correct: 6 });

    const t2 = byId['if-elif-else'];
    expect(t2).toMatchObject({ label: 'weak', attempted: 4, total: 4, score: 0.25, hintReliance: 0.5 });
    expect(t2.reasons).toEqual([
      'Your score here is 25% across 4 questions.',
      `The mistake "${label('elif_vs_if')}" came up 3 times in the last 14 days.`,
      'You did not pass the last topic test.',
    ]);
    expect(t2.byDiff.medium).toEqual({ attempted: 1, correct: 1 });

    expect(byId['for-loops-range']).toMatchObject({ label: 'ok', attempted: 2, total: 3 });
    expect(byId['for-loops-range'].score).toBeCloseTo(0.7);
    expect(byId['for-loops-range'].reasons).toEqual(['You scored 70% across 2 questions.', 'Try at least 5 questions here for a clearer picture.']);
    expect(byId.strings).toMatchObject({ label: 'not-started', attempted: 0, score: null, hintReliance: null, lastTs: null, reasons: [] });
  });

  it('ladder by read / repair / write', () => {
    const l1 = r.ladder.find((x) => x.topicId === 'variables-expressions');
    expect(l1).toEqual({ topicId: 'variables-expressions', read: 1, repair: 1, write: 1 });
    const l2 = r.ladder.find((x) => x.topicId === 'if-elif-else');
    expect(l2).toEqual({ topicId: 'if-elif-else', read: 0, repair: 0, write: 1 });
    expect(r.ladder.find((x) => x.topicId === 'strings')).toEqual({ topicId: 'strings', read: null, repair: null, write: null });
  });

  it('mistakes sorted by recent count, with fix time and a practice question', () => {
    expect(r.mistakes.map((m) => m.id)).toEqual(['elif_vs_if', 'import_used', 'off_by_one_range']);
    expect(r.mistakes[0]).toMatchObject({ count: 3, questions: 3, sessions: 1, recent14d: 3, medianFixMs: 5 * MIN - 5, exampleQid: 't02-s1-q1' });
    expect(r.mistakes[1]).toMatchObject({ count: 1, medianFixMs: null, exampleQid: 't12-s1-q1' });
    expect(r.mistakes[2]).toMatchObject({ count: 1, exampleQid: 't03-s1-q3' });
  });

  it('formats', () => {
    const mcq = r.formats.find((f) => f.format === 'mcq')!;
    expect(mcq).toEqual({ format: 'mcq', attempted: 2, accuracy: 0.5, medianTimeSec: 33 });
    const write = r.formats.find((f) => f.format === 'write')!;
    expect(write.attempted).toBe(5);
    expect(write.accuracy).toBeCloseTo(0.8);
    expect(r.formats.find((f) => f.format === 'refactor')).toEqual({ format: 'refactor', attempted: 0, accuracy: null, medianTimeSec: null });
  });

  it('sessions newest first and a chronological trend', () => {
    expect(r.sessions.map((s) => s.sessionId)).toEqual(['s3', 's2', 's1']);
    expect(r.sessions[2]).toMatchObject({ questions: 6, accuracy: 1, durationMin: 12, newMistakes: [], topics: ['variables-expressions'] });
    expect(r.sessions[1].newMistakes).toEqual(['elif_vs_if']);
    expect(r.sessions[0].newMistakes).toEqual(['off_by_one_range', 'import_used']);
    expect(r.sessions[0].topics).toEqual(['for-loops-range', 'project-simulator', 'recursion']);
    expect(r.sessions[0].accuracy).toBeCloseTo(0.725);
    expect(r.trend.map((t) => t.sessionId)).toEqual(['s1', 's2', 's3']);
  });

  it('readiness', () => {
    expect(r.readiness.paperAccuracy).toBe(0.5);
    expect(r.readiness.practiceTest).toEqual({ best: 0.4, last: 0.4, attempts: 1 });
    expect(r.readiness.recursionAccuracy).toBe(1);
    expect(r.readiness.projectRules).toEqual([
      { rule: 'noImport', ok: 0, broken: 1 },
      { rule: 'noInput', ok: 1, broken: 0 },
      { rule: 'noPrint', ok: 1, broken: 0 },
      { rule: 'roundAtEnd', ok: 1, broken: 0 },
      { rule: 'noCsvExt', ok: 1, broken: 0 },
      { rule: 'mainSignature', ok: 1, broken: 0 },
      { rule: 'noLoops', ok: 1, broken: 0 },
    ]);
  });

  it('behaviour signals', () => {
    expect(r.behaviour).toEqual({ rushed: 1, stuckNoHint: 1, hintSkims: 2, revealedWithoutExplain: 1 });
  });

  it('headline strengths and next steps with links', () => {
    expect(r.headline.strengths).toEqual(['Variables, types and expressions: 100% across 6 questions.']);
    expect(r.headline.workOn).toEqual([
      { text: `Practise Decisions: score 25%, "${label('elif_vs_if')}" keeps coming up and topic test not passed yet.`, href: '#/topic/if-elif-else' },
      // Review, not one question: a session drawn from this evidence is the thing to go and do.
      { text: `Review "${label('elif_vs_if')}": it came up 3 times in the last 14 days.`, href: '#/review' },
      { text: 'Sit a mock final exam to see where you stand under exam conditions.', href: '#/exam' },
    ]);
  });
});

describe('buildReport ranges', () => {
  it('7d excludes older sessions', () => {
    const r = buildReport(events, index, '7d', unlocked, NOW);
    expect(r.totals.attempts).toBe(8);
    expect(r.totals.sessions).toBe(2);
    expect(r.topics.find((t) => t.topicId === 'variables-expressions')!.label).toBe('not-started');
    expect(r.headline.strengths).toEqual([]);
  });
  it('session uses the latest session with attempts', () => {
    const r = buildReport(events, index, 'session', unlocked, NOW);
    expect(r.totals.attempts).toBe(4);
    expect(r.totals.sessions).toBe(1);
    expect(r.sessions.map((s) => s.sessionId)).toEqual(['s3']);
    expect(r.mistakes.map((m) => m.id)).toEqual(['import_used', 'off_by_one_range']);
    expect(r.behaviour.hintSkims).toBe(1);
  });
  it('not enough data under 3 attempts, and an empty log works', () => {
    const few = buildReport([attempt({ ts: T0, qid: 't01-s1-q1' }), attempt({ ts: T0 + MIN, qid: 't01-s1-q2' })], index, 'all', unlocked, NOW);
    expect(few.hasEnoughData).toBe(false);
    const empty = buildReport([], index, 'session', unlocked, NOW);
    expect(empty.hasEnoughData).toBe(false);
    expect(empty.totals).toMatchObject({ questions: 0, attempts: 0, sessions: 0, accuracy: null, firstTryRate: null });
    expect(empty.headline.workOn).toEqual([{ text: 'Start Variables, types and expressions.', href: '#/topic/variables-expressions' }]);
  });
});

describe('buildReport headline fallbacks', () => {
  it('names a strong rung when no topic is strong yet, and flags read/write gaps', () => {
    const qids = ['t03-s1-q1', 't03-s2-q1', 't03-s2-q2', 't03-s3-q1', 't03-s3-q2'];
    const evs: AppEvent[] = [
      ...qids.map((qid, i) => attempt({ ts: T0 + i * MIN, qid, format: 'predict' })),
      attempt({ ts: T0 + 10 * MIN, qid: 't03-s4-q1', format: 'write', correct: false, score: 0.25, credit: 0.25 }),
      attempt({ ts: T0 + 11 * MIN, qid: 't03-s4-q2', format: 'write', correct: false, score: 0, credit: 0 }),
    ];
    const r = buildReport(evs, [], 'all', ['variables-expressions', 'if-elif-else', 'for-loops-range'], T0 + DAY);
    expect(r.topics.find((t) => t.topicId === 'for-loops-range')!.label).toBe('ok');
    expect(r.headline.strengths).toEqual(['You do well at reading and predicting code: 100% across 5 questions.']);
    expect(r.headline.workOn).toEqual([
      { text: 'For loops: you read code well (100%) but writing lands at 13%. Try a coding question there.', href: '#/topic/for-loops-range' },
    ]);
  });
});

describe('patternStatuses', () => {
  const card = (id: PatternCard['id'], topicId: TopicId, triggers: PatternCard['triggers'], idiomFlags: PatternCard['idiomFlags']): PatternCard => ({
    id, title: id, why: '', bad: '', good: '', reference: '', triggers, idiomFlags, topicId,
  });
  const cards = [
    card('for-each-loop', 'for-loops-range', ['off_by_one_range'], ['for_each']),
    card('guard-clause', 'if-elif-else', ['elif_vs_if'], ['early_return']),
    card('with-open-strip-split', 'files-csv', ['file_newline'], ['with_open']),
    card('recursion-checklist', 'recursion', ['missing_base_case'], ['recursion_present']),
  ];
  it('recommended, later, and unlocked cards without signal omitted', () => {
    expect(patternStatuses(events, cards, unlocked, NOW)).toEqual([
      { id: 'guard-clause', status: 'recommended', triggerCount: 3 },
      { id: 'with-open-strip-split', status: 'later', triggerCount: 0 },
      { id: 'recursion-checklist', status: 'later', triggerCount: 0 },
    ]);
  });
  it('using after 3 correct attempts with the idiom; old mistakes do not recommend', () => {
    const evs = [
      ...[1, 2, 3].map((i) => attempt({ ts: T0 + i * MIN, qid: `t03-s1-q${i}`, format: 'write', flags: ['for_each'] })),
      mistake('t02-s1-q1', 'elif_vs_if', T0, 's1'),
      mistake('t02-s1-q1', 'elif_vs_if', T0 + MIN, 's1'),
    ];
    expect(patternStatuses(evs, cards, unlocked, NOW)).toEqual([
      { id: 'for-each-loop', status: 'using', triggerCount: 0 },
      { id: 'with-open-strip-split', status: 'later', triggerCount: 0 },
      { id: 'recursion-checklist', status: 'later', triggerCount: 0 },
    ]);
  });
});

describe('sessionTimeline', () => {
  it('lists the attempts of one session in order', () => {
    const tl = sessionTimeline(events, 's2');
    expect(tl.map((x) => [x.qid, x.correct, x.hintTier])).toEqual([
      ['t02-s1-q1', false, 0], ['t02-s1-q2', false, 3], ['t02-s2-q1', false, 0], ['t02-s2-q1', true, 0],
    ]);
    expect(tl[0]).toMatchObject({ ts: D18 + MIN, format: 'mcq', revealed: false, timeMs: 5000 });
  });
});
