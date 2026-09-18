import { describe, expect, it } from 'vitest';
import type { AppEvent, Settings } from './types.ts';
import { DEFAULT_SETTINGS } from './types.ts';
import { continueTarget, currentSessionSummary, questionStats, sessionSummaries, topicProgressAll } from './progress.ts';
import { MIN, T0, attempt, hint, meta, mistake, open, reveal, sessionStart, testResult } from './util/testUtil.ts';

const settings: Settings = { ...DEFAULT_SETTINGS };

const index = [
  meta('t01-s1-q1', 'mcq'), meta('t01-s1-q2', 'predict'), meta('t01-s1-q3', 'multi'), meta('t01-s2-q1', 'mcq'),
  meta('t01-s2-q2', 'trace'), meta('t01-s2-q3', 'cloze'), meta('t01-s3-q1', 'write'),
  meta('t02-s1-q1', 'mcq'), meta('t02-s1-q2', 'parsons'), meta('t02-s1-q3', 'write'),
  meta('t03-s1-q1', 'mcq'), meta('t03-s1-q2', 'write'),
];

/** Topic 1 minimum is 5 solved including 1 coding question. */
function topic1Solved(start: number, opts: { code?: boolean; count?: number } = {}): AppEvent[] {
  const read = ['t01-s1-q1', 't01-s1-q2', 't01-s1-q3', 't01-s2-q1', 't01-s2-q2'];
  const qids = read.slice(0, (opts.count ?? 5) - (opts.code === false ? 0 : 1));
  const evs = qids.map((qid, i) => attempt({ ts: start + i * MIN, qid, format: index.find((m) => m.qid === qid)!.format }));
  if (opts.code !== false) evs.push(attempt({ ts: start + 10 * MIN, qid: 't01-s2-q3', format: 'cloze' }));
  return evs;
}

describe('questionStats', () => {
  it('tracks attempts, best credit, last result and solved', () => {
    const s = questionStats([
      attempt({ ts: T0, qid: 't01-s1-q1', correct: false }),
      attempt({ ts: T0 + MIN, qid: 't01-s1-q1', correct: true, score: 1, credit: 0.75, hintTier: 2 }),
      attempt({ ts: T0 + 2 * MIN, qid: 't01-s1-q1', correct: false }),
    ]).get('t01-s1-q1')!;
    expect(s).toMatchObject({ attempts: 3, solved: true, revealed: false, bestCredit: 0.75, lastTs: T0 + 2 * MIN, lastCorrect: false });
  });

  it('a correct attempt after a reveal does not count as solved', () => {
    const stats = questionStats([
      attempt({ ts: T0, qid: 't01-s1-q1', correct: false }),
      reveal('t01-s1-q1', T0 + MIN),
      attempt({ ts: T0 + 2 * MIN, qid: 't01-s1-q1', correct: true, credit: 0 }),
      attempt({ ts: T0 + 3 * MIN, qid: 't01-s1-q2', correct: true, revealed: true }),
    ]);
    expect(stats.get('t01-s1-q1')).toMatchObject({ solved: false, revealed: true });
    expect(stats.get('t01-s1-q2')).toMatchObject({ solved: false, revealed: true, bestCredit: 0 });
  });

  it('revealing after solving keeps it solved, and events out of order are handled', () => {
    const stats = questionStats([
      reveal('t01-s1-q1', T0 + 5 * MIN),
      attempt({ ts: T0, qid: 't01-s1-q1', correct: true }),
    ]);
    expect(stats.get('t01-s1-q1')).toMatchObject({ solved: true, revealed: true });
  });
});

