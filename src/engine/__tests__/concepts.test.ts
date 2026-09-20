import { describe, expect, it } from 'vitest';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import type { AppEvent } from '../types.ts';
import { conceptStats, weakConcepts } from '../concepts.ts';

let n = 0;
const attempt = (qid: string, correct: boolean, revealed = false, ts = 1000 + n): AppEvent =>
  ({
    eid: `e${n++}`, v: 1, ts, sessionId: 's', type: 'attempt', qid, topicId: 'strings',
    format: 'write', diff: 'easy', mode: 'practice', checkNo: 1, correct, score: correct ? 1 : 0,
    credit: 1, hintTier: 0, revealed, timeMs: 100, mistakes: [],
  } as unknown as AppEvent);

const q = (qid: string, concepts: string[], topicId = 'strings'): QuestionMeta =>
  ({
    qid, topicId, scenarioId: 's1', scenarioTitle: 'S', format: 'write', diff: 'easy', core: true,
    title: qid, concepts, detects: [], expectedSec: 60,
  } as unknown as QuestionMeta);

const INDEX = [
  q('q1', ['slicing']), q('q2', ['slicing']), q('q3', ['slicing']),
  q('q4', ['range', 'accumulator']), q('q5', ['range']),
  q('q6', ['aliasing'], 'lists-tuples'),
];

describe('conceptStats', () => {
  it('is empty when nothing has been attempted', () => {
    expect(conceptStats([], INDEX)).toEqual([]);
  });

  it('counts distinct questions, not attempts', () => {
    const s = conceptStats([attempt('q1', false), attempt('q1', false), attempt('q1', true)], INDEX);
    expect(s[0]).toMatchObject({ concept: 'slicing', attempted: 1, solved: 1 });
  });

  it('does not count a question solved only after the answer was revealed', () => {
    const s = conceptStats([attempt('q1', true, true)], INDEX);
    expect(s[0]).toMatchObject({ attempted: 1, solved: 0 });
  });

  it('credits every concept a question carries', () => {
    const s = conceptStats([attempt('q4', true)], INDEX);
    expect(s.map((x) => x.concept).sort()).toEqual(['accumulator', 'range']);
  });

  it('knows how many questions exist for a concept, not just the attempted ones', () => {
    const s = conceptStats([attempt('q1', true)], INDEX);
    expect(s[0].total).toBe(3);
  });

  it('withholds an accuracy until there is enough evidence', () => {
    const one = conceptStats([attempt('q1', false)], INDEX);
    expect(one[0].accuracy).toBeNull();
    const two = conceptStats([attempt('q1', false), attempt('q2', true)], INDEX);
    expect(two[0].accuracy).toBe(0.5);
  });

  it('puts the weakest concept first, and the not-yet-known ones last', () => {
    const events = [
      attempt('q1', false), attempt('q2', false),   // slicing 0/2
      attempt('q4', true), attempt('q5', true),     // range 2/2
      attempt('q6', false),                          // aliasing, only one: unknown
    ];
    const s = conceptStats(events, INDEX);
    expect(s[0].concept).toBe('slicing');
    expect(s[s.length - 1].accuracy).toBeNull();
  });

  it('ignores questions from topics that are locked', () => {
    const s = conceptStats([attempt('q6', false)], INDEX, { unlocked: ['strings'] });
    expect(s.find((x) => x.concept === 'aliasing')).toBeUndefined();
  });
});

describe('weakConcepts', () => {
  it('offers only what is both known and not yet solid', () => {
    const events = [attempt('q1', false), attempt('q2', false), attempt('q4', true), attempt('q5', true)];
    const weak = weakConcepts(conceptStats(events, INDEX));
    expect(weak.map((w) => w.concept)).toEqual(['slicing']);
  });

  it('says nothing when everything attempted is solid', () => {
    expect(weakConcepts(conceptStats([attempt('q4', true), attempt('q5', true)], INDEX))).toEqual([]);
  });
});
