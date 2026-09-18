import type { Scenario } from '../../schema.ts';

// Made-up unit results for practice. File names have no .csv extension on purpose.
const RESULTS_A = `Unit,Student,Mark
CITS1401,s2201,72
CITS1401,s3388,88
CITS1401,s4102,64
MATH1011,s2201,55
MATH1011,s4102,78
`;

const RESULTS_B = `Mark,Campus,STUDENT,unit
81,Crawley,s7001,CITS1401
58,Crawley,S7001,cits1401
67,Albany, s7002 , CITS1401
90,Crawley,s7003,CITS1401
`;

const RESULTS_MESSY = `Unit,Student,Assessment,Mark
CITS1401,s8001,Project,74
CITS1401,s8002,Project,absent

CITS1401,s8003,Project,105
CITS1401,s8004,Project,-5
CITS1401,,Project,60
CITS1401,s8005,Project
CITS1401,s8006,Project,58
CITS1401,s8007,Project,66
MATH1011,s8001,Test,40
`;

const RESULTS_SAME = `Unit,Student,Mark
PHYS1001,s9001,70
PHYS1001,s9002,70
`;

const RESULTS_MULTI = `Unit,Student,Assessment,Mark
CITS1401,s2201,Project 1,72
CITS1401,s2201,Test,64
CITS1401,s3388,Project 1,88
CITS1401,s3388,Test,91
CITS1401,s4102,Project 1,64
MATH1011,s2201,Test,55
MATH1011,s4102,Test,78
`;

const RESULTS_TIES = `Unit,Student,Mark
CITS2002,zoe,70
CITS2002,ana,70
CITS2002,mia,85
CITS2002,bo,64
`;

const RESULTS_NONE = `Unit,Student,Mark
CITS1401,s1,absent
`;