describe('topicProgressAll: unlock chain', () => {
  it('fresh start: topic 1 open, the rest locked with plain reasons', () => {
    const p = topicProgressAll([], index, settings);
    expect(Object.keys(p)).toHaveLength(13);
    expect(p['variables-expressions']).toMatchObject({ state: 'open', opened: false, total: 7, attempted: 0, score: null, minimumMet: false });
    expect(p['variables-expressions'].remaining).toBe('5 more to solve, including 1 coding question');
    expect(p['variables-expressions'].lockReason).toBeUndefined();
    expect(p['if-elif-else'].state).toBe('locked');
    expect(p['if-elif-else'].lockReason).toBe('Open Variables and solve 5 more questions there (1 must be a coding question).');
    expect(p['for-loops-range'].lockReason).toBe('Unlock Decisions first, then solve 5 questions there (2 must be coding questions).');
  });

  it('correct answers given in a mid-sem or topic test do not count toward the minimum', () => {
    const practice = topic1Solved(T0);
    const asTests = practice.map((e) => (e.type === 'attempt' ? { ...e, mode: 'exam' as const } : e));
    const p = topicProgressAll([open('variables-expressions', T0 - MIN), ...asTests], index, settings);
    expect(p['variables-expressions']).toMatchObject({ solved: 0, codeSolved: 0, minimumMet: false });
    expect(p['if-elif-else'].state).toBe('locked');
    expect(questionStats(asTests).get('t01-s1-q1')?.solved).toBe(false);
  });

  it('opened + minimum met unlocks the next topic and completes the topic', () => {
    const events = [open('variables-expressions', T0 - MIN), ...topic1Solved(T0)];
    const p = topicProgressAll(events, index, settings);
    expect(p['variables-expressions']).toMatchObject({ state: 'completed', solved: 5, codeSolved: 1, minimumMet: true, opened: true, attempted: 5, score: 1 });
    expect(p['variables-expressions'].remaining).toBeUndefined();
    expect(p['if-elif-else']).toMatchObject({ state: 'open' });
    expect(p['if-elif-else'].lockReason).toBeUndefined();
    expect(p['for-loops-range'].state).toBe('locked');
    expect(p['for-loops-range'].lockReason).toBe('Open Decisions and solve 5 more questions there (2 must be coding questions).');
  });

  it('minimum met without a topic_open event keeps the next topic locked', () => {
    const p = topicProgressAll(topic1Solved(T0), index, settings);
    expect(p['variables-expressions'].state).toBe('completed');
    expect(p['if-elif-else'].state).toBe('locked');
    expect(p['if-elif-else'].lockReason).toBe('Open Variables to unlock this topic.');
  });

  it('the coding minimum must be met too', () => {
    const events = [open('variables-expressions', T0 - MIN), ...topic1Solved(T0, { code: false, count: 5 })];
    const p = topicProgressAll(events, index, settings);
    expect(p['variables-expressions']).toMatchObject({ state: 'in-progress', solved: 5, codeSolved: 0, minimumMet: false });
    expect(p['variables-expressions'].remaining).toBe('1 more coding question to solve');
    expect(p['if-elif-else'].state).toBe('locked');
    expect(p['if-elif-else'].lockReason).toBe('Solve 1 more question in Variables (it must be a coding question).');
  });

  it('partial progress gives counts in the reason', () => {
    const events = [open('variables-expressions', T0 - MIN), attempt({ ts: T0, qid: 't01-s1-q1' }), attempt({ ts: T0 + MIN, qid: 't01-s1-q2', correct: false })];
    const p = topicProgressAll(events, index, settings);
    expect(p['variables-expressions']).toMatchObject({ state: 'in-progress', attempted: 2, solved: 1, score: 0.5 });
    expect(p['variables-expressions'].remaining).toBe('4 more to solve, including 1 coding question');
    expect(p['if-elif-else'].lockReason).toBe('Solve 4 more questions in Variables (1 must be a coding question).');
  });

  it('revealed answers do not count toward the minimum', () => {
    const events = [
      open('variables-expressions', T0 - MIN),
      ...topic1Solved(T0, { code: false, count: 4 }),
      reveal('t01-s2-q3', T0 + 20 * MIN),
      attempt({ ts: T0 + 21 * MIN, qid: 't01-s2-q3', format: 'cloze', credit: 0 }),
      attempt({ ts: T0 + 22 * MIN, qid: 't01-s3-q1', format: 'write', revealed: true }),
    ];
    const p = topicProgressAll(events, index, settings);
    expect(p['variables-expressions']).toMatchObject({ solved: 4, codeSolved: 0, minimumMet: false, state: 'in-progress' });
    expect(p['if-elif-else'].state).toBe('locked');
  });

  it('passing the topic test unlocks the next topic and marks it completed', () => {
    const events = [testResult('topic-test', ['variables-expressions'], 4, 5, true, T0)];
    const p = topicProgressAll(events, index, settings);
    expect(p['variables-expressions']).toMatchObject({ testedOut: true, minimumMet: true, state: 'completed' });
    expect(p['if-elif-else'].state).toBe('open');
    const failed = topicProgressAll([testResult('topic-test', ['variables-expressions'], 2, 5, false, T0)], index, settings);
    expect(failed['if-elif-else'].state).toBe('locked');
  });

  it('unlockAll opens every topic', () => {
    const p = topicProgressAll([], index, { ...settings, unlockAll: true });
    for (const t of Object.values(p)) {
      expect(t.state).toBe('open');
      expect(t.lockReason).toBeUndefined();
    }
  });

  it('topics with practice already done do not lock again when unlockAll is switched off', () => {
    const events = [attempt({ ts: T0, qid: 't03-s1-q1' })];
    const p = topicProgressAll(events, index, settings);
    expect(p['for-loops-range'].state).toBe('in-progress');
    expect(p['if-elif-else'].state).toBe('locked');
  });
});

