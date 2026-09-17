import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't01-s1',
  title: 'Rottnest ferry timetable',
  story:
    'The ferry from Barrack Street Jetty to Rottnest Island takes 105 minutes, and the timetable app stores every trip length as a whole number of minutes. ' +
    'You are checking the arithmetic behind its departure board.',
  questions: [
    {
      id: 't01-s1-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Hours and minutes',
      prompt: 'The departure board turns 105 minutes into hours and minutes. What does this program print?',
      concepts: ['floor-division', 'modulo', 'true-division'],
      detects: ['int_vs_float_division'],
      expectedSec: 90,
      choice: true,
      code: py(
        'trip_minutes = 105',
        'hours = trip_minutes // 60',
        'minutes = trip_minutes % 60',
        "print(hours, 'h', minutes, 'min')",
        'print(trip_minutes / 60)',
      ),
      mutants: [
        {
          code: py(
            'trip_minutes = 105',
            'hours = trip_minutes / 60',
            'minutes = trip_minutes % 60',
            "print(hours, 'h', minutes, 'min')",
            'print(trip_minutes / 60)',
          ),
          mistake: 'int_vs_float_division',
        },
        {
          code: py(
            'trip_minutes = 105',
            'hours = trip_minutes // 60',
            'minutes = trip_minutes % 60',
            "print(hours, 'h', minutes, 'min')",
            'print(trip_minutes // 60)',
          ),
          mistake: 'int_vs_float_division',
        },
      ],
      hints: [
        'Two different division operators appear. One keeps only the whole-number part; the other always gives a float.',
        'Work out each variable in order: `hours` uses `//`, `minutes` uses `%`, and the last line uses `/`. `print` puts one space between its arguments.',
        '`105 // 60` is `1` and `105 % 60` is `45`. Now decide what type `/` gives.',
      ],
      solution: {
        explanation:
          '- Line 2: `105 // 60` is how many whole 60s fit into 105, which is `1`.\n' +
          '- Line 3: `105 % 60` is the remainder after taking out that 60, which is `45`.\n' +
          '- Line 4: `print` separates its four arguments with spaces, so it shows `1 h 45 min`.\n' +
          '- Line 5: `/` is true division and always gives a float, so `105 / 60` is `1.75`.\n\n' +
          'Output:\n\n```python\n1 h 45 min\n1.75\n```',
      },
      selfExplain: 'Which operator would you change on the last line so it prints 1 instead of 1.75?',
    },
    {
      id: 't01-s1-q2',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'Family fare',
      prompt:
        'An adult return ticket costs $75 and children pay half price. ' +
        'The Nguyen family is 2 adults and 3 children. Which line sets `total` to their correct fare, `262.5`?',
      concepts: ['precedence', 'operators'],
      detects: ['int_vs_float_division'],
      expectedSec: 90,
      options: [
        {
          id: 'a',
          text: 'total = (2 + 3) * 75 / 2',
          why: 'The brackets group all 5 people together, so everyone pays half price: `5 * 75 / 2` is `187.5`.',
        },
        {
          id: 'b',
          text: 'total = 2 * 75 + 3 * 75 // 2',
          mistake: 'int_vs_float_division',
          why: '`//` throws away the fraction: `225 // 2` is `112`, so this gives `262`, not `262.5`.',
        },
        {
          id: 'c',
          text: 'total = 2 * 75 + 3 * 75 / 2',
          correct: true,
          why: '`*` and `/` happen before `+`, working left to right: `150 + 225 / 2` is `150 + 112.5`, which is `262.5`.',
        },
        {
          id: 'd',
          text: 'total = 2 * 75 + 3 * 75 % 2',
          why: '`%` is the remainder, not a percentage or a division: `225 % 2` is `1`, so this gives `151`.',
        },
      ],
      hints: [
        'Work out each option by hand. Which operations does Python do before the `+`?',
        'Python does `*`, `/`, `//` and `%` first, from left to right, then `+`. Check which option comes to exactly 262.5, including the .5.',
        'The adults cost `2 * 75`, which is `150`. The children must come to `112.5`.',
      ],
      solution: {
        explanation:
          'The correct line is `total = 2 * 75 + 3 * 75 / 2`. Python applies `*`, `/`, `//` and `%` before `+` and `-`, and operators on the same level run left to right.\n\n' +
          '- `(2 + 3) * 75 / 2`: the brackets make `5 * 75 / 2`, which halves every ticket: `187.5`.\n' +
          '- `2 * 75 + 3 * 75 // 2`: `225 // 2` is `112` because `//` keeps only the whole-number part, so the total is `262`.\n' +
          '- `2 * 75 + 3 * 75 / 2`: `2 * 75` is `150`; `3 * 75 / 2` is `225 / 2`, which is `112.5`; the total is `262.5`.\n' +
          '- `2 * 75 + 3 * 75 % 2`: `225 % 2` is the remainder `1`, so the total is `151`.',
      },
      selfExplain: 'Where could you add brackets to the correct line to make its order of operations obvious, without changing its value?',
    },
    {
      id: 't01-s1-q3',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Trip length on the departure board',
      prompt:
        'The departure board shows trip lengths like `1 h 45 min`. ' +
        'Complete `ferry_duration(total_minutes)` so it **returns** (not prints) a string in exactly that format: ' +
        'the hours, a space, `h`, a space, the minutes, a space, `min`.\n\n' +
        '`total_minutes` is a whole number, 0 or more. Gaps 1 and 2 are operators; gap 3 is the whole value to return.',
      concepts: ['floor-division', 'modulo', 'f-strings'],
      detects: ['int_vs_float_division', 'str_int_concat', 'print_vs_return'],
      expectedSec: 180,
      fnName: 'ferry_duration',
      template: py(
        'def ferry_duration(total_minutes):',
        '    hours = total_minutes ⟦1⟧ 60',
        '    minutes = total_minutes ⟦2⟧ 60',
        '    return ⟦3⟧',
      ),
      blanks: [
        { id: '1', accept: ['//'] },
        { id: '2', accept: ['%'] },
        {
          id: '3',
          accept: [
            "f'{hours} h {minutes} min'",
            'f"{hours} h {minutes} min"',
            "str(hours) + ' h ' + str(minutes) + ' min'",
          ],
        },
      ],
      tests: [
        { id: 'v1', call: 'ferry_duration(105)', expect: "'1 h 45 min'", label: '105 minutes', hidden: false, tag: 'int_vs_float_division' },
        { id: 'v2', call: 'ferry_duration(45)', expect: "'0 h 45 min'", label: 'under an hour', hidden: false },
        { id: 'h1', call: 'ferry_duration(120)', expect: "'2 h 0 min'", label: 'exactly 2 hours', hidden: true },
        { id: 'h2', call: 'ferry_duration(0)', expect: "'0 h 0 min'", label: 'zero minutes', hidden: true },
        { id: 'h3', call: 'ferry_duration(61)', expect: "'1 h 1 min'", label: 'one minute past the hour', hidden: true, tag: 'int_vs_float_division' },
      ],
      hints: [
        'You need two numbers: how many whole hours, and how many minutes are left over. Which two operators give those?',
        'Plan: `hours` is how many whole 60s fit into `total_minutes`; `minutes` is what remains after taking those out; then build the text with an f-string that puts each variable inside braces.',
        "Gap 1 is `//`. Gap 3 starts `f'{hours} h ` and continues the same way for the minutes.",
      ],
      solution: {
        code: py(
          'def ferry_duration(total_minutes):',
          '    hours = total_minutes // 60',
          '    minutes = total_minutes % 60',
          "    return f'{hours} h {minutes} min'",
        ),
        explanation:
          '- Gap 1 is `//`: `105 // 60` is `1`, the number of whole hours. With `/` you would get `1.75`, and the board would show `1.75 h`.\n' +
          '- Gap 2 is `%`: `105 % 60` is `45`, the minutes left after the whole hours.\n' +
          "- Gap 3 is `f'{hours} h {minutes} min'`. The f-string turns each number into text and places it inside the braces, so no `str()` is needed. " +
          "Joining with `+` also works, but only if you convert first: `str(hours) + ' h ' + str(minutes) + ' min'`.\n" +
          '- The function must `return` the string. Printing it would make the function give back `None`, and the tests would fail.',
      },
      selfExplain: 'What would ferry_duration(105) return if gap 1 were / instead of //?',
    },
  ],
};

export default scenario;
