// Scenario t01-s5: splitting a Northbridge dinner bill (dividing by zero, rounding early, money formatting,
// percentages, and Australian 5 cent cash rounding).
import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');
const md = (...lines: string[]): string => lines.join('\n');

const CRASH_CODE = py(
  'bill_total = 96.0',
  'guests = 0',
  "print('Bill:', bill_total)",
  'share = bill_total / guests',
  "print('Each pays', round(share, 2))",
);

const ROUND_EARLY = py(
  'bill = 100.0',
  'people = 3',
  'share = round(bill / people, 2)',
  'print(round(share * people, 2))',
);

const ROUND_AT_END = py(
  'bill = 100.0',
  'people = 3',
  'share = bill / people',
  'print(round(share * people, 2))',
);

const SPLIT_SOLUTION = py(
  'def split_bill(total, people, tip_percent):',
  '    tip = total * tip_percent / 100',
  '    with_tip = total + tip',
  '    per_person = with_tip / people',
  '    return round(per_person, 2)',
);

const CASH_STARTER = py(
  'def cash_total(amount):',
  '    """Return amount rounded to the nearest 5 cents, in dollars."""',
  '    pass',
);

const CASH_SOLUTION = py(
  'def cash_total(amount):',
  '    """Return amount rounded to the nearest 5 cents, in dollars."""',
  '    cents = round(amount * 100)',
  '    rounded = (cents + 2) // 5 * 5',
  '    return rounded / 100',
);

