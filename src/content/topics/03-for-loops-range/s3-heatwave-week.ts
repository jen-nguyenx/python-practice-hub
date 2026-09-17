import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s3',
  title: 'Perth heatwave week',
  story:
    'Bureau of Meteorology summaries for Perth often count the days that reach 35 °C or more. ' +
    'During a February heatwave you write small programs that summarise daily maximum temperatures. In these programs a day is hot when its maximum is 35 or more.',
  questions: [
    {
      id: 't03-s3-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Where does the counter start?',
      prompt:
        'This program should read 7 daily maximums and print how many were 35 or more. ' +
        'The line `hot_days = 0` is missing. Where must it go?',
      code:
        '# position A\n' +
        'for day in range(7):\n' +
        '    # position B\n' +
        '    temp = float(input())\n' +
        '    if temp >= 35:\n' +
        '        # position C\n' +
        '        hot_days = hot_days + 1\n' +
        '# position D\n' +
        'print(hot_days)',
      options: [
        {
          id: 'a',
          text: 'Position A, before the loop',
          correct: true,
          why: 'The counter is set to 0 once. Every hot day then adds 1 to that same count, so after 7 days it holds the total.',
        },
        {
          id: 'b',
          text: 'Position B, at the start of the loop body',
          mistake: 'accumulator_init',
          why: 'The count goes back to 0 at the start of every day, so the program prints 1 if the last day was hot and 0 otherwise.',
        },
        {
          id: 'c',
          text: 'Position C, just before adding 1',
          mistake: 'accumulator_init',
          why: 'Every hot day sets the count to 0 and then to 1, so it can never go past 1. If no day is hot, `hot_days` is never created and `print(hot_days)` crashes with NameError.',
        },
        {
          id: 'd',
          text: 'Position D, after the loop',
          mistake: 'accumulator_init',
          why: 'The first hot day runs `hot_days + 1` before `hot_days` exists, which crashes with NameError. It only gets past the loop when no day is hot, and then it prints 0.',
        },
      ],
      concepts: ['accumulator', 'counter', 'loop-if'],
      detects: ['accumulator_init'],
      expectedSec: 60,
      hints: [
        'A counter needs a starting value before anything is added to it, and it should be given that value only once.',
        'For each position, ask how many times that line would run: once, 7 times, or once per hot day.',
        'Positions B and C are inside the loop, so a line there runs again and again.',
      ],
      solution: {
        explanation:
          'The counter must exist before the first `hot_days + 1` runs, and it must not be reset later.\n\n' +
          '- **A** runs once, before the loop. Correct.\n' +
          '- **B** runs at the start of all 7 passes, wiping the count each day.\n' +
          '- **C** runs just before each increase, so the count is stuck at 1.\n' +
          '- **D** runs after the loop, too late: the first hot day crashes with NameError.',
      },
      selfExplain: 'If the line went at position B and the last day was 38 °C, what would the program print?',
    },
    {
      id: 't03-s3-q2',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Rising forecast',
      prompt:
        'The forecast has the maximum rising by 2 degrees a day, starting at 31. ' +
        'Type exactly what this program prints.',
      code:
        'hot = 0\n' +
        'for temp in range(31, 41, 2):\n' +
        '    if temp >= 35:\n' +
        '        hot = hot + 1\n' +
        '    elif temp >= 33:\n' +
        "        print('Warm day', temp)\n" +
        "print('Hot days:', hot)",
      mutants: [
        {
          code:
            'hot = 0\n' +
            'for temp in range(31, 41, 2):\n' +
            '    if temp >= 35:\n' +
            '        hot = hot + 1\n' +
            '    if temp >= 33:\n' +
            "        print('Warm day', temp)\n" +
            "print('Hot days:', hot)",
          mistake: 'elif_vs_if',
        },
        {
          code:
            'hot = 0\n' +
            'for temp in range(31, 43, 2):\n' +
            '    if temp >= 35:\n' +
            '        hot = hot + 1\n' +
            '    elif temp >= 33:\n' +
            "        print('Warm day', temp)\n" +
            "print('Hot days:', hot)",
          mistake: 'off_by_one_range',
        },
        {
          code:
            'hot = 0\n' +
            'for temp in range(31, 41, 2):\n' +
            '    if temp >= 35:\n' +
            '        hot = hot + 1\n' +
            '    elif temp >= 33:\n' +
            "        print('Warm day', temp)\n" +
            "    print('Hot days:', hot)",
          mistake: 'indent_error',
        },
      ],
      concepts: ['range-step', 'loop-if', 'counter', 'elif'],
      detects: ['elif_vs_if', 'off_by_one_range', 'indent_error'],
      expectedSec: 150,
      hints: [
        'List the values of `temp` first. Then remember that an `elif` is only checked when the `if` above it was False.',
        'The temperatures are 31, 33, 35, 37 and 39. For each one decide: hot (count it), warm (print it), or neither. The last print is outside the loop.',
        'Only one temperature is printed as a warm day.',
      ],
      solution: {
        explanation:
          '`range(31, 41, 2)` gives 31, 33, 35, 37, 39 (41 is the stop value, so it is left out).\n\n' +
          '1. 31: not >= 35 and not >= 33, so nothing happens.\n' +
          '2. 33: not >= 35, so the `elif` is checked and it prints `Warm day 33`.\n' +
          '3. 35, 37, 39: each is >= 35, so `hot` goes up to 1, 2, 3. The `elif` is skipped because the `if` was True.\n' +
          '4. After the loop, `Hot days: 3` is printed once.\n\n' +
          '```\nWarm day 33\nHot days: 3\n```',
      },
      selfExplain: 'Why is 37 not printed as a warm day, even though 37 >= 33 is True?',
    },
    {
      id: 't03-s3-q3',
      format: 'parsons',
      diff: 'medium',
      core: false,
      title: 'Average maximum',
      prompt:
        'Build a program that reads a whole number `days` (at least 1), then that many daily maximum temperatures (which can have decimals), one per line. ' +
        'It prints `Average:` followed by the mean rounded to 1 decimal place.\n\n' +
        'The program uses `input()` with no prompt message. In the expected output, the numbers typed in appear on their own lines, as they do in the Thonny shell. Not every line is needed.',
      lines: [
        { text: 'days = int(input())', indent: 0 },
        { text: 'total = 0', indent: 0 },
        { text: 'for day in range(days):', indent: 0 },
        { text: 'temp = float(input())', indent: 1 },
        { text: 'total = total + temp', indent: 1 },
        { text: "print('Average:', round(total / days, 1))", indent: 0 },
      ],
      distractors: [
        { text: 'total = temp', indent: 1, mistake: 'accumulator_init' },
        { text: 'temp = int(input())', indent: 1, mistake: 'int_of_float_string' },
      ],
      indentMatters: true,
      tests: [
        {
          id: 'v1', stdin: ['3', '30.5', '36.0', '33.1'], expectStdout: '3\n30.5\n36.0\n33.1\nAverage: 33.2',
          label: '3 days with decimals', hidden: false,
        },
        {
          id: 'v2', stdin: ['4', '28', '31', '35', '38'], expectStdout: '4\n28\n31\n35\n38\nAverage: 33.0',
          label: '4 days of whole numbers', hidden: false, tag: 'accumulator_init',
        },
        {
          id: 'h1', stdin: ['1', '41.3'], expectStdout: '1\n41.3\nAverage: 41.3',
          label: 'one day', hidden: true, tag: 'int_of_float_string',
        },
        {
          id: 'h2', stdin: ['5', '35.5', '36.5', '37.5', '38.5', '39.5'], expectStdout: '5\n35.5\n36.5\n37.5\n38.5\n39.5\nAverage: 37.5',
          label: '5 days with decimals', hidden: true,
        },
        {
          id: 'h3', stdin: ['2', '30', '40'], expectStdout: '2\n30\n40\nAverage: 35.0',
          label: 'two whole-number days', hidden: true,
        },
      ],
      concepts: ['accumulator', 'input', 'average'],
      detects: ['accumulator_init', 'int_of_float_string'],
      expectedSec: 200,
      hints: [
        'Read the number of days first: the loop needs it to know how many temperatures to read.',
        'Plan: read `days`, set the total to 0, loop `days` times reading one temperature and adding it to the total, then print the average once after the loop.',
        'The two lines inside the loop are `temp = float(input())` and `total = total + temp`.',
      ],
      solution: {
        code:
          'days = int(input())\n' +
          'total = 0\n' +
          'for day in range(days):\n' +
          '    temp = float(input())\n' +
          '    total = total + temp\n' +
          "print('Average:', round(total / days, 1))",
        explanation:
          '1. `days = int(input())` reads the count. It is a whole number, so `int` is fine.\n' +
          '2. `total = 0` is set once, before the loop.\n' +
          '3. `for day in range(days):` runs exactly `days` times (0, 1, ..., days - 1).\n' +
          '4. `temp = float(input())` reads one temperature. `int(input())` would crash with ValueError on a value like `30.5`.\n' +
          '5. `total = total + temp` adds it to the running total. `total = temp` would keep only the last day.\n' +
          '6. The `print` is not indented, so the average is printed once, after every day has been added.',
      },
      selfExplain: 'Why does the program use int(input()) for days but float(input()) for the temperatures?',
    },
    {
      id: 't03-s3-q4',
      format: 'write',
      kind: 'program',
      diff: 'hard',
      core: false,
      title: 'Hot streak',
      prompt:
        'Write a program that reads a whole number `days`, then that many daily maximum temperatures (decimals allowed), one per line. ' +
        'Use `input()` with no prompt message. A day is hot when its maximum is 35.0 or more.\n\n' +
        'Print exactly two lines: the number of hot days, and the longest run of hot days in a row. For example:\n\n' +
        '```\nHot days: 5\nLongest streak: 3\n```\n\n' +
        'If no day is hot, or `days` is 0, both numbers are 0. The numbers typed in also appear in the expected output, as they do in the Thonny shell.',
      starter:
        'days = int(input())\n' +
        'hot_days = 0\n' +
        '# Set up the variables you need for the streak here\n' +
        '\n' +
        'for day in range(days):\n' +
        '    temp = float(input())\n' +
        '    # Count hot days and keep track of the current and longest streak\n' +
        '\n' +
        "print('Hot days:', hot_days)\n",
      tests: [
        {
          id: 'v1', stdin: ['7', '33.5', '36.1', '38.0', '29.4', '35.2', '37.0', '40.3'],
          expectStdout: '7\n33.5\n36.1\n38.0\n29.4\n35.2\n37.0\n40.3\nHot days: 5\nLongest streak: 3',
          label: 'a week with two streaks', hidden: false, tag: 'int_of_float_string',
        },
        {
          id: 'v2', stdin: ['4', '30.5', '31.0', '28.2', '34.9'],
          expectStdout: '4\n30.5\n31.0\n28.2\n34.9\nHot days: 0\nLongest streak: 0',
          label: 'no hot days', hidden: false,
        },
        {
          id: 'h1', stdin: ['5', '36.0', '22.5', '36.5', '35.5', '41.2'],
          expectStdout: '5\n36.0\n22.5\n36.5\n35.5\n41.2\nHot days: 4\nLongest streak: 3',
          label: 'longest streak ends on the last day', hidden: true,
        },
        {
          id: 'h2', stdin: ['0'], expectStdout: '0\nHot days: 0\nLongest streak: 0',
          label: 'zero days', hidden: true,
        },
        {
          id: 'h3', stdin: ['6', '36', '37', '30', '38', '39', '20'],
          expectStdout: '6\n36\n37\n30\n38\n39\n20\nHot days: 4\nLongest streak: 2',
          label: 'streak broken by a cool day', hidden: true, tag: 'accumulator_init',
        },
        {
          id: 'h4', stdin: ['4', '36', '37', '20', '38'],
          expectStdout: '4\n36\n37\n20\n38\nHot days: 3\nLongest streak: 2',
          label: 'hot day at the very end', hidden: true, tag: 'off_by_one_range',
        },
        {
          id: 'h5', stdin: ['3', '35.0', '34.9', '35.0'],
          expectStdout: '3\n35.0\n34.9\n35.0\nHot days: 2\nLongest streak: 1',
          label: 'exactly 35.0 counts as hot', hidden: true,
        },
      ],
      concepts: ['loop-if', 'counter', 'input', 'streak'],
      detects: ['accumulator_init', 'off_by_one_range', 'int_of_float_string', 'indent_error'],
      expectedSec: 540,
      hints: [
        'Keep two numbers for the streak: how many hot days in a row you are on right now, and the best run seen so far.',
        'Plan: before the loop set the current streak and the longest streak to 0. On a hot day add 1 to the hot-day count and the current streak, then update the longest if the current streak is bigger. On any other day reset the current streak to 0. Print both lines after the loop.',
        'Inside the loop:\n\n```python\nif temp >= 35:\n    hot_days = hot_days + 1\n    streak = streak + 1\n    if streak > longest:\n        longest = streak\nelse:\n    ...\n```',
      ],
      solution: {
        code:
          'days = int(input())\n' +
          'hot_days = 0\n' +
          'streak = 0\n' +
          'longest = 0\n' +
          'for day in range(days):\n' +
          '    temp = float(input())\n' +
          '    if temp >= 35:\n' +
          '        hot_days = hot_days + 1\n' +
          '        streak = streak + 1\n' +
          '        if streak > longest:\n' +
          '            longest = streak\n' +
          '    else:\n' +
          '        streak = 0\n' +
          "print('Hot days:', hot_days)\n" +
          "print('Longest streak:', longest)",
        explanation:
          '1. `hot_days`, `streak` and `longest` all start at 0 before the loop.\n' +
          '2. `for day in range(days):` reads exactly `days` temperatures. With `days` = 0 the loop body never runs and both answers stay 0.\n' +
          '3. On a hot day (`temp >= 35`, so 35.0 counts) the hot-day count and the current streak both go up by 1.\n' +
          '4. Straight away, if the current streak beats `longest`, `longest` is updated. Doing this check on every hot day, not only when a streak ends, means a streak that runs to the last day is still counted.\n' +
          '5. On a day under 35 the current streak goes back to 0. This reset is meant to be inside the loop; `longest` keeps the best run.\n' +
          '6. The two prints are not indented, so each runs once after the loop.',
      },
      selfExplain: 'Why must longest be checked on every hot day, and not only when a cooler day ends a streak?',
    },
  ],
};

export default scenario;
