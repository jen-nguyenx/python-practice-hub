import { describe, expect, it } from 'vitest';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { badges, nextBadge } from '../achievements.ts';
import type { TopicProgress } from '../progress.ts';
import type { AppEvent } from '../types.ts';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

let n = 0;
function attempt(qid: string, over: Partial<AppEvent> = {}): AppEvent {
  n++;
  return {
    eid: `e${n}`, v: 1, ts: NOW - DAY, sessionId: 's', type: 'attempt', qid,
    topicId: 'variables-expressions', format: 'mcq', diff: 'easy', mode: 'practice',
    checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false,
    timeMs: 1000, mistakes: [], ...over,
  } as AppEvent;
}

const hint = (qid: string): AppEvent =>
  ({ eid: `h${++n}`, v: 1, ts: NOW - DAY, sessionId: 's', type: 'hint', qid, topicId: 'variables-expressions', tier: 1, dwellMs: 900 }) as AppEvent;
const reveal = (qid: string): AppEvent =>
  ({ eid: `r${++n}`, v: 1, ts: NOW - DAY, sessionId: 's', type: 'reveal', qid, topicId: 'variables-expressions' }) as AppEvent;

function progress(finished: number, total = 13): Record<string, TopicProgress> {
  const out: Record<string, TopicProgress> = {};
  for (let i = 0; i < total; i++) {
    out[`t${i}`] = { minimumMet: i < finished } as TopicProgress;
  }
  return out;
}

const index: QuestionMeta[] = [
  { qid: 'p1', kind: 'project' } as QuestionMeta,
  { qid: 'q1' } as QuestionMeta,
];

const of = (events: AppEvent[], finished = 0) =>
  badges({ events, index, progress: progress(finished), now: NOW });
const find = (list: ReturnType<typeof badges>, id: string) => list.find((b) => b.id === id)!;

describe('badges', () => {
  it('starts with nothing earned', () => {
    expect(of([]).every((b) => !b.earned)).toBe(true);
  });

  it('earns the first one on the first clean solve', () => {
    const b = of([attempt('q1')]);
    expect(find(b, 'first-steps').earned).toBe(true);
    expect(find(b, 'ten-down').earned).toBe(false);
    expect(find(b, 'ten-down').have).toBe(1);
  });

  it('counts a question once, however many times it was answered', () => {
    expect(find(of([attempt('q1'), attempt('q1'), attempt('q1')]), 'ten-down').have).toBe(1);
  });

  it('does not count a question whose answer was shown', () => {
    expect(find(of([reveal('q1'), attempt('q1')]), 'first-steps').earned).toBe(false);
  });

  it('only counts unaided solves where no hint was taken', () => {
    const events = [attempt('q1'), hint('q2'), attempt('q2')];
    expect(find(of(events), 'unaided').have).toBe(1);
  });

  it('tracks the ladder as topics are finished', () => {
    expect(find(of([], 1), 'first-topic').earned).toBe(true);
    expect(find(of([], 7), 'half-way').earned).toBe(true);
    expect(find(of([], 12), 'whole-ladder').earned).toBe(false);
    expect(find(of([], 13), 'whole-ladder').earned).toBe(true);
  });

  it('separates sitting a paper from passing one', () => {
    const sat = { eid: 'x', v: 1, ts: NOW, sessionId: 's', type: 'test_result', kind: 'mock-exam',
      topicIds: [], score: 30, total: 100, passed: false, durationMs: 1, qids: [] } as unknown as AppEvent;
    const b = of([sat]);
    expect(find(b, 'sat-a-paper').earned).toBe(true);
    expect(find(b, 'passed-a-paper').earned).toBe(false);
  });

  it('marks a project as built only for a project question', () => {
    expect(find(of([attempt('q1')]), 'project-done').earned).toBe(false);
    expect(find(of([attempt('p1')]), 'project-done').earned).toBe(true);
  });

  it('never reports more progress than the badge needs', () => {
    const many = Array.from({ length: 30 }, (_, i) => attempt(`q${i}`));
    expect(find(of(many), 'ten-down').have).toBe(10);
  });
});

describe('nextBadge', () => {
  it('offers the one closest to being earned', () => {
    const b = of(Array.from({ length: 9 }, (_, i) => attempt(`q${i}`)));
    expect(nextBadge(b)?.id).toBe('ten-down');
  });

  it('offers nothing once everything is earned', () => {
    expect(nextBadge(of([]).map((x) => ({ ...x, earned: true })))).toBeNull();
  });
});
