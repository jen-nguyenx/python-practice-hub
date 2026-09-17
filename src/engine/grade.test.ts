import { describe, expect, it } from 'vitest';
import type {
  ClozeQuestion, ErrorTranslatorQuestion, FixBugQuestion, McqQuestion, MultiQuestion, ParsonsQuestion, PredictQuestion,
  QuestionBase, RefactorQuestion, TestWriterQuestion, TraceQuestion, TwinsQuestion, WriteQuestion,
} from '../content/schema.ts';
import type { TestOutcome, TestsResult } from '../runtime/protocol.ts';
import {
  assembleParsons, changedLineCount, fillCloze, gradeErrorTranslator, gradeFromTests, gradeMcq, gradeMulti, gradePredict,
  gradeRefactor, gradeTestWriter, gradeTrace, gradeTwins, normalizeOutput, traceCellMatches,
} from './grade.ts';

const base = (id: string, extra: Partial<QuestionBase> = {}): Omit<QuestionBase, 'format'> => ({
  id, diff: 'easy', core: true, title: 'Test question', prompt: 'Prompt', concepts: [], detects: [], expectedSec: 90,
  hints: ['h1', 'h2', 'h3'], solution: { explanation: 'Because.' }, ...extra,
});

const ids = (r: { mistakes: { id: string }[] }) => r.mistakes.map((m) => m.id).sort();

describe('normalizeOutput', () => {
  it('normalises line endings, trailing spaces and trailing blank lines', () => {
    expect(normalizeOutput('a  \r\nb\t\r\n\r\n\n')).toBe('a\nb');
  });
  it('keeps leading and internal spaces', () => {
    expect(normalizeOutput('  x  y')).toBe('  x  y');
  });
  it('maps smart quotes, dashes and non-breaking spaces to ASCII', () => {
    const smart = String.fromCharCode(0x2018) + 'hi' + String.fromCharCode(0x2019) + ' ' + String.fromCharCode(0x201c) + 'yo' + String.fromCharCode(0x201d)
      + String.fromCharCode(0x00a0) + String.fromCharCode(0x2013) + '5';
    expect(normalizeOutput(smart)).toBe(`'hi' "yo" -5`);
  });
});

describe('gradeMcq', () => {
  const q: McqQuestion = {
    ...base('t04-s1-q1', { detects: ['print_vs_return', 'forgot_to_call'] }), format: 'mcq',
    code: 'def fare(zones):\n    print(zones * 2.5)\n\nx = fare(2)\nprint(x)',
    options: [
      { id: 'a', text: '5.0\nNone', correct: true, why: 'fare prints 5.0 but has no **return**, so it returns None.' },
      { id: 'b', text: '5.0\n5.0', mistake: 'print_vs_return', why: 'Printing is not returning.' },
      { id: 'c', text: 'An error', mistake: 'forgot_to_call', why: 'A function without return is valid.' },
    ],
  };
  it('marks the correct option correct with its why as plain feedback', () => {
    const r = gradeMcq(q, 'a');
    expect(r).toMatchObject({ correct: true, score: 1, mistakes: [] });
    expect(r.feedback).toBe('fare prints 5.0 but has no return, so it returns None.');
  });
  it('logs the distractor mistake for a wrong option', () => {
    const r = gradeMcq(q, 'b');
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0);
    expect(r.mistakes).toEqual([{ id: 'print_vs_return', channel: 'distractor' }]);
    expect(r.feedback).toBe('Printing is not returning.');
  });
  it('handles an unknown option id', () => {
    expect(gradeMcq(q, 'zzz')).toMatchObject({ correct: false, score: 0, mistakes: [] });
  });
});

