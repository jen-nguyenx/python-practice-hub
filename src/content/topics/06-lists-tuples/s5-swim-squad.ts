import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s5',
  title: 'Swim squad time trials',
  story:
    'A swimming squad runs time trials every Tuesday. The coach keeps lap times in a list of floats and the sign-on sheet as a list of ' +
    '`(swimmer, seconds)` tuples, then wants the fastest times without losing the order the laps were swum in.',
  questions: [
    // ------------------------------------------------------------------ q1 multi (easy)
    {
      id: 't06-s5-q1',
      format: 'multi',
      diff: 'easy',
      core: true,
      title: 'Which ones leave the times alone?',
      prompt:
        'The coach wants the times in order for a printout, but the list itself must stay in the order the laps were swum. ' +
        'Select **every** line that gives back a new list and leaves `times` exactly as it is.',
      code: 'times = [61.4, 58.9, 60.2]',
      concepts: ['sorted', 'sort', 'list-copy', 'list-concatenation'],
      detects: ['none_from_inplace', 'mutated_input', 'aliasing_copy'],
      expectedSec: 110,
      options: [
        {
          id: 'a',
          text: 'ordered = sorted(times)',
          correct: true,
          why: '`sorted` builds and returns a brand new sorted list. The list it was given keeps its order.',
        },
        {
          id: 'b',
          text: 'ordered = times.sort()',
          correct: false,
          mistake: 'none_from_inplace',
          why: '`sort()` reorders `times` itself and returns `None`, so `ordered` is `None` and the original order is gone.',
        },
        {
          id: 'c',
          text: 'copy = times[:]',
          correct: true,
          why: 'A full slice builds a separate list with the same items. Changing `copy` later does not touch `times`.',
        },
        {
          id: 'd',
          text: 'longer = times + [59.0]',
          correct: true,
          why: '`+` on two lists makes a third list. `times` is read, never changed. (`times += [59.0]` would change it in place.)',
        },
        {
          id: 'e',
          text: 'longer = times.append(59.0)',
          correct: false,
          mistake: 'mutated_input',
          why: '`append` adds to `times` itself and returns `None`, so this both changes the list and leaves `longer` as `None`.',
        },
      ],
      hints: [
        'Two questions for each line: does it hand back a list, and does the original list survive unchanged?',
        'The list methods that change a list in place (`sort`, `append`, `insert`, `remove`, `reverse`) all return `None`. Functions and operators such as `sorted`, slicing and `+` build something new.',
        'Three of the five lines are safe. The two that are not both call a method on `times` with a dot.',
      ],
      solution: {
        explanation:
          '`sorted(times)` returns a new sorted list and leaves `times` in lap order, which is exactly what the printout needs.\n\n' +
          '`times.sort()` sorts the list in place and returns `None`. Both halves of that are traps: the original order is lost and `ordered` holds nothing useful.\n\n' +
          '`times[:]` copies the list, so later changes to the copy stay in the copy. `times` itself is untouched.\n\n' +
          '`times + [59.0]` builds a third list from the two. Note that `times += [59.0]` is not the same: it changes `times` in place.\n\n' +
          '`times.append(59.0)` changes `times` and returns `None`, so it fails both tests.',
      },
      selfExplain: 'Which of the safe lines would you use inside a function that must not change the list it was passed?',
    },

    // ------------------------------------------------------------------ q2 errorTranslator (medium)
    {
      id: 't06-s5-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: false,
      title: 'No qualifying laps',
      prompt:
        'Laps under 58 seconds qualify for the state meet. This script crashed before printing anything. ' +
        'Click the line that raised, pick the exception, then pick the cause and the fix.',
      code: `times = []
for lap in [58.4, 61.0, 59.2]:
    if lap < 58.0:
        times.append(lap)
print('Squad best:', min(times))`,
      exceptionOptions: ['ValueError', 'IndexError', 'TypeError', 'ZeroDivisionError'],
      causes: [
        {
          id: 'a',
          text: 'None of the three laps was under 58.0, so `times` is still empty and `min()` has nothing to choose between. Check `len(times) > 0` before calling `min`, and print a message (or return `None`) when the list is empty.',
          correct: true,
        },
        {
          id: 'b',
          text: '`min()` needs at least two values to compare, and the loop only appended one lap. Append the lap times and the squad average so the list is never that short.',
          mistake: 'index_out_of_range',
        },
        {
          id: 'c',
          text: '`times = []` is the wrong start for an accumulator that ends up holding numbers. Start it at `times = 0` so `min()` always has a number to work with.',
          mistake: 'accumulator_init',
        },
      ],
      concepts: ['empty-list', 'min', 'filtering', 'edge-case'],
      detects: ['index_out_of_range', 'accumulator_init'],
      expectedSec: 180,
      hints: [
        'The loop runs fine. Work out what `times` holds by the time the last line runs.',
        'Compare each lap with 58.0 by hand: 58.4, 61.0 and 59.2. How many of them get appended?',
        '`min()` has to return one of the values it is given, so an empty list leaves it with no answer to return.',
      ],
      solution: {
        explanation:
          'The loop appends a lap only when it is under 58.0 seconds. The three laps are 58.4, 61.0 and 59.2, so nothing is appended and `times` is still `[]` after the loop.\n\n' +
          '`min([])` cannot return a smallest value because there are no values, so Python raises `ValueError: min() iterable argument is empty` on the last line. Nothing is printed, because the crash happens while working out what to print.\n\n' +
          'A filtered list being empty is one of the most common causes of a crash in list code: `min`, `max` and `sum(...) / len(...)` all need at least one item (the last one also divides by zero).\n\n' +
          'The fix is a guard before the line that uses the list:\n\n' +
          '```python\nif len(times) > 0:\n    print(\'Squad best:\', min(times))\nelse:\n    print(\'No qualifying laps\')\n```\n\n' +
          'Starting `times` at 0 would not help: `append` needs a list, and 0 is not one.',
      },
      selfExplain: 'Which other three lines of list code would also crash on an empty list?',
    },

    // ------------------------------------------------------------------ q3 cloze (easy)
    {
      id: 't06-s5-q3',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Find a swimmer on the sign-on sheet',
      prompt:
        "The sign-on sheet is a list of `(swimmer, seconds)` tuples. Fill in the blanks so `find_swimmer(entries, name)` returns an **int**: " +
        "the position of the first entry whose swimmer is `name`, or `-1` when that swimmer is not on the sheet. Positions start at 0.",
      concepts: ['list-of-tuples', 'range-len', 'early-return', 'search'],
      detects: ['index_out_of_range', 'early_return_in_loop'],
      expectedSec: 115,
      template: `def find_swimmer(entries, name):
    """Return the position of the first entry for name, or -1 if there is none."""
    for i in range(⟦1⟧):
        if entries[i]⟦2⟧ == name:
            return i
    return -1`,
      blanks: [
        { id: '1', accept: ['len(entries)', '0, len(entries)'] },
        { id: '2', accept: ['[0]'] },
      ],
      fnName: 'find_swimmer',
      tests: [
        {
          id: 'v1',
          call: "find_swimmer([('Ivy', 61.4), ('Noor', 58.9)], 'Noor')",
          expect: '1',
          label: 'second on the sheet',
          hidden: false,
        },
        {
          id: 'v2',
          call: "find_swimmer([('Ivy', 61.4), ('Noor', 58.9)], 'Sam')",
          expect: '-1',
          label: 'not on the sheet',
          hidden: false,
        },
        {
          id: 'h1',
          call: "find_swimmer([], 'Ivy')",
          expect: '-1',
          label: 'empty sheet',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h2',
          call: "find_swimmer([('Ivy', 61.4), ('Ivy', 59.8)], 'Ivy')",
          expect: '0',
          label: 'two laps by the same swimmer',
          hidden: true,
          tag: 'early_return_in_loop',
        },
        {
          id: 'h3',
          call: "find_swimmer([('Tane', 62.0), ('Ivy', 61.4), ('Ana', 57.2)], 'Ana')",
          expect: '2',
          label: 'last on the sheet',
          hidden: true,
        },
        {
          id: 'h4',
          call: "find_swimmer([('Zara', 57.2)], 'Zara')",
          expect: '0',
          label: 'only one entry',
          hidden: true,
        },
      ],
      hints: [
        'The answer is a position, so the loop has to work with positions rather than with the tuples themselves.',
        '`range(n)` counts 0, 1, ... n - 1, which is exactly the set of valid positions in a list of length n. Each item is a tuple, so one more index pulls the swimmer out of it.',
        '`entries[i]` is a `(swimmer, seconds)` tuple, and the swimmer is the first part of it.',
      ],
      solution: {
        code: `def find_swimmer(entries, name):
    """Return the position of the first entry for name, or -1 if there is none."""
    for i in range(len(entries)):
        if entries[i][0] == name:
            return i
    return -1`,
        explanation:
          '`range(len(entries))` gives every valid position, 0 up to `len(entries) - 1`. Writing `len(entries) + 1` or `len(entries) - 1` would either read past the end or miss the last entry.\n\n' +
          '`entries[i]` is one tuple, so `entries[i][0]` is the swimmer and `entries[i][1]` is the time. Two indexes in a row: one for the list, one inside the tuple.\n\n' +
          '`return i` stops the loop at the first match, which is what "the first entry" means. Without an early return, a later lap by the same swimmer would overwrite the answer.\n\n' +
          '`return -1` sits after the loop, so it only runs when no entry matched. On an empty sheet the loop body never runs and -1 comes straight back.\n\n' +
          'Looping over the tuples with `for swimmer, seconds in entries:` is fine when you want the values, but here the position itself is the answer.',
      },
      selfExplain: 'Why is -1 a safe "not found" answer here, when list[-1] is a real position?',
    },

    // ------------------------------------------------------------------ q4 write (hard)
    {
      id: 't06-s5-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Best time for each swimmer',
      prompt:
        'The trial log is a list of `(swimmer, seconds)` tuples, one per lap, in the order the laps were swum. A swimmer may appear many times.\n\n' +
        'Write `session_bests(laps)` that returns a **new list of `(swimmer, best)` tuples**, one per swimmer, where `best` is that ' +
        "swimmer's fastest (lowest) time rounded to 2 decimal places. List the swimmers in the order they first appear in `laps`, " +
        'not in time order. Return `[]` for an empty log, and do not change `laps`.\n\n' +
        "For example, `session_bests([('Ivy', 61.4), ('Noor', 58.9), ('Ivy', 59.75)])` returns `[('Ivy', 59.75), ('Noor', 58.9)]`.",
      fnName: 'session_bests',
      starter: `def session_bests(laps):
    """Return [(swimmer, best time)] in first-appearance order, rounded to 2 dp."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: "session_bests([('Ivy', 61.4), ('Noor', 58.9), ('Ivy', 59.75)])",
          expect: "[('Ivy', 59.75), ('Noor', 58.9)]",
          cmp: 'float',
          label: 'example from the question',
          hidden: false,
        },
        {
          id: 'v2',
          call: "session_bests([('Tom', 60.0)])",
          expect: "[('Tom', 60.0)]",
          cmp: 'float',
          label: 'one lap',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'session_bests([])',
          expect: '[]',
          label: 'empty log',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h2',
          call: "session_bests([('Sam', 62.0), ('Sam', 61.5), ('Sam', 61.75)])",
          expect: "[('Sam', 61.5)]",
          cmp: 'float',
          label: 'same swimmer three times, best in the middle',
          hidden: true,
        },
        {
          id: 'h3',
          call: "session_bests([('Zoe', 59.0), ('Abe', 60.0), ('Zoe', 58.0), ('Abe', 61.0)])",
          expect: "[('Zoe', 58.0), ('Abe', 60.0)]",
          cmp: 'float',
          label: 'swimmers take turns',
          hidden: true,
        },
        {
          id: 'h4',
          call: "session_bests([('Ana', 57.456)])",
          expect: "[('Ana', 57.46)]",
          cmp: 'float',
          label: 'time needs rounding',
          hidden: true,
        },
        {
          id: 'h5',
          setup: "log = [('Ivy', 61.4), ('Noor', 58.9), ('Ivy', 59.75)]",
          call: 'session_bests(log)',
          expect: "[('Ivy', 59.75), ('Noor', 58.9)]",
          cmp: 'float',
          argsUnchanged: ['log'],
          label: 'the log is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['list-of-tuples', 'grouping', 'parallel-lists', 'tuple-return', 'round'],
      detects: ['mutated_input', 'return_type_wrong', 'index_out_of_range', 'accumulator_init'],
      expectedSec: 660,
      hints: [
        'Tuples cannot be changed, so a swimmer\'s best time cannot be edited in place once it is in the answer. Keep the swimmers and their best times in two lists that grow together, and build the tuples at the very end.',
        'Plan: start two empty lists, `names` and `bests`. For each `(swimmer, seconds)` lap, look for the swimmer in `names` (a small loop over positions, like a search). If the swimmer is new, append the name to one list and the time to the other. If the swimmer is already there at position `i`, replace `bests[i]` when this lap is faster. Afterwards, walk the two lists together and append `(names[i], round(bests[i], 2))` to the result.',
        '```python\nfor swimmer, seconds in laps:\n    found = -1\n    for i in range(len(names)):\n        if names[i] == swimmer:\n            found = i\n    if found == -1:\n        ...\n```',
      ],
      solution: {
        code: `def session_bests(laps):
    """Return [(swimmer, best time)] in first-appearance order, rounded to 2 dp."""
    names = []
    bests = []
    for swimmer, seconds in laps:
        found = -1
        for i in range(len(names)):
            if names[i] == swimmer:
                found = i
        if found == -1:
            names.append(swimmer)
            bests.append(seconds)
        elif seconds < bests[found]:
            bests[found] = seconds
    result = []
    for i in range(len(names)):
        result.append((names[i], round(bests[i], 2)))
    return result`,
        explanation:
          '`names` and `bests` are two lists kept in step: position `i` in one belongs with position `i` in the other. Both start empty, before the loop.\n\n' +
          '`for swimmer, seconds in laps:` unpacks each tuple, which reads better than `lap[0]` and `lap[1]`. Nothing is written back into `laps`, so the caller\'s log is safe.\n\n' +
          '`found` starts at -1, the usual "not there" marker, and the inner loop sets it to the position of the swimmer if that name has been seen before.\n\n' +
          'A new swimmer is appended to the end of both lists, which is what keeps the answer in first-appearance order. A swimmer already in the lists only gets `bests[found]` replaced when this lap is faster, so the fastest time survives wherever it appears in the log.\n\n' +
          'The final loop builds the answer as a list of tuples, `(names[i], round(bests[i], 2))`. Rounding happens once, at the end, on the value that is actually returned; rounding each lap as it arrives can change which lap counts as fastest.\n\n' +
          'An empty log needs no special case: both lists stay empty, so the last loop never runs and `[]` is returned.',
      },
      selfExplain: 'Why does the answer have to be built at the end instead of updating tuples as the laps arrive?',
    },
  ],
};

export default scenario;
