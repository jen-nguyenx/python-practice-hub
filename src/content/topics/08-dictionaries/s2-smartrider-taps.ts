import type { Scenario } from '../../schema.ts';

const s2: Scenario = {
  id: 't08-s2',
  title: 'SmartRider tap-ons',
  story:
    'A Transperth analyst has one morning of SmartRider data: a tap-on log of station names from different ticket readers, ' +
    'and a list of trips with the fare each card was charged. Dictionaries turn both into totals. ' +
    'A weekend of Rottnest ferry bookings lands on the same desk, and it needs the same treatment.',
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
    {
      id: 't08-s2-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 10,
      examSlot: 'dict-sort',
      diff: 'hard',
      core: false,
      title: 'The fullest sailing in each band',
      prompt:
        'Exam practice: write your answer as you would on paper, without running it. This question is worth 10 marks.\n\n' +
        'The Rottnest ferry operator sends over one weekend of bookings. `sailings` is a dictionary mapping a sailing code ' +
        "(a string such as `'RT0930'`) to the number of passengers booked on it (an int, 0 or more).\n\n" +
        'Band each sailing by its passenger count: **Full** for 400 and above, **Busy** for 250 to 399, **Steady** for 100 to 249, and **Quiet** below 100.\n\n' +
        'Write `fullest_sailings(sailings)` that returns a **dictionary** mapping each band to a **tuple** `(code, passengers)` for the fullest sailing in that band. ' +
        'If two sailings in the same band carry the same number of passengers, keep the one whose code comes first A to Z. ' +
        'Only bands that at least one sailing falls into appear as keys, so an empty dictionary gives `{}`. Do not change `sailings`.\n\n' +
        "Example: `fullest_sailings({'RT0930': 412, 'RT1130': 260, 'RT1400': 305})` returns `{'Full': ('RT0930', 412), 'Busy': ('RT1400', 305)}`.",
      fnName: 'fullest_sailings',
      starter: `def fullest_sailings(sailings):
    pass`,
      tests: [
        {
          id: 'v1',
          call: "fullest_sailings({'RT0930': 412, 'RT1130': 260, 'RT1400': 305})",
          expect: "{'Full': ('RT0930', 412), 'Busy': ('RT1400', 305)}",
          label: 'full and busy sailings',
          hidden: false,
        },
        {
          id: 'v2',
          call: "fullest_sailings({'RT0700': 45, 'RT0830': 180, 'RT1015': 96})",
          expect: "{'Quiet': ('RT1015', 96), 'Steady': ('RT0830', 180)}",
          label: 'two quiet sailings and one steady',
          hidden: false,
        },
        { id: 'h1', call: 'fullest_sailings({})', expect: '{}', label: 'no sailings', hidden: true },
        {
          id: 'h2',
          call: "fullest_sailings({'RT1600': 300, 'RT1200': 300, 'RT0800': 120})",
          expect: "{'Busy': ('RT1200', 300), 'Steady': ('RT0800', 120)}",
          label: 'two sailings level in the same band',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h3',
          call: "fullest_sailings({'RT1730': 400})",
          expect: "{'Full': ('RT1730', 400)}",
          label: 'one sailing, exactly on a boundary',
          hidden: true,
          tag: 'elif_vs_if',
        },
        {
          id: 'h4',
          call: "fullest_sailings({'RT0600': 0, 'RT0900': 99, 'RT1000': 100, 'RT1300': 249, 'RT1500': 250, 'RT1800': 399})",
          expect: "{'Quiet': ('RT0900', 99), 'Steady': ('RT1300', 249), 'Busy': ('RT1800', 399)}",
          label: 'sailings on every band boundary',
          hidden: true,
          tag: 'elif_vs_if',
        },
        {
          id: 'h5',
          setup: "sailings = {'RT1100': 260, 'RT1300': 260}",
          call: 'fullest_sailings(sailings)',
          expect: "{'Busy': ('RT1100', 260)}",
          argsUnchanged: ['sailings'],
          label: 'the sailings dictionary is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['banding', 'dict-items', 'max-per-key', 'tie-break', 'elif'],
      detects: ['elif_vs_if', 'sort_tiebreak', 'dict_keyerror', 'mutated_input'],
      expectedSec: 600,
      hints: [
        'Each sailing answers two questions in turn: which band am I in, and am I fuller than the best sailing recorded for that band so far?',
        'Plan: start with an empty dictionary. For each code and count, use an if/elif/else chain from Full down to Quiet to set `band`. If that band has no entry yet, store `(code, count)`. Otherwise compare with the tuple already stored and replace it when this sailing has more passengers, or the same number and a code earlier in the alphabet. Return the dictionary after the loop.',
        'Unpack what is stored with `best_code, best_count = fullest[band]`, then decide with `if count > best_count or (count == best_count and code < best_code):` before storing the new tuple.',
      ],
      solution: {
        code: `def fullest_sailings(sailings):
    fullest = {}
    for code, passengers in sailings.items():
        if passengers >= 400:
            band = 'Full'
        elif passengers >= 250:
            band = 'Busy'
        elif passengers >= 100:
            band = 'Steady'
        else:
            band = 'Quiet'
        if band not in fullest:
            fullest[band] = (code, passengers)
        else:
            best_code, best_passengers = fullest[band]
            if passengers > best_passengers or (passengers == best_passengers and code < best_code):
                fullest[band] = (code, passengers)
    return fullest`,
        explanation:
          'A marker would look for these steps (10 marks):\n\n' +
          '1. `fullest = {}` before the loop and `for code, passengers in sailings.items():` to get each code with its count (2 marks).\n' +
          '2. An `if`/`elif`/`else` chain working **down** from the highest band, with `>=` so that 400, 250 and 100 land in the higher band. Four separate `if`s would let 412 match Full, then Busy, then Steady, and the last match would win (3 marks).\n' +
          '3. `if band not in fullest:` then `fullest[band] = (code, passengers)`, so the first sailing in a band is always kept and a band nobody reaches never becomes a key. Reading `fullest[band]` without that check would raise `KeyError` (2 marks).\n' +
          '4. The comparison for every later sailing in the band: strictly more passengers wins, and an equal count only wins when the code is earlier in the alphabet, which is what `code < best_code` asks. Using `>=` alone would let a later equal sailing take the place unfairly (2 marks).\n' +
          '5. `return fullest` after the loop, with each value a two-part tuple rather than a bare code or a list (1 mark).\n\n' +
          'With an empty dictionary the loop never runs and `{}` is returned. Nothing is written back into `sailings`, so the caller\'s dictionary is unchanged.',
      },
      selfExplain: 'Which test would start failing if the tie-break used code > best_code instead?',
    },
  ],
};

export default s2;
