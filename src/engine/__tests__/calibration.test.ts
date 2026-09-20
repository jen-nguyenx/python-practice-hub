import { describe, expect, it } from 'vitest';
import { calibration, ENOUGH_SAID } from '../calibration.ts';
import type { AppEvent, Confidence } from '../types.ts';

let n = 0;
function attempt(qid: string, said: Confidence | undefined, correct: boolean, extra: Partial<AppEvent> = {}): AppEvent {
  n++;
  return {
    eid: `e${n}`, v: 1, ts: 1000 + n, sessionId: 's', type: 'attempt',
    qid, topicId: '01-variables-types', format: 'predict-output', diff: 'easy', mode: 'practice',
    checkNo: 1, correct, score: correct ? 1 : 0, credit: correct ? 1 : 0, hintTier: 0, revealed: false,
    timeMs: 1000, mistakes: [], ...(said ? { confidence: said } : {}), ...extra,
  } as AppEvent;
}

const many = (said: Confidence, right: number, total: number, tag: string) =>
  Array.from({ length: total }, (_, i) => attempt(`${tag}${i}`, said, i < right));

describe('calibration', () => {
  it('says nothing until there is enough to say', () => {
    const c = calibration(many('sure', 2, ENOUGH_SAID - 1, 'a'));
    expect(c.sure.count).toBe(ENOUGH_SAID - 1);
    expect(c.sure.rate).toBeNull();
    expect(c.verdict).toBeNull();
  });

  it('calls being sure and being wrong overconfident', () => {
    const c = calibration(many('sure', 4, 10, 'b'));
    expect(c.sure.rate).toBe(0.4);
    expect(c.verdict).toBe('overconfident');
  });

  it('calls doubting yourself and being right underconfident', () => {
    const c = calibration(many('unsure', 9, 10, 'c'));
    expect(c.verdict).toBe('underconfident');
  });

  it('calls it matched when sure went well and unsure did not', () => {
    const c = calibration([...many('sure', 9, 10, 'd'), ...many('unsure', 2, 10, 'e')]);
    expect(c.verdict).toBe('matched');
  });

  it('counts a question once, using what was said the first time', () => {
    const c = calibration([attempt('q1', 'sure', false), attempt('q1', 'unsure', true)]);
    expect(c.answered).toBe(1);
    expect(c.sure.count).toBe(1);
    expect(c.sure.right).toBe(0);
  });

  it('ignores an attempt made with the answer already showing', () => {
    // The prediction means nothing once the answer is on the screen.
    const c = calibration([attempt('q1', 'sure', true, { revealed: true })]);
    expect(c.answered).toBe(0);
  });

  it('ignores attempts where nothing was said', () => {
    expect(calibration([attempt('q1', undefined, true)]).answered).toBe(0);
  });
});
