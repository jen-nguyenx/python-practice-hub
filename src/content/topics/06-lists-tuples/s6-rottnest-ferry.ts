import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s6',
  title: 'Rottnest Island ferry office',
  story:
    'The ferry office at B Shed keeps each sailing as a plain list: the morning manifest, the afternoon manifest, and the number of bikes ' +
    'hired on each day of the week. Names repeat, day trippers appear on both boats, and two days often tie for busiest. ' +
    'The office also types up the island rangers\' quokka survey, a count of the quokkas seen at each spotting point along the settlement trail.',
  questions: [
    // ------------------------------------------------------------------ q1 cloze (easy)
    {
      id: 't06-s6-q1',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Each passenger once',
      prompt:
        'The manifest lists a name once for every leg a passenger booked, so names repeat. ' +
        'Fill in the blanks so `unique_passengers(names)` returns a **new list** holding each name only the first time it appears, keeping that order. ' +
        'Return `[]` for an empty manifest, and do not change `names`.',
      concepts: ['in-membership', 'append', 'duplicates', 'list-copy'],
      detects: ['mutated_input', 'aliasing_copy', 'accumulator_init'],
      expectedSec: 115,
      template: `def unique_passengers(names):
    """Return a new list with each name kept only the first time it appears."""
    unique = ⟦1⟧
    for name in names:
        if ⟦2⟧:
            unique.append(name)
    return unique`,
      blanks: [
        { id: '1', accept: ['[]', 'list()'] },
        { id: '2', accept: ['name not in unique', 'not name in unique', 'not (name in unique)'] },
      ],
      fnName: 'unique_passengers',
      tests: [
        {
          id: 'v1',
          call: "unique_passengers(['Ana', 'Bo', 'Ana'])",
          expect: "['Ana', 'Bo']",
          label: 'one name booked twice',
          hidden: false,
        },
        {
          id: 'v2',
          call: "unique_passengers(['Ana', 'Bo'])",
          expect: "['Ana', 'Bo']",
          label: 'no repeats',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'unique_passengers([])',
          expect: '[]',
          label: 'empty manifest',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h2',
          call: "unique_passengers(['Ana', 'Ana', 'Ana'])",
          expect: "['Ana']",
          label: 'the same name three times',
          hidden: true,
        },
        {
          id: 'h3',
          call: "unique_passengers(['Zed', 'Ana', 'Zed', 'Bo', 'Ana'])",
          expect: "['Zed', 'Ana', 'Bo']",
          label: 'repeats spread through the list',
          hidden: true,
        },
        {
          id: 'h4',
          setup: "manifest = ['Kai', 'Ivy', 'Kai']",
          call: 'unique_passengers(manifest)',
          expect: "['Kai', 'Ivy']",
          argsUnchanged: ['manifest'],
          label: 'the manifest is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      hints: [
        'The answer list is also the record of which names have been seen already. Before adding a name, ask whether it is in there yet.',
        'Blank 1 is what the answer starts as, before any name has been added. Blank 2 is a condition that is True only for a name that has not been added yet.',
        '`x in some_list` is True when the list already holds that value. Put `not` in front of it to get the opposite.',
      ],
      solution: {
        code: `def unique_passengers(names):
    """Return a new list with each name kept only the first time it appears."""
    unique = []
    for name in names:
        if name not in unique:
            unique.append(name)
    return unique`,
        explanation:
          '`unique = []` creates a brand new list, once, before the loop. Starting from `names` instead would just be a second name for the manifest, and appending would then change the caller\'s list.\n\n' +
          '`name not in unique` searches the answer list for that name. It is False for a name already added, so only the first copy of each name gets through.\n\n' +
          '`unique.append(name)` is indented under the `if`, so it runs only for a name that is new.\n\n' +
          'Because the names are added in the order they are met, the answer keeps first-appearance order. `sorted(set(names))` would lose that order, and sets are not on this unit\'s list anyway.\n\n' +
          'An empty manifest needs no special case: the loop never runs and the empty `unique` is returned.',
      },
      selfExplain: 'What would the function return if the if line were removed entirely?',
    },

    // ------------------------------------------------------------------ q2 parsons (hard)
    {
      id: 't06-s6-q2',
      format: 'parsons',
      diff: 'hard',
      core: true,
      title: 'Day trippers on both sailings',
      prompt:
        'Build `on_both(morning, afternoon)`. It takes two passenger lists and returns a **new list** of the names that appear on both, ' +
        'in the order they appear in `morning`, with no name listed twice. Neither list may be changed.\n\n' +
        'Dictionaries and sets are not available yet, so match the names one pair at a time, with a loop inside a loop. ' +
        'Put the lines in order with the right indentation. Not every line is needed.',
      lines: [
        { text: 'def on_both(morning, afternoon):', indent: 0 },
        { text: 'both = []', indent: 1 },
        { text: 'for name in morning:', indent: 1 },
        { text: 'for other in afternoon:', indent: 2 },
        { text: 'if name == other and name not in both:', indent: 3 },
        { text: 'both.append(name)', indent: 4 },
        { text: 'return both', indent: 1 },
      ],
      distractors: [
        { text: 'both = morning', indent: 1, mistake: 'aliasing_copy' },
        { text: 'return both', indent: 4, mistake: 'early_return_in_loop' },
      ],
      indentMatters: true,
      fnName: 'on_both',
      tests: [
        {
          id: 'v1',
          call: "on_both(['Ana', 'Bo', 'Cy'], ['Cy', 'Bo'])",
          expect: "['Bo', 'Cy']",
          label: 'two day trippers, morning order',
          hidden: false,
        },
        {
          id: 'v2',
          call: "on_both(['Ana'], ['Bo'])",
          expect: '[]',
          label: 'nobody came back',
          hidden: false,
        },
        {
          id: 'h1',
          call: "on_both([], ['Bo'])",
          expect: '[]',
          label: 'empty morning manifest',
          hidden: true,
        },
        {
          id: 'h2',
          call: "on_both(['Bo', 'Bo', 'Ana'], ['Bo', 'Ana'])",
          expect: "['Bo', 'Ana']",
          label: 'a name booked twice in the morning',
          hidden: true,
        },
        {
          id: 'h3',
          call: "on_both(['Ana', 'Bo', 'Cy'], ['Cy', 'Ana'])",
          expect: "['Ana', 'Cy']",
          label: 'afternoon boat in a different order',
          hidden: true,
          tag: 'early_return_in_loop',
        },
        {
          id: 'h4',
          setup: "morning = ['Kai', 'Ivy']",
          call: "on_both(morning, ['Ivy'])",
          expect: "['Ivy']",
          argsUnchanged: ['morning'],
          label: 'the morning manifest is not changed',
          hidden: true,
          tag: 'aliasing_copy',
        },
      ],
      concepts: ['nested-loop', 'in-membership', 'append', 'duplicates'],
      detects: ['aliasing_copy', 'early_return_in_loop', 'mutated_input'],
      expectedSec: 420,
      hints: [
        'Two jobs at once. The outer loop fixes the order of the answer, the inner loop decides whether a name is on the other boat, and something has to stop the same name being added twice.',
        'Plan: start an empty answer list; walk `morning` so the answer comes out in morning order; for each morning name, walk `afternoon` looking for a match; when the names match, add the morning name, but only if it is not in the answer already; return the answer after both loops have finished.',
        'The condition is two tests joined by `and`: the names are equal, **and** the name is not in the answer yet. The `return` goes at the bottom, lined up with the outer `for`.',
      ],
      solution: {
        code: `def on_both(morning, afternoon):
    both = []
    for name in morning:
        for other in afternoon:
            if name == other and name not in both:
                both.append(name)
    return both`,
        explanation:
          '`both = []` builds a new list. `both = morning` would only give the morning manifest a second name, so `both.append(...)` would add passengers to the caller\'s list and the answer would come back holding everyone.\n\n' +
          'The outer loop goes through `morning`, so names are considered in morning order and the answer comes out in that order. Looping over `afternoon` on the outside would give the afternoon order instead.\n\n' +
          'The inner loop compares one morning name against every afternoon name. This pair-by-pair search is what you do before dictionaries and sets are available.\n\n' +
          '`name not in both` is the guard against duplicates. Without it, a passenger listed twice in the morning would be added twice, and so would a passenger listed twice in the afternoon.\n\n' +
          '`return both` sits after both loops, at the same level as the outer `for`. Putting a `return` inside the loops would hand back the answer as soon as the first match was found, which for the example gives an empty list instead of two names.\n\n' +
          '`name in afternoon` would do the inner loop\'s job in one line, and is worth knowing: `if name in afternoon and name not in both:` is the same function with one loop.',
      },
      selfExplain: 'Which test would still pass if the name not in both guard were dropped, and which would fail?',
    },

    // ------------------------------------------------------------------ q3 testWriter (medium)
    {
      id: 't06-s6-q3',
      format: 'testWriter',
      diff: 'medium',
      core: false,
      title: 'Break the second-busiest day',
      prompt:
        'Two versions of `second_busiest` were handed in for the bike-hire report. One is correct and one is secretly buggy. ' +
        'Enter an argument tuple that makes the two versions give different answers (or makes one crash). You cannot see the code, only the spec.',
      fnName: 'second_busiest',
      spec:
        '`second_busiest(counts)` takes a list of ints, the number of bikes hired on each day, and returns the **second largest distinct** count.\n\n' +
        '- Days with the same count are one value. `[55, 55, 40]` holds only two distinct counts, so the answer is `40`.\n' +
        '- Return `None` when there are fewer than two distinct counts.\n' +
        '- The order of `counts` does not matter.',
      reference: `def second_busiest(counts):
    unique = []
    for n in counts:
        if n not in unique:
            unique.append(n)
    unique.sort()
    if len(unique) < 2:
        return None
    return unique[-2]`,
      buggy: `def second_busiest(counts):
    ordered = sorted(counts)
    return ordered[-2]`,
      bugMistake: 'sort_tiebreak',
      argsExample: '([40, 55, 48],)',
      concepts: ['duplicates', 'sorted', 'ranking', 'edge-cases'],
      detects: ['sort_tiebreak', 'index_out_of_range'],
      expectedSec: 330,
      hints: [
        'Take the spec bullet by bullet and ask which bullet a quick, careless version would forget. A week of all-different counts checks almost nothing.',
        'The word doing the work is **distinct**. A version that just sorts the list and takes the second item from the end is right until two days share a count.',
        'Make the busiest day happen twice, as in `[55, 55, 40]`. A one-day list is worth trying too, for the `None` rule.',
      ],
      solution: {
        code: '([55, 55, 40],)',
        explanation:
          '`([55, 55, 40],)` exposes the bug. There are only two distinct counts, 55 and 40, so the second largest distinct count is `40`. The buggy version sorts the list into `[40, 55, 55]` and takes the second item from the end, which is the *other* 55, so it answers `55`.\n\n' +
          'Any list where the highest count is repeated does the same: `([9, 9],)` gives `None` from the correct version, because there is only one distinct value, and `9` from the buggy one.\n\n' +
          '`([30],)` breaks it differently. The correct version returns `None`, while the buggy version asks for the second item from the end of a one-item list and crashes with an IndexError.\n\n' +
          '`([40, 55, 48],)` and other all-different weeks agree in both versions, which is exactly why "it worked on my data" is not a test.\n\n' +
          'Whenever a spec says *distinct*, *different* or *unique*, your first test should repeat a value, and the value worth repeating is the one at the boundary: here, the largest.',
      },
      selfExplain: 'Which two lines would you add to the buggy version to make it match the reference?',
    },

    // ------------------------------------------------------------------ q4 write paper (hard)
    {
      id: 't06-s6-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-list',
      rules: ['noImport'],
      diff: 'hard',
      core: false,
      title: 'Busy and quiet spotting points (exam style)',
      prompt:
        '**Exam practice, 5 marks. No imports.** There is no Run button: write your answer as you would on paper, then submit it once.\n\n' +
        'The rangers hand in their quokka survey as a list of whole numbers, one count for each spotting point on the settlement trail. ' +
        'Write a function `split_by_average(counts)` that returns a **tuple of two lists**, `(busy, quiet)`:\n\n' +
        '- `busy` holds every count that is **greater than or equal to** the average, sorted from highest to lowest.\n' +
        '- `quiet` holds every count that is **below** the average, sorted from lowest to highest.\n\n' +
        'The average is `sum(counts) / len(counts)` and is not rounded. A count that appears more than once appears that many times in the answer. ' +
        'The list you are given must not be changed.\n\n' +
        'For example, `split_by_average([12, 4, 9, 4, 21])` has an average of 10.0, so it returns `([21, 12], [4, 4, 9])`. ' +
        'If `counts` is empty, return `([], [])`.',
      fnName: 'split_by_average',
      starter: `def split_by_average(counts):
    """Return (busy, quiet) for one quokka survey."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: 'split_by_average([12, 4, 9, 4, 21])',
          expect: '([21, 12], [4, 4, 9])',
          label: 'example from the question',
          hidden: false,
        },
        {
          id: 'v2',
          call: 'split_by_average([6, 2])',
          expect: '([6], [2])',
          label: 'two spotting points',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'split_by_average([])',
          expect: '([], [])',
          label: 'no spotting points surveyed',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h2',
          call: 'split_by_average([5])',
          expect: '([5], [])',
          label: 'one spotting point, equal to the average',
          hidden: true,
        },
        {
          id: 'h3',
          call: 'split_by_average([7, 7, 7])',
          expect: '([7, 7, 7], [])',
          label: 'every count the same',
          hidden: true,
        },
        {
          id: 'h4',
          call: 'split_by_average([0, 1, 4])',
          expect: '([4], [0, 1])',
          label: 'average is not a whole number',
          hidden: true,
          tag: 'int_vs_float_division',
        },
        {
          id: 'h5',
          setup: 'trail = [8, 2, 5]',
          call: 'split_by_average(trail)',
          expect: '([8, 5], [2])',
          argsUnchanged: ['trail'],
          label: 'the survey list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['average', 'sorted', 'tuple-return', 'list-build'],
      detects: ['zero_division', 'int_vs_float_division', 'mutated_input', 'none_from_inplace', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'No count can be placed until the average is known, so the survey is used twice: once to work out the average, and once to decide where each count goes. Notice what an empty survey would do to that division.',
        'Plan: deal with the empty survey first and return the pair of empty lists. Work out the average with `sum(counts) / len(counts)`. Start two empty lists. Walk the counts once, appending each one to `busy` if it is at least the average and to `quiet` otherwise. Sort the two lists in the two directions asked for, then return them as one tuple.',
        'The body of the loop looks like this, and `sorted(busy, reverse=True)` gives a new list from highest to lowest:\n\n```python\nfor count in counts:\n    if count >= average:\n        busy.append(count)\n    else:\n        ...\n```',
      ],
      solution: {
        code: `def split_by_average(counts):
    """Return (busy, quiet) for one quokka survey."""
    if len(counts) == 0:
        return ([], [])
    average = sum(counts) / len(counts)
    busy = []
    quiet = []
    for count in counts:
        if count >= average:
            busy.append(count)
        else:
            quiet.append(count)
    return (sorted(busy, reverse=True), sorted(quiet))`,
        explanation:
          'The empty survey is handled on the first two lines, because `sum(counts) / len(counts)` divides by 0 and raises a ZeroDivisionError when the list is empty.\n\n' +
          '`average = sum(counts) / len(counts)` is worked out once, before the loop, from the whole list. It has to be `/` and not `//`: for `[0, 1, 4]` the true average is 1.666..., while `//` would give 1 and wrongly move the count of 1 into `busy`.\n\n' +
          '`busy` and `quiet` start as two separate empty lists, so nothing is appended to the caller\'s survey.\n\n' +
          'The loop visits every count once. `count >= average` sends a count that is exactly equal to the average to `busy`, which is what "greater than or equal to" asks for; `>` there would put the single count of `[5]` in the wrong list. Because each count is appended as it is met, repeated counts stay in the answer.\n\n' +
          '`sorted(busy, reverse=True)` and `sorted(quiet)` build new sorted lists, high to low and low to high. `busy.sort(reverse=True)` on its own line works too, but `busy = busy.sort(reverse=True)` would store `None`, and `counts.sort()` would reorder the rangers\' list.\n\n' +
          'The return is one tuple holding the two lists, in the order `(busy, quiet)`. Returning a list of two lists is a different value and would be marked wrong.\n\n' +
          '**Marking guide (5):** empty survey returns `([], [])` before any division (1), average worked out once with `/` over the whole list (1), each count sent to the right list with counts equal to the average going to `busy` (1), `busy` sorted high to low and `quiet` low to high without changing `counts` (1), the two lists returned together as a tuple (1).',
      },
      selfExplain: 'Why can the average not be worked out inside the loop, one count at a time?',
    },
  ],
};

export default scenario;
