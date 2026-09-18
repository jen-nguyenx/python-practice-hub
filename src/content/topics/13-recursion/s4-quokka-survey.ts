import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s4',
  title: 'Quokka tally sheets',
  story:
    'Volunteers on Wadjemup (Rottnest Island) count quokkas at each bay. The survey sheets nest: a bay holds transects, a transect holds sightings, ' +
    'and some sections are empty. Nobody knows in advance how deep the nesting goes, which is exactly the kind of data recursion handles and loops alone do not.',
  questions: [
    {
      id: 't13-s4-q1',
      format: 'trace',
      diff: 'hard',
      core: false,
      title: 'Adding up a nested survey',
      prompt:
        '`count_quokkas(survey)` adds up every sighting in a nested survey list.\n\n' +
        'Fill in `first`, `rest` and `total` each time line 9 finishes running. Line 9 only runs after both recursive calls in that call have come back, ' +
        'so the rows come in the order the calls **finish**, not the order they start. Calls on an empty list return at line 3 and add no row.',
      code: `def count_quokkas(survey):
    if survey == []:
        return 0
    if isinstance(survey[0], list):
        first = count_quokkas(survey[0])
    else:
        first = survey[0]
    rest = count_quokkas(survey[1:])
    total = first + rest
    return total

print(count_quokkas([3, [2, 5], 1]))`,
      watch: ['first', 'rest', 'total'],
      anchorLine: 9,
      concepts: ['nested-list', 'call-stack', 'isinstance'],
      detects: ['scope_confusion', 'recursion_result_ignored'],
      expectedSec: 420,
      hints: [
        'Draw the calls as a tree before filling in anything. Which call is the first one to get all the way to line 9?',
        '`[3, [2, 5], 1]` calls `[[2, 5], 1]` for its rest. That call sees a list first, so it calls `[2, 5]`, which calls `[5]`, which calls `[]`. The call on `[5]` finishes first, then `[2, 5]`. Only then does `[[2, 5], 1]` go on to its rest, `[1]`.',
        'Row 1 is the call on `[5]`: first 5, rest 0, total 5. Row 2 is the call on `[2, 5]`: first 2, rest 5, total 7. Row 3 is the call on `[1]`.',
      ],
      solution: {
        explanation:
          'Each non-empty call adds one row when it reaches line 9, and each call has its own `first`, `rest` and `total`.\n\n' +
          '1. `[5]`: `first` is 5, its rest `[]` gives 0, `total` 5.\n' +
          '2. `[2, 5]`: `first` is 2, its rest `[5]` gave 5, `total` 7.\n' +
          '3. `[1]`: `first` is 1, rest 0, `total` 1. This call is the rest of `[[2, 5], 1]`, and it only starts once `[2, 5]` has finished.\n' +
          '4. `[[2, 5], 1]`: its first item is a list, so `first` is the 7 returned by row 2; `rest` is the 1 from row 3; `total` 8.\n' +
          '5. `[3, [2, 5], 1]`: `first` 3, `rest` 8, `total` 11.\n\n' +
          'The outermost call started first but finishes last, because it was waiting for all the others. The program prints `11`.',
      },
      selfExplain: 'Which call produces the last row, and why is it last even though it started first?',
    },
    {
      id: 't13-s4-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Flatten the survey sheet',
      prompt:
        'The island rangers want every sighting count in one plain list for their spreadsheet.\n\n' +
        'Write `flatten(survey)` that returns a **new flat list** of every count in `survey`, in the order they appear. ' +
        '`survey` is a list whose items are ints or lists, nested to any depth, and any list may be empty. Do not change `survey`.\n\n' +
        '**Recursion must be used and loops are not allowed.**\n\n' +
        'Example: `flatten([3, [2, [5]], [], 1])` returns `[3, 2, 5, 1]`.',
      fnName: 'flatten',
      starter: `def flatten(survey):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: 'flatten([3, [2, [5]], [], 1])', expect: '[3, 2, 5, 1]', label: 'nested sheet', hidden: false },
        { id: 'v2', call: 'flatten([4, 0, 7])', expect: '[4, 0, 7]', label: 'no nesting', hidden: false },
        { id: 'h1', call: 'flatten([])', expect: '[]', label: 'empty sheet', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: 'flatten([[], [[]]])', expect: '[]', label: 'only empty sections', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: 'flatten([[[[9]]], 8])', expect: '[9, 8]', label: 'deep nesting first', hidden: true, tag: 'return_type_wrong' },
        { id: 'h4', call: 'flatten([[1, 2], [3, [4, 5]], 6])', expect: '[1, 2, 3, 4, 5, 6]', label: 'several nested sections', hidden: true, tag: 'return_type_wrong' },
        {
          id: 'h5',
          setup: 'survey = [1, [2, 3], [[4]]]',
          call: 'flatten(survey)',
          expect: '[1, 2, 3, 4]',
          argsUnchanged: ['survey'],
          label: 'the survey list is not changed',
          hidden: true,
        },
      ],
      concepts: ['nested-list', 'isinstance', 'list-building', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'return_type_wrong', 'mutated_input', 'loop_in_recursion'],
      expectedSec: 540,
      hints: [
        'Deal with the first item yourself and let a recursive call deal with the rest of the list, `survey[1:]`. The first item might itself be a list.',
        'Plan: an empty list flattens to `[]`. If the first item is a list, flatten it too. If it is a number, wrap it in a list of its own, `[first]`. Join that to the flattened rest with `+` and return it.',
        '```python\nfirst = survey[0]\nif isinstance(first, list):\n    front = flatten(first)\n```\n\nWhat should `front` be when `first` is a number, and how is it joined to the rest?',
      ],
      solution: {
        code: `def flatten(survey):
    if survey == []:
        return []
    first = survey[0]
    if isinstance(first, list):
        front = flatten(first)
    else:
        front = [first]
    return front + flatten(survey[1:])`,
        explanation:
          '- `if survey == []: return []` is the base case. An empty section adds nothing, and the return type is still a list.\n' +
          '- `first = survey[0]` is the only item this call handles itself.\n' +
          '- If `first` is a list, `flatten(first)` turns it into a flat list, however deep it goes.\n' +
          '- If `first` is a number, `[first]` makes it a one-item list. `3 + [2, 5]` would raise TypeError, but `[3] + [2, 5]` is `[3, 2, 5]`.\n' +
          '- `return front + flatten(survey[1:])` joins this item\'s part to the flattened rest and hands it back. `survey[1:]` is a new, shorter list, so the original `survey` is never changed.\n\n' +
          'For `[3, [2, [5]], [], 1]`: `[3]` + (`[2, 5]` + (`[]` + (`[1]` + `[]`))) = `[3, 2, 5, 1]`.',
      },
      selfExplain: 'Why does a number need to be wrapped as [first] before it is joined to the rest?',
    },
    {
      id: 't13-s4-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 20,
      examSlot: 'recursion-nested',
      diff: 'hard',
      core: false,
      title: 'Extract the names (exam style)',
      prompt:
        '*Exam style, 20 marks. Write it by hand first, then submit once.*\n\n' +
        'The survey sheets also record bay names and volunteer names, mixed in with counts and GPS readings. ' +
        'Write a function `extract_strings(data)` that returns a **list** of all the strings in `data`, in the order they appear.\n\n' +
        '`data` is a list or a tuple. Its items can be strings, ints, floats, lists or tuples, and lists and tuples can be nested to any depth.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions).\n\n' +
        '- Return a list, even when `data` is a tuple.\n' +
        '- Return `[]` when there are no strings.\n' +
        '- Do not change `data`.\n\n' +
        "Example: `extract_strings(['Thomson Bay', 14, ('Aisha', 2.5, ['Tom']), []])` returns `['Thomson Bay', 'Aisha', 'Tom']`.",
      fnName: 'extract_strings',
      starter: `def extract_strings(data):
    pass`,
      rules: ['noLoops'],
      tests: [
        {
          id: 'v1',
          call: "extract_strings(['Thomson Bay', 14, ('Aisha', 2.5, ['Tom']), []])",
          expect: "['Thomson Bay', 'Aisha', 'Tom']",
          label: 'the example',
          hidden: false,
        },
        { id: 'v2', call: "extract_strings(('Geordie Bay', 9))", expect: "['Geordie Bay']", label: 'a tuple gives a list', hidden: false },
        { id: 'h1', call: 'extract_strings([])', expect: '[]', label: 'empty list', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: 'extract_strings(())', expect: '[]', label: 'empty tuple', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: 'extract_strings([1, 2.5, (3, [4])])', expect: '[]', label: 'no strings at all', hidden: true },
        {
          id: 'h4',
          call: "extract_strings([[['Parker Point']], ('Salmon Bay', ('Mei', 'Jonah'))])",
          expect: "['Parker Point', 'Salmon Bay', 'Mei', 'Jonah']",
          label: 'strings deep inside lists and tuples',
          hidden: true,
        },
        { id: 'h5', call: "extract_strings(['', 'Wadjemup'])", expect: "['', 'Wadjemup']", label: 'an empty string is still a string', hidden: true },
        {
          id: 'h6',
          setup: "data = ['Kingstown', [5, 'Longreach Bay'], ('Olga', 31.99)]",
          call: 'extract_strings(data)',
          expect: "['Kingstown', 'Longreach Bay', 'Olga']",
          argsUnchanged: ['data'],
          label: 'the data is not changed',
          hidden: true,
        },
      ],
      concepts: ['nested-list', 'isinstance', 'tuples', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion', 'return_type_wrong', 'mutated_input', 'index_out_of_range'],
      expectedSec: 780,
      hints: [
        'Use the same first-item-and-the-rest shape as `flatten`, but now the first item can be one of three kinds: a string, a list or tuple, or anything else.',
        'Plan: if `data` is empty (length 0, which covers both `[]` and `()`), return `[]`. Look at `data[0]`: a string becomes `[data[0]]`; a list or tuple is handled by a recursive call; anything else contributes `[]`. Join that to `extract_strings(data[1:])` and return it.',
        'Test the first item with `isinstance(first, str)` and `isinstance(first, (list, tuple))`. The last line is `return found + extract_strings(data[1:])`.',
      ],
      solution: {
        code: `def extract_strings(data):
    if len(data) == 0:
        return []
    first = data[0]
    if isinstance(first, str):
        found = [first]
    elif isinstance(first, (list, tuple)):
        found = extract_strings(first)
    else:
        found = []
    return found + extract_strings(data[1:])`,
        explanation:
          '- `if len(data) == 0: return []` is the base case. `data == []` is not enough: an empty tuple `()` is not equal to `[]`, so it would skip the base case and `data[0]` would raise IndexError.\n' +
          '- `first = data[0]` is the one item this call deals with.\n' +
          '- A string is kept as a one-item list, `[first]`.\n' +
          '- A list or tuple can hold more strings at any depth, so it gets its own recursive call, which returns a list.\n' +
          '- Ints and floats contribute `[]`.\n' +
          '- `data[1:]` is the rest (a tuple slice is a tuple, a list slice is a list), and the recursive call on it always returns a list. `found` is always a list too, so `found + ...` joins two lists and the result is a list even when `data` was a tuple.\n' +
          '- Slicing makes new sequences, so `data` is never changed, and there are no loops.\n\n' +
          'Marking guide (20): base case for an empty list or tuple (4), string item kept as a one-item list (3), nested list or tuple handled by a recursive call (5), other items skipped (2), ' +
          'recursive call on `data[1:]` joined to the result and returned (4), returns a list with no loops (2).',
      },
      selfExplain: 'Why does the base case use len(data) == 0 instead of data == []?',
    },
  ],
};

export default scenario;
