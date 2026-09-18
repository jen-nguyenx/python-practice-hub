import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s6',
  title: 'Reid Library returns desk',
  story:
    'The returns desk in Reid Library checks a few shelves each morning and works out the fines on overdue books. ' +
    'Tom is writing the small loops behind both jobs, and the details of where a loop starts and stops decide whether the numbers come out right.',
  questions: [
    {
      id: 't03-s6-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'The loop variable after the loop',
      prompt:
        'Tom checks shelves 1, 2 and 3, then wants the desk log to show which shelf he stopped at. ' +
        'What does the **last** line print?',
      code:
        'for shelf in range(1, 4):\n' +
        "    print('Checking shelf', shelf)\n" +
        "print('Last shelf checked:', shelf)",
      options: [
        {
          id: 'a',
          text: 'Last shelf checked: 3',
          correct: true,
          why: 'The loop variable keeps the last value the range produced. `range(1, 4)` gives 1, 2, 3, so `shelf` is still 3 when the loop ends.',
        },
        {
          id: 'b',
          text: 'Last shelf checked: 4',
          mistake: 'off_by_one_range',
          why: 'The stop value is never produced, so `shelf` is never 4. The loop ends because the range has run out, not because `shelf` reached 4.',
        },
        {
          id: 'c',
          text: "Nothing: it stops with NameError, because shelf only exists while the loop is running",
          mistake: 'scope_confusion',
          why: 'A `for` loop does not make its own scope. `shelf` is an ordinary variable and is still there after the loop, holding 3.',
        },
        {
          id: 'd',
          text: 'Last shelf checked: 3, printed three times (once per shelf)',
          mistake: 'indent_error',
          why: 'The last line is not indented, so it is not part of the loop body. It runs once, after all three shelves have been checked.',
        },
      ],
      concepts: ['range', 'loop-variable', 'indentation'],
      detects: ['off_by_one_range', 'scope_confusion', 'indent_error'],
      expectedSec: 75,
      hints: [
        'List the values `range(1, 4)` produces. The loop variable is given each of them in turn, and nothing resets it afterwards.',
        'Two things to settle: which value `shelf` holds when the loop finishes, and how many times an unindented line after a loop runs.',
        'The loop prints `Checking shelf 1`, `Checking shelf 2`, `Checking shelf 3`, and then the loop is out of values.',
      ],
      solution: {
        explanation:
          '`range(1, 4)` produces 1, 2, 3. The 4 is the stop value and is never produced.\n\n' +
          '1. The loop gives `shelf` each value in turn and prints a line for each one.\n' +
          '2. After the third pass the range has no more values, so the loop ends. `shelf` is an ordinary variable and keeps its last value, 3.\n' +
          '3. The final `print` is not indented, so it runs once after the loop and shows `Last shelf checked: 3`.\n\n' +
          'One thing to watch: if the range were empty, for example `range(1, 1)`, the body would never run, `shelf` would never be created, and the last line really would raise NameError.',
      },
      selfExplain: 'What would the last line do if the loop header were for shelf in range(1, 1):?',
    },
    {
      id: 't03-s6-q2',
      format: 'twins',
      diff: 'medium',
      core: true,
      title: 'Which day does the fine start on?',
      prompt:
        'An overdue book costs $1 for the first day late, $2 for the second day, $3 for the third, and so on. ' +
        'A book is 5 days late, so the fine should be 1 + 2 + 3 + 4 + 5. ' +
        'The two versions differ only in the range. Work out what each one prints and say which one charges the right amount.',
      left:
        'days_late = 5\n' +
        'fine = 0\n' +
        'for day in range(days_late):\n' +
        '    fine = fine + day\n' +
        "print('Fine:', fine)",
      right:
        'days_late = 5\n' +
        'fine = 0\n' +
        'for day in range(1, days_late + 1):\n' +
        '    fine = fine + day\n' +
        "print('Fine:', fine)",
      mistake: 'off_by_one_range',
      concepts: ['range', 'accumulator', 'off-by-one'],
      detects: ['off_by_one_range'],
      expectedSec: 140,
      hints: [
        'Both loops run the same number of times. The difference is which numbers `day` takes, and here `day` is the amount being charged.',
        'Write out the values of `day` for each version, then add them up. Compare each list with the days the library actually charges for: 1 to 5.',
        'The left version starts `day` at 0, so the first day late is charged nothing.',
      ],
      solution: {
        explanation:
          'Both loops run five times, but they hand `day` different numbers.\n\n' +
          '- **Left**: `range(5)` gives 0, 1, 2, 3, 4. The total is 0 + 1 + 2 + 3 + 4 = 10, so it prints `Fine: 10`. The first day late is charged $0 and the fifth day is charged $4: every day is one dollar short.\n' +
          '- **Right**: `range(1, days_late + 1)` gives 1, 2, 3, 4, 5. The total is 15, so it prints `Fine: 15`. This is the version the library wants.\n\n' +
          '`range(n)` is the right choice when you only need the loop to run n times and the value of the counter does not matter. As soon as the counter **is** the number you are working with, start it where the counting really starts, and remember the `+ 1` so the last day is included.',
      },
      selfExplain: 'Both loops run 5 times, so why do the totals differ by 5?',
    },
    {
      id: 't03-s6-q3',
      format: 'refactor',
      diff: 'hard',
      core: false,
      title: 'Tidying up the fine calculator',
      prompt:
        'This function works. A book is `days` days late and costs `rate` dollars for each weekday, ' +
        'but day 6, day 7, day 13, day 14 and so on fall on a weekend, when the day costs double. ' +
        'The fine is returned rounded to 2 decimal places, and a book that is not late costs nothing.\n\n' +
        'Three things about it need fixing, and none of them changes any answer:\n\n' +
        '1. The running total is called `sum`, which is the name of a built-in function. Give it a plain name such as `total`.\n' +
        '2. It rounds inside the loop. Round once, in the `return`, the way the project rules ask.\n' +
        '3. The whole calculation sits in an `else` branch. Deal with the "not late" case first with an early `return`, then write the main calculation without any `else`.',
      code: `def late_fine(days, rate):
    """Return the fine for a book days days late, rounded to 2 decimal places."""
    if days <= 0:
        sum = 0.0
    else:
        sum = 0.0
        for day in range(1, days + 1):
            if day % 7 == 6 or day % 7 == 0:
                sum = round(sum + rate * 2, 2)
            else:
                sum = round(sum + rate, 2)
    return round(sum, 2)`,
      fnName: 'late_fine',
      tests: [
        { id: 'v1', call: 'late_fine(3, 0.5)', expect: '1.5', cmp: 'float', label: 'three weekdays late', hidden: false },
        { id: 'v2', call: 'late_fine(7, 0.5)', expect: '4.5', cmp: 'float', label: 'a full week late', hidden: false, tag: 'off_by_one_range' },
        { id: 'h1', call: 'late_fine(0, 0.5)', expect: '0.0', cmp: 'float', label: 'returned on time', hidden: true, tag: 'accumulator_init' },
        { id: 'h2', call: 'late_fine(-3, 0.5)', expect: '0.0', cmp: 'float', label: 'returned early', hidden: true },
        { id: 'h3', call: 'late_fine(6, 0.5)', expect: '3.5', cmp: 'float', label: 'first weekend day counted double', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'late_fine(14, 0.35)', expect: '6.3', cmp: 'float', label: 'two full weeks at 35 cents a day', hidden: true },
        { id: 'h5', call: 'late_fine(1, 1.25)', expect: '1.25', cmp: 'float', label: 'one weekday at a higher rate', hidden: true },
      ],
      mustRemove: ['shadow_builtin', 'round_in_loop'],
      mustAdd: ['early_return'],
      pattern: 'round-at-output',
      concepts: ['accumulator', 'loop-if', 'round', 'guard-clause'],
      detects: ['shadow_builtin', 'round_mid_calc'],
      expectedSec: 420,
      hints: [
        'Start with the `if days <= 0:` branch. If the function can answer that case straight away, what does the `else` still have to do?',
        'Plan: rename the running total everywhere it appears. Replace `sum = 0.0` in the first branch with a `return` of the answer, then move the rest of the calculation out of the `else` so it lines up with the `if`. Finally, take `round(...)` off the two lines inside the loop and leave the one in the `return` doing the work.',
        'The first three lines become:\n\n```python\ndef late_fine(days, rate):\n    if days <= 0:\n        return 0.0\n    total = 0.0\n```',
      ],
      solution: {
        code: `def late_fine(days, rate):
    """Return the fine for a book days days late, rounded to 2 decimal places."""
    if days <= 0:
        return 0.0
    total = 0.0
    for day in range(1, days + 1):
        if day % 7 == 6 or day % 7 == 0:
            total = total + rate * 2
        else:
            total = total + rate
    return round(total, 2)`,
        explanation:
          '1. `if days <= 0: return 0.0` is a guard clause: it answers the easy case and leaves the function. Everything after it can assume the book really is late, so the `else` and its extra level of indentation disappear.\n' +
          '2. `total = 0.0` replaces `sum`. Assigning to `sum` hides the built-in `sum` function for the rest of the program, and a later `sum(...)` would fail with `TypeError: \'float\' object is not callable`. The code still ran here, but the habit causes errors that are hard to find.\n' +
          '3. Inside the loop the two lines now just add: `total = total + rate * 2` on a weekend day and `total = total + rate` otherwise. `day % 7` is 6 on days 6, 13, 20 and 0 on days 7, 14, 21, which is the weekend of each overdue week.\n' +
          '4. `return round(total, 2)` rounds once, at the point where the value leaves the function. Rounding on every pass is what the project rules call rounding mid-calculation: here the answers happen to agree, but with a rate such as 0.335 the repeated rounding would drift away from the true total.\n' +
          '5. Nothing about the loop changed, so every answer is the same: `late_fine(7, 0.5)` is still 5 weekdays at 0.50 plus 2 weekend days at 1.00, which is 4.5.',
      },
      selfExplain: 'Why is rounding once in the return safer than rounding on every pass of the loop?',
    },
  ],
};

export default scenario;
