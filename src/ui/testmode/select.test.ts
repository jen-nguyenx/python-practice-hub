import { describe, expect, it } from 'vitest';
import type { Diff, ExamSlot, Format, TopicId } from '../../content/ids.ts';
import { EXAM_SLOT_IDS, EXAM_SLOT_MARKS, FORMAT_LADDER, OFFLINE_FORMATS } from '../../content/ids.ts';
import type { Candidate } from './select.ts';
import type { GeneratedQuestion, Question } from '../../content/schema.ts';
import {
  buildMockExam, estimatedMinutes, isGradable, marksByQid, MOCK_EXAM_TOTAL_MARKS, practiceEligible,
  recentlyUsedQids, seededRng, selectPracticeTest, selectTopicTest, topicTestPassMark, waterFill,
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

  it('a retake avoids the questions of the last attempt when others fit', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const pool = forLoopsTopic();
      const first = selectTopicTest(pool, seededRng(seed));
      const avoid = new Set(first.map((p) => p.id));
      const again = selectTopicTest(pool, seededRng(seed), undefined, avoid);
      expect(again).toHaveLength(5);
      // The reading and repair slots have enough other questions, so none of them repeat.
      expect(again.slice(0, 3).some((p) => avoid.has(p.id))).toBe(false);
      // Only one non-paper write and one fixBug exist, so the two coding slots may have to repeat them.
      expect(again.filter((p) => avoid.has(p.id)).length).toBeLessThanOrEqual(2);
      expect(['write', 'fixBug', 'refactor']).toContain(again[3].format);
      expect(again.some((p) => p.paper)).toBe(false);
    }
  });

  it('a retake repeats a question rather than breaking the read/repair/write mix', () => {
    const t: TopicId = 'strings';
    const pool = [c(t, 'predict'), c(t, 'mcq'), c(t, 'parsons'), c(t, 'fixBug'), c(t, 'write'), c(t, 'predict'), c(t, 'multi')];
    const first = selectTopicTest(pool, seededRng(2));
    const again = selectTopicTest(pool, seededRng(2), undefined, new Set(first.map((p) => p.id)));
    // Same slot shape as the first attempt: two reading slots, a fix-or-complete slot, two coding slots.
    expect(again).toHaveLength(5);
    expect(again.slice(0, 2).every((p) => FORMAT_LADDER[p.format] === 'read')).toBe(true);
    expect(['cloze', 'parsons', 'fixBug']).toContain(again[2].format);
    expect(['write', 'fixBug', 'refactor']).toContain(again[3].format);
    expect(['write', 'fixBug', 'refactor']).toContain(again[4].format);
    // Both read slots get the two unused read questions; the thin coding end has to repeat one.
    expect(again.slice(0, 2).every((p) => !first.some((f) => f.id === p.id))).toBe(true);
    expect(again.some((p) => first.some((f) => f.id === p.id))).toBe(true);
  });

  it('six retakes in a row are not two papers taking turns', () => {
    // A realistic topic: 18 questions across the formats, like the shipped content.
    const topic = (): Candidate[] => {
      const t: TopicId = 'variables-expressions';
      const diffs: Diff[] = ['medium', 'hard', 'easy'];
      const formats: Format[] = ['mcq', 'multi', 'predict', 'predict', 'trace', 'twins', 'cloze', 'cloze', 'parsons',
        'parsons', 'fixBug', 'fixBug', 'write', 'write', 'refactor', 'errorTranslator', 'predict', 'write'];
      return formats.map((f, i) => c(t, f, diffs[i % 3]));
    };
    const pool = topic();
    const papers: string[][] = [];
    for (let attempt = 0; attempt < 6; attempt++) {
      const avoid = recentlyUsedQids(papers.slice().reverse(), pool.length);
      papers.push(selectTopicTest(pool, seededRng(attempt * 7 + 1), undefined, avoid).map((p) => p.id));
    }
    const distinct = new Set(papers.map((p) => p.slice().sort().join(',')));
    expect(distinct.size).toBeGreaterThan(2);
    // The paper right after one is never the same paper again.
    for (let i = 1; i < papers.length; i++) {
      expect(papers[i].filter((q) => papers[i - 1].includes(q)).length).toBeLessThan(5);
    }
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

describe('selectPracticeTest', () => {
  const eight: TopicId[] = ['variables-expressions', 'if-elif-else', 'for-loops-range', 'functions-basics', 'strings', 'lists-tuples', 'while-nested-loops', 'dictionaries'];

  it('returns the requested count of distinct questions from chosen topics only', () => {
    for (const count of [10, 15, 20, 30]) {
      const picks = selectPracticeTest(bigPool(), { topicIds: eight.slice(0, 7), count, includeCoding: true }, seededRng(count));
      expect(picks).toHaveLength(count);
      expect(new Set(picks.map((p) => p.id)).size).toBe(count);
      expect(picks.every((p) => eight.slice(0, 7).includes(p.topicId))).toBe(true);
    }
  });

  it('balances across topics (within one) and across read/repair/write (within one)', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picks = selectPracticeTest(bigPool(), { topicIds: eight.slice(0, 5), count: 15, includeCoding: true }, seededRng(seed));
      const perTopic = eight.slice(0, 5).map((t) => picks.filter((p) => p.topicId === t).length);
      expect(Math.max(...perTopic) - Math.min(...perTopic)).toBeLessThanOrEqual(1);
      const perRung = (['read', 'repair', 'write'] as const).map((r) => picks.filter((p) => FORMAT_LADDER[p.format] === r).length);
      expect(Math.max(...perRung) - Math.min(...perRung)).toBeLessThanOrEqual(1);
    }
  });

  it('orders read, then repair, then write', () => {
    const picks = selectPracticeTest(bigPool(), { topicIds: eight, count: 20, includeCoding: true }, seededRng(4));
    const rungIdx = picks.map((p) => ['read', 'repair', 'write'].indexOf(FORMAT_LADDER[p.format]));
    expect(rungIdx).toEqual(rungIdx.slice().sort((a, b) => a - b));
  });

  it('prefers medium questions without always picking them', () => {
    let medium = 0;
    let total = 0;
    const sizes = new Set<number>();
    for (let seed = 1; seed <= 60; seed++) {
      const picks = selectPracticeTest(bigPool(), { topicIds: eight, count: 16, includeCoding: true }, seededRng(seed));
      medium += picks.filter((p) => p.diff === 'medium').length;
      total += picks.length;
      sizes.add(picks.filter((p) => p.diff === 'medium').length);
    }
    // Most questions are medium, but the level is a preference, not a rule: the count varies between papers.
    expect(medium / total).toBeGreaterThan(0.5);
    expect(medium / total).toBeLessThan(0.95);
    expect(sizes.size).toBeGreaterThan(1);
  });

  it('two papers from the same pool differ substantially', () => {
    const pool = bigPool();
    let overlap = 0;
    let worst = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const opts = { topicIds: eight, count: 10, includeCoding: true };
      const a = selectPracticeTest(pool, opts, seededRng(seed * 2 - 1));
      const b = selectPracticeTest(pool, opts, seededRng(seed * 2));
      const ids = new Set(a.map((p) => p.id));
      const same = b.filter((p) => ids.has(p.id)).length;
      overlap += same;
      worst = Math.max(worst, same);
    }
    // Before this selector randomised each cell, almost every question repeated. Now under half do, on average.
    expect(overlap / (40 * 10)).toBeLessThan(0.5);
    expect(worst).toBeLessThan(10);
  });

  it('avoids questions from recent attempts while unseen ones are left', () => {
    const pool = bigPool();
    const opts = { topicIds: eight, count: 10, includeCoding: true };
    for (let seed = 1; seed <= 20; seed++) {
      const first = selectPracticeTest(pool, opts, seededRng(seed));
      const again = selectPracticeTest(pool, opts, seededRng(seed + 500), new Set(first.map((p) => p.id)));
      expect(again).toHaveLength(10);
      expect(again.some((p) => first.some((f) => f.id === p.id))).toBe(false);
    }
  });

  it('reuses questions once the whole pool has been seen', () => {
    const pool = bigPool();
    const all = new Set(pool.map((p) => p.id));
    const picks = selectPracticeTest(pool, { topicIds: eight, count: 12, includeCoding: true }, seededRng(7), all);
    expect(picks).toHaveLength(12);
    expect(new Set(picks.map((p) => p.id)).size).toBe(12);
  });

  it('recentlyUsedQids takes the newest attempts and stops before it swallows the pool', () => {
    const attempts = [['a', 'b'], ['c', 'd'], ['e', 'f'], ['g', 'h']];
    expect([...recentlyUsedQids(attempts, 100)]).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect([...recentlyUsedQids(attempts, 100, 2)]).toEqual(['a', 'b', 'c', 'd']);
    // Two thirds of 6 is 4: once the set covers that much of the pool, older attempts are left out.
    expect([...recentlyUsedQids(attempts, 6)]).toEqual(['a', 'b', 'c', 'd']);
    expect([...recentlyUsedQids([], 10)]).toEqual([]);
  });

  it('with coding off: read formats only, never paper write', () => {
    const picks = selectPracticeTest(bigPool(), { topicIds: eight, count: 30, includeCoding: false }, seededRng(2));
    expect(picks).toHaveLength(30);
    expect(picks.every((p) => OFFLINE_FORMATS.includes(p.format) && !p.paper)).toBe(true);
    expect(practiceEligible(bigPool(), { topicIds: eight, includeCoding: false }).some((p) => p.paper)).toBe(false);
  });

  it('with coding on: paper write is allowed', () => {
    expect(practiceEligible(bigPool(), { topicIds: eight, includeCoding: true }).some((p) => p.paper)).toBe(true);
  });

  it('caps at what exists and redistributes from thin topics', () => {
    const pool = [...bigPool(), c('recursion', 'mcq'), c('recursion', 'predict')];
    const picks = selectPracticeTest(pool, { topicIds: ['recursion', 'strings'], count: 10, includeCoding: true }, seededRng(5));
    expect(picks).toHaveLength(10);
    expect(picks.filter((p) => p.topicId === 'recursion')).toHaveLength(2);
    const small = selectPracticeTest([c('recursion', 'mcq')], { topicIds: ['recursion'], count: 10, includeCoding: true }, seededRng(5));
    expect(small).toHaveLength(1);
    expect(selectPracticeTest(bigPool(), { topicIds: [], count: 10, includeCoding: true })).toEqual([]);
  });

  it('keeps rung balance when a topic has no code questions', () => {
    const pool = [
      ...bigPool().filter((p) => p.topicId === 'strings'),
      c('variables-expressions', 'mcq'), c('variables-expressions', 'predict'), c('variables-expressions', 'trace'), c('variables-expressions', 'multi'),
    ];
    const picks = selectPracticeTest(pool, { topicIds: ['strings', 'variables-expressions'], count: 9, includeCoding: true }, seededRng(8));
    expect(picks).toHaveLength(9);
    const perRung = (['read', 'repair', 'write'] as const).map((r) => picks.filter((p) => FORMAT_LADDER[p.format] === r).length);
    expect(perRung).toEqual([3, 3, 3]);
  });
});

