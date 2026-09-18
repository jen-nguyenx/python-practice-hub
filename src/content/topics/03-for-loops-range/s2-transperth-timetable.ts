import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s2',
  title: 'Transperth timetable',
  story:
    'Trains on the Fremantle line run to a fixed timetable. ' +
    'The platform countdown, the guard\'s checklist and the timetable checker are all small loops over `range`.',
  questions: [
    {
      id: 't03-s2-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Countdown board',
      prompt: 'The platform display counts down to the next train. What does this program print?',
      code: "for minutes in range(20, 0, -5):\n    print(minutes, 'min')\nprint('Train arriving')",
      choice: true,
      mutants: [
        {
          code: "for minutes in range(20, -1, -5):\n    print(minutes, 'min')\nprint('Train arriving')",
          mistake: 'off_by_one_range',
        },
        {
          code: "for minutes in range(20, 0, -5):\n    print(minutes, 'min')\n    print('Train arriving')",
          mistake: 'indent_error',
        },
      ],
      concepts: ['range', 'negative-step'],
      detects: ['off_by_one_range', 'indent_error'],
      expectedSec: 75,
      hints: [
        'A negative step counts down, but the stop value is still left out.',
        'List the values: start at 20, subtract 5 each time, and stop before reaching 0. Then check which print is inside the loop.',
        'The loop runs 4 times, and the first line printed is `20 min`.',
      ],
      solution: {
        explanation:
          '`range(20, 0, -5)` starts at 20 and subtracts 5: 20, 15, 10, 5. The next value would be 0, which is the stop value, so it is not produced.\n\n' +
          '`print(minutes, \'min\')` is indented, so it runs on each of the 4 passes. `print(\'Train arriving\')` is not indented, so it runs once after the loop:\n\n' +
          '```\n20 min\n15 min\n10 min\n5 min\nTrain arriving\n```',
      },
      selfExplain: 'Which range would make the board also show 0 min?',
    },
    {
      id: 't03-s2-q2',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Skipping carriages',
      prompt:
        "A guard's checklist program tries to skip carriages 3 and 4 by changing the loop variable. " +
        'Type exactly what it prints.',
      code: "for carriage in range(1, 6):\n    if carriage == 2:\n        carriage = 4\n    print('Check carriage', carriage)",
      mutants: [
        {
          code: "for carriage in (1, 4, 5):\n    print('Check carriage', carriage)",
          mistake: 'modify_loop_var',
        },
        {
          code: "for carriage in range(1, 7):\n    if carriage == 2:\n        carriage = 4\n    print('Check carriage', carriage)",
          mistake: 'off_by_one_range',
        },
      ],
      concepts: ['range', 'loop-variable'],
      detects: ['modify_loop_var', 'off_by_one_range'],
      expectedSec: 150,
      hints: [
        'At the start of every pass, `for` takes the next value from the range. It ignores whatever the body did to `carriage` on the pass before.',
        'Go pass by pass. The range gives 1, 2, 3, 4, 5. Only on the pass where carriage is 2 does the `if` change it, and only for the rest of that pass.',
        'The second line printed is `Check carriage 4`, and the third line is `Check carriage 3`.',
      ],
      solution: {
        explanation:
          '`range(1, 6)` gives 1, 2, 3, 4, 5, and the loop always takes the next of those values.\n\n' +
          '1. carriage is 1: the `if` is False, so it prints `Check carriage 1`.\n' +
          '2. carriage is 2: the `if` sets carriage to 4, so it prints `Check carriage 4`.\n' +
          '3. The next pass takes 3 from the range. The earlier change to 4 is forgotten: `Check carriage 3`.\n' +
          '4. Then 4 and 5 print as normal.\n\n' +
          '```\nCheck carriage 1\nCheck carriage 4\nCheck carriage 3\nCheck carriage 4\nCheck carriage 5\n```\n\n' +
          'Assigning to the loop variable changes it only until the end of that pass. It never makes a `for` loop skip values.',
      },
      selfExplain: 'Which range would make the loop check only the odd-numbered carriages 1, 3 and 5?',
    },
    {
      id: 't03-s2-q3',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'How many trains?',
      prompt:
        'Times are in minutes after midnight, so 360 is 6:00 am. The first train leaves at `first` and then one leaves every `gap` minutes, as long as it is no later than `last`.\n\n' +
        'Complete `count_trains(first, last, gap)` so it **returns** how many trains leave, counting a train at exactly `last` if there is one. All three are whole numbers, `first` is no later than `last`, and `gap` is at least 1. ' +
        'For example `count_trains(360, 420, 15)` returns 5 (6:00, 6:15, 6:30, 6:45 and 7:00).',
      template:
        'def count_trains(first, last, gap):\n' +
        '    count = ⟦1⟧\n' +
        '    for depart in range(first, ⟦2⟧, gap):\n' +
        '        count = ⟦3⟧\n' +
        '    return count',
      blanks: [
        { id: '1', accept: ['0'] },
        { id: '2', accept: ['last + 1', 'last+1', '1 + last'] },
        { id: '3', accept: ['count + 1', 'count+1', '1 + count'] },
      ],
      fnName: 'count_trains',
      tests: [
        { id: 'v1', call: 'count_trains(360, 420, 15)', expect: '5', label: '6:00 to 7:00 every 15 minutes', hidden: false, tag: 'off_by_one_range' },
        { id: 'v2', call: 'count_trains(300, 330, 10)', expect: '4', label: '5:00 to 5:30 every 10 minutes', hidden: false },
        { id: 'h1', call: 'count_trains(600, 650, 20)', expect: '3', label: 'last time is not on the timetable', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'count_trains(480, 480, 10)', expect: '1', label: 'first and last are the same time', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'count_trains(1000, 1100, 7)', expect: '15', label: 'a train every 7 minutes', hidden: true, tag: 'accumulator_init' },
      ],
      concepts: ['range', 'range-step', 'counter'],
      detects: ['off_by_one_range', 'accumulator_init'],
      expectedSec: 110,
      hints: [
        'A count starts from nothing and goes up by one for each train. The range has to include `last`.',
        'Blank 1 is the starting count. Blank 2 is a stop value just past `last`, because range stops before its stop value. Blank 3 is the new count after one more train.',
        'The loop header becomes `for depart in range(first, last + 1, gap):`.',
      ],
      solution: {
        code:
          'def count_trains(first, last, gap):\n' +
          '    count = 0\n' +
          '    for depart in range(first, last + 1, gap):\n' +
          '        count = count + 1\n' +
          '    return count',
        explanation:
          '1. `count = 0`: no trains counted yet, set once before the loop.\n' +
          '2. `range(first, last + 1, gap)`: range never produces its stop value, so the stop must be one past `last` for a train at exactly `last` to count. With stop `last`, `count_trains(360, 420, 15)` would miss the 7:00 train and return 4.\n' +
          '3. `count = count + 1`: one more train on each pass. The loop variable `depart` is not needed inside the body; the loop just runs once per departure.\n\n' +
          'A stop of `last + gap` is not safe: for `count_trains(600, 650, 20)` it would also count a train at 660, which is after `last`.',
      },
      selfExplain: 'Why is last + gap not a safe stop value for this range?',
    },
    {
      id: 't03-s2-q4',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'The last train you can catch',
      prompt:
        'Times are whole numbers of minutes after midnight, so 360 is 6:00 am. The first train of the day leaves at `first`, and another leaves every `gap` minutes after that.\n\n' +
        'Write `last_train(first, gap, deadline)` that **returns** the departure time of the last train that leaves at or before `deadline`, as an int. ' +
        'A train that leaves at exactly `deadline` still counts. Return `-1` if no train leaves by then. `gap` is at least 1.\n\n' +
        'For example `last_train(360, 15, 400)` returns 390, because the trains are 360, 375, 390, 405 and 405 is too late.',
      fnName: 'last_train',
      starter:
        'def last_train(first, gap, deadline):\n' +
        '    """Return the departure time of the last train leaving at or before deadline, or -1."""\n' +
        '    pass\n',
      tests: [
        { id: 'v1', call: 'last_train(360, 15, 400)', expect: '390', label: 'trains every 15 minutes from 6:00', hidden: false },
        { id: 'v2', call: 'last_train(400, 15, 380)', expect: '-1', label: 'the first train is already too late', hidden: false, tag: 'accumulator_init' },
        { id: 'h1', call: 'last_train(360, 15, 360)', expect: '360', label: 'a train leaves at exactly the deadline', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'last_train(360, 15, 390)', expect: '390', label: 'several trains fit before the deadline', hidden: true, tag: 'early_return_in_loop' },
        { id: 'h3', call: 'last_train(300, 7, 320)', expect: '314', label: 'gap that does not divide the wait evenly', hidden: true },
        { id: 'h4', call: 'last_train(420, 10, 459)', expect: '450', label: 'deadline between two trains', hidden: true },
      ],
      concepts: ['range', 'range-step', 'accumulator', 'function-body'],
      detects: ['off_by_one_range', 'accumulator_init', 'early_return_in_loop', 'print_vs_return'],
      expectedSec: 240,
      hints: [
        'A `range` can produce every departure time for you. What do you want to remember about the times it produces?',
        'Plan: set an answer variable to -1 before the loop, because that is what you report when no train fits. Loop over every departure from `first` up to and including `deadline`, and on each pass overwrite the answer with that departure. Return the answer once the loop has finished.',
        'The loop header is `for depart in range(first, deadline + 1, gap):` and its body is one line that stores `depart`.',
      ],
      solution: {
        code:
          'def last_train(first, gap, deadline):\n' +
          '    """Return the departure time of the last train leaving at or before deadline, or -1."""\n' +
          '    best = -1\n' +
          '    for depart in range(first, deadline + 1, gap):\n' +
          '        best = depart\n' +
          '    return best\n',
        explanation:
          '1. `best = -1` is the answer to give when the loop never runs. Starting at 0 would report a train at midnight when there is no train at all.\n' +
          '2. `range(first, deadline + 1, gap)` produces `first`, `first + gap`, `first + 2 * gap`, ... and stops before `deadline + 1`. The `+ 1` is what lets a train at exactly `deadline` count; with stop `deadline`, `last_train(360, 15, 360)` would return -1.\n' +
          '3. `best = depart` overwrites the answer on every pass, so once the loop ends, `best` holds the last time the range produced.\n' +
          '4. If `first` is already after `deadline`, the range is empty, the body never runs, and `best` is still -1.\n' +
          '5. `return best` is lined up with `for`, so it runs once, after the loop. A `return depart` inside the loop would hand back the **first** train instead of the last.',
      },
      selfExplain: 'Why does this function keep overwriting best instead of returning inside the loop?',
    },
  ],
};

export default scenario;
