// Scenario t02-s1: UWA grade bands (chained comparisons, if/elif order, writing an elif chain).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const PREDICT_CODE = `mark = 74
if mark >= 50:
    print('P')
elif mark >= 70:
    print('D')
elif mark >= 80:
    print('HD')
else:
    print('N')
print('Checked', mark)`;

const PREDICT_ALL_IFS = `mark = 74
if mark >= 50:
    print('P')
if mark >= 70:
    print('D')
if mark >= 80:
    print('HD')
else:
    print('N')
print('Checked', mark)`;

const PREDICT_BEST_MATCH = `mark = 74
if mark >= 80:
    print('HD')
elif mark >= 70:
    print('D')
elif mark >= 50:
    print('P')
else:
    print('N')
print('Checked', mark)`;

const PREDICT_LAST_LINE_IN_ELSE = `mark = 74
if mark >= 50:
    print('P')
elif mark >= 70:
    print('D')
elif mark >= 80:
    print('HD')
else:
    print('N')
    print('Checked', mark)`;

const GRADE_STARTER = `def uwa_grade(mark):
    """Return 'HD', 'D', 'CR', 'P' or 'N' for a mark from 0 to 100, or 'invalid'."""
    pass`;

const GRADE_SOLUTION = `def uwa_grade(mark):
    """Return 'HD', 'D', 'CR', 'P' or 'N' for a mark from 0 to 100, or 'invalid'."""
    if mark < 0 or mark > 100:
        return 'invalid'
    elif mark >= 80:
        return 'HD'
    elif mark >= 70:
        return 'D'
    elif mark >= 60:
        return 'CR'
    elif mark >= 50:
        return 'P'
    else:
        return 'N'`;

const scenario: Scenario = {
  id: 't02-s1',
  title: 'UWA grade bands',
  story:
    'At UWA a unit mark out of 100 becomes a grade: HD for 80 and above, D for 70-79, CR for 60-69, P for 50-59 and N below 50. ' +
    'You are helping the CITS1401 teaching team turn marks into grades for the results spreadsheet.',
  questions: [
    {
      id: 't02-s1-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Which condition means CR?',
      prompt:
        '`mark` is a whole number from 0 to 100. A mark from 60 to 69 (inclusive) is a Credit (CR). ' +
        'Which condition is `True` for exactly the CR marks and `False` for every other mark?',
      concepts: ['comparison', 'chained-comparison', 'boolean'],
      detects: ['or_with_literal'],
      expectedSec: 75,
      options: [
        {
          id: 'a',
          text: '60 <= mark < 70',
          correct: true,
          why: 'A chained comparison means `60 <= mark and mark < 70`. For whole numbers that is 60, 61, ... 69, which is exactly the CR band.',
        },
        {
          id: 'b',
          text: '60 < mark < 70',
          why: 'This leaves out 60 itself, because `60 < 60` is `False`. A mark of exactly 60 is a CR, so the lower boundary needs `<=`.',
        },
        {
          id: 'c',
          text: 'mark >= 60 or mark < 70',
          why: 'Every number is either at least 60 or below 70, so this is `True` for every mark, even 12 and 95. Both parts must hold, so the joining word must be `and`.',
        },
        {
          id: 'd',
          text: 'mark >= 60 and 70',
          mistake: 'or_with_literal',
          why: 'Python reads this as `(mark >= 60) and 70`. The number 70 on its own counts as true, so the condition behaves like `mark >= 60` and lets 85 through. Repeat the variable: `mark >= 60 and mark < 70`.',
        },
      ],
      hints: [
        'Test each option with the boundary marks. Does it include 60? Does it leave out 70?',
        'Try mark = 60, mark = 69 and mark = 85 in each option. The right option gives True, True, False.',
        'A chained comparison `low <= x < high` includes `low` and stops just before `high`.',
      ],
      solution: {
        explanation: md(
          'Only `60 <= mark < 70` is `True` for 60 and 69 and `False` for 59, 70 and 85.',
          '',
          '- `60 <= mark < 70` is shorthand for `60 <= mark and mark < 70`.',
          '- `60 < mark < 70`: `60 < 60` is `False`, so a mark of 60 is missed.',
          '- `mark >= 60 or mark < 70`: with `or`, one true side is enough, and every number passes one side.',
          '- `mark >= 60 and 70`: `and 70` does not compare anything; 70 is simply truthy, so 85 passes.',
        ),
      },
      selfExplain: 'How would you write the CR condition without chaining the comparison?',
    },
    {
      id: 't02-s1-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Grades in the wrong order',
      prompt: "Priya's first grade converter checks the lowest band first. Pick exactly what it prints.",
      concepts: ['elif', 'branch-order'],
      detects: ['elif_vs_if', 'indent_error'],
      expectedSec: 75,
      code: PREDICT_CODE,
      choice: true,
      mutants: [
        { code: PREDICT_ALL_IFS, mistake: 'elif_vs_if' },
        { code: PREDICT_BEST_MATCH, mistake: 'elif_vs_if' },
        { code: PREDICT_LAST_LINE_IN_ELSE, mistake: 'indent_error' },
      ],
      hints: [
        'An if/elif/else chain is one decision. How many of its branches can run?',
        'Go down the chain from the top and stop at the first condition that is True for 74. Run only that branch, then continue after the whole chain.',
        'The very first test is `74 >= 50`. Is that True? If so, lines 4 to 9 are skipped.',
      ],
      solution: {
        explanation: md(
          'Output: `P` then `Checked 74`.',
          '',
          '1. Line 2: `74 >= 50` is `True`, so line 3 prints `P`.',
          '2. Because a branch of the chain has run, the `elif` and `else` branches are skipped, even though `74 >= 70` is also true.',
          '3. Line 10 is not indented, so it is outside the chain and always runs: `Checked 74`.',
          '',
          'Python does not look for the best match; the first true condition wins. That is why grade chains start from the top band (`mark >= 80`) and work down.',
        ),
      },
      selfExplain: 'How should Priya reorder the conditions so that 74 prints D?',
    },
    {
      id: 't02-s1-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Write uwa_grade(mark)',
      prompt: md(
        'Complete `uwa_grade(mark)` so it **returns** (not prints) the UWA grade as a string:',
        '',
        "- `'HD'` for 80 to 100",
        "- `'D'` for 70 up to but not including 80",
        "- `'CR'` for 60 up to but not including 70",
        "- `'P'` for 50 up to but not including 60",
        "- `'N'` for 0 up to but not including 50",
        "- `'invalid'` for a mark below 0 or above 100",
        '',
        '`mark` is an int or a float, for example `69.5`.',
      ),
      concepts: ['elif', 'chained-comparison', 'boundary', 'return'],
      detects: ['elif_vs_if', 'print_vs_return'],
      expectedSec: 300,
      fnName: 'uwa_grade',
      starter: GRADE_STARTER,
      tests: [
        { id: 'v1', call: 'uwa_grade(85)', expect: "'HD'", label: '85', hidden: false, tag: 'elif_vs_if' },
        { id: 'v2', call: 'uwa_grade(64)', expect: "'CR'", label: '64', hidden: false },
        { id: 'v3', call: 'uwa_grade(42)', expect: "'N'", label: '42', hidden: false },
        { id: 'h1', call: 'uwa_grade(80)', expect: "'HD'", label: 'exactly 80', hidden: true },
        { id: 'h2', call: 'uwa_grade(50)', expect: "'P'", label: 'exactly 50', hidden: true },
        { id: 'h3', call: 'uwa_grade(79)', expect: "'D'", label: '79', hidden: true },
        { id: 'h4', call: 'uwa_grade(69.5)', expect: "'CR'", label: '69.5, between two whole numbers', hidden: true },
        { id: 'h5', call: 'uwa_grade(100)', expect: "'HD'", label: 'exactly 100', hidden: true },
        { id: 'h6', call: 'uwa_grade(0)', expect: "'N'", label: 'zero', hidden: true },
        { id: 'h7', call: 'uwa_grade(101)', expect: "'invalid'", label: 'above 100', hidden: true },
        { id: 'h8', call: 'uwa_grade(-5)', expect: "'invalid'", label: 'negative mark', hidden: true },
      ],
      hints: [
        'Deal with the invalid marks before anything else, then work down from the top band.',
        md(
          'Plan:',
          '',
          "1. If the mark is below 0 or above 100, return `'invalid'`.",
          "2. Otherwise, if it is 80 or more, return `'HD'`.",
          "3. Otherwise, if it is 70 or more, return `'D'`, and so on down to `'P'`.",
          "4. Anything left over is `'N'`.",
          '',
          'Because the chain stops at the first true branch, each `elif` needs only one comparison.',
        ),
        md(
          '```python',
          'if mark < 0 or mark > 100:',
          "    return 'invalid'",
          'elif mark >= 80:',
          "    return 'HD'",
          'elif mark >= 70:',
          '    ...',
          '```',
        ),
      ],
      solution: {
        code: GRADE_SOLUTION,
        explanation: md(
          '- The first test rejects impossible marks. It needs `or` because a mark is invalid if **either** side is true, and `mark` must be written on both sides.',
          "- `elif mark >= 80` only runs for valid marks, so it covers 80 to 100 and returns `'HD'`.",
          '- `elif mark >= 70` only runs when the mark is below 80, so it does not need `and mark < 80`.',
          '- The same reasoning gives CR and P. The `else` catches everything from 0 up to (not including) 50.',
          '- Using `>=` on the lower boundary makes 80, 70, 60 and 50 land in the higher band, and floats such as 69.5 fall into CR with no gap.',
          '',
          "Writing bands as `60 <= mark <= 69` and `70 <= mark <= 79` leaves gaps: 69.5 matches no band, falls through to the `else` and is wrongly given `'N'`.",
        ),
      },
      selfExplain: 'Why does elif mark >= 70: not need and mark < 80?',
    },
  ],
};

export default scenario;
