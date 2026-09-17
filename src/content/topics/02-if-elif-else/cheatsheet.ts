// Topic 02 reference material: cheat sheet, worked example and common mistakes.
import type { Md, Topic } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

export const cheatsheet: Md = md(
  '**Comparisons give True or False**',
  '',
  '```python',
  'mark = 72',
  'mark >= 50            # True',
  'mark == 72            # True   (== compares, = stores)',
  'mark != 72            # False',
  "'Perth' == 'perth'    # False  (text must match exactly, case too)",
  "'12' > '8'            # False  (strings compare character by character)",
  '```',
  '',
  'The six comparison operators: `<`, `<=`, `>`, `>=`, `==`, `!=`. A comparison is a value, so you can store it: `passed = mark >= 50`.',
  '',
  '**if / elif / else**',
  '',
  '```python',
  'if mark >= 80:',
  "    grade = 'HD'",
  'elif mark >= 70:',
  "    grade = 'D'",
  'else:',
  "    grade = 'N'",
  '```',
  '',
  '- Every `if`, `elif` and `else` line ends with a colon; the body is indented 4 spaces.',
  '- Python tests the conditions from the top and runs **only the first true branch**. The rest of the chain is skipped, even if later conditions are also true.',
  '- Put the most specific test first (80 before 70). Then each `elif` needs only one comparison.',
  '- `else` has no condition. Python has no `else if`: write `elif`.',
  '',
  '**Separate ifs versus elif**',
  '',
  '```python',
  'temp = 42',
  'if temp >= 35:',
  "    print('Heat warning')",
  'if temp >= 40:              # a new decision: tested as well',
  "    print('Extreme heat')",
  '```',
  '',
  'Both lines print. With `elif temp >= 40:` only `Heat warning` prints. Use `elif` when exactly one outcome should happen; use separate `if`s when several can apply.',
  '',
  '**and, or, not**',
  '',
  '- `a and b` is True only when both are True. `a or b` is True when at least one is True. `not a` flips True and False.',
  '- Order: comparisons first, then `not`, then `and`, then `or`. So `a or b and c` means `a or (b and c)`. Use brackets when you mix `and` and `or`.',
  '- Python stops as soon as it knows the answer: in `a and b`, if `a` is False then `b` is never looked at.',
  '',
  '**Chained comparisons**',
  '',
  '```python',
  '60 <= mark < 70           # same as: 60 <= mark and mark < 70',
  '```',
  '',
  '**The or trap: repeat the variable**',
  '',
  '```python',
  "if day == 'Sat' or 'Sun':            # WRONG: always True",
  "if day == 'Sat' or day == 'Sun':     # right",
  "if day in ('Sat', 'Sun'):            # right, and shorter",
  '```',
  '',
  "Truthiness: `False`, `0`, `0.0`, `''` (empty string) and `None` count as false. Every other number and every non-empty string counts as true, which is why `or 'Sun'` is always true.",
  '',
  '**in**',
  '',
  '```python',
  "'SW' in 'SSW'             # True: the text appears inside",
  'zones in (1, 2)           # True if zones equals 1 or 2',
  '```',
  '',
  '**Return the condition itself**',
  '',
  '```python',
  'def is_pass(mark):',
  '    return mark >= 50     # instead of if ... return True else: return False',
  '```',
  '',
  'Write `if is_member:` and `if not is_member:`, never `== True` or `== False`. Compare values with `==`; use `is` only for `None` (`if result is None:`).',
  '',
  '**Night-before checklist**',
  '',
  '- `=` stores, `==` compares. `if x = 5:` is a SyntaxError.',
  '- `input()` always gives a string. Convert with `int()` or `float()` before comparing with a number.',
  '- Test every boundary in the spec: for "80 or more" try 79, 80 and 100.',
  '- "Between 1 and 9 inclusive" is `1 <= n <= 9`; invalid is `n < 1 or n > 9`.',
  '- Handle invalid input first with a guard (`if ...: return None`), then the normal cases.',
  '- A function should `return` its answer, not `print` it, unless the question says print.',
);

