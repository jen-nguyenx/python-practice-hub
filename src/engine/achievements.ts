// Things worth having finished.
//
// The app knew when a topic was done and said so in faint grey, which is the opposite of how finishing
// something should feel. These are the moments worth marking — the first question, the first topic, the
// whole ladder, a week without missing a day, a paper sat under exam conditions.
//
// All of it is derived from the event log, so nothing new is stored and nothing can drift out of step
// with the work actually done. An earned badge stays earned: every rule counts something that only ever
// goes up, so a bad week never takes one away.
import type { QuestionMeta } from '../content/questionIndex.ts';
import type { TopicProgress } from './progress.ts';
import { streak } from './streak.ts';
import type { AppEvent } from './types.ts';

export interface Badge {
  id: string;
  title: string;
  /** What it took, in a sentence. */
  blurb: string;
  earned: boolean;
  /** How far along, for one not yet earned. */
  have: number;
  need: number;
}

export interface BadgeInput {
  events: readonly AppEvent[];
  index: readonly QuestionMeta[];
  progress: Readonly<Record<string, TopicProgress>>;
  now?: number;
}

/** Questions solved cleanly: correct, without the answer having been shown. */
function solvedCount(events: readonly AppEvent[]): number {
  const revealed = new Set<string>();
  for (const e of events) if (e.type === 'reveal') revealed.add(e.qid);
  const out = new Set<string>();
  for (const e of events) {
    if (e.type === 'attempt' && e.correct && !e.revealed && !revealed.has(e.qid)) out.add(e.qid);
  }
  return out.size;
}

/** Solved with no hint taken on that question: the hint ladder records every peek. */
function unaidedCount(events: readonly AppEvent[]): number {
  const hinted = new Set<string>();
  const revealed = new Set<string>();
  for (const e of events) {
    if (e.type === 'hint') hinted.add(e.qid);
    if (e.type === 'reveal') revealed.add(e.qid);
  }
  const out = new Set<string>();
  for (const e of events) {
    if (e.type !== 'attempt' || !e.correct || e.revealed) continue;
    if (hinted.has(e.qid) || revealed.has(e.qid)) continue;
    out.add(e.qid);
  }
  return out.size;
}

function badge(id: string, title: string, blurb: string, have: number, need: number): Badge {
  return { id, title, blurb, have: Math.min(have, need), need, earned: have >= need };
}

export function badges(input: BadgeInput): Badge[] {
  const { events, progress } = input;
  const solved = solvedCount(events);
  const finished = Object.values(progress).filter((p) => p.minimumMet).length;
  const topics = Math.max(1, Object.keys(progress).length);
  const mocks = events.filter((e) => e.type === 'test_result' && e.kind === 'mock-exam');
  const passedMock = mocks.filter((e) => e.type === 'test_result' && e.passed).length;
  const days = streak(events, input.now ?? Date.now()).days;
  // A project main() written and passing: the hardest single thing the unit asks for.
  const projectQids = new Set(input.index.filter((q) => q.kind === 'project').map((q) => q.qid));
  const builtProject = new Set(
    events.filter((e) => e.type === 'attempt' && e.correct && !e.revealed && projectQids.has(e.qid))
      .map((e) => (e as { qid: string }).qid),
  ).size;

  return [
    badge('first-steps', 'First steps', 'Solved your first question', solved, 1),
    badge('ten-down', 'Ten down', 'Ten questions solved', solved, 10),
    badge('first-topic', 'A topic finished', 'Took one topic all the way to its minimum', finished, 1),
    badge('half-way', 'Half the ladder', `Finished ${Math.ceil(topics / 2)} topics`, finished, Math.ceil(topics / 2)),
    badge('whole-ladder', 'The whole ladder', 'Every topic finished', finished, topics),
    badge('week-run', 'A week straight', 'Practised seven days in a row', days, 7),
    badge('hundred', 'A hundred', 'A hundred questions solved', solved, 100),
    badge('unaided', 'On your own', 'Twenty solved without a hint or the answer', unaidedCount(events), 20),
    badge('sat-a-paper', 'Sat a paper', 'Finished a mock final under exam conditions', mocks.length, 1),
    badge('passed-a-paper', 'Passed a paper', 'Passed a mock final', passedMock, 1),
    badge('project-done', 'Built a project', 'Wrote a main() that passed every test', builtProject, 1),
  ];
}

/** Earned first, then whatever is closest to being earned: the next one worth trying for. */
export function nextBadge(all: readonly Badge[]): Badge | null {
  const open = all.filter((b) => !b.earned && b.need > 0);
  if (open.length === 0) return null;
  return open.slice().sort((a, b) => (b.have / b.need) - (a.have / a.need) || a.need - b.need)[0];
}
