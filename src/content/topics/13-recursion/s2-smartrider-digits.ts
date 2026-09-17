import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s2',
  title: 'SmartRider digit checks',
  story:
    'The Transperth help desk checks SmartRider card numbers read out over the phone. Their checking tools treat each card number as an int ' +
    'and peel off one digit at a time with `%` and `//`, using recursion instead of loops.',
  questions: [
    {
      id: 't13-s2-q1',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'The digit counter that never stops',
      prompt:
        '`count_digits(n)` should return how many digits the positive int `n` has, so `count_digits(30472915)` should return 8. ' +
        'The help desk\'s version crashes on every number, even `count_digits(7)`.\n\n' +
        'Click the line that raised the error, pick the exception, then pick the cause and fix.',
      code: `def count_digits(n):
    rest = count_digits(n // 10)
    if n < 10:
        return 1
    return 1 + rest

print('Checking card...')
print(count_digits(30472915))`,
      exceptionOptions: ['RecursionError', 'ZeroDivisionError', 'TypeError', 'IndexError'],
      causes: [
        {
          id: 'a',
          text:
            'Line 2 calls `count_digits` before the base case is checked, so every call makes another call (30472915, 3047291, ..., 3, 0, 0, 0 ...) and line 3 is never reached. ' +
            'Move `if n < 10: return 1` above the recursive call.',
          correct: true,
        },
        {
          id: 'b',
          text: '`n // 10` gives a float such as 3047291.5, so `n` never becomes a whole one-digit number. Use `int(n / 10)` instead.',
          mistake: 'int_vs_float_division',
        },
        {
          id: 'c',
          text: 'A function cannot call itself 8 times in a row, so counting the digits of a card number needs a `while` loop instead of recursion.',
          mistake: 'loop_in_recursion',
        },
      ],
      concepts: ['base-case', 'recursion-error', 'digits'],
      detects: ['missing_base_case', 'int_vs_float_division', 'loop_in_recursion'],
      expectedSec: 150,
      hints: [
        'Follow `count_digits(7)` one line at a time. What is the very first thing it does?',
        'A base case only helps if Python gets to it before the next call. In this function, which line runs first in every call: the check or the call?',
        'Every call reaches line 2 and calls again, forever: 7 calls with 0, 0 calls with 0, and so on. Python gives up with the error on line 2.',
      ],
      solution: {
        explanation:
          'Line 7 prints `Checking card...`, then line 8 calls `count_digits(30472915)`.\n\n' +
          'The first thing every call does is line 2: call `count_digits(n // 10)`. So 30472915 calls 3047291, which calls 304729, and so on down to 3, which calls 0, which calls 0 again. ' +
          'No call ever gets past line 2, so the base case on line 3 is never checked. ' +
          'Python stops the program with `RecursionError: maximum recursion depth exceeded`, reported on line 2, the line that keeps calling.\n\n' +
          'The fix is to check the base case first:\n\n' +
          '```python\ndef count_digits(n):\n    if n < 10:\n        return 1\n    return 1 + count_digits(n // 10)\n```\n\n' +
          '`//` with two ints always gives an int, so floats are not the problem, and recursion can easily go 8 calls deep.',
      },
      selfExplain: 'After the fix, why does count_digits(7) not call count_digits at all?',
    },
    {
      id: 't13-s2-q2',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Counting one digit',
      prompt:
        '`count_digit(n, d)` should return how many times the single digit `d` appears in the non-negative int `n`, as an int. ' +
        'For example `count_digit(1110, 1)` returns 3 and `count_digit(30472915, 6)` returns 0. Loops are not allowed.\n\n' +
        'Run the tests: some calls return `None` instead of a number. Fix it by changing one line.',
      buggy: `def count_digit(n, d):
    if n < 10:
        if n == d:
            return 1
        return 0
    if n % 10 == d:
        return 1 + count_digit(n // 10, d)
    count_digit(n // 10, d)`,
      bugMistake: 'recursion_result_ignored',
      maxChangedLines: 1,
      fnName: 'count_digit',
      tests: [
        { id: 'v1', call: 'count_digit(1110, 1)', expect: '3', label: 'last digit is not d', hidden: false, tag: 'recursion_result_ignored' },
        { id: 'v2', call: 'count_digit(5555, 5)', expect: '4', label: 'every digit is d', hidden: false },
        { id: 'v3', call: 'count_digit(7, 7)', expect: '1', label: 'one digit', hidden: false },
        { id: 'h1', call: 'count_digit(30472915, 6)', expect: '0', label: 'digit not in the number', hidden: true, tag: 'recursion_result_ignored' },
        { id: 'h2', call: 'count_digit(0, 0)', expect: '1', label: 'the number 0', hidden: true },
        { id: 'h3', call: 'count_digit(10000, 0)', expect: '4', label: 'zeros', hidden: true },
        { id: 'h4', call: 'count_digit(92939, 9)', expect: '3', label: 'd appears in the middle and at both ends', hidden: true, tag: 'recursion_result_ignored' },
      ],
      concepts: ['return', 'recursive-case', 'digits'],
      detects: ['recursion_result_ignored'],
      expectedSec: 180,
      hints: [
        'Look at the last line. When the last digit is not `d`, what does the function give back to whoever called it?',
        'Every path through a recursive function must return a number. The last line correctly counts `d` in the rest of the digits, but that count never leaves the function.',
        'The call on the last line is already right. It is missing one word at the start, the same word that begins line 7.',
      ],
      solution: {
        code: `def count_digit(n, d):
    if n < 10:
        if n == d:
            return 1
        return 0
    if n % 10 == d:
        return 1 + count_digit(n // 10, d)
    return count_digit(n // 10, d)`,
        explanation:
          '- Lines 2-5 are the base case: a one-digit number contains `d` once if it equals `d`, otherwise not at all.\n' +
          '- Lines 6-7: if the last digit (`n % 10`) is `d`, the answer is 1 plus the count in the rest of the number (`n // 10`).\n' +
          '- Line 8 is the case where the last digit is not `d`. The answer is just the count in the rest of the number, but the buggy version called the function and threw the result away. ' +
          'With no `return`, Python returns `None`.\n\n' +
          'That is why `count_digit(5555, 5)` already worked: every digit matched, so line 8 never ran. `count_digit(1110, 1)` failed at once because its last digit is 0.\n\n' +
          'Adding `return` makes every path give back an int.',
      },
      selfExplain: 'Why did count_digit(5555, 5) already pass before the fix?',
    },
    {
      id: 't13-s2-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 10,
      diff: 'hard',
      core: true,
      title: 'Sum of digits (exam style)',
      prompt:
        '*Exam style, 10 marks. Write it by hand first, then submit once.*\n\n' +
        'Write a function `sum_digits(n)` that returns the sum of the digits of the integer `n`, as an int.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions). Work with `%` and `//` rather than converting `n` to a string.\n\n' +
        '- `n` may be negative. The sign is ignored, so `sum_digits(-472)` returns 13.\n' +
        '- `sum_digits(0)` returns 0.\n\n' +
        'Example: `sum_digits(30472915)` returns 31.',
      fnName: 'sum_digits',
      starter: `def sum_digits(n):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: 'sum_digits(30472915)', expect: '31', label: 'card number', hidden: false },
        { id: 'v2', call: 'sum_digits(7)', expect: '7', label: 'one digit', hidden: false },
        { id: 'h1', call: 'sum_digits(0)', expect: '0', label: 'zero', hidden: true },
        { id: 'h2', call: 'sum_digits(-472)', expect: '13', label: 'negative number', hidden: true },
        { id: 'h3', call: 'sum_digits(1234)', expect: '10', label: 'digits removed with whole-number division', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h4', call: 'sum_digits(9000)', expect: '9', label: 'zeros at the end', hidden: true },
        { id: 'h5', call: 'sum_digits(-5)', expect: '5', label: 'negative single digit', hidden: true },
      ],
      concepts: ['base-case', 'digits', 'floor-division', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion', 'int_vs_float_division', 'print_vs_return'],
      expectedSec: 480,
      hints: [
        'Which numbers can you answer straight away, without splitting them up? And how do you split a number into its last digit and the rest of it?',
        'Plan: if `n` is negative, return the answer for `-n`. If `n` is a single digit (0 to 9), return `n`. Otherwise return the last digit plus the digit sum of the rest of the number.',
        '`n % 10` is the last digit and `n // 10` is the rest, so the recursive case is `return n % 10 + sum_digits(n // 10)`.',
      ],
      solution: {
        code: `def sum_digits(n):
    if n < 0:
        return sum_digits(-n)
    if n < 10:
        return n
    return n % 10 + sum_digits(n // 10)`,
        explanation:
          '- `if n < 0: return sum_digits(-n)` removes the sign once, before anything else. Without it, `if n < 10` returns -472 straight away because -472 is less than 10. ' +
          'A base case of `n == 0` is no better: `-472 // 10` is -48, then -5, then -1, and `-1 // 10` stays -1, so the calls run until RecursionError.\n' +
          '- `if n < 10: return n` is the base case. It covers 0 to 9, so it catches 0 as well as the last digit of any longer number.\n' +
          '- `n % 10` is the last digit and `n // 10` drops it. `//` keeps an int; `n / 10` gives floats such as 123.4 and the digits come out wrong.\n' +
          '- `return n % 10 + sum_digits(n // 10)` returns the combined result. For 1234: 4 + (3 + (2 + 1)) = 10.\n\n' +
          'Marking guide (10): base case for a single digit (3), negative numbers handled (2), recursive call on `n // 10` (2), last digit added to the returned result (2), no loops (1).',
      },
      selfExplain: 'Why does the base case use n < 10 instead of n == 0, and would n == 0 also work?',
    },
  ],
};

export default scenario;
