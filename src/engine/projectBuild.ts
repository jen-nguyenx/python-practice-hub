// Building a project end to end, in the order you would actually do it.
//
// The app already had every piece of a project — a helper to write, a main() to assemble, hidden tests,
// the rules — but scattered as separate questions in a scenario, which is exactly how a student ends up
// writing main() first and discovering the decomposition afterwards. This puts them back in order and
// says why the order is the order.
//
// Like lesson mode, it is an arrangement of content that already exists rather than new content: the
// stages are derived from the scenario, so a scenario that gains a helper gains a stage for free.
import type { Question, Scenario } from '../content/schema.ts';
import type { RuleId, TopicId } from '../content/ids.ts';
import type { AppEvent } from './types.ts';

export type StageKind = 'brief' | 'plan' | 'piece' | 'assemble' | 'check';

export interface BuildStage {
  kind: StageKind;
  /** Short label for the rail. */
  label: string;
  title: string;
  /** The question to go and do, for a piece or the assembly. */
  qid?: string;
  /** What this stage is for, in a sentence. */
  blurb: string;
}

export interface ProjectBuild {
  scenarioId: string;
  topicId: TopicId;
  title: string;
  story: string;
  stages: BuildStage[];
  /** Every rule the project question declares, so the last stage can say what was enforced. */
  rules: RuleId[];
}

const isWrite = (q: Question): boolean => q.format === 'write';
const kindOf = (q: Question): string | undefined => (q as { kind?: string }).kind;

/**
 * The stages for a scenario, or null when it is not a project scenario at all.
 *
 * A scenario earns a build when it ends in something whole — a `main()` — because that is what makes the
 * helpers before it worth writing first.
 */
export function projectBuild(scenario: Scenario, topicId: TopicId): ProjectBuild | null {
  const writes = scenario.questions.filter(isWrite);
  const mains = writes.filter((q) => kindOf(q) === 'project');
  if (mains.length === 0) return null;
  const helpers = writes.filter((q) => kindOf(q) !== 'project');

  const stages: BuildStage[] = [{
    kind: 'brief',
    label: 'The brief',
    title: 'Read it twice before you write anything',
    blurb: 'What it must return, what counts as a bad row, and what the rules forbid. Most lost marks are decided here, not in the code.',
  }];

  // The plan is worth its own stage even when there is only one piece: deciding what the pieces are is
  // the part of the work that the marking rubric calls style and that nobody teaches.
  stages.push({
    kind: 'plan',
    label: 'Plan it',
    title: 'Decide the pieces before you write them',
    blurb: helpers.length > 0
      ? 'One job per function, each testable on its own, and main() left to do the reading and the assembling.'
      : 'Even a single main() is easier written as a few small jobs in order: read, clean, calculate, return.',
  });

  helpers.forEach((q, i) => {
    stages.push({
      kind: 'piece',
      label: `Piece ${i + 1}`,
      title: q.title,
      qid: q.id,
      blurb: 'Write it on its own and let the tests say whether it works, before anything depends on it.',
    });
  });

  mains.forEach((q, i) => {
    stages.push({
      kind: 'assemble',
      label: mains.length > 1 ? `Assemble ${i + 1}` : 'Assemble',
      title: q.title,
      qid: q.id,
      blurb: 'Now main(): open the file once, use the pieces you already trust, and return what the brief asked for.',
    });
  });

  stages.push({
    kind: 'check',
    label: 'Check it',
    title: 'What a marker looks at',
    blurb: 'The rules are not style advice — each one is worth marks, and breaking one can cost all of them.',
  });

  const rules = [...new Set(mains.flatMap((q) => (q as { rules?: RuleId[] }).rules ?? []))];
  return { scenarioId: scenario.id, topicId, title: scenario.title, story: scenario.story, stages, rules };
}

/** Question ids solved without revealing the answer. */
export function solvedIds(events: readonly AppEvent[]): Set<string> {
  const revealed = new Set<string>();
  for (const e of events) if (e.type === 'reveal') revealed.add(e.qid);
  const out = new Set<string>();
  for (const e of events) {
    if (e.type !== 'attempt' || !e.correct || e.revealed) continue;
    if (!revealed.has(e.qid)) out.add(e.qid);
  }
  return out;
}

export interface BuildProgress {
  /** How many stages carrying a question are done. */
  done: number;
  /** How many stages carry a question at all. */
  total: number;
  /** The first stage that is not finished, for "pick up where you left off". */
  nextIndex: number;
}

export function buildProgress(build: ProjectBuild, solved: ReadonlySet<string>): BuildProgress {
  const coding = build.stages.filter((s) => s.qid);
  const done = coding.filter((s) => solved.has(s.qid as string)).length;
  const nextIndex = build.stages.findIndex((s) => s.qid && !solved.has(s.qid));
  return { done, total: coding.length, nextIndex: nextIndex < 0 ? build.stages.length - 1 : nextIndex };
}
