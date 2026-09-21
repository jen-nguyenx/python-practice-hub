import { describe, expect, it } from 'vitest';
import { TOPICS } from '../../content/topics.ts';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { examPlan } from '../examPlan.ts';
import type { PlanInput } from '../examPlan.ts';
import type { TopicProgress } from '../progress.ts';
import { remainingWeeks, studyWeeksLeft } from '../semester.ts';
import type { AppEvent } from '../types.ts';

const DAY = 86_400_000;
/** Wednesday of teaching week 9, 2026: five weeks of learning time before the study break. */
const WEEK9 = new Date(2026, 8, 16, 12).getTime();
/** Inside the pre-exam study break. */
const SWOT = new Date(2026, 9, 21, 12).getTime();

function topic(id: string, over: Partial<TopicProgress> = {}): TopicProgress {
  return {
    topicId: id as TopicProgress['topicId'], state: 'open', opened: true, total: 20, attempted: 0,
    solved: 0, codeSolved: 0, minimum: { solve: 5, code: 1 }, minimumMet: false, testedOut: false,
    score: null, ...over,
  };
}

/** Progress where the first `done` topics in ladder order are finished. */
function progressWith(done: number): Record<string, TopicProgress> {
  const out: Record<string, TopicProgress> = {};
  TOPICS.forEach((t, i) => {
    out[t.id] = topic(t.id, i < done
      ? { minimumMet: true, state: 'completed', attempted: 20, solved: 10 }
      // Not reached yet: never opened either, which is what an untouched topic really looks like.
      : { attempted: 0, opened: false });
  });
  return out;
}

let n = 0;
function attempt(ts: number, qid = 'q1', over: Partial<AppEvent> = {}): AppEvent {
  n++;
  return {
    eid: `e${n}`, v: 1, ts, sessionId: 's', type: 'attempt', qid,
    topicId: 'variables-expressions', format: 'mcq', diff: 'easy', mode: 'practice',
    checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0, revealed: false,
    timeMs: 1000, mistakes: [], ...over,
  } as AppEvent;
}

const index: QuestionMeta[] = [];

function plan(over: Partial<PlanInput> = {}) {
  return examPlan({
    events: [], index, progress: progressWith(0), mockExam: { attempts: 0, best: null }, now: WEEK9, ...over,
  });
}

describe('pace', () => {
  it('says nothing is done when nothing has been', () => {
    const p = plan().pace;
    expect(p.done).toBe(0);
    expect(p.topicsLeft).toBe(TOPICS.length);
    expect(p.verdict).toBe('not-started');
    expect(p.weeksLeft).toBe(studyWeeksLeft(new Date(WEEK9)));
  });

  it('works out the topics a week the time left demands', () => {
    const p = plan({ progress: progressWith(3), events: [attempt(WEEK9 - 21 * DAY)] }).pace;
    expect(p.topicsLeft).toBe(TOPICS.length - 3);
    expect(p.needPerWeek).toBe(Math.ceil((TOPICS.length - 3) / p.weeksLeft));
  });

  it('calls it behind when the pace managed so far is short of the pace needed', () => {
    // Three topics in six weeks is half a topic a week; ten left over five weeks needs two.
    const p = plan({ progress: progressWith(3), events: [attempt(WEEK9 - 42 * DAY)] }).pace;
    expect(p.ratePerWeek).toBeCloseTo(0.5, 1);
    expect(p.verdict).toBe('behind');
  });

  it('calls it on track when the pace managed is enough', () => {
    // Eleven topics in six weeks is comfortably above the two a week the last two demand.
    const p = plan({ progress: progressWith(11), events: [attempt(WEEK9 - 42 * DAY)] }).pace;
    expect(p.verdict).toBe('on-track');
  });

  it('measures the rate from the first day of work, not the start of semester', () => {
    // Someone who started yesterday has not been going slowly for nine weeks.
    const p = plan({ progress: progressWith(2), events: [attempt(WEEK9 - 2 * DAY)] }).pace;
    expect(p.ratePerWeek).toBeNull();
    expect(p.verdict).toBe('on-track');
  });

  it('is out of time once the study break has started with topics unfinished', () => {
    const p = plan({ now: SWOT, progress: progressWith(9), events: [attempt(SWOT - 42 * DAY)] }).pace;
    expect(p.weeksLeft).toBe(0);
    expect(p.verdict).toBe('out-of-time');
  });

  it('is done when every topic has met its minimum', () => {
    const p = plan({ progress: progressWith(TOPICS.length), events: [attempt(WEEK9 - 42 * DAY)] }).pace;
    expect(p.topicsLeft).toBe(0);
    expect(p.verdict).toBe('done');
  });
});

describe('weeks', () => {
  it('lays out every week from now to the exams', () => {
    const p = plan();
    expect(p.weeks).toHaveLength(remainingWeeks(new Date(WEEK9)).length);
    expect(p.weeks[0].current).toBe(true);
    expect(p.weeks[p.weeks.length - 1].phase).toBe('exams');
  });

  it('puts topics in the teaching weeks and nothing new in the exam week', () => {
    const p = plan({ progress: progressWith(6), events: [attempt(WEEK9 - 21 * DAY)] });
    const first = p.weeks[0];
    expect(first.targets.some((t) => t.kind === 'finish' || t.kind === 'start')).toBe(true);
    const last = p.weeks[p.weeks.length - 1];
    expect(last.targets.every((t) => t.kind === 'exam')).toBe(true);
  });

  it('keeps the study break for papers rather than new topics', () => {
    const p = plan({ progress: progressWith(6), events: [attempt(WEEK9 - 21 * DAY)] });
    for (const w of p.weeks.filter((x) => x.phase === 'swotvac')) {
      expect(w.targets.some((t) => t.kind === 'mock')).toBe(true);
      expect(w.targets.some((t) => t.kind === 'start' || t.kind === 'finish')).toBe(false);
    }
  });

  it('never asks for the same topic twice', () => {
    const p = plan({ progress: progressWith(2), events: [attempt(WEEK9 - 21 * DAY)] });
    const hrefs = p.weeks.flatMap((w) => w.targets.map((t) => t.href)).filter((h) => h?.startsWith('#/topic/'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('has no weeks left to plan once the exams have started', () => {
    const p = plan({ now: new Date(2026, 9, 27, 12).getTime() });
    expect(p.weeks).toEqual([]);
    expect(p.pace.verdict).toBe('exams');
  });
});

describe('checklist', () => {
  it('counts what is left rather than only saying no', () => {
    const c = plan().checklist;
    const opened = c.find((x) => x.id === 'opened')!;
    expect(opened.done).toBe(false);
    expect(opened.detail).toMatch(/never opened/);
    expect(c.find((x) => x.id === 'mock')!.done).toBe(false);
  });

  it('ticks the mock paper once one has been sat, and shows the mark', () => {
    const c = plan({ mockExam: { attempts: 1, best: 0.62 } }).checklist;
    const mock = c.find((x) => x.id === 'mock')!;
    expect(mock.done).toBe(true);
    expect(mock.detail).toBe('best 62%');
  });
});
