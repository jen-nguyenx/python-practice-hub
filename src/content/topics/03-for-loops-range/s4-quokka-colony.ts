import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s4',
  title: 'Rottnest quokka colony',
  story:
    'A simple model of a quokka colony on Rottnest Island: months 1 and 2 each have 1 breeding pair, and every later month has the sum of the two months before it: 1, 1, 2, 3, 5, 8, 13 ... ' +
    "Real quokkas breed far more slowly; this is Fibonacci's rabbit puzzle with a Rottnest twist, and a favourite on CITS1401 practice sheets.",
  questions: [
    {
      id: 't03-s4-q1',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'Pairs month by month',
      prompt:
        'Fill in `month`, `prev` and `curr` each time line 4 finishes running. ' +
        'After each pass, `curr` is the number of pairs in that month and `prev` is the number in the month before.',
      code:
        'prev = 1\n' +
        'curr = 1\n' +
        'for month in range(3, 7):\n' +
        '    prev, curr = curr, prev + curr\n' +
        "print('Pairs in month 6:', curr)",
      watch: ['month', 'prev', 'curr'],
      anchorLine: 4,
      concepts: ['fibonacci', 'simultaneous-assignment', 'trace', 'range'],
      detects: ['off_by_one_range'],
      expectedSec: 180,
      hints: [
        'In `prev, curr = curr, prev + curr`, Python works out both values on the right using the old values first, and only then stores them.',
        'For each row: the new `prev` is the old `curr`, and the new `curr` is old `prev` + old `curr`. `range(3, 7)` decides how many rows there are.',
        'The first row is month 3, prev 1, curr 2.',
      ],
      solution: {
        explanation:
          '`range(3, 7)` gives 3, 4, 5, 6, so there are four rows. Before the loop, prev = 1 and curr = 1 (months 1 and 2).\n\n' +
          '1. month 3: prev = 1, curr = 1 + 1 = 2\n' +
          '2. month 4: prev = 2, curr = 1 + 2 = 3\n' +
          '3. month 5: prev = 3, curr = 2 + 3 = 5\n' +
          '4. month 6: prev = 5, curr = 3 + 5 = 8\n\n' +
          'Both right-hand values are worked out before either variable changes, so each new `curr` uses the old `prev`. Line 5 then prints `Pairs in month 6: 8`.',
      },
      selfExplain: 'If line 4 were split into prev = curr and then curr = prev + curr, what would curr be after month 4?',
    },
    {
      id: 't03-s4-q2',
      format: 'fixBug',
      diff: 'hard',
      core: false,
      title: 'First month over the target',
      prompt:
        'Rangers want to know when the model colony first has **more than** `target` pairs. ' +
        '`first_month_over(target, months)` should check months 1 to `months` in order and **return** the first month number whose pair count is greater than `target`. ' +
        'If no month up to `months` is over the target, it returns 0.\n\n' +
        'For example `first_month_over(4, 10)` should return 5, because month 5 is the first month with more than 4 pairs (it has 5). ' +
        'The code below gives the wrong answer for most inputs. Find and fix the bug without rewriting the whole function.',
      buggy:
        'def first_month_over(target, months):\n' +
        '    pairs = 1\n' +
        '    next_pairs = 1\n' +
        '    for month in range(1, months + 1):\n' +
        '        if pairs > target:\n' +
        '            return month\n' +
        '        else:\n' +
        '            return 0\n' +
        '        pairs, next_pairs = next_pairs, pairs + next_pairs',
      bugMistake: 'early_return_in_loop',
      maxChangedLines: 2,
      fnName: 'first_month_over',
      tests: [
        { id: 'v1', call: 'first_month_over(4, 10)', expect: '5', label: 'more than 4 pairs within 10 months', hidden: false, tag: 'early_return_in_loop' },
        { id: 'v2', call: 'first_month_over(100, 10)', expect: '0', label: 'never over 100 within 10 months', hidden: false },
        { id: 'h1', call: 'first_month_over(50, 10)', expect: '10', label: 'first over in the very last month', hidden: true },
        { id: 'h2', call: 'first_month_over(5, 12)', expect: '6', label: 'exactly equal to the target is not over', hidden: true },
        { id: 'h3', call: 'first_month_over(0, 1)', expect: '1', label: 'one month to check and it is over', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'first_month_over(1, 2)', expect: '0', label: 'months 1 and 2 have only 1 pair', hidden: true },
        { id: 'h5', call: 'first_month_over(3, 0)', expect: '0', label: 'no months to check', hidden: true, tag: 'early_return_in_loop' },
      ],
      concepts: ['fibonacci', 'early-return', 'loop-if', 'search'],
      detects: ['early_return_in_loop', 'off_by_one_range'],
      expectedSec: 420,
      hints: [
        'How many months does the loop really look at before the function returns?',
        '`return` ends the whole function straight away. Returning 0 is only right once every month has been checked and none was over the target, so that return cannot live inside the loop.',
        'The `else:` branch has to go. Which indentation level would make `return 0` run only once the loop has finished?',
      ],
      solution: {
        code:
          'def first_month_over(target, months):\n' +
          '    pairs = 1\n' +
          '    next_pairs = 1\n' +
          '    for month in range(1, months + 1):\n' +
          '        if pairs > target:\n' +
          '            return month\n' +
          '        pairs, next_pairs = next_pairs, pairs + next_pairs\n' +
          '    return 0',
        explanation:
          'In the buggy version, month 1 either returns 1 (if 1 pair is over the target) or hits `else: return 0`. Either way the function ends on the first pass, so month 2 onwards is never checked and the update line never runs.\n\n' +
          '1. `pairs` starts as the count for month 1, and `next_pairs` as the count for month 2.\n' +
          '2. `for month in range(1, months + 1):` checks months 1 to `months`, including the last one.\n' +
          '3. `if pairs > target: return month` stops as soon as the answer is found. `>` means a month with exactly `target` pairs does not count.\n' +
          '4. Otherwise the loop moves the model on a month: `pairs, next_pairs = next_pairs, pairs + next_pairs`.\n' +
          '5. `return 0` sits after the loop, so it only runs when every month has been checked. With `months` = 0 the loop never runs and the function returns 0 instead of None.',
      },
      selfExplain: 'Why could the line pairs, next_pairs = next_pairs, pairs + next_pairs never run in the buggy version?',
    },
    {
      id: 't03-s4-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-list',
      diff: 'hard',
      core: true,
      title: 'Filtered Fibonacci sum',
      prompt:
        'Exam-style question, 5 marks. There is no Run button: write your answer as you would on paper, then submit it once.\n\n' +
        'The Fibonacci numbers start 1, 1, 2, 3, 5, 8, 13, 21, 34, 55 ... (each number after the first two is the sum of the two before it). ' +
        'Write a function `fib_filter_sum(n)` that looks at the first `n` Fibonacci numbers and **returns** the sum of the ones that are divisible by **neither** 2 nor 5. Use a `for` loop.\n\n' +
        'For example, of the first 10 numbers, the ones divisible by neither 2 nor 5 are 1, 1, 3, 13 and 21, so `fib_filter_sum(10)` returns 39. ' +
        'If `n` is 0, return 0.',
      fnName: 'fib_filter_sum',
      starter:
        'def fib_filter_sum(n):\n' +
        '    """Return the sum of the first n Fibonacci numbers that are divisible by neither 2 nor 5."""\n' +
        '    pass\n',
      tests: [
        { id: 'v1', call: 'fib_filter_sum(10)', expect: '39', label: 'first 10 numbers', hidden: false },
        { id: 'v2', call: 'fib_filter_sum(5)', expect: '5', label: 'first 5 numbers', hidden: false },
        { id: 'h1', call: 'fib_filter_sum(0)', expect: '0', label: 'n is 0', hidden: true, tag: 'early_return_in_loop' },
        { id: 'h2', call: 'fib_filter_sum(1)', expect: '1', label: 'n is 1', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'fib_filter_sum(3)', expect: '2', label: 'third number is even', hidden: true },
        { id: 'h4', call: 'fib_filter_sum(15)', expect: '738', label: 'first 15 numbers', hidden: true },
      ],
      concepts: ['fibonacci', 'loop-if', 'accumulator', 'modulo'],
      detects: ['accumulator_init', 'off_by_one_range', 'early_return_in_loop', 'print_vs_return', 'shadow_builtin'],
      expectedSec: 420,
      hints: [
        'Split the job in two: produce the Fibonacci numbers one at a time, and decide for each one whether to add it to the total.',
        'Plan: start two variables at 1 and 1, and a total at 0. Loop `n` times. On each pass, if the current number is not divisible by 2 and not divisible by 5, add it to the total; then move both variables along one step. Return the total after the loop.',
        'The body of the loop can be:\n\n```python\nif this_fib % 2 != 0 and this_fib % 5 != 0:\n    total = total + this_fib\nthis_fib, next_fib = next_fib, this_fib + next_fib\n```',
      ],
      solution: {
        code:
          'def fib_filter_sum(n):\n' +
          '    """Return the sum of the first n Fibonacci numbers that are divisible by neither 2 nor 5."""\n' +
          '    this_fib = 1\n' +
          '    next_fib = 1\n' +
          '    total = 0\n' +
          '    for i in range(n):\n' +
          '        if this_fib % 2 != 0 and this_fib % 5 != 0:\n' +
          '            total = total + this_fib\n' +
          '        this_fib, next_fib = next_fib, this_fib + next_fib\n' +
          '    return total',
        explanation:
          '1. `this_fib = 1` and `next_fib = 1` hold the current Fibonacci number and the next one.\n' +
          '2. `total = 0` is set once, before the loop, so `fib_filter_sum(0)` returns 0.\n' +
          '3. `for i in range(n):` runs exactly `n` times, once per Fibonacci number. `range(1, n)` would look at one number too few.\n' +
          '4. "Divisible by neither 2 nor 5" means not divisible by 2 **and** not divisible by 5. Writing `or` would only skip numbers divisible by both 2 and 5 (multiples of 10, such as 610), so `fib_filter_sum(10)` would wrongly return 143, the sum of all ten.\n' +
          '5. `this_fib, next_fib = next_fib, this_fib + next_fib` moves both numbers one step along using the old values. It is outside the `if`, so it runs on every pass.\n' +
          '6. `return total` is after the loop, lined up with `for`, and returns the value rather than printing it.\n\n' +
          '**Marking guide (5):** accumulator set up before the loop (1), loop runs n times (1), Fibonacci update correct (1), divisibility test with `and` (1), returns the total after the loop (1).',
      },
      selfExplain: 'Why is this_fib % 2 != 0 or this_fib % 5 != 0 the wrong test here?',
    },
  ],
};

export default scenario;
