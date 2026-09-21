// CITS1401 Semester 2, 2026 calendar (docs/build/DESIGN.md "Status bar").
// Week 1 starts Mon 20 Jul. Study break the week of 31 Aug. Week 12 is the week of 12 Oct.
// Study break (swotvac) the week of 19 Oct. Exams 26 Oct to Fri 6 Nov.

export type SemesterPhase = 'before' | 'teaching' | 'break' | 'swotvac' | 'exams' | 'after';

export interface SemesterInfo {
  phase: SemesterPhase;
  /** Teaching week 1-12 while teaching, otherwise null. */
  week: number | null;
  /** Whole calendar days until the first exam day; 0 once exams have started. */
  daysToExams: number;
  /** Short status text, e.g. "Week 8 · exams in 38 days". */
  label: string;
  /** Full sentence for a tooltip. */
  detail: string;
}

const DAY = 86_400_000;
const WEEK1 = new Date(2026, 6, 20);
const BREAK1 = new Date(2026, 7, 31);
const WEEK7 = new Date(2026, 8, 7);
const SWOTVAC = new Date(2026, 9, 19);
const EXAMS = new Date(2026, 9, 26);
const EXAMS_END = new Date(2026, 10, 6);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Calendar days from a to b (both at local midnight). Rounds to absorb daylight saving shifts. */
function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

const DETAIL = 'CITS1401 Semester 2, 2026. Exams run 26 Oct to 6 Nov.';

export function semesterInfo(now: Date = new Date()): SemesterInfo {
  const today = startOfDay(now);
  const toExams = Math.max(0, daysBetween(today, EXAMS));
  const examsIn = toExams === 0 ? 'exams today' : `exams in ${plural(toExams, 'day')}`;

  if (today < WEEK1) {
    const n = daysBetween(today, WEEK1);
    return { phase: 'before', week: null, daysToExams: toExams, label: `Semester starts in ${plural(n, 'day')}`, detail: DETAIL };
  }
  if (today < BREAK1) {
    const week = Math.floor(daysBetween(WEEK1, today) / 7) + 1;
    return { phase: 'teaching', week, daysToExams: toExams, label: `Week ${week} · ${examsIn}`, detail: `Teaching week ${week}. ${DETAIL}` };
  }
  if (today < WEEK7) {
    return { phase: 'break', week: null, daysToExams: toExams, label: `Study break · ${examsIn}`, detail: `Mid-semester study break. ${DETAIL}` };
  }
  if (today < SWOTVAC) {
    const week = Math.floor(daysBetween(WEEK7, today) / 7) + 7;
    return { phase: 'teaching', week, daysToExams: toExams, label: `Week ${week} · ${examsIn}`, detail: `Teaching week ${week}. ${DETAIL}` };
  }
  if (today < EXAMS) {
    return { phase: 'swotvac', week: null, daysToExams: toExams, label: `Study break · ${examsIn}`, detail: `Study break before exams. ${DETAIL}` };
  }
  if (today <= EXAMS_END) {
    const left = daysBetween(today, EXAMS_END);
    return { phase: 'exams', week: null, daysToExams: 0, label: left === 0 ? 'Exams · last day' : `Exams · ${plural(left, 'day')} left`, detail: DETAIL };
  }
  return { phase: 'after', week: null, daysToExams: 0, label: 'Semester finished', detail: DETAIL };
}

/** One week of the run-in to the exams, Monday-based like the teaching calendar. */
export interface SemesterWeek {
  /** Local midnight on the Monday. */
  start: number;
  phase: SemesterPhase;
  /** Teaching week number while teaching, otherwise null. */
  week: number | null;
  /** "Week 9", "Study break", "Exams". */
  label: string;
  /** True for the week the student is in now. */
  current: boolean;
}

function mondayOf(d: Date): Date {
  const day = startOfDay(d);
  // getDay(): 0 is Sunday, so Sunday belongs to the week that began six days earlier.
  const shift = (day.getDay() + 6) % 7;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - shift);
}

/**
 * Every week from the one containing `now` up to and including the week the exams start.
 *
 * This is what a plan is laid out across. It stops at the first exam week because planning past the exam
 * is planning for nothing, and it returns an empty list once the exams have begun — at which point there
 * is nothing left to schedule and saying so is better than inventing a week.
 */
export function remainingWeeks(now: Date = new Date()): SemesterWeek[] {
  const today = startOfDay(now);
  if (today >= EXAMS) return [];
  const out: SemesterWeek[] = [];
  const thisMonday = mondayOf(today);
  const examMonday = mondayOf(EXAMS);
  for (let m = thisMonday; m <= examMonday; m = new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7)) {
    // Midweek gives the week's character without landing on a boundary date.
    const info = semesterInfo(new Date(m.getFullYear(), m.getMonth(), m.getDate() + 2));
    out.push({
      start: m.getTime(),
      phase: m >= mondayOf(EXAMS) ? 'exams' : info.phase,
      week: info.week,
      label: m >= mondayOf(EXAMS) ? 'Exams' : info.week !== null ? `Week ${info.week}` : 'Study break',
      current: m.getTime() === thisMonday.getTime(),
    });
  }
  return out;
}

/** Whole weeks of learning time left before the pre-exam study break begins. */
export function studyWeeksLeft(now: Date = new Date()): number {
  return Math.max(0, Math.ceil(daysBetween(startOfDay(now), SWOTVAC) / 7));
}
