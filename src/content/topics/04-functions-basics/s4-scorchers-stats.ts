import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s4',
  title: 'Perth Scorchers toolkit',
  story: md(
    "The Perth Scorchers analyst keeps a small Python toolkit for matches at Optus Stadium: selection maths, boundary checks and scorecard lines.",
    'These extension questions put several functions to work together.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 parsons
    {
      id: 't04-s4-q1',
      format: 'parsons',
      diff: 'hard',
      core: false,
      title: 'How many ways to pick the team',
      prompt: md(
        'The selectors choose `team` players from a squad of `squad` players. The number of different ways to do that is `squad! // (team! * (squad - team)!)`, where `n!` (n factorial) means 1 × 2 × ... × n, and `0!` is 1.',
        '',
        'Arrange the lines to build `factorial(n)` and `ways_to_pick(squad, team)`. `ways_to_pick` must return an **int**: for example, `ways_to_pick(15, 11)` returns `1365`. Not every line is needed, and indentation matters.',
      ),
      lines: [
        { text: 'def factorial(n):', indent: 0 },
        { text: 'result = 1', indent: 1 },
        { text: 'for k in range(2, n + 1):', indent: 1 },
        { text: 'result = result * k', indent: 2 },
        { text: 'return result', indent: 1 },
        { text: 'def ways_to_pick(squad, team):', indent: 0 },
        { text: 'return factorial(squad) // (factorial(team) * factorial(squad - team))', indent: 1 },
      ],
      distractors: [
        { text: 'result = 0', indent: 1, mistake: 'accumulator_init' },
        { text: 'return factorial(squad) / (factorial(team) * factorial(squad - team))', indent: 1, mistake: 'int_vs_float_division' },
      ],
      indentMatters: true,
      fnName: 'ways_to_pick',
      tests: [
        { id: 'v1', call: 'factorial(5)', expect: '120', label: '5! is 120', hidden: false },
        { id: 'v2', call: 'ways_to_pick(15, 11)', expect: '1365', label: '11 players from a squad of 15', hidden: false },
        { id: 'h1', call: 'factorial(0)', expect: '1', label: '0! is 1', hidden: true, tag: 'accumulator_init' },
        { id: 'h2', call: 'isinstance(ways_to_pick(15, 11), int)', expect: 'True', label: 'returns an int, not a float', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h3', call: 'ways_to_pick(5, 2)', expect: '10', label: '2 players from 5', hidden: true },
        { id: 'h4', call: 'ways_to_pick(12, 12)', expect: '1', label: 'pick the whole squad', hidden: true },
      ],
      concepts: ['helper-functions', 'accumulator', 'return', 'floor-division'],
      detects: ['accumulator_init', 'int_vs_float_division', 'early_return_in_loop'],
      expectedSec: 420,
      hints: [
        'Build `factorial` first. A product starts from a value that does not change the answer when you multiply by it.',
        'factorial: set up the running product, loop k from 2 up to and including n, multiply it in, and return after the loop. ways_to_pick: one return line that calls factorial three times and uses the division that keeps an int.',
        'The loop body is `result = result * k`, indented under the `for`. `return result` lines up with the `for`, not with the body.',
      ],
      solution: {
        code: `def factorial(n):
    result = 1
    for k in range(2, n + 1):
        result = result * k
    return result
def ways_to_pick(squad, team):
    return factorial(squad) // (factorial(team) * factorial(squad - team))`,
        explanation: md(
          '1. `result = 1` starts the product. Starting at 0 would make every factorial 0, because anything times 0 is 0.',
          '2. `for k in range(2, n + 1)` multiplies in 2, 3, ..., n. For `n` of 0 or 1 the loop does not run and the function returns 1, which is correct.',
          '3. `return result` is lined up with the `for`, so it runs once, after the loop has finished.',
          '4. `ways_to_pick` calls `factorial` three times and uses `//`. The division is always exact here, and `//` keeps the answer an int (`1365`), where `/` would give the float `1365.0`.',
        ),
      },
      selfExplain: 'Why does factorial(0) return 1 without the loop ever running?',
    },

    // ---------------------------------------------------------------- q2 refactor
    {
      id: 't04-s4-q2',
      format: 'refactor',
      diff: 'medium',
      core: false,
      title: 'Return the condition itself',
      prompt: md(
        "These three helpers work, but `is_boundary` and `is_maiden` wrap a condition in an `if` that returns `True` or `False`, and `over_summary` compares a result to `True`.",
        '',
        'Rewrite them so `is_boundary` and `is_maiden` are each a single `return` of the condition, and `over_summary` tests `is_maiden(...)` directly. Every call must give the same result as before.',
      ),
      code: `def is_boundary(runs):
    """Return True if a single shot scored 4 or 6 runs."""
    if runs == 4 or runs == 6:
        return True
    else:
        return False


def is_maiden(runs_conceded, balls):
    """Return True if a complete over (6 balls) conceded no runs."""
    if runs_conceded == 0 and balls == 6:
        return True
    return False


def over_summary(runs_conceded, balls):
    """Return 'maiden' for a maiden over, otherwise 'runs conceded'."""
    if is_maiden(runs_conceded, balls) == True:
        return 'maiden'
    return 'runs conceded'`,
      fnName: 'is_boundary',
      tests: [
        { id: 'v1', call: 'is_boundary(6)', expect: 'True', label: 'a six', hidden: false },
        { id: 'v2', call: 'is_maiden(0, 6)', expect: 'True', label: 'maiden over', hidden: false },
        { id: 'v3', call: 'over_summary(4, 6)', expect: "'runs conceded'", label: 'four runs off the over', hidden: false },
        { id: 'h1', call: 'is_boundary(5)', expect: 'False', label: 'five runs from overthrows', hidden: true, tag: 'or_with_literal' },
        { id: 'h2', call: 'is_boundary(4)', expect: 'True', label: 'a four', hidden: true },
        { id: 'h3', call: 'is_boundary(0)', expect: 'False', label: 'dot ball', hidden: true, tag: 'or_with_literal' },
        { id: 'h4', call: 'is_maiden(0, 4)', expect: 'False', label: 'over not finished', hidden: true },
        { id: 'h5', call: 'over_summary(0, 6)', expect: "'maiden'", label: 'maiden summary', hidden: true },
      ],
      mustRemove: ['if_return_bool_literal', 'compare_to_true'],
      pattern: 'return-boolean-directly',
      concepts: ['return-boolean', 'helper-functions', 'refactor'],
      detects: ['compare_to_true', 'or_with_literal'],
      expectedSec: 240,
      hints: [
        '`runs == 4 or runs == 6` already works out to `True` or `False`. What does the `if` add?',
        'For each yes/no helper, replace the whole `if` block (and the `return False` after it) with `return` followed by the condition. In `over_summary`, the `if` can test the call on its own, because the call already gives `True` or `False`.',
        'The first helper becomes `return runs == 4 or runs == 6`. Write `is_maiden` in the same shape.',
      ],
      solution: {
        code: `def is_boundary(runs):
    """Return True if a single shot scored 4 or 6 runs."""
    return runs == 4 or runs == 6


def is_maiden(runs_conceded, balls):
    """Return True if a complete over (6 balls) conceded no runs."""
    return runs_conceded == 0 and balls == 6


def over_summary(runs_conceded, balls):
    """Return 'maiden' for a maiden over, otherwise 'runs conceded'."""
    if is_maiden(runs_conceded, balls):
        return 'maiden'
    return 'runs conceded'`,
        explanation: md(
          '1. A comparison such as `runs == 4 or runs == 6` is itself a bool, so `return` can send it back directly. The `if` that returned `True` or `False` repeated the condition in a longer form.',
          '2. `is_maiden` becomes `return runs_conceded == 0 and balls == 6` in the same way.',
          '3. `is_maiden(...)` already gives `True` or `False`, so `if is_maiden(runs_conceded, balls):` reads naturally. `== True` adds nothing.',
          '4. Keep both comparisons in full. `return runs == 4 or 6` is wrong: it groups as `(runs == 4) or 6`, and 6 counts as true, so it would say every shot is a boundary.',
        ),
      },
      selfExplain: 'Why does return runs == 4 or 6 make is_boundary(5) give back 6?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't04-s4-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Scorecard line',
      prompt: md(
        'Write three functions that build a scorecard line for a T20 innings. In cricket an over is 6 balls.',
        '',
        "1. `overs(balls)` returns a **string** in overs notation: complete overs, a dot, then the leftover balls. `overs(82)` returns `'13.4'` and `overs(120)` returns `'20.0'`.",
        '2. `run_rate(runs, balls)` returns the runs per over, `runs * 6 / balls`, rounded to 2 decimal places. If `balls` is 0, return `0.0`.',
        "3. `scorecard(runs, wickets, balls)` returns a string such as `'5/187 off 20.0 overs, run rate 9.35'`. Build it by calling `overs` and `run_rate`, and show the rate the way Python displays the returned number (a rate of 8.5 shows as `8.5`).",
        '',
        'Return every result; do not print.',
      ),
      fnName: 'scorecard',
      starter: `def overs(balls):
    """Return balls bowled in overs notation, for example 82 balls gives '13.4'."""
    pass


def run_rate(runs, balls):
    """Return runs per over rounded to 2 decimal places, or 0.0 if no balls were bowled."""
    pass


def scorecard(runs, wickets, balls):
    """Return a line such as '5/187 off 20.0 overs, run rate 9.35'."""
    pass`,
      tests: [
        { id: 'v1', call: 'overs(82)', expect: "'13.4'", label: '82 balls', hidden: false, tag: 'str_int_concat' },
        { id: 'v2', call: 'scorecard(187, 5, 120)', expect: "'5/187 off 20.0 overs, run rate 9.35'", label: 'full 20-over innings', hidden: false },
        { id: 'h1', call: 'overs(5)', expect: "'0.5'", label: 'less than one over', hidden: true },
        { id: 'h2', call: 'overs(120)', expect: "'20.0'", label: 'exactly 20 overs', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h3', call: 'run_rate(150, 105)', expect: '8.57', cmp: 'float', label: 'rate needs rounding', hidden: true },
        { id: 'h4', call: 'run_rate(0, 0)', expect: '0.0', cmp: 'float', label: 'no balls bowled', hidden: true, tag: 'zero_division' },
        { id: 'h5', call: 'scorecard(0, 0, 0)', expect: "'0/0 off 0.0 overs, run rate 0.0'", label: 'scorecard before the first ball', hidden: true },
        { id: 'h6', call: 'scorecard(96, 10, 77)', expect: "'10/96 off 12.5 overs, run rate 7.48'", label: 'all out part-way through an over', hidden: true },
      ],
      concepts: ['helper-functions', 'return-string', 'floor-division', 'modulo', 'f-strings'],
      detects: ['int_vs_float_division', 'zero_division', 'str_int_concat', 'print_vs_return'],
      expectedSec: 540,
      hints: [
        'Write and test the two helpers before `scorecard`. `//` and `%` split a number of balls into complete overs and leftover balls.',
        '`overs`: whole overs are `balls // 6` and leftover balls are `balls % 6`; turn both into text and join them with a dot. `run_rate`: return 0.0 straight away when `balls` is 0, otherwise round `runs * 6 / balls` to 2 places. `scorecard`: call both helpers and put their results into one string.',
        md(
          '```python',
          'def scorecard(runs, wickets, balls):',
          "    return f'{wickets}/{runs} off {overs(balls)} overs, run rate ...'",
          '```',
        ),
      ],
      solution: {
        code: `def overs(balls):
    """Return balls bowled in overs notation, for example 82 balls gives '13.4'."""
    return str(balls // 6) + '.' + str(balls % 6)


def run_rate(runs, balls):
    """Return runs per over rounded to 2 decimal places, or 0.0 if no balls were bowled."""
    if balls == 0:
        return 0.0
    return round(runs * 6 / balls, 2)


def scorecard(runs, wickets, balls):
    """Return a line such as '5/187 off 20.0 overs, run rate 9.35'."""
    return f'{wickets}/{runs} off {overs(balls)} overs, run rate {run_rate(runs, balls)}'`,
        explanation: md(
          '1. `overs`: `82 // 6` is 13 complete overs and `82 % 6` is 4 leftover balls. `str()` turns each int into text so `+` can join them with the dot. With `/` instead of `//`, 120 balls would give `20.0.0`.',
          '2. `run_rate` checks `balls == 0` first and returns `0.0`, so the division never runs with 0 balls (that would raise `ZeroDivisionError`). Otherwise it rounds once, at the end.',
          '3. `scorecard` calls both helpers inside one f-string. The returned rate 9.35 is displayed as `9.35` and 0.0 as `0.0`.',
          '4. For 187 runs, 5 wickets and 120 balls the result is `5/187 off 20.0 overs, run rate 9.35`.',
        ),
      },
      selfExplain: 'What would scorecard(0, 0, 0) do if run_rate had no check for balls being 0?',
    },
  ],
};

export default scenario;
