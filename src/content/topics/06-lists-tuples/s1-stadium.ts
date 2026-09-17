import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s1',
  title: 'Derby day at Optus Stadium',
  story:
    'It is derby day at Optus Stadium. The ticketing office, the gate queues and the kiosk rosters all keep their data in Python lists, ' +
    'and a few of their scripts change lists they did not mean to change.',
  questions: [
    // ------------------------------------------------------------------ q1 mcq (easy)
    {
      id: 't06-s1-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Backup of the booked seats',
      prompt:
        'Mei keeps a list of the seats she has booked for the derby. She makes two "backups" and then books one more seat. What does this program print?',
      code: `seats = ['A1', 'A2']
backup = seats
spare = seats[:]
backup.append('A3')
print(len(seats), len(spare))`,
      concepts: ['aliasing', 'list-copy', 'append'],
      detects: ['aliasing_copy', 'syntax_other'],
      expectedSec: 75,
      options: [
        {
          id: 'a',
          text: '2 2',
          mistake: 'aliasing_copy',
          why: '`backup = seats` does not copy the list. It gives the same list a second name, so appending through `backup` also changes `seats`.',
        },
        {
          id: 'b',
          text: '3 2',
          correct: true,
          why: '`seats` and `backup` name the same list, so it now has 3 items. `spare = seats[:]` made a separate copy before the append, so it still has 2.',
        },
        {
          id: 'c',
          text: '3 3',
          mistake: 'aliasing_copy',
          why: 'A full slice `seats[:]` builds a brand new list with the same items. Appending to the original afterwards does not touch the copy.',
        },
        {
          id: 'd',
          text: 'An error, because seats[:] needs a start and a stop',
          mistake: 'syntax_other',
          why: 'Both slice numbers are optional. A missing start means "from the beginning" and a missing stop means "to the end", so `seats[:]` is the whole list.',
        },
      ],
      hints: [
        'Assignment with `=` never copies a list. Ask which names point at the same list and which point at a new one.',
        'Draw one box for each list that exists. `backup = seats` adds a second label to the first box; `seats[:]` makes a second box.',
        'After line 4 the first box holds `[\'A1\', \'A2\', \'A3\']`. Which labels are on that box?',
      ],
      solution: {
        explanation:
          'Line 1 makes one list. Line 2 gives that same list a second name, `backup`. Line 3 builds a new list with the same items and names it `spare`.\n\n' +
          'Line 4 appends through `backup`, which changes the one list that `seats` also names, so `len(seats)` is 3.\n\n' +
          '`spare` is a separate list made before the append, so `len(spare)` is still 2. The output is `3 2`.',
      },
      selfExplain: 'Name two ways, other than seats[:], to make an independent copy of a list.',
    },

    // ------------------------------------------------------------------ q2 predict (easy)
    {
      id: 't06-s1-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Gate 3 queue',
      prompt: 'Security at Gate 3 keeps the waiting queue in a list. Choose exactly what this program prints.',
      code: `queue = ['Ava', 'Kai', 'Noor']
queue.append('Liam')
queue.insert(1, 'Sofia')
first = queue.pop(0)
print(first, len(queue))
print(queue[1:3])`,
      choice: true,
      mutants: [
        {
          code: `queue = ['Ava', 'Kai', 'Noor']
queue.append('Liam')
queue.insert(1, 'Sofia')
first = queue.pop(0)
print(first, len(queue))
print(queue[1:4])`,
          mistake: 'off_by_one_range',
        },
        {
          code: `queue = ['Ava', 'Kai', 'Noor']
queue.append('Liam')
queue.insert(1, 'Sofia')
first = queue.pop(1)
print(first, len(queue))
print(queue[1:3])`,
          mistake: 'off_by_one_range',
        },
        {
          code: `queue = ['Ava', 'Kai', 'Noor']
queue.append('Liam')
queue.insert(2, 'Sofia')
first = queue.pop(0)
print(first, len(queue))
print(queue[1:3])`,
          mistake: 'off_by_one_range',
        },
      ],
      concepts: ['list-methods', 'indexing', 'slicing'],
      detects: ['off_by_one_range'],
      expectedSec: 100,
      hints: [
        'Write the list out after every line. `insert` and `pop` shift the items that come after the position you give.',
        'Positions start at 0. `insert(1, x)` puts x at position 1, `pop(0)` removes and returns the item at position 0, and `[1:3]` takes positions 1 and 2 only.',
        'After line 3 the list is `[\'Ava\', \'Sofia\', \'Kai\', \'Noor\', \'Liam\']`.',
      ],
      solution: {
        explanation:
          'Line 2 adds Liam to the end: `[\'Ava\', \'Kai\', \'Noor\', \'Liam\']`.\n\n' +
          'Line 3 puts Sofia at position 1 and shifts the rest right: `[\'Ava\', \'Sofia\', \'Kai\', \'Noor\', \'Liam\']`.\n\n' +
          'Line 4 removes position 0 and stores it, so `first` is `\'Ava\'` and the list is `[\'Sofia\', \'Kai\', \'Noor\', \'Liam\']`.\n\n' +
          'Line 5 prints `Ava 4`. Line 6 slices positions 1 and 2 (the stop, 3, is not included) and prints `[\'Kai\', \'Noor\']`.',
      },
      selfExplain: 'What would print(queue[-1]) show at the end of the program?',
    },

    // ------------------------------------------------------------------ q3 predict (medium)
    {
      id: 't06-s1-q3',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Adding to the kiosk roster',
      prompt:
        'A kiosk manager adds a late worker to the shift roster with a function. Type exactly what this program prints.',
      code: `def add_worker(roster, name):
    roster.append(name)
    roster = roster + ['Manager']
    return roster

shift = ['Aroha', 'Ben']
result = add_worker(shift, 'Chloe')
print(shift)
print(result)`,
      mutants: [
        {
          code: `def add_worker(roster, name):
    roster = roster[:]
    roster.append(name)
    roster = roster + ['Manager']
    return roster

shift = ['Aroha', 'Ben']
result = add_worker(shift, 'Chloe')
print(shift)
print(result)`,
          mistake: 'mutated_input',
        },
        {
          code: `def add_worker(roster, name):
    roster.append(name)
    roster += ['Manager']
    return roster

shift = ['Aroha', 'Ben']
result = add_worker(shift, 'Chloe')
print(shift)
print(result)`,
          mistake: 'aliasing_copy',
        },
      ],
      concepts: ['aliasing', 'list-parameters', 'append', 'list-concatenation'],
      detects: ['mutated_input', 'aliasing_copy'],
      expectedSec: 180,
      hints: [
        'When `add_worker(shift, \'Chloe\')` runs, `roster` and `shift` start as two names for the same list. Which lines change that list, and which line makes a new one?',
        '`append` changes the existing list in place. `roster + [...]` builds a brand new list, and `roster = ...` then moves only the local name `roster` to it.',
        'After line 2 runs, `shift` is `[\'Aroha\', \'Ben\', \'Chloe\']`. Does line 3 change that list?',
      ],
      solution: {
        explanation:
          'Calling `add_worker(shift, \'Chloe\')` makes `roster` a second name for the list `shift` names; no copy is made.\n\n' +
          'Line 2 appends in place, so that shared list becomes `[\'Aroha\', \'Ben\', \'Chloe\']`.\n\n' +
          'Line 3 uses `+`, which builds a new list `[\'Aroha\', \'Ben\', \'Chloe\', \'Manager\']` and points only the local name `roster` at it. `shift` still names the old list.\n\n' +
          'The function returns the new list, so the program prints `[\'Aroha\', \'Ben\', \'Chloe\']` and then `[\'Aroha\', \'Ben\', \'Chloe\', \'Manager\']`.',
      },
      selfExplain: 'How would the first printed line change if line 3 used roster += [\'Manager\'] instead?',
    },

    // ------------------------------------------------------------------ q4 fixBug (hard)
    {
      id: 't06-s1-q4',
      format: 'fixBug',
      diff: 'hard',
      core: true,
      title: 'Bays still on sale',
      prompt:
        'The ticketing site only lists bays with at least 10 seats left. `open_bays(bays)` takes a list of `(bay, seats_left)` tuples and should return a **new list** of the tuples with `seats_left >= 10`, in their original order. ' +
        'It must not change the list it is given.\n\n' +
        'When two nearly full bays sit next to each other, one of them slips through, and the caller\'s list is changed as well. Find the bug and fix it by changing as few lines as you can.',
      buggy: `def open_bays(bays):
    result = bays
    for bay in bays:
        if bay[1] < 10:
            result.remove(bay)
    return result`,
      bugMistake: 'aliasing_copy',
      maxChangedLines: 1,
      fnName: 'open_bays',
      tests: [
        {
          id: 'v1',
          call: "open_bays([('112', 40), ('113', 3), ('115', 25)])",
          expect: "[('112', 40), ('115', 25)]",
          label: 'one bay nearly full',
          hidden: false,
        },
        {
          id: 'v2',
          call: "open_bays([('208', 2), ('209', 5), ('210', 30)])",
          expect: "[('210', 30)]",
          label: 'two nearly full bays in a row',
          hidden: false,
          tag: 'mutate_while_iterating',
        },
        {
          id: 'h1',
          setup: "stand = [('101', 50), ('102', 0)]",
          call: 'open_bays(stand)',
          expect: "[('101', 50)]",
          argsUnchanged: ['stand'],
          label: "caller's list is not changed",
          hidden: true,
          tag: 'aliasing_copy',
        },
        {
          id: 'h2',
          call: "open_bays([('401', 1), ('402', 0), ('403', 9)])",
          expect: '[]',
          label: 'every bay nearly full',
          hidden: true,
          tag: 'mutate_while_iterating',
        },
        {
          id: 'h3',
          call: "open_bays([('501', 10), ('502', 9)])",
          expect: "[('501', 10)]",
          label: 'exactly 10 seats left',
          hidden: true,
        },
        {
          id: 'h4',
          call: 'open_bays([])',
          expect: '[]',
          label: 'no bays',
          hidden: true,
        },
      ],
      concepts: ['aliasing', 'list-copy', 'remove', 'list-of-tuples'],
      detects: ['aliasing_copy', 'mutate_while_iterating', 'mutated_input'],
      expectedSec: 420,
      hints: [
        'Does `result = bays` create a second list, or a second name for the same list?',
        'Because `result` and `bays` are one list, `remove` shrinks the list the `for` loop is walking through. The item after each removed one shifts into a position the loop has already passed, so it is never checked. Give `result` its own copy so the loop walks an unchanged list.',
        'Only line 2 needs to change: `result = bays[...]` with a slice that covers the whole list.',
      ],
      solution: {
        code: `def open_bays(bays):
    result = bays[:]
    for bay in bays:
        if bay[1] < 10:
            result.remove(bay)
    return result`,
        explanation:
          'Line 2 was `result = bays`, which only adds a second name for the caller\'s list. So `result.remove(bay)` removed items from the very list the loop was walking through, and from the caller\'s list.\n\n' +
          'After a removal every later item shifts one place left, and the loop moves on to the next position, so the bay straight after a removed bay is skipped.\n\n' +
          '`result = bays[:]` makes an independent copy. The loop now walks the unchanged `bays`, every bay is checked, and removals only affect the copy that is returned.\n\n' +
          'An equally good fix builds the answer instead: start with `result = []` and `append` each bay with `bay[1] >= 10`. That changes more lines but avoids `remove` altogether.',
      },
      selfExplain: 'Why did [(\'112\', 40), (\'113\', 3), (\'115\', 25)] give the right answer even with the bug?',
    },
  ],
};

export default scenario;