const s4: Scenario = {
  id: 't12-s4',
  title: 'Unit results board',
  story:
    'A teaching team exports one row per student per assessment for every unit they run, then asks for the same three things every semester: how each mark compares with the rest of the unit, and who the top students are. ' +
    'The export is machine-written, so it is messy, and the marks below are made up for practice.',
  questions: [
    {
      id: 't12-s4-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Building a dictionary of dictionaries',
      prompt:
        'The results board is a dictionary whose values are themselves dictionaries: unit, then student, then mark. Type exactly what this program prints.',
      code: `rows = [('CITS1401', 'ana', 72), ('CITS1401', 'ben', 58), ('MATH1011', 'ana', 91)]
results = {}
for unit, student, mark in rows:
    if unit not in results:
        results[unit] = {}
    results[unit][student] = mark
print(results)
print(len(results))
print(results['CITS1401'])`,
      mutants: [
        {
          code: `rows = [('CITS1401', 'ana', 72), ('CITS1401', 'ben', 58), ('MATH1011', 'ana', 91)]
results = {}
for unit, student, mark in rows:
    results[unit] = {}
    results[unit][student] = mark
print(results)
print(len(results))
print(results['CITS1401'])`,
          mistake: 'accumulator_init',
        },
        {
          code: `rows = [('CITS1401', 'ana', 72), ('CITS1401', 'ben', 58), ('MATH1011', 'ana', 91)]
results = {}
inner = {}
for unit, student, mark in rows:
    if unit not in results:
        results[unit] = inner
    results[unit][student] = mark
print(results)
print(len(results))
print(results['CITS1401'])`,
          mistake: 'aliasing_copy',
        },
      ],
      concepts: ['nested-dict', 'grouping', 'dict-keys'],
      detects: ['accumulator_init', 'aliasing_copy'],
      expectedSec: 240,
      hints: [
        'Follow the three rows one at a time and keep asking: does this row create a new inner dictionary, or add to one that is already there?',
        'The `if` on line 4 is the whole trick. It runs only when the unit is new, so an inner dictionary is created once per unit and the rows after it are added to the dictionary that is already stored. `len` counts the outer keys only.',
        'After the first two rows, `results` is `{\'CITS1401\': {\'ana\': 72, \'ben\': 58}}`. The third row is the first for MATH1011.',
      ],
      solution: {
        explanation:
          'Row 1 (`CITS1401`, `ana`, 72): the unit is not a key yet, so line 5 stores a new empty dictionary for it, and line 6 puts `ana` in that inner dictionary.\n\n' +
          'Row 2 (`CITS1401`, `ben`, 58): the unit is already a key, so line 5 is skipped and `ben` is added **next to** `ana` in the same inner dictionary.\n\n' +
          'Row 3 (`MATH1011`, `ana`, 91): a new unit, so it gets its own new inner dictionary. The two `ana` entries are in different dictionaries and do not clash.\n\n' +
          'The program prints:\n\n' +
          "```\n{'CITS1401': {'ana': 72, 'ben': 58}, 'MATH1011': {'ana': 91}}\n2\n{'ana': 72, 'ben': 58}\n```\n\n" +
          '`len(results)` is 2 because it counts units, not students. Dictionaries keep the order keys were first added, so the output is predictable.',
      },
      selfExplain: 'What would line 8 print if the guard on line 4 were removed?',
    },
    {
      id: 't12-s4-q2',
      format: 'mcq',
      diff: 'medium',
      core: false,
      title: 'Ranking with a tie-break',
      prompt:
        '`rows` is a list of `(student, mean_mark)` tuples, for example `[(\'zoe\', 70.0), (\'mia\', 85.0), (\'ana\', 70.0)]`.\n\n' +
        'The board ranks the highest mean first, and students with the same mean in alphabetical order, so this example must end up as `[(\'mia\', 85.0), (\'ana\', 70.0), (\'zoe\', 70.0)]`.\n\n' +
        'Which line puts `rows` in that order?',
      options: [
        {
          id: 'a',
          text: 'rows.sort(key=lambda row: (-row[1], row[0]))',
          correct: true,
          why:
            'Correct. The key is a tuple, so Python compares the marks first and only looks at the name when the marks are equal. Negating the mark puts the largest first while the name still sorts A to Z.',
        },
        {
          id: 'b',
          text: 'rows.sort(key=lambda row: (row[1], row[0]), reverse=True)',
          mistake: 'sort_tiebreak',
          why:
            '`reverse=True` flips the whole comparison, not just the mark, so equal means come out z to a: `zoe` would land before `ana`.',
        },
        {
          id: 'c',
          text: 'rows = rows.sort(key=lambda row: (-row[1], row[0]))',
          mistake: 'none_from_inplace',
          why:
            '`sort` orders the list in place and returns `None`, so this throws the sorted list away and leaves `rows` as `None`. Either call `rows.sort(...)` on its own line, or use `rows = sorted(rows, ...)`.',
        },
        {
          id: 'd',
          text: 'rows.sort(key=lambda row: (-row[1], -row[0]))',
          mistake: 'type_error_other',
          why:
            'The mark part is right, but `-row[0]` tries to negate a student name and raises `TypeError: bad operand type for unary -: \'str\'`. Text can only be sorted forwards or backwards, never negated.',
        },
      ],
      concepts: ['sort-tiebreak', 'ranking', 'sort-key'],
      detects: ['sort_tiebreak', 'none_from_inplace', 'type_error_other'],
      expectedSec: 150,
      hints: [
        'A tuple key is compared left to right: the second part only matters when the first parts are equal. Check what each option does to that second part.',
        'Two separate questions: does the mark end up largest first, and do equal marks end up A to Z? `reverse=True` answers the first one but breaks the second.',
        'One option also sorts correctly but loses the result, because of what `list.sort` gives back.',
      ],
      solution: {
        explanation:
          'Option a is the standard CITS1401 tie-break. `key=lambda row: (-row[1], row[0])` builds the tuple `(-85.0, \'mia\')`, `(-70.0, \'ana\')`, `(-70.0, \'zoe\')`. Sorting those smallest first puts the largest mark first and, when two marks tie, compares the names forwards.\n\n' +
          'Option b sorts on `(mark, name)` and then reverses everything, so the names come out backwards inside a tie.\n\n' +
          'Option c sorts correctly but assigns the return value of `sort`, which is always `None`.\n\n' +
          'Option d crashes: a string cannot be negated. If names had to be reversed as well, the usual trick is to sort twice, or to sort by name first and then by mark, because Python\'s sort is stable.',
      },
      selfExplain: 'Why does a tuple key compare the second item only when the first items are equal?',
    },
    {
      id: 't12-s4-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The rows that should have been skipped',
      prompt:
        '`valid_marks(lines)` returns the valid marks of a results file as a list of floats, in file order. `lines[0]` is the header, which includes `Mark` in any position and any letter case; every later string is a row. ' +
        'A row is skipped when it has a different number of comma-separated fields from the header.\n\n' +
        '`to_mark(text)` is already correct: it returns the mark as a float, or `None` when the text is not a number from 0 to 100.\n\n' +
        'Run the tests: files with an absent student or a mark out of range put `None` into the result. Fix `valid_marks` by changing at most two lines.',
      buggy: `def to_mark(text):
    """Return the mark as a float, or None if it is not a number from 0 to 100."""
    try:
        mark = float(text)
    except ValueError:
        return None
    if mark < 0 or mark > 100:
        return None
    return mark


def valid_marks(lines):
    """Return the valid marks of the rows in lines, in order."""
    header = lines[0].strip().lower().split(',')
    mark_col = header.index('mark')
    marks = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        mark = to_mark(fields[mark_col])
        marks.append(mark)
    return marks`,
      bugMistake: 'invalid_row_not_skipped',
      maxChangedLines: 2,
      fnName: 'valid_marks',
      tests: [
        {
          id: 'v1',
          setup: "lines = ['Unit,Student,Mark', 'CITS1401,s1,72', 'CITS1401,s2,64']",
          call: 'valid_marks(lines)',
          expect: '[72.0, 64.0]',
          cmp: 'float',
          label: 'every row valid',
          hidden: false,
        },
        {
          id: 'v2',
          setup: "lines = ['Unit,Student,Mark', 'CITS1401,s1,72', 'CITS1401,s2,absent', 'CITS1401,s3,58']",
          call: 'valid_marks(lines)',
          expect: '[72.0, 58.0]',
          cmp: 'float',
          label: 'a student marked absent',
          hidden: false,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h1',
          setup: "lines = ['Mark,Student,Unit', '105,s1,CITS1401', '-5,s2,CITS1401', '0,s3,CITS1401', '100,s4,CITS1401']",
          call: 'valid_marks(lines)',
          expect: '[0.0, 100.0]',
          cmp: 'float',
          label: 'marks outside 0 to 100, and the boundaries',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          setup: "lines = ['Unit,Student,Mark', '', 'CITS1401,s1', 'CITS1401,s2,66']",
          call: 'valid_marks(lines)',
          expect: '[66.0]',
          cmp: 'float',
          label: 'a blank line and a short row',
          hidden: true,
        },
        {
          id: 'h3',
          setup: "lines = ['Unit,Student,Mark', 'CITS1401,s1,absent', 'CITS1401,s2,']",
          call: 'valid_marks(lines)',
          expect: '[]',
          label: 'no valid rows at all',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
      ],
      concepts: ['validation', 'csv', 'none-check'],
      detects: ['invalid_row_not_skipped'],
      expectedSec: 240,
      hints: [
        '`to_mark` already tells the loop when a mark is no good. Look at what the loop does with that answer.',
        'A helper that reports failure by returning `None` is only useful if the caller checks for `None` before using the value. At the moment every row reaches `append`, valid or not.',
        'Guard the `append` with `if mark is not None:`.',
      ],
      solution: {
        code: `def to_mark(text):
    """Return the mark as a float, or None if it is not a number from 0 to 100."""
    try:
        mark = float(text)
    except ValueError:
        return None
    if mark < 0 or mark > 100:
        return None
    return mark


def valid_marks(lines):
    """Return the valid marks of the rows in lines, in order."""
    header = lines[0].strip().lower().split(',')
    mark_col = header.index('mark')
    marks = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        mark = to_mark(fields[mark_col])
        if mark is not None:
            marks.append(mark)
    return marks`,
        explanation:
          '`to_mark` has two ways of saying "this row is no good": `float()` raises `ValueError` for `absent` or an empty field, and a number outside 0 to 100 is rejected. Both return `None`.\n\n' +
          'The buggy loop appended whatever came back, so a file with an absent student produced `[72.0, None, 58.0]`. Anything that later adds those marks up would raise `TypeError`, and a marker comparing lists would fail straight away.\n\n' +
          '`if mark is not None:` keeps only the real marks. Use `is not None`, not `if mark:`, because a perfectly valid mark of `0.0` is falsy and `if mark:` would silently drop it (hidden test h1 checks exactly that).\n\n' +
          'The length check above it already skips blank lines and short rows, so after the fix every value in `marks` is a float from a complete, sensible row.',
      },
      selfExplain: 'Why would if mark: instead of if mark is not None: still fail one of the tests?',
    },
    {
      id: 't12-s4-q4',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Project task: standardised marks',
      prompt:
        'A mark of 64 means something different in a hard unit than in an easy one, so the board reports the **z-score** `(mark − mean) / s`, where `s` is the sample standard deviation of the unit.\n\n' +
        'Write `main(csvfile, unit)`. `csvfile` is a file name; it may not end in `.csv`, so open it exactly as given. The first line is a header that includes `Unit`, `Student` and `Mark`, in any order, in any letter case, and possibly with extra columns.\n\n' +
        'Return a **dictionary** `{student: [mark, z_score]}` for the valid rows of `unit`: each student key in lower case with spaces removed, each `mark` a float, and each `z_score` rounded to 4 decimal places.\n\n' +
        'Rules:\n\n' +
        '- Unit names match ignoring letter case and spaces around them.\n' +
        '- Skip a row that is blank, has a different number of comma-separated fields from the header, has a blank student, or whose mark is not a number from 0 to 100.\n' +
        '- If a student has more than one valid row in that unit, keep only the first.\n' +
        '- Use the sample standard deviation `s = √( Σ (x − mean)² / (n − 1) )`.\n' +
        '- Return `None` if either argument is not a string, the file cannot be opened, the unit has fewer than 2 valid rows, or `s` is 0 (every mark the same), because the z-score would divide by zero.\n' +
        '- No `import`, `input()` or `print()`, and round only the values you return.\n\n' +
        "Example: for the visible file, `main('results_a', 'CITS1401')` returns `{'s2201': [72.0, -0.2182], 's3388': [88.0, 1.0911], 's4102': [64.0, -0.8729]}`.",
      fnName: 'main',
      starter: `def main(csvfile, unit):
    """Return {student: [mark, z_score]} for unit, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('results_a', 'CITS1401')",
          expect: "{'s2201': [72.0, -0.2182], 's3388': [88.0, 1.0911], 's4102': [64.0, -0.8729]}",
          cmp: 'float',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'three students in one unit',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('results_a', 'math1011')",
          expect: "{'s2201': [55.0, -0.7071], 's4102': [78.0, 0.7071]}",
          cmp: 'float',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'unit name given in lower case',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h1',
          call: "main('results_b', 'CITS1401')",
          expect: "{'s7001': [81.0, 0.1438], 's7002': [67.0, -1.0641], 's7003': [90.0, 0.9203]}",
          cmp: 'float',
          files: [{ name: 'results_b', content: RESULTS_B }],
          label: 'columns in a different order, an extra column, a repeated student',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('results_messy', 'CITS1401')",
          expect: "{'s8001': [74.0, 1.0], 's8006': [58.0, -1.0], 's8007': [66.0, 0.0]}",
          cmp: 'float',
          files: [{ name: 'results_messy', content: RESULTS_MESSY }],
          label: 'blank, short, out-of-range and student-less rows',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          call: "main('results_messy', 'MATH1011')",
          expect: 'None',
          files: [{ name: 'results_messy', content: RESULTS_MESSY }],
          label: 'unit with only one valid row',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h4',
          call: "main('results_same', 'PHYS1001')",
          expect: 'None',
          files: [{ name: 'results_same', content: RESULTS_SAME }],
          label: 'every mark the same, so s is 0',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h5',
          call: "main('results_2030', 'CITS1401')",
          expect: 'None',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          call: "main('results_a', 1401)",
          expect: 'None',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'unit is not a string',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      concepts: ['statistics', 'standard-deviation', 'nested-dict', 'header-lookup', 'main-contract'],
      detects: [
        'header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare', 'no_graceful_exit',
        'zero_division', 'round_mid_calc', 'csv_ext_assumed', 'import_used', 'print_in_main',
      ],
      expectedSec: 900,
      hints: [
        'Three separate jobs: collect the valid marks of the unit, work out the mean and s from them, then build the answer. A dictionary of student to mark from the first job is exactly what the third job needs.',
        'Plan: check both arguments with `isinstance`, then read the lines inside `try`/`except OSError`. Lower-case the header and find the three columns with `index`. For each row, skip it if the field count differs, the unit does not match, the student is blank or already collected, `float()` raises ValueError, or the mark is outside 0 to 100. Then: fewer than 2 marks means None; work out the mean, the sum of squared differences and `s` at full precision; `s == 0` means None; finally build `{student: [mark, round(z, 4)]}`.',
        `\`\`\`python
mean = sum(values) / n
total = 0
for x in values:
    total = total + (x - mean) ** 2
std = (total / (n - 1)) ** 0.5
\`\`\``,
      ],
      solution: {
        code: `def read_marks(lines, unit):
    """Return {student: mark} for the first valid row of each student in unit."""
    header = lines[0].strip().lower().split(',')
    unit_col = header.index('unit')
    student_col = header.index('student')
    mark_col = header.index('mark')
    wanted = unit.strip().lower()
    marks = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[unit_col].strip().lower() != wanted:
            continue
        student = fields[student_col].strip().lower()
        if student == '' or student in marks:
            continue
        try:
            mark = float(fields[mark_col])
        except ValueError:
            continue
        if mark < 0 or mark > 100:
            continue
        marks[student] = mark
    return marks


def mean_std(values):
    """Full-precision (mean, sample standard deviation). Needs at least 2 values."""
    n = len(values)
    mean = sum(values) / n
    total = 0
    for x in values:
        total = total + (x - mean) ** 2
    return mean, (total / (n - 1)) ** 0.5


def main(csvfile, unit):
    """Return {student: [mark, z_score]} for unit, or None."""
    if not isinstance(csvfile, str) or not isinstance(unit, str):
        return None
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    marks = read_marks(lines, unit)
    if len(marks) < 2:
        return None
    mean, std = mean_std(list(marks.values()))
    if std == 0:
        return None
    scores = {}
    for student, mark in marks.items():
        scores[student] = [mark, round((mark - mean) / std, 4)]
    return scores`,
        explanation:
          '**Arguments and file.** The `isinstance` checks run before anything else, so a number never reaches `strip`. `with open(csvfile)` inside `try` reads the file once and closes it; a missing file raises `OSError` and `main` returns `None` instead of crashing. The name is used exactly as given, with no `.csv` added or checked.\n\n' +
          '**Columns.** The header is lower-cased and each column is found with `header.index(...)`, so the shuffled file with its extra `Campus` column reads correctly.\n\n' +
          '**Valid rows.** A blank line strips to `\'\'` and splits into one field, so the length check skips it along with short rows. `student in marks` keeps the first row for a repeated student, which is why `s7001`\'s second mark of 58 is ignored. `float()` rejects `absent` and empty fields, and the range check rejects 105 and −5.\n\n' +
          '**Statistics.** `mean_std` returns unrounded values, and the z-score divides by that unrounded `s`. Rounding `s` first would move the 4th decimal place of several z-scores.\n\n' +
          '**Two guards before dividing.** Fewer than 2 marks would make `n - 1` zero, and an `s` of 0 would make the z-score divide by zero. Both return `None`, which is what "terminate gracefully" means here.\n\n' +
          '**Output.** Only the z-score is rounded, as it goes into the returned dictionary, and the mark stays the float it was read as.',
      },
      selfExplain: 'Why is s == 0 checked separately, even though the file it comes from has two valid rows?',
    },
    {
      id: 't12-s4-q5',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: false,
      title: 'Project task: the top three in every unit',
      prompt:
        'Write `main(csvfile)`. The header includes `Unit`, `Student` and `Mark`, in any order and letter case, possibly with extra columns. Open the file name exactly as given.\n\n' +
        'A student can have several rows in a unit (one per assessment). Their score for that unit is the **mean** of their valid marks.\n\n' +
        'Return a **dictionary** `{unit: [(student, mean_mark), ...]}` holding at most the **three** best students of each unit: highest mean first, and students with the same mean (before rounding) in alphabetical order. Unit and student keys are lower case with spaces removed, and each mean is rounded to 4 decimal places.\n\n' +
        'Rules:\n\n' +
        '- Skip a row that is blank, has a different number of comma-separated fields from the header, has a blank unit or student, or whose mark is not a number from 0 to 100.\n' +
        '- A unit with no valid rows does not appear in the result. If no row anywhere is valid, return the empty dictionary `{}`.\n' +
        '- Return `None` if `csvfile` is not a string or the file cannot be opened.\n' +
        '- No `import`, `input()` or `print()`, and round only the values you return.\n\n' +
        "Example: for the visible file, `main('results_multi')` returns `{'cits1401': [('s3388', 89.5), ('s2201', 68.0), ('s4102', 64.0)], 'math1011': [('s4102', 78.0), ('s2201', 55.0)]}`.",
      fnName: 'main',
      starter: `def main(csvfile):
    """Return {unit: [(student, mean_mark), ...]} with the top three of each unit, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('results_multi')",
          expect: "{'cits1401': [('s3388', 89.5), ('s2201', 68.0), ('s4102', 64.0)], 'math1011': [('s4102', 78.0), ('s2201', 55.0)]}",
          cmp: 'float',
          files: [{ name: 'results_multi', content: RESULTS_MULTI }],
          label: 'two assessments each in one unit',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('results_a')",
          expect: "{'cits1401': [('s3388', 88.0), ('s2201', 72.0), ('s4102', 64.0)], 'math1011': [('s4102', 78.0), ('s2201', 55.0)]}",
          cmp: 'float',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'one row per student',
          hidden: false,
        },
        {
          id: 'h1',
          call: "main('results_ties')",
          expect: "{'cits2002': [('mia', 85.0), ('ana', 70.0), ('zoe', 70.0)]}",
          cmp: 'float',
          files: [{ name: 'results_ties', content: RESULTS_TIES }],
          label: 'equal means, and a fourth student who misses out',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h2',
          call: "main('results_messy')",
          expect: "{'cits1401': [('s8001', 74.0), ('s8007', 66.0), ('s8006', 58.0)], 'math1011': [('s8001', 40.0)]}",
          cmp: 'float',
          files: [{ name: 'results_messy', content: RESULTS_MESSY }],
          label: 'blank, short, out-of-range and unit-only rows',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          call: "main('results_b')",
          expect: "{'cits1401': [('s7003', 90.0), ('s7001', 69.5), ('s7002', 67.0)]}",
          cmp: 'float',
          files: [{ name: 'results_b', content: RESULTS_B }],
          label: 'columns in a different order, and one student counted twice',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h4',
          call: "main('results_none')",
          expect: '{}',
          files: [{ name: 'results_none', content: RESULTS_NONE }],
          label: 'no valid rows anywhere',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h5',
          call: "main('results_2030')",
          expect: 'None',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          call: 'main(99)',
          expect: 'None',
          files: [{ name: 'results_a', content: RESULTS_A }],
          label: 'file name is not a string',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      concepts: ['nested-dict', 'ranking', 'sort-tiebreak', 'csv', 'main-contract'],
      detects: [
        'sort_tiebreak', 'header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare',
        'no_graceful_exit', 'dict_keyerror', 'round_mid_calc', 'csv_ext_assumed',
      ],
      expectedSec: 900,
      hints: [
        'Two stages again. Stage 1 walks the file once and collects, for each unit and student, a running total and a count. Stage 2 touches no file: it turns each unit into a list, sorts it and keeps three.',
        'Plan: read the lines inside `try`/`except OSError`. Find the three columns by name. For each valid row, add an empty inner dictionary the first time a unit appears, and `[0, 0]` the first time a student appears in it; then add the mark to the total and 1 to the count. Afterwards, for each unit, build `(student, total / count)` pairs, sort them with a key of `(-mean, student)`, keep the first three and round each mean as you put it into the result.',
        `\`\`\`python
rows.sort(key=lambda row: (-row[1], row[0]))
top = []
for student, mean in rows[:3]:
    top.append((student, round(mean, 4)))
\`\`\``,
      ],
      solution: {
        code: `def collect(lines):
    """Return {unit: {student: [total, count]}} for the valid rows of lines."""
    header = lines[0].strip().lower().split(',')
    unit_col = header.index('unit')
    student_col = header.index('student')
    mark_col = header.index('mark')
    totals = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        unit = fields[unit_col].strip().lower()
        student = fields[student_col].strip().lower()
        if unit == '' or student == '':
            continue
        try:
            mark = float(fields[mark_col])
        except ValueError:
            continue
        if mark < 0 or mark > 100:
            continue
        if unit not in totals:
            totals[unit] = {}
        if student not in totals[unit]:
            totals[unit][student] = [0, 0]
        totals[unit][student][0] = totals[unit][student][0] + mark
        totals[unit][student][1] = totals[unit][student][1] + 1
    return totals


def top_three(students):
    """Return the best three (student, mean) pairs, means rounded to 4 dp."""
    rows = []
    for student, pair in students.items():
        rows.append((student, pair[0] / pair[1]))
    rows.sort(key=lambda row: (-row[1], row[0]))
    top = []
    for student, mean in rows[:3]:
        top.append((student, round(mean, 4)))
    return top


def main(csvfile):
    """Return {unit: [(student, mean_mark), ...]} with the top three of each unit, or None."""
    if not isinstance(csvfile, str):
        return None
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    totals = collect(lines)
    result = {}
    for unit, students in totals.items():
        result[unit] = top_three(students)
    return result`,
        explanation:
          '**One pass over the file.** `collect` reads every row once and builds a dictionary of dictionaries. The two `if ... not in ...` guards create the inner dictionary and the `[total, count]` pair only the first time they are needed; without them the code would raise `KeyError` on the first row of every unit.\n\n' +
          '**Why a total and a count.** A student can appear several times, and the mean of their marks is needed, so the running total and the number of marks are both kept. Storing a list of marks would work too.\n\n' +
          '**Validation.** The length check skips blank lines and the short `CITS1401,s8005,Project` row. A blank unit or student is skipped, `float()` rejects `absent`, and the range check rejects 105 and −5. Names are lower-cased and stripped as they are read, so ` s7002 ` and `S7001` match their tidy versions.\n\n' +
          '**Ranking.** `top_three` works out each mean at full precision, sorts on `(-mean, student)` so the best mean comes first and equal means are separated alphabetically, then slices the first three. In the ties file `ana` and `zoe` both average 70.0 and `bo` misses out.\n\n' +
          '**Output.** The means are rounded only as the tuples go into the returned list. A file with no valid rows leaves `totals` empty, so the loop adds nothing and `{}` comes back, while an unopenable file returns `None`.',
      },
      selfExplain: 'Why does sorting have to happen before the means are rounded?',
    },
  ],
};

export default s4;
