// Plain-language words and generated sentences for the report. Pure; unit-tested in words.test.ts.
import type { MistakeCategory, RuleId, TopicId } from '../../content/ids.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData, Rung } from '../../engine/report.ts';
import { toPercent } from './format.ts';

export const CATEGORY_ORDER: readonly MistakeCategory[] = ['conceptual', 'strategic', 'project', 'style', 'syntax'];

export const CATEGORY_LABEL: Record<MistakeCategory, string> = {
  conceptual: 'Misunderstandings',
  strategic: 'Strategy',
  project: 'Project rules',
  style: 'Style',
  syntax: 'Typos',
};

export const CATEGORY_BLURB: Record<MistakeCategory, string> = {
  conceptual: 'Ideas about how Python works that lead to wrong answers.',
  strategic: 'The code runs, but the plan or the shape of the answer is off.',
  project: 'CITS1401 project and exam rules that cost marks.',
  style: 'Works, but harder to read or easy to break later.',
  syntax: 'Small slips such as a missing colon. Quick to fix.',
};

export const RULE_LABEL: Record<RuleId, { title: string; why: string }> = {
  noImport: { title: 'No import statements', why: 'Projects and exams ban imports; a banned import can score zero.' },
  noInput: { title: 'No input() in submitted functions', why: 'The marker calls your function directly; input() makes it hang.' },
  noPrint: { title: 'Return values instead of printing', why: 'Automated marking reads the return value, not the screen.' },
  roundAtEnd: { title: 'Round only at the end', why: 'Rounding mid-calculation changes the final answer.' },
  noCsvExt: { title: 'Use the file name as given', why: 'Adding ".csv" yourself breaks when the marker passes a full name.' },
  noLoops: { title: 'No loops in recursion questions', why: 'Exam recursion questions forbid loops entirely.' },
  mainSignature: { title: 'main() has the required parameters', why: 'The marker calls main with the exact arguments in the spec.' },
};

const RUNG_DOING: Record<Rung, string> = {
  read: 'reading and tracing code',
  repair: 'fixing and completing code',
  write: 'writing code from scratch',
};

const RUNG_NEXT: Record<Rung, string> = {
  read: 'Slow down on Predict the output and trace tables there: say what each line does before you answer.',
  repair: 'Try the Fix the bug and Parsons puzzle questions there next.',
  write: 'Parsons puzzles and fill-in-the-blank questions there build up to writing it yourself.',
};

export interface LadderGap { topicId: TopicId; strong: Rung; weak: Rung; strongPct: number; weakPct: number; text: string }

/** Minimum gap, in percentage points, between a topic's best and worst rung before it is worth a sentence. */
export const LADDER_GAP_POINTS = 25;

/** One sentence per notable read / repair / write gap, largest gaps first. */
export function ladderGaps(ladder: ReportData['ladder'], limit = 4): LadderGap[] {
  const gaps: LadderGap[] = [];
  for (const row of ladder) {
    const vals = (['read', 'repair', 'write'] as const)
      .map((r) => ({ r, p: toPercent(row[r]) }))
      .filter((x): x is { r: Rung; p: number } => x.p !== null);
    if (vals.length < 2) continue;
    const hi = vals.reduce((a, b) => (b.p > a.p ? b : a));
    const lo = vals.reduce((a, b) => (b.p < a.p ? b : a));
    if (hi.p - lo.p < LADDER_GAP_POINTS) continue;
    const name = TOPIC_BY_ID[row.topicId]?.title ?? row.topicId;
    const how = hi.p >= 80 ? 'goes well' : 'is stronger';
    const text = `In ${name}, ${RUNG_DOING[hi.r]} ${how} (${Math.round(hi.p)}%) but ${RUNG_DOING[lo.r]} lands at ${Math.round(lo.p)}%. ${RUNG_NEXT[lo.r]}`;
    gaps.push({ topicId: row.topicId, strong: hi.r, weak: lo.r, strongPct: hi.p, weakPct: lo.p, text });
  }
  return gaps.sort((a, b) => (b.strongPct - b.weakPct) - (a.strongPct - a.weakPct)).slice(0, limit);
}

/** Kind, specific notes for non-zero behaviour counts only. */
export function behaviourNotes(b: ReportData['behaviour']): { key: keyof ReportData['behaviour']; text: string }[] {
  const out: { key: keyof ReportData['behaviour']; text: string }[] = [];
  const q = (n: number) => (n === 1 ? '1 question' : `${n} questions`);
  if (b.rushed > 0) {
    out.push({ key: 'rushed', text: `You answered ${q(b.rushed)} much faster than usual and missed ${b.rushed === 1 ? 'it' : 'them'}; reading the prompt twice before checking usually fixes that.` });
  }
  if (b.stuckNoHint > 0) {
    out.push({ key: 'stuckNoHint', text: `You stayed stuck on ${q(b.stuckNoHint)} for a long time without opening a hint; Hint 1 only nudges, so it is worth a look after a few minutes.` });
  }
  if (b.hintSkims > 0) {
    out.push({ key: 'hintSkims', text: `You opened the next hint within a couple of seconds of the last one ${b.hintSkims === 1 ? 'once' : `${b.hintSkims} times`}; reading each hint properly often means you need fewer of them.` });
  }
  if (b.revealedWithoutExplain > 0) {
    out.push({ key: 'revealedWithoutExplain', text: `You revealed ${b.revealedWithoutExplain === 1 ? '1 answer' : `${b.revealedWithoutExplain} answers`} without writing why; a one-line explanation helps it stick.` });
  }
  return out;
}

/** "about 2 min" style typical fix time. */
export function fixTimeText(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null;
  const s = Math.round(ms / 1000);
  if (s < 60) return `about ${Math.max(1, s)} s to fix`;
  const m = Math.round(s / 60);
  if (m < 60) return `about ${m} min to fix`;
  return `over an hour to fix`;
}
