// Graders. Pure functions: read formats grade from pre-generated data, code formats from a TestsResult.
import type { MistakeId, RuleId } from '../content/ids.ts';
import type {
  ClozeQuestion, ErrorTranslatorQuestion, FixBugQuestion, GeneratedQuestion, McqQuestion, MultiQuestion,
  ParsonsQuestion, PredictQuestion, RefactorQuestion, TestWriterQuestion, TraceQuestion, TwinsQuestion, WriteQuestion,
} from '../content/schema.ts';
import type { PairResult, PyError, TestsResult } from '../runtime/protocol.ts';
import type { DetectionChannel, GradeResult } from './types.ts';
import { FLAG_TEXT } from './util/flagText.ts';
import { asciiPunctuation, joinAnd, mdToPlain, plural } from './util/text.ts';

type Mistakes = GradeResult['mistakes'];

/** Collects mistakes without duplicates (first channel wins). */
class MistakeSet {
  readonly list: Mistakes = [];
  add(id: MistakeId | undefined | null, channel: DetectionChannel) {
    if (!id) return;
    if (this.list.some((m) => m.id === id)) return;
    this.list.push({ id, channel });
  }
}

const MISSING_DATA = 'The answer data for this question is missing, so it cannot be checked yet.';

// ---------------------------------------------------------------------------------------------
// Output normalisation
// ---------------------------------------------------------------------------------------------

/** CRLF->LF, strip trailing whitespace per line, drop trailing blank lines, map smart quotes/dashes to ASCII. */
export function normalizeOutput(s: string): string {
  const lines = asciiPunctuation(String(s ?? '')).replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, ''));
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines.join('\n');
}

/** 1-based index of the first differing line of two normalised outputs, or null if equal. */
function firstDifferentLine(a: string, b: string): number | null {
  if (a === b) return null;
  const al = a.split('\n');
  const bl = b.split('\n');
  const n = Math.max(al.length, bl.length);
  for (let i = 0; i < n; i++) if (al[i] !== bl[i]) return i + 1;
  return null;
}

// ---------------------------------------------------------------------------------------------
// Read formats
// ---------------------------------------------------------------------------------------------

export function gradeMcq(q: McqQuestion, optionId: string): GradeResult {
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return { correct: false, score: 0, mistakes: [], feedback: 'Choose an answer first.' };
  const ms = new MistakeSet();
  if (!opt.correct) ms.add(opt.mistake, 'distractor');
  const why = mdToPlain(opt.why ?? '');
  return { correct: !!opt.correct, score: opt.correct ? 1 : 0, mistakes: ms.list, feedback: why || undefined };
}

export function gradeMulti(q: MultiQuestion, optionIds: string[]): GradeResult {
  const picked = new Set(optionIds);
  const correctOpts = q.options.filter((o) => o.correct);
  let tp = 0;
  let fp = 0;
  const ms = new MistakeSet();
  for (const o of q.options) {
    const isPicked = picked.has(o.id);
    if (isPicked && o.correct) tp++;
    else if (isPicked && !o.correct) {
      fp++;
      ms.add(o.mistake, 'distractor');
    } else if (!isPicked && o.correct) {
      // A correct option that carries a mistake names the misconception behind missing it.
      ms.add(o.mistake, 'distractor');
    }
  }
  const need = correctOpts.length;
  const score = need === 0 ? 0 : Math.max(0, tp - fp) / need;
  const correct = need > 0 && score === 1;
  let feedback: string;
  if (picked.size === 0) feedback = 'Select at least one option.';
  else if (correct) feedback = `All ${need} correct options chosen.`;
  else {
    feedback = `You chose ${tp} of the ${need} correct options`;
    feedback += fp > 0 ? ` and ${plural(fp, 'option')} that ${fp === 1 ? 'is' : 'are'} not correct.` : '.';
  }
  return { correct, score, mistakes: ms.list, feedback };
}