describe('gradeMulti', () => {
  const q: MultiQuestion = {
    ...base('t01-s3-q2', { diff: 'medium' }), format: 'multi',
    options: [
      { id: 'a', text: "int('12.0')", correct: true, why: 'ValueError.' },
      { id: 'b', text: "float('12.0')", correct: false, mistake: 'int_of_float_string', why: 'Valid.' },
      { id: 'c', text: 'int(12.9)', correct: false, mistake: 'int_of_float_string', why: 'Valid.' },
      { id: 'd', text: "'Bus ' + 950", correct: true, why: 'TypeError.' },
      { id: 'e', text: "str(950) + ' bus'", correct: false, mistake: 'str_int_concat', why: 'Valid.' },
    ],
  };
  it('full marks for exactly the correct set', () => {
    expect(gradeMulti(q, ['d', 'a'])).toMatchObject({ correct: true, score: 1, mistakes: [] });
  });
  it('partial score for missing one', () => {
    const r = gradeMulti(q, ['a']);
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0.5);
  });
  it('wrong picks subtract and log their mistakes once each', () => {
    const r = gradeMulti(q, ['a', 'd', 'b', 'c']);
    expect(r.score).toBe(0);
    expect(r.correct).toBe(false);
    expect(r.mistakes).toEqual([{ id: 'int_of_float_string', channel: 'distractor' }]);
    const r2 = gradeMulti(q, ['a', 'd', 'e']);
    expect(r2.score).toBe(0.5);
    expect(ids(r2)).toEqual(['str_int_concat']);
  });
  it('never goes below zero', () => {
    expect(gradeMulti(q, ['b', 'c', 'e']).score).toBe(0);
  });
});

describe('gradePredict', () => {
  const q: PredictQuestion = {
    ...base('t01-s1-q1', { detects: ['int_vs_float_division'] }), format: 'predict',
    code: "trip_minutes = 135\nprint(trip_minutes // 60, 'h', trip_minutes % 60, 'min')\nprint(7 / 2, 7 // 2, -7 // 2)",
    mutants: [{ code: '...', mistake: 'int_vs_float_division' }],
  };
  const gen = { stdout: '2 h 15 min\n3.5 3 -4\n', mutantOutputs: ['2 h 15 min\n3 3 -3\n'] };
  it('accepts the exact output, ignoring trailing whitespace and line endings', () => {
    expect(gradePredict(q, '2 h 15 min  \r\n3.5 3 -4\r\n\r\n', gen)).toMatchObject({ correct: true, score: 1, mistakes: [] });
  });
  it('accepts a smart minus sign typed by autocorrect', () => {
    expect(gradePredict(q, '2 h 15 min\n3.5 3 ' + String.fromCharCode(0x2212) + '4', gen).correct).toBe(true);
  });
  it('logs the mutant mistake when the answer matches a mutant output', () => {
    const r = gradePredict(q, '2 h 15 min\n3 3 -3', gen);
    expect(r).toMatchObject({ correct: false, score: 0 });
    expect(r.mistakes).toEqual([{ id: 'int_vs_float_division', channel: 'distractor' }]);
    expect(r.feedback).toContain('line 2');
  });
  it('wrong answer that matches no mutant logs nothing', () => {
    const r = gradePredict(q, '2h 15min\n3.5 3 -4', gen);
    expect(r.mistakes).toEqual([]);
    expect(r.feedback).toContain('line 1');
  });
  it('reports missing generated data without crashing', () => {
    expect(gradePredict(q, 'x', undefined)).toMatchObject({ correct: false, score: 0 });
  });
});

