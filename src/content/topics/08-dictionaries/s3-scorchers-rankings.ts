import type { Scenario } from '../../schema.ts';

const s3: Scenario = {
  id: 't08-s3',
  title: 'Perth Scorchers rankings',
  story:
    "The Perth Scorchers' analyst keeps each batter's season runs and every match result in Python. " +
    'The coaches want ranked lists, and when two entries are level the order must be the same every time: A to Z by name.',
  questions: [
    {
      id: 't08-s3-q1',
      format: 'mcq',
      diff: 'medium',
      core: true,
      title: 'Sorting runs with a tie-break',
      prompt:
        "The coach wants `[('Mei', 405), ('Grace', 312), ('Tane', 312), ('Omar', 198)]`: runs from highest to lowest, " +
        'and batters on equal runs in A to Z order. Which line builds exactly that list from `runs`?',
      code: `runs = {'Tane': 312, 'Mei': 405, 'Grace': 312, 'Omar': 198}`,
      options: [
        {
          id: 'a',
          text: 'ranked = sorted(runs.items(), key=lambda pair: (-pair[1], pair[0]))',
          correct: true,
          why:
            'Correct. `items()` gives (name, runs) tuples. The key `(-pair[1], pair[0])` sorts by runs high to low (the minus sign flips the order of numbers) and then by name A to Z for equal runs.',
        },
        {
          id: 'b',
          text: 'ranked = sorted(runs.items(), key=lambda pair: pair[1], reverse=True)',
          mistake: 'sort_tiebreak',
          why:
            "This sorts by runs only. Tane and Grace both have 312, so they keep their dictionary order and Tane comes first: `[('Mei', 405), ('Tane', 312), ('Grace', 312), ('Omar', 198)]`.",
        },
        {
          id: 'c',
          text: 'ranked = sorted(runs.items(), key=lambda pair: (pair[1], pair[0]), reverse=True)',
          mistake: 'sort_tiebreak',
          why:
            '`reverse=True` reverses the whole key, names included, so equal runs come out Z to A and Tane is placed before Grace. Negate only the number instead.',
        },
        {
          id: 'd',
          text: 'ranked = sorted(runs, key=lambda name: (-runs[name], name))',
          mistake: 'return_type_wrong',
          why:
            "Looping over a dictionary gives its keys, so this returns only names in the right order: `['Mei', 'Grace', 'Tane', 'Omar']`. The coach asked for (name, runs) tuples.",
        },
      ],
      concepts: ['dict-items', 'sort-key', 'tie-break'],
      detects: ['sort_tiebreak', 'return_type_wrong'],
      expectedSec: 150,
      hints: [
        'Two things must be right: the shape of each element (a tuple, not just a name) and what happens to Tane and Grace, who are level on 312.',
        'A key that returns a tuple sorts by its first part, then by its second part when the first parts are equal. Think about what `reverse=True` does to the second part.',
        'Making the runs negative sorts them high to low while the names in the second part stay A to Z.',
      ],
      solution: {
        explanation:
          "`runs.items()` gives `('Tane', 312)`, `('Mei', 405)` and so on, so each element of the result is a tuple.\n\n" +
          'The key `(-pair[1], pair[0])` is compared part by part. `-405` is smallest, so Mei is first. Grace and Tane both have `-312`, so the names decide: Grace before Tane. Omar has `-198` and comes last.\n\n' +
          'Option b leaves ties in dictionary order, option c reverses the name order as well, and option d loses the runs because looping over a dictionary gives only keys.',
      },
      selfExplain: 'Why does option c put Tane before Grace even though it includes the name in the key?',
    },
    {
      id: 't08-s3-q2',
      format: 'parsons',
      diff: 'hard',
      core: true,
      title: 'Top batters',
      prompt:
        "Build `top_batters(runs, n)`. `runs` maps each batter's name to their season runs. " +
        'Return a **list of names** of the top `n` batters: most runs first, and batters on equal runs in A to Z order. ' +
        'If there are fewer than `n` batters, return all of them. Not every line is needed.',
      lines: [
        { text: 'def top_batters(runs, n):', indent: 0 },
        { text: 'pairs = list(runs.items())', indent: 1 },
        { text: 'pairs.sort(key=lambda pair: (-pair[1], pair[0]))', indent: 1 },
        { text: 'names = []', indent: 1 },
        { text: 'for name, total in pairs[:n]:', indent: 1 },
        { text: 'names.append(name)', indent: 2 },
        { text: 'return names', indent: 1 },
      ],
      distractors: [
        { text: 'pairs.sort(key=lambda pair: pair[1], reverse=True)', indent: 1, mistake: 'sort_tiebreak' },
        { text: 'for name in pairs[:n]:', indent: 1, mistake: 'return_type_wrong' },
      ],
      indentMatters: true,
      fnName: 'top_batters',
      tests: [
        { id: 'v1', call: "top_batters({'Priya': 410, 'Jess': 388, 'Amara': 295}, 2)", expect: "['Priya', 'Jess']", label: 'top 2 of 3', hidden: false, tag: 'return_type_wrong' },
        { id: 'v2', call: "top_batters({'Sofia': 120, 'Mei': 250, 'Kiri': 250}, 3)", expect: "['Kiri', 'Mei', 'Sofia']", label: 'two batters level', hidden: false, tag: 'sort_tiebreak' },
        { id: 'h1', call: "top_batters({'Lucy': 50}, 3)", expect: "['Lucy']", label: 'fewer batters than n', hidden: true },
        { id: 'h2', call: 'top_batters({}, 2)', expect: '[]', label: 'no batters', hidden: true },
        {
          id: 'h3',
          call: "top_batters({'Tane': 300, 'Hana': 300, 'Grace': 150, 'Aisha': 300}, 2)",
          expect: "['Aisha', 'Hana']",
          label: 'a tie across the cut-off',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h4',
          setup: "season = {'Omar': 90, 'Bella': 140}",
          call: 'top_batters(season, 1)',
          expect: "['Bella']",
          argsUnchanged: ['season'],
          label: 'the runs dictionary is not changed',
          hidden: true,
        },
      ],
      concepts: ['dict-items', 'sort-key', 'tie-break', 'slicing'],
      detects: ['sort_tiebreak', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'A dictionary cannot be sorted in place. Turn it into a list of (name, runs) tuples first, then sort that list.',
        'Plan: make the list of pairs, sort it by runs high to low then name A to Z, start an empty list of names, loop over only the first n pairs adding each name, and return the names after the loop.',
        'The loop header unpacks each tuple and slices off the top n: `for name, total in pairs[:n]:`',
      ],
      solution: {
        code: `def top_batters(runs, n):
    pairs = list(runs.items())
    pairs.sort(key=lambda pair: (-pair[1], pair[0]))
    names = []
    for name, total in pairs[:n]:
        names.append(name)
    return names`,
        explanation:
          '`list(runs.items())` makes a list of (name, runs) tuples that can be sorted.\n\n' +
          '`pairs.sort(key=lambda pair: (-pair[1], pair[0]))` sorts by runs high to low; for equal runs the name decides, A to Z. The distractor with `reverse=True` and only `pair[1]` leaves level batters in dictionary order.\n\n' +
          '`names = []` is set up once, before the loop.\n\n' +
          '`pairs[:n]` is the first n tuples, or all of them when there are fewer than n, so no index error is possible. Unpacking `name, total` keeps just the name; the distractor `for name in pairs[:n]:` would append whole tuples.\n\n' +
          '`return names` sits after the loop, at the same level as the `for`.',
      },
      selfExplain: 'Why is slicing with pairs[:n] safe when there are fewer than n batters, while pairs[n - 1] would not be?',
    },
    {
      id: 't08-s3-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Build the ladder',
      prompt:
        'Each match result is a tuple `(winner, loser)` of team names. There are no draws.\n\n' +
        'Write `ladder(results)` that returns a **list of tuples** `(team, wins)`, one for every team that played, sorted by wins from most to fewest, and teams on equal wins in A to Z order. ' +
        'A team that lost every match still appears, with 0 wins. An empty list of results gives `[]`.\n\n' +
        "Example: `ladder([('Scorchers', 'Sixers'), ('Heat', 'Scorchers'), ('Scorchers', 'Stars')])` returns `[('Scorchers', 2), ('Heat', 1), ('Sixers', 0), ('Stars', 0)]`.",
      fnName: 'ladder',
      starter: `def ladder(results):
    """Return a list of (team, wins) tuples: most wins first, then team name A to Z."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: "ladder([('Scorchers', 'Sixers'), ('Heat', 'Scorchers'), ('Scorchers', 'Stars')])",
          expect: "[('Scorchers', 2), ('Heat', 1), ('Sixers', 0), ('Stars', 0)]",
          label: 'three matches',
          hidden: false,
        },
        { id: 'v2', call: "ladder([('Thunder', 'Renegades')])", expect: "[('Thunder', 1), ('Renegades', 0)]", label: 'one match', hidden: false },
        { id: 'h1', call: 'ladder([])', expect: '[]', label: 'no matches', hidden: true },
        {
          id: 'h2',
          call: "ladder([('Strikers', 'Heat'), ('Hurricanes', 'Stars'), ('Heat', 'Stars')])",
          expect: "[('Heat', 1), ('Hurricanes', 1), ('Strikers', 1), ('Stars', 0)]",
          label: 'three teams level on wins',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h3',
          call: "ladder([('Stars', 'Heat'), ('Sixers', 'Stars'), ('Stars', 'Hurricanes')])",
          expect: "[('Stars', 2), ('Sixers', 1), ('Heat', 0), ('Hurricanes', 0)]",
          label: 'a team that wins, then loses, then wins again',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h4',
          call: "ladder([('Renegades', 'Thunder'), ('Hurricanes', 'Thunder'), ('Heat', 'Thunder')])",
          expect: "[('Heat', 1), ('Hurricanes', 1), ('Renegades', 1), ('Thunder', 0)]",
          label: 'a team that never wins',
          hidden: true,
          tag: 'sort_tiebreak',
        },
      ],
      concepts: ['counting', 'dict-items', 'sort-key', 'tie-break'],
      detects: ['sort_tiebreak', 'dict_keyerror', 'return_type_wrong', 'accumulator_init'],
      expectedSec: 540,
      hints: [
        'Split the job in two: first count wins for every team in a dictionary, then turn that dictionary into a sorted list.',
        'Plan: start with `wins = {}`. For each (winner, loser): add 1 to the winner using a default of 0, and give the loser a count of 0 only if it is not already a key. After the loop, make a list of `wins.items()`, sort it with a key that puts most wins first and then names A to Z, and return it.',
        'The loser line must not reset a team that already has wins: `if loser not in wins:` then `wins[loser] = 0`. The sort key is `lambda pair: (-pair[1], pair[0])`.',
      ],
      solution: {
        code: `def ladder(results):
    wins = {}
    for winner, loser in results:
        wins[winner] = wins.get(winner, 0) + 1
        if loser not in wins:
            wins[loser] = 0
    table = list(wins.items())
    table.sort(key=lambda pair: (-pair[1], pair[0]))
    return table`,
        explanation:
          '`wins = {}` maps each team to its number of wins so far.\n\n' +
          '`wins[winner] = wins.get(winner, 0) + 1` adds a win, starting from 0 for a team seen for the first time.\n\n' +
          '`if loser not in wins: wins[loser] = 0` makes sure a losing team is listed. The `if` matters: writing `wins[loser] = 0` every time would wipe out wins the team earned earlier.\n\n' +
          '`list(wins.items())` turns the dictionary into (team, wins) tuples, and the key `(-pair[1], pair[0])` sorts by wins high to low, then by name A to Z.\n\n' +
          'With no results the loop never runs, `wins` stays empty and the function returns `[]`.',
      },
      selfExplain: 'Which tests fail if the loser line is wins[loser] = 0 without the if, and why?',
    },
  ],
};

export default s3;