describe('sessionSummaries', () => {
  it('groups by session with focused time, new mistakes and topics', () => {
    const events: AppEvent[] = [
      sessionStart(T0, 'a'),
      open('variables-expressions', T0 + 10_000, 'a'),
      hint('t01-s1-q1', 1, T0 + 60_000, 5000, 'a'),
      attempt({ ts: T0 + 2 * MIN, sessionId: 'a', qid: 't01-s1-q1', correct: false, timeMs: 110_000, mistakes: ['name_typo'] }),
      mistake('t01-s1-q1', 'name_typo', T0 + 2 * MIN, 'a'),
      attempt({ ts: T0 + 3 * MIN, sessionId: 'a', qid: 't01-s1-q1', correct: true, timeMs: 60_000 }),
      // 20 minutes idle, then a long attempt capped at 10 minutes
      attempt({ ts: T0 + 23 * MIN, sessionId: 'a', qid: 't01-s1-q2', correct: true, timeMs: 15 * MIN }),
      sessionStart(T0 + 120 * MIN, 'b'),
      attempt({ ts: T0 + 121 * MIN, sessionId: 'b', qid: 't02-s1-q1', correct: false, mistakes: ['name_typo', 'elif_vs_if'] }),
    ];
    const all = sessionSummaries(events);
    expect(all.map((s) => s.sessionId)).toEqual(['a', 'b']);
    const a = all[0];
    expect(a).toMatchObject({ start: T0, end: T0 + 23 * MIN, questions: 2, correct: 2, newMistakes: ['name_typo'], topics: ['variables-expressions'] });
    // union of [T0, T0+3min] (gaps + attempts) and [T0+13min, T0+23min] (capped attempt) = 13 min
    expect(a.focusedMin).toBe(13);
    const b = all[1];
    expect(b).toMatchObject({ questions: 1, correct: 0, newMistakes: ['elif_vs_if'], topics: ['if-elif-else'] });
    expect(currentSessionSummary(events, 'b')?.questions).toBe(1);
    expect(currentSessionSummary(events, 'zzz')).toBeNull();
  });
});

describe('continueTarget', () => {
  it('a new student starts at the first question of topic 1', () => {
    expect(continueTarget([], index, settings)).toEqual({ qid: 't01-s1-q1', topicId: 'variables-expressions' });
  });
  it('resumes the last attempted unsolved question', () => {
    const events = [
      open('variables-expressions', T0),
      attempt({ ts: T0 + MIN, qid: 't01-s1-q2', correct: false }),
      attempt({ ts: T0 + 2 * MIN, qid: 't01-s1-q1', correct: true }),
    ];
    expect(continueTarget(events, index, settings)).toEqual({ qid: 't01-s1-q2', topicId: 'variables-expressions' });
  });
  it('otherwise the first unsolved question in the furthest in-progress topic', () => {
    const events = [
      open('variables-expressions', T0),
      ...topic1Solved(T0),
      open('if-elif-else', T0 + 30 * MIN),
      attempt({ ts: T0 + 31 * MIN, qid: 't02-s1-q1', correct: true }),
    ];
    expect(continueTarget(events, index, settings)).toEqual({ qid: 't02-s1-q2', topicId: 'if-elif-else' });
  });
  it('moves to the next open topic after a completed one', () => {
    const events = [open('variables-expressions', T0), ...topic1Solved(T0)];
    expect(continueTarget(events, index, settings)).toEqual({ qid: 't02-s1-q1', topicId: 'if-elif-else' });
  });
  it('skips revealed questions', () => {
    const events = [attempt({ ts: T0, qid: 't01-s1-q1', correct: false }), reveal('t01-s1-q1', T0 + MIN)];
    expect(continueTarget(events, index, settings)).toEqual({ qid: 't01-s1-q2', topicId: 'variables-expressions' });
  });
  it('returns null when there is no content', () => {
    expect(continueTarget([], [], settings)).toBeNull();
  });
});
