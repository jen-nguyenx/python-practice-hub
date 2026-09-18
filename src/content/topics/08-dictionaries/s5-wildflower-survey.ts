import type { Scenario } from '../../schema.ts';

const s5: Scenario = {
  id: 't08-s5',
  title: 'Kings Park wildflower survey',
  story:
    'Every spring, volunteers walk fixed routes through Kings Park and write down the wildflowers they see. ' +
    'The survey coordinator turns those notes into counts per species, a checklist of what nobody found, and a map from each species back to the areas it grows in.',
  questions: [
    {
      id: 't08-s5-q1',
      format: 'twins',
      diff: 'easy',
      core: true,
      title: 'The default that counts one too many',
      prompt:
        'Both programs count how many times each wildflower was logged on one walk. They differ by a single character. ' +
        'Work out what each one prints, and say which count is right.',
      left: `walk = ['kangaroo paw', 'banksia', 'kangaroo paw', 'grevillea', 'banksia', 'kangaroo paw']
counts = {}
for name in walk:
    counts[name] = counts.get(name, 0) + 1
print(counts)
print(counts['banksia'])`,
      right: `walk = ['kangaroo paw', 'banksia', 'kangaroo paw', 'grevillea', 'banksia', 'kangaroo paw']
counts = {}
for name in walk:
    counts[name] = counts.get(name, 1) + 1
print(counts)
print(counts['banksia'])`,
      mistake: 'accumulator_init',
      concepts: ['dict-get', 'counting', 'default-value'],
      detects: ['accumulator_init', 'dict_keyerror'],
      expectedSec: 110,
      hints: [
        'The second argument of `get` is only used when the key is missing, which is exactly the first time a species is seen.',
        'Work out what each version stores the very first time it meets `kangaroo paw`. The list has 3 kangaroo paws, 2 banksias and 1 grevillea.',
        'The first sighting of a species should leave a count of 1, not 2.',
      ],
      solution: {
        explanation:
          '`counts.get(name, 0)` is "the count so far, or 0 if this species has not been seen". Adding 1 stores 1 for the first sighting, 2 for the second, and so on.\n\n' +
          "The left version prints `{'kangaroo paw': 3, 'banksia': 2, 'grevillea': 1}` and then `2`. Those are the real counts.\n\n" +
          "The right version uses a default of 1, so the very first sighting already stores 2 and every count is one too high: `{'kangaroo paw': 4, 'banksia': 3, 'grevillea': 2}` and then `3`.\n\n" +
          'The default is the value to start from **before** this sighting is counted, so for counting it must be 0. (If you were adding fares or lengths instead of 1, the default would still be 0, because 0 is the total before anything is added.)\n\n' +
          'Both versions print the keys in the order the species were first seen, which is the order Python keeps for dictionaries.',
      },
      selfExplain: 'Which sighting of each species is the only one affected by the default value?',
    },
    {
      id: 't08-s5-q2',
      format: 'cloze',
      diff: 'easy',
      core: false,
      title: 'What nobody found',
      prompt:
        'The coordinator has a checklist of species the survey hoped to find, and a dictionary `seen` that maps a species name to how many times it was logged. ' +
        'Some checklist species are not in `seen` at all, and some are there with a count of 0 because a volunteer opened a row and logged nothing.\n\n' +
        'Fill in the blanks so `not_found(checklist, seen)` returns an **int**: how many checklist species were logged 0 times. ' +
        'It must not crash on a species that is missing from `seen`, and it must not add anything to `seen`.',
      template: `def not_found(checklist, seen):
    missing = 0
    for species in checklist:
        if seen.⟦1⟧(species, ⟦2⟧) == 0:
            missing = missing + 1
    return missing`,
      blanks: [
        { id: '1', accept: ['get'] },
        { id: '2', accept: ['0'] },
      ],
      fnName: 'not_found',
      tests: [
        { id: 'v1', call: "not_found(['banksia', 'zamia'], {'banksia': 3})", expect: '1', label: 'one species missing from seen', hidden: false, tag: 'dict_keyerror' },
        { id: 'v2', call: "not_found(['hakea'], {'hakea': 0})", expect: '1', label: 'a row opened but nothing logged', hidden: false },
        { id: 'h1', call: "not_found([], {'banksia': 2})", expect: '0', label: 'empty checklist', hidden: true },
        { id: 'h2', call: "not_found(['boronia', 'zamia'], {})", expect: '2', label: 'nothing logged at all', hidden: true, tag: 'dict_keyerror' },
        { id: 'h3', call: "not_found(['banksia'], {'banksia': 1, 'zamia': 4})", expect: '0', label: 'species in seen but not on the checklist are ignored', hidden: true },
        { id: 'h4', call: "not_found(['grevillea', 'grevillea'], {})", expect: '2', label: 'a species listed twice on the checklist', hidden: true },
      ],
      concepts: ['dict-get', 'default-value', 'counting', 'keyerror'],
      detects: ['dict_keyerror', 'accumulator_init'],
      expectedSec: 110,
      hints: [
        'Reading `seen[species]` for a species nobody logged raises `KeyError`. There is a dictionary method that reads a key and gives you a value of your choosing when the key is missing.',
        'Blank 1 is that method. Blank 2 is the number of sightings a species that never appears in `seen` should count as.',
        'The method is `get`, and the default has to make a missing species behave exactly like one recorded with no sightings.',
      ],
      solution: {
        code: `def not_found(checklist, seen):
    missing = 0
    for species in checklist:
        if seen.get(species, 0) == 0:
            missing = missing + 1
    return missing`,
        explanation:
          '- `missing = 0` is the count before anything is checked, set once before the loop.\n' +
          '- `for species in checklist:` walks the checklist, not the dictionary, because the answer is about species the survey was looking for.\n' +
          '- `seen.get(species, 0)` returns the number logged, or 0 when the species is not a key. `seen[species]` would raise `KeyError` on the first species nobody found.\n' +
          '- The default 0 makes "never in the dictionary" and "in the dictionary with a count of 0" give the same answer, which is what the question asks for.\n' +
          '- `get` only reads. It never adds `species` to `seen`, so the coordinator\'s data is untouched. `seen.setdefault(species, 0)` would return the same number but quietly add the key.\n' +
          '- An empty checklist runs zero passes and returns 0.',
      },
      selfExplain: 'What would change if the default were 1 instead of 0?',
    },
    {
      id: 't08-s5-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Which areas is each species in?',
      prompt:
        'The coordinator has `flagship`, a dictionary mapping each **area** of the park to the one species that area is known for, for example ' +
        "`{'Fraser Avenue': 'kangaroo paw', 'Law Walk': 'banksia'}`.\n\n" +
        'Build `areas_by_species(flagship)`, which turns it round: return a **dictionary** mapping each species to the **list of areas** it is the flagship of, ' +
        'with each list sorted A to Z. An empty dictionary gives `{}`. Not every line is needed.',
      lines: [
        { text: 'def areas_by_species(flagship):', indent: 0 },
        { text: 'areas = {}', indent: 1 },
        { text: 'for area in sorted(flagship):', indent: 1 },
        { text: 'species = flagship[area]', indent: 2 },
        { text: 'if species not in areas:', indent: 2 },
        { text: 'areas[species] = []', indent: 3 },
        { text: 'areas[species].append(area)', indent: 2 },
        { text: 'return areas', indent: 1 },
      ],
      distractors: [
        { text: 'for area in sorted(flagship.values()):', indent: 1, mistake: 'dict_keyerror' },
        { text: 'areas[species] = [area]', indent: 3, mistake: 'accumulator_init' },
      ],
      indentMatters: true,
      fnName: 'areas_by_species',
      tests: [
        {
          id: 'v1',
          call: "areas_by_species({'Lotterywest Family Area': 'banksia', 'Fraser Avenue': 'kangaroo paw', 'Law Walk': 'banksia'})",
          expect: "{'banksia': ['Law Walk', 'Lotterywest Family Area'], 'kangaroo paw': ['Fraser Avenue']}",
          label: 'two areas share a species',
          hidden: false,
          tag: 'accumulator_init',
        },
        {
          id: 'v2',
          call: "areas_by_species({'Botanic Garden': 'zamia'})",
          expect: "{'zamia': ['Botanic Garden']}",
          label: 'one area',
          hidden: false,
          tag: 'dict_keyerror',
        },
        { id: 'h1', call: 'areas_by_species({})', expect: '{}', label: 'no areas', hidden: true },
        {
          id: 'h2',
          call: "areas_by_species({'Zamia Cafe': 'grevillea', 'Anzac Bluff': 'grevillea', 'Mount Eliza': 'grevillea'})",
          expect: "{'grevillea': ['Anzac Bluff', 'Mount Eliza', 'Zamia Cafe']}",
          label: 'every area has the same species, listed A to Z',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h3',
          setup: "flagship = {'Synergy Parkland': 'hakea', 'State War Memorial': 'boronia'}",
          call: 'areas_by_species(flagship)',
          expect: "{'hakea': ['Synergy Parkland'], 'boronia': ['State War Memorial']}",
          argsUnchanged: ['flagship'],
          label: 'the flagship dictionary is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['dict-of-lists', 'grouping', 'dict-keys', 'sort'],
      detects: ['dict_keyerror', 'accumulator_init', 'mutated_input'],
      expectedSec: 300,
      hints: [
        'Every area adds itself to a list belonging to its species, so a species the loop meets for the first time needs an empty list created for it before anything can be appended. Think about the order you visit the areas in, and you get the sorting for free.',
        'Plan: start an empty result dictionary. Visit the area names in A to Z order and look up the species for each one. If that species has no list yet, give it an empty one, then append the area. Return the dictionary after the loop.',
        '`sorted(flagship)` gives the **keys** of the dictionary, sorted. Inside the loop, `flagship[area]` is the species for that area.',
      ],
      solution: {
        code: `def areas_by_species(flagship):
    areas = {}
    for area in sorted(flagship):
        species = flagship[area]
        if species not in areas:
            areas[species] = []
        areas[species].append(area)
    return areas`,
        explanation:
          '- `areas = {}` is a new dictionary, built alongside `flagship` rather than by changing it, so the coordinator\'s data is untouched.\n' +
          '- `sorted(flagship)` gives the **keys** — the area names — as a new list in A to Z order. Looping in that order means each species list is built in order, so nothing has to be sorted afterwards. ' +
          '`sorted(flagship.values())` would give species names instead, and `flagship[area]` would then raise `KeyError`.\n' +
          '- `species = flagship[area]` looks up the flagship species for the area currently being visited.\n' +
          '- `if species not in areas: areas[species] = []` creates the list the first time a species turns up. Without it, `areas[species].append(area)` would raise `KeyError`. ' +
          'Starting the list as `[area]` instead of `[]` is the classic slip: the append below then adds the same area a second time.\n' +
          '- `areas[species].append(area)` runs for every area, including the first, so it sits outside the `if`.\n' +
          '- With an empty `flagship` the loop never runs and `{}` is returned.\n\n' +
          'Looping over `flagship.items()` and sorting each list at the end works too, as long as you call `areas[species].sort()` on its own line: `areas[species] = areas[species].sort()` stores `None`.',
      },
      selfExplain: 'Why does visiting the areas in sorted order remove the need to sort each list at the end?',
    },
    {
      id: 't08-s5-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'The most common wildflower',
      prompt:
        'Write `most_common(sightings)`. `sightings` is a list of species names, one entry per sighting logged on a walk.\n\n' +
        'Return a **tuple** `(species, count, share)` for the species logged most often:\n\n' +
        '- `count` is an int, how many times that species was logged.\n' +
        '- `share` is that count as a percentage of all sightings, **rounded to 1 decimal place**.\n' +
        '- If two or more species are level on the top count, use the one that comes **first A to Z**.\n' +
        '- Return `None` for an empty list.\n\n' +
        "Example: `most_common(['banksia', 'kangaroo paw', 'banksia'])` returns `('banksia', 2, 66.7)`.",
      fnName: 'most_common',
      starter: `def most_common(sightings):
    """Return (species, count, share) for the most logged species, or None for an empty list."""
    pass`,
      tests: [
        { id: 'v1', call: "most_common(['banksia', 'kangaroo paw', 'banksia'])", expect: "('banksia', 2, 66.7)", cmp: 'float', label: 'one clear winner', hidden: false },
        { id: 'v2', call: "most_common(['zamia', 'banksia', 'zamia', 'banksia', 'hakea'])", expect: "('banksia', 2, 40.0)", cmp: 'float', label: 'two species level on 2', hidden: false, tag: 'sort_tiebreak' },
        { id: 'h1', call: 'most_common([])', expect: 'None', label: 'nothing logged', hidden: true, tag: 'return_type_wrong' },
        { id: 'h2', call: "most_common(['grevillea'])", expect: "('grevillea', 1, 100.0)", cmp: 'float', label: 'a single sighting', hidden: true, tag: 'accumulator_init' },
        { id: 'h3', call: "most_common(['zamia', 'hakea'])", expect: "('hakea', 1, 50.0)", cmp: 'float', label: 'a tie where the winner was logged second', hidden: true, tag: 'sort_tiebreak' },
        { id: 'h4', call: "most_common(['boronia', 'boronia'])", expect: "('boronia', 2, 100.0)", cmp: 'float', label: 'only one species logged', hidden: true },
        {
          id: 'h5',
          call: "most_common(['wattle', 'hakea', 'zamia', 'wattle', 'hakea', 'wattle', 'zamia'])",
          expect: "('wattle', 3, 42.9)",
          cmp: 'float',
          label: 'a share that has to be rounded',
          hidden: true,
          tag: 'round_mid_calc',
        },
        {
          id: 'h6',
          setup: "walk = ['banksia', 'hakea', 'banksia']",
          call: 'most_common(walk)',
          expect: "('banksia', 2, 66.7)",
          cmp: 'float',
          argsUnchanged: ['walk'],
          label: 'the sightings list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['counting', 'dict-get', 'max-by-value', 'tie-break', 'round'],
      detects: ['sort_tiebreak', 'accumulator_init', 'dict_keyerror', 'return_type_wrong', 'round_mid_calc', 'mutated_input'],
      expectedSec: 480,
      hints: [
        'Two jobs, in this order: count every species into a dictionary, then find the best key in that dictionary. Deal with the empty list before you divide by anything.',
        'Plan: build `counts` with `counts.get(name, 0) + 1`. Then keep `best` (a name, starting as `None`) and `best_count`. Loop over the counts: take this species if there is no best yet, or its count is higher, or its count is equal **and** its name is earlier A to Z. Finally, return `None` if there is no best, otherwise the tuple with the share rounded to 1 place.',
        'The tie-break condition is `counts[name] == best_count and name < best`. Strings compare A to Z with `<`. The share is `round(best_count / len(sightings) * 100, 1)`.',
      ],
      solution: {
        code: `def most_common(sightings):
    counts = {}
    for name in sightings:
        counts[name] = counts.get(name, 0) + 1
    best = None
    best_count = 0
    for name in counts:
        if best is None or counts[name] > best_count:
            best = name
            best_count = counts[name]
        elif counts[name] == best_count and name < best:
            best = name
    if best is None:
        return None
    share = round(best_count / len(sightings) * 100, 1)
    return (best, best_count, share)`,
        explanation:
          '- The first loop is the counting pattern: `counts.get(name, 0) + 1` starts a new species at 0 and adds this sighting, so no `KeyError` is possible.\n' +
          '- `best = None` and `best_count = 0` are set before the search. Starting `best` at `None` rather than at some species name means an empty list can be recognised afterwards, and it also makes the first species always win the first comparison.\n' +
          '- `counts[name] > best_count` takes a strictly better species. Using `>=` instead would let a later species steal the lead on an equal count, which breaks the A to Z rule.\n' +
          '- The `elif` is the tie-break: on an equal count the earlier name wins, because `<` on strings compares them alphabetically. This is why `[\'zamia\', \'hakea\']` gives `hakea` even though `zamia` was logged first.\n' +
          '- `if best is None: return None` runs before the division, so an empty list never divides by zero.\n' +
          '- The share is computed from the unrounded count and rounded once, at the end: 3 out of 7 is 42.857..., which rounds to 42.9.\n' +
          '- The function only reads `sightings`, so the caller\'s list is unchanged.\n\n' +
          'Sorting `counts.items()` with the key `(-pair[1], pair[0])` and taking the first pair is another correct way to do it.',
      },
      selfExplain: 'Why does the search start with best set to None instead of the first species in the list?',
    },
  ],
};

export default s5;
