import type { Scenario } from '../../schema.ts';

const s2: Scenario = {
  id: 't08-s2',
  title: 'SmartRider tap-ons',
  story:
    'A Transperth analyst has one morning of SmartRider data: a tap-on log of station names from different ticket readers, ' +
    'and a list of trips with the fare each card was charged. Dictionaries turn both into totals.',
  questions: [
    {
      id: 't08-s2-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Tap-ons per station',
      prompt: 'The analyst counts tap-ons at each station. Choose exactly what this program prints.',
      code: `taps = ['Perth', 'Claremont', 'perth', 'Perth', 'Claremont']
counts = {}
for stop in taps:
    counts[stop] = counts.get(stop, 0) + 1
print(counts['Perth'], counts.get('Subiaco', 0))
print(len(counts))`,
      choice: true,
      mutants: [
        {
          code: `taps = ['Perth', 'Claremont', 'Perth', 'Perth', 'Claremont']
counts = {}
for stop in taps:
    counts[stop] = counts.get(stop, 0) + 1
print(counts['Perth'], counts.get('Subiaco', 0))
print(len(counts))`,
          mistake: 'case_sensitive_compare',
        },
        {
          code: `taps = ['Perth', 'Claremont', 'perth', 'Perth', 'Claremont']
counts = {}
for stop in taps:
    counts[stop] = 1
print(counts['Perth'], counts.get('Subiaco', 0))
print(len(counts))`,
          mistake: 'accumulator_init',
        },
        {
          code: `taps = ['Perth', 'Claremont', 'perth', 'Perth', 'Claremont']
counts = {}
for stop in taps:
    counts[stop] = counts.get(stop, 0) + 1
print(counts['Perth'], counts.setdefault('Subiaco', 0))
print(len(counts))`,
          mistake: 'dict_keyerror',
        },
      ],
      concepts: ['dict-get', 'counting', 'dict-len'],
      detects: ['case_sensitive_compare', 'accumulator_init', 'dict_keyerror'],
      expectedSec: 90,
      hints: [
        "Is `'perth'` the same key as `'Perth'`?",
        'Walk through the list one stop at a time and keep a small table of keys and counts. Then ask: does `get` with a default add a key?',
        "After the loop the dictionary is `{'Perth': 2, 'Claremont': 2, ...}` with one more key still to add.",
      ],
      solution: {
        explanation:
          "The loop adds 1 to the count for each stop. Keys are exact strings, so `'perth'` is a different key from `'Perth'`.\n\n" +
          "After the loop `counts` is `{'Perth': 2, 'Claremont': 2, 'perth': 1}`.\n\n" +
          "Line 5 prints `counts['Perth']`, which is 2, and `counts.get('Subiaco', 0)`, which is the default 0. `get` does not add `'Subiaco'`.\n\n" +
          'Line 6 prints the number of keys: 3. The output is `2 0` and then `3`.',
      },
      selfExplain: 'How would you change line 4 so that Perth and perth are counted together?',
    },
    {
      id: 't08-s2-q2',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Dropping quiet stations',
      prompt:
        '`busy_stations(taps, min_taps)` counts tap-ons per **cleaned** station name (spaces stripped from both ends, all lower case) ' +
        'and should return a dictionary of only the stations with **at least** `min_taps` tap-ons.\n\n' +
        'Run the visible tests: it crashes whenever a station has to be dropped. Fix it by changing one line.',
      buggy: `def busy_stations(taps, min_taps):
    counts = {}
    for stop in taps:
        name = stop.strip().lower()
        counts[name] = counts.get(name, 0) + 1
    for name in counts:
        if counts[name] < min_taps:
            del counts[name]
    return counts`,
      bugMistake: 'mutate_while_iterating',
      maxChangedLines: 1,
      fnName: 'busy_stations',
      tests: [
        { id: 'v1', call: "busy_stations(['Perth', 'Claremont', 'perth', 'Subiaco', 'Perth '], 2)", expect: "{'perth': 3}", label: 'two quiet stations', hidden: false, tag: 'mutate_while_iterating' },
        { id: 'v2', call: "busy_stations(['Midland', 'midland', 'Armadale'], 2)", expect: "{'midland': 2}", label: 'exactly the minimum is kept', hidden: false, tag: 'mutate_while_iterating' },
        { id: 'h1', call: 'busy_stations([], 1)', expect: '{}', label: 'no taps', hidden: true },
        { id: 'h2', call: "busy_stations(['Joondalup', 'joondalup'], 1)", expect: "{'joondalup': 2}", label: 'no station needs dropping', hidden: true },
        { id: 'h3', call: "busy_stations(['Fremantle', 'Mandurah'], 5)", expect: '{}', label: 'every station is dropped', hidden: true, tag: 'mutate_while_iterating' },
        {
          id: 'h4',
          setup: "taps = ['Cottesloe', ' cottesloe', 'Bayswater']",
          call: 'busy_stations(taps, 2)',
          expect: "{'cottesloe': 2}",
          argsUnchanged: ['taps'],
          label: 'the list of taps is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['counting', 'dict-del', 'mutate-while-iterating'],
      detects: ['mutate_while_iterating', 'mutated_input'],
      expectedSec: 180,
      hints: [
        'Read the error message from a visible test. Which loop is running when the dictionary changes size?',
        'The second loop walks through `counts` while `del` removes keys from `counts`. Loop over something that does not change instead: a separate collection of the keys, made before the loop starts.',
        'Only the second `for` line needs to change. `list(counts)` is a new list of the keys.',
      ],
      solution: {
        code: `def busy_stations(taps, min_taps):
    counts = {}
    for stop in taps:
        name = stop.strip().lower()
        counts[name] = counts.get(name, 0) + 1
    for name in list(counts):
        if counts[name] < min_taps:
            del counts[name]
    return counts`,
        explanation:
          "The first loop is fine. It cleans each name, so `'Perth '` and `'perth'` both count towards `'perth'`, and `get` starts each new name at 0.\n\n" +
          'The second loop walks through `counts` and deletes keys from that same dictionary. Python does not allow a dictionary to change size while a loop is walking through it, so the next step of the loop raises `RuntimeError: dictionary changed size during iteration`.\n\n' +
          '`for name in list(counts):` makes a separate list of the keys before the loop starts. Deleting from `counts` no longer changes what the loop walks over, so every quiet station is removed.\n\n' +
          '`for name in counts.keys():` would still crash, because `keys()` is a live view of the same dictionary. Building a new dictionary of the busy stations also works, but changes more lines.\n\n' +
          'The hidden test where no station is dropped passed even before the fix, because nothing was deleted.',
      },
      selfExplain: 'Why is it fine to change counts[name] to a new value inside a loop over counts, but not to del counts[name]?',
    },
    {
      id: 't08-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Fare totals per card',
      prompt:
        'Each trip is a tuple `(card, fare)`: `card` is a string such as `\'0417\'` and `fare` is a float in dollars.\n\n' +
        'Write `fare_totals(trips)` that returns a **dictionary** mapping each card to the total fare it was charged, rounded to 2 decimal places. ' +
        'Only cards that made at least one trip appear, so an empty list gives `{}`. Do not change `trips`.\n\n' +
        "Example: `fare_totals([('0417', 3.4), ('0932', 5.1), ('0417', 3.4)])` returns `{'0417': 6.8, '0932': 5.1}`.",
      fnName: 'fare_totals',
      starter: `def fare_totals(trips):
    """Return a dict mapping each card to its total fare, rounded to 2 decimal places."""
    pass`,
      tests: [
        { id: 'v1', call: "fare_totals([('0417', 3.4), ('0932', 5.1), ('0417', 3.4)])", expect: "{'0417': 6.8, '0932': 5.1}", cmp: 'float', label: 'two cards', hidden: false, tag: 'accumulator_init' },
        { id: 'v2', call: "fare_totals([('1188', 2.2)])", expect: "{'1188': 2.2}", cmp: 'float', label: 'one trip', hidden: false },
        { id: 'h1', call: 'fare_totals([])', expect: '{}', label: 'no trips', hidden: true },
        {
          id: 'h2',
          call: "fare_totals([('2001', 5.1), ('3050', 3.4), ('2001', 5.1), ('3050', 1.25), ('2001', 1.1)])",
          expect: "{'2001': 11.3, '3050': 4.65}",
          cmp: 'float',
          label: 'trips for the same card spread through the list',
          hidden: true,
          tag: 'accumulator_init',
        },
        { id: 'h3', call: "fare_totals([('4100', 0.0), ('4100', 0.0)])", expect: "{'4100': 0.0}", cmp: 'float', label: 'free trips still count as a card', hidden: true },
        {
          id: 'h4',
          setup: "trips = [('0555', 3.4), ('0555', 5.1)]",
          call: 'fare_totals(trips)',
          expect: "{'0555': 8.5}",
          cmp: 'float',
          argsUnchanged: ['trips'],
          label: 'the trips list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['dict-get', 'grouping', 'tuple-unpacking', 'round'],
      detects: ['accumulator_init', 'dict_keyerror', 'return_type_wrong'],
      expectedSec: 300,
      hints: [
        'This is the counting pattern, but instead of adding 1 you add the fare.',
        'Plan: start with an empty dictionary. For each `(card, fare)` tuple, add the fare to that card\'s total, using 0 for a card seen for the first time. After the loop, round every total to 2 places and return the dictionary.',
        'Inside the loop: `totals[card] = totals.get(card, 0) + fare`',
      ],
      solution: {
        code: `def fare_totals(trips):
    totals = {}
    for card, fare in trips:
        totals[card] = totals.get(card, 0) + fare
    for card in totals:
        totals[card] = round(totals[card], 2)
    return totals`,
        explanation:
          '`totals = {}` is created once, before the loop, so each card\'s total builds up across all its trips.\n\n' +
          '`for card, fare in trips:` unpacks each tuple into its two parts.\n\n' +
          '`totals.get(card, 0) + fare` adds this fare to the total so far (0 for a new card) and stores it back under `card`.\n\n' +
          'The second loop rounds each total once, at the end. Changing the value stored under an existing key while looping is fine; only adding or removing keys is not.\n\n' +
          'An empty list skips both loops and returns `{}`.',
      },
      selfExplain: 'What would the result be for the first example if the loop body were totals[card] = fare?',
    },
  ],
};

export default s2;
