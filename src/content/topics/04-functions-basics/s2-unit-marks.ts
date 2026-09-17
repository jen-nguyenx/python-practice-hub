import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s2',
  title: 'CITS1401 marks',
  story: md(
    'Mei is writing helper functions to track her CITS1401 marks: labs, the project and the final exam.',
    'Like the Moodle marker, the checks below call each function and look at the value it returns, so every result has to come back through `return`.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 predict
    {
      id: 't04-s2-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Points, printed and returned',
      prompt: 'Type exactly what this program prints. Think about which calls show something and which only give a value back.',
      code: `def weighted(mark, weight):
    """Return a mark out of 100 scaled to its weight in the unit."""
    return mark * weight / 100


def report(name, mark, weight):
    points = weighted(mark, weight)
    print(name, points)


lab = weighted(80, 10)
result = report('Project', 70, 20)
print(lab + weighted(50, 60))
print(result)`,
      mutants: [
        {
          // believes report gives back the points it printed
          code: `def weighted(mark, weight):
    return mark * weight / 100


def report(name, mark, weight):
    points = weighted(mark, weight)
    print(name, points)
    return points


lab = weighted(80, 10)
result = report('Project', 70, 20)
print(lab + weighted(50, 60))
print(result)`,
          mistake: 'print_vs_return',
        },
        {
          // believes return also shows the value on the screen
          code: `def weighted(mark, weight):
    print(mark * weight / 100)
    return mark * weight / 100


def report(name, mark, weight):
    points = weighted(mark, weight)
    print(name, points)


lab = weighted(80, 10)
result = report('Project', 70, 20)
print(lab + weighted(50, 60))
print(result)`,
          mistake: 'print_vs_return',
        },
        {
          // believes / between whole numbers gives a whole number
          code: `def weighted(mark, weight):
    return mark * weight // 100


def report(name, mark, weight):
    points = weighted(mark, weight)
    print(name, points)


lab = weighted(80, 10)
result = report('Project', 70, 20)
print(lab + weighted(50, 60))
print(result)`,
          mistake: 'int_vs_float_division',
        },
      ],
      concepts: ['return', 'print-vs-return', 'none', 'helper-functions'],
      detects: ['print_vs_return', 'int_vs_float_division'],
      expectedSec: 180,
      hints: [
        'Only `print` puts text on the screen. `return` shows nothing: a returned value appears only if some line prints it.',
        'Work through the last four lines in order. For each call, write down what it prints while it runs (if anything) and what value it gives back.',
        'Line 11 prints nothing and stores 8.0. Line 12 prints `Project 14.0` while `report` runs, and `report` has no `return`, so `result` is ...',
      ],
      solution: {
        explanation: md(
          '1. Line 11: `weighted(80, 10)` returns `80 * 10 / 100`, which is `8.0` (a float, because `/` always gives a float). Nothing is printed.',
          '2. Line 12: `report` calls `weighted(70, 20)`, gets `14.0`, and prints `Project 14.0`. `report` has no `return`, so `result` is `None`.',
          '3. Line 13: `weighted(50, 60)` returns `30.0`. Adding it to `lab` gives `38.0`, and that is what is printed.',
          '4. Line 14 prints `None`.',
          '',
          'Output: `Project 14.0`, then `38.0`, then `None`.',
        ),
      },
      selfExplain: 'What single line would you add to report so that print(result) shows 14.0?',
    },

    // ---------------------------------------------------------------- q2 cloze
    {
      id: 't04-s2-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Fill in the marks helpers',
      prompt: md(
        'Complete the two helpers.',
        '',
        '- `percent(score, out_of)` returns the score as a percentage.',
        '- `unit_total(lab, project, exam)` returns the unit total out of 100, **rounded to 1 decimal place**. Labs are marked out of 30 and are worth 10%, the project is out of 40 and worth 30%, and the exam is out of 100 and worth 60%. Use `percent` for every part.',
      ),
      template: `def percent(score, out_of):
    """Return score as a percentage of out_of."""
    ⟦1⟧ score / out_of * 100


def unit_total(lab, project, exam):
    """Return the unit total out of 100, rounded to 1 decimal place."""
    total = percent(lab, 30) * 0.1 + ⟦2⟧ * 0.3 + percent(exam, 100) * 0.6
    return ⟦3⟧`,
      blanks: [
        { id: '1', accept: ['return'] },
        { id: '2', accept: ['percent(project, 40)', 'percent(project,40)'] },
        { id: '3', accept: ['round(total, 1)', 'round(total,1)'] },
      ],
      fnName: 'unit_total',
      tests: [
        { id: 'v1', call: 'percent(12, 40)', expect: '30.0', cmp: 'float', label: '12 out of 40', hidden: false, tag: 'print_vs_return' },
        { id: 'v2', call: 'unit_total(24, 30, 70)', expect: '72.5', cmp: 'float', label: 'typical marks', hidden: false },
        { id: 'h1', call: 'unit_total(30, 40, 100)', expect: '100.0', cmp: 'float', label: 'full marks', hidden: true },
        { id: 'h2', call: 'unit_total(0, 0, 0)', expect: '0.0', cmp: 'float', label: 'all zero', hidden: true },
        { id: 'h3', call: 'unit_total(17, 27, 58)', expect: '60.7', cmp: 'float', label: 'total needs rounding down', hidden: true },
        { id: 'h4', call: 'unit_total(25, 35, 80)', expect: '82.6', cmp: 'float', label: 'total needs rounding up', hidden: true },
      ],
      concepts: ['return', 'helper-functions', 'round'],
      detects: ['print_vs_return', 'forgot_to_call'],
      expectedSec: 110,
      hints: [
        'Blank 1 decides whether `percent` hands its answer back or only shows it. `unit_total` needs to use that answer in a calculation.',
        'Blank 1: the keyword that sends a value back to the caller. Blank 2: call the helper for the project mark, giving the mark and what it is out of. Blank 3: round the total to 1 decimal place.',
        'Blank 2 has the same shape as `percent(lab, 30)`, just with the project mark and 40.',
      ],
      solution: {
        code: `def percent(score, out_of):
    """Return score as a percentage of out_of."""
    return score / out_of * 100


def unit_total(lab, project, exam):
    """Return the unit total out of 100, rounded to 1 decimal place."""
    total = percent(lab, 30) * 0.1 + percent(project, 40) * 0.3 + percent(exam, 100) * 0.6
    return round(total, 1)`,
        explanation: md(
          '1. `return score / out_of * 100` hands the percentage back. With `print` there instead, `percent` would give back `None` and `unit_total` would crash multiplying `None` by 0.1.',
          '2. `percent(project, 40)` turns the project mark into a percentage, the same way the lab and exam parts do. Writing just `percent` without brackets would try to multiply the function itself.',
          '3. `round(total, 1)` rounds only at the end, when the value is returned. For marks 24, 30 and 70 the parts are 8.0, 22.5 and 42.0, so the total is 72.5.',
        ),
      },
      selfExplain: 'What would unit_total(24, 30, 70) do if blank 1 were print instead of return?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't04-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Grade from three marks',
      prompt: md(
        "Write `unit_grade(lab, project, exam)` that returns Mei's UWA grade as a string. All three marks are percentages from 0 to 100.",
        '',
        '1. Work out the total by calling the given helper `unit_total(lab, project, exam)`. Do not copy its formula.',
        "2. The exam is a hurdle: if the exam mark is below 40, return `'N'` whatever the total is.",
        "3. Otherwise return `'HD'` for a total of 80 or more, `'D'` for 70 or more, `'CR'` for 60 or more, `'P'` for 50 or more, and `'N'` below 50.",
        '',
        "Return the grade; do not print it. For example, `unit_grade(90, 85, 82)` returns `'HD'`.",
      ),
      fnName: 'unit_grade',
      starter: `def unit_total(lab, project, exam):
    """Return the unit total out of 100: labs 10%, project 30%, exam 60%."""
    return lab * 0.1 + project * 0.3 + exam * 0.6


def unit_grade(lab, project, exam):
    """Return the UWA grade 'HD', 'D', 'CR', 'P' or 'N' for the three marks."""
    pass`,
      tests: [
        { id: 'v1', call: 'unit_grade(90, 85, 82)', expect: "'HD'", label: 'high marks (total 83.7)', hidden: false },
        { id: 'v2', call: 'unit_grade(70, 60, 55)', expect: "'P'", label: 'total 58', hidden: false },
        { id: 'h1', call: 'unit_grade(80, 80, 80)', expect: "'HD'", label: 'total exactly 80', hidden: true },
        { id: 'h2', call: 'unit_grade(100, 100, 35)', expect: "'N'", label: 'good total but exam below 40', hidden: true },
        { id: 'h3', call: 'unit_grade(80, 80, 40)', expect: "'P'", label: 'exam exactly 40 passes the hurdle', hidden: true },
        { id: 'h4', call: 'unit_grade(75, 72, 68)', expect: "'CR'", label: 'total 69.9', hidden: true },
        { id: 'h5', call: 'unit_grade(65, 70, 72)', expect: "'D'", label: 'total 70.7', hidden: true, tag: 'elif_vs_if' },
        { id: 'h6', call: 'unit_grade(50, 40, 45)', expect: "'N'", label: 'total below 50', hidden: true },
      ],
      concepts: ['return', 'helper-functions', 'elif', 'return-string'],
      detects: ['print_vs_return', 'elif_vs_if', 'forgot_to_call'],
      expectedSec: 300,
      hints: [
        'Get the total from `unit_total` first and keep it in a variable. Then decide which grade to return.',
        'Plan: store the helper call in `total`. Check the exam hurdle first and return N if it fails. Then use an if/elif chain from the highest band down, where each branch returns a grade string.',
        md(
          '```python',
          'total = unit_total(lab, project, exam)',
          'if exam < 40:',
          "    return 'N'",
          'elif total >= 80:',
          "    return 'HD'",
          '```',
        ),
      ],
      solution: {
        code: `def unit_total(lab, project, exam):
    """Return the unit total out of 100: labs 10%, project 30%, exam 60%."""
    return lab * 0.1 + project * 0.3 + exam * 0.6


def unit_grade(lab, project, exam):
    """Return the UWA grade 'HD', 'D', 'CR', 'P' or 'N' for the three marks."""
    total = unit_total(lab, project, exam)
    if exam < 40:
        return 'N'
    elif total >= 80:
        return 'HD'
    elif total >= 70:
        return 'D'
    elif total >= 60:
        return 'CR'
    elif total >= 50:
        return 'P'
    else:
        return 'N'`,
        explanation: md(
          '1. `total = unit_total(lab, project, exam)` calls the helper and keeps the value it returns, so the formula lives in one place.',
          "2. The hurdle comes first. If the exam is below 40 the function returns `'N'` straight away and the band checks never run.",
          '3. The bands are checked from highest to lowest. `elif total >= 70` is reached only when the total is below 80, so each branch needs just one comparison.',
          '4. Every branch returns a string. The caller decides whether to print it.',
        ),
      },
      selfExplain: 'Why does the exam hurdle have to be checked before the HD branch?',
    },
  ],
};

export default scenario;
