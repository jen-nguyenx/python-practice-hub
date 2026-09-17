// Unit tests for the Python grading harness (src/runtime/python/**), run in Node Pyodide through the verifier's loader.
// One interpreter is shared by the whole file, so these tests also check that every run leaves it in a usable state.
import { beforeAll, describe, expect, it } from 'vitest';
import { createHarness } from '../../../scripts/verify/pyodide.ts';
import type { Harness } from '../../../scripts/verify/pyodide.ts';
import type { RuleId } from '../../content/ids.ts';
import type { Test } from '../../content/schema.ts';
import type { TestOutcome, TestsResult } from '../protocol.ts';

const LOAD_TIMEOUT = 180_000;
const SLOW = 60_000;

let h: Harness;

beforeAll(async () => {
  h = await createHarness();
}, LOAD_TIMEOUT);

/** A test with the required fields filled in. */
function T(id: string, fields: Partial<Test> = {}): Test {
  return { id, label: id, hidden: false, ...fields };
}

function fnTests(code: string, tests: Test[], fnName?: string, rules: RuleId[] = [], budget = 1000): TestsResult {
  return h.runTests(code, tests, 'function', fnName, rules, budget);
}

function only(r: TestsResult): TestOutcome {
  expect(r.compileError).toBeUndefined();
  expect(r.topLevelError).toBeUndefined();
  expect(r.missingFunction).toBeUndefined();
  expect(r.outcomes).toHaveLength(1);
  return r.outcomes[0];
}

function outcomeOf(code: string, test: Test, fnName?: string): TestOutcome {
  return only(fnTests(code, [test], fnName));
}

/** Internal ids that must never leak into a message a student reads. */
const INTERNAL_WORDS = /\b(noImport|noInput|noPrint|noCsvExt|noLoops|roundAtEnd|mainSignature|import_used|input_call|print_call|csv_ext_literal|loop_present|top_level_code)\b/;

// ------------------------------------------------------------------------------------------------------------------

