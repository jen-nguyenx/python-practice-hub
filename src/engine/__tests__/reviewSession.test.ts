import { describe, expect, it } from 'vitest';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { planSession, SESSION_FORMATS, sessionSummary, STALE_DAYS } from '../reviewSession.ts';
import type { AppEvent } from '../types.ts';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

let n = 0;
function q(over: Partial<QuestionMeta> = {}): QuestionMeta {
  n++;
  return {
    qid: `q${n}`, topicId: 'variables-expressions', scenarioId: 's1', scenarioTitle: 'A scenario',
    format: 'mcq', diff: 'easy', core: true, title: `Question ${n}`,
    concepts: [], detects: [], expectedSec: 90, ...over,
  } as QuestionMeta;
}

let e = 0;
function attempt(qid: string, over: Partial<AppEvent> = {}): AppEvent {
  e++;
  return {
    eid: `e${e}`, v: 1, ts: NOW - 30 * DAY, sessionId: 's', type: 'attempt',
    qid, topicId: 'variables-expressions', format: 'mcq', diff: 'easy', mode: 'practice',
    checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false,
    timeMs: 1000, mistakes: [], ...over,
  } as AppEvent;
}

function mistake(qid: string, id: string, ts: number): AppEvent {
  e++;
  return {
    eid: `m${e}`, v: 1, ts, sessionId: 's', type: 'mistake',
    qid, topicId: 'variables-expressions', mistake: id, channel: 'runtime',
  } as AppEvent;
}

describe('planSession', () => {
  it('offers nothing when there is no history at all', () => {
    expect(planSession([], [q(), q()], { now: NOW })).toEqual([]);
  });

  it('only deals formats that grade without Python', () => {
    const slow = q({ format: 'write' });
    const fast = q({ format: 'predict' });
    const events = [
      attempt(slow.qid, { ts: NOW - 40 * DAY }),
      attempt(fast.qid, { ts: NOW - 40 * DAY }),
    ];
    const picks = planSession(events, [slow, fast], { now: NOW });
    expect(picks.map((p) => p.qid)).toEqual([fast.qid]);
    for (const p of picks) expect(SESSION_FORMATS).toContain(p.format);
  });

  it('leads with a question that catches a mistake that is due', () => {
    const weak = q({ detects: ['off_by_one'] as never });
    const stale = q();
    const events = [
      attempt(stale.qid, { ts: NOW - (STALE_DAYS + 5) * DAY }),
      mistake(weak.qid, 'off_by_one', NOW - 4 * DAY),
      attempt(weak.qid, { ts: NOW - 4 * DAY, correct: false, score: 0, credit: 0 }),
    ];
    const picks = planSession(events, [weak, stale], { now: NOW });
    expect(picks[0].qid).toBe(weak.qid);
    expect(picks[0].reason).toBe('mistake');
    expect(picks[0].because).toMatch(/4 days ago/);
  });

  it('falls back to a skill that keeps going wrong', () => {
    const bad = [q({ concepts: ['slicing'] }), q({ concepts: ['slicing'] }), q({ concepts: ['slicing'] })];
    const events = bad.map((x, i) => attempt(x.qid, { ts: NOW - (20 + i) * DAY, correct: false, score: 0, credit: 0 }));
    const picks = planSession(events, bad, { now: NOW });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks[0].reason).toBe('skill');
  });

  it('asks again about something solved long enough ago', () => {
    const old = q();
    const picks = planSession([attempt(old.qid, { ts: NOW - (STALE_DAYS + 1) * DAY })], [old], { now: NOW });
    expect(picks.map((p) => p.reason)).toEqual(['again']);
    expect(picks[0].because).toMatch(/Worth proving it stuck/);
  });

  it('leaves something solved recently alone', () => {
    const fresh = q();
    expect(planSession([attempt(fresh.qid, { ts: NOW - 2 * DAY })], [fresh], { now: NOW })).toEqual([]);
  });

  it('never re-asks something answered today', () => {
    // Answering again minutes later tests what is still on the screen.
    const today = q({ detects: ['off_by_one'] as never });
    const events = [mistake(today.qid, 'off_by_one', NOW - 3 * DAY), attempt(today.qid, { ts: NOW - 60_000 })];
    expect(planSession(events, [today], { now: NOW })).toEqual([]);
  });

  it('stays inside the topics that are open', () => {
    const locked = q({ topicId: 'files-csv' });
    const events = [attempt(locked.qid, { ts: NOW - 40 * DAY, topicId: 'files-csv' })];
    const picks = planSession(events, [locked], { now: NOW, unlocked: ['variables-expressions'] });
    expect(picks).toEqual([]);
  });

  it('spreads a session across topics rather than drilling one', () => {
    const many = Array.from({ length: 8 }, () => q({ topicId: 'variables-expressions' }));
    const other = Array.from({ length: 3 }, () => q({ topicId: 'if-elif-else' }));
    const all = [...many, ...other];
    const events = all.map((x, i) => attempt(x.qid, { ts: NOW - (STALE_DAYS + i + 1) * DAY, topicId: x.topicId }));
    const picks = planSession(events, all, { now: NOW, size: 6, perTopic: 3 });
    const fromFirst = picks.filter((p) => p.topicId === 'variables-expressions').length;
    expect(fromFirst).toBeLessThanOrEqual(3);
  });

  it('deals no more than it was asked for, and never the same question twice', () => {
    const all = Array.from({ length: 12 }, (_, i) => q({ topicId: i % 2 ? 'variables-expressions' : 'if-elif-else' }));
    const events = all.map((x, i) => attempt(x.qid, { ts: NOW - (STALE_DAYS + i + 1) * DAY, topicId: x.topicId }));
    const picks = planSession(events, all, { now: NOW, size: 4 });
    expect(picks).toHaveLength(4);
    expect(new Set(picks.map((p) => p.qid)).size).toBe(4);
  });
});

describe('sessionSummary', () => {
  it('says how it went without dressing it up', () => {
    expect(sessionSummary([])).toMatch(/Nothing answered/);
    expect(sessionSummary([{ qid: 'a', correct: true, reason: 'again' }])).toBe('Right first time.');
    expect(sessionSummary([
      { qid: 'a', correct: true, reason: 'again' },
      { qid: 'b', correct: true, reason: 'again' },
    ])).toBe('All 2 right.');
    expect(sessionSummary([
      { qid: 'a', correct: true, reason: 'again' },
      { qid: 'b', correct: false, reason: 'skill' },
    ])).toBe('1 of 2 right.');
    expect(sessionSummary([{ qid: 'a', correct: false, reason: 'skill' }])).toMatch(/hard ones/);
  });
});