describe('isGradable', () => {
  const q = (format: Format, extra: Record<string, unknown> = {}) => ({ id: 'x', format, ...extra }) as unknown as Question;
  it('needs the generated field each read grader uses', () => {
    expect(isGradable(q('predict'), undefined)).toBe(false);
    expect(isGradable(q('predict'), {} as GeneratedQuestion)).toBe(false);
    expect(isGradable(q('predict'), { stdout: '' })).toBe(true);
    expect(isGradable(q('trace'), { traceRows: [] })).toBe(true);
    expect(isGradable(q('trace'), { stdout: '1' })).toBe(false);
    expect(isGradable(q('twins'), { twins: { outLeft: '', outRight: '', differs: false } })).toBe(true);
    expect(isGradable(q('errorTranslator'), { error: { type: 'E', message: 'm', line: 1 } })).toBe(true);
    expect(isGradable(q('errorTranslator'), undefined)).toBe(false);
  });
  it('choice questions need a correct option; code formats need nothing generated', () => {
    expect(isGradable(q('mcq', { options: [{ id: 'a', correct: true }] }), undefined)).toBe(true);
    expect(isGradable(q('mcq', { options: [{ id: 'a' }] }), undefined)).toBe(false);
    expect(isGradable(q('multi', { options: [] }), undefined)).toBe(false);
    expect(isGradable(q('write'), undefined)).toBe(true);
    expect(isGradable(q('parsons'), undefined)).toBe(true);
  });
});

