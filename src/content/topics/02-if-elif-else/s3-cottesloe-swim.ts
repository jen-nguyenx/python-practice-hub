// Scenario t02-s3: Cottesloe beach conditions (the or trap, comparing text, in, fixing a flag chain).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const OR_TRAP_CODE = `flag = 'yellow'
if flag == 'red' or 'black':
    print('Beach closed')
else:
    print('Beach open')`;

const PREDICT_CODE = `beach = 'Cottesloe'
wind = '12'
wind_dir = 'SSW'
print(beach == 'cottesloe')
print(wind > '8')
print(int(wind) > 8)
if 'SW' in wind_dir and not int(wind) > 30:
    print('Sea breeze')`;

const PREDICT_IGNORE_CASE = `beach = 'Cottesloe'
wind = '12'
wind_dir = 'SSW'
print(beach == 'Cottesloe')
print(wind > '8')
print(int(wind) > 8)
if 'SW' in wind_dir and not int(wind) > 30:
    print('Sea breeze')`;

const PREDICT_TEXT_AS_NUMBER = `beach = 'Cottesloe'
wind = '12'
wind_dir = 'SSW'
print(beach == 'cottesloe')
print(int(wind) > 8)
print(int(wind) > 8)
if 'SW' in wind_dir and not int(wind) > 30:
    print('Sea breeze')`;

const BUGGY = `def swim_flag(uv, wind_kmh, shark_sighting):
    flag = 'green'
    if shark_sighting or wind_kmh > 40:
        flag = 'red'
    if wind_kmh >= 25 or uv >= 8:
        flag = 'yellow'
    return flag`;

const FIXED = `def swim_flag(uv, wind_kmh, shark_sighting):
    flag = 'green'
    if shark_sighting or wind_kmh >= 40:
        flag = 'red'
    elif wind_kmh >= 25 or uv >= 8:
        flag = 'yellow'
    return flag`;

const scenario: Scenario = {
  id: 't02-s3',
  title: 'Cottesloe beach flags',
  story:
    'Each morning a beach conditions board at Cottesloe shows a red, yellow or green flag from the UV index, the wind and any shark sighting. ' +
    'The board reads its data as text from a sensor feed, and a few of its checks are not doing what their authors meant.',
  questions: [
    {
      id: 't02-s3-q1',
      format: 'mcq',
      diff: 'medium',
      core: true,
      title: 'Red or black?',
      prompt: 'The board should say the beach is closed only when the flag is red or black. Mia wrote this check. What does it print?',
      code: OR_TRAP_CODE,
      concepts: ['boolean', 'truthiness', 'in'],
      detects: ['or_with_literal', 'elif_vs_if'],
      expectedSec: 120,
      options: [
        {
          id: 'a',
          text: 'Beach closed',
          correct: true,
          why: "Python groups the condition as `(flag == 'red') or 'black'`. The comparison is `False`, so `or` moves on to `'black'`, a non-empty string, which counts as true. The `if` branch runs for every flag colour.",
        },
        {
          id: 'b',
          text: 'Beach open',
          mistake: 'or_with_literal',
          why: "That is what Mia meant, but Python does not repeat `flag ==` for you. On its own, `'black'` is just a non-empty string, which is truthy. Write `flag == 'red' or flag == 'black'`, or `flag in ('red', 'black')`.",
        },
        {
          id: 'c',
          text: 'SyntaxError',
          why: "The line is valid Python: `or` can join any two values. That is what makes this bug hard to spot; nothing crashes, the condition is just always true.",
        },
        {
          id: 'd',
          text: 'Beach closed\nBeach open',
          mistake: 'elif_vs_if',
          why: 'An `if` with an `else` is one decision: exactly one of the two branches runs, never both.',
        },
      ],
      hints: [
        'Work out what each side of `or` is on its own, before the `if` uses the result.',
        "The line means `(flag == 'red') or ('black')`. What is `flag == 'red'` when flag is 'yellow'? Is the string `'black'` true or false?",
        "Any non-empty string is truthy, so `False or 'black'` gives `'black'`, which the `if` treats as true.",
      ],
      solution: {
        explanation: md(
          'It prints `Beach closed`, even though the flag is yellow.',
          '',
          "1. `==` is done before `or`, so the condition is `(flag == 'red') or 'black'`.",
          "2. `flag == 'red'` is `False`.",
          "3. `False or 'black'` evaluates to `'black'`. A non-empty string is truthy, so the `if` branch runs.",
          '',
          "Fix: `if flag == 'red' or flag == 'black':` or, shorter, `if flag in ('red', 'black'):`.",
        ),
      },
      selfExplain: "Write the condition two correct ways: once with or and once with in.",
    },
    {
      id: 't02-s3-q2',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Text that looks like numbers',
      prompt: 'The sensor feed gives every value as a string. Type exactly what this prints.',
      code: PREDICT_CODE,
      concepts: ['comparison', 'string-comparison', 'in', 'conversion'],
      detects: ['case_sensitive_compare', 'input_without_int'],
      expectedSec: 180,
      mutants: [
        { code: PREDICT_IGNORE_CASE, mistake: 'case_sensitive_compare' },
        { code: PREDICT_TEXT_AS_NUMBER, mistake: 'input_without_int' },
      ],
      hints: [
        'Two of the lines compare strings, not numbers. Strings are compared exactly, character by character.',
        "Line 4: is a capital C the same character as a small c? Line 5: compare `'12'` and `'8'` by their first characters only. Line 7: `in` on strings asks whether one piece of text appears inside another.",
        "`'1'` comes before `'8'`, so `'12' > '8'` is `False`. After converting, `12 > 8` is `True`.",
      ],
      solution: {
        explanation: md(
          'Output:',
          '',
          '```',
          'False',
          'False',
          'True',
          'Sea breeze',
          '```',
          '',
          "- Line 4: `'Cottesloe' == 'cottesloe'` is `False`; upper and lower case letters are different characters.",
          "- Line 5: both sides are strings, so Python compares them character by character. `'1'` is less than `'8'`, so `'12' > '8'` is `False`.",
          '- Line 6: `int(wind)` is the number 12, and `12 > 8` is `True`. Convert text to a number before comparing sizes.',
          "- Line 7: `'SW' in 'SSW'` is `True` (the text SW appears inside SSW), and `not 12 > 30` is `not False`, which is `True`. Both sides are true, so `Sea breeze` prints.",
        ),
      },
      selfExplain: "Why is '12' > '8' False when 12 > 8 is True?",
    },
    {
      id: 't02-s3-q3',
      format: 'fixBug',
      diff: 'hard',
      core: true,
      title: 'Fix swim_flag',
      prompt: md(
        '`swim_flag(uv, wind_kmh, shark_sighting)` should **return** the flag colour as a string:',
        '',
        "- `'red'` when `shark_sighting` is `True` or the wind is 40 km/h or more",
        "- otherwise `'yellow'` when the wind is 25 km/h or more or the UV index is 8 or more",
        "- otherwise `'green'`",
        '',
        'Lifeguards report that a shark sighting on a sunny day shows a yellow flag. There are **two** bugs. Fix them by changing as few lines as possible.',
      ),
      concepts: ['elif', 'boolean', 'boundary'],
      detects: ['elif_vs_if'],
      expectedSec: 420,
      buggy: BUGGY,
      bugMistake: 'elif_vs_if',
      maxChangedLines: 2,
      fnName: 'swim_flag',
      tests: [
        { id: 'v1', call: 'swim_flag(5, 10, False)', expect: "'green'", label: 'calm day, low UV', hidden: false },
        { id: 'v2', call: 'swim_flag(9, 10, False)', expect: "'yellow'", label: 'high UV', hidden: false },
        { id: 'v3', call: 'swim_flag(10, 5, True)', expect: "'red'", label: 'shark sighting on a sunny day', hidden: false, tag: 'elif_vs_if' },
        { id: 'h1', call: 'swim_flag(6, 45, False)', expect: "'red'", label: 'gale-force wind', hidden: true, tag: 'elif_vs_if' },
        { id: 'h2', call: 'swim_flag(3, 40, False)', expect: "'red'", label: 'wind exactly 40', hidden: true },
        { id: 'h3', call: 'swim_flag(4, 12, True)', expect: "'red'", label: 'shark sighting on a calm day', hidden: true },
        { id: 'h4', call: 'swim_flag(8, 24, False)', expect: "'yellow'", label: 'UV exactly 8', hidden: true },
        { id: 'h5', call: 'swim_flag(7, 25, False)', expect: "'yellow'", label: 'wind exactly 25', hidden: true },
        { id: 'h6', call: 'swim_flag(7, 24, False)', expect: "'green'", label: 'just under both limits', hidden: true },
      ],
      hints: [
        "Trace `swim_flag(10, 5, True)` line by line. After line 4 sets `'red'`, does line 5 still get tested?",
        'One bug: the yellow check must only happen when the red check did not match, so the two checks need to be one chain. The other bug: re-read "40 km/h or more" and check whether the red condition includes exactly 40.',
        md(
          '```python',
          '    if shark_sighting or wind_kmh ... 40:',
          "        flag = 'red'",
          '    elif ...',
          '```',
        ),
      ],
      solution: {
        code: FIXED,
        explanation: md(
          "- Bug 1 (line 5): two separate `if` statements are both tested. A red day that also has high UV or wind of 25 or more goes on to the second `if`, which replaces `'red'` with `'yellow'`. Making it `elif` means the yellow test only runs when the red test was false.",
          '- Bug 2 (line 3): `wind_kmh > 40` is `False` when the wind is exactly 40, but the rule says "40 km/h or more". Use `>=`.',
          "- `shark_sighting` is already `True` or `False`, so `if shark_sighting or ...` is correct; `== True` is not needed.",
          "- `flag` starts as `'green'`, so no `else` is needed: if neither branch runs, `'green'` is returned.",
        ),
      },
      selfExplain: 'Which test would still fail if you fixed only the elif bug, and why?',
    },
  ],
};

export default scenario;
