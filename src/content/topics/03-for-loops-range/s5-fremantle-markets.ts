import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't03-s5',
  title: 'Fremantle Markets stall',
  story:
    'Nadia sells doughnuts from a stall at the Fremantle Markets on Sunday mornings. ' +
    'Before the doors open she checks the rows of stalls, and between Sundays she looks at how her takings are growing and what to charge.',
  questions: [
    {
      id: 't03-s5-q1',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'Checking half the rows',
      prompt:
        'The markets have 9 rows of stalls and Nadia only has time to walk the first half of them before opening. ' +
        'This program crashes without printing anything. Click the line that raised the error, choose the exception type, then choose the cause and fix.',
      code:
        'rows = 9\n' +
        'half = rows / 2\n' +
        'for row in range(half):\n' +
        "    print('Checking row', row + 1)",
      exceptionOptions: ['TypeError', 'ValueError', 'NameError', 'ZeroDivisionError'],
      causes: [
        {
          id: 'a',
          correct: true,
          text: '`/` always gives a float, even when the division comes out even, and `range` only accepts whole numbers. Use `half = rows // 2` so `half` is the int 4.',
        },
        {
          id: 'b',
          mistake: 'int_vs_float_division',
          text: '9 / 2 is 4.5 and there is no row 4.5. Change the first line to `rows = 8` so the division comes out even.',
        },
        {
          id: 'c',
          mistake: 'off_by_one_range',
          text: '`range` cannot be given a single value, so it produces nothing and the loop variable `row` is never created. Write `range(1, half)` instead.',
        },
      ],
      concepts: ['range', 'int-vs-float', 'floor-division'],
      detects: ['int_vs_float_division', 'off_by_one_range'],
      expectedSec: 150,
      hints: [
        'The message talks about a type, not a value. Which value on that line is not the type `range` needs?',
        'Work out what `rows / 2` produces and what type it is. Then ask what `range` needs as its argument.',
        'Try `rows = 8` in your head: `8 / 2` is `4.0`, and the same error still appears. The fix has to change the **type**, not the numbers.',
      ],
      solution: {
        explanation:
          '1. Line 1 sets `rows` to the int 9.\n' +
          '2. Line 2 works out `9 / 2`. In Python 3 the `/` operator always gives a float, so `half` is `4.5`.\n' +
          '3. Line 3 calls `range(4.5)`. `range` counts in whole numbers and refuses a float, so Python raises `TypeError: \'float\' object cannot be interpreted as an integer` on line 3. Nothing has been printed yet, which is why the screen is empty.\n' +
          '4. The fix is `half = rows // 2`. Floor division gives the int `4`, so the loop checks rows 1 to 4.\n\n' +
          'Making `rows` even would not help: `8 / 2` is `4.0`, still a float, and `range(4.0)` raises the same TypeError.',
      },
      selfExplain: 'Why does range(4.0) fail even though 4.0 is a whole number?',
    },
    {
      id: 't03-s5-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Takings growing 5% a week',
      prompt:
        "Nadia's takings grow by 5% each week: every week she takes 1.05 times what she took the week before.\n\n" +
        'Complete `takings_after(start, weeks)` so it **returns** the takings after `weeks` weeks of growth, rounded to 2 decimal places. ' +
        '`weeks` is 0 or more; with `weeks` of 0 no week has passed, so the answer is just `start`. ' +
        'For example `takings_after(320.0, 1)` returns 336.0.',
      template:
        'def takings_after(start, weeks):\n' +
        '    """Return the takings after weeks weeks of 5% growth, rounded to 2 decimal places."""\n' +
        '    takings = ⟦1⟧\n' +
        '    for week in range(weeks):\n' +
        '        takings = ⟦2⟧\n' +
        '    return round(takings, ⟦3⟧)',
      blanks: [
        { id: '1', accept: ['start'] },
        { id: '2', accept: ['takings * 1.05', 'takings*1.05', '1.05 * takings', 'takings * 105 / 100'] },
        { id: '3', accept: ['2'] },
      ],
      fnName: 'takings_after',
      tests: [
        { id: 'v1', call: 'takings_after(320.0, 1)', expect: '336.0', cmp: 'float', label: 'one week of growth', hidden: false },
        { id: 'v2', call: 'takings_after(320.0, 3)', expect: '370.44', cmp: 'float', label: 'three weeks, rounded', hidden: false },
        { id: 'h1', call: 'takings_after(320.0, 0)', expect: '320.0', cmp: 'float', label: 'no weeks have passed', hidden: true, tag: 'accumulator_init' },
        { id: 'h2', call: 'takings_after(500.0, 10)', expect: '814.45', cmp: 'float', label: 'ten weeks', hidden: true },
        { id: 'h3', call: 'takings_after(120.5, 4)', expect: '146.47', cmp: 'float', label: 'start has cents in it', hidden: true },
        { id: 'h4', call: 'takings_after(0.0, 5)', expect: '0.0', cmp: 'float', label: 'a stall that took nothing', hidden: true, tag: 'accumulator_init' },
      ],
      concepts: ['accumulator', 'range', 'round', 'percentage'],
      detects: ['accumulator_init'],
      expectedSec: 110,
      hints: [
        'A running total starts at 0 because adding 0 changes nothing. What is the equivalent starting value when each pass **multiplies**?',
        'Blank 1: the takings before any week has passed. Blank 2: this week\'s takings, worked out from last week\'s. Blank 3: how many decimal places the answer needs.',
        'Blank 2 has the shape `takings = takings * ...`, with 1.05 standing for "5% more than before".',
      ],
      solution: {
        code:
          'def takings_after(start, weeks):\n' +
          '    """Return the takings after weeks weeks of 5% growth, rounded to 2 decimal places."""\n' +
          '    takings = start\n' +
          '    for week in range(weeks):\n' +
          '        takings = takings * 1.05\n' +
          '    return round(takings, 2)',
        explanation:
          '1. `takings = start` sets the running value once, before the loop. Starting at 0 would be wrong here: 0 times 1.05 is 0, so every answer would come out as 0. A running product starts at the value you already have.\n' +
          '2. `for week in range(weeks):` runs exactly `weeks` times: `range(0)` produces nothing, so with `weeks` of 0 the body never runs and `start` comes straight back.\n' +
          '3. `takings = takings * 1.05` replaces the running value with 5% more than it was. `takings * 105 / 100` does the same job.\n' +
          '4. `return round(takings, 2)` is lined up with `for`, so the rounding happens once, at the end. For 320.0 over 3 weeks the value is 370.4400000000001, which rounds to 370.44.',
      },
      selfExplain: 'Why would takings = 0 in blank 1 make every answer 0?',
    },
    {
      id: 't03-s5-q3',
      format: 'fixBug',
      diff: 'hard',
      core: false,
      title: 'Saving for a new stall',
      prompt:
        'Nadia is saving for a bigger stall. In week 1 she takes `start` dollars, and every week after that she takes `increase` dollars more than the week before. ' +
        '`weeks_to_save(start, increase, target, max_weeks)` should **return** the number of the first week where her **running total** over all weeks so far reaches at least `target`, as an int, or 0 if it has not reached the target by week `max_weeks`.\n\n' +
        'For example with `start` 500 and `increase` 100 the weekly takings are 500, 600, 700, ... so the running totals are 500, 1100, 1800, and `weeks_to_save(500, 100, 600, 10)` returns 2.\n\n' +
        'The function below reports a week that is too early. Find and fix the bug; change at most 2 lines.',
      buggy:
        'def weeks_to_save(start, increase, target, max_weeks):\n' +
        '    """Return the first week whose running total reaches target, or 0."""\n' +
        '    takings = start\n' +
        '    total = 0\n' +
        '    for week in range(1, max_weeks + 1):\n' +
        '        takings = takings + increase\n' +
        '        total = total + takings\n' +
        '        if total >= target:\n' +
        '            return week\n' +
        '    return 0',
      bugMistake: 'accumulator_init',
      maxChangedLines: 2,
      fnName: 'weeks_to_save',
      tests: [
        { id: 'v1', call: 'weeks_to_save(500, 100, 600, 10)', expect: '2', label: 'target reached in week 2', hidden: false, tag: 'accumulator_init' },
        { id: 'v2', call: 'weeks_to_save(300, 50, 10000, 5)', expect: '0', label: 'target out of reach in 5 weeks', hidden: false },
        { id: 'h1', call: 'weeks_to_save(500, 100, 1200, 10)', expect: '3', label: 'target reached in week 3', hidden: true, tag: 'accumulator_init' },
        { id: 'h2', call: 'weeks_to_save(500, 100, 500, 10)', expect: '1', label: 'week 1 alone reaches the target', hidden: true, tag: 'accumulator_init' },
        { id: 'h3', call: 'weeks_to_save(500, 0, 5000, 10)', expect: '10', label: 'reached in the very last week', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'weeks_to_save(400, 25, 1650, 4)', expect: '4', label: 'takings rise every week', hidden: true },
      ],
      concepts: ['accumulator', 'series', 'early-return', 'loop-if'],
      detects: ['accumulator_init', 'off_by_one_range', 'early_return_in_loop'],
      expectedSec: 420,
      hints: [
        'Work through `weeks_to_save(500, 100, 600, 10)` by hand for week 1. How much does the code add to `total` on that first pass, and how much should it add?',
        'The weekly takings are already correct for week 1 before the loop starts: `takings = start`. The loop moves them on to the next week too early, so week 1 is banked at the week 2 amount. The move-on has to happen **after** this week has been counted.',
        'Nothing is missing and nothing is extra: the same lines are needed, but `takings = takings + increase` belongs below the `if`, not above `total = total + takings`.',
      ],
      solution: {
        code:
          'def weeks_to_save(start, increase, target, max_weeks):\n' +
          '    """Return the first week whose running total reaches target, or 0."""\n' +
          '    takings = start\n' +
          '    total = 0\n' +
          '    for week in range(1, max_weeks + 1):\n' +
          '        total = total + takings\n' +
          '        if total >= target:\n' +
          '            return week\n' +
          '        takings = takings + increase\n' +
          '    return 0',
        explanation:
          '1. `takings = start` already holds week 1\'s takings, and `total = 0` is the empty running total. Both are set once, before the loop.\n' +
          '2. In the buggy version the first thing the loop does is add `increase`, so week 1 banks 600 instead of 500. Every week is then one step ahead and the target looks reached a week too early: `weeks_to_save(500, 100, 600, 10)` answered 1 instead of 2.\n' +
          '3. `total = total + takings` banks the current week first.\n' +
          '4. `if total >= target: return week` stops as soon as the total is big enough, and `>=` means hitting the target exactly counts.\n' +
          '5. `takings = takings + increase` now runs at the end of the pass, preparing the **next** week\'s takings.\n' +
          '6. `return 0` sits after the loop, so it only runs when all `max_weeks` weeks have been checked.',
      },
      selfExplain: 'Why does the order of the two update lines change the answer, when both lines run on every pass?',
    },
    {
      id: 't03-s5-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Choosing the price',
      prompt:
        'Nadia prices her doughnuts in whole cents. From past Sundays she expects that at a price of `p` cents she sells `200 - p` doughnuts, ' +
        'so her takings for the day are `p * (200 - p)` cents.\n\n' +
        'Write `best_price(low, high, step)` that tries every price from `low` up to and including `high`, in steps of `step`, and **returns** the price in cents (an int) that gives the highest takings. ' +
        'If two prices give exactly the same takings, return the lower one. You can assume `1 <= low <= high <= 200` and `step >= 1`.\n\n' +
        'For example `best_price(50, 150, 10)` returns 100, because 100 cents gives 100 * 100 = 10000 cents, more than any other price it tries.',
      fnName: 'best_price',
      starter:
        'def best_price(low, high, step):\n' +
        '    """Return the price in cents, from low to high in steps of step, with the highest takings."""\n' +
        '    pass\n',
      tests: [
        { id: 'v1', call: 'best_price(50, 150, 10)', expect: '100', label: 'best price in the middle of the range', hidden: false },
        { id: 'v2', call: 'best_price(10, 40, 10)', expect: '40', label: 'best price is the highest one tried', hidden: false, tag: 'off_by_one_range' },
        { id: 'h1', call: 'best_price(90, 110, 20)', expect: '90', label: 'two prices tie, keep the lower', hidden: true, tag: 'sort_tiebreak' },
        { id: 'h2', call: 'best_price(100, 100, 1)', expect: '100', label: 'only one price to try', hidden: true },
        { id: 'h3', call: 'best_price(50, 55, 10)', expect: '50', label: 'the step jumps past high', hidden: true },
        { id: 'h4', call: 'best_price(20, 180, 80)', expect: '100', label: 'big steps', hidden: true },
        { id: 'h5', call: 'best_price(190, 200, 5)', expect: '190', label: 'takings fall to zero at 200 cents', hidden: true },
        { id: 'h6', call: 'best_price(200, 200, 1)', expect: '200', label: 'every price tried takes nothing', hidden: true, tag: 'accumulator_init' },
      ],
      concepts: ['range-step', 'running-maximum', 'loop-if', 'search'],
      detects: ['off_by_one_range', 'sort_tiebreak', 'accumulator_init', 'return_type_wrong', 'print_vs_return'],
      expectedSec: 600,
      hints: [
        'You cannot know the best price until every price has been tried, so you need to remember two things as the loop runs.',
        'Plan: before the loop, remember the best price so far (start with `low`) and the best takings so far (start with something no real takings can lose to, such as -1). In the loop work out this price\'s takings, and if they beat the best so far, update both variables. Return the best **price** after the loop.',
        'The body is:\n\n```python\ntakings = price * (200 - price)\nif takings > best_takings:\n    best_takings = takings\n    best = price\n```',
      ],
      solution: {
        code:
          'def best_price(low, high, step):\n' +
          '    """Return the price in cents, from low to high in steps of step, with the highest takings."""\n' +
          '    best = low\n' +
          '    best_takings = -1\n' +
          '    for price in range(low, high + 1, step):\n' +
          '        takings = price * (200 - price)\n' +
          '        if takings > best_takings:\n' +
          '            best_takings = takings\n' +
          '            best = price\n' +
          '    return best\n',
        explanation:
          '1. `best = low` and `best_takings = -1` are set once, before the loop. Starting the takings at -1 means the very first price always beats it, so `best` is real after one pass.\n' +
          '2. `range(low, high + 1, step)` tries `low`, `low + step`, ... The `+ 1` is what includes `high` itself: without it `best_price(10, 40, 10)` would never try 40 and would answer 30.\n' +
          '3. `takings = price * (200 - price)` is this price\'s takings in cents.\n' +
          '4. `if takings > best_takings:` uses `>`, not `>=`, so a later price that only equals the best is ignored and the **lower** price is kept. With `>=`, `best_price(90, 110, 20)` would answer 110.\n' +
          '5. Both variables are updated together inside the `if`. Updating only `best_takings` would leave `best` behind.\n' +
          '6. `return best` is lined up with `for`, so it runs after every price has been tried, and it returns the price, not the takings.',
      },
      selfExplain: 'Why does the comparison have to be > rather than >= to keep the lower price on a tie?',
    },
  ],
};

export default scenario;
