import type { Scenario } from '../../schema.ts';

const s4: Scenario = {
  id: 't08-s4',
  title: 'CITS1401 marks and grades',
  story:
    'The CITS1401 teaching team exports lab sessions, quiz attempts and final marks as plain lists and dictionaries. ' +
    'The unit coordinator wants them grouped: students by lab session, the best mark per student per lab, and names by UWA grade.',
  questions: [
    {
      id: 't08-s4-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Grouping by lab session',
      prompt:
        'Students are grouped by lab session. A session is a `(day, hour)` tuple, used as the dictionary key. Type exactly what this program prints.',
      code: `records = [('Aisha', 'Tue', 9), ('Ben', 'Wed', 14), ('Chen', 'Tue', 9),
           ('Dara', 'Tue', 14), ('Eli', 'Wed', 14)]
groups = {}
for name, day, hour in records:
    session = (day, hour)
    if session not in groups:
        groups[session] = []
    groups[session].append(name)
backup = groups
backup[('Fri', 9)] = []
print(groups[('Tue', 9)])
print(len(groups), len(groups[('Wed', 14)]))`,
      mutants: [
        {
          code: `records = [('Aisha', 'Tue', 9), ('Ben', 'Wed', 14), ('Chen', 'Tue', 9),
           ('Dara', 'Tue', 14), ('Eli', 'Wed', 14)]
groups = {}
for name, day, hour in records:
    session = (day, hour)
    groups[session] = []
    groups[session].append(name)
backup = groups
backup[('Fri', 9)] = []
print(groups[('Tue', 9)])
print(len(groups), len(groups[('Wed', 14)]))`,
          mistake: 'accumulator_init',
        },
        {
          code: `records = [('Aisha', 'Tue', 9), ('Ben', 'Wed', 14), ('Chen', 'Tue', 9),
           ('Dara', 'Tue', 14), ('Eli', 'Wed', 14)]
groups = {}
for name, day, hour in records:
    session = (day, hour)
    if session not in groups:
        groups[session] = []
    groups[session].append(name)
backup = dict(groups)
backup[('Fri', 9)] = []
print(groups[('Tue', 9)])
print(len(groups), len(groups[('Wed', 14)]))`,
          mistake: 'aliasing_copy',
        },
      ],
      concepts: ['grouping', 'dict-of-lists', 'tuple-keys', 'aliasing'],
      detects: ['accumulator_init', 'aliasing_copy'],
      expectedSec: 180,
      hints: [
        "A tuple can be a dictionary key, and `('Tue', 9)` and `('Tue', 14)` are different keys. Track the dictionary after each pass of the loop.",
        '`backup = groups` does not copy anything. Ask what `backup` and `groups` each refer to after that line.',
        "After the loop `groups` has three keys: `('Tue', 9)`, `('Wed', 14)` and `('Tue', 14)`. The line `backup[('Fri', 9)] = []` then runs.",
      ],
      solution: {
        explanation:
          "Each record is unpacked into `name`, `day` and `hour`, and `session = (day, hour)` builds the key. Only the first student in a session creates the empty list; every student is then appended to their session's list.\n\n" +
          "After the loop `groups` is `{('Tue', 9): ['Aisha', 'Chen'], ('Wed', 14): ['Ben', 'Eli'], ('Tue', 14): ['Dara']}`. Dara is on her own because `('Tue', 14)` is a different key from `('Tue', 9)`.\n\n" +
          "`backup = groups` makes a second name for the **same** dictionary, so `backup[('Fri', 9)] = []` adds a fourth key to `groups` too.\n\n" +
          "The first print shows `['Aisha', 'Chen']`. The second prints the number of keys, 4, and the length of the Wed 2 pm list, 2.",
      },
      selfExplain: "What would len(groups) be if the line were backup = dict(groups)?",
    },
    {
      id: 't08-s4-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Best attempt per lab',
      prompt:
        'Lab quizzes can be attempted more than once. Each attempt is a tuple `(student, lab, mark)`, where `student` and `lab` are strings and `mark` is an int from 0 to 10.\n\n' +
        'Write `best_marks(attempts)` that returns a **nested dictionary**: each student maps to a dictionary of lab to that student\'s **highest** mark for that lab. ' +
        'Only labs a student attempted appear. An empty list gives `{}`. Do not change `attempts`.\n\n' +
        "Example: `best_marks([('23310001', 'Lab01', 6), ('23310001', 'Lab02', 9), ('23310001', 'Lab01', 8)])` returns `{'23310001': {'Lab01': 8, 'Lab02': 9}}`.",
      fnName: 'best_marks',
      starter: `def best_marks(attempts):
    """Return {student: {lab: highest mark}}."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: "best_marks([('23310001', 'Lab01', 7), ('23310001', 'Lab02', 9), ('24100002', 'Lab01', 10)])",
          expect: "{'23310001': {'Lab01': 7, 'Lab02': 9}, '24100002': {'Lab01': 10}}",
          label: 'two students',
          hidden: false,
        },
        {
          id: 'v2',
          call: "best_marks([('23310001', 'Lab01', 6), ('23310001', 'Lab01', 9)])",
          expect: "{'23310001': {'Lab01': 9}}",
          label: 'a better second attempt',
          hidden: false,
        },
        { id: 'h1', call: 'best_marks([])', expect: '{}', label: 'no attempts', hidden: true },
        {
          id: 'h2',
          call: "best_marks([('25020003', 'Lab03', 8), ('25020003', 'Lab03', 5)])",
          expect: "{'25020003': {'Lab03': 8}}",
          label: 'a worse second attempt',
          hidden: true,
        },
        {
          id: 'h3',
          call: "best_marks([('23310001', 'Lab01', 4), ('24100002', 'Lab01', 8), ('23310001', 'Lab02', 6)])",
          expect: "{'23310001': {'Lab01': 4, 'Lab02': 6}, '24100002': {'Lab01': 8}}",
          label: 'students do not share lab marks',
          hidden: true,
          tag: 'aliasing_copy',
        },
        {
          id: 'h4',
          call: "best_marks([('26000004', 'Lab02', 0), ('26000004', 'Lab04', 3)])",
          expect: "{'26000004': {'Lab02': 0, 'Lab04': 3}}",
          label: 'a mark of zero',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h5',
          setup: "attempts = [('27000005', 'Lab05', 5), ('27000005', 'Lab05', 7)]",
          call: 'best_marks(attempts)',
          expect: "{'27000005': {'Lab05': 7}}",
          argsUnchanged: ['attempts'],
          label: 'the attempts list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['nested-dict', 'grouping', 'max-per-key', 'tuple-unpacking'],
      detects: ['dict_keyerror', 'aliasing_copy', 'accumulator_init', 'mutated_input'],
      expectedSec: 480,
      hints: [
        'There are two levels of keys: first the student, then the lab. A student needs their own inner dictionary before a lab mark can go in it.',
        'Plan: start with `best = {}`. For each (student, lab, mark): if the student is not a key yet, give them a new empty dictionary. Then store the mark for that lab if the lab is not there yet, or if this mark is higher than the one stored. Return `best` after the loop.',
        'Create the inner dictionary inside the loop with `best[student] = {}`, and update with `if lab not in best[student] or mark > best[student][lab]:`',
      ],
      solution: {
        code: `def best_marks(attempts):
    best = {}
    for student, lab, mark in attempts:
        if student not in best:
            best[student] = {}
        if lab not in best[student] or mark > best[student][lab]:
            best[student][lab] = mark
    return best`,
        explanation:
          '`best = {}` is the outer dictionary: student to inner dictionary.\n\n' +
          '`for student, lab, mark in attempts:` unpacks each three-part tuple.\n\n' +
          '`if student not in best: best[student] = {}` gives each new student their own empty inner dictionary. Creating one `{}` before the loop and reusing it would make every student share the same inner dictionary.\n\n' +
          '`best[student][lab]` is the best mark stored so far for that lab. The `or` checks `lab not in best[student]` first, so the comparison only runs when the key exists and no KeyError is possible. A first attempt is always stored, even a mark of 0; starting from a default of 0 with `>` would skip it.\n\n' +
          'The function only reads `attempts`, so the caller\'s list is unchanged.',
      },
      selfExplain: 'Why does the order of the two conditions in if lab not in best[student] or mark > best[student][lab]: matter?',
    },
    {
      id: 't08-s4-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 10,
      diff: 'hard',
      core: true,
      title: 'Names by UWA grade',
      prompt:
        'Exam practice: write your answer as you would on paper, without running it.\n\n' +
        'UWA grades a final mark (an int from 0 to 100) as **HD** for 80 and above, **D** for 70 to 79, **CR** for 60 to 69, **P** for 50 to 59 and **N** below 50.\n\n' +
        'Write `grade_groups(marks)`. `marks` is a dictionary mapping each student name to their final mark. ' +
        'Return a **dictionary** mapping each grade to a **list of names sorted A to Z**. Include only grades that at least one student received, so an empty dictionary gives `{}`. Do not change `marks`.\n\n' +
        "Example: `grade_groups({'Nguyen': 85, 'Smith': 72, 'Okafor': 91})` returns `{'HD': ['Nguyen', 'Okafor'], 'D': ['Smith']}`.",
      fnName: 'grade_groups',
      starter: `def grade_groups(marks):
    pass`,
      tests: [
        {
          id: 'v1',
          call: "grade_groups({'Nguyen': 85, 'Smith': 72, 'Okafor': 91})",
          expect: "{'HD': ['Nguyen', 'Okafor'], 'D': ['Smith']}",
          label: 'HD and D',
          hidden: false,
          tag: 'elif_vs_if',
        },
        {
          id: 'v2',
          call: "grade_groups({'Lee': 55, 'Patel': 64, 'Brown': 49})",
          expect: "{'P': ['Lee'], 'CR': ['Patel'], 'N': ['Brown']}",
          label: 'P, CR and N',
          hidden: false,
        },
        { id: 'h1', call: 'grade_groups({})', expect: '{}', label: 'no students', hidden: true },
        {
          id: 'h2',
          call: "grade_groups({'Ali': 80, 'Bo': 79, 'Cy': 70, 'Di': 60, 'Ed': 50, 'Flo': 49})",
          expect: "{'HD': ['Ali'], 'D': ['Bo', 'Cy'], 'CR': ['Di'], 'P': ['Ed'], 'N': ['Flo']}",
          label: 'marks on each grade boundary',
          hidden: true,
        },
        {
          id: 'h3',
          call: "grade_groups({'Zhou': 90, 'Adams': 88, 'Moore': 100})",
          expect: "{'HD': ['Adams', 'Moore', 'Zhou']}",
          label: 'names given out of A to Z order',
          hidden: true,
        },
        {
          id: 'h4',
          call: "grade_groups({'Kim': 0, 'Rossi': 100})",
          expect: "{'N': ['Kim'], 'HD': ['Rossi']}",
          label: 'lowest and highest possible marks',
          hidden: true,
          tag: 'elif_vs_if',
        },
        {
          id: 'h5',
          setup: "marks = {'Wu': 67, 'Ivanov': 67}",
          call: 'grade_groups(marks)',
          expect: "{'CR': ['Ivanov', 'Wu']}",
          argsUnchanged: ['marks'],
          label: 'the marks dictionary is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['grouping', 'dict-of-lists', 'dict-items', 'elif', 'sort'],
      detects: ['elif_vs_if', 'dict_keyerror', 'none_from_inplace', 'mutated_input'],
      expectedSec: 660,
      hints: [
        'Two separate jobs: work out one grade from one mark, then put the name into the list for that grade.',
        'Plan: start with an empty dictionary. For each name and mark: use an if/elif/else chain to set `grade`; if that grade is not a key yet, give it an empty list; append the name. After the loop, sort each list, then return the dictionary.',
        "The grouping lines are `if grade not in groups:` then `groups[grade] = []`, then `groups[grade].append(name)`. Sorting each list afterwards: `for grade in groups:` then `groups[grade].sort()`.",
      ],
      solution: {
        code: `def grade_groups(marks):
    groups = {}
    for name, mark in marks.items():
        if mark >= 80:
            grade = 'HD'
        elif mark >= 70:
            grade = 'D'
        elif mark >= 60:
            grade = 'CR'
        elif mark >= 50:
            grade = 'P'
        else:
            grade = 'N'
        if grade not in groups:
            groups[grade] = []
        groups[grade].append(name)
    for grade in groups:
        groups[grade].sort()
    return groups`,
        explanation:
          'A marker would look for these steps (10 marks):\n\n' +
          '1. `groups = {}` before the loop, and `for name, mark in marks.items():` to get each name with its mark (2 marks).\n' +
          '2. An `if`/`elif`/`else` chain from the highest grade down, using `>=` so that 80, 70, 60 and 50 land in the higher grade. With separate `if`s a mark of 85 would match HD, D, CR and P in turn, and the last match would win (3 marks).\n' +
          '3. `if grade not in groups: groups[grade] = []` then `groups[grade].append(name)`, so only grades that occur become keys and no KeyError is possible (3 marks).\n' +
          '4. After the loop, sort each list in place with `groups[grade].sort()` and return `groups` (2 marks). Do not write `groups[grade] = groups[grade].sort()`: `sort()` returns None.\n\n' +
          'The function never changes `marks`; it only reads it with `items()`.',
      },
      selfExplain: 'Why must the conditions be checked from HD downwards when you use >=?',
    },
  ],
};

export default s4;
