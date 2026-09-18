import { describe, expect, it } from 'vitest';
import type { TopicId } from '../../content/ids.ts';
import type { ReportData } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { unlockAllInRange } from './overrides.ts';
import { eventsForTopic, narrowReport } from './topicFilter.ts';
import { behaviourNotes, fixTimeText, ladderGaps } from './words.ts';

describe('ladderGaps', () => {
  it('writes one sentence per gap of 25 points or more, largest first', () => {
    const gaps = ladderGaps([
      { topicId: 'for-loops-range', read: 0.9, repair: 0.7, write: 0.4 },
      { topicId: 'strings', read: 0.8, repair: null, write: 0.7 },
      { topicId: 'lists-tuples', read: 0.3, repair: null, write: 0.9 },
      { topicId: 'recursion', read: 0.5, repair: null, write: null },
    ]);
    expect(gaps.map((g) => g.topicId)).toEqual(['lists-tuples', 'for-loops-range']);
    expect(gaps[1].text).toBe('In For loops and range(), reading and tracing code goes well (90%) but writing code from scratch lands at 40%. Parsons puzzles and fill-in-the-blank questions there build up to writing it yourself.');
    expect(gaps[0].weak).toBe('read');
  });
});

describe('behaviourNotes', () => {
  it('only includes non-zero counts, with kind wording', () => {
    expect(behaviourNotes({ rushed: 0, stuckNoHint: 0, hintSkims: 0, revealedWithoutExplain: 0 })).toEqual([]);
    const notes = behaviourNotes({ rushed: 0, stuckNoHint: 1, hintSkims: 0, revealedWithoutExplain: 3 });
    expect(notes.map((n) => n.key)).toEqual(['stuckNoHint', 'revealedWithoutExplain']);
    expect(notes[1].text).toBe('You revealed 3 answers without writing why; a one-line explanation helps it stick.');
  });

  it('fix time words', () => {
    expect(fixTimeText(null)).toBeNull();
    expect(fixTimeText(40000)).toBe('about 40 s to fix');
    expect(fixTimeText(150000)).toBe('about 3 min to fix');
  });
});

describe('eventsForTopic', () => {
  const base = { v: 1 as const };
  const qt = (qid: string): TopicId | undefined => (qid.startsWith('t05') ? 'strings' : qid.startsWith('t03') ? 'for-loops-range' : undefined);
  const events: AppEvent[] = [
    { ...base, eid: 'a', ts: 1, sessionId: 's1', type: 'session_start' },
    { ...base, eid: 'b', ts: 2, sessionId: 's1', type: 'topic_open', topicId: 'strings' },
    { ...base, eid: 'c', ts: 3, sessionId: 's1', type: 'attempt', qid: 't05-s1-q1', topicId: 'strings', format: 'mcq', diff: 'easy', mode: 'practice', checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false, timeMs: 1000, mistakes: [] },
    { ...base, eid: 'd', ts: 4, sessionId: 's1', type: 'mistake', qid: 't05-s1-q1', topicId: null, mistake: 'off_by_one_range', channel: 'test' },
    { ...base, eid: 'e', ts: 5, sessionId: 's2', type: 'session_start' },
    { ...base, eid: 'f', ts: 6, sessionId: 's2', type: 'attempt', qid: 't03-s1-q1', topicId: 'for-loops-range', format: 'mcq', diff: 'easy', mode: 'practice', checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false, timeMs: 1000, mistakes: [] },
    { ...base, eid: 'g', ts: 7, sessionId: 's3', type: 'session_start' },
    { ...base, eid: 'h', ts: 8, sessionId: 's3', type: 'test_result', kind: 'midsem', topicIds: ['strings', 'for-loops-range'], score: 1, total: 2, passed: true, durationMs: 1, qids: [] },
    { ...base, eid: 'i', ts: 9, sessionId: 's3', type: 'self_explain', qid: 't05-s1-q1', text: 'because' },
    { ...base, eid: 'j', ts: 10, sessionId: 's1', type: 'override', what: 'unlockAll', value: true },
  ];

  it('keeps topic events, their sessions, tests that include the topic and qid-linked events', () => {
    expect(eventsForTopic(events, 'strings', qt).map((e) => e.eid)).toEqual(['a', 'b', 'c', 'd', 'g', 'h', 'i']);
    expect(eventsForTopic(events, 'for-loops-range', qt).map((e) => e.eid)).toEqual(['e', 'f', 'g', 'h']);
    expect(eventsForTopic(events, 'recursion', qt)).toEqual([]);
  });

  it('narrowReport keeps only rows for the topic', () => {
    const data = {
      topics: [{ topicId: 'strings' }, { topicId: 'recursion' }],
      ladder: [{ topicId: 'strings' }, { topicId: 'recursion' }],
      sessions: [{ topics: ['strings'] }, { topics: ['recursion'] }],
      patterns: [{ id: 'for-each-loop', status: 'recommended' }],
    } as unknown as ReportData;
    const n = narrowReport(data, 'strings');
    expect(n.topics).toHaveLength(1);
    expect(n.ladder).toHaveLength(1);
    expect(n.sessions).toHaveLength(1);
    expect(n.patterns).toHaveLength(1);
  });
});

describe('unlockAllInRange', () => {
  const base = { v: 1 as const };
  const NOW = 1_000_000_000;
  const DAY = 86_400_000;
  const attempt = (eid: string, ts: number, sessionId: string): AppEvent => ({
    ...base, eid, ts, sessionId, type: 'attempt', qid: 't01-s1-q1', topicId: 'variables-expressions', format: 'mcq',
    diff: 'easy', mode: 'practice', checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false,
    timeMs: 1000, mistakes: [],
  });
  const override = (eid: string, ts: number, sessionId: string, value: boolean): AppEvent =>
    ({ ...base, eid, ts, sessionId, type: 'override', what: 'unlockAll', value });

  it('is false with no override events, and for an empty log', () => {
    expect(unlockAllInRange([attempt('a', NOW - DAY, 's1')], 'all', NOW)).toBe(false);
    expect(unlockAllInRange([], 'all', NOW)).toBe(false);
  });

  it('is true when the switch went on inside the range', () => {
    const events = [attempt('a', NOW - 2 * DAY, 's1'), override('b', NOW - DAY, 's1', true)];
    expect(unlockAllInRange(events, 'all', NOW)).toBe(true);
    expect(unlockAllInRange(events, '7d', NOW)).toBe(true);
  });

  it('is true when it was already on before the range started', () => {
    const events = [override('a', NOW - 40 * DAY, 's0', true), attempt('b', NOW - DAY, 's1')];
    expect(unlockAllInRange(events, '7d', NOW)).toBe(true);
    expect(unlockAllInRange(events, 'session', NOW)).toBe(true);
  });

  it('is false once it was switched off before the range', () => {
    const events = [
      override('a', NOW - 40 * DAY, 's0', true), override('b', NOW - 39 * DAY, 's0', false), attempt('c', NOW - DAY, 's1'),
    ];
    expect(unlockAllInRange(events, '7d', NOW)).toBe(false);
    expect(unlockAllInRange(events, 'all', NOW)).toBe(true); // the whole log includes the time it was on
  });

  it('looks only at the latest session for the session range', () => {
    const events = [attempt('a', NOW - 9 * DAY, 's1'), override('b', NOW - 9 * DAY, 's1', true), override('c', NOW - 8 * DAY, 's1', false), attempt('d', NOW - 60_000, 's2')];
    expect(unlockAllInRange(events, 'session', NOW)).toBe(false);
    expect(unlockAllInRange(events, '30d', NOW)).toBe(true);
  });
});