export function gradePredict(q: PredictQuestion, answer: string, gen: GeneratedQuestion | undefined): GradeResult {
  if (!gen || typeof gen.stdout !== 'string') return { correct: false, score: 0, mistakes: [], feedback: MISSING_DATA };
  const got = normalizeOutput(answer ?? '');
  const want = normalizeOutput(gen.stdout);
  if (got === want) return { correct: true, score: 1, mistakes: [], feedback: 'That is exactly what Python prints.' };
  const ms = new MistakeSet();
  const mutants = q.mutants ?? [];
  const outs = gen.mutantOutputs ?? [];
  let matchedMutant = false;
  for (let i = 0; i < mutants.length && i < outs.length; i++) {
    if (typeof outs[i] === 'string' && normalizeOutput(outs[i]) === got && got !== want) {
      ms.add(mutants[i].mistake, 'distractor');
      matchedMutant = true;
    }
  }
  let feedback: string;
  if (got === '' && want !== '') feedback = 'Type the output first.';
  else if (q.choice) feedback = matchedMutant ? 'That is a common wrong prediction. Look at the code again.' : 'Not quite.';
  else {
    const line = firstDifferentLine(got, want);
    feedback = line ? `Not quite. The first difference is on line ${line}.` : 'Not quite.';
  }
  return { correct: false, score: 0, mistakes: ms.list, feedback };
}

