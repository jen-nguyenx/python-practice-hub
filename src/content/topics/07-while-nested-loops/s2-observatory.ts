// Topic 07, scenario 2: series summed to a tolerance (Perth Observatory maths night).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't07-s2',
  title: 'Perth Observatory maths night',
  story:
    'Volunteers at the Perth Observatory in Bickley are running a night on how calculators approximate numbers like e and pi. ' +
    'Each demo adds up a series, one term at a time, while the terms are still big enough to matter.',
  questions: [
    {
      id: 't07-s2-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'When should a series stop?',
      prompt:
        'A demo adds the series 1 - 1/3 + 1/5 - 1/7 + ... Its terms shrink towards zero and every second term is negative. ' +
        'The variable `term` holds the current term and `tol` is `0.0001`.\n\n' +
        'Which loop header keeps adding terms while they are big enough to matter, and is sure to stop?',
      options: [
        {
          id: 'a',
          text: 'while term != 0:',
          mistake: 'float_equality',
          why: 'The terms 1/3, 1/5, 1/7 ... get closer to 0 but never equal exactly 0, so this loop never stops. Compare a float against a tolerance, not with `==` or `!=`.',
        },
        {
          id: 'b',
          text: 'while abs(term) < tol:',
          why: 'This is the opposite condition. The first term is 1, which is not below 0.0001, so the body never runs. A `while` condition says when to **keep going**, not when to stop.',
        },
        {
          id: 'c',
          text: 'while term >= tol:',
          why: 'It works for the first term, but the second term is -1/3, which is less than `tol`, so the loop stops after adding only one term. Negative terms need `abs()`.',
        },
        {
          id: 'd',
          text: 'while abs(term) >= tol:',
          correct: true,
          why: '`abs` ignores the sign, so negative terms keep the loop going too. The terms shrink, so one of them eventually has a size below `tol` and the loop stops.',
        },
      ],
      concepts: ['while', 'series', 'tolerance', 'float'],
      detects: ['float_equality'],
      expectedSec: 75,
      hints: [
        'Two questions to ask of each header: does it keep going for a negative term, and can the condition ever become False?',
        'A shrinking float almost never lands exactly on 0. And a `while` condition must be True for the terms you still want to add.',
        'You want "the size of the term is at least tol". The size of a number, ignoring its sign, is `abs(...)`.',
      ],
      solution: {
        explanation:
          '`while abs(term) >= tol:` is right. `abs(term)` is the size of the term with the sign removed, so -1/3 counts as 0.333..., which is still big enough. ' +
          'The terms keep shrinking, so eventually `abs(term)` drops below 0.0001 and the loop ends.\n\n' +
          '- `term != 0` never becomes False, because the terms never equal exactly 0.\n' +
          '- `abs(term) < tol` is False straight away, so nothing is added.\n' +
          '- `term >= tol` stops at the first negative term.',
      },
      selfExplain: 'Why does a series loop compare the term against tol instead of against 0?',
    },
    {
      id: 't07-s2-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      choice: true,
      title: 'Halving until small',
      prompt: 'The warm-up demo adds 1 + 1/2 + 1/4 + ... while the term is at least 0.1. What does this program print?',
      code: `term = 1
total = 0
count = 0
while term >= 0.1:
    total = total + term
    count = count + 1
    term = term / 2
print(count, total)`,
      mutants: [
        {
          mistake: 'int_vs_float_division',
          code: `term = 1
total = 0
count = 0
while term >= 0.1:
    total = total + term
    count = count + 1
    term = term // 2
print(count, total)`,
        },
        {
          mistake: 'accumulator_init',
          code: `term = 1
count = 0
while term >= 0.1:
    total = 0
    total = total + term
    count = count + 1
    term = term / 2
print(count, total)`,
        },
        {
          mistake: 'off_by_one_range',
          code: `term = 1
total = 0
count = 0
while term >= 0.05:
    total = total + term
    count = count + 1
    term = term / 2
print(count, total)`,
        },
      ],
      concepts: ['while', 'series', 'tolerance', 'accumulator'],
      detects: ['int_vs_float_division', 'accumulator_init', 'off_by_one_range'],
      expectedSec: 100,
      hints: [
        'List the values `term` takes, and check the condition before each pass.',
        'The terms are 1, 0.5, 0.25, 0.125, 0.0625 ... Which of them pass the test `term >= 0.1`? Only those get added.',
        'Add up only the terms that pass the check. Be careful with 0.0625: it is made at the end of pass 4, but it is only added if the check before pass 5 lets it through.',
      ],
      solution: {
        explanation:
          'The condition is checked before each pass.\n\n' +
          '1. `term` is 1: add it, `count` 1, `term` becomes 0.5.\n' +
          '2. 0.5 >= 0.1: `total` 1.5, `count` 2, `term` 0.25.\n' +
          '3. 0.25 >= 0.1: `total` 1.75, `count` 3, `term` 0.125.\n' +
          '4. 0.125 >= 0.1: `total` 1.875, `count` 4, `term` 0.0625.\n' +
          '5. 0.0625 >= 0.1 is False, so the loop ends. 0.0625 is never added.\n\n' +
          'The program prints `4 1.875`. `/` always gives a float, so `total` is a float even though `term` started as the int 1.',
      },
      selfExplain: 'What would the program print if the last line of the loop body were term = term // 2?',
    },
    {
      id: 't07-s2-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 15,
      diff: 'hard',
      core: true,
      title: 'The e series (exam style)',
      prompt:
        '*Exam style, 15 marks. Write it by hand first, then submit once.*\n\n' +
        'The number e can be approximated by the series\n\n' +
        '1/0! + 1/1! + 1/2! + 1/3! + 1/4! + ...\n\n' +
        'where 0! = 1 and k! = 1 × 2 × ... × k. Write a function `e_series(tol)` that adds up the terms of this series, starting with 1/0!, ' +
        '**while the current term is greater than or equal to `tol`**, and returns the sum **rounded to 6 decimal places**.\n\n' +
        '- Do not use `import`. Build each term from the previous one: the term after 1/k! is that term divided by (k + 1).\n' +
        '- Round only the final answer.\n' +
        '- If the first term is already smaller than `tol`, return `0`.\n\n' +
        'Example: `e_series(0.1)` adds 1 + 1 + 0.5 + 0.1666... and returns `2.666667`.',
      fnName: 'e_series',
      starter: `def e_series(tol):
    pass`,
      rules: ['noImport'],
      tests: [
        { id: 'v1', call: 'e_series(0.1)', expect: '2.666667', cmp: 'float', tol: 1e-9, label: 'tol = 0.1', hidden: false },
        { id: 'v2', call: 'e_series(0.001)', expect: '2.718056', cmp: 'float', tol: 1e-9, label: 'tol = 0.001', hidden: false },
        { id: 'h1', call: 'e_series(1)', expect: '2.0', cmp: 'float', tol: 1e-9, label: 'a term exactly equal to tol is still added', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'e_series(0.01)', expect: '2.708333', cmp: 'float', tol: 5e-7, label: 'rounding only at the end (tol = 0.01)', hidden: true, tag: 'round_mid_calc' },
        { id: 'h3', call: 'e_series(5)', expect: '0.0', cmp: 'float', tol: 1e-9, label: 'first term already below tol', hidden: true, tag: 'accumulator_init' },
        { id: 'h4', call: 'e_series(1e-10)', expect: '2.718282', cmp: 'float', tol: 1e-9, label: 'very small tolerance', hidden: true },
      ],
      concepts: ['while', 'series', 'tolerance', 'factorial', 'round'],
      detects: ['off_by_one_range', 'round_mid_calc', 'float_equality', 'infinite_while', 'import_used', 'int_vs_float_division'],
      expectedSec: 660,
      hints: [
        'You do not know how many terms there will be, so use a `while` loop that checks the current term. You never need to compute a factorial from scratch.',
        'Plan: before the loop set `total` to 0, `term` to 1.0 (that is 1/0!) and `k` to 0. While `term >= tol`: add `term` to `total`, add 1 to `k`, then divide `term` by `k`. After the loop, return `total` rounded to 6 places.',
        'The loop is `while term >= tol:` and its last line is `term = term / k`. The final line of the function is `return round(total, 6)`.',
      ],
      solution: {
        code: `def e_series(tol):
    total = 0
    term = 1.0
    k = 0
    while term >= tol:
        total = total + term
        k = k + 1
        term = term / k
    return round(total, 6)`,
        explanation:
          '- `total = 0`: nothing added yet. `term = 1.0` is the first term, 1/0!. `k = 0` is the number of that term.\n' +
          '- `while term >= tol:` uses `>=` because the spec says "greater than or equal to". With `tol = 1` the second term, 1/1! = 1, must still be added.\n' +
          '- `total = total + term` adds the current term before the next one is made.\n' +
          '- `k = k + 1` then `term = term / k` turns 1/(k-1)! into 1/k! in one step, so there is no factorial loop and no `import math`.\n' +
          '- The terms shrink quickly, so the condition always becomes False and the loop stops.\n' +
          '- `return round(total, 6)` rounds once. Rounding `total` or `term` inside the loop gives 2.708334 instead of 2.708333 for `tol = 0.01`.\n\n' +
          'Marking guide (15): set-up before the loop (3), correct `while` condition (3), add the term then update it from the previous term (5), round once and return (2), no import and no print (2).',
      },
      selfExplain: 'Why is dividing the previous term by k better than calculating k! from scratch on every pass?',
    },
    {
      id: 't07-s2-q4',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The demo that loses its first term',
      prompt:
        'The last demo of the night adds up 1 + r + r² + r³ + ... for a ratio `r` between 0 and 1, ' +
        '**while the current term is at least `tol`**, and returns the sum rounded to 6 decimal places.\n\n' +
        'The loop stops at the right time, but every answer comes out too small. Run the visible tests, find the bug, and fix it. ' +
        'The two lines in the body are both correct in themselves; only their order is wrong.',
      buggy: `def geometric_sum(ratio, tol):
    """Add 1 + ratio + ratio ** 2 + ... while the term is at least tol."""
    total = 0
    term = 1.0
    while term >= tol:
        term = term * ratio
        total = total + term
    return round(total, 6)`,
      bugMistake: 'off_by_one_range',
      maxChangedLines: 2,
      fnName: 'geometric_sum',
      tests: [
        { id: 'v1', call: 'geometric_sum(0.25, 0.01)', expect: '1.328125', cmp: 'float', tol: 1e-9, label: 'ratio 0.25, tol 0.01', hidden: false, tag: 'off_by_one_range' },
        { id: 'v2', call: 'geometric_sum(0.5, 0.2)', expect: '1.75', cmp: 'float', tol: 1e-9, label: 'ratio 0.5, tol 0.2', hidden: false },
        { id: 'h1', call: 'geometric_sum(0.1, 0.5)', expect: '1.0', cmp: 'float', tol: 1e-9, label: 'only the first term is big enough', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'geometric_sum(0.5, 2)', expect: '0', label: 'tol above the first term, so nothing is added', hidden: true, tag: 'accumulator_init' },
        { id: 'h3', call: 'geometric_sum(0.9, 0.3)', expect: '7.175705', cmp: 'float', tol: 1e-9, label: 'a slowly shrinking series', hidden: true },
        { id: 'h4', call: 'geometric_sum(0.3, 0.001)', expect: '1.42753', cmp: 'float', tol: 1e-9, label: 'a small tolerance', hidden: true },
      ],
      concepts: ['while', 'series', 'tolerance', 'accumulator', 'loop-order'],
      detects: ['off_by_one_range', 'accumulator_init', 'infinite_while'],
      expectedSec: 210,
      hints: [
        'Follow the first pass by hand with `ratio = 0.5`. Which value of `term` is added to `total` first, and which term does the series say should come first?',
        'The first term of the series is 1, but the body changes `term` to `ratio` before anything is added, so 1 is never counted and one term that is below `tol` is added instead.',
        'The body should add the current term first and only then work out the next one: `total = total + term` goes above `term = term * ratio`.',
      ],
      solution: {
        code: `def geometric_sum(ratio, tol):
    """Add 1 + ratio + ratio ** 2 + ... while the term is at least tol."""
    total = 0
    term = 1.0
    while term >= tol:
        total = total + term
        term = term * ratio
    return round(total, 6)`,
        explanation:
          '- `term = 1.0` is the first term of the series, and `while term >= tol:` has just checked that it is big enough to matter.\n' +
          '- In the buggy order, `term = term * ratio` runs first, so that checked term is thrown away before it is added. The 1 is lost, and the term added on the last pass is the one that was too small to pass the check.\n' +
          '- With the lines the right way round, every pass adds the term the condition approved, then prepares the next one. For `ratio = 0.5, tol = 0.2` the terms added are 1, 0.5 and 0.25, giving 1.75; the buggy version adds 0.5, 0.25 and 0.125, giving 0.875.\n' +
          '- The loop still ends, because `term` is multiplied by a ratio below 1 on every pass and eventually drops under `tol`.\n' +
          '- `round(total, 6)` is outside the loop, so the rounding happens once.\n' +
          '- When `tol` is above 1 the body never runs and `total` stays 0, which is why it must be set before the loop.',
      },
      selfExplain: 'Why does the buggy version still stop at the right time even though it adds the wrong terms?',
    },
  ],
};

export default scenario;
