// The run-in: what is left, how long there is, and whether those two match.
//
// The app has always known when the exams are and has always known how far through the ladder a student
// is. It has never put the two together, so nobody could answer the question that actually organises a
// student's semester: am I going to make it? This works out the pace the remaining topics demand,
// compares it with the pace already being managed, and lays the rest out week by week.
//
// Every target here has something real behind it. A week with nothing to put in it is left alone rather
// than filled, because a plan that invents work is one a student learns to ignore.
import type { TopicId } from '../content/ids.ts';
import type { QuestionMeta } from '../content/questionIndex.ts';
import { TOPICS } from '../content/topics.ts';
import { conceptStats, weakConcepts } from './concepts.ts';
import type { ConceptStat } from './concepts.ts';
import type { TopicProgress } from './progress.ts';
import { remainingWeeks, semesterInfo, studyWeeksLeft } from './semester.ts';
import type { SemesterWeek } from './semester.ts';
import type { AppEvent } from './types.ts';

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export type Verdict = 'not-started' | 'on-track' | 'behind' | 'out-of-time' | 'done' | 'exams';

export interface Pace {
  /** Topics whose minimum is not met yet. */
  topicsLeft: number;
  /** Whole weeks before the pre-exam study break, when learning should be finished. */
  weeksLeft: number;
  /** Topics a week needed from here to finish in time. */
  needPerWeek: number;
  /** Topics finished so far. */
  done: number;
  /** Topics a week managed so far, or null when there is not enough history to say. */
  ratePerWeek: number | null;
  verdict: Verdict;
}

export type TargetKind = 'finish' | 'start' | 'revise' | 'mock' | 'exam';

export interface PlanTarget {
  kind: TargetKind;
  text: string;
  href?: string;
}

export interface PlanWeek extends SemesterWeek {
  targets: PlanTarget[];
}

export interface ReadyItem {
  id: string;
  text: string;
  done: boolean;
  /** What is left, when it is not done. */
  detail?: string;
  href?: string;
}

export interface ExamPlan {
  daysToExams: number;
  phase: ReturnType<typeof semesterInfo>['phase'];
  pace: Pace;
  weeks: PlanWeek[];
  checklist: ReadyItem[];
  /** The headline, in a sentence. */
  verdictText: string;
}

export interface PlanInput {
  events: readonly AppEvent[];
  index: readonly QuestionMeta[];
  progress: Readonly<Record<string, TopicProgress>>;
  /** Mock final exams sat, and the best mark so far (0..1). */
  mockExam: { attempts: number; best: number | null };
  now?: number;
}

/** Topics still short of their minimum, in ladder order. */
function unfinished(progress: PlanInput['progress']): TopicProgress[] {
  return TOPICS.map((t) => progress[t.id]).filter((p): p is TopicProgress => !!p && !p.minimumMet);
}

/**
 * Topics a week managed so far.
 *
 * Measured from the first day of real activity rather than from the start of semester: a student who
 * began in week 6 has not been going slowly for six weeks, and telling them they have would be both
 * wrong and discouraging.
 */
function rateSoFar(events: readonly AppEvent[], done: number, now: number): number | null {
  let first = 0;
  for (const e of events) {
    if (e.type !== 'attempt') continue;
    if (first === 0 || e.ts < first) first = e.ts;
  }
  if (first === 0 || done === 0) return null;
  const weeks = (now - first) / WEEK;
  if (weeks < 1) return null;
  return done / weeks;
}