describe('estimatedMinutes', () => {
  it('rounds the sum of expected seconds up to minutes', () => {
    expect(estimatedMinutes([c('strings', 'mcq', 'easy', false, 90), c('strings', 'mcq', 'easy', false, 40)])).toBe(3);
    expect(estimatedMinutes([])).toBe(0);
  });
});

describe('selectPracticeTest difficulty across cells', () => {
  it('takes the medium question of a cell far more often than an even draw would', () => {
    // One medium write against four hard ones in the same topic and rung.
    const pool: Candidate[] = [
      c('strings', 'mcq', 'medium'), c('strings', 'write', 'medium'),
      c('strings', 'write', 'hard'), c('strings', 'write', 'hard'), c('strings', 'write', 'hard'), c('strings', 'write', 'hard'),
    ];
    let medium = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const picks = selectPracticeTest(pool, { topicIds: ['strings'], count: 2, includeCoding: true }, seededRng(seed));
      const write = picks.find((p) => p.format === 'write');
      if (write?.diff === 'medium') medium++;
    }
    expect(medium / 200).toBeGreaterThan(0.4); // an even draw would be 0.2
    expect(medium / 200).toBeLessThan(1); // and the hard ones still get a turn
  });

  it('prefers a topic whose cell has a medium question when the rung is short of them', () => {
    // Two write slots, one medium write and two hard ones: the medium one is used in most papers.
    const pool: Candidate[] = [
      c('strings', 'mcq', 'medium'), c('strings', 'write', 'hard'), c('strings', 'write', 'hard'),
      c('lists-tuples', 'mcq', 'medium'), c('lists-tuples', 'write', 'medium'),
    ];
    let withMedium = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const picks = selectPracticeTest(pool, { topicIds: ['strings', 'lists-tuples'], count: 3, includeCoding: true }, seededRng(seed));
      const writes = picks.filter((p) => p.format === 'write');
      expect(writes.length).toBeGreaterThanOrEqual(1);
      if (writes.some((w) => w.diff === 'medium')) withMedium++;
    }
    expect(withMedium).toBeGreaterThan(30);
  });
});

