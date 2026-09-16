// STUB graders. Replaced by the engine-store agent. Keep signatures.
import type { MistakeId } from '../content/ids.ts';
import type {
  ClozeQuestion, ErrorTranslatorQuestion, FixBugQuestion, GeneratedQuestion, McqQuestion, MultiQuestion,
  ParsonsQuestion, PredictQuestion, RefactorQuestion, TestWriterQuestion, TraceQuestion, TwinsQuestion, WriteQuestion,
} from '../content/schema.ts';
import type { PairResult, TestsResult } from '../runtime/protocol.ts';
import type { GradeResult } from './types.ts';

const todo = (): GradeResult => ({ correct: false, score: 0, mistakes: [], feedback: 'Grader not implemented' });

/** CRLF->LF, strip trailing whitespace per line, drop trailing blank lines, map smart quotes/dashes to ASCII. */
export function normalizeOutput(s: string): string { return s; }

export function gradeMcq(q: McqQuestion, optionId: string): GradeResult { void q; void optionId; return todo(); }
export function gradeMulti(q: MultiQuestion, optionIds: string[]): GradeResult { void q; void optionIds; return todo(); }
export function gradePredict(q: PredictQuestion, answer: string, gen: GeneratedQuestion | undefined): GradeResult { void q; void answer; void gen; return todo(); }
export function gradeTrace(q: TraceQuestion, cells: string[][], gen: GeneratedQuestion | undefined): GradeResult & { cellOk: boolean[][] } { void q; void cells; void gen; return { ...todo(), cellOk: [] }; }
export function gradeTwins(q: TwinsQuestion, answer: { differs: boolean; outLeft: string; outRight: string }, gen: GeneratedQuestion | undefined): GradeResult & { parts: { differs: boolean; left: boolean; right: boolean } } { void q; void answer; void gen; return { ...todo(), parts: { differs: false, left: false, right: false } }; }
export function gradeErrorTranslator(q: ErrorTranslatorQuestion, answer: { line: number | null; exception: string | null; causeId: string | null }, gen: GeneratedQuestion | undefined): GradeResult & { parts: { line: boolean; exception: boolean; cause: boolean } } { void q; void answer; void gen; return { ...todo(), parts: { line: false, exception: false, cause: false } }; }
/** cloze, parsons, fixBug, write. usedDistractors: mistakes of Parsons distractor lines the student used. */
export function gradeFromTests(q: ClozeQuestion | ParsonsQuestion | FixBugQuestion | WriteQuestion, result: TestsResult, extra?: { usedDistractors?: MistakeId[] }): GradeResult { void q; void result; void extra; return todo(); }
export function gradeRefactor(q: RefactorQuestion, result: TestsResult): GradeResult { void q; void result; return todo(); }
export function gradeTestWriter(q: TestWriterQuestion, pair: PairResult): GradeResult { void q; void pair; return todo(); }
/** Build the program for a cloze question by substituting blanks. */
export function fillCloze(q: ClozeQuestion, answers: Record<string, string>): string { void answers; return q.template; }
/** Build the program from Parsons lines (student order + indents). */
export function assembleParsons(lines: { text: string; indent: number }[]): string { return lines.map((l) => '    '.repeat(l.indent) + l.text).join('\n'); }
/** Number of changed lines between two code strings (line-based diff). */
export function changedLineCount(before: string, after: string): number { void before; void after; return 0; }
