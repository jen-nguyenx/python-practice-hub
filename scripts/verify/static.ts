// Schema and authoring-rule checks that need no Python.
import {
  AST_FLAGS, CODE_FORMATS, DIFFS, EXAM_SLOT_IDS, EXAM_SLOT_MARKS, FORMATS, MISTAKE_IDS, PATTERN_IDS, RULE_IDS,
} from '../../src/content/ids.ts';
import type { Format } from '../../src/content/ids.ts';
import type { Question, Test, Topic } from '../../src/content/schema.ts';
import { MIX } from './mix.ts';
import type { Issues, Scope } from './report.ts';
import { scope } from './report.ts';

export interface TopicInfo {
  id: string;
  num: string;
  order: number;
  minimum: { solve: number; code: number };
  /** Skip the CONTENT.md mix table comparison (fixtures). */
  skipMix?: boolean;
}

const MISTAKES = new Set<string>(MISTAKE_IDS);
const FLAGS = new Set<string>(AST_FLAGS);
const PATTERNS = new Set<string>(PATTERN_IDS);
const RULES = new Set<string>(RULE_IDS);
const FORMAT_SET = new Set<string>(FORMATS);
const DIFF_SET = new Set<string>(DIFFS);
export const TESTED_FORMATS: readonly Format[] = ['cloze', 'parsons', 'fixBug', 'write', 'refactor'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const PROJECT_RULES = ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt'] as const;

type Loose = Record<string, unknown>;
const isStr = (v: unknown): v is string => typeof v === 'string';
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const quote = (s: string) => JSON.stringify(s);

export function questionsOf(topic: Topic): Question[] {
  return arr(topic?.scenarios).flatMap((s) => arr((s as Loose)?.questions) as Question[]);
}

export function isStub(topic: Topic): boolean {
  return arr(topic?.scenarios).length === 0;
}

function checkMistake(sc: Scope, value: unknown, what: string): void {
  if (value === undefined) return;
  if (!isStr(value) || !MISTAKES.has(value)) {
    sc.error(`${what} ${quote(String(value))} is not a mistake id from MISTAKE_IDS in src/content/ids.ts`);
  }
}

function checkTests(sc: Scope, q: Loose, tests: unknown): void {
  const list = arr(tests) as Loose[];
  if (!Array.isArray(tests)) {
    sc.error('tests must be an array');
    return;
  }
  const visible = list.filter((t) => t && t.hidden === false).length;
  const hidden = list.filter((t) => t && t.hidden === true).length;
  if (visible < 2 || hidden < 2) {
    sc.error(`needs at least 2 visible and 2 hidden tests (has ${visible} visible, ${hidden} hidden)`);
  }
  const ids = new Set<string>();
  const hasFn = nonEmpty(q.fnName);
  for (const [i, t] of list.entries()) {
    const name = nonEmpty(t?.id) ? `test ${t.id}` : `test #${i + 1}`;
    if (!t || typeof t !== 'object') {
      sc.error(`${name} is not an object`);
      continue;
    }
    if (!nonEmpty(t.id)) sc.error(`${name} has no id`);
    else if (ids.has(t.id)) sc.error(`${name}: duplicate test id`);
    else ids.add(t.id);
    if (!nonEmpty(t.label)) sc.error(`${name} has no label (shown for hidden tests)`);
    if (typeof t.hidden !== 'boolean') sc.error(`${name}: hidden must be true or false`);
    checkMistake(sc, t.tag, `${name} tag`);
    if (t.call !== undefined) {
      if (!nonEmpty(t.call)) sc.error(`${name}: call is empty`);
      if (!nonEmpty(t.expect)) sc.error(`${name}: expect (Python repr of the return value) is required when call is set`);
      if (t.expectStdout !== undefined) sc.warn(`${name}: expectStdout is ignored for tests with a call`);
    } else {
      if (!isStr(t.expectStdout)) {
        sc.error(`${name}: needs either call + expect (function test) or expectStdout (program test)`);
      }
      if (t.expect !== undefined) sc.error(`${name}: expect is set but call is missing`);
      if (hasFn && q.format !== 'write') sc.warn(`${name}: question has fnName but this test has no call`);
    }
    if (t.cmp !== undefined && !['eq', 'float', 'unordered'].includes(String(t.cmp))) {
      sc.error(`${name}: cmp must be 'eq', 'float' or 'unordered'`);
    }
    if (t.tol !== undefined && !(typeof t.tol === 'number' && t.tol > 0)) sc.error(`${name}: tol must be a positive number`);
    if (t.stdin !== undefined && !(Array.isArray(t.stdin) && t.stdin.every(isStr))) sc.error(`${name}: stdin must be string[]`);
    if (t.files !== undefined) {
      if (!Array.isArray(t.files)) sc.error(`${name}: files must be an array`);
      else for (const f of t.files as Loose[]) {
        if (!nonEmpty(f?.name) || !isStr(f?.content)) sc.error(`${name}: every file needs a name and string content`);
      }
    }
    if (t.argsUnchanged !== undefined) {
      if (!Array.isArray(t.argsUnchanged) || !t.argsUnchanged.every(nonEmpty)) sc.error(`${name}: argsUnchanged must be string[]`);
      if (!nonEmpty(t.setup)) sc.error(`${name}: argsUnchanged needs setup that defines those names`);
    }
  }
}

function checkOptions(sc: Scope, q: Loose, multi: boolean): void {
  const options = arr(q.options) as Loose[];
  const n = options.length;
  if (!multi) {
    if (n < 2 || n > 5) sc.error(`needs 2 (true/false) or 3-5 options, has ${n}`);
    else if (n !== 2 && n !== 4) sc.warn(`has ${n} options; CONTENT.md asks for 4 (or 2 for true/false)`);
  } else if (n < 4 || n > 5) {
    if (n < 3) sc.error(`needs 4-5 options, has ${n}`);
    else sc.warn(`has ${n} options; CONTENT.md asks for 4-5`);
  }
  const ids = new Set<string>();
  let correct = 0;
  for (const [i, o] of options.entries()) {
    const name = nonEmpty(o?.id) ? `option ${o.id}` : `option #${i + 1}`;
    if (!nonEmpty(o?.id)) sc.error(`${name} has no id`);
    else if (ids.has(o.id)) sc.error(`${name}: duplicate option id`);
    else ids.add(o.id);
    if (!nonEmpty(o?.text)) sc.error(`${name} has no text`);
    if (!nonEmpty(o?.why)) sc.error(`${name} needs a why (explanation shown after answering)`);
    if (o?.correct === true) correct++;
    if (multi && typeof o?.correct !== 'boolean') sc.error(`${name}: correct must be true or false in a multi question`);
    checkMistake(sc, o?.mistake, `${name} mistake`);
    if (o?.correct === true && o?.mistake !== undefined) sc.warn(`${name} is correct but also names a mistake`);
  }
  if (!multi && correct !== 1) sc.error(`needs exactly one option with correct: true (has ${correct})`);
  if (multi && correct < 2) sc.error(`needs at least 2 correct options (has ${correct})`);
  if (multi && correct === n && n > 0) sc.warn('every option is correct');
}

function expectedSecCheck(sc: Scope, q: Loose): void {
  const sec = q.expectedSec;
  if (typeof sec !== 'number' || !(sec > 0)) {
    sc.error('expectedSec must be a positive number of seconds');
    return;
  }
  const d = q.diff;
  if (d === 'easy' && sec > 120) sc.warn(`expectedSec ${sec} is long for easy (easy is <= 120 s)`);
  if (d === 'medium' && (sec < 120 || sec > 360)) sc.warn(`expectedSec ${sec} does not match medium (120-360 s)`);
  if (d === 'hard' && (sec < 360 || sec > 900)) sc.warn(`expectedSec ${sec} does not match hard (360-900 s)`);
}

export function checkQuestionStatic(issues: Issues, info: TopicInfo, scenarioId: string, q: Question): void {
  const lq = q as unknown as Loose;
  const qid = nonEmpty(lq.id) ? lq.id : `${scenarioId}-q?`;
  const fmt = isStr(lq.format) ? lq.format : undefined;
  const sc = scope(issues, info.id, qid, fmt);

  if (!nonEmpty(lq.id)) sc.error('question has no id');
  else if (!new RegExp(`^${scenarioId}-q[1-9][0-9]*$`).test(lq.id)) {
    sc.error(`id must look like ${scenarioId}-qM (scenario id + "-q" + number)`);
  }
  if (!fmt || !FORMAT_SET.has(fmt)) {
    sc.error(`format ${quote(String(lq.format))} is not one of ${FORMATS.join(', ')}`);
    return;
  }
  if (!isStr(lq.diff) || !DIFF_SET.has(lq.diff)) sc.error(`diff must be easy, medium or hard`);
  if (typeof lq.core !== 'boolean') sc.error('core must be true or false');
  if (!nonEmpty(lq.title)) sc.error('title is empty');
  if (!nonEmpty(lq.prompt)) sc.error('prompt is empty');
  if (!Array.isArray(lq.concepts) || lq.concepts.length === 0) sc.warn('concepts is empty');
  else for (const c of lq.concepts) {
    if (!isStr(c) || !KEBAB.test(c)) sc.warn(`concept ${quote(String(c))} should be kebab-case`);
  }
  if (!Array.isArray(lq.detects)) sc.error('detects must be an array of mistake ids');
  else for (const m of lq.detects) checkMistake(sc, m, 'detects entry');
  expectedSecCheck(sc, lq);

  const hints = lq.hints;
  if (!Array.isArray(hints) || hints.length !== 3) {
    sc.error(`hints must have exactly 3 entries (has ${Array.isArray(hints) ? hints.length : 'none'})`);
  } else {
    hints.forEach((h, i) => {
      if (!nonEmpty(h)) sc.error(`hint ${i + 1} is empty`);
    });
  }
  const solution = lq.solution as Loose | undefined;
  if (!solution || typeof solution !== 'object') sc.error('solution is missing');
  else {
    if (!nonEmpty(solution.explanation)) sc.error('solution.explanation is empty');
    if ((CODE_FORMATS as readonly string[]).includes(fmt) && !nonEmpty(solution.code)) {
      sc.error(`solution.code is required for ${fmt} questions`);
    }
  }
  if (lq.selfExplain !== undefined && !nonEmpty(lq.selfExplain)) sc.warn('selfExplain is empty');

  if (TESTED_FORMATS.includes(fmt as Format)) checkTests(sc, lq, lq.tests);
  if (lq.fnName !== undefined && !(nonEmpty(lq.fnName) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(lq.fnName))) {
    sc.error('fnName must be a Python identifier');
  }

  switch (fmt) {
    case 'mcq':
      checkOptions(sc, lq, false);
      break;
    case 'multi':
      checkOptions(sc, lq, true);
      break;
    case 'predict': {
      if (!nonEmpty(lq.code)) sc.error('code is empty');
      else if (lq.code.includes('\t')) sc.error('code contains a tab character; use 4 spaces');
      const mutants = arr(lq.mutants) as Loose[];
      if (lq.mutants !== undefined && !Array.isArray(lq.mutants)) sc.error('mutants must be an array');
      for (const [i, m] of mutants.entries()) {
        if (!nonEmpty(m?.code)) sc.error(`mutant ${i + 1} has no code`);
        checkMistake(sc, m?.mistake, `mutant ${i + 1} mistake`);
        if (m?.mistake === undefined) sc.error(`mutant ${i + 1} needs a mistake`);
      }
      if (mutants.length === 0) sc.warn('no mutants; add 1-3 so wrong answers can be diagnosed');
      if (mutants.length > 3) sc.warn(`has ${mutants.length} mutants; CONTENT.md asks for 1-3`);
      if (lq.choice === true && mutants.length === 0) sc.error('choice: true needs at least one mutant (choices are built from mutant outputs)');
      if (lq.diff === 'easy' && lq.choice !== true) sc.warn('easy predict items should set choice: true');
      if (lq.stdin !== undefined && !(Array.isArray(lq.stdin) && lq.stdin.every(isStr))) sc.error('stdin must be string[]');
      break;
    }
    case 'trace': {
      if (!nonEmpty(lq.code)) sc.error('code is empty');
      const watch = lq.watch;
      if (!Array.isArray(watch) || watch.length === 0 || !watch.every(nonEmpty)) sc.error('watch must list at least one variable name');
      else if (watch.length > 3) sc.warn(`watch has ${watch.length} names; CONTENT.md asks for 2-3`);
      const lines = isStr(lq.code) ? lq.code.split('\n').length : 0;
      if (typeof lq.anchorLine !== 'number' || !Number.isInteger(lq.anchorLine) || lq.anchorLine < 1 || lq.anchorLine > lines) {
        sc.error(`anchorLine must be a line number between 1 and ${lines}`);
      } else if (isStr(lq.code) && !lq.code.split('\n')[lq.anchorLine - 1]?.trim()) {
        sc.error(`anchorLine ${lq.anchorLine} is a blank line`);
      }
      break;
    }
    case 'twins':
      if (!nonEmpty(lq.left) || !nonEmpty(lq.right)) sc.error('left and right snippets are both required');
      else if (lq.left === lq.right) sc.error('left and right are identical');
      checkMistake(sc, lq.mistake, 'mistake');
      if (lq.mistake === undefined) sc.error('mistake is required');
      break;
    case 'errorTranslator': {
      if (!nonEmpty(lq.code)) sc.error('code is empty');
      const opts = lq.exceptionOptions;
      if (!Array.isArray(opts) || !opts.every(nonEmpty)) sc.error('exceptionOptions must be a list of exception names');
      else {
        if (opts.length !== 4) sc.warn(`exceptionOptions has ${opts.length} names; CONTENT.md asks for 4`);
        if (new Set(opts).size !== opts.length) sc.error('exceptionOptions has duplicates');
      }
      const causes = arr(lq.causes) as Loose[];
      const correct = causes.filter((c) => c?.correct === true).length;
      if (correct !== 1) sc.error(`causes need exactly one correct: true (has ${correct})`);
      if (causes.length !== 3) sc.warn(`has ${causes.length} causes; CONTENT.md asks for 3`);
      const ids = new Set<string>();
      for (const [i, c] of causes.entries()) {
        if (!nonEmpty(c?.id)) sc.error(`cause #${i + 1} has no id`);
        else if (ids.has(c.id)) sc.error(`cause ${c.id}: duplicate id`);
        else ids.add(c.id);
        if (!nonEmpty(c?.text)) sc.error(`cause #${i + 1} has no text`);
        checkMistake(sc, c?.mistake, `cause #${i + 1} mistake`);
      }
      break;
    }
    case 'cloze': {
      if (!nonEmpty(lq.template)) {
        sc.error('template is empty');
        break;
      }
      const markers = [...lq.template.matchAll(/⟦([^⟧]*)⟧/g)].map((m) => m[1]);
      const blanks = arr(lq.blanks) as Loose[];
      if (blanks.length < 1 || blanks.length > 3) sc.warn(`has ${blanks.length} blanks; CONTENT.md asks for 1-3`);
      const blankIds = blanks.map((b) => String(b?.id));
      for (const id of blankIds) {
        const n = markers.filter((m) => m === id).length;
        if (n !== 1) sc.error(`blank ${quote(id)} must appear exactly once in the template as ⟦${id}⟧ (found ${n})`);
      }
      for (const m of new Set(markers)) {
        if (!blankIds.includes(m)) sc.error(`template marker ⟦${m}⟧ has no matching blank`);
      }
      for (const b of blanks) {
        if (!Array.isArray(b?.accept) || b.accept.length === 0 || !b.accept.every(isStr)) {
          sc.error(`blank ${quote(String(b?.id))} needs a non-empty accept list of strings`);
        } else if (b.accept.some((a: string) => !a.trim())) {
          sc.error(`blank ${quote(String(b?.id))} accepts an empty string`);
        }
      }
      break;
    }
    case 'parsons': {
      const lines = arr(lq.lines) as Loose[];
      const distractors = arr(lq.distractors) as Loose[];
      if (lines.length < 4 || lines.length > 8) sc.warn(`has ${lines.length} lines; CONTENT.md asks for 4-8`);
      if (distractors.length < 1 || distractors.length > 2) sc.warn(`has ${distractors.length} distractors; CONTENT.md asks for 1-2`);
      for (const [i, l] of [...lines, ...distractors].entries()) {
        if (!nonEmpty(l?.text)) sc.error(`line #${i + 1} has no text`);
        else if (l.text !== l.text.trim()) sc.error(`line ${quote(l.text)} must not start or end with spaces (use indent)`);
        if (!(typeof l?.indent === 'number' && Number.isInteger(l.indent) && l.indent >= 0)) sc.error(`line #${i + 1}: indent must be 0, 1, 2...`);
      }
      for (const [i, d] of distractors.entries()) {
        checkMistake(sc, d?.mistake, `distractor ${i + 1} mistake`);
        if (d?.mistake === undefined) sc.error(`distractor ${i + 1} needs a mistake`);
        if (lines.some((l) => l?.text === d?.text && l?.indent === d?.indent)) sc.error(`distractor ${quote(String(d?.text))} is identical to a correct line`);
      }
      if (typeof lq.indentMatters !== 'boolean') sc.error('indentMatters must be true or false');
      else if (lq.diff !== 'easy' && lq.indentMatters === false) sc.warn('medium/hard Parsons items should set indentMatters: true');
      break;
    }
    case 'fixBug':
      if (!nonEmpty(lq.buggy)) sc.error('buggy code is empty');
      checkMistake(sc, lq.bugMistake, 'bugMistake');
      if (lq.bugMistake === undefined) sc.error('bugMistake is required');
      if (typeof lq.maxChangedLines !== 'number' || lq.maxChangedLines < 1) sc.error('maxChangedLines must be a number >= 1');
      else if (lq.maxChangedLines > 2) sc.warn(`maxChangedLines ${lq.maxChangedLines}; CONTENT.md asks for 1-2`);
      break;
    case 'write': {
      if (!['function', 'program', 'project'].includes(String(lq.kind))) sc.error(`kind must be function, program or project`);
      if ((lq.kind === 'function' || lq.kind === 'project') && !nonEmpty(lq.fnName)) sc.error(`kind ${lq.kind} needs fnName`);
      if (!isStr(lq.starter)) sc.error('starter must be a string (may be empty)');
      if (lq.mode !== undefined && lq.mode !== 'practice' && lq.mode !== 'paper') sc.error(`mode must be 'practice' or 'paper'`);
      if (lq.mode === 'paper' && !(typeof lq.marks === 'number' && lq.marks >= 5 && lq.marks <= 20)) {
        sc.warn('paper items should set marks between 5 and 20');
      }
      // A question that claims a final-paper slot has to be a paper item worth that slot's marks,
      // otherwise a mock exam built from the slots would not add up to 100.
      if (lq.examSlot !== undefined) {
        if (!isStr(lq.examSlot) || !(EXAM_SLOT_IDS as readonly string[]).includes(lq.examSlot)) {
          sc.error(`examSlot ${quote(String(lq.examSlot))} is not in EXAM_SLOT_IDS`);
        } else if (lq.mode !== 'paper') {
          sc.error('examSlot is only for paper-mode write questions');
        } else {
          const want = EXAM_SLOT_MARKS[lq.examSlot as keyof typeof EXAM_SLOT_MARKS];
          if (lq.marks !== want) sc.error(`examSlot ${lq.examSlot} must carry marks ${want}, not ${String(lq.marks)}`);
        }
      }
      if (lq.rules !== undefined) {
        if (!Array.isArray(lq.rules)) sc.error('rules must be an array');
        else for (const r of lq.rules) if (!isStr(r) || !RULES.has(r)) sc.error(`rule ${quote(String(r))} is not in RULE_IDS`);
      }
      const tests = arr(lq.tests) as Loose[];
      if (lq.kind === 'program' && tests.some((t) => t?.call !== undefined)) sc.warn('program questions compare stdout; tests should not have call');
      if (lq.kind === 'function' && tests.some((t) => t?.call === undefined)) sc.warn('function questions should call fnName in every test');
      if (lq.kind === 'project') {
        if (lq.fnName !== 'main') sc.warn(`project items should use fnName 'main' (has ${quote(String(lq.fnName))})`);
        const rules = arr(lq.rules);
        const missing = PROJECT_RULES.filter((r) => !rules.includes(r));
        if (missing.length) sc.warn(`project items should include rules ${missing.join(', ')}`);
        if (!tests.some((t) => Array.isArray(t?.files) && t.files.length > 0)) sc.warn('project tests should supply virtual files');
      }
      if (lq.diff === 'hard' && !tests.some((t) => t?.hidden === true && t?.tag !== undefined)) {
        sc.warn('hard write items should have a hidden test with a tag for the edge case it exposes');
      }
      break;
    }
    case 'refactor': {
      if (!nonEmpty(lq.code)) sc.error('code is empty');
      const rm = lq.mustRemove;
      if (!Array.isArray(rm)) sc.error('mustRemove must be an array of AST flags');
      else {
        if (rm.length === 0 && arr(lq.mustAdd).length === 0) sc.error('mustRemove and mustAdd are both empty, so any passing code counts as refactored');
        for (const f of rm) if (!isStr(f) || !FLAGS.has(f)) sc.error(`mustRemove flag ${quote(String(f))} is not in AST_FLAGS`);
      }
      if (lq.mustAdd !== undefined) {
        if (!Array.isArray(lq.mustAdd)) sc.error('mustAdd must be an array of AST flags');
        else for (const f of lq.mustAdd) if (!isStr(f) || !FLAGS.has(f)) sc.error(`mustAdd flag ${quote(String(f))} is not in AST_FLAGS`);
      }
      if (!isStr(lq.pattern) || !PATTERNS.has(lq.pattern)) sc.error(`pattern ${quote(String(lq.pattern))} is not in PATTERN_IDS`);
      break;
    }
    case 'testWriter':
      if (!nonEmpty(lq.fnName)) sc.error('fnName is required');
      if (!nonEmpty(lq.spec)) sc.error('spec is empty');
      if (!nonEmpty(lq.reference)) sc.error('reference is empty');
      if (!nonEmpty(lq.buggy)) sc.error('buggy is empty');
      if (isStr(lq.reference) && lq.reference === lq.buggy) sc.error('reference and buggy are identical');
      checkMistake(sc, lq.bugMistake, 'bugMistake');
      if (lq.bugMistake === undefined) sc.error('bugMistake is required');
      if (!nonEmpty(lq.argsExample)) sc.error('argsExample is empty');
      break;
  }

  // determinism and replay safety
  const readCode = [lq.code, lq.left, lq.right].filter(isStr).join('\n');
  if (['predict', 'trace', 'twins', 'errorTranslator', 'mcq', 'multi'].includes(fmt) && readCode) {
    if (/\bimport\s+(random|time)\b|\bfrom\s+(random|time)\s+import\b/.test(readCode)) sc.warn('read formats must be deterministic: do not use random or time');
    if (/\bid\s*\(/.test(readCode)) sc.warn('read formats must be deterministic: do not print id()');
  }
  const testsWithStdin = (arr(lq.tests) as Loose[]).some((t) => Array.isArray(t?.stdin) && t.stdin.length > 0) || Array.isArray(lq.stdin);
  if (testsWithStdin) {
    const all = [readCode, (lq.solution as Loose | undefined)?.code, lq.starter].filter(isStr).join('\n');
    if (/\bimport\s+(random|time)\b|open\([^)]*['"][wa]\+?['"]/.test(all)) {
      sc.warn('questions with stdin must not use random, time or open(..., "w"/"a") (input replays re-run the program)');
    }
  }
}

export function checkTopicStatic(issues: Issues, info: TopicInfo, topic: Topic): void {
  const t = topic as unknown as Loose;
  const sc = scope(issues, info.id);
  if (!topic || typeof topic !== 'object') {
    sc.error('index.ts must default-export a Topic object');
    return;
  }
  if (t.id !== info.id) sc.error(`topic id is ${quote(String(t.id))} but the folder is for ${quote(info.id)}`);
  if (!Array.isArray(t.scenarios)) {
    sc.error('scenarios must be an array');
    return;
  }
  const stub = isStub(topic);
  if (!stub) {
    if (!nonEmpty(t.cheatsheet)) sc.warn('cheatsheet is empty');
    const we = t.workedExample as Loose | undefined;
    if (!we || !nonEmpty(we.title) || !nonEmpty(we.code)) sc.warn('workedExample needs a title and code');
    else if (!Array.isArray(we.steps) || we.steps.length === 0) sc.warn('workedExample has no steps');
  }
  for (const [i, cm] of arr(t.commonMistakes).entries()) {
    const c = cm as Loose;
    checkMistake(sc, c?.mistake, `commonMistakes[${i}].mistake`);
    if (!isStr(c?.bad) || !isStr(c?.good) || !nonEmpty(c?.note)) sc.error(`commonMistakes[${i}] needs bad, good and note`);
  }
  const scenarios = t.scenarios as Loose[];
  const seen = new Set<string>();
  if (!stub && (scenarios.length < 3 || scenarios.length > 6)) sc.warn(`has ${scenarios.length} scenarios; CONTENT.md asks for 3 to 6`);
  for (const [i, s] of scenarios.entries()) {
    const sid = nonEmpty(s?.id) ? s.id : `t${info.num}-s${i + 1}?`;
    const ssc = scope(issues, info.id, sid);
    if (!nonEmpty(s?.id) || !new RegExp(`^t${info.num}-s[1-9]$`).test(s.id)) {
      ssc.error(`scenario id must look like t${info.num}-sK (K = 1..4)`);
    } else if (seen.has(s.id)) ssc.error('duplicate scenario id');
    else seen.add(s.id);
    if (nonEmpty(s?.id) && Number(s.id.split('-s')[1]) > 6) ssc.warn('scenario number above 6');
    if (!nonEmpty(s?.title)) ssc.error('scenario title is empty');
    if (!nonEmpty(s?.story)) ssc.warn('scenario story is empty');
    const qs = arr(s?.questions) as Question[];
    if (qs.length < 3 || qs.length > 5) ssc.warn(`has ${qs.length} questions; CONTENT.md asks for 3-5 per scenario`);
    for (const q of qs) {
      try {
        checkQuestionStatic(issues, info, sid, q);
      } catch (e) {
        issues.error(info.id, (q as unknown as Loose)?.id as string | undefined, `verifier crashed on this question: ${(e as Error).stack ?? e}`);
      }
    }
  }
  if (stub) return;

  const qs = questionsOf(topic);
  const core = qs.filter((q) => q?.core === true);
  const coreCode = core.filter((q) => (CODE_FORMATS as readonly string[]).includes(q.format));
  if (core.length < info.minimum.solve) {
    sc.error(`only ${core.length} core questions, but unlocking the next topic needs ${info.minimum.solve} solved (minimum.solve in topics.ts)`);
  }
  if (coreCode.length < info.minimum.code) {
    sc.error(`only ${coreCode.length} core code-format questions, but unlocking the next topic needs ${info.minimum.code} (minimum.code in topics.ts)`);
  } else if (coreCode.length < 3) {
    sc.warn(`only ${coreCode.length} core code-format questions; CONTENT.md asks for at least 3`);
  }
  if (qs.length > 0) {
    const ratio = core.length / qs.length;
    if (ratio < 0.5 || ratio > 0.8) sc.warn(`${core.length} of ${qs.length} questions are core; aim for about two thirds`);
  }

  const mix = MIX[info.id];
  if (mix && !info.skipMix) {
    const diffs = { easy: 0, medium: 0, hard: 0 } as Record<string, number>;
    const formats: Record<string, number> = {};
    let paper = 0;
    let project = 0;
    for (const q of qs) {
      if (q?.diff in diffs) diffs[q.diff]++;
      formats[q?.format] = (formats[q?.format] ?? 0) + 1;
      if (q?.format === 'write' && q.mode === 'paper') paper++;
      if (q?.format === 'write' && q.kind === 'project') project++;
    }
    // The CONTENT.md table is a MINIMUM, not a cap: topics may grow past it, but must not fall below it
    // or lose a format, so every topic keeps its planned coverage.
    const diffs2: string[] = [];
    if (qs.length < mix.total) diffs2.push(`${qs.length} questions (at least ${mix.total} expected)`);
    const d = mix.diff;
    const lowDiffs = [
      diffs.easy < d.easy ? `easy ${diffs.easy}/${d.easy}` : '',
      diffs.medium < d.medium ? `medium ${diffs.medium}/${d.medium}` : '',
      diffs.hard < d.hard ? `hard ${diffs.hard}/${d.hard}` : '',
    ].filter(Boolean);
    if (lowDiffs.length) diffs2.push(`fewer than planned (have/min): ${lowDiffs.join(', ')}`);
    const fmtDiff: string[] = [];
    for (const f of FORMATS) {
      const want = mix.formats[f] ?? 0;
      const have = formats[f] ?? 0;
      if (have < want) fmtDiff.push(`${f} ${have}/${want}`);
    }
    if (fmtDiff.length) diffs2.push(`fewer than planned per format (have/min): ${fmtDiff.join(', ')}`);
    if (paper < (mix.paper ?? 0)) diffs2.push(`${paper} paper write items (at least ${mix.paper ?? 0} expected)`);
    if (project < (mix.project ?? 0)) diffs2.push(`${project} project write items (at least ${mix.project ?? 0} expected)`);
    for (const m of diffs2) sc.warn(`mix vs CONTENT.md: ${m}`);
  }
}