describe('gradeTrace', () => {
  const q: TraceQuestion = {
    ...base('t03-s1-q2', { detects: ['off_by_one_range', 'accumulator_init'] }), format: 'trace',
    code: 'total = 0\nfor day in range(1, 5):\n    total += day * 2', watch: ['day', 'total'], anchorLine: 3,
  };
  const gen = { traceRows: [['1', '2'], ['2', '6'], ['3', '12'], ['4', '20']] };

  it('all cells right, trailing blank rows ignored', () => {
    const r = gradeTrace(q, [['1', '2'], ['2', ' 6 '], ['3', '12'], ['4', '20'], ['', '']], gen);
    expect(r).toMatchObject({ correct: true, score: 1, mistakes: [] });
    expect(r.cellOk).toEqual([[true, true], [true, true], [true, true], [true, true], [true, true]]);
  });
  it('partial credit per cell; wrong first row suggests accumulator_init', () => {
    const r = gradeTrace(q, [['1', '1'], ['2', '6'], ['3', '12'], ['4', '20']], gen);
    expect(r.correct).toBe(false);
    expect(r.score).toBeCloseTo(7 / 8);
    expect(r.cellOk[0]).toEqual([true, false]);
    expect(ids(r)).toEqual(['accumulator_init']);
  });
  it('a missing final row counts as wrong cells and suggests off_by_one_range', () => {
    const r = gradeTrace(q, [['1', '2'], ['2', '6'], ['3', '12']], gen);
    expect(r.correct).toBe(false);
    expect(r.score).toBeCloseTo(6 / 8);
    expect(ids(r)).toEqual(['off_by_one_range']);
    expect(r.feedback).toContain('more rows');
  });
  it('an extra final row is penalised and suggests off_by_one_range', () => {
    const r = gradeTrace(q, [['1', '2'], ['2', '6'], ['3', '12'], ['4', '20'], ['5', '30']], gen);
    expect(r.correct).toBe(false);
    expect(r.score).toBeCloseTo(8 / 10);
    expect(r.cellOk[4]).toEqual([false, false]);
    expect(ids(r)).toEqual(['off_by_one_range']);
  });
  it('compares reprs: quotes optional for plain strings, whitespace and quote style free, types strict', () => {
    expect(traceCellMatches('hello', "'hello'")).toBe(true);
    expect(traceCellMatches('"hello"', "'hello'")).toBe(true);
    expect(traceCellMatches("['a','b']", "['a', 'b']")).toBe(true);
    expect(traceCellMatches('["a", "b"]', "['a', 'b']")).toBe(true);
    expect(traceCellMatches('2.50', '2.5')).toBe(true);
    expect(traceCellMatches('2', '2.0')).toBe(false);
    expect(traceCellMatches('2', "'2'")).toBe(false);
    expect(traceCellMatches('True', "'True'")).toBe(false);
    expect(traceCellMatches('', "''")).toBe(false);
    expect(traceCellMatches("'a b'", "'ab'")).toBe(false);
  });
});

describe('gradeTwins', () => {
  const q: TwinsQuestion = {
    ...base('t02-s2-q3', { diff: 'medium' }), format: 'twins', mistake: 'elif_vs_if',
    left: "temp = 41\nif temp > 35:\n    print('Hot')\nif temp > 40:\n    print('Extreme')",
    right: "temp = 41\nif temp > 35:\n    print('Hot')\nelif temp > 40:\n    print('Extreme')",
  };
  const gen = { twins: { outLeft: 'Hot\nExtreme', outRight: 'Hot', differs: true } };
  it('full marks', () => {
    const r = gradeTwins(q, { differs: true, outLeft: 'Hot\nExtreme\n', outRight: 'Hot' }, gen);
    expect(r).toMatchObject({ correct: true, score: 1, parts: { differs: true, left: true, right: true } });
  });
  it('0.5 for differs plus 0.25 per output; wrong differs logs the mistake', () => {
    const r = gradeTwins(q, { differs: false, outLeft: 'Hot\nExtreme', outRight: 'Hot\nExtreme' }, gen);
    expect(r.score).toBe(0.25);
    expect(r.parts).toEqual({ differs: false, left: true, right: false });
    expect(r.mistakes).toEqual([{ id: 'elif_vs_if', channel: 'distractor' }]);
    const r2 = gradeTwins(q, { differs: true, outLeft: 'Hot', outRight: 'Hot' }, gen);
    expect(r2.score).toBe(0.75);
    expect(r2.mistakes).toEqual([]);
  });
});

describe('gradeErrorTranslator', () => {
  const q: ErrorTranslatorQuestion = {
    ...base('t08-s1-q2'), format: 'errorTranslator',
    code: "stock = {'flat white': 3}\nprint(stock.get('latte', 0))\nstock['latte'] += 1",
    exceptionOptions: ['KeyError', 'TypeError', 'NameError', 'IndexError'],
    causes: [
      { id: 'a', text: "'latte' is not a key yet", correct: true },
      { id: 'b', text: 'get() added latte', mistake: 'dict_keyerror' },
      { id: 'c', text: '+= cannot be used on values', mistake: 'type_error_other' },
    ],
  };
  const gen = { stdout: '0\n', error: { type: 'KeyError', message: "'latte'", line: 3 } };
  it('all three parts right', () => {
    const r = gradeErrorTranslator(q, { line: 3, exception: 'KeyError', causeId: 'a' }, gen);
    expect(r).toMatchObject({ correct: true, score: 1, parts: { line: true, exception: true, cause: true }, mistakes: [] });
  });
  it('thirds for partial answers; wrong cause logs its mistake', () => {
    const r = gradeErrorTranslator(q, { line: 2, exception: 'KeyError', causeId: 'b' }, gen);
    expect(r.score).toBeCloseTo(1 / 3);
    expect(r.parts).toEqual({ line: false, exception: true, cause: false });
    expect(r.mistakes).toEqual([{ id: 'dict_keyerror', channel: 'distractor' }]);
    expect(gradeErrorTranslator(q, { line: 3, exception: null, causeId: 'a' }, gen).score).toBeCloseTo(2 / 3);
  });
});

