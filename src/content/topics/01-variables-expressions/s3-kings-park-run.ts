import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');

/** Expected stdout for the pace program: the prompts echo what was typed, as in a terminal. */
const paceOutput = (distance: string, time: string, pace: string): string =>
  py(`Distance (km): ${distance}`, `Time (min): ${time}`, `Pace: ${pace} per km`);

const scenario: Scenario = {
  id: 't01-s3',
  title: 'Kings Park fun run',
  story:
    'The Kings Park fun run loops past the State War Memorial and down Fraser Avenue. ' +
    'Its volunteer-built results app needs clear names, correct updates and a pace readout for the finish tent.',
  questions: [
    {
      id: 't01-s3-q1',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'Name that variable',
      prompt: "The app needs a variable for a runner's finish time in minutes. Which name is the best choice for CITS1401 code?",
      concepts: ['naming', 'snake-case'],
      detects: ['style_naming', 'shadow_builtin', 'syntax_other'],
      expectedSec: 60,
      options: [
        {
          id: 'a',
          text: 'FinishTime',
          mistake: 'style_naming',
          why: 'Valid Python, but capitalised words are the style for class names, not variables. It also does not say the unit.',
        },
        {
          id: 'b',
          text: 'finish_minutes',
          correct: true,
          why: 'Lowercase words joined by an underscore (snake_case). It says what the value is and its unit.',
        },
        {
          id: 'c',
          text: 'min',
          mistake: 'shadow_builtin',
          why: "Valid, but it hides the built-in `min()` function, so a later `min(a, b)` crashes with `TypeError: 'int' object is not callable`. It is also unclear: minimum or minutes?",
        },
        {
          id: 'd',
          text: 'finish-time',
          mistake: 'syntax_other',
          why: 'Not a valid name. Python reads the hyphen as minus, so `finish-time = 27` is a SyntaxError. Use an underscore.',
        },
      ],
      hints: [
        'One of these is not a valid Python name at all, and another is valid but breaks something else.',
        'Check each name: does it use only letters, digits and underscores? Does it hide a built-in function? Is it lowercase with underscores? Does it say what it holds?',
        'A hyphen means subtraction, and `min` is already the name of a built-in function.',
      ],
      solution: {
        explanation:
          '`finish_minutes` is the best name.\n\n' +
          '- `FinishTime` runs, but Python style keeps CapitalisedWords for classes and uses snake_case for variables.\n' +
          '- `min` runs, but it replaces the built-in `min()` function for the rest of the program.\n' +
          '- `finish-time` is not a name at all: Python sees `finish - time` and cannot assign to a subtraction.',
      },
      selfExplain: 'What error would you see if you wrote min = 27 and later called min(3, 5)?',
    },
    {
      id: 't01-s3-q2',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'Overtaking on the last lap',
      prompt:
        'Tariq overtakes Mei near the finish. The app tries to swap `leader` and `chaser`, then halves a two-lap gap and converts it to whole minutes.\n\n' +
        'There is no loop, so line 7 runs exactly once and the table has **one row**: fill in the values of `leader`, `chaser` and `gap_minutes` after line 7 runs.',
      concepts: ['assignment', 'swap', 'floor-division'],
      detects: ['int_vs_float_division'],
      expectedSec: 180,
      code: py(
        "leader = 'Mei'",
        "chaser = 'Tariq'",
        'gap_seconds = 250',
        'leader = chaser',
        'chaser = leader',
        'gap_seconds = gap_seconds / 2',
        'gap_minutes = gap_seconds // 60',
      ),
      watch: ['leader', 'chaser', 'gap_minutes'],
      anchorLine: 7,
      hints: [
        'Assignment copies the current value of the right-hand side into the name on the left. It does not link the two names, and it does not swap anything by itself.',
        'Trace one line at a time and write down every variable after each line. What does `leader` hold after line 4? Line 5 copies that value. For the gap, `/` always gives a float, and `//` with a float also gives a float.',
        "After line 4, `leader` is `'Tariq'`. After line 6, `gap_seconds` is `125.0`.",
      ],
      solution: {
        explanation:
          "- Lines 1-3: `leader` is `'Mei'`, `chaser` is `'Tariq'`, `gap_seconds` is `250`.\n" +
          "- Line 4: `leader` gets the value of `chaser`, so `leader` is `'Tariq'`. Nothing holds `'Mei'` any more.\n" +
          "- Line 5: `chaser` gets the value `leader` has now, which is `'Tariq'`. Both names hold `'Tariq'`.\n" +
          '- Line 6: `250 / 2` is `125.0`. `/` always gives a float.\n' +
          '- Line 7: `125.0 // 60` is `2.0`. `//` keeps the whole-number part, but because one side is a float the result is a float.\n\n' +
          "The row is `'Tariq'`, `'Tariq'`, `2.0`. A real swap needs a spare variable: `spare = leader`, then `leader = chaser`, then `chaser = spare`.",
      },
      selfExplain: 'Which extra variable and which extra line would turn lines 4-5 into a real swap?',
    },
    {
      id: 't01-s3-q3',
      format: 'write',
      kind: 'program',
      diff: 'hard',
      core: true,
      title: 'Pace per kilometre',
      prompt:
        'Write a **program** (no function) for the finish tent that prints a runner\'s pace.\n\n' +
        '1. Ask for the distance with the prompt `Distance (km): ` (note the space after the colon). It may have decimals, such as `4.2`.\n' +
        '2. Ask for the finish time with the prompt `Time (min): `. It is a whole number of minutes.\n' +
        '3. Work out the pace in seconds per km, rounded to the nearest whole second with `round()`.\n' +
        '4. Print one line in the form `Pace: M:SS per km`, where `M` is the whole minutes and `SS` is the seconds left over, always shown with two digits.\n\n' +
        'Example: a distance of `5` and a time of `27` is 1620 seconds over 5 km, which is 324 seconds per km, so the program prints `Pace: 5:24 per km`.\n\n' +
        'Formatting tip: in an f-string, `{seconds:02d}` shows `7` as `07`. In the expected output, the value typed at each prompt appears straight after it, as it does in the Thonny shell.',
      concepts: ['input', 'type-conversion', 'floor-division', 'modulo', 'round', 'f-strings'],
      detects: ['input_without_int', 'int_of_float_string', 'int_vs_float_division', 'str_int_concat'],
      expectedSec: 540,
      starter: '# Read the distance and the time, convert them, then print the pace.\n',
      tests: [
        { id: 'v1', stdin: ['5', '27'], expectStdout: paceOutput('5', '27', '5:24'), label: '5 km in 27 minutes', hidden: false },
        { id: 'v2', stdin: ['10', '52'], expectStdout: paceOutput('10', '52', '5:12'), label: '10 km in 52 minutes', hidden: false },
        { id: 'h1', stdin: ['4.2', '25'], expectStdout: paceOutput('4.2', '25', '5:57'), label: 'distance with decimals', hidden: true, tag: 'int_of_float_string' },
        { id: 'h2', stdin: ['6', '30'], expectStdout: paceOutput('6', '30', '5:00'), label: 'pace of exactly 5 minutes (seconds shown as 00)', hidden: true },
        { id: 'h3', stdin: ['7', '45'], expectStdout: paceOutput('7', '45', '6:26'), label: 'pace rounds up to the nearest second', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h4', stdin: ['9', '46'], expectStdout: paceOutput('9', '46', '5:07'), label: 'single-digit seconds', hidden: true },
      ],
      hints: [
        '`input()` always gives text. Decide which conversion each value needs before you do any maths with it.',
        'Plan: read and convert the distance (it can have decimals) and the time; work out total seconds divided by distance and round it; split that into minutes with `// 60` and seconds with `% 60`; print with an f-string.',
        'Two of the six lines you need. You still have to read the time, split the pace into minutes and seconds, and print:\n\n' +
          "```python\ndistance_km = float(input('Distance (km): '))\npace_seconds = round(time_min * 60 / distance_km)\n```",
      ],
      solution: {
        code: py(
          "distance_km = float(input('Distance (km): '))",
          "time_min = int(input('Time (min): '))",
          'pace_seconds = round(time_min * 60 / distance_km)',
          'minutes = pace_seconds // 60',
          'seconds = pace_seconds % 60',
          "print(f'Pace: {minutes}:{seconds:02d} per km')",
        ),
        explanation:
          "- Line 1: the distance can be `'4.2'`, so it needs `float()`. `int('4.2')` would raise a ValueError.\n" +
          '- Line 2: the time is a whole number of minutes, so `int()` is fine (`float()` would also work).\n' +
          '- Line 3: `time_min * 60` is the total seconds, and `/ distance_km` gives seconds per km, such as `385.714...` for 45 minutes over 7 km. ' +
          '`round()` with one argument gives the nearest int, `386`. Using `//` here would give `385.0` instead, which is the wrong second and a float.\n' +
          '- Lines 4-5: `386 // 60` is `6` whole minutes and `386 % 60` is `26` seconds. Rounding first keeps both of these whole numbers.\n' +
          "- Line 6: `{seconds:02d}` pads to two digits, so 7 seconds prints as `07` and 0 seconds as `00`.",
      },
      selfExplain: 'Why must round() happen before // and %, rather than after?',
    },
  ],
};

export default scenario;
