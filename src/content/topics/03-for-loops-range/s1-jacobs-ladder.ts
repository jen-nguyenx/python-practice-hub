import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s1',
  title: "Jacob's Ladder training",
  story:
    "Jacob's Ladder in Kings Park has 242 steps and is Perth's favourite stair workout. " +
    'Mei is planning a two-week training block and uses small loops to work out her days and totals.',
  questions: [
    {
      id: 't03-s1-q1',
      format: 'multi',
      diff: 'medium',
      core: true,
      title: 'Even training days',
      prompt:
        'Mei trains on days 2, 4, 6, 8, 10, 12 and 14, in that order. ' +
        'Select **every** range that makes this loop print exactly those days, one per line.',
      code: 'for day in ___:\n    print(day)',
      concepts: ['range', 'range-step'],
      detects: ['off_by_one_range'],
      expectedSec: 150,
      options: [
        {
          id: 'a',
          text: 'range(2, 14, 2)',
          correct: false,
          mistake: 'off_by_one_range',
          why: 'The stop value is never produced. This gives 2, 4, 6, 8, 10, 12 and misses day 14.',
        },
        {
          id: 'b',
          text: 'range(2, 14 + 1, 2)',
          correct: true,
          why: 'The stop is 15, so 14 is the last value produced. Writing `14 + 1` makes it obvious that 14 is meant to be included.',
        },
        {
          id: 'c',
          text: 'range(2, 16, 2)',
          correct: true,
          why: 'After 14 the next value would be 16, which is the stop value and is left out. So 14 is still the last day printed.',
        },
        {
          id: 'd',
          text: 'range(0, 15, 2)',
          correct: false,
          mistake: 'off_by_one_range',
          why: 'range starts exactly at its start value, so this prints 0 first: 0, 2, 4, ... 14. That is one line too many.',
        },
        {
          id: 'e',
          text: 'range(14, 1, -2)',
          correct: false,
          why: 'These are the right days but in the wrong order: a negative step counts down, so it prints 14, 12, ... 2.',
        },
      ],
      hints: [
        'The stop value of a range is never produced. For each option, check the first value and the last value it gives.',
        'For each option: write down the start, keep adding the step, and stop before you reach the stop value. Compare what you get with 2, 4, ..., 14 in increasing order.',
        '`range(2, 14, 2)` stops at 12. Which stop values are big enough to include 14 without also including 16?',
      ],
      solution: {
        explanation:
          '`range(start, stop, step)` starts at `start`, adds `step` each time, and stops **before** reaching `stop`.\n\n' +
          '- `range(2, 14, 2)` gives 2 ... 12. Day 14 is missing because 14 is the stop value.\n' +
          '- `range(2, 14 + 1, 2)` has stop 15, so it gives 2 ... 14. Correct.\n' +
          '- `range(2, 16, 2)` would reach 16 next, but 16 is the stop value, so it also ends at 14. Correct.\n' +
          '- `range(0, 15, 2)` starts at 0, so it prints an extra day 0.\n' +
          '- `range(14, 1, -2)` gives the right days but counts down from 14.',
      },
      selfExplain: 'Why does range(2, 16, 2) stop at 14 and not at 16?',
    },
    {
      id: 't03-s1-q2',
      format: 'trace',
      diff: 'easy',
      core: true,
      title: 'Build-up week',
      prompt:
        'Mei adds more climbs each day: 2 climbs on day 1, 4 on day 2, and so on. ' +
        'Fill in the values of `day` and `climbs` each time line 3 finishes running.',
      code: "climbs = 0\nfor day in range(1, 5):\n    climbs = climbs + day * 2\nprint('Total climbs:', climbs)",
      watch: ['day', 'climbs'],
      anchorLine: 3,
      concepts: ['range', 'accumulator', 'trace'],
      detects: ['off_by_one_range', 'accumulator_init'],
      expectedSec: 100,
      hints: [
        'How many values does `range(1, 5)` produce? That is how many rows the table has.',
        'Row 1 is the first pass: `day` is 1 and `climbs` becomes the old value (0) plus 1 * 2. Every later row starts from the `climbs` value in the row above.',
        'The first two rows are day 1, climbs 2 and day 2, climbs 6.',
      ],
      solution: {
        explanation:
          '`range(1, 5)` gives 1, 2, 3, 4. The 5 is the stop value and is left out, so there are four rows.\n\n' +
          '1. `climbs` starts at 0 before the loop.\n' +
          '2. day 1: climbs = 0 + 1 * 2 = 2\n' +
          '3. day 2: climbs = 2 + 2 * 2 = 6\n' +
          '4. day 3: climbs = 6 + 3 * 2 = 12\n' +
          '5. day 4: climbs = 12 + 4 * 2 = 20\n\n' +
          'Line 4 is not indented, so it runs once after the loop and prints `Total climbs: 20`.',
      },
      selfExplain: 'What would the table show if climbs = 0 were moved inside the loop, above line 3?',
    },
    {
      id: 't03-s1-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Total steps for the plan',
      prompt:
        "Jacob's Ladder has 242 steps. On day 1 Mei climbs it once, on day 2 twice, and so on, up to `days` climbs on the last day.\n\n" +
        'Put the lines in order and indent them to build `total_steps(days)`, which **returns** the total number of steps for the whole plan as an int. ' +
        'For example `total_steps(3)` returns 1452 (1 + 2 + 3 = 6 climbs of 242 steps). Not every line is needed.',
      lines: [
        { text: 'def total_steps(days):', indent: 0 },
        { text: 'total = 0', indent: 1 },
        { text: 'for day in range(1, days + 1):', indent: 1 },
        { text: 'total = total + day * 242', indent: 2 },
        { text: 'return total', indent: 1 },
      ],
      distractors: [
        { text: 'for day in range(1, days):', indent: 1, mistake: 'off_by_one_range' },
        { text: 'total = day * 242', indent: 2, mistake: 'accumulator_init' },
      ],
      indentMatters: true,
      fnName: 'total_steps',
      tests: [
        { id: 'v1', call: 'total_steps(3)', expect: '1452', label: '3 days', hidden: false },
        { id: 'v2', call: 'total_steps(1)', expect: '242', label: '1 day', hidden: false, tag: 'off_by_one_range' },
        { id: 'h1', call: 'total_steps(0)', expect: '0', label: 'zero days', hidden: true, tag: 'early_return_in_loop' },
        { id: 'h2', call: 'total_steps(2)', expect: '726', label: '2 days', hidden: true, tag: 'accumulator_init' },
        { id: 'h3', call: 'total_steps(10)', expect: '13310', label: '10 days', hidden: true },
      ],
      concepts: ['range', 'accumulator', 'function-body'],
      detects: ['off_by_one_range', 'accumulator_init', 'early_return_in_loop'],
      expectedSec: 180,
      hints: [
        'Where must the running total start, and which line makes it grow on every pass?',
        'Plan: the def line, then set the total to 0 before the loop, loop day from 1 up to and including `days`, add that day\'s steps, and return once after the loop has finished.',
        'The loop header is `for day in range(1, days + 1):` and the line inside it adds `day * 242` to the total.',
      ],
      solution: {
        code: 'def total_steps(days):\n    total = 0\n    for day in range(1, days + 1):\n        total = total + day * 242\n    return total',
        explanation:
          '1. `def total_steps(days):` starts the function.\n' +
          '2. `total = 0` is set once, before the loop.\n' +
          '3. `for day in range(1, days + 1):` runs day = 1, 2, ..., days. The `+ 1` is needed because range stops before its stop value; `range(1, days)` would skip the last day.\n' +
          '4. `total = total + day * 242` adds that day\'s steps to the running total. Writing `total = day * 242` would throw away the earlier days.\n' +
          '5. `return total` is indented one level, lined up with `for`, so it runs after every day has been added.',
      },
      selfExplain: 'What would total_steps(3) return if return total were indented two levels, inside the loop?',
    },
    {
      id: 't03-s1-q4',
      format: 'twins',
      diff: 'easy',
      core: true,
      title: 'One line or three?',
      prompt:
        'Mei wants the program to report her total once, after three days of climbing. ' +
        'The two versions differ by the indentation of one line. Work out what each one prints and say which one she wants.',
      left:
        'total = 0\n' +
        'for day in range(1, 4):\n' +
        '    total = total + day * 242\n' +
        "    print('Steps so far:', total)",
      right:
        'total = 0\n' +
        'for day in range(1, 4):\n' +
        '    total = total + day * 242\n' +
        "print('Steps so far:', total)",
      mistake: 'indent_error',
      concepts: ['range', 'accumulator', 'indentation'],
      detects: ['indent_error'],
      expectedSec: 90,
      hints: [
        'Indentation decides what belongs to the loop. A line indented under `for` runs once per pass.',
        'Count the passes: `range(1, 4)` gives 1, 2, 3. Then ask, for each version, how many times the `print` runs and what `total` holds each time.',
        'The left version prints on every pass, so its first line is `Steps so far: 242`.',
      ],
      solution: {
        explanation:
          '`range(1, 4)` gives 1, 2, 3, so the loop runs three times and `total` grows 242, 726, 1452.\n\n' +
          '- **Left**: the `print` is indented, so it belongs to the loop body and runs on every pass. It prints three lines, ending with `Steps so far: 1452`.\n' +
          '- **Right**: the `print` is not indented, so it runs once, after the loop has finished, and prints only `Steps so far: 1452`.\n\n' +
          'Both versions add up the steps the same way. Only the position of the `print` changes, and that is what Mei wants to fix: she wants the single line, so the `print` goes outside the loop.',
      },
      selfExplain: 'Both versions end with the same number. Why is only the last line of the left version correct?',
    },
  ],
};

export default scenario;