// ---------------- code formats ----------------

const outcome = (o: Partial<TestOutcome> & { id: string; pass: boolean }): TestOutcome => ({
  label: o.id, hidden: false, stdout: '', timedOut: false, detections: [], ...o,
});

const tests = (outcomes: TestOutcome[], extra: Partial<TestsResult> = {}): TestsResult => ({
  outcomes, flags: [], ruleViolations: [], passed: outcomes.filter((o) => o.pass).length, total: outcomes.length, ...extra,
});

const writeQ: WriteQuestion = {
  ...base('t06-s2-q1', { diff: 'medium', detects: ['index_out_of_range', 'accumulator_init'] }), format: 'write', kind: 'function',
  fnName: 'min_max_mean', starter: 'def min_max_mean(temps):\n    pass',
  tests: [
    { id: 'v1', call: 'min_max_mean([38.1, 41.2, 29.5])', expect: '(29.5, 41.2, 36.27)', cmp: 'float', label: 'three days', hidden: false },
    { id: 'v2', call: 'min_max_mean([30.0])', expect: '(30.0, 30.0, 30.0)', cmp: 'float', label: 'one day', hidden: false },
    { id: 'h1', call: 'min_max_mean([])', expect: 'None', label: 'empty list', hidden: true, tag: 'index_out_of_range' },
    { id: 'h2', call: 'min_max_mean([-2.0, -5.5])', expect: '(-5.5, -2.0, -3.75)', cmp: 'float', label: 'all below zero', hidden: true, tag: 'accumulator_init' },
  ],
};