const scenario: Scenario = {
  id: 't01-s5',
  title: 'Splitting a Northbridge dinner bill',
  story:
    'Six friends eat at a laksa place on William Street in Northbridge and split the bill in a phone app. ' +
    'The app adds a tip, works out what each person owes, and rounds the cash total to the nearest 5 cents, because 1 and 2 cent coins no longer exist.',
  questions: [
    {
      id: 't01-s5-q1',
      format: 'errorTranslator',
      diff: 'easy',
      core: true,
      title: 'Nobody turned up',
      prompt:
        'A booking was cancelled, so `guests` ended up as 0. Run the snippet in your head, then choose the exception it raises and the reason.',
      concepts: ['division', 'runtime-error', 'reading-tracebacks'],
      detects: ['zero_division', 'int_vs_float_division', 'type_error_other'],
      expectedSec: 100,
      code: CRASH_CODE,
      exceptionOptions: ['ZeroDivisionError', 'ValueError', 'TypeError', 'NameError'],
      causes: [
        {
          id: 'a',
          text: '`guests` holds 0, and no number can be divided by 0. The division on line 4 has nothing to work with.',
          correct: true,
        },
        {
          id: 'b',
          text: '`bill_total` is a float and `guests` is an int, so `/` cannot mix the two types.',
          mistake: 'int_vs_float_division',
        },
        {
          id: 'c',
          text: '`round()` on line 5 was given a value it cannot round, so the program stops there.',
          mistake: 'type_error_other',
        },
      ],
      hints: [
        'The first two lines print fine. Look at what line 4 asks Python to compute.',
        'Read the value of every name before line 4 runs: `bill_total` is `96.0` and `guests` is `0`. Now say the division out loud: 96 dollars shared between how many people?',
        'Python has a specific exception for this one arithmetic case, and it is raised before line 5 ever runs.',
      ],
      solution: {
        explanation: md(
          'Line 4 raises `ZeroDivisionError: division by zero`.',
          '',
          '- Lines 1-3 run normally, which is why `Bill: 96.0` is printed before the crash.',
          '- Line 4 is `96.0 / 0`. Division by zero has no answer, so Python stops the program instead of inventing one.',
          '- Line 5 never runs, so nothing is printed after the traceback.',
          '- It is not a `TypeError`: mixing an int and a float with `/` is perfectly normal and gives a float.',
          '',
          'The fix is to make sure the divisor is never 0. Topic 02 shows how to test that with `if` before dividing.',
        ),
      },
      selfExplain: 'Which line of output appears before the traceback, and why does that tell you the crash is on line 4?',
    },
    {
      id: 't01-s5-q2',
      format: 'twins',
      diff: 'medium',
      core: true,
      title: 'Round now or round later',
      prompt:
        'Both snippets share $100 between 3 people and then add the three shares back up. They differ by one line. ' +
        'Work out what each prints, and say which total is the honest one.',
      concepts: ['round', 'float-precision', 'money'],
      detects: ['round_mid_calc', 'float_equality'],
      expectedSec: 180,
      left: ROUND_EARLY,
      right: ROUND_AT_END,
      mistake: 'round_mid_calc',
      hints: [
        'Only line 3 differs: one version rounds the share, the other keeps it whole. Both versions round at the very end.',
        '`100 / 3` is `33.333333333333336`. Work out what the left version stores in `share`, then multiply that stored value by 3.',
        'Rounding to cents throws away a third of a cent per person. Three people lose three thirds of a cent between them.',
      ],
      solution: {
        explanation: md(
          '- **Left** rounds first: `share` becomes `33.33`, and `33.33 * 3` is `99.99`, so it prints `99.99`. A cent has vanished from the bill.',
          '- **Right** keeps the full value `33.333333333333336`. Multiplying that back by 3 lands on exactly `100.0` here (the two roundings happen to cancel out for 3 people), and `round(100.0, 2)` is still `100.0`.',
          '',
          'The rule is: calculate with full precision and round only at the moment you show a number. ' +
          'Rounding in the middle makes the error grow with every later step, which is why the CITS1401 projects insist on rounding at output only.',
          '',
          'It is also a reminder not to lean on `==` for money: split the same $100 eleven ways instead of three and `share * people` comes back as `100.00000000000001`, not exactly `100.0`.',
        ),
      },
      selfExplain: 'If the bill were split 7 ways instead of 3, how far off would the left version be?',
    },
    {
      id: 't01-s5-q3',
      format: 'cloze',
      diff: 'easy',
      core: false,
      title: 'One line of the receipt',
      prompt: md(
        'The app prints one line per item. Complete `receipt_line(item, price, quantity)` so it **returns** a string in exactly this form:',
        '',
        '```python',
        "receipt_line('Prawn laksa', 18.5, 1)   # 'Prawn laksa x1 $18.50'",
        "receipt_line('Roti', 4.0, 3)           # 'Roti x3 $12.00'",
        '```',
        '',
        'That is the item name, a space, `x`, the quantity, a space, `$`, then the cost of all of them with **exactly two decimal places**. ' +
        '`price` is the price of one item as a float, and `quantity` is a whole number.',
      ),
      concepts: ['f-strings', 'format-spec', 'money'],
      detects: ['str_int_concat', 'print_vs_return'],
      expectedSec: 120,
      fnName: 'receipt_line',
      template: py(
        'def receipt_line(item, price, quantity):',
        '    cost = ⟦1⟧',
        "    return f'{item} x{quantity} ${⟦2⟧}'",
      ),
      blanks: [
        { id: '1', accept: ['price * quantity', 'quantity * price'] },
        { id: '2', accept: ['cost:.2f'] },
      ],
      tests: [
        { id: 'v1', call: "receipt_line('Prawn laksa', 18.5, 1)", expect: "'Prawn laksa x1 $18.50'", label: 'one laksa', hidden: false },
        { id: 'v2', call: "receipt_line('Roti', 4.0, 3)", expect: "'Roti x3 $12.00'", label: 'three roti', hidden: false },
        { id: 'h1', call: "receipt_line('Iced tea', 5.25, 2)", expect: "'Iced tea x2 $10.50'", label: 'price with cents', hidden: true },
        { id: 'h2', call: "receipt_line('Sambal', 1.0, 0)", expect: "'Sambal x0 $0.00'", label: 'quantity of zero', hidden: true },
        { id: 'h3', call: "receipt_line('Rice', 3.5, 4)", expect: "'Rice x4 $14.00'", label: 'whole-dollar total shown as .00', hidden: true },
      ],
      hints: [
        'Gap 1 is the cost of the whole row, not of one item. Gap 2 has to make `12.0` appear as `12.00`.',
        'An f-string can carry a format instruction after a colon inside the braces: `{value:.2f}` shows `value` with two decimal places, rounding if it needs to.',
        "Gap 2 is the name `cost` followed by `:.2f`. Notice the `$` is already outside the braces, so you do not repeat it.",
      ],
      solution: {
        code: py(
          'def receipt_line(item, price, quantity):',
          '    cost = price * quantity',
          "    return f'{item} x{quantity} ${cost:.2f}'",
        ),
        explanation: md(
          '- Gap 1 is `price * quantity`: 3 roti at $4.00 cost `12.0`.',
          "- Gap 2 is `cost:.2f`. Inside an f-string, everything after the colon formats the value: `.2f` means \"fixed point, two decimals\", so `12.0` prints as `12.00` and `10.5` as `10.50`.",
          '- Without the format spec, `f\'${cost}\'` would give `$12.0`, which is not how money is written.',
          '- The f-string converts numbers to text for you. Building the same line with `+` would need `str(quantity)` and `str(cost)`, and `+` between a str and a float raises a TypeError.',
          '- The function returns the string. If it printed instead, `receipt_line(...)` would hand back `None` and every test would fail.',
        ),
      },
      selfExplain: 'What would the first test return if gap 2 were just cost?',
    },
    {
      id: 't01-s5-q4',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Build split_bill',
      prompt: md(
        'Arrange the lines to build `split_bill(total, people, tip_percent)`, which **returns** what each person pays as a float, rounded to 2 decimal places.',
        '',
        '- `total` is the bill in dollars, `people` is how many are splitting it (1 or more), and `tip_percent` is a percentage such as `10` or `12.5`.',
        '- Add the tip to the bill first, then split the result evenly.',
        '',
        'Indentation matters. Not every line is needed.',
      ),
      concepts: ['percentage', 'true-division', 'round', 'return-value'],
      detects: ['int_vs_float_division', 'print_vs_return'],
      expectedSec: 210,
      indentMatters: true,
      fnName: 'split_bill',
      lines: [
        { text: 'def split_bill(total, people, tip_percent):', indent: 0 },
        { text: 'tip = total * tip_percent / 100', indent: 1 },
        { text: 'with_tip = total + tip', indent: 1 },
        { text: 'per_person = with_tip / people', indent: 1 },
        { text: 'return round(per_person, 2)', indent: 1 },
      ],
      distractors: [
        { text: 'per_person = with_tip // people', indent: 1, mistake: 'int_vs_float_division' },
        { text: 'print(round(per_person, 2))', indent: 1, mistake: 'print_vs_return' },
      ],
      tests: [
        { id: 'v1', call: 'split_bill(96.0, 4, 10)', expect: '26.4', cmp: 'float', label: '$96 four ways with a 10% tip', hidden: false, tag: 'int_vs_float_division' },
        { id: 'v2', call: 'split_bill(87.35, 3, 0)', expect: '29.12', cmp: 'float', label: 'no tip, does not divide evenly', hidden: false },
        { id: 'h1', call: 'split_bill(100.0, 3, 0)', expect: '33.33', cmp: 'float', label: '$100 three ways', hidden: true, tag: 'print_vs_return' },
        { id: 'h2', call: 'split_bill(0.0, 4, 10)', expect: '0.0', cmp: 'float', label: 'a bill of zero', hidden: true },
        { id: 'h3', call: 'split_bill(45.5, 1, 20)', expect: '54.6', cmp: 'float', label: 'one person paying alone', hidden: true },
        { id: 'h4', call: 'split_bill(50.0, 2, 12)', expect: '28.0', cmp: 'float', label: 'tip makes a whole-dollar share', hidden: true },
      ],
      hints: [
        'Work out the tip before you can add it, and add it before you can divide. Each line uses a value the line above it produced.',
        md(
          'Plan:',
          '',
          '1. Turn `tip_percent` into an amount of money: a percentage is a fraction of 100.',
          '2. Add that amount to the bill.',
          '3. Divide the new total by the number of people, keeping the cents.',
          '4. Hand the rounded value back to whoever called the function.',
        ),
        'The first body line is `tip = total * tip_percent / 100`. The last line has to be a `return`, not a `print`.',
      ],
      solution: {
        code: SPLIT_SOLUTION,
        explanation: md(
          '- `tip = total * tip_percent / 100`: a percentage is hundredths, so 10% of $96 is `96 * 10 / 100`, which is `9.6`. Multiplying by `tip_percent` alone would add a 1000% tip.',
          '- `with_tip = total + tip` gives `105.6`, the amount actually owed.',
          '- `per_person = with_tip / people` uses `/`, which keeps the cents: `105.6 / 4` is `26.4`. With `//` the answer would be `26.0` and the restaurant would be short $1.60.',
          '- `return round(per_person, 2)` rounds once, at the end, and gives the value back. `print(...)` would show the number but return `None`, so the caller gets nothing to work with.',
        ),
      },
      selfExplain: 'Why does the rounding belong on the last line rather than on the tip line?',
    },
    {
      id: 't01-s5-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Round the cash total to 5 cents',
      prompt: md(
        'Australia stopped making 1 and 2 cent coins, so a **cash** total is rounded to the nearest 5 cents.',
        '',
        'Complete `cash_total(amount)` so it **returns** the rounded amount in dollars as a float.',
        '',
        '- `amount` is a float with at most 2 decimal places, 0 or more.',
        '- A total ending in 1 or 2 cents rounds down; one ending in 3 or 4 cents rounds up; a multiple of 5 cents is unchanged.',
        '- `cash_total(12.32)` returns `12.3`, `cash_total(12.33)` returns `12.35`, and `cash_total(0.02)` returns `0.0`.',
        '',
        'Return a number such as `12.35`, not a string, and do not import anything.',
      ),
      concepts: ['round', 'floor-division', 'float-precision', 'money'],
      detects: ['float_equality', 'int_vs_float_division', 'import_used', 'print_vs_return'],
      expectedSec: 480,
      fnName: 'cash_total',
      rules: ['noImport'],
      starter: CASH_STARTER,
      tests: [
        { id: 'v1', call: 'cash_total(12.32)', expect: '12.3', cmp: 'float', label: '2 cents over, rounds down', hidden: false },
        { id: 'v2', call: 'cash_total(12.33)', expect: '12.35', cmp: 'float', label: '3 cents over, rounds up', hidden: false },
        { id: 'h1', call: 'cash_total(0.0)', expect: '0.0', cmp: 'float', label: 'nothing to pay', hidden: true },
        { id: 'h2', call: 'cash_total(0.02)', expect: '0.0', cmp: 'float', label: '2 cents rounds to nothing', hidden: true },
        { id: 'h3', call: 'cash_total(0.03)', expect: '0.05', cmp: 'float', label: '3 cents rounds up to 5', hidden: true },
        { id: 'h4', call: 'cash_total(1.13)', expect: '1.15', cmp: 'float', label: 'a total whose cents are stored imprecisely', hidden: true, tag: 'float_equality' },
        { id: 'h5', call: 'cash_total(23.45)', expect: '23.45', cmp: 'float', label: 'already a multiple of 5 cents', hidden: true },
        { id: 'h6', call: 'cash_total(99.99)', expect: '100.0', cmp: 'float', label: 'rounds up past a dollar', hidden: true },
      ],
      hints: [
        'Dollars with decimals are awkward to round in fives. Whole cents are not. Get to whole cents first, round there, then come back to dollars.',
        md(
          'Plan:',
          '',
          '1. Turn the amount into a whole number of cents. `amount * 100` is not exactly a whole number (1.13 * 100 is 112.99999999999999), so you need `round()` here, not `int()`.',
          '2. Move that whole number of cents to the nearest multiple of 5.',
          '3. Divide by 100 to get dollars back.',
          '',
          '`n // 5 * 5` always rounds a whole number *down* to a multiple of 5, so 113 would become 110. Adjust `n` before the division so that 3 and 4 cents tip upwards.',
        ),
        'Start with `cents = round(amount * 100)`. Then you want the nearest multiple of 5: `(cents + ?) // 5 * 5`, where `?` is the largest number that leaves 1 and 2 cents rounding down.',
      ],
      solution: {
        code: CASH_SOLUTION,
        explanation: md(
          '- `cents = round(amount * 100)` converts dollars to whole cents. `round()` matters: `1.13 * 100` is stored as `112.99999999999999`, so `int()` would give `112` and the answer would come out as `1.10` instead of `1.15`.',
          '- `(cents + 2) // 5 * 5` snaps to the nearest multiple of 5. `//` on its own rounds down, so adding 2 first shifts the cut-off: `112 + 2` is `114`, and `114 // 5 * 5` is `110`; `113 + 2` is `115`, and `115 // 5 * 5` is `115`. Adding 3 instead would wrongly round 2 cents up.',
          '- `rounded / 100` converts back to dollars and gives a float, so `cash_total(0.0)` returns `0.0`.',
          '- `round(cents / 5) * 5 / 100` also works here, because a whole number of cents divided by 5 never lands exactly halfway.',
          '- No `import` is needed. `math.ceil` and `math.floor` are banned in the CITS1401 projects, and `//` does the same job.',
        ),
      },
      selfExplain: 'Why does the code work in whole cents instead of rounding the dollars directly?',
    },
  ],
};

export default scenario;