describe('compare semantics', () => {
  const code = [
    'def pair_up(a, b):',
    '    return [a, b]',
    'def as_tuple(a, b):',
    '    return (a, b)',
    'def half(n):',
    '    return n / 2',
    'def two():',
    '    return 2',
    'def tenths():',
    '    return 0.1 + 0.2',
    'def approx_pi():',
    '    return 3.14159',
    'def shuffled():',
    '    return [3, 1, 2]',
    'def dupes():',
    '    return [1, 1, 2]',
    'def shuffled_tuple():',
    '    return (3, 1, 2)',
    'def one():',
    '    return 1',
    'def count_text():',
    "    return '3'",
    'def stock():',
    "    return {'b': 2.0, 'a': [1, (2, 3)]}",
    '',
  ].join('\n');

  it('a list never equals an expected tuple, and the mismatch is reported as return_type_wrong', () => {
    const o = outcomeOf(code, T('t', { call: 'pair_up(1, 2)', expect: '(1, 2)' }), 'pair_up');
    expect(o.pass).toBe(false);
    expect(o.got).toBe('[1, 2]');
    expect(o.expected).toBe('(1, 2)');
    expect(o.error).toBeUndefined();
    expect(o.detections).toContain('return_type_wrong');
  });

  it('a tuple never equals an expected list either', () => {
    const o = outcomeOf(code, T('t', { call: 'as_tuple(1, 2)', expect: '[1, 2]' }));
    expect(o.pass).toBe(false);
    expect(o.detections).toContain('return_type_wrong');
  });

  it('int and float compare numerically under eq: 2 == 2.0 both ways', () => {
    expect(outcomeOf(code, T('t', { call: 'half(4)', expect: '2' })).pass).toBe(true);
    expect(outcomeOf(code, T('t', { call: 'two()', expect: '2.0' })).pass).toBe(true);
    expect(outcomeOf(code, T('t', { call: 'half(4)', expect: '2', cmp: 'eq' })).detections).toEqual([]);
  });

  it('True never equals 1, and a numeric string is return_type_wrong', () => {
    const b = outcomeOf(code, T('t', { call: 'one()', expect: 'True' }));
    expect(b.pass).toBe(false);
    const s = outcomeOf(code, T('t', { call: 'count_text()', expect: '3' }));
    expect(s.pass).toBe(false);
    expect(s.detections).toContain('return_type_wrong');
  });

  it('dicts compare by content regardless of key order, with nested int/float equality', () => {
    const o = outcomeOf(code, T('t', { call: 'stock()', expect: "{'a': [1, (2, 3)], 'b': 2}" }));
    expect(o.pass).toBe(true);
    const nested = outcomeOf(code, T('t', { call: 'stock()', expect: "{'a': [1, [2, 3]], 'b': 2}" }));
    expect(nested.pass).toBe(false);
  });

  it('cmp float uses a tolerance where eq is exact', () => {
    expect(outcomeOf(code, T('t', { call: 'tenths()', expect: '0.3' })).pass).toBe(false);
    expect(outcomeOf(code, T('t', { call: 'tenths()', expect: '0.3', cmp: 'float' })).pass).toBe(true);
  });

  it('cmp float honours tol, and an unrounded float is return_type_wrong', () => {
    const strict = outcomeOf(code, T('t', { call: 'approx_pi()', expect: '3.14', cmp: 'float' }));
    expect(strict.pass).toBe(false);
    expect(strict.detections).toContain('return_type_wrong');
    expect(outcomeOf(code, T('t', { call: 'approx_pi()', expect: '3.14', cmp: 'float', tol: 0.01 })).pass).toBe(true);
    expect(outcomeOf(code, T('t', { call: 'approx_pi()', expect: '3.1', cmp: 'float', tol: 0.01 })).pass).toBe(false);
  });

  it('cmp unordered treats a list as a multiset but keeps the container type', () => {
    expect(outcomeOf(code, T('t', { call: 'shuffled()', expect: '[1, 2, 3]' })).pass).toBe(false);
    expect(outcomeOf(code, T('t', { call: 'shuffled()', expect: '[1, 2, 3]', cmp: 'unordered' })).pass).toBe(true);
    expect(outcomeOf(code, T('t', { call: 'dupes()', expect: '[1, 2, 2]', cmp: 'unordered' })).pass).toBe(false);
    expect(outcomeOf(code, T('t', { call: 'dupes()', expect: '[2, 1, 1]', cmp: 'unordered' })).pass).toBe(true);
    expect(outcomeOf(code, T('t', { call: 'shuffled_tuple()', expect: '[1, 2, 3]', cmp: 'unordered' })).pass).toBe(false);
    expect(outcomeOf(code, T('t', { call: 'shuffled()', expect: '[1, 2]', cmp: 'unordered' })).pass).toBe(false);
  });

  it('counts passed tests across a mixed run', () => {
    const r = fnTests(code, [
      T('a', { call: 'half(4)', expect: '2' }),
      T('b', { call: 'pair_up(1, 2)', expect: '(1, 2)' }),
      T('c', { call: 'shuffled()', expect: '[1, 2, 3]', cmp: 'unordered', hidden: true, label: 'any order' }),
    ]);
    expect(r.total).toBe(3);
    expect(r.passed).toBe(2);
    expect(r.outcomes.map((o) => [o.id, o.pass])).toEqual([['a', true], ['b', false], ['c', true]]);
    expect(r.outcomes[2]).toMatchObject({ hidden: true, label: 'any order' });
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('soft time budget', () => {
  it('stops "while True: pass" and the next run still works', () => {
    const t0 = performance.now();
    const r = h.runProgram('while True: pass\n', [], [], 300);
    const ms = performance.now() - t0;
    expect(r.timedOut).toBe(true);
    expect(r.error?.type).toBe('TimeoutError');
    expect(r.error?.line).toBe(1);
    expect(r.error?.message).toMatch(/0\.3 seconds/);
    expect(ms).toBeLessThan(5000);

    const next = h.runProgram("print('still alive')");
    expect(next.error).toBeUndefined();
    expect(next.timedOut).toBe(false);
    expect(next.stdout).toBe('still alive\n');
  }, SLOW);

  it('a bare except inside the loop cannot swallow the timeout', () => {
    const code = 'n = 0\nwhile True:\n    try:\n        n += 1\n    except:\n        pass\n';
    const r = h.runProgram(code, [], [], 300);
    expect(r.timedOut).toBe(true);
    expect(r.error?.type).toBe('TimeoutError');
    expect(h.runProgram('print(2 + 2)').stdout).toBe('4\n');
  }, SLOW);

  it('in tests a timeout logs infinite_while and the remaining tests are marked not run', () => {
    const r = fnTests('def spin(n):\n    while n > 0:\n        n = n\n    return 0\n', [
      T('ok', { call: 'spin(0)', expect: '0' }),
      T('loop', { call: 'spin(3)', expect: '0' }),
      T('after', { call: 'spin(0)', expect: '0' }),
    ], 'spin', [], 300);
    expect(r.outcomes.map((o) => o.id)).toEqual(['ok', 'loop', 'after']);
    expect(r.outcomes[0]).toMatchObject({ pass: true, timedOut: false });
    const loop = r.outcomes[1];
    expect(loop).toMatchObject({ pass: false, timedOut: true });
    expect(loop.error?.type).toBe('TimeoutError');
    expect(loop.error?.message).toMatch(/0\.3 seconds/);
    expect([2, 3]).toContain(loop.error?.line);
    expect(loop.detections).toContain('infinite_while');
    expect(r.outcomes[2]).toMatchObject({ id: 'after', pass: false, notRun: true });
    expect(r.passed).toBe(1);
    expect(r.total).toBe(3);

    const again = fnTests('def spin(n):\n    return 0\n', [T('after', { call: 'spin(0)', expect: '0' })], 'spin');
    expect(only(again).pass).toBe(true);
  }, SLOW);
});

// ------------------------------------------------------------------------------------------------------------------

describe('recursion', () => {
  const runaway = 'def f(n):\n    return f(n + 1)\n\nf(0)\n';

  it('runaway recursion becomes a RecursionError at the student line and the interpreter recovers', () => {
    const limitBefore = h.py.runPython('import sys\nsys.getrecursionlimit()') as number;
    const r = h.runProgram(runaway);
    expect(r.error?.type).toBe('RecursionError');
    expect(r.error?.line).toBe(2);
    expect(r.error?.traceback).toContain('File "<student>", line 2, in f');
    expect(r.timedOut).toBe(false);
    expect(h.py.runPython('import sys\nsys.getrecursionlimit()')).toBe(limitBefore);

    const next = h.runProgram('print(sum(range(10)))');
    expect(next.error).toBeUndefined();
    expect(next.stdout).toBe('45\n');
  }, SLOW);

  it('legitimate recursion a few hundred calls deep still works', () => {
    const r = h.runProgram('def count(n):\n    return 0 if n == 0 else 1 + count(n - 1)\nprint(count(400))');
    expect(r.error).toBeUndefined();
    expect(r.stdout).toBe('400\n');
  }, SLOW);

  it('a missing base case fails one test without stopping the others', () => {
    const code = 'def fact(n):\n    return n * fact(n - 1)\n';
    const r = fnTests(code, [T('a', { call: 'fact(3)', expect: '6' }), T('b', { call: 'fact(1)', expect: '1' })], 'fact');
    expect(r.outcomes).toHaveLength(2);
    for (const o of r.outcomes) {
      expect(o.notRun).toBeUndefined();
      expect(o.timedOut).toBe(false);
      expect(o.error?.type).toBe('RecursionError');
    }
    const fixed = fnTests('def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n',
      [T('a', { call: 'fact(5)', expect: '120' })], 'fact');
    expect(only(fixed).pass).toBe(true);
  }, SLOW);

  it('runaway recursion under the trace recorder also recovers', () => {
    const r = h.trace(runaway, ['n'], 2);
    expect(r.error?.type).toBe('RecursionError');
    expect(h.runProgram("print('ok')").stdout).toBe('ok\n');
  }, SLOW);
});

// ------------------------------------------------------------------------------------------------------------------

describe('output cap', () => {
  it('stops "while True: print(1)" at 64 KB with OutputLimit', () => {
    const r = h.runProgram('while True: print(1)\n');
    expect(r.outputTruncated).toBe(true);
    expect(r.timedOut).toBe(false);
    expect(r.error?.type).toBe('OutputLimit');
    expect(r.error?.message).toMatch(/64 KB/);
    const bytes = new TextEncoder().encode(r.stdout).length;
    expect(bytes).toBeLessThanOrEqual(64 * 1024);
    expect(bytes).toBeGreaterThan(60 * 1024);
    expect(r.stdout.startsWith('1\n1\n1\n')).toBe(true);

    const next = h.runProgram("print('short')");
    expect(next.outputTruncated).toBe(false);
    expect(next.error).toBeUndefined();
    expect(next.stdout).toBe('short\n');
  }, SLOW);

  it('catching the limit inside the loop does not keep the program running', () => {
    const r = h.runProgram('while True:\n    try:\n        print(1)\n    except BaseException:\n        pass\n', [], [], 3000);
    expect(r.outputTruncated).toBe(true);
    expect(r.error?.type).toBe('OutputLimit');
    expect(r.timedOut).toBe(false);
  }, SLOW);

  it('multi-byte characters are counted in bytes', () => {
    const r = h.runProgram("while True: print('é' * 50)\n");
    expect(r.error?.type).toBe('OutputLimit');
    expect(new TextEncoder().encode(r.stdout).length).toBeLessThanOrEqual(64 * 1024);
  }, SLOW);
});

// ------------------------------------------------------------------------------------------------------------------

describe('run_program input()', () => {
  const code = "name = input('Name: ')\nage = int(input('Age: '))\nprint(name, 'is', age + 1)\n";

  it('feeds queued lines in order and echoes prompt and answer', () => {
    const r = h.runProgram(code, ['Ann', '19']);
    expect(r.error).toBeUndefined();
    expect(r.needInput).toBeUndefined();
    expect(r.stdout).toBe('Name: Ann\nAge: 19\nAnn is 20\n');
  });

  it('sets needInput with the prompt when the queue runs out, without an error', () => {
    const r = h.runProgram(code, ['Ann']);
    expect(r.needInput).toEqual({ prompt: 'Age: ' });
    expect(r.error).toBeUndefined();
    expect(r.timedOut).toBe(false);
    expect(r.stdout).toBe('Name: Ann\n');

    const none = h.runProgram("print('start')\nx = input()\nprint(x)");
    expect(none.needInput).toEqual({ prompt: '' });
    expect(none.stdout).toBe('start\n');
  });

  it('a bare except around input() cannot hide the request for input', () => {
    const r = h.runProgram("try:\n    x = input('x? ')\nexcept:\n    x = 'none'\nprint(x)\n");
    expect(r.needInput).toEqual({ prompt: 'x? ' });
    expect(r.stdout).not.toContain('none');
    expect(r.error).toBeUndefined();
  });

  it('writes virtual files and returns them after the run', () => {
    const r = h.runProgram(
      "with open('temps.txt') as f:\n    total = sum(int(x) for x in f)\nwith open('out.txt', 'w') as g:\n    g.write(str(total))\n",
      [], [{ name: 'temps.txt', content: '30\n12\n' }]);
    expect(r.error).toBeUndefined();
    expect(r.filesAfter).toEqual([{ name: 'out.txt', content: '42' }, { name: 'temps.txt', content: '30\n12\n' }]);
    expect(h.runProgram("open('out.txt')").error?.type).toBe('FileNotFoundError');
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('input() in tests', () => {
  it('a program test that asks for more input than provided fails with a plain EOFError', () => {
    const code = 'a = int(input())\nb = int(input())\nprint(a + b)\n';
    const r = h.runTests(code, [
      T('short', { stdin: ['3'], expectStdout: '5' }),
      T('full', { stdin: ['3', '4'], expectStdout: '3\n4\n7' }),
    ], 'program');
    const [short, full] = r.outcomes;
    expect(short.pass).toBe(false);
    expect(short.error?.type).toBe('EOFError');
    expect(short.error?.message).toBe('Your program asked for more input than this test provides');
    expect(short.error?.line).toBe(2);
    expect(short.stdout).toBe('3\n');
    expect(full.pass).toBe(true);
    expect(full.error).toBeUndefined();
    expect(r.passed).toBe(1);
  });

  it('a function test that calls input() gets EOFError, and a project test also logs input_called', () => {
    const code = "def main():\n    return input('Guess: ')\n";
    const fn = outcomeOf(code, T('t', { call: 'main()', expect: "'x'" }), 'main');
    expect(fn.error?.type).toBe('EOFError');
    expect(fn.error?.message).toBe('Your program asked for more input than this test provides');
    expect(fn.stdout).toBe('Guess: ');
    expect(fn.detections).not.toContain('input_called');

    const proj = h.runTests(code, [T('t', { call: 'main()', expect: "'x'" })], 'project', 'main');
    expect(proj.outcomes[0].error?.type).toBe('EOFError');
    expect(proj.outcomes[0].detections).toContain('input_called');
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('pre-flight run of the file', () => {
  const tests = [T('a', { call: 'total([1, 2])', expect: '3' }), T('b', { call: 'total([])', expect: '0' })];

  it('a crash in top-level code is reported once as topLevelError and no tests run', () => {
    const code = "print('loading')\nscores = [1, 2]\nprint(scores[5])\n\ndef total(xs):\n    return sum(xs)\n";
    const r = fnTests(code, tests, 'total');
    expect(r.topLevelError?.type).toBe('IndexError');
    expect(r.topLevelError?.line).toBe(3);
    expect(r.topLevelError?.mistakes).toEqual(['top_level_code']);
    expect(r.outcomes).toEqual([]);
    expect(r.passed).toBe(0);
    expect(r.total).toBe(2);
    expect(r.compileError).toBeUndefined();
  });

  it('input() at top level is reported as InputCalled', () => {
    const r = fnTests("name = input('Name? ')\ndef total(xs):\n    return sum(xs)\n", tests, 'total');
    expect(r.topLevelError?.type).toBe('InputCalled');
    expect(r.topLevelError?.line).toBe(1);
    expect(r.topLevelError?.message).toMatch(/input\(\)/);
    expect(r.outcomes).toEqual([]);
  });

  it('an endless loop at top level is reported as a TimeoutError', () => {
    const r = fnTests('while True:\n    pass\ndef total(xs):\n    return sum(xs)\n', tests, 'total', [], 300);
    expect(r.topLevelError?.type).toBe('TimeoutError');
    expect(r.outcomes).toEqual([]);
  }, SLOW);

  it('top-level prints are allowed, and program tests skip the pre-flight run', () => {
    const r = fnTests("print('hello')\ndef total(xs):\n    return sum(xs)\n", tests, 'total');
    expect(r.topLevelError).toBeUndefined();
    expect(r.passed).toBe(2);

    const prog = h.runTests("n = int(input())\nprint(n * 2)\n", [T('p', { stdin: ['4'], expectStdout: '4\n8' })], 'program');
    expect(prog.topLevelError).toBeUndefined();
    expect(prog.outcomes[0].pass).toBe(true);
  });

  it('code that does not compile gives compileError and no outcomes', () => {
    const r = fnTests('def total(xs:\n    return sum(xs)\n', tests, 'total');
    expect(r.compileError?.type).toBe('SyntaxError');
    expect(r.compileError?.line).toBe(1);
    expect(r.outcomes).toEqual([]);
  });

  it('a missing or misspelt function gives missingFunction and no outcomes', () => {
    const r = fnTests('def totl(xs):\n    return sum(xs)\n', tests, 'total');
    expect(r.missingFunction).toBe('total');
    expect(r.topLevelError).toBeUndefined();
    expect(r.outcomes).toEqual([]);
    expect(r.passed).toBe(0);
    expect(fnTests('total = 5\n', tests, 'total').missingFunction).toBe('total');
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('mistake detections', () => {
  it('print_vs_return: the function prints the expected value and returns None', () => {
    const o = outcomeOf('def area(w, h):\n    print(w * h)\n', T('t', { call: 'area(3, 4)', expect: '12' }), 'area');
    expect(o.pass).toBe(false);
    expect(o.got).toBe('None');
    expect(o.stdout).toBe('12\n');
    expect(o.detections).toContain('print_vs_return');
    expect(o.detections).not.toContain('return_type_wrong');

    const s = outcomeOf('def shout(s):\n    print(s.upper())\n', T('t', { call: "shout('hi')", expect: "'HI'" }));
    expect(s.detections).toContain('print_vs_return');
  });

  it('print_vs_return is not logged when the printed text is unrelated or the answer is right', () => {
    const other = outcomeOf("def area(w, h):\n    print('area')\n", T('t', { call: 'area(3, 4)', expect: '12' }));
    expect(other.detections).not.toContain('print_vs_return');
    const both = outcomeOf('def area(w, h):\n    print(w * h)\n    return w * h\n', T('t', { call: 'area(3, 4)', expect: '12' }));
    expect(both.pass).toBe(true);
    expect(both.detections).toEqual([]);
  });

  it('forgot_to_call: returning a function or method object', () => {
    const fn = outcomeOf('def get_total(xs):\n    return sum\n', T('t', { call: 'get_total([1, 2])', expect: '3' }));
    expect(fn.pass).toBe(false);
    expect(fn.detections).toContain('forgot_to_call');
    const method = outcomeOf('def shout(s):\n    return s.upper\n', T('t', { call: "shout('hi')", expect: "'HI'" }));
    expect(method.detections).toContain('forgot_to_call');
    const user = outcomeOf('def helper():\n    return 5\ndef answer():\n    return helper\n', T('t', { call: 'answer()', expect: '5' }));
    expect(user.detections).toContain('forgot_to_call');
  });

  it('forgot_to_call: printing or concatenating a function object', () => {
    const printed = outcomeOf('def helper():\n    return 5\ndef show():\n    print(helper)\n', T('t', { call: 'show()', expect: '5' }));
    expect(printed.stdout).toMatch(/^<function helper at /);
    expect(printed.detections).toContain('forgot_to_call');
    const joined = outcomeOf("def g():\n    return 1\ndef f():\n    return 'x' + str(g)\n", T('t', { call: 'f()', expect: "'x1'" }));
    expect(joined.detections).toContain('forgot_to_call');
    const prog = h.runTests("name = 'ann'\nprint(name.upper)\n", [T('p', { expectStdout: 'ANN' })], 'program');
    expect(prog.outcomes[0].pass).toBe(false);
    expect(prog.outcomes[0].detections).toContain('forgot_to_call');
    const ok = h.runTests("name = 'ann'\nprint(name.upper())\n", [T('p', { expectStdout: 'ANN' })], 'program');
    expect(ok.outcomes[0]).toMatchObject({ pass: true, detections: [] });
  });

  it('mutated_input: setup values listed in argsUnchanged must not change', () => {
    const test = T('t', { setup: 'data = [3, 1, 2]', call: 'sorted_copy(data)', expect: '[1, 2, 3]', argsUnchanged: ['data'] });
    const bad = outcomeOf('def sorted_copy(xs):\n    xs.sort()\n    return xs\n', test, 'sorted_copy');
    expect(bad.pass).toBe(false);
    expect(bad.got).toBe('[1, 2, 3]');
    expect(bad.detections).toEqual(['mutated_input']);

    const good = outcomeOf('def sorted_copy(xs):\n    return sorted(xs)\n', test, 'sorted_copy');
    expect(good.pass).toBe(true);
    expect(good.detections).toEqual([]);

    const unchecked = outcomeOf('def sorted_copy(xs):\n    xs.sort()\n    return xs\n',
      T('t', { setup: 'data = [3, 1, 2]', call: 'sorted_copy(data)', expect: '[1, 2, 3]' }));
    expect(unchecked.pass).toBe(true);

    const nested = outcomeOf("def add(stock, item):\n    stock['items'].append(item)\n    return len(stock['items'])\n",
      T('t', { setup: "inv = {'items': ['tea']}", call: "add(inv, 'milk')", expect: '2', argsUnchanged: ['inv'] }));
    expect(nested.detections).toContain('mutated_input');
  });

  it('a failing tagged test logs its tag; a passing one does not', () => {
    const tagged = T('t', { call: 'total([])', expect: '0', tag: 'accumulator_init', hidden: true, label: 'empty list' });
    const bad = outcomeOf('def total(xs):\n    t = None\n    for x in xs:\n        t = (t or 0) + x\n    return t\n', tagged);
    expect(bad).toMatchObject({ pass: false, tag: 'accumulator_init', hidden: true, label: 'empty list' });
    expect(bad.detections).toContain('accumulator_init');
    const good = outcomeOf('def total(xs):\n    return sum(xs)\n', tagged);
    expect(good.detections).toEqual([]);
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('rule violations', () => {
  const violations = (code: string, rules: RuleId[]) => fnTests(code, [], undefined, rules).ruleViolations;

  function expectPlain(v: { message: string }[]) {
    for (const { message } of v) {
      expect(message.length).toBeGreaterThan(30);
      expect(message).not.toMatch(INTERNAL_WORDS);
    }
  }

  it('noImport', () => {
    const v = violations('import math\n\ndef area(r):\n    return math.pi * r ** 2\n', ['noImport']);
    expect(v).toEqual([{ rule: 'noImport', line: 1, message: expect.stringMatching(/[Ii]mport/) }]);
    expectPlain(v);
    expect(violations('import math\n', [])).toEqual([]);
  });

  it('noImport also blocks imports while the code runs', () => {
    const r = fnTests('import math\ndef area(r):\n    return math.pi * r ** 2\n',
      [T('t', { call: 'area(1)', expect: '3.141592653589793' })], 'area', ['noImport']);
    expect(r.topLevelError?.type).toBe('ImportError');
    expect(r.topLevelError?.message).toMatch(/not allowed/);
    expect(r.topLevelError?.message).not.toMatch(INTERNAL_WORDS);
    const inside = fnTests('def area(r):\n    import math\n    return math.pi * r ** 2\n',
      [T('t', { call: 'area(1)', expect: '3.141592653589793' })], 'area', ['noImport']);
    expect(inside.outcomes[0].error?.type).toBe('ImportError');
    const allowed = fnTests('import math\ndef area(r):\n    return math.pi * r ** 2\n',
      [T('t', { call: 'area(1)', expect: '3.141592653589793' })], 'area');
    expect(allowed.outcomes[0].pass).toBe(true);
  });

  it('noImport does not break files, formatting and builtins that load modules internally', () => {
    const code = [
      'def main(name):',
      "    with open(name, encoding='utf-8-sig') as f:",
      "        rows = [line.strip().split(',') for line in f]",
      "    with open('out.txt', 'w', encoding='latin-1') as g:",
      "        g.write('done')",
      "    d = {'b': 2, 'a': 1}",
      "    return len(rows), '%.2f' % 3.14159, f'{1234567:,}', max(d, key=d.get), sorted(['B', 'a'], key=str.lower)",
      '',
    ].join('\n');
    const r = h.runTests(code, [T('t', {
      call: "main('scores')", expect: "(2, '3.14', '1,234,567', 'b', ['a', 'B'])",
      files: [{ name: 'scores', content: '\ufeffname,score\nann,9\n' }],
    })], 'project', 'main', ['noImport']);
    expect(r.outcomes[0].error).toBeUndefined();
    expect(r.outcomes[0].pass).toBe(true);
  });

  it('noPrint allows print only inside an except handler', () => {
    const v = violations('def total(xs):\n    print(xs)\n    return sum(xs)\n', ['noPrint']);
    expect(v).toEqual([{ rule: 'noPrint', line: 2, message: expect.stringMatching(/print\(\)/) }]);
    expectPlain(v);
    const graceful = 'def load(name):\n    try:\n        return open(name).read()\n    except OSError:\n        print("Could not open", name)\n        return None\n';
    expect(violations(graceful, ['noPrint'])).toEqual([]);
  });

  it('noInput', () => {
    const v = violations('def main():\n    name = input()\n    return name\n', ['noInput']);
    expect(v).toEqual([{ rule: 'noInput', line: 2, message: expect.stringMatching(/input\(\)/) }]);
    expectPlain(v);
  });

  it('noCsvExt flags every ".csv" string literal', () => {
    const v = violations("def main(filename):\n    if not filename.endswith('.csv'):\n        filename += '.csv'\n    return filename\n", ['noCsvExt']);
    expect(v.map((x) => [x.rule, x.line])).toEqual([['noCsvExt', 2], ['noCsvExt', 3]]);
    expectPlain(v);
    expect(violations("def main(filename):\n    return open(filename)\n", ['noCsvExt'])).toEqual([]);
  });

  it('noLoops flags for, while and comprehensions but not recursion', () => {
    const v = violations('def total(xs):\n    t = 0\n    for x in xs:\n        t += x\n    return t\n', ['noLoops']);
    expect(v).toEqual([{ rule: 'noLoops', line: 3, message: expect.stringMatching(/[Ll]oops/) }]);
    expectPlain(v);
    expect(violations('def total(xs):\n    return sum([x for x in xs])\n', ['noLoops']).map((x) => x.line)).toEqual([2]);
    expect(violations('def count(n):\n    while n > 0:\n        n -= 1\n    return n\n', ['noLoops']).map((x) => x.line)).toEqual([2]);
    const rec = 'def total(xs):\n    if not xs:\n        return 0\n    return xs[0] + total(xs[1:])\n';
    expect(violations(rec, ['noLoops'])).toEqual([]);
  });

  it('several rules report together, sorted by line', () => {
    const code = "import csv\ndef main(name):\n    print(name + '.csv')\n    return [r for r in open(name)]\n";
    const v = violations(code, ['noImport', 'noPrint', 'noCsvExt', 'noLoops', 'noInput']);
    expect(v.map((x) => [x.line, x.rule])).toEqual([[1, 'noImport'], [3, 'noCsvExt'], [3, 'noPrint'], [4, 'noLoops']]);
    expectPlain(v);
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('import blocking', () => {
  it.each([
    ['import os\nprint(os.getcwd())', 'os'],
    ['from os import path', 'os'],
    ['import os.path', 'os'],
    ['import subprocess', 'subprocess'],
    ['import js', 'js'],
    ['import sys', 'sys'],
    ['import _pl.harness', '_pl'],
    ["__import__('os')", 'os'],
  ])('%s is blocked', (code, mod) => {
    const r = h.runProgram(code);
    expect(r.error?.type).toBe('ImportError');
    expect(r.error?.message).toBe(`Importing ${mod} is not available here`);
    expect(r.error?.line).toBe(1);
    expect(r.stdout).toBe('');
  });

  it('math, random and other teaching modules are allowed without noImport', () => {
    const r = h.runProgram('import math\nfrom random import randint\nimport csv\nprint(math.sqrt(16), randint(3, 3))');
    expect(r.error).toBeUndefined();
    expect(r.stdout).toBe('4.0 3\n');
  });

  it('blocking applies only to student code: the harness can still import os afterwards', () => {
    h.runProgram('import os');
    expect(h.py.runPython('import os\nos.sep')).toBe('/');
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('trace rows', () => {
  it('records exactly one row per execution of the anchor line (PLAN 3.4 example)', () => {
    const r = h.trace('total = 0\nfor day in range(1, 5):\n    total += day * 2', ['day', 'total'], 3);
    expect(r.error).toBeUndefined();
    expect(r.stdout).toBe('');
    expect(r.rows).toHaveLength(4);
    expect(r.rows).toEqual([['1', '2'], ['2', '6'], ['3', '12'], ['4', '20']]);
  });

  it('names that do not exist are empty, values are repr strings, globals are visible, and a return closes the row', () => {
    const code = "def label(n):\n    word = 'x' * n\n    return word\n\nfor i in range(2):\n    print(label(i))\n";
    const r = h.trace(code, ['n', 'word', 'i', 'missing'], 2);
    expect(r.rows).toEqual([['0', "''", '0', ''], ['1', "'x'", '1', '']]);
    expect(r.stdout).toBe('\nx\n');
    const before = h.trace('x = 1\ny = 2\nx = x + y\n', ['x', 'y'], 1);
    expect(before.rows).toEqual([['1', '']]);
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('pair (break the code)', () => {
  it('NaN results are treated as equal', () => {
    const p = h.pair("def f(x):\n    return float('nan')\n", "def f(x):\n    return x * float('nan')\n", 'f', '(1,)');
    expect(p).toMatchObject({ validArgs: true, differs: false, refResult: 'nan', bugResult: 'nan' });
    const nested = h.pair("def f(x):\n    return [float('nan'), x]\n", "def f(x):\n    return [x * float('nan'), 1.0 * x]\n", 'f', '(2,)');
    expect(nested.differs).toBe(false);
  });

  it('different exception types count as differs; the same type with a different message does not', () => {
    const ref = "def first(xs):\n    if not xs:\n        raise ValueError('empty list')\n    return xs[0]\n";
    const bug = 'def first(xs):\n    return xs[0]\n';
    const p = h.pair(ref, bug, 'first', '([],)');
    expect(p.validArgs).toBe(true);
    expect(p.differs).toBe(true);
    expect(p.refResult).toBe('raises ValueError: empty list');
    expect(p.bugResult).toBe('raises IndexError: list index out of range');

    const same = h.pair("def first(xs):\n    raise ValueError('a')\n", "def first(xs):\n    raise ValueError('b')\n", 'first', '([1],)');
    expect(same.differs).toBe(false);
    expect(h.pair(ref, bug, 'first', '([4, 5],)')).toMatchObject({ differs: false, refResult: '4', bugResult: '4' });
  });

  it('a value against an exception, and a tuple against a list, count as differs', () => {
    const avg = h.pair('def mean(xs):\n    return sum(xs) / len(xs) if xs else None\n', 'def mean(xs):\n    return sum(xs) / len(xs)\n', 'mean', '([],)');
    expect(avg).toMatchObject({ differs: true, refResult: 'None', bugResult: 'raises ZeroDivisionError: division by zero' });
    const kinds = h.pair('def f(a, b):\n    return (a, b)\n', 'def f(a, b):\n    return [a, b]\n', 'f', '(1, "x")');
    expect(kinds.differs).toBe(true);
  });

  it('each implementation gets its own copy of the arguments', () => {
    const p = h.pair('def f(xs):\n    xs.append(0)\n    return len(xs)\n', 'def f(xs):\n    return len(xs) + 1\n', 'f', '([1, 2],)');
    expect(p).toMatchObject({ differs: false, refResult: '3', bugResult: '3' });
  });

  it('an endless loop in the buggy version is a timeout, not a hang', () => {
    const p = h.pair('def f(n):\n    return n\n', 'def f(n):\n    while n:\n        pass\n    return n\n', 'f', '(1,)');
    expect(p.differs).toBe(true);
    expect(p.bugResult).toMatch(/^raises TimeoutError/);
  }, SLOW);

  it('rejects arguments that are not a tuple literal with a plain explanation', () => {
    const notTuple = h.pair('def f(x):\n    return x\n', 'def f(x):\n    return x\n', 'f', '(5)');
    expect(notTuple.validArgs).toBe(false);
    expect(notTuple.differs).toBe(false);
    expect(notTuple.parseError).toMatch(/^That is an int, not a tuple\./);
    expect(notTuple.parseError).toContain('(5,)');
    const listArg = h.pair('def f(x):\n    return x\n', 'def f(x):\n    return x\n', 'f', '[5]');
    expect(listArg.parseError).toMatch(/^That is a list, not a tuple\./);
    for (const bad of ['', '   ', '(foo,)', '(1,']) {
      const r = h.pair('def f(x):\n    return x\n', 'def f(x):\n    return x\n', 'f', bad);
      expect(r.validArgs).toBe(false);
      expect(r.parseError).toMatch(/tuple/);
    }
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('analyze', () => {
  it('reports the SyntaxError position for "if x = 5:"', () => {
    const r = h.analyze('if x = 5:\n    pass\n');
    expect(r.syntaxError).toMatchObject({ type: 'SyntaxError', line: 1, col: 4, endCol: 9 });
    expect(r.syntaxError?.message).toContain("'=='");
    expect(r.flags).toEqual([]);
  });

  it('reports a missing colon, a bad indent and an unclosed bracket', () => {
    expect(h.analyze('if x == 5\n    pass\n').syntaxError).toMatchObject({ type: 'SyntaxError', message: "expected ':'", line: 1 });
    expect(h.analyze('def f():\nreturn 1\n').syntaxError).toMatchObject({ type: 'IndentationError', line: 2 });
    expect(h.analyze('print((1, 2)\nx = 3\n').syntaxError).toMatchObject({ message: "'(' was never closed", line: 1, col: 6 });
  });

  it('returns flags with lines for code that parses', () => {
    const r = h.analyze('def total(xs):\n    t = 0\n    for x in xs:\n        t += x\n    print(t)\n');
    expect(r.syntaxError).toBeUndefined();
    expect(r.flags).toContainEqual({ flag: 'loop_present', line: 3 });
    expect(r.flags).toContainEqual({ flag: 'for_each', line: 3 });
    expect(r.flags).toContainEqual({ flag: 'print_call', line: 5 });
  });
});

// ------------------------------------------------------------------------------------------------------------------

describe('interpreter hygiene', () => {
  it('JS null for an optional argument is treated like None', () => {
    type RawFn = (...args: unknown[]) => string;
    const mod = h.py.pyimport('_pl.harness') as unknown as Record<string, RawFn>;
    const run = JSON.parse(mod.run_program("print('hi')", null, null, null)) as { stdout: string; error?: unknown };
    expect(run).toMatchObject({ stdout: 'hi\n' });
    expect(run.error).toBeUndefined();
    const tests = JSON.stringify([T('t', { call: 'double(2)', expect: '4' })]);
    const res = JSON.parse(mod.run_tests('def double(n):\n    return n * 2\n', tests, 'function', null, null, null)) as TestsResult;
    expect(res.missingFunction).toBeUndefined();
    expect(res.passed).toBe(1);
    const tr = JSON.parse(mod.trace('a = 1\n', '["a"]', 1, null)) as { rows: string[][] };
    expect(tr.rows).toEqual([['1']]);
  });

  it('after all the runs above, no sandbox patch is left behind', () => {
    const state = JSON.parse(h.py.runPython([
      'import sys, builtins, json',
      'json.dumps({',
      "  'tools': [sys.monitoring.get_tool(i) for i in range(6)],",
      "  'trace': sys.gettrace() is None,",
      "  'stdout': type(sys.stdout).__name__,",
      "  'input': builtins.input.__module__,",
      "  'import': builtins.__import__.__module__,",
      "  'limit': sys.getrecursionlimit(),",
      '})',
    ].join('\n')) as string) as Record<string, unknown>;
    expect(state.tools).not.toContain('pyladder');
    expect(state.trace).toBe(true);
    expect(state.stdout).not.toBe('CappedWriter');
    expect(state.input).toBe('builtins');
    expect(state.import).toBe('builtins');
    expect(state.limit).toBe(1000);
  });
});