/** Canonical text for a trace cell: ASCII punctuation, no whitespace outside string literals, single-quoted strings. */
function canonCell(raw: string): string {
  const s = asciiPunctuation(raw).trim();
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      let content = '';
      while (j < s.length && s[j] !== ch) {
        if (s[j] === '\\' && j + 1 < s.length) {
          content += s[j] + s[j + 1];
          j += 2;
          continue;
        }
        content += s[j];
        j++;
      }
      if (j >= s.length) {
        out += s.slice(i).replace(/\s+/g, '');
        break;
      }
      const quote = ch === '"' && content.includes("'") ? '"' : "'";
      out += quote + content + quote;
      i = j + 1;
    } else if (/\s/.test(ch)) {
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

const SINGLE_STR = /^'(?:[^'\\]|\\.)*'$|^"(?:[^"\\]|\\.)*"$/;
const INT_LIT = /^[-+]?\d+$/;
const FLOAT_LIT = /^[-+]?(?:\d+\.\d*|\.\d+|\d+(?:\.\d*)?[eE][-+]?\d+|\d+\.\d*[eE][-+]?\d+)$/;
const NON_STRING_LITERAL = /^(?:[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?|True|False|None|[[({].*)$/;

/** Does a student's trace cell match the expected Python repr? */
export function traceCellMatches(student: string, expected: string): boolean {
  const st = asciiPunctuation(student ?? '').trim();
  const ex = asciiPunctuation(expected ?? '').trim();
  if (st === '') return false;
  const cs = canonCell(st);
  const ce = canonCell(ex);
  if (cs === ce) return true;
  // Floats written differently but exactly equal, e.g. 2.50 vs 2.5 (both must look like floats).
  if (FLOAT_LIT.test(cs) && FLOAT_LIT.test(ce) && Number(cs) === Number(ce)) return true;
  if (INT_LIT.test(cs) && INT_LIT.test(ce) && cs.replace(/^\+/, '') === ce.replace(/^\+/, '')) return true;
  // Quote-insensitive strings: hello matches 'hello'. A bare number/True/None does not match a string.
  if (SINGLE_STR.test(ex) && !SINGLE_STR.test(st) && !NON_STRING_LITERAL.test(st)) {
    return st === ex.slice(1, -1);
  }
  return false;
}

export function gradeTrace(q: TraceQuestion, cells: string[][], gen: GeneratedQuestion | undefined): GradeResult & { cellOk: boolean[][] } {
  const input = Array.isArray(cells) ? cells : [];
  const blankRow = (row: string[] | undefined) => !row || row.every((c) => (c ?? '').trim() === '');
  if (!gen || !Array.isArray(gen.traceRows)) {
    return { correct: false, score: 0, mistakes: [], feedback: MISSING_DATA, cellOk: input.map((r) => r.map(() => false)) };
  }
  const expected = gen.traceRows;
  const cols = Math.max(q.watch.length, ...expected.map((r) => r.length), 0);
  // Rows the student actually filled: ignore blank rows at the end of the grid.
  let studentRows = input.length;
  while (studentRows > 0 && blankRow(input[studentRows - 1])) studentRows--;

  const cellOk: boolean[][] = input.map((row, r) => {
    if (r >= expected.length) return row.map(() => r >= studentRows);
    return row.map((cell, c) => (c < expected[r].length ? traceCellMatches(cell ?? '', expected[r][c]) : false));
  });

  let good = 0;
  for (let r = 0; r < Math.min(studentRows, expected.length); r++) {
    for (let c = 0; c < expected[r].length; c++) if (cellOk[r]?.[c]) good++;
  }
  const denomRows = Math.max(studentRows, expected.length);
  const denom = denomRows * cols;
  const score = denom === 0 ? 0 : good / denom;
  const expectedCells = expected.reduce((n, r) => n + r.length, 0);
  const correct = studentRows === expected.length && good === expectedCells && expectedCells > 0;

  const ms = new MistakeSet();
  if (!correct) {
    const firstRowWrong = studentRows > 0 && expected.length > 0 && expected[0].some((_, c) => !cellOk[0]?.[c]);
    if (firstRowWrong) ms.add('accumulator_init', 'distractor');
    if (Math.abs(studentRows - expected.length) === 1 && studentRows > 0) ms.add('off_by_one_range', 'distractor');
  }

  let feedback: string;
  if (correct) feedback = 'Every cell is right.';
  else if (studentRows === 0) feedback = 'Fill in the table first.';
  else {
    const wrong = Math.min(studentRows, expected.length) * cols - good;
    const parts: string[] = [];
    if (wrong > 0) parts.push(`${plural(wrong, 'cell')} ${wrong === 1 ? 'is' : 'are'} not right`);
    if (studentRows < expected.length) parts.push('the table needs more rows');
    if (studentRows > expected.length) parts.push('the table has too many rows');
    feedback = parts.length ? `Not quite: ${joinAnd(parts)}.` : 'Not quite.';
  }
  return { correct, score, mistakes: ms.list, feedback, cellOk };
}

export function gradeTwins(q: TwinsQuestion, answer: { differs: boolean; outLeft: string; outRight: string }, gen: GeneratedQuestion | undefined): GradeResult & { parts: { differs: boolean; left: boolean; right: boolean } } {
  if (!gen?.twins) {
    return { correct: false, score: 0, mistakes: [], feedback: MISSING_DATA, parts: { differs: false, left: false, right: false } };
  }
  const t = gen.twins;
  const parts = {
    differs: answer.differs === t.differs,
    left: normalizeOutput(answer.outLeft ?? '') === normalizeOutput(t.outLeft),
    right: normalizeOutput(answer.outRight ?? '') === normalizeOutput(t.outRight),
  };
  const score = (parts.differs ? 0.5 : 0) + (parts.left ? 0.25 : 0) + (parts.right ? 0.25 : 0);
  const correct = parts.differs && parts.left && parts.right;
  const ms = new MistakeSet();
  if (!parts.differs) ms.add(q.mistake, 'distractor');
  let feedback: string;
  if (correct) feedback = 'Both outputs and the comparison are right.';
  else {
    const wrong: string[] = [];
    if (!parts.differs) wrong.push(t.differs ? 'they do print different things' : 'they print the same thing');
    if (!parts.left) wrong.push('the left output is not right');
    if (!parts.right) wrong.push('the right output is not right');
    feedback = `Not quite: ${joinAnd(wrong)}.`;
  }
  return { correct, score, mistakes: ms.list, feedback, parts };
}

export function gradeErrorTranslator(q: ErrorTranslatorQuestion, answer: { line: number | null; exception: string | null; causeId: string | null }, gen: GeneratedQuestion | undefined): GradeResult & { parts: { line: boolean; exception: boolean; cause: boolean } } {
  const cause = q.causes.find((c) => c.id === answer.causeId);
  const ms = new MistakeSet();
  if (cause && !cause.correct) ms.add(cause.mistake, 'distractor');
  if (!gen?.error) {
    const parts = { line: false, exception: false, cause: !!cause?.correct };
    return { correct: false, score: parts.cause ? 1 / 3 : 0, mistakes: ms.list, feedback: MISSING_DATA, parts };
  }
  const parts = {
    line: answer.line != null && answer.line === gen.error.line,
    exception: answer.exception != null && answer.exception.trim() === gen.error.type,
    cause: !!cause?.correct,
  };
  const n = (parts.line ? 1 : 0) + (parts.exception ? 1 : 0) + (parts.cause ? 1 : 0);
  const score = n / 3;
  const correct = n === 3;
  let feedback: string;
  if (correct) feedback = `Right: line ${gen.error.line} raises ${gen.error.type}, and you found the cause.`;
  else {
    const wrong: string[] = [];
    if (!parts.line) wrong.push(answer.line == null ? 'pick the line that raises' : 'a different line raises the error');
    if (!parts.exception) wrong.push(answer.exception == null ? 'pick the exception' : 'the exception type is different');
    if (!parts.cause) wrong.push(cause ? 'the cause is not right' : 'pick the cause');
    feedback = `${n} of 3 right: ${joinAnd(wrong)}.`;
  }
  return { correct, score, mistakes: ms.list, feedback, parts };
}

// ---------------------------------------------------------------------------------------------
// Code formats
// ---------------------------------------------------------------------------------------------

export const RULE_MISTAKE: Record<RuleId, MistakeId> = {
  noImport: 'import_used',
  noInput: 'input_called',
  noPrint: 'print_in_main',
  roundAtEnd: 'round_mid_calc',
  noCsvExt: 'csv_ext_assumed',
  noLoops: 'loop_in_recursion',
  mainSignature: 'missing_main',
};

function errorWhere(err: PyError): string {
  return err.line ? ` on line ${err.line}` : '';
}

function errorSummary(err: PyError): string {
  const msg = (err.message ?? '').split('\n')[0].trim();
  const short = msg.length > 120 ? msg.slice(0, 117) + '...' : msg;
  return short ? `${err.type}: ${short}` : err.type;
}

/**
 * Handles results where no tests ran (compile error, crashing top-level code, missing function).
 * Returns null when tests did run.
 */
function gradeNoTestsRun(result: TestsResult, ms: MistakeSet): GradeResult | null {
  if (result.compileError) {
    const err = result.compileError;
    for (const m of err.mistakes ?? []) ms.add(m, 'runtime');
    if (!err.mistakes?.length) ms.add(err.type === 'IndentationError' || err.type === 'TabError' ? 'indent_error' : 'syntax_other', 'runtime');
    return { correct: false, score: 0, mistakes: ms.list, feedback: `Python could not read your code${errorWhere(err)} (${errorSummary(err)}), so no tests were run.` };
  }
  if (result.topLevelError) {
    const err = result.topLevelError;
    for (const m of err.mistakes ?? []) ms.add(m, 'runtime');
    ms.add('top_level_code', 'runtime');
    let why: string;
    if (err.type === 'TimeoutError') why = 'ran for too long';
    else if (/input/i.test(err.type) || /input\(\)/.test(err.message ?? '')) why = 'asked for input';
    else why = `stopped with ${errorSummary(err)}`;
    return { correct: false, score: 0, mistakes: ms.list, feedback: `Code outside your functions ${why}${errorWhere(err)}, so no tests were run.` };
  }
  if (result.missingFunction) {
    ms.add('missing_function', 'static');
    if (result.missingFunction === 'main') ms.add('missing_main', 'static');
    return { correct: false, score: 0, mistakes: ms.list, feedback: `There is no function called ${result.missingFunction}, so no tests were run. Check the name is spelt exactly.` };
  }
  return null;
}

function addRuleViolations(result: TestsResult, ms: MistakeSet) {
  for (const v of result.ruleViolations ?? []) ms.add(RULE_MISTAKE[v.rule], 'static');
}

/** Detections that explain every failing test on their own; when present, per-test tags would misattribute the cause. */
const ROOT_CAUSE_DETECTIONS = new Set<string>(['print_vs_return', 'forgot_to_call', 'return_type_wrong', 'missing_function', 'top_level_code']);

function addOutcomeMistakes(result: TestsResult, ms: MistakeSet) {
  const outcomes = result.outcomes ?? [];
  // A test's tag names the mistake that test was designed to expose. Only trust it when the code otherwise works
  // (at least one test passes) and no root-cause detection already explains the failures.
  const rootCause = outcomes.some((o) => (o.detections ?? []).some((d) => ROOT_CAUSE_DETECTIONS.has(d)));
  const trustTags = (result.passed ?? 0) > 0 && !rootCause;
  for (const o of outcomes) {
    for (const d of o.detections ?? []) {
      if (d === o.tag && !trustTags) continue;
      ms.add(d, 'test');
    }
    if (!o.pass && !o.notRun) {
      if (trustTags) ms.add(o.tag, 'test');
      for (const m of o.error?.mistakes ?? []) ms.add(m, 'runtime');
    }
  }
}

function failingSummary(result: TestsResult): string {
  const total = result.total;
  const passed = result.passed;
  if (total === 0) return 'No tests were run.';
  if (passed === total) return `All ${plural(total, 'test')} passed.`;
  const failing = (result.outcomes ?? []).filter((o) => !o.pass);
  const ran = failing.filter((o) => !o.notRun);
  const labels = ran.map((o) => o.label).filter(Boolean);
  let text = `${passed} of ${plural(total, 'test')} passed.`;
  if (labels.length > 0) {
    const shown = labels.slice(0, 3).join(', ');
    text += ` Failing: ${shown}${labels.length > 3 ? ` and ${labels.length - 3} more` : ''}.`;
  }
  const timedOut = ran.find((o) => o.timedOut);
  if (timedOut) text += ' One test ran too long; check that every loop ends.';
  const notRun = failing.length - ran.length;
  if (notRun > 0) text += ` ${plural(notRun, 'test')} did not run.`;
  return text;
}

/** cloze, parsons, fixBug, write. usedDistractors: mistakes of Parsons distractor lines the student used. */
export function gradeFromTests(q: ClozeQuestion | ParsonsQuestion | FixBugQuestion | WriteQuestion, result: TestsResult, extra?: { usedDistractors?: MistakeId[] }): GradeResult {
  void q;
  const ms = new MistakeSet();
  for (const m of extra?.usedDistractors ?? []) ms.add(m, 'distractor');
  const early = gradeNoTestsRun(result, ms);
  if (early) {
    addRuleViolations(result, ms);
    return early;
  }
  addOutcomeMistakes(result, ms);
  addRuleViolations(result, ms);
  const total = result.total;
  const violations = result.ruleViolations ?? [];
  const allPass = total > 0 && result.passed === total;
  let score = total > 0 ? result.passed / total : 0;
  // Breaking an exam/project rule costs heavily in CITS1401 marking: halve the score.
  if (violations.length > 0) score *= 0.5;
  const correct = allPass && violations.length === 0;
  let feedback = failingSummary(result);
  if (violations.length > 0) {
    const first = violations[0];
    const msg = (first.message ?? '').trim().replace(/[.\s]+$/, '');
    feedback += ` ${allPass ? 'But the' : 'The'} code breaks ${violations.length === 1 ? 'a rule' : `${violations.length} rules`}: ${msg}${first.line ? ` (line ${first.line})` : ''}.`;
  }
  return { correct, score, mistakes: ms.list, feedback };
}

export function gradeRefactor(q: RefactorQuestion, result: TestsResult): GradeResult {
  const ms = new MistakeSet();
  const early = gradeNoTestsRun(result, ms);
  if (early) return early;
  addOutcomeMistakes(result, ms);
  addRuleViolations(result, ms);
  const total = result.total;
  const allPass = total > 0 && result.passed === total;
  const present = new Set((result.flags ?? []).map((f) => f.flag));
  const stillThere = q.mustRemove.filter((f) => present.has(f));
  const missing = (q.mustAdd ?? []).filter((f) => !present.has(f));
  if (allPass && stillThere.length === 0 && missing.length === 0) {
    return { correct: true, score: 1, mistakes: ms.list, feedback: `All ${plural(total, 'test')} still pass and the code uses the better pattern.` };
  }
  if (allPass) {
    const parts: string[] = [];
    if (stillThere.length) parts.push(`still has ${joinAnd(stillThere.map((f) => FLAG_TEXT[f]))}`);
    if (missing.length) parts.push(`does not use ${joinAnd(missing.map((f) => FLAG_TEXT[f]))} yet`);
    return { correct: false, score: 0.5, mistakes: ms.list, feedback: `All tests pass, but the code ${parts.join(' and ')}.` };
  }
  const score = total > 0 ? (result.passed / total) * 0.5 : 0;
  return { correct: false, score, mistakes: ms.list, feedback: `${failingSummary(result)} A refactor must keep the behaviour the same.` };
}

export function gradeTestWriter(q: TestWriterQuestion, pair: PairResult): GradeResult {
  if (!pair.validArgs) {
    const detail = pair.parseError ? ` (${pair.parseError.split('\n')[0]})` : '';
    return {
      correct: false, score: 0, mistakes: [],
      feedback: `That is not a valid argument tuple${detail}. Write it like ${q.argsExample}, with a comma after a single argument.`,
    };
  }
  const outcome = (r: string) => (/^raises\b/.test(r) ? r : `returns ${r}`);
  if (pair.differs) {
    return {
      correct: true, score: 1, mistakes: [],
      feedback: `Found it: the correct version ${outcome(pair.refResult)} but the buggy one ${outcome(pair.bugResult)}.`,
    };
  }
  return { correct: false, score: 0, mistakes: [], feedback: `Both versions ${outcome(pair.refResult).replace(/^returns/, 'return').replace(/^raises/, 'raise')} for these arguments. Try a different input, such as an edge case.` };
}

// ---------------------------------------------------------------------------------------------
// Program builders and diff
// ---------------------------------------------------------------------------------------------

/** Build the program for a cloze question by substituting blanks. */
export function fillCloze(q: ClozeQuestion, answers: Record<string, string>): string {
  return q.template.replace(/⟦([^⟦⟧]+)⟧/g, (_m, id: string) => {
    const a = answers?.[id.trim()];
    return typeof a === 'string' ? a.replace(/^[ \t]+|[ \t]+$/g, '') : '';
  });
}

/** Build the program from Parsons lines (student order + indents). */
export function assembleParsons(lines: { text: string; indent: number }[]): string {
  return lines.map((l) => '    '.repeat(Math.max(0, Math.floor(l.indent) || 0)) + l.text.replace(/^\s+/, '')).join('\n');
}

/** Number of changed lines between two code strings (line-based diff). Blank lines and trailing spaces are ignored. */
export function changedLineCount(before: string, after: string): number {
  const prep = (s: string) => (s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l !== '');
  let a = prep(before);
  let b = prep(after);
  // Trim common prefix and suffix so the DP only covers the edited middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  a = a.slice(start, endA);
  b = b.slice(start, endB);
  if (a.length === 0 || b.length === 0) return Math.max(a.length, b.length);
  if (a.length * b.length > 4_000_000) return Math.max(a.length, b.length);
  let prev = new Array<number>(b.length + 1).fill(0);
  let cur = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    [prev, cur] = [cur, prev];
  }
  const lcs = prev[b.length];
  return Math.max(a.length - lcs, b.length - lcs);
}