describe('gradeFromTests', () => {
  it('all tests pass', () => {
    const r = gradeFromTests(writeQ, tests(['v1', 'v2', 'h1', 'h2'].map((id) => outcome({ id, pass: true }))));
    expect(r).toMatchObject({ correct: true, score: 1, mistakes: [], feedback: 'All 4 tests passed.' });
  });
  it('some fail: score is passed/total, tags and detections logged, labels named', () => {
    const r = gradeFromTests(writeQ, tests([
      outcome({ id: 'v1', label: 'three days', pass: true }),
      outcome({ id: 'v2', label: 'one day', pass: true }),
      outcome({ id: 'h1', label: 'empty list', hidden: true, tag: 'index_out_of_range', pass: false,
        error: { type: 'IndexError', message: 'list index out of range', traceback: '', mistakes: ['index_out_of_range'] } }),
      outcome({ id: 'h2', label: 'all below zero', hidden: true, tag: 'accumulator_init', pass: true }),
    ]));
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0.75);
    expect(r.feedback).toBe('3 of 4 tests passed. Failing: empty list.');
    expect(ids(r)).toEqual(['index_out_of_range']);
    expect(r.mistakes.find((m) => m.id === 'index_out_of_range')?.channel).toBe('test');
  });
  it('tags are not trusted when nothing passes or a root cause explains the failures', () => {
    const none = gradeFromTests(writeQ, tests([
      outcome({ id: 'v1', label: 'three days', pass: false }),
      outcome({ id: 'h2', label: 'all below zero', hidden: true, tag: 'accumulator_init', pass: false, detections: ['accumulator_init'] }),
    ]));
    expect(ids(none)).toEqual([]);
    const printed = gradeFromTests(writeQ, tests([
      outcome({ id: 'v1', label: 'three days', pass: true }),
      outcome({ id: 'h2', label: 'all below zero', hidden: true, tag: 'accumulator_init', pass: false, detections: ['accumulator_init', 'print_vs_return'] }),
    ]));
    expect(ids(printed)).toEqual(['print_vs_return']);
  });
  it('compile error scores 0 and logs error mistakes', () => {
    const r = gradeFromTests(writeQ, tests([], {
      compileError: { type: 'SyntaxError', message: "expected ':'", line: 2, traceback: '', mistakes: ['missing_colon'] }, total: 4, passed: 0,
    }));
    expect(r).toMatchObject({ correct: false, score: 0 });
    expect(ids(r)).toEqual(['missing_colon']);
    expect(r.feedback).toContain('line 2');
  });
  it('top-level crash scores 0 and logs top_level_code', () => {
    const r = gradeFromTests(writeQ, tests([], {
      topLevelError: { type: 'NameError', message: "name 'temps' is not defined", line: 5, traceback: '', mistakes: ['name_typo'] },
    }));
    expect(r.score).toBe(0);
    expect(ids(r)).toEqual(['name_typo', 'top_level_code']);
  });
  it('missing function', () => {
    const r = gradeFromTests(writeQ, tests([], { missingFunction: 'min_max_mean' }));
    expect(r).toMatchObject({ correct: false, score: 0 });
    expect(ids(r)).toEqual(['missing_function']);
  });
  it('rule violations prevent correct and map to project mistakes', () => {
    const project: WriteQuestion = { ...writeQ, kind: 'project', fnName: 'main', rules: ['noImport', 'noPrint', 'roundAtEnd'] };
    const r = gradeFromTests(project, tests([outcome({ id: 'v1', pass: true }), outcome({ id: 'v2', pass: true })], {
      ruleViolations: [
        { rule: 'noImport', line: 1, message: 'import is not allowed in the project.' },
        { rule: 'roundAtEnd', line: 9, message: 'round only at output' },
      ],
    }));
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0.5);
    expect(ids(r)).toEqual(['import_used', 'round_mid_calc']);
    expect(r.feedback).toContain('import is not allowed in the project (line 1).');
  });
  it('parsons distractors are logged', () => {
    const pq: ParsonsQuestion = {
      ...base('t03-s2-q2'), format: 'parsons', indentMatters: true, fnName: 'sum_of_squares',
      lines: [{ text: 'def sum_of_squares(n):', indent: 0 }, { text: 'total = 0', indent: 1 }],
      distractors: [{ text: 'for k in range(1, n):', indent: 1, mistake: 'off_by_one_range' }], tests: [],
    };
    const r = gradeFromTests(pq, tests([outcome({ id: 'v1', pass: false, tag: 'off_by_one_range' }), outcome({ id: 'h1', pass: true })]), { usedDistractors: ['off_by_one_range'] });
    expect(r.mistakes).toEqual([{ id: 'off_by_one_range', channel: 'distractor' }]);
    expect(r.score).toBe(0.5);
  });
  it('fixBug: failing test tagged with the bug logs it; not-run tests are reported', () => {
    const fq: FixBugQuestion = {
      ...base('t02-s3-q1'), format: 'fixBug', buggy: 'def swim_ok(uv, wind_kmh): ...', bugMistake: 'or_with_literal', maxChangedLines: 1, tests: [],
    };
    const r = gradeFromTests(fq, tests([
      outcome({ id: 'v1', pass: true }),
      outcome({ id: 'v2', label: 'high UV', pass: false, tag: 'or_with_literal', timedOut: true }),
      outcome({ id: 'h1', label: 'windy', pass: false, notRun: true, tag: 'infinite_while' }),
    ]));
    expect(ids(r)).toEqual(['or_with_literal']);
    expect(r.feedback).toContain('1 of 3 tests passed. Failing: high UV.');
    expect(r.feedback).toContain('ran too long');
    expect(r.feedback).toContain('1 test did not run');
  });
});

