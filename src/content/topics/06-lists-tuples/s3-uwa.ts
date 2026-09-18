import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s3',
  title: 'Results week at UWA',
  story:
    'Results week on the Crawley campus: a unit coordinator ranks quiz marks, a tutor lists who passed, ' +
    'and Reid Library wants to know where two friends can still sit together.',
  questions: [
    // ------------------------------------------------------------------ q1 twins (easy)
    {
      id: 't06-s3-q1',
      format: 'twins',
      diff: 'easy',
      core: true,
      title: 'sort() or sorted()?',
      prompt:
        'Two versions of a script that puts CITS1401 quiz marks in order. They differ in one line. Do they print the same thing? Then predict both outputs.',
      left: `marks = [72, 58, 91]
ranked = sorted(marks)
print(ranked)
print(marks)`,
      right: `marks = [72, 58, 91]
ranked = marks.sort()
print(ranked)
print(marks)`,
      mistake: 'none_from_inplace',
      concepts: ['sort', 'sorted', 'none-return'],
      detects: ['none_from_inplace', 'mutated_input'],
      expectedSec: 100,
      hints: [
        'One of these gives back a new list; the other changes a list and gives back nothing useful.',
        '`sorted(marks)` returns a new sorted list and leaves `marks` alone. `marks.sort()` reorders `marks` itself and returns `None`.',
        'On the right, `ranked` holds whatever `marks.sort()` returned.',
      ],
      solution: {
        explanation:
          'Left: `sorted(marks)` builds a new list `[58, 72, 91]` and stores it in `ranked`; `marks` keeps its order. It prints `[58, 72, 91]` then `[72, 58, 91]`.\n\n' +
          'Right: `marks.sort()` sorts `marks` in place and returns `None`, so `ranked` is `None`. It prints `None` then `[58, 72, 91]`.\n\n' +
          'So they differ: the sorted list ends up under a different name, and the right-hand version has changed the original data.',
      },
      selfExplain: 'Which version would you use inside a function that must not change the list it was given, and why?',
    },

    // ------------------------------------------------------------------ q2 parsons (medium)
    {
      id: 't06-s3-q2',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Who passed, A to Z',
      prompt:
        'A tutor has results as a list of `(surname, mark)` tuples. Build `passing_students(results)`, which returns a **new list of surnames** of students with a mark of 50 or more, in alphabetical order. ' +
        'It must not change `results`. Put the lines in order with the right indentation. Not every line is needed.',
      lines: [
        { text: 'def passing_students(results):', indent: 0 },
        { text: 'names = []', indent: 1 },
        { text: 'for name, mark in results:', indent: 1 },
        { text: 'if mark >= 50:', indent: 2 },
        { text: 'names.append(name)', indent: 3 },
        { text: 'names.sort()', indent: 1 },
        { text: 'return names', indent: 1 },
      ],
      distractors: [
        { text: 'names = names.sort()', indent: 1, mistake: 'none_from_inplace' },
        { text: 'if mark > 50:', indent: 2, mistake: 'off_by_one_range' },
      ],
      indentMatters: true,
      fnName: 'passing_students',
      tests: [
        {
          id: 'v1',
          call: "passing_students([('Nguyen', 72), ('Adams', 45), ('Baker', 88)])",
          expect: "['Baker', 'Nguyen']",
          label: 'two passes out of order',
          hidden: false,
        },
        {
          id: 'v2',
          call: "passing_students([('Singh', 50), ('Lee', 49)])",
          expect: "['Singh']",
          label: 'mark of exactly 50',
          hidden: false,
          tag: 'off_by_one_range',
        },
        {
          id: 'h1',
          call: 'passing_students([])',
          expect: '[]',
          label: 'no results',
          hidden: true,
          tag: 'none_from_inplace',
        },
        {
          id: 'h2',
          call: "passing_students([('Zhou', 30), ('Ali', 12)])",
          expect: '[]',
          label: 'nobody passed',
          hidden: true,
        },
        {
          id: 'h3',
          call: "passing_students([('Wright', 91), ('Okafor', 64), ('Chen', 50)])",
          expect: "['Chen', 'Okafor', 'Wright']",
          label: 'reverse order with a 50',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h4',
          setup: "results = [('Patel', 77), ('Evans', 81), ('Moreau', 20)]",
          call: 'passing_students(results)',
          expect: "['Evans', 'Patel']",
          argsUnchanged: ['results'],
          label: 'results list is not changed',
          hidden: true,
        },
      ],
      concepts: ['list-of-tuples', 'unpacking', 'append', 'sort'],
      detects: ['none_from_inplace', 'off_by_one_range', 'mutated_input'],
      expectedSec: 200,
      hints: [
        'The result is a list you build yourself, so it must exist before the loop. Sorting comes after every name has been added.',
        'Plan: start an empty list; loop over the tuples, unpacking each into a name and a mark; if the mark is a pass, append the name; after the loop sort the list; return it.',
        'The loop header unpacks each tuple: `for name, mark in results:`. Remember that `sort()` returns `None`.',
      ],
      solution: {
        code: `def passing_students(results):
    names = []
    for name, mark in results:
        if mark >= 50:
            names.append(name)
    names.sort()
    return names`,
        explanation:
          '`names = []` creates the new list once, before the loop.\n\n' +
          '`for name, mark in results:` unpacks each `(surname, mark)` tuple into two names.\n\n' +
          '`if mark >= 50:` includes a mark of exactly 50, which is a pass (`> 50` would drop it).\n\n' +
          '`names.append(name)` is indented under the `if`, so only passing students are added.\n\n' +
          '`names.sort()` sits after the loop, at the same level as `return`, and sorts our own new list in place, so `results` is never changed.\n\n' +
          'Writing `names = names.sort()` would replace the list with `None`, because `sort()` returns `None`.',
      },
      selfExplain: 'Why is it safe to call names.sort() here, but not results.sort()?',
    },

    // ------------------------------------------------------------------ q3 write (hard)
    {
      id: 't06-s3-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Two free desks side by side',
      prompt:
        'Reid Library stores a floor plan of study desks as a list of rows. Each row is a list of strings: `\'.\'` is a free desk and `\'X\'` is taken. ' +
        'Rows can have different lengths.\n\n' +
        'Write `pair_desks(desks)` that returns a **list of `(row, col)` tuples**, one for every free desk whose right-hand neighbour in the same row is also free. ' +
        'List them row by row, left to right. Three free desks in a row give two pairs. Return `[]` if there are none. Do not change `desks`.\n\n' +
        'For example, `pair_desks([[\'.\', \'.\', \'X\'], [\'X\', \'.\', \'.\']])` returns `[(0, 0), (1, 1)]`.',
      fnName: 'pair_desks',
      starter: `def pair_desks(desks):
    """Return a list of (row, col) tuples for free desks with a free desk to their right."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: "pair_desks([['.', '.', 'X'], ['X', '.', '.']])",
          expect: '[(0, 0), (1, 1)]',
          label: 'example from the question',
          hidden: false,
        },
        {
          id: 'v2',
          call: "pair_desks([['.', '.', '.']])",
          expect: '[(0, 0), (0, 1)]',
          label: 'three free desks in a row',
          hidden: false,
        },
        {
          id: 'h1',
          call: "pair_desks([['X', 'X', '.', '.']])",
          expect: '[(0, 2)]',
          label: 'pair at the end of a row',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h2',
          call: 'pair_desks([])',
          expect: '[]',
          label: 'no rows',
          hidden: true,
        },
        {
          id: 'h3',
          call: "pair_desks([['.'], ['.'], []])",
          expect: '[]',
          label: 'rows with one desk or none',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h4',
          call: "pair_desks([['X', 'X'], ['.', '.', 'X', '.', '.'], ['.', 'X']])",
          expect: '[(1, 0), (1, 3)]',
          label: 'rows of different lengths',
          hidden: true,
        },
        {
          id: 'h5',
          setup: "floor = [['.', '.', '.'], ['.', 'X']]",
          call: 'pair_desks(floor)',
          expect: '[(0, 0), (0, 1)]',
          argsUnchanged: ['floor'],
          label: 'floor plan is not changed',
          hidden: true,
        },
      ],
      concepts: ['nested-list', 'nested-loop', 'indexing', 'tuple'],
      detects: ['index_out_of_range', 'off_by_one_range', 'mutated_input', 'return_type_wrong'],
      expectedSec: 600,
      hints: [
        'You need positions here, not just values, so loop over row numbers and column numbers. For each desk you look at it and the desk one place to the right. What is the last column where that neighbour still exists?',
        'Plan: start an empty result list; for each row number `r`, take `row = desks[r]`; for each column `c` from 0 up to but not including `len(row) - 1`, check that `row[c]` and `row[c + 1]` are both `\'.\'`; if so append the tuple `(r, c)`; return the list after both loops.',
        '```python\nfor r in range(len(desks)):\n    row = desks[r]\n    for c in range(len(row) - 1):\n        ...\n```',
      ],
      solution: {
        code: `def pair_desks(desks):
    """Return a list of (row, col) tuples for free desks with a free desk to their right."""
    pairs = []
    for r in range(len(desks)):
        row = desks[r]
        for c in range(len(row) - 1):
            if row[c] == '.' and row[c + 1] == '.':
                pairs.append((r, c))
    return pairs`,
        explanation:
          '`pairs = []` is the result list, created once before any loop.\n\n' +
          'The outer loop runs `r` over the row numbers, because the answer needs the row number, and `row = desks[r]` gives that row a short name.\n\n' +
          'The inner loop stops at `len(row) - 1`: the last desk has no right-hand neighbour, so checking it would read `row[c + 1]` past the end and raise an IndexError.\n\n' +
          'For a row of length 1 or 0 that range is empty, so short rows are handled without extra code, and each row uses its own length.\n\n' +
          'Both desks must be `\'.\'`, and the answer is appended as a tuple `(r, c)`, not a list.\n\n' +
          'Nothing is marked as taken, so overlapping pairs are all found and `desks` is left unchanged.',
      },
      selfExplain: 'Why does the inner loop use range(len(row) - 1) instead of range(len(row))?',
    },

    // ------------------------------------------------------------------ q4 write (hard)
    {
      id: 't06-s3-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Median mark for the unit report',
      prompt:
        'The unit coordinator reports the median quiz mark, because one or two very low marks drag the average down.\n\n' +
        'Write `median_and_above(marks)` that takes a list of marks (ints) and returns a **tuple** `(median, above)`:\n\n' +
        '- `median` is the middle mark once the marks are in order, rounded to 2 decimal places. With an even number of marks it is the mean of the two middle marks.\n' +
        '- `above` is an int: how many marks are **strictly greater** than that median.\n' +
        '- Return `None` if `marks` is empty.\n' +
        '- `marks` must still be in its original order after the call.\n\n' +
        'For example, `median_and_above([72, 58, 91])` returns `(72, 1)` and `median_and_above([72, 58, 91, 60])` returns `(66.0, 2)`.',
      fnName: 'median_and_above',
      starter: `def median_and_above(marks):
    """Return (median rounded to 2 dp, how many marks beat it), or None if marks is empty."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: 'median_and_above([72, 58, 91])',
          expect: '(72, 1)',
          label: 'three marks',
          hidden: false,
        },
        {
          id: 'v2',
          call: 'median_and_above([72, 58, 91, 60])',
          expect: '(66.0, 2)',
          cmp: 'float',
          label: 'four marks, median between two',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'median_and_above([])',
          expect: 'None',
          label: 'no marks',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h2',
          call: 'median_and_above([50])',
          expect: '(50, 0)',
          label: 'one mark',
          hidden: true,
        },
        {
          id: 'h3',
          call: 'median_and_above([70, 70, 70])',
          expect: '(70, 0)',
          label: 'every mark the same',
          hidden: true,
        },
        {
          id: 'h4',
          call: 'median_and_above([40, 45])',
          expect: '(42.5, 1)',
          cmp: 'float',
          label: 'two marks, median is a half',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h5',
          setup: 'quiz = [88, 45, 61, 61, 92]',
          call: 'median_and_above(quiz)',
          expect: '(61, 2)',
          argsUnchanged: ['quiz'],
          label: 'the coordinator\'s list is not reordered',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['sorted', 'median', 'tuple-return', 'round', 'integer-division'],
      detects: ['mutated_input', 'none_from_inplace', 'index_out_of_range', 'off_by_one_range', 'return_type_wrong'],
      expectedSec: 480,
      hints: [
        'Two jobs, in order: find the middle of a sorted copy, then count how many marks beat it. Sorting a copy is what keeps the caller\'s list in its original order.',
        'Plan: return `None` for an empty list first. Make `ordered = sorted(marks)` and let `middle = len(ordered) // 2`. If the length is odd, the median is `ordered[middle]`; if it is even, it is the mean of `ordered[middle - 1]` and `ordered[middle]`. Then loop over the marks counting the ones greater than the median, and return the tuple with the median rounded.',
        '```python\nordered = sorted(marks)\nmiddle = len(ordered) // 2\nif len(ordered) % 2 == 1:\n    median = ordered[middle]\nelse:\n    median = (ordered[middle - 1] + ordered[middle]) / 2\n```',
      ],
      solution: {
        code: `def median_and_above(marks):
    """Return (median rounded to 2 dp, how many marks beat it), or None if marks is empty."""
    if len(marks) == 0:
        return None
    ordered = sorted(marks)
    middle = len(ordered) // 2
    if len(ordered) % 2 == 1:
        median = ordered[middle]
    else:
        median = (ordered[middle - 1] + ordered[middle]) / 2
    above = 0
    for mark in marks:
        if mark > median:
            above += 1
    return (round(median, 2), above)`,
        explanation:
          'The empty list is handled first, before anything indexes into the list or divides by its length.\n\n' +
          '`sorted(marks)` returns a new sorted list, so the coordinator\'s list keeps its original order. `marks.sort()` would reorder their data, and `ordered = marks.sort()` would set `ordered` to `None`.\n\n' +
          '`middle = len(ordered) // 2` uses floor division, so it is a position, not a fraction. For 3 marks it is 1, the middle of 0, 1, 2. For 4 marks it is 2, the first of the two upper marks.\n\n' +
          'With an odd length, `ordered[middle]` is the median. With an even length, the two middle marks are at `middle - 1` and `middle`, and their mean is the median. `/` here is deliberate: `[40, 45]` has a median of 42.5, and `//` would report 42.\n\n' +
          '`above` counts the marks strictly greater than the median. Looping over `marks` or over `ordered` gives the same count, since both hold the same values.\n\n' +
          'The answer is a tuple built with round brackets, with the median rounded only at the end. `round` leaves a whole number as an int, so `(72, 1)` comes back for three marks, which is what the spec shows.',
      },
      selfExplain: 'Why is the median found with sorted(marks) rather than marks.sort()?',
    },
  ],
};

export default scenario;