describe('buildMockExam', () => {
  const paperQ = (id: string, slot: ExamSlot, topicId: TopicId = 'strings'): Candidate => ({
    id, topicId, format: 'write', diff: 'hard', paper: true, expectedSec: 600, examSlot: slot, marks: EXAM_SLOT_MARKS[slot],
  });
  const fullPool = () => EXAM_SLOT_IDS.flatMap((slot) => [paperQ(`${slot}-a`, slot), paperQ(`${slot}-b`, slot)]);

  it('builds one question per slot, in the paper order, worth 100 marks', () => {
    const paper = buildMockExam(fullPool(), seededRng(7));
    expect(paper).not.toBeNull();
    expect(paper!.map((p) => p.examSlot)).toEqual([...EXAM_SLOT_IDS]);
    expect(paper!.reduce((sum, p) => sum + (p.marks ?? 0), 0)).toBe(MOCK_EXAM_TOTAL_MARKS);
    expect(MOCK_EXAM_TOTAL_MARKS).toBe(100);
  });

  it('returns null when a slot has no question written for it', () => {
    const short = fullPool().filter((c) => c.examSlot !== 'file-report');
    expect(buildMockExam(short, seededRng(1))).toBeNull();
  });

  it('avoids questions from a recent paper while a slot has an alternative', () => {
    const pool = fullPool();
    const first = buildMockExam(pool, seededRng(3))!;
    const again = buildMockExam(pool, seededRng(9), new Set(first.map((p) => p.id)))!;
    expect(again.some((p) => first.some((f) => f.id === p.id))).toBe(false);
  });

  it('falls back to a seen question rather than failing when a slot has only one', () => {
    const pool = EXAM_SLOT_IDS.map((slot) => paperQ(`${slot}-only`, slot));
    const paper = buildMockExam(pool, seededRng(2), new Set(pool.map((p) => p.id)));
    expect(paper?.length).toBe(EXAM_SLOT_IDS.length);
  });

  it('marksByQid maps each question to its slot marks', () => {
    const paper = buildMockExam(fullPool(), seededRng(5))!;
    const marks = marksByQid(paper);
    expect(Object.values(marks).reduce((a, b) => a + b, 0)).toBe(100);
  });
});
