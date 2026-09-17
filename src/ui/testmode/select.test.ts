import { describe, expect, it } from 'vitest';
import type { Diff, Format, TopicId } from '../../content/ids.ts';
import { FORMAT_LADDER, OFFLINE_FORMATS } from '../../content/ids.ts';
import type { Candidate } from './select.ts';
import {
  estimatedMinutes, midsemEligible, seededRng, selectMidsem, selectTopicTest, topicTestPassMark, waterFill,
} from './select.ts';

let n = 0;
function c(topicId: TopicId, format: Format, diff: Diff = 'medium', paper = false, expectedSec = 180): Candidate {
  n++;
  return { id: `${topicId}-${format}-${diff}-${n}`, topicId, format, diff, paper, expectedSec };
}

/** A realistic topic: the for-loops format mix from CONTENT.md. */
function forLoopsTopic(): Candidate[] {
  const t: TopicId = 'for-loops-range';
  return [
    c(t, 'mcq', 'easy'), c(t, 'multi', 'medium'), c(t, 'predict', 'easy'), c(t, 'predict', 'medium'), c(t, 'predict', 'hard'),
    c(t, 'trace', 'medium'), c(t, 'trace', 'hard'), c(t, 'cloze', 'easy'), c(t, 'parsons', 'medium'), c(t, 'parsons', 'hard'),
    c(t, 'fixBug', 'medium'), c(t, 'write', 'medium'), c(t, 'write', 'hard', true),
  ];
}

describe('selectTopicTest', () => {
  it('picks 5 distinct questions in slot order read, read, repair, write, write', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picks = selectTopicTest(forLoopsTopic(), seededRng(seed));
      expect(picks).toHaveLength(5);
      expect(new Set(picks.map((p) => p.id)).size).toBe(5);
      expect(['predict', 'trace', 'mcq']).toContain(picks[0].format);
      expect(['mcq', 'multi', 'twins', 'errorTranslator']).toContain(picks[1].format);
      expect(['cloze', 'parsons', 'fixBug']).toContain(picks[2].format);
      expect(['write', 'fixBug', 'refactor']).toContain(picks[3].format);
      expect(['write', 'fixBug', 'refactor']).toContain(picks[4].format);
    }
  });

  it('never uses paper-mode write when another question fits', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picks = selectTopicTest(forLoopsTopic(), seededRng(seed));
      expect(picks.some((p) => p.paper)).toBe(false);
    }
  });

  it('prefers medium and hard over easy', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const picks = selectTopicTest(forLoopsTopic(), seededRng(seed));
      // slot 1 has medium/hard predict and trace, slot 3 has medium/hard parsons: easy never needed there.
      expect(picks[0].diff).not.toBe('easy');
      expect(picks[2].diff).not.toBe('easy');
      // slot 2 only has an easy mcq and a medium multi: the medium one wins.
      expect(picks[1].format).toBe('multi');
    }
  });

  it('shares fixBug sensibly: repair slot takes parsons/cloze, write slots take write then fixBug', () => {
    const t: TopicId = 'strings';
    const pool = [c(t, 'predict'), c(t, 'mcq'), c(t, 'parsons'), c(t, 'fixBug'), c(t, 'write')];
    const picks = selectTopicTest(pool, seededRng(3));
    expect(picks.map((p) => p.format)).toEqual(['predict', 'mcq', 'parsons', 'write', 'fixBug']);
  });

  it('gives a constrained slot its only option first', () => {
    const t: TopicId = 'strings';
    // Only one mcq-family question (an mcq); slot 1 could also take it but has a predict.
    const pool = [c(t, 'mcq', 'medium'), c(t, 'predict', 'easy'), c(t, 'cloze'), c(t, 'write'), c(t, 'write')];
    const picks = selectTopicTest(pool, seededRng(9));
    expect(picks[0].format).toBe('predict');
    expect(picks[1].format).toBe('mcq');
  });

  it('falls back to the same rung, then anything, then paper write', () => {
    const t: TopicId = 'recursion';
    const pool = [c(t, 'trace'), c(t, 'predict'), c(t, 'errorTranslator'), c(t, 'testWriter'), c(t, 'write', 'hard', true)];
    const picks = selectTopicTest(pool, seededRng(1));
    expect(picks).toHaveLength(5);
    expect(new Set(picks.map((p) => p.id)).size).toBe(5);
    // No cloze/parsons/fixBug and no non-paper write: testWriter (write rung) fills a write slot, paper write is the last resort.
    expect(picks.filter((p) => p.paper)).toHaveLength(1);
    expect(picks.map((p) => p.format)).toContain('testWriter');
  });

  it('returns fewer questions when the topic is small, and none for an empty topic', () => {
    const t: TopicId = 'exceptions';
    expect(selectTopicTest([c(t, 'mcq'), c(t, 'write')], seededRng(1))).toHaveLength(2);
    expect(selectTopicTest([], seededRng(1))).toEqual([]);
  });

  it('pass mark is 4 of 5, scaled down for smaller tests', () => {
    expect(topicTestPassMark(5)).toBe(4);
    expect(topicTestPassMark(4)).toBe(4);
    expect(topicTestPassMark(3)).toBe(3);
    expect(topicTestPassMark(1)).toBe(1);
  });
});

