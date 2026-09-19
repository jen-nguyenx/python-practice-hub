// "What if" experiments for while loops and nested loops. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const boundary: Experiment = {
  id: 't07-x1',
  title: 'Where a while loop stops, and what n is left holding',
  intro: 'Change the test, the limit and the size of the step, then watch the last line. The condition is checked **before** every pass, including the very first one.',
  template: "n = 0\nwhile n ⟦test⟧ ⟦limit⟧:\n    print(n)\n    ⟦step⟧\nprint('the loop ended with n =', n)\n",
  knobs: [
    {
      id: 'test',
      label: 'keep going while n is',
      choices: [
        { value: '<', caption: 'below the limit' },
        { value: '<=', caption: 'below the limit or equal to it' },
      ],
    },
    { id: 'limit', kind: 'range', label: 'the limit', min: 0, max: 8, start: 5 },
    {
      id: 'step',
      label: 'each time round, n goes up by',
      choices: [
        { value: 'n = n + 1', caption: '1' },
        { value: 'n = n + 3', caption: '3' },
      ],
    },
  ],
  watch: ['n'],
  anchorLine: 4,
  notes: {
    '0-5-0': 'The everyday count: five lines, 0 to 4. The limit itself never prints, because the test fails the moment n reaches it.',
    '1-5-0': 'Six lines now. Adding one character, the `=`, adds one whole pass, which is the commonest off-by-one in the language.',
    '0-0-0': 'Nothing prints at all. 0 is not below 0, so the test fails on the first check and the body never runs even once.',
    '1-0-0': 'One line. A while loop is not guaranteed to run; here it is guaranteed to run exactly once.',
    '0-8-1': 'Steps of 3 print 0, 3 and 6, then n becomes 9 and the loop stops. n ends on 9 even though the limit is 8.',
    '1-8-1': 'Identical to the version without the `=`, because n is never exactly 8: it goes straight from 6 to 9. This is why `while n != 8` would run forever here, while `<` and `<=` both stop safely.',
    '0-1-1': 'One line. n starts at 0, prints, jumps to 3 and is already past the limit.',
  },
  takeaway: 'A while loop checks its condition at the top, so it can run zero times, and it stops on the first check that fails — which means n ends up holding the **first value that broke the condition**, not the last one printed. Swapping `<` for `<=` moves the finish line by exactly one pass. Because a step bigger than one can jump clean over the limit, test with `<` or `<=` rather than `!=`: a condition that asks for one exact value never gets a second chance to stop the loop.',
};

const digits: Experiment = {
  id: 't07-x2',
  title: 'Taking a number apart one digit at a time',
  intro: 'Drag the slider to change the number and watch the passes appear. `n % 10` picks off the last digit and `n // 10` throws it away; the only question left is where each digit gets put.',
  template: "n = ⟦n⟧\ndigits = ''\nwhile n > 0:\n    print('n =', n, '   n % 10 =', n % 10, '   n // 10 =', n // 10)\n    digits = ⟦build⟧\n    n = n // 10\nprint('digits collected: [' + digits + ']')\nprint('n finished at', n)\n",
  knobs: [
    { id: 'n', kind: 'range', label: 'the number to take apart', min: 0, max: 99, start: 47 },
    {
      id: 'build',
      label: 'put each digit found',
      choices: [
        { value: 'str(n % 10) + digits', caption: 'in front of the ones already collected' },
        { value: 'digits + str(n % 10)', caption: 'after the ones already collected' },
      ],
    },
  ],
  watch: ['n', 'digits'],
  anchorLine: 6,
  notes: {
    '47-0': 'Two passes. The loop finds 7 first and 4 second, so putting each new digit **in front** rebuilds 47 the right way round.',
    '47-1': 'The same two digits, in the wrong order: 74. Adding each digit on the end reverses the number, because the loop meets the digits right to left.',
    '0-0': 'Nothing happens. `while n > 0` is already False, so the body never runs and `digits` stays empty. A number that can be 0 usually needs its own line of code.',
    '7-0': 'One pass only. For a single digit `n % 10` is the number itself and `n // 10` is 0, which is exactly what ends the loop.',
    '90-1': 'The zero comes out first and lands at the front: 09. Trailing zeros are the quickest way to notice that the digits are arriving backwards.',
    '10-0': 'Two passes even though it looks like one job: 0 then 1. `n // 10` is what shrinks n, and it takes one pass per digit however small the digits are.',
  },
  takeaway: '`%` and `//` come as a pair: `n % 10` reads the last digit and `n // 10` removes it, so `while n > 0` runs once per digit and finishes with n at 0. Use `//` and never `/`, which turns n into a decimal that takes hundreds of passes to shrink to 0. And remember the digits arrive **backwards**, last one first: building a string means putting each new digit in front of what you already have.',
};

const nested: Experiment = {
  id: 't07-x3',
  title: 'How many times the inside of a nested loop really runs',
  intro: 'Two sliders set how many rows and how many seats per row. Watch the count, and what happens when the list is started in the wrong place.',
  template: "rows = ⟦rows⟧\nseats = ⟦seats⟧\nsold = []\nfor r in range(1, rows + 1):\n    ⟦reset⟧\n    for s in range(1, seats + 1):\n        sold.append(str(r) + '-' + str(s))\nprint('rows times seats =', rows * seats)\nprint('seats in the list =', len(sold))\nprint(sold)\n",
  knobs: [
    { id: 'rows', kind: 'range', label: 'how many rows', min: 0, max: 4, start: 3 },
    { id: 'seats', kind: 'range', label: 'seats in each row', min: 0, max: 4, start: 3 },
    {
      id: 'reset',
      label: 'at the start of each row',
      choices: [
        { value: 'pass', caption: 'do nothing, keep the one list' },
        { value: 'sold = []', caption: 'start the list again' },
      ],
    },
  ],
  notes: {
    '3-3-0': 'Nine seats from three rows of three. The inner loop runs all the way through for **every** pass of the outer loop, so the counts multiply.',
    '0-3-0': 'Nothing at all. With no rows the outer loop never starts, so the inner loop never gets a turn no matter how many seats each row has.',
    '3-0-0': 'Also nothing, for the opposite reason: the outer loop runs three times, but each time the inner loop has nothing to go round.',
    '3-3-1': 'Only three seats survive, all from row 3. Emptying the list inside the outer loop throws away everything the earlier rows collected.',
    '1-4-1': 'Four seats, the right answer by accident. With a single row there is nothing earlier to throw away, which is how this bug passes the small test and fails the real one.',
    '4-1-0': 'Four seats from four rows of one. Swapping the two numbers gives the same count but a different list: the first number names the row.',
  },
  takeaway: 'The inner body runs `rows * seats` times, so the work multiplies rather than adds, and a zero anywhere makes the whole thing run zero times. Where a result is created decides what it collects: a list or total for the **whole** job belongs before the outer loop, and one that starts fresh for each row belongs inside the outer loop but before the inner one. Putting it in the wrong place still gives the right answer when there is only one row, which is exactly why the mistake survives testing.',
};

export const experiments: Experiment[] = [boundary, digits, nested];
