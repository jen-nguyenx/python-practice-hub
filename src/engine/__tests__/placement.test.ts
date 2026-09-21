import { describe, expect, it } from 'vitest';
import { OFFLINE_FORMATS } from '../../content/ids.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS } from '../../content/topics.ts';
import { isFinished, nextStep, placementLadder, placementOutcome, STOP_AFTER_WRONG } from '../placement.ts';

const ladder = placementLadder(QUESTION_INDEX);

describe('placementLadder', () => {
  it('asks one question per topic, in ladder order', () => {
    expect(ladder).toHaveLength(TOPICS.length);
    expect(ladder.map((s) => s.topicId)).toEqual(TOPICS.map((t) => t.id));
    expect(ladder.map((s) => s.order)).toEqual(TOPICS.map((_, i) => i + 1));
  });

  it('only picks formats that grade without Python', () => {
    const byId = new Map(QUESTION_INDEX.map((q) => [q.qid, q]));
    for (const s of ladder) {
      expect(OFFLINE_FORMATS, s.qid).toContain(byId.get(s.qid)?.format);
    }
  });

  it('is deterministic: the same index gives the same questions', () => {
    expect(placementLadder(QUESTION_INDEX)).toEqual(ladder);
  });
});

describe('stopping', () => {
  it('keeps going while answers are right', () => {
    const results = [true, true, true];
    expect(isFinished(ladder, results)).toBe(false);
    expect(nextStep(ladder, results)?.order).toBe(4);
  });

  it('stops after two wrong in a row', () => {
    expect(isFinished(ladder, [true, false, false])).toBe(true);
    expect(nextStep(ladder, [true, false, false])).toBeNull();
  });

  it('does not stop for a single slip', () => {
    expect(isFinished(ladder, [true, false, true])).toBe(false);
    expect(STOP_AFTER_WRONG).toBe(2);
  });

  it('stops when the ladder runs out', () => {
    const all = ladder.map(() => true);
    expect(isFinished(ladder, all)).toBe(true);
    expect(nextStep(ladder, all)).toBeNull();
  });
});

describe('placementOutcome', () => {
  it('opens through the highest topic answered correctly', () => {
    const o = placementOutcome(ladder, [true, true, true, false, false]);
    expect(o.throughOrder).toBe(3);
    expect(o.throughTopicId).toBe(TOPICS[2].id);
    expect(o.correct).toBe(3);
    expect(o.asked).toHaveLength(5);
    expect(o.summary).toContain(TOPICS[2].short);
  });

  it('opens nothing when the first answers go wrong', () => {
    const o = placementOutcome(ladder, [false, false]);
    expect(o.throughOrder).toBe(0);
    expect(o.throughTopicId).toBeNull();
    expect(o.summary).toMatch(/beginning/);
  });

  it('counts a later success even after an earlier miss', () => {
    // A slip at topic 2 should not cap someone who then answers topic 3.
    const o = placementOutcome(ladder, [true, false, true]);
    expect(o.throughOrder).toBe(3);
  });

  it('says so when every topic is open', () => {
    const o = placementOutcome(ladder, ladder.map(() => true));
    expect(o.throughOrder).toBe(TOPICS.length);
    expect(o.summary).toMatch(/Every topic/);
  });
});