function pace(input: PlanInput, now: number): Pace {
  const left = unfinished(input.progress);
  const done = TOPICS.length - left.length;
  const weeksLeft = studyWeeksLeft(new Date(now));
  const needPerWeek = weeksLeft > 0 ? Math.ceil(left.length / weeksLeft) : left.length;
  const ratePerWeek = rateSoFar(input.events, done, now);
  const attempted = input.events.some((e) => e.type === 'attempt');

  let verdict: Verdict;
  const phase = semesterInfo(new Date(now)).phase;
  if (phase === 'exams' || phase === 'after') verdict = 'exams';
  else if (left.length === 0) verdict = 'done';
  else if (!attempted) verdict = 'not-started';
  else if (weeksLeft === 0) verdict = 'out-of-time';
  else if (ratePerWeek === null) verdict = 'on-track';
  else verdict = ratePerWeek >= needPerWeek ? 'on-track' : 'behind';

  return { topicsLeft: left.length, weeksLeft, needPerWeek, done, ratePerWeek, verdict };
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

function verdictText(p: Pace, daysToExams: number): string {
  switch (p.verdict) {
    case 'exams':
      return 'Exams have started. Revise what you know rather than starting anything new.';
    case 'done':
      return `Every topic is finished, with ${plural(daysToExams, 'day')} to go. From here it is revision and mock papers.`;
    case 'not-started':
      return `${plural(p.topicsLeft, 'topic')} and ${plural(p.weeksLeft, 'week')} before the study break. Nothing is done yet, so the first one is the whole job.`;
    case 'out-of-time':
      return `${plural(p.topicsLeft, 'topic')} are unfinished and the study break has started. Cover the ones the exam leans on hardest rather than all of them.`;
    case 'behind':
      return `${plural(p.topicsLeft, 'topic')} left in ${plural(p.weeksLeft, 'week')}: that is ${plural(p.needPerWeek, 'topic')} a week, against the ${round1(p.ratePerWeek ?? 0)} a week you have been managing.`;
    default:
      return `${plural(p.topicsLeft, 'topic')} left in ${plural(p.weeksLeft, 'week')}: ${plural(p.needPerWeek, 'topic')} a week, which is the pace you are already going at.`;
  }
}

/** Spread the unfinished topics across the weeks of learning time, then fill the rest with revision. */
function weeks(input: PlanInput, p: Pace, now: number): PlanWeek[] {
  const all = remainingWeeks(new Date(now));
  if (all.length === 0) return [];
  const queue = unfinished(input.progress);
  const weak = weakConcepts(conceptStats(input.events, input.index), 3);

  return all.map((w, i): PlanWeek => {
    const targets: PlanTarget[] = [];
    if (w.phase === 'exams') {
      targets.push({ kind: 'exam', text: 'Exams begin. Nothing new — sleep, and read the paper slowly.' });
      return { ...w, targets };
    }

    // Learning goes in the teaching weeks; the study break before exams is for papers and revision.
    if (w.phase !== 'swotvac') {
      for (let n = 0; n < p.needPerWeek && queue.length > 0; n++) {
        const t = queue.shift() as TopicProgress;
        const meta = TOPICS.find((x) => x.id === t.topicId);
        targets.push({
          kind: t.attempted > 0 ? 'finish' : 'start',
          text: t.attempted > 0
            ? `Finish ${meta?.short ?? t.topicId}${t.remaining ? ` — ${t.remaining}` : ''}`
            : `Start ${meta?.short ?? t.topicId}`,
          href: `#/topic/${t.topicId}`,
        });
      }
    }

    // A mock paper in the study break, and — if none has ever been sat — one the week before it, so the
    // result arrives while there is still time to do something about it.
    if (w.phase === 'swotvac' || (input.mockExam.attempts === 0 && i === all.length - 3)) {
      targets.push({
        kind: 'mock',
        text: input.mockExam.attempts === 0 ? 'Sit a full mock final paper' : 'Sit another mock final paper',
        href: '#/exam',
      });
    }

    // Revision only where there is a named weakness and room left in the week.
    if (targets.length === 0 && weak.length > 0) {
      targets.push({ kind: 'revise', text: 'Work through a review session', href: '#/review' });
    }
    return { ...w, targets };
  });
}

function checklist(input: PlanInput, index: readonly QuestionMeta[], weak: ConceptStat[]): ReadyItem[] {
  const out: ReadyItem[] = [];
  // Attempted counts as looked at. "Opened" is recorded when the topic page is visited, so a history
  // that has questions answered in a topic but no visit recorded — an imported backup, say — would
  // otherwise be told it had never opened a topic it has clearly worked through.
  const opened = TOPICS.filter((t) => {
    const p = input.progress[t.id];
    return !!p && (p.opened || p.attempted > 0);
  }).length;
  out.push({
    id: 'opened',
    text: 'Every topic looked at',
    done: opened === TOPICS.length,
    detail: opened === TOPICS.length ? undefined : `${TOPICS.length - opened} never opened`,
    href: '#/',
  });

  const met = TOPICS.filter((t) => input.progress[t.id]?.minimumMet).length;
  out.push({
    id: 'minimums',
    text: 'Every topic practised to its minimum',
    done: met === TOPICS.length,
    detail: met === TOPICS.length ? undefined : `${TOPICS.length - met} to go`,
    href: '#/',
  });

  out.push({
    id: 'mock',
    text: 'A full mock final paper sat',
    done: input.mockExam.attempts > 0,
    detail: input.mockExam.attempts > 0
      ? `best ${Math.round((input.mockExam.best ?? 0) * 100)}%`
      : 'two hours, eight questions, 100 marks',
    href: '#/exam',
  });

  // Writing code is what the paper asks for, and it is the format students practise least.
  const wrote = new Set(
    input.events.filter((e) => e.type === 'attempt' && e.correct && !e.revealed).map((e) => (e as { qid: string }).qid),
  );
  const writeQs = index.filter((q) => q.format === 'write');
  const writeDone = writeQs.filter((q) => wrote.has(q.qid)).length;
  out.push({
    id: 'write',
    text: 'Code written by hand, not just read',
    done: writeDone >= 10,
    detail: writeDone >= 10 ? `${writeDone} written` : `${writeDone} of 10`,
    href: '#/',
  });

  out.push({
    id: 'weak',
    text: 'No skill still going wrong',
    done: weak.length === 0,
    detail: weak.length === 0 ? undefined : `${plural(weak.length, 'skill')} to shore up`,
    href: '#/report',
  });
  return out;
}

export function examPlan(input: PlanInput): ExamPlan {
  const now = input.now ?? Date.now();
  const info = semesterInfo(new Date(now));
  const p = pace(input, now);
  const weak = weakConcepts(conceptStats(input.events, input.index), 5);
  return {
    daysToExams: info.daysToExams,
    phase: info.phase,
    pace: p,
    weeks: weeks(input, p, now),
    checklist: checklist(input, input.index, weak),
    verdictText: verdictText(p, info.daysToExams),
  };
}