export const workedExample: Topic['workedExample'] = {
  title: 'Rottnest ferry fare',
  code: `def ferry_fare(age, has_concession):
    """Return the Rottnest ferry fare in dollars, or -1 for a negative age."""
    if age < 0:
        return -1
    elif age < 4:
        return 0
    elif age <= 12:
        return 30
    elif age >= 65 or has_concession:
        return 45
    else:
        return 60`,
  steps: [
    md(
      '**Goal: list every case and its boundaries.** The rules: under 4 travel free, ages 4 to 12 pay $30, seniors (65+) or concession card holders pay $45, everyone else pays $60, and a negative age is invalid (return -1).',
      '',
      'Write the boundary numbers down before coding: 0, 4, 12 and 65. These are the values to test at the end.',
    ),
    md(
      '**Goal: handle invalid input first.** `if age < 0: return -1` is a guard. Every later branch can now assume the age makes sense, so none of them has to check for negatives again.',
    ),
    md(
      '**Goal: order the chain so each branch can rely on the ones above.** Because `age < 4` has already been tested, `elif age <= 12` only ever sees ages 4 and up. There is no need to write `4 <= age <= 12`.',
      '',
      'This also settles overlaps: a 10-year-old with a concession card reaches the child branch first and pays $30.',
    ),
    md(
      '**Goal: join conditions with the right word.** Either reason gives the $45 fare, so the branch is `age >= 65 or has_concession`.',
      '',
      '- `has_concession` is already True or False, so it is tested on its own, not with `== True`.',
      "- Each side of `or` is a complete condition. `age >= 65 or 'concession'` would always be true.",
    ),
    md(
      '**Goal: catch everyone else.** The final `else` needs no condition: anyone who reaches it is 13 to 64 without a concession, and pays $60.',
    ),
    md(
      '**Goal: test the boundaries.**',
      '',
      '```python',
      'print(ferry_fare(3, False))    # 0',
      'print(ferry_fare(4, False))    # 30',
      'print(ferry_fare(12, True))    # 30  (child branch comes first)',
      'print(ferry_fare(13, True))    # 45',
      'print(ferry_fare(65, False))   # 45',
      'print(ferry_fare(64, False))   # 60',
      'print(ferry_fare(-2, False))   # -1',
      '```',
    ),
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'elif_vs_if',
    bad: `if mark >= 80:
    grade = 'HD'
if mark >= 70:
    grade = 'D'
if mark >= 50:
    grade = 'P'`,
    good: `if mark >= 80:
    grade = 'HD'
elif mark >= 70:
    grade = 'D'
elif mark >= 50:
    grade = 'P'`,
    note: "With separate `if`s a mark of 85 matches all three, and the last assignment wins, so 85 becomes `'P'`. An `elif` chain stops at the first true branch.",
  },
  {
    mistake: 'or_with_literal',
    bad: `if zones == 1 or 2:
    fare = 3.2`,
    good: `if zones == 1 or zones == 2:
    fare = 3.2`,
    note: 'Python reads `zones == 1 or 2` as `(zones == 1) or 2`, and `2` on its own is truthy, so every trip gets the 1-2 zone fare. Repeat the variable, or write `zones in (1, 2)`.',
  },
  {
    mistake: 'assign_vs_compare',
    bad: `if answer = 'yes':
    print('Booked')`,
    good: `if answer == 'yes':
    print('Booked')`,
    note: 'One `=` stores a value; two `==` compare. A condition must compare, so `if answer = ...` stops the whole program with a SyntaxError.',
  },
  {
    mistake: 'compare_to_true',
    bad: `def is_hot(temp):
    if temp > 35:
        return True
    else:
        return False`,
    good: `def is_hot(temp):
    return temp > 35`,
    note: 'A comparison is already `True` or `False`, so return it directly. In the same way, test a True/False variable on its own: `if is_member:`, not `if is_member == True:`.',
  },
  {
    mistake: 'input_without_int',
    bad: `age = input('Age: ')
if age >= 18:
    print('Adult fare')`,
    good: `age = int(input('Age: '))
if age >= 18:
    print('Adult fare')`,
    note: "`input()` always returns a string. Comparing it with a number raises `TypeError: '>=' not supported between instances of 'str' and 'int'`, and comparing two strings such as `'9' > '10'` gives the wrong answer silently.",
  },
  {
    mistake: 'is_vs_equals',
    bad: `if zones is 2:
    print('Two zones')`,
    good: `if zones == 2:
    print('Two zones')`,
    note: '`is` checks whether two names are the same object, not whether the values are equal, and Python warns about `is` with a number. Use `==` for values and keep `is` for `None`.',
  },
];
