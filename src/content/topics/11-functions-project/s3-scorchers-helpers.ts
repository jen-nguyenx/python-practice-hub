import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't11-s3',
  title: 'Perth Scorchers stats helpers',
  story: md(
    "The Perth Scorchers analyst, Priya, is rebuilding last season's stats scripts before the Big Bash starts at Optus Stadium.",
    'The old scripts kept their totals in global variables. The new ones pass data in, return results out, and give a safe answer for every input, so each helper can be tested on its own.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 refactor
    {
      id: 't11-s3-q1',
      format: 'refactor',
      diff: 'medium',
      core: false,
      title: 'Economy rate without globals',
      prompt: md(
        'This bowling script works, but both functions keep their totals in global variables, so the result of one call depends on what ran before it.',
        '',
        'Rewrite it with **no `global` statements** and no variables outside the functions:',
        '',
        '- `add_over(overs_bowled, runs_conceded, runs)` takes the totals so far and **returns** the new totals as a tuple `(overs_bowled, runs_conceded)`.',
        '- `economy_rate(overs)` keeps its totals in local variables and calls `add_over` for each over.',
        '',
        '`economy_rate` must return exactly what it returns now: runs conceded per over, rounded to 2 decimal places, or `0.0` for an empty list.',
      ),
      code: `overs_bowled = 0
runs_conceded = 0


def add_over(runs):
    global overs_bowled, runs_conceded
    overs_bowled = overs_bowled + 1
    runs_conceded = runs_conceded + runs


def economy_rate(overs):
    """Return runs conceded per over (2 dp) for a list of runs per over; 0.0 if empty."""
    global overs_bowled, runs_conceded
    overs_bowled = 0
    runs_conceded = 0
    for runs in overs:
        add_over(runs)
    if overs_bowled == 0:
        return 0.0
    return round(runs_conceded / overs_bowled, 2)`,
      fnName: 'economy_rate',
      tests: [
        { id: 'v1', call: 'economy_rate([6, 12, 4, 9])', expect: '7.75', cmp: 'float', label: 'four overs', hidden: false },
        { id: 'v2', call: 'economy_rate([])', expect: '0.0', cmp: 'float', label: 'did not bowl', hidden: false, tag: 'zero_division' },
        { id: 'h1', call: 'economy_rate([0, 0, 1])', expect: '0.33', cmp: 'float', label: 'rounded to 2 dp', hidden: true },
        { id: 'h2', setup: 'first = economy_rate([20, 20])', call: 'economy_rate([3])', expect: '3.0', cmp: 'float', label: 'second spell starts from zero', hidden: true, tag: 'global_state' },
        { id: 'h3', call: 'economy_rate([15])', expect: '15.0', cmp: 'float', label: 'one expensive over', hidden: true },
      ],
      mustRemove: ['global_stmt'],
      pattern: 'function-per-task',
      concepts: ['global-state', 'pass-in-return-out', 'tuple-return', 'refactor'],
      detects: ['global_state', 'scope_confusion'],
      expectedSec: 300,
      hints: [
        'Without `global`, a function can only get the current totals through its parameters, and can only hand new totals back with `return`.',
        'Plan: delete the two top-level variables and both `global` lines. Give `add_over` three parameters and make it return `(overs_bowled + 1, runs_conceded + runs)`. In `economy_rate`, start both totals at 0 as local variables, and inside the loop store what `add_over` returns back into them.',
        md(
          '```python',
          'for runs in overs:',
          '    overs_bowled, runs_conceded = add_over(overs_bowled, runs_conceded, runs)',
          '```',
        ),
      ],
      solution: {
        code: `def add_over(overs_bowled, runs_conceded, runs):
    """Return the totals (overs_bowled, runs_conceded) after one more over."""
    return (overs_bowled + 1, runs_conceded + runs)


def economy_rate(overs):
    """Return runs conceded per over (2 dp) for a list of runs per over; 0.0 if empty."""
    overs_bowled = 0
    runs_conceded = 0
    for runs in overs:
        overs_bowled, runs_conceded = add_over(overs_bowled, runs_conceded, runs)
    if overs_bowled == 0:
        return 0.0
    return round(runs_conceded / overs_bowled, 2)`,
        explanation: md(
          '1. The top-level `overs_bowled` and `runs_conceded` are gone, so no function can depend on leftovers from an earlier call.',
          '2. `add_over` now receives the totals as parameters and returns both new totals in one tuple. It changes nothing outside itself, so it can be tested with a single call such as `add_over(3, 20, 6)`, which gives `(4, 26)`.',
          '3. In `economy_rate` the totals are local and start at 0 on every call.',
          '4. `overs_bowled, runs_conceded = add_over(...)` unpacks the returned tuple into the two local totals, so the next over builds on them.',
          '5. The `0.0` guard and the single `round(..., 2)` at the end are unchanged, so every result matches the original.',
        ),
      },
      selfExplain: 'Why can add_over be tested on its own after the refactor but not before it?',
    },

    // ---------------------------------------------------------------- q2 write
    {
      id: 't11-s3-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Innings summary with a safe answer',
      prompt: md(
        'Write `innings_summary(scores, not_outs=0)` for a batter\'s season.',
        '',
        '- `scores` is a list of runs (ints), one per innings. `not_outs` is how many of those innings the batter finished not out.',
        '- Return a **tuple** `(total, highest, average)`: the total runs, the highest score, and the batting average `total / (innings - not_outs)` **rounded to 2 decimal places**.',
        '- If the batter was never dismissed (`innings - not_outs` is 0), the average is `None`. An empty list of scores gives `(0, None, None)`.',
        '- If `scores` is not a list, `not_outs` is not an int, or `not_outs` is negative or more than the number of innings, return `None`. Do not print anything.',
        '',
        'Example: `innings_summary([45, 12, 78], 1)` returns `(135, 78, 67.5)`.',
      ),
      fnName: 'innings_summary',
      starter: `def innings_summary(scores, not_outs=0):
    """Return (total, highest, average to 2 dp), or None for invalid arguments."""
    pass`,
      tests: [
        { id: 'v1', call: 'innings_summary([45, 12, 78])', expect: '(135, 78, 45.0)', cmp: 'float', label: 'out every innings', hidden: false },
        { id: 'v2', call: 'innings_summary([45, 12, 78], 1)', expect: '(135, 78, 67.5)', cmp: 'float', label: 'one not out', hidden: false },
        { id: 'h1', call: 'innings_summary([])', expect: '(0, None, None)', label: 'no innings yet', hidden: true },
        { id: 'h2', call: 'innings_summary([30, 22], not_outs=2)', expect: '(52, 30, None)', label: 'never dismissed', hidden: true, tag: 'zero_division' },
        { id: 'h3', call: 'innings_summary([0, 0, 5])', expect: '(5, 5, 1.67)', cmp: 'float', label: 'average rounded to 2 dp', hidden: true },
        { id: 'h4', call: 'innings_summary([12, 40], 3)', expect: 'None', label: 'more not outs than innings', hidden: true, tag: 'no_graceful_exit' },
        { id: 'h5', call: "innings_summary('45,12,78', 0)", expect: 'None', label: 'scores is not a list', hidden: true, tag: 'no_graceful_exit' },
        { id: 'h6', call: 'innings_summary([7, 19], -1)', expect: 'None', label: 'negative not outs', hidden: true },
        { id: 'h7', call: "innings_summary([3, 0], '1')", expect: 'None', label: 'not_outs is text', hidden: true, tag: 'type_error_other' },
        { id: 'h8', call: 'innings_summary([0])', expect: '(0, 0, 0.0)', cmp: 'float', label: 'a single duck', hidden: true },
      ],
      concepts: ['argument-checks', 'tuple-return', 'default-parameters', 'consistent-return-types'],
      detects: ['no_graceful_exit', 'zero_division', 'return_type_wrong', 'type_error_other', 'print_vs_return'],
      expectedSec: 540,
      hints: [
        'Deal with the bad arguments first, before any calculation. Every path through the function must end in a `return` of either `None` or a 3-item tuple.',
        'Plan: (1) if `scores` is not a list or `not_outs` is not an int, return None; (2) if `not_outs` is below 0 or above `len(scores)`, return None; (3) if the list is empty, return `(0, None, None)`; (4) loop once to find the total and highest; (5) work out the dismissals and return the tuple, using `None` for the average when there were none.',
        md(
          '```python',
          'if not isinstance(scores, list) or not isinstance(not_outs, int):',
          '    return None',
          'if not_outs < 0 or not_outs > len(scores):',
          '    return None',
          '```',
        ),
      ],
      solution: {
        code: `def innings_summary(scores, not_outs=0):
    """Return (total, highest, average to 2 dp), or None for invalid arguments."""
    if not isinstance(scores, list) or not isinstance(not_outs, int):
        return None
    if not_outs < 0 or not_outs > len(scores):
        return None
    if len(scores) == 0:
        return (0, None, None)
    total = 0
    highest = scores[0]
    for runs in scores:
        total = total + runs
        if runs > highest:
            highest = runs
    dismissals = len(scores) - not_outs
    if dismissals == 0:
        return (total, highest, None)
    return (total, highest, round(total / dismissals, 2))`,
        explanation: md(
          '1. The first two `if` statements are guard clauses: they check the arguments and return `None` straight away, so nothing below them can crash on a string or a bad count. The type check must come first, because `not_outs < 0` would raise `TypeError` for `\'1\'`.',
          '2. An empty list returns `(0, None, None)` before `scores[0]` is used, which would raise `IndexError`.',
          '3. One loop works out the total and the highest score. `highest` starts at the first score, not at an invented value.',
          '4. `dismissals` can be 0 when every innings was not out. Checking it before dividing avoids `ZeroDivisionError` and gives `None` for the average.',
          '5. Every path returns either `None` or a 3-item tuple, and the average is rounded once, as it goes into the result. That consistency is what an auto-marker relies on.',
        ),
      },
      selfExplain: 'Why must the isinstance checks come before the check not_outs > len(scores)?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't11-s3-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Adding an innings to the season',
      prompt: md(
        'Priya keeps a season as a dictionary mapping each player to a list of their scores, for example `{\'Turner\': [45, 12], \'Hardie\': [30]}`. She keeps old seasons to compare against, so they must never change.',
        '',
        'Write `record_innings(player, runs, season=None)` that returns a **new** season dictionary with `runs` added to the end of `player`\'s list. A player who is not in the season yet gets a new list.',
        '',
        '- If `season` is not given (it is `None`), start from an empty season.',
        '- Do **not** change the `season` passed in or any list inside it.',
        '- Every call without a season must start fresh.',
        '',
        "Example: `record_innings('Turner', 12, {'Turner': [45], 'Hardie': [30]})` returns `{'Turner': [45, 12], 'Hardie': [30]}`.",
      ),
      fnName: 'record_innings',
      starter: `def record_innings(player, runs, season=None):
    """Return a new season dictionary with runs added to player's list."""
    pass`,
      tests: [
        { id: 'v1', call: "record_innings('Turner', 45)", expect: "{'Turner': [45]}", label: 'first innings of a new season', hidden: false },
        { id: 'v2', call: "record_innings('Turner', 12, {'Turner': [45], 'Hardie': [30]})", expect: "{'Turner': [45, 12], 'Hardie': [30]}", label: 'existing player', hidden: false },
        {
          id: 'h1',
          setup: "first = record_innings('Bancroft', 60)",
          call: "record_innings('Inglis', 8)",
          expect: "{'Inglis': [8]}",
          label: 'second call without a season starts fresh',
          hidden: true,
          tag: 'mutable_default_arg',
        },
        {
          id: 'h2',
          setup: "season = {'Turner': [45]}",
          call: "record_innings('Short', 0, season)",
          expect: "{'Turner': [45], 'Short': [0]}",
          argsUnchanged: ['season'],
          label: 'new player, old season unchanged',
          hidden: true,
        },
        {
          id: 'h3',
          setup: "season = {'Turner': [45, 7], 'Agar': [21]}",
          call: "record_innings('Turner', 70, season)",
          expect: "{'Turner': [45, 7, 70], 'Agar': [21]}",
          argsUnchanged: ['season'],
          label: "existing player, old season's lists unchanged",
          hidden: true,
          tag: 'aliasing_copy',
        },
        { id: 'h4', call: "record_innings('Turner', 33, season=None)", expect: "{'Turner': [33]}", label: 'season passed as None', hidden: true },
        {
          id: 'h5',
          setup: 'empty = {}',
          call: "record_innings('Richardson', 0, empty)",
          expect: "{'Richardson': [0]}",
          argsUnchanged: ['empty'],
          label: 'empty season dictionary',
          hidden: true,
        },
      ],
      concepts: ['none-default', 'new-not-mutate', 'dict-of-lists', 'aliasing'],
      detects: ['mutable_default_arg', 'mutated_input', 'aliasing_copy', 'dict_keyerror'],
      expectedSec: 480,
      hints: [
        'Two separate traps: the default value, and the dictionary you are given. Changing a list that lives inside `season` changes the caller\'s season too, even if the outer dictionary is new.',
        'Plan: if `season` is None, use an empty dictionary. Build a new dictionary, and for each player copy their list with `list(...)`. Then, if `player` is not in the new dictionary, give them an empty list. Append `runs` to that player\'s list in the new dictionary and return it.',
        md(
          '```python',
          'new_season = {}',
          'for name in season:',
          '    new_season[name] = list(season[name])',
          '```',
        ),
      ],
      solution: {
        code: `def record_innings(player, runs, season=None):
    """Return a new season dictionary with runs added to player's list."""
    if season is None:
        season = {}
    new_season = {}
    for name in season:
        new_season[name] = list(season[name])
    if player not in new_season:
        new_season[player] = []
    new_season[player].append(runs)
    return new_season`,
        explanation: md(
          '1. `season=None` is the safe default. `if season is None: season = {}` creates a new empty dictionary inside each call, so calls never share data. A default of `season={}` would be created once and shared.',
          '2. `new_season = {}` is a separate dictionary, so adding a player never changes the caller\'s dictionary.',
          '3. `list(season[name])` copies each player\'s list. `dict(season)` alone would copy only the outer dictionary: both dictionaries would still hold the **same** list objects, and appending to one would change the old season (hidden test h3).',
          '4. A new player gets an empty list before the append, which avoids a `KeyError`.',
          '5. The function returns the new dictionary and changes nothing it was given.',
        ),
      },
      selfExplain: 'Why does dict(season) on its own still change the old season when an existing player scores?',
    },

    // ---------------------------------------------------------------- q4 testWriter
    {
      id: 't11-s3-q4',
      format: 'testWriter',
      diff: 'hard',
      core: false,
      title: 'Break the lowest-score helper',
      prompt: md(
        'Two versions of `lowest_score(scores)` were handed in for the season report. One follows the specification below exactly; the other is wrong for a whole family of inputs.',
        '',
        'Enter an argument tuple that makes the two versions return different values.',
      ),
      fnName: 'lowest_score',
      spec: md(
        '`lowest_score(scores)` takes a list of ints, one score per innings. Every score is 0 or more.',
        '',
        '- It returns the smallest score in the list.',
        '- It returns `None` when the list is empty.',
        '- It does not change the list it is given, and it prints nothing.',
      ),
      reference: `def lowest_score(scores):
    """Return the smallest score, or None for an empty list."""
    if len(scores) == 0:
        return None
    lowest = scores[0]
    for score in scores:
        if score < lowest:
            lowest = score
    return lowest`,
      buggy: `def lowest_score(scores):
    """Return the smallest score, or None for an empty list."""
    if len(scores) == 0:
        return None
    lowest = 0
    for score in scores:
        if score < lowest:
            lowest = score
    return lowest`,
      bugMistake: 'accumulator_init',
      argsExample: '([0, 45, 12],)',
      concepts: ['edge-cases', 'test-design', 'accumulator-init', 'minimum'],
      detects: ['accumulator_init', 'index_out_of_range', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'Both versions loop the same way and both handle the empty list. The difference is what the running answer starts at, so ask which starting value could survive to the end.',
        'One version starts from a score that is really in the list; the other starts from a number the batter may never have made. Think about which lists contain a score smaller than that starting number, and which do not.',
        'The empty list gives `None` from both versions, and a list that contains a duck gives the same answer from both. Try three innings where every score is above 0, such as 45, 12 and 78.',
      ],
      solution: {
        code: '([45, 12, 78],)',
        explanation: md(
          'The buggy version starts its running minimum at `lowest = 0` instead of at the first score, so it can only ever return 0 or something below 0. Because every score is 0 or more, 0 wins whenever the batter was never out for a duck.',
          '',
          'With `([45, 12, 78],)` the correct version returns `12` and the buggy version returns `0`.',
          '',
          'Inputs that do **not** expose it:',
          '',
          '- `([],)` returns `None` from both, because the guard runs before the starting value is chosen.',
          '- `([0, 45, 12],)` contains a duck, so 0 really is the smallest score and both versions agree. That is why it is safe as the example in the box.',
          '',
          'This is the accumulator-start mistake in its usual disguise. A running total may start at 0, because adding 0 changes nothing, but a running minimum or maximum must start at a value taken from the data, which is also why the empty list has to be dealt with first.',
        ),
      },
      selfExplain: 'If scores could be negative, would ([45, 12, 78],) still be the first input you would try?',
    },
  ],
};

export default scenario;
