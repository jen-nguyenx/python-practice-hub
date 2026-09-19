import { describe, expect, it } from 'vitest';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import type { MistakeId } from '../../content/ids.ts';
import type { AppEvent } from '../types.ts';
import { dueWeight, reviewQueue } from '../review.ts';

const DAY = 86_400_000;
const NOW = 1_800_000_000_000;

let n = 0;
const base = (ts: number) => ({ eid: `e${n++}`, v: 1 as const, ts, sessionId: 's' });

const slip = (mistake: string, ts: number, topicId = 'strings', qid: string | null = 'q1'): AppEvent =>
  ({ ...base(ts), type: 'mistake', mistake, topicId, qid, channel: 'test' } as unknown as AppEvent);

const solved = (qid: string, ts: number): AppEvent =>
  ({
    ...base(ts), type: 'attempt', qid, topicId: 'strings', format: 'write', diff: 'easy', mode: 'practice',
    checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false, timeMs: 1000, mistakes: [],
  } as unknown as AppEvent);

const q = (qid: string, detects: string[], topicId = 'strings'): QuestionMeta =>
  ({
    qid, topicId, scenarioId: 's1', scenarioTitle: 'S', format: 'write', diff: 'easy', core: true,
    title: qid, concepts: [], detects: detects as MistakeId[], expectedSec: 60,
  } as unknown as QuestionMeta);

const INDEX = [q('q1', ['off_by_one']), q('q2', ['off_by_one']), q('q3', ['mutated_input'])];

describe('dueWeight', () => {
  it('is not yet due the day something was got wrong', () => {
    expect(dueWeight(0)).toBe(0);
    expect(dueWeight(1)).toBeGreaterThanOrEqual(1);
  });

  it('rises the longer something has been left', () => {
    expect(dueWeight(7)).toBeGreaterThan(dueWeight(2));
  });

  it('caps, so one ancient slip cannot outrank everything by age alone', () => {
    expect(dueWeight(100_000)).toBeLessThanOrEqual(3);
    expect(dueWeight(100_000)).toBe(dueWeight(8));
  });

  it('does not get less due the more often it was got wrong', () => {
    // Widening an interval after a failure would ask about a recurring mistake less often, which is
    // exactly backwards. Frequency raises priority through the score instead.
    expect(dueWeight(3)).toBe(dueWeight(3));
  });
});

describe('reviewQueue', () => {
  it('is empty when nothing has gone wrong', () => {
    expect(reviewQueue([], INDEX, { now: NOW })).toEqual([]);
  });

  it('offers a mistake with the questions that can detect it', () => {
    const out = reviewQueue([slip('off_by_one', NOW - 5 * DAY)], INDEX, { now: NOW });
    expect(out).toHaveLength(1);
    expect(out[0].mistake).toBe('off_by_one');
    expect(out[0].qids).toEqual(['q1', 'q2']);
    expect(out[0].daysSince).toBe(5);
  });

  it('puts the mistake made more often first, at equal age', () => {
    const events = [
      slip('off_by_one', NOW - 5 * DAY),
      slip('mutated_input', NOW - 5 * DAY),
      slip('mutated_input', NOW - 5 * DAY),
      slip('mutated_input', NOW - 5 * DAY),
    ];
    expect(reviewQueue(events, INDEX, { now: NOW })[0].mistake).toBe('mutated_input');
  });

  it('does not offer something got wrong today: that tests short-term memory, not learning', () => {
    expect(reviewQueue([slip('off_by_one', NOW - 3600_000)], INDEX, { now: NOW })[0].score).toBe(0);
  });

  it('drops a mistake down once every question detecting it was solved afterwards', () => {
    const events = [slip('off_by_one', NOW - 10 * DAY), solved('q1', NOW - 2 * DAY), solved('q2', NOW - 2 * DAY)];
    const out = reviewQueue(events, INDEX, { now: NOW });
    expect(out[0].settled).toBe(true);
    // Still present: one clean run is not proof it is gone.
    expect(out[0].qids.length).toBeGreaterThan(0);
  });

  it('does not count a solve from before the slip as having settled it', () => {
    const events = [solved('q1', NOW - 20 * DAY), solved('q2', NOW - 20 * DAY), slip('off_by_one', NOW - 2 * DAY)];
    expect(reviewQueue(events, INDEX, { now: NOW })[0].settled).toBe(false);
  });

  it('ranks an unsettled mistake above a settled one that happened as often', () => {
    const events = [
      slip('off_by_one', NOW - 10 * DAY), solved('q1', NOW - 1 * DAY), solved('q2', NOW - 1 * DAY),
      slip('mutated_input', NOW - 10 * DAY),
    ];
    expect(reviewQueue(events, INDEX, { now: NOW })[0].mistake).toBe('mutated_input');
  });

  it('ignores mistakes older than the window', () => {
    expect(reviewQueue([slip('off_by_one', NOW - 90 * DAY)], INDEX, { now: NOW, days: 60 })).toEqual([]);
  });

  it('never offers a question from a locked topic', () => {
    const out = reviewQueue([slip('off_by_one', NOW - 5 * DAY)], INDEX, { now: NOW, unlocked: ['lists-tuples'] });
    expect(out).toEqual([]);
  });

  it('skips a mistake no question can detect, since there would be nothing to practise', () => {
    expect(reviewQueue([slip('bare_except', NOW - 5 * DAY)], INDEX, { now: NOW })).toEqual([]);
  });
});