function bigPool(): Candidate[] {
  const topics: TopicId[] = ['variables-expressions', 'if-elif-else', 'for-loops-range', 'functions-basics', 'strings', 'lists-tuples', 'while-nested-loops', 'dictionaries'];
  const formats: Format[] = ['mcq', 'multi', 'predict', 'trace', 'twins', 'cloze', 'parsons', 'fixBug', 'write', 'write', 'refactor', 'predict'];
  const diffs: Diff[] = ['easy', 'medium', 'hard'];
  const pool: Candidate[] = [];
  for (const t of topics) formats.forEach((f, i) => pool.push(c(t, f, diffs[i % 3], f === 'write' && i === 9)));
  return pool;
}

describe('waterFill', () => {
  it('splits evenly and respects capacity', () => {
    expect(waterFill([10, 10, 10], 9)).toEqual([3, 3, 3]);
    expect(waterFill([10, 1, 10], 9)).toEqual([4, 1, 4]);
    expect(waterFill([2, 2], 10)).toEqual([2, 2]);
    expect(waterFill([5, 5, 5], 10).reduce((a, b) => a + b, 0)).toBe(10);
    expect(waterFill([], 5)).toEqual([]);
  });
});

describe('selectMidsem', () => {
  const eight: TopicId[] = ['variables-expressions', 'if-elif-else', 'for-loops-range', 'functions-basics', 'strings', 'lists-tuples', 'while-nested-loops', 'dictionaries'];

  it('returns the requested count of distinct questions from chosen topics only', () => {
    for (const count of [10, 15, 20, 30]) {
      const picks = selectMidsem(bigPool(), { topicIds: eight.slice(0, 7), count, includeCoding: true }, seededRng(count));
      expect(picks).toHaveLength(count);
      expect(new Set(picks.map((p) => p.id)).size).toBe(count);
      expect(picks.every((p) => eight.slice(0, 7).includes(p.topicId))).toBe(true);
    }
  });

  it('balances across topics (within one) and across read/repair/write (within one)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picks = selectMidsem(bigPool(), { topicIds: eight.slice(0, 5), count: 15, includeCoding: true }, seededRng(seed));
      const perTopic = eight.slice(0, 5).map((t) => picks.filter((p) => p.topicId === t).length);
      expect(Math.max(...perTopic) - Math.min(...perTopic)).toBeLessThanOrEqual(1);
      const perRung = (['read', 'repair', 'write'] as const).map((r) => picks.filter((p) => FORMAT_LADDER[p.format] === r).length);
      expect(Math.max(...perRung) - Math.min(...perRung)).toBeLessThanOrEqual(1);
    }
  });

  it('orders read, then repair, then write', () => {
    const picks = selectMidsem(bigPool(), { topicIds: eight, count: 20, includeCoding: true }, seededRng(4));
    const rungIdx = picks.map((p) => ['read', 'repair', 'write'].indexOf(FORMAT_LADDER[p.format]));
    expect(rungIdx).toEqual(rungIdx.slice().sort((a, b) => a - b));
  });

  it('prefers medium questions', () => {
    const picks = selectMidsem(bigPool(), { topicIds: eight, count: 16, includeCoding: true }, seededRng(11));
    const medium = picks.filter((p) => p.diff === 'medium').length;
    expect(medium).toBeGreaterThanOrEqual(picks.length / 2);
  });

  it('with coding off: read formats only, never paper write', () => {
    const picks = selectMidsem(bigPool(), { topicIds: eight, count: 30, includeCoding: false }, seededRng(2));
    expect(picks).toHaveLength(30);
    expect(picks.every((p) => OFFLINE_FORMATS.includes(p.format) && !p.paper)).toBe(true);
    expect(midsemEligible(bigPool(), { topicIds: eight, includeCoding: false }).some((p) => p.paper)).toBe(false);
  });

  it('with coding on: paper write is allowed', () => {
    expect(midsemEligible(bigPool(), { topicIds: eight, includeCoding: true }).some((p) => p.paper)).toBe(true);
  });

  it('caps at what exists and redistributes from thin topics', () => {
    const pool = [...bigPool(), c('recursion', 'mcq'), c('recursion', 'predict')];
    const picks = selectMidsem(pool, { topicIds: ['recursion', 'strings'], count: 10, includeCoding: true }, seededRng(5));
    expect(picks).toHaveLength(10);
    expect(picks.filter((p) => p.topicId === 'recursion')).toHaveLength(2);
    const small = selectMidsem([c('recursion', 'mcq')], { topicIds: ['recursion'], count: 10, includeCoding: true }, seededRng(5));
    expect(small).toHaveLength(1);
    expect(selectMidsem(bigPool(), { topicIds: [], count: 10, includeCoding: true })).toEqual([]);
  });

  it('keeps rung balance when a topic has no code questions', () => {
    const pool = [
      ...bigPool().filter((p) => p.topicId === 'strings'),
      c('variables-expressions', 'mcq'), c('variables-expressions', 'predict'), c('variables-expressions', 'trace'), c('variables-expressions', 'multi'),
    ];
    const picks = selectMidsem(pool, { topicIds: ['strings', 'variables-expressions'], count: 9, includeCoding: true }, seededRng(8));
    expect(picks).toHaveLength(9);
    const perRung = (['read', 'repair', 'write'] as const).map((r) => picks.filter((p) => FORMAT_LADDER[p.format] === r).length);
    expect(perRung).toEqual([3, 3, 3]);
  });
});

describe('estimatedMinutes', () => {
  it('rounds the sum of expected seconds up to minutes', () => {
    expect(estimatedMinutes([c('strings', 'mcq', 'easy', false, 90), c('strings', 'mcq', 'easy', false, 40)])).toBe(3);
    expect(estimatedMinutes([])).toBe(0);
  });
});