describe('gradeRefactor', () => {
  const q: RefactorQuestion = {
    ...base('t04-s3-q2'), format: 'refactor', fnName: 'is_weekend',
    code: "def is_weekend(day):\n    if day == 'Sat' or day == 'Sun':\n        return True\n    else:\n        return False",
    mustRemove: ['if_return_bool_literal'], pattern: 'return-boolean-directly', tests: [],
  };
  const pass3 = ['v1', 'h1', 'h2'].map((id) => outcome({ id, pass: true }));
  it('tests pass and idiom satisfied: 1', () => {
    expect(gradeRefactor(q, tests(pass3))).toMatchObject({ correct: true, score: 1 });
  });
  it('tests pass but idiom still there: 0.5 with feedback', () => {
    const r = gradeRefactor(q, tests(pass3, { flags: [{ flag: 'if_return_bool_literal', line: 2 }] }));
    expect(r).toMatchObject({ correct: false, score: 0.5 });
    expect(r.feedback).toContain('an if/else that returns True or False');
  });
  it('mustAdd missing counts as idiom not satisfied', () => {
    const r = gradeRefactor({ ...q, mustRemove: [], mustAdd: ['enumerate_used'] }, tests(pass3));
    expect(r.score).toBe(0.5);
    expect(r.feedback).toContain('enumerate()');
  });
  it('failing tests: passed/total x 0.5', () => {
    const r = gradeRefactor(q, tests([outcome({ id: 'v1', pass: true }), outcome({ id: 'h1', pass: false }), outcome({ id: 'h2', pass: false }), outcome({ id: 'h3', pass: true })]));
    expect(r.score).toBe(0.25);
    expect(r.correct).toBe(false);
  });
});

describe('gradeTestWriter', () => {
  const q: TestWriterQuestion = {
    ...base('t10-s3-q1', { diff: 'hard' }), format: 'testWriter', fnName: 'safe_average', spec: 'Mean of valid values or None.',
    reference: 'def safe_average(values): ...', buggy: 'def safe_average(values): ...', bugMistake: 'zero_division', argsExample: '([3, 1, 2],)',
  };
  it('correct when args are valid and results differ', () => {
    expect(gradeTestWriter(q, { validArgs: true, differs: true, refResult: 'None', bugResult: 'ZeroDivisionError' })).toMatchObject({ correct: true, score: 1 });
  });
  it('invalid args give format feedback', () => {
    const r = gradeTestWriter(q, { validArgs: false, parseError: 'invalid syntax', differs: false, refResult: '', bugResult: '' });
    expect(r).toMatchObject({ correct: false, score: 0 });
    expect(r.feedback).toContain('([3, 1, 2],)');
  });
  it('same result asks for another input', () => {
    const r = gradeTestWriter(q, { validArgs: true, differs: false, refResult: '2.0', bugResult: '2.0' });
    expect(r.correct).toBe(false);
    expect(r.feedback).toContain('2.0');
  });
});

describe('program builders', () => {
  it('fillCloze substitutes every blank', () => {
    const q: ClozeQuestion = {
      ...base('t07-s1-q3'), format: 'cloze', tests: [],
      template: 'def digit_sum(n):\n    total = 0\n    while n ⟦1⟧ 0:\n        total += n ⟦2⟧ 10\n        n ⟦3⟧ 10\n    return total',
      blanks: [{ id: '1', accept: ['>'] }, { id: '2', accept: ['%'] }, { id: '3', accept: ['//='] }],
    };
    expect(fillCloze(q, { '1': ' > ', '2': '%', '3': '//=' })).toBe(
      'def digit_sum(n):\n    total = 0\n    while n > 0:\n        total += n % 10\n        n //= 10\n    return total',
    );
    expect(fillCloze(q, { '1': '!=' })).toContain('total += n  10');
  });
  it('assembleParsons indents with 4 spaces per level', () => {
    expect(assembleParsons([
      { text: 'def f(n):', indent: 0 }, { text: 'for k in range(n):', indent: 1 }, { text: 'print(k)', indent: 2 }, { text: 'return n', indent: 1 },
    ])).toBe('def f(n):\n    for k in range(n):\n        print(k)\n    return n');
  });
  it('changedLineCount counts replaced, added and removed lines', () => {
    const before = 'def f(x):\n    if x > 0 or 30:\n        return True\n    return False';
    expect(changedLineCount(before, before)).toBe(0);
    expect(changedLineCount(before, before.replace(' or 30', ''))).toBe(1);
    expect(changedLineCount(before, before + '\n\n')).toBe(0);
    expect(changedLineCount(before, 'def f(x):\n    return x > 0')).toBe(3);
    expect(changedLineCount('a\nb\nc', 'a\nX\nb\nc')).toBe(1);
    expect(changedLineCount('a\nb\nc', 'a\nc')).toBe(1);
    expect(changedLineCount('a\nb\nc\nd', 'b\na\nc\nd')).toBe(1);
  });
});
