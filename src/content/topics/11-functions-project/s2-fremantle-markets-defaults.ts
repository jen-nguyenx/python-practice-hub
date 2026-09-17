import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't11-s2',
  title: 'Fremantle Markets takings',
  story: md(
    'Stallholders at the Fremantle Markets record their sales each weekend. Kofi writes the functions the markets office uses to log sales and check the takings.',
    'Most calls should stay short, so his functions use default parameters. Defaults have one trap that catches nearly everyone once.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 predict
    {
      id: 't11-s2-q1',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Saturday and Sunday sales',
      prompt: 'Kofi gave `record_sale` a default list so a new day can start without passing one in. Type exactly what this program prints.',
      code: `def record_sale(amount, sales=[]):
    sales.append(amount)
    return sales


saturday = record_sale(45)
saturday = record_sale(20, saturday)
sunday = record_sale(30)
print(saturday)
print(sunday)
print(record_sale(15, []))`,
      mutants: [
        {
          code: `def record_sale(amount, sales=None):
    if sales is None:
        sales = []
    sales.append(amount)
    return sales


saturday = record_sale(45)
saturday = record_sale(20, saturday)
sunday = record_sale(30)
print(saturday)
print(sunday)
print(record_sale(15, []))`,
          mistake: 'mutable_default_arg',
        },
        {
          code: `def record_sale(amount, sales=[]):
    sales.append(amount)
    return sales


saturday = record_sale(45)
saturday = record_sale(20, saturday)[:]
sunday = record_sale(30)
print(saturday)
print(sunday)
print(record_sale(15, []))`,
          mistake: 'aliasing_copy',
        },
        {
          code: `def record_sale(amount, sales=[]):
    sales.append(amount)
    return sales


saturday = record_sale(45)
saturday = record_sale(20, saturday)
sunday = record_sale(30)
print(saturday)
print(sunday)
print(record_sale(15))`,
          mistake: 'mutable_default_arg',
        },
      ],
      concepts: ['default-parameters', 'mutable-default', 'aliasing'],
      detects: ['mutable_default_arg', 'aliasing_copy'],
      expectedSec: 180,
      hints: [
        'Count how many separate list objects this program creates. When does Python work out the value of `sales=[]`?',
        'The default list is created once, when Python runs the `def` line. Every call that leaves out `sales` uses that same list object. Track that one list, and remember that `saturday` and `sunday` are only names for whatever list the call returned.',
        'After line 6, `saturday` names the default list `[45]`. Line 7 passes that same list back in. Line 8 leaves `sales` out again, so it appends 30 to the same list.',
      ],
      solution: {
        explanation: md(
          '1. When the `def` line runs, Python creates **one** default list and keeps it with the function.',
          '2. Line 6: no list is passed, so 45 goes into the default list. `saturday` now names that list: `[45]`.',
          '3. Line 7 passes `saturday`, which is the default list itself, so 20 is added to it: `[45, 20]`.',
          '4. Line 8 leaves `sales` out, so 30 is appended to the same default list. `sunday` and `saturday` are two names for one list: `[45, 20, 30]`.',
          '5. Lines 9 and 10 both print `[45, 20, 30]`.',
          '6. Line 11 passes a brand new `[]`, so the default is not used and the result is `[15]`.',
          '',
          'The safe pattern is `sales=None` with `if sales is None: sales = []` inside the function, which makes a new list on every call.',
        ),
      },
      selfExplain: 'Why does the last line print [15] and not [45, 20, 30, 15]?',
    },

    // ---------------------------------------------------------------- q2 mcq
    {
      id: 't11-s2-q2',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'A fresh list on every call',
      prompt: 'Kofi wants `add_sale(amount)` to start a **new** list each time it is called without one, and `add_sale(amount, sales)` to add to the list it is given. The function must return the list. Which version does that?',
      options: [
        {
          id: 'a',
          correct: true,
          text: `def add_sale(amount, sales=None):
    if sales is None:
        sales = []
    sales.append(amount)
    return sales`,
          why: '`None` is a safe default because it is never changed. The `if` creates a new empty list inside the call, so every call without a list starts fresh, and a list that is passed in is used as it is.',
        },
        {
          id: 'b',
          mistake: 'mutable_default_arg',
          text: `def add_sale(amount, sales=[]):
    sales.append(amount)
    return sales`,
          why: 'The default list is created once, when the `def` line runs, and every call without a list shares it. The second call returns the first sale as well.',
        },
        {
          id: 'c',
          mistake: 'global_state',
          text: `sales = []


def add_sale(amount):
    sales.append(amount)
    return sales`,
          why: 'Every call appends to the one global list, so sales pile up across calls. It also cannot add to a list passed in, because there is no second parameter.',
        },
        {
          id: 'd',
          mistake: 'none_from_inplace',
          text: `def add_sale(amount, sales=None):
    if sales is None:
        sales = []
    return sales.append(amount)`,
          why: 'The default is handled correctly, but `append` changes the list and returns `None`, so the function returns `None` instead of the list.',
        },
      ],
      concepts: ['default-parameters', 'none-default', 'mutable-default'],
      detects: ['mutable_default_arg', 'global_state', 'none_from_inplace'],
      expectedSec: 90,
      hints: [
        'Ask two questions of each version: where is the list created, and what does the function return?',
        'A default value is created once, when the `def` line runs. A list created by a line inside the function body is created again on every call.',
        'The right version uses `None` as the default and creates the list with a line inside the body.',
      ],
      solution: {
        explanation: md(
          '- (a) is correct. `sales=None` means "no list given". `if sales is None: sales = []` runs on every call without a list, so each one gets its own new list, and the list is returned.',
          '- (b) shares one default list between all calls, so sales from earlier calls are still in it.',
          '- (c) uses a global list, so every call adds to the same list and callers cannot pass their own.',
          '- (d) returns the result of `append`, which is always `None`.',
        ),
      },
      selfExplain: 'Why is it safe to use None as a default value but not []?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't11-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Benford check on takings',
      prompt: md(
        'The markets treasurer uses Benford\'s law as a quick check on stall takings: in many real sets of money amounts, about 30% start with the digit 1 and fewer than 5% start with 9. (A 2020 CITS1401 project asked for the same kind of digit distribution.)',
        '',
        'Write `leading_digit_counts(amounts, normalise=False)`.',
        '',
        '- `amounts` is a list of whole-dollar amounts (ints). Refunds are negative: use the absolute value. Skip amounts equal to `0`.',
        '- Return a **list of 9 values**, one for each leading digit 1 to 9 (index 0 is for digit 1).',
        '- With `normalise=False` (the default) the values are the **counts** (ints).',
        '- With `normalise=True` each value is its count divided by the number of amounts counted, **rounded to 4 decimal places**. If no amounts were counted, return nine `0.0` values.',
        '- Do not change `amounts`, and do not use variables outside the function: every call starts counting from zero.',
        '',
        'Example: `leading_digit_counts([123, 19, 245, 1000])` returns `[3, 1, 0, 0, 0, 0, 0, 0, 0]`, and with `normalise=True` it returns `[0.75, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]`.',
      ),
      fnName: 'leading_digit_counts',
      starter: `def leading_digit_counts(amounts, normalise=False):
    """Return a list of 9 counts (or proportions to 4 dp) for leading digits 1-9."""
    pass`,
      tests: [
        { id: 'v1', call: 'leading_digit_counts([123, 19, 245, 1000])', expect: '[3, 1, 0, 0, 0, 0, 0, 0, 0]', label: 'four amounts, counts', hidden: false },
        { id: 'v2', call: 'leading_digit_counts([123, 19, 245, 1000], True)', expect: '[0.75, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]', cmp: 'float', label: 'four amounts, normalised', hidden: false },
        { id: 'h1', call: 'leading_digit_counts([])', expect: '[0, 0, 0, 0, 0, 0, 0, 0, 0]', label: 'no amounts, counts', hidden: true },
        { id: 'h2', call: 'leading_digit_counts([], normalise=True)', expect: '[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]', cmp: 'float', label: 'no amounts, normalised', hidden: true, tag: 'zero_division' },
        { id: 'h3', call: 'leading_digit_counts([-45, 0, 7, 0, -9])', expect: '[0, 0, 0, 1, 0, 0, 1, 0, 1]', label: 'refunds and zero amounts', hidden: true },
        { id: 'h4', call: 'leading_digit_counts([1, 2, 3], True)', expect: '[0.3333, 0.3333, 0.3333, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]', cmp: 'float', label: 'proportions rounded to 4 dp', hidden: true, tag: 'return_type_wrong' },
        {
          id: 'h5',
          setup: 'first = leading_digit_counts([5, 50, 500])',
          call: 'leading_digit_counts([9, 95])',
          expect: '[0, 0, 0, 0, 0, 0, 0, 0, 2]',
          label: 'second call starts from zero',
          hidden: true,
          tag: 'mutable_default_arg',
        },
        {
          id: 'h6',
          setup: 'amounts = [310, -27, 1999, 150]',
          call: 'leading_digit_counts(amounts, normalise=True)',
          expect: '[0.5, 0.25, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]',
          cmp: 'float',
          argsUnchanged: ['amounts'],
          label: 'amounts list is not changed',
          hidden: true,
        },
      ],
      concepts: ['default-parameters', 'helper-functions', 'digits', 'normalise'],
      detects: ['mutable_default_arg', 'global_state', 'zero_division', 'return_type_wrong', 'mutated_input'],
      expectedSec: 600,
      hints: [
        'Split the job: one small helper finds the leading digit of a single amount, and the main function counts. Where must the list of nine counts be created so each call starts from zero?',
        'Plan: create `counts` (nine zeros) and a `counted` total inside the function. For each non-zero amount, find its leading digit (take `abs`, then keep doing `// 10` while it is 10 or more) and add 1 to `counts[digit - 1]`. If `normalise` is False, return the counts. Otherwise build a new list of `round(count / counted, 4)` values, using `0.0` when `counted` is 0.',
        md(
          '```python',
          'def leading_digit(amount):',
          '    amount = abs(amount)',
          '    while amount >= 10:',
          '        amount = amount // 10',
          '    return amount',
          '```',
        ),
      ],
      solution: {
        code: `def leading_digit(amount):
    """Return the first digit of a non-zero whole number."""
    amount = abs(amount)
    while amount >= 10:
        amount = amount // 10
    return amount


def leading_digit_counts(amounts, normalise=False):
    """Return a list of 9 counts (or proportions to 4 dp) for leading digits 1-9."""
    counts = [0] * 9
    counted = 0
    for amount in amounts:
        if amount != 0:
            digit = leading_digit(amount)
            counts[digit - 1] = counts[digit - 1] + 1
            counted = counted + 1
    if not normalise:
        return counts
    proportions = []
    for count in counts:
        if counted == 0:
            proportions.append(0.0)
        else:
            proportions.append(round(count / counted, 4))
    return proportions`,
        explanation: md(
          '1. `leading_digit` is a helper with one job. `abs` turns a refund like `-45` into `45`, and `// 10` removes the last digit until one digit is left.',
          '2. `counts = [0] * 9` is created **inside** `leading_digit_counts`, so every call starts from nine zeros. A list outside the function, or a default like `counts=[0] * 9`, would keep counts from earlier calls.',
          '3. Zero amounts are skipped, so they add to neither `counts` nor `counted`. Digit `d` goes in `counts[d - 1]` because index 0 is for digit 1.',
          '4. `normalise=False` is a default parameter, so a plain call returns the counts straight away.',
          '5. For proportions a **new** list is built, and each value is rounded once, as it goes into the returned list. Checking `counted == 0` first avoids `ZeroDivisionError` for an empty list.',
          '6. The function only reads `amounts`, so the caller\'s list is unchanged.',
        ),
      },
      selfExplain: 'What would the second call in hidden test h5 return if counts were a default parameter counts=[0] * 9?',
    },
  ],
};

export default scenario;
