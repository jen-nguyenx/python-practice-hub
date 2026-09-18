import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s4',
  title: 'Perth Scorchers stats desk',
  story:
    'The stats desk for a Perth Scorchers fan site works with lists of `(player, number)` tuples: top scorers, a fantasy league table, ' +
    'and ball-by-ball logs from the WACA nets.',
  questions: [
    // ------------------------------------------------------------------ q1 refactor (medium)
    {
      id: 't06-s4-q1',
      format: 'refactor',
      diff: 'medium',
      core: false,
      title: 'Top scorer without the indexes',
      prompt:
        '`top_scorer(innings)` takes a non-empty list of `(batter, runs)` tuples and returns the tuple `(batter, runs)` for the highest score. On a tie, the batter listed first stays on top.\n\n' +
        'It works, but every line reaches back into the list with `innings[i][0]` and `innings[i][1]`. ' +
        'Rewrite the loop to go straight through the tuples with `for batter, runs in innings:`. Behaviour must not change.',
      code: `def top_scorer(innings):
    best_name = innings[0][0]
    best_runs = innings[0][1]
    for i in range(len(innings)):
        if innings[i][1] > best_runs:
            best_name = innings[i][0]
            best_runs = innings[i][1]
    return (best_name, best_runs)`,
      fnName: 'top_scorer',
      tests: [
        {
          id: 'v1',
          call: "top_scorer([('Okoro', 45), ('Hartley', 71), ('Ismail', 12)])",
          expect: "('Hartley', 71)",
          label: 'highest in the middle',
          hidden: false,
        },
        {
          id: 'v2',
          call: "top_scorer([('Delaney', 30)])",
          expect: "('Delaney', 30)",
          label: 'one batter',
          hidden: false,
        },
        {
          id: 'h1',
          call: "top_scorer([('Aziz', 50), ('Murray', 50)])",
          expect: "('Aziz', 50)",
          label: 'tie keeps the first batter',
          hidden: true,
        },
        {
          id: 'h2',
          call: "top_scorer([('Barker', 8), ('Wen', 0), ('Rossi', 33)])",
          expect: "('Rossi', 33)",
          label: 'highest score comes last',
          hidden: true,
          tag: 'early_return_in_loop',
        },
        {
          id: 'h3',
          call: "top_scorer([('Kemp', 0), ('Lowe', 0)])",
          expect: "('Kemp', 0)",
          label: 'everyone out for a duck',
          hidden: true,
          tag: 'accumulator_init',
        },
      ],
      mustRemove: ['range_len_index'],
      mustAdd: ['for_each'],
      pattern: 'for-each-loop',
      concepts: ['unpacking', 'list-of-tuples', 'for-each', 'tuple-return'],
      detects: ['early_return_in_loop', 'accumulator_init'],
      expectedSec: 240,
      hints: [
        'Each item in `innings` is already a `(batter, runs)` tuple. A `for` loop header can take that tuple apart for you, the same way `a, b = pair` does.',
        'Plan: keep the first two lines that start the best name and runs; change the loop header so it gives you `batter` and `runs`; replace every `innings[i][0]` with `batter` and every `innings[i][1]` with `runs`. Keep `>` so ties do not replace the leader.',
        '```python\nfor batter, runs in innings:\n    if runs > best_runs:\n        ...\n```',
      ],
      solution: {
        code: `def top_scorer(innings):
    best_name, best_runs = innings[0]
    for batter, runs in innings:
        if runs > best_runs:
            best_name = batter
            best_runs = runs
    return (best_name, best_runs)`,
        explanation:
          '`best_name, best_runs = innings[0]` unpacks the first tuple, which replaces two index lines with one.\n\n' +
          '`for batter, runs in innings:` walks the list item by item and unpacks each `(batter, runs)` tuple, so there is no `i` to manage.\n\n' +
          'The comparison stays `runs > best_runs`: using `>=` would let a later batter on the same score take over, which changes the tie rule.\n\n' +
          'The return is still a tuple in the same order. The loop checks the first batter against itself, which is harmless.',
      },
      selfExplain: 'When would you still need range(len(innings)) instead of looping over the tuples directly?',
    },

    // ------------------------------------------------------------------ q2 write (hard)
    {
      id: 't06-s4-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Fantasy league table with tie-breaks',
      prompt:
        'The site runs a fantasy league. Scores are a list of `(player, points)` tuples. ' +
        'Write `leaderboard(scores)` that returns a **new list** of the same tuples sorted by points from highest to lowest, with players on equal points in alphabetical order (A to Z). ' +
        'Do not change the list you are given.\n\n' +
        'For example, `leaderboard([(\'Tran\', 88), (\'Abbott\', 88), (\'Moss\', 95)])` returns `[(\'Moss\', 95), (\'Abbott\', 88), (\'Tran\', 88)]`.',
      fnName: 'leaderboard',
      starter: `def leaderboard(scores):
    """Return a new list sorted by points (high to low), then player name (A to Z)."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: "leaderboard([('Tran', 88), ('Abbott', 88), ('Moss', 95)])",
          expect: "[('Moss', 95), ('Abbott', 88), ('Tran', 88)]",
          label: 'example with a tie',
          hidden: false,
        },
        {
          id: 'v2',
          call: "leaderboard([('Kaur', 40), ('Diaz', 72)])",
          expect: "[('Diaz', 72), ('Kaur', 40)]",
          label: 'no ties',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'leaderboard([])',
          expect: '[]',
          label: 'empty league',
          hidden: true,
        },
        {
          id: 'h2',
          call: "leaderboard([('Ali', 50), ('Zed', 50), ('Mo', 50)])",
          expect: "[('Ali', 50), ('Mo', 50), ('Zed', 50)]",
          label: 'three-way tie',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h3',
          call: "leaderboard([('Yusuf', 0), ('Hart', -5), ('Gray', 0), ('Ng', 12)])",
          expect: "[('Ng', 12), ('Gray', 0), ('Yusuf', 0), ('Hart', -5)]",
          label: 'zero and negative points',
          hidden: true,
        },
        {
          id: 'h4',
          setup: "league = [('Olsen', 10), ('Bello', 30), ('Fitzgerald', 20)]",
          call: 'leaderboard(league)',
          expect: "[('Bello', 30), ('Fitzgerald', 20), ('Olsen', 10)]",
          argsUnchanged: ['league'],
          label: 'original list is not changed',
          hidden: true,
        },
      ],
      concepts: ['sort-key', 'tie-break', 'sorted', 'list-of-tuples'],
      detects: ['sort_tiebreak', 'mutated_input', 'none_from_inplace', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'There are two sort rules, and the second only matters when the first is equal. A sort key can return a tuple, and tuples are compared part by part.',
        'Plan: write a key that turns `(player, points)` into `(something for points, player)` so that bigger points come first but names still go A to Z; call `sorted` (not `.sort()`) with that key so the input is untouched; return the result.',
        'A negative number flips the order of points while names stay A to Z. The key function starts like this; the name goes in the second part:\n\n```python\ndef points_then_name(entry):\n    return (-entry[1], ...)\n```',
      ],
      solution: {
        code: `def points_then_name(entry):
    return (-entry[1], entry[0])


def leaderboard(scores):
    """Return a new list sorted by points (high to low), then player name (A to Z)."""
    return sorted(scores, key=points_then_name)`,
        explanation:
          '`points_then_name` turns each tuple into the value Python sorts by. For `(\'Tran\', 88)` it gives `(-88, \'Tran\')`.\n\n' +
          'Tuples compare their first parts first: -95 is smaller than -88, so 95 points comes before 88. Only when the points are equal does Python compare the second parts, the names, which go A to Z.\n\n' +
          '`sorted` builds and returns a new list, so `scores` is not changed; `scores.sort(...)` would reorder the caller\'s list and return `None`.\n\n' +
          'The same thing as a one-liner is `return sorted(scores, key=lambda entry: (-entry[1], entry[0]))`.\n\n' +
          'Using `key=lambda entry: entry[1], reverse=True` is not enough: tied players stay in their input order. And `reverse=True` with the key `(entry[1], entry[0])` puts tied names Z to A.',
      },
      selfExplain: 'Why would key=lambda e: (e[1], e[0]) with reverse=True fail the three-way tie test?',
    },

    // ------------------------------------------------------------------ q3 write paper (hard)
    {
      id: 't06-s4-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-list',
      rules: ['noImport'],
      diff: 'hard',
      core: false,
      title: 'Streaks in a bowling spell (exam style)',
      prompt:
        '**Exam practice, 5 marks. No imports.**\n\n' +
        'In the WACA nets a scorer records each ball as a string: `\'.\'` for a dot ball, `\'1\'`, `\'4\'` or `\'6\'` for runs, and `\'W\'` for a wicket. ' +
        'Write a function `streaks(balls)` that returns a list of `(outcome, count)` tuples, one for each streak of identical outcomes in a row, in the order they happened. ' +
        'Return an empty list if `balls` is empty.\n\n' +
        'For example, `streaks([\'.\', \'.\', \'4\', \'.\', \'1\', \'1\'])` returns `[(\'.\', 2), (\'4\', 1), (\'.\', 1), (\'1\', 2)]`. ' +
        'Outcomes that repeat later but not next to each other are separate streaks.',
      fnName: 'streaks',
      starter: `def streaks(balls):
    pass`,
      tests: [
        {
          id: 'v1',
          call: "streaks(['.', '.', '4', '.', '1', '1'])",
          expect: "[('.', 2), ('4', 1), ('.', 1), ('1', 2)]",
          label: 'example from the question',
          hidden: false,
        },
        {
          id: 'v2',
          call: "streaks(['W'])",
          expect: "[('W', 1)]",
          label: 'one ball',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'streaks([])',
          expect: '[]',
          label: 'no balls bowled',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h2',
          call: "streaks(['.', '.', '.', '.', '.', '.'])",
          expect: "[('.', 6)]",
          label: 'maiden over (one long streak)',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h3',
          call: "streaks(['1', '4', '1', '4'])",
          expect: "[('1', 1), ('4', 1), ('1', 1), ('4', 1)]",
          label: 'no two balls in a row the same',
          hidden: true,
        },
        {
          id: 'h4',
          call: "streaks(['6', '6', 'W'])",
          expect: "[('6', 2), ('W', 1)]",
          label: 'last streak has one ball',
          hidden: true,
          tag: 'off_by_one_range',
        },
      ],
      concepts: ['list-of-tuples', 'run-length', 'accumulator', 'tuple'],
      detects: ['index_out_of_range', 'off_by_one_range', 'return_type_wrong', 'accumulator_init'],
      expectedSec: 420,
      hints: [
        'Walk through the balls remembering two things: the outcome of the current streak and how long it is so far. Something must happen when the outcome changes, and once more when the balls run out.',
        'Plan: return `[]` straight away for an empty list. Start `current` at the first ball and `count` at 0. For each ball: if it matches `current`, add 1 to `count`; otherwise append `(current, count)`, then start a new streak with `current = ball` and `count = 1`. After the loop, append the final streak and return the list.',
        '```python\nfor ball in balls:\n    if ball == current:\n        count += 1\n    else:\n        result.append((current, count))\n        ...\n```',
      ],
      solution: {
        code: `def streaks(balls):
    result = []
    if len(balls) == 0:
        return result
    current = balls[0]
    count = 0
    for ball in balls:
        if ball == current:
            count += 1
        else:
            result.append((current, count))
            current = ball
            count = 1
    result.append((current, count))
    return result`,
        explanation:
          'Lines 3-4 handle the empty list first, because line 5 reads `balls[0]`, which would raise an IndexError on `[]`.\n\n' +
          '`current` holds the outcome of the streak in progress and `count` its length. `count` starts at 0 because the loop also visits the first ball and counts it.\n\n' +
          'When a ball matches `current`, the streak grows. When it differs, the finished streak is appended as a tuple `(current, count)` and a new streak starts at this ball with a count of 1.\n\n' +
          'A streak is only appended when the next streak starts, so the last streak is still waiting when the loop ends. Line 14 appends it; without that line a maiden over returns `[]`.\n\n' +
          'Marking guide (5): empty list handled (1), loop compares each ball with the current streak (1), a tuple is appended when the outcome changes (1), the new streak is started correctly (1), the final streak is appended after the loop (1).',
      },
      selfExplain: "If you forget the append after the loop, what does streaks(['W']) return, and why?",
    },
  ],
};

export default scenario;
