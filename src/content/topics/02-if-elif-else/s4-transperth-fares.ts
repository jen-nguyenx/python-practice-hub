// Scenario t02-s4: Transperth SmartRider rules (is versus ==, flattening nested ifs, a multi-rule fare function).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const REFACTOR_CODE = `def can_tag_on(balance, has_concession, blocked):
    if blocked == True:
        return False
    else:
        if balance >= 10:
            return True
        else:
            if has_concession == True:
                if balance >= 5:
                    return True
                else:
                    return False
            else:
                return False`;

const REFACTOR_SOLUTION = `def can_tag_on(balance, has_concession, blocked):
    return not blocked and (balance >= 10 or (has_concession and balance >= 5))`;

const FARE_STARTER = `def trip_fare(zones, age, hour):
    """Return the fare in dollars as a float, or None if zones or hour is invalid."""
    pass`;

const FARE_SOLUTION = `def trip_fare(zones, age, hour):
    """Return the fare in dollars as a float, or None if zones or hour is invalid."""
    if zones < 1 or zones > 9 or hour < 0 or hour > 23:
        return None
    if zones <= 2:
        base = 3.2
    elif zones <= 4:
        base = 5.1
    else:
        base = 7.6
    peak = 6 <= hour <= 8
    if age < 5:
        return 0.0
    elif age >= 65 and not peak:
        return 0.0
    elif age <= 17 or age >= 65:
        return base / 2
    else:
        return base`;

const scenario: Scenario = {
  id: 't02-s4',
  title: 'SmartRider rules',
  story:
    'Transperth SmartRider readers decide at the gate whether a card can tag on and how much the trip costs. ' +
    'The rules below are simplified, but they use the same kind of decisions: zones, age, concessions and peak hours.',
  questions: [
    {
      id: 't02-s4-q1',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'is or ==?',
      prompt: 'True or false: `if zones is 2:` is a good way to check whether the number of zones travelled equals 2.',
      concepts: ['comparison', 'is-vs-equals'],
      detects: ['is_vs_equals'],
      expectedSec: 45,
      options: [
        {
          id: 'a',
          text: 'True',
          mistake: 'is_vs_equals',
          why: '`is` asks whether two values are the very same object in memory, not whether they are equal. It happens to work for small whole numbers such as 2, but equal values can still fail: `2.0 is 2` is `False`, and so is `zones is 1000` when `zones` came from `int(input())`. Python also warns: `"is" with \'int\' literal. Did you mean "=="?`',
        },
        {
          id: 'b',
          text: 'False',
          correct: true,
          why: 'Compare values with `==`: `if zones == 2:`. Keep `is` for checking `None`, as in `if result is None:`.',
        },
      ],
      hints: [
        'There are two different questions you can ask: "are these equal?" and "are these the same object?"',
        '`==` compares values. `is` compares identity. Which one does the check need?',
        'Python itself prints a SyntaxWarning for `zones is 2` and suggests another operator.',
      ],
      solution: {
        explanation: md(
          'False.',
          '',
          '- `zones == 2` asks whether the value of `zones` equals 2. That is what the check needs.',
          '- `zones is 2` asks whether `zones` is the very same object as the literal `2`. Python 3.8 and later warn about this line because the answer depends on how Python stores numbers, not on their values.',
          '- The only everyday use of `is` in CITS1401 is `x is None`.',
        ),
      },
      selfExplain: 'When is it correct to use is instead of ==?',
    },
    {
      id: 't02-s4-q2',
      format: 'refactor',
      diff: 'hard',
      core: false,
      title: 'Flatten can_tag_on',
      prompt: md(
        'This function works but is hard to read: four levels of nesting, `== True`, and `if` blocks that only return `True` or `False`.',
        '',
        'The rule: a card can tag on when it is **not blocked** and either the balance is at least $10, **or** the holder has a concession and the balance is at least $5.',
        '',
        'Rewrite `can_tag_on` without any `== True` and without any `if`/`else` that just returns `True` or `False`. A single `return` of a boolean expression is ideal. Behaviour must not change for any input.',
      ),
      concepts: ['boolean', 'nested-if', 'return-boolean'],
      detects: ['compare_to_true'],
      expectedSec: 420,
      code: REFACTOR_CODE,
      fnName: 'can_tag_on',
      mustRemove: ['compare_to_true', 'if_return_bool_literal'],
      pattern: 'return-boolean-directly',
      tests: [
        { id: 'v1', call: 'can_tag_on(12.5, False, False)', expect: 'True', label: '$12.50, no concession', hidden: false },
        { id: 'v2', call: 'can_tag_on(6.0, True, False)', expect: 'True', label: 'concession card with $6', hidden: false },
        { id: 'v3', call: 'can_tag_on(6.0, False, False)', expect: 'False', label: '$6, no concession', hidden: false },
        { id: 'h1', call: 'can_tag_on(50.0, True, True)', expect: 'False', label: 'blocked card with plenty of money', hidden: true },
        { id: 'h2', call: 'can_tag_on(10, False, False)', expect: 'True', label: 'exactly $10', hidden: true },
        { id: 'h3', call: 'can_tag_on(5, True, False)', expect: 'True', label: 'concession with exactly $5', hidden: true },
        { id: 'h4', call: 'can_tag_on(4.99, True, False)', expect: 'False', label: 'concession with $4.99', hidden: true },
        { id: 'h5', call: 'can_tag_on(0, False, True)', expect: 'False', label: 'blocked and empty', hidden: true },
      ],
      hints: [
        'Say the rule out loud with "and", "or" and "not". Each nested `if` that returns True in one branch and False in the other is really one of those words.',
        md(
          'Plan:',
          '',
          '1. `blocked == True` is just `blocked`, and the card must be `not blocked`.',
          '2. The money part is: enough for anyone (`balance >= 10`) **or** (concession **and** `balance >= 5`).',
          '3. Join the two parts with `and` and return the whole expression. Use brackets so the `or` is grouped before the `and` joins it.',
        ),
        md(
          '```python',
          'def can_tag_on(balance, has_concession, blocked):',
          '    return not blocked and (...)',
          '```',
        ),
      ],
      solution: {
        code: REFACTOR_SOLUTION,
        explanation: md(
          '- `not blocked` replaces the outer `if blocked == True: return False`. If the card is blocked, `not blocked` is `False` and `and` stops there, so the result is `False`.',
          '- `balance >= 10 or (...)` replaces the second level: $10 is enough on its own.',
          '- `has_concession and balance >= 5` replaces the two innermost levels: both must be true.',
          '- The brackets matter. Without them, `not blocked and balance >= 10 or has_concession and balance >= 5` groups as `(not blocked and balance >= 10) or (has_concession and balance >= 5)`, which lets a blocked concession card with $50 tag on.',
          '',
          'An equally good version keeps a guard clause: `if blocked: return False`, then `return balance >= 10 or (has_concession and balance >= 5)`.',
        ),
      },
      selfExplain: 'Why does removing the brackets change the answer for can_tag_on(50.0, True, True)?',
    },
    {
      id: 't02-s4-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Write trip_fare',
      prompt: md(
        'Complete `trip_fare(zones, age, hour)` so it **returns** the fare in dollars as a float. `zones`, `age` and `hour` are ints; `hour` is the hour the trip starts on a 24-hour clock, so 14 means 2:00 to 2:59 pm.',
        '',
        '1. If `zones` is not between 1 and 9 inclusive, or `hour` is not between 0 and 23 inclusive, return `None`.',
        '2. The base fare is 3.2 for 1-2 zones, 5.1 for 3-4 zones and 7.6 for 5-9 zones.',
        '3. Peak hours are 6, 7 and 8 (6:00 to 8:59).',
        '4. Children under 5 travel free (0.0).',
        '5. Seniors (65 or older) travel free outside peak hours.',
        '6. Ages 5 to 17, and seniors during peak hours, pay half the base fare.',
        '7. Everyone else pays the base fare.',
        '',
        'Do not round the result.',
      ),
      concepts: ['elif', 'boolean', 'chained-comparison', 'guard', 'boundary'],
      detects: ['elif_vs_if', 'or_with_literal', 'print_vs_return'],
      expectedSec: 600,
      fnName: 'trip_fare',
      starter: FARE_STARTER,
      tests: [
        { id: 'v1', call: 'trip_fare(2, 30, 12)', expect: '3.2', cmp: 'float', label: 'adult, 2 zones, midday', hidden: false },
        { id: 'v2', call: 'trip_fare(3, 15, 8)', expect: '2.55', cmp: 'float', label: 'age 15, 3 zones, peak', hidden: false },
        { id: 'v3', call: 'trip_fare(1, 70, 11)', expect: '0.0', cmp: 'float', label: 'senior, off-peak', hidden: false },
        { id: 'h1', call: 'trip_fare(4, 4, 7)', expect: '0.0', cmp: 'float', label: 'age 4', hidden: true, tag: 'elif_vs_if' },
        { id: 'h2', call: 'trip_fare(4, 5, 7)', expect: '2.55', cmp: 'float', label: 'age exactly 5', hidden: true },
        { id: 'h3', call: 'trip_fare(2, 17, 18)', expect: '1.6', cmp: 'float', label: 'age exactly 17', hidden: true },
        { id: 'h4', call: 'trip_fare(2, 18, 18)', expect: '3.2', cmp: 'float', label: 'age exactly 18', hidden: true },
        { id: 'h5', call: 'trip_fare(9, 65, 8)', expect: '3.8', cmp: 'float', label: 'senior at 8am (still peak)', hidden: true },
        { id: 'h6', call: 'trip_fare(9, 65, 9)', expect: '0.0', cmp: 'float', label: 'senior at 9am (off-peak)', hidden: true },
        { id: 'h7', call: 'trip_fare(2, 80, 5)', expect: '0.0', cmp: 'float', label: 'senior before 6am', hidden: true },
        { id: 'h8', call: 'trip_fare(7, 30, 6)', expect: '7.6', cmp: 'float', label: 'adult, 7 zones', hidden: true, tag: 'or_with_literal' },
        { id: 'h9', call: 'trip_fare(0, 30, 12)', expect: 'None', label: 'zero zones', hidden: true },
        { id: 'h10', call: 'trip_fare(10, 30, 12)', expect: 'None', label: '10 zones', hidden: true },
        { id: 'h11', call: 'trip_fare(2, 30, 24)', expect: 'None', label: 'hour 24', hidden: true },
      ],
      hints: [
        'Split the job in two: first work out the base fare from the zones, then decide how much of it this passenger pays.',
        md(
          'Plan:',
          '',
          '1. Guard: return `None` straight away for bad zones or a bad hour.',
          '2. An `if`/`elif`/`else` on zones stores `base`.',
          '3. Store `peak = 6 <= hour <= 8`.',
          '4. One chain on age, in this order: under 5, senior off-peak, half fare (5-17 or senior), everyone else. The order lets each branch rely on the earlier ones being false.',
        ),
        md(
          '```python',
          'if zones <= 2:',
          '    base = 3.2',
          'elif zones <= 4:',
          '    base = 5.1',
          'else:',
          '    base = 7.6',
          'peak = 6 <= hour <= 8',
          'if age < 5:',
          '    return 0.0',
          'elif age >= 65 and not peak:',
          '    ...',
          '```',
        ),
      ],
      solution: {
        code: FARE_SOLUTION,
        explanation: md(
          '- The guard returns `None` first, so the rest of the function can assume valid zones and hours. Each side of `or` repeats its variable: `zones < 1 or zones > 9`, never `zones < 1 or > 9`.',
          '- The zones chain only needs one comparison per branch because earlier branches have already handled the smaller zone counts.',
          '- `peak = 6 <= hour <= 8` stores a boolean, so later conditions can say `not peak`.',
          '- The age chain order matters: `age < 5` comes first so a 4-year-old is never charged half fare. Free off-peak travel for seniors comes before the half-fare branch, so the half-fare branch only sees seniors travelling in peak hours.',
          '- `age <= 17 or age >= 65` can skip `age >= 5` because children under 5 already returned.',
          '- `else` returns the full base fare for everyone aged 18 to 64.',
          '',
          'Separate `if` statements that overwrite a `price` variable are where this usually goes wrong: a 4-year-old matches both "under 5" and "17 or under" and ends up paying half.',
        ),
      },
      selfExplain: 'What would a 70-year-old pay at 11am if the half-fare branch came before the senior off-peak branch?',
    },
  ],
};

export default scenario;
