import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

// Virtual files for the project item. No .csv ending, shuffled headers, an extra column,
// a blank line, a negative number, text where a number belongs, a missing borrower and mixed case.
const LOANS_MAY = md(
  'Title,Category,Borrower,Days',
  'Dune,fiction,s2201,10',
  'The Martian,fiction,S2201,21',
  'Python Crash Course,textbook,s3388,14',
  'Deep Learning,textbook,s4102,30',
  'Sapiens,nonfiction,s3388,7',
  '',
);
const LOANS_JUN = md(
  'Days,Branch,BORROWER,Title,Category',
  '9,Reid,s5001,Educated,nonfiction',
  '21,Reid,S5001,Wolf Hall,NonFiction',
  '',
  '14,Barry Watson,s5002,Circe,nonfiction',
  '-3,Reid,s5003,Hamnet,nonfiction',
  'many,Reid,s5004,Beloved,nonfiction',
  '12,Reid,,Normal People,nonfiction',
  '11,Reid,s5005,Klara and the Sun, nonfiction ',
  '6,Reid,s5002,The Overstory,fiction',
  '',
);

const scenario: Scenario = {
  id: 't11-s5',
  title: 'Reid Library loans desk',
  story: md(
    'The Reid Library circulation desk exports its loans as comma-separated text: what was borrowed, by which student card, in which category, and for how many days.',
    'Noor is writing the reporting functions. The desk runs them from one `main`, so the defaults, the helpers and the rounding all have to be decided before a single loop is written.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 predict
    {
      id: 't11-s5-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'When is a default worked out?',
      prompt: 'The standard loan was 14 days, then the library changed it to 28. Type exactly what this program prints.',
      code: `LOAN_DAYS = 14


def due_day(start, days=LOAN_DAYS):
    return start + days


LOAN_DAYS = 28
print(due_day(1))
print(due_day(1, LOAN_DAYS))
print(due_day(1, days=7))`,
      mutants: [
        {
          code: `LOAN_DAYS = 14


def due_day(start, days=None):
    if days is None:
        days = LOAN_DAYS
    return start + days


LOAN_DAYS = 28
print(due_day(1))
print(due_day(1, LOAN_DAYS))
print(due_day(1, days=7))`,
          mistake: 'global_state',
        },
        {
          code: `LOAN_DAYS = 14


def due_day(start, days=LOAN_DAYS):
    return start + LOAN_DAYS


LOAN_DAYS = 28
print(due_day(1))
print(due_day(1, LOAN_DAYS))
print(due_day(1, days=7))`,
          mistake: 'scope_confusion',
        },
      ],
      concepts: ['default-parameters', 'keyword-arguments', 'local-scope'],
      detects: ['scope_confusion', 'global_state'],
      expectedSec: 180,
      hints: [
        'Two different moments matter: when Python runs the `def` line, and when each call happens. Which of those two fixes the value of `days`?',
        'A default value is worked out once, while the `def` line runs, and then kept with the function. Later assignments to the variable it came from do not reach back into the function. Each call then either uses that stored default or the argument it was given.',
        'On line 4 the default becomes 14 and stays 14. Line 10 passes the current `LOAN_DAYS` in as an argument, and line 11 passes 7 by name.',
      ],
      solution: {
        explanation: md(
          '1. Line 1 sets `LOAN_DAYS` to 14.',
          '2. Line 4 runs the `def`. Python works out `LOAN_DAYS` **now** and stores 14 as the default for `days`. The function does not remember the name `LOAN_DAYS`, only the value 14.',
          '3. Line 8 sets `LOAN_DAYS` to 28. The stored default does not change.',
          '4. Line 9 leaves `days` out, so the stored default 14 is used: `1 + 14` prints `15`.',
          '5. Line 10 passes the current value of `LOAN_DAYS`, 28, as an argument: `1 + 28` prints `29`.',
          '6. Line 11 passes `days=7` by name: `1 + 7` prints `8`.',
          '',
          'So the output is `15`, `29`, `8`. If the default really has to follow a value that can change, use `days=None` and pick the value up inside the function.',
        ),
      },
      selfExplain: 'Why does line 9 still use 14 even though LOAN_DAYS is 28 by the time the call happens?',
    },

    // ---------------------------------------------------------------- q2 mcq
    {
      id: 't11-s5-q2',
      format: 'mcq',
      diff: 'medium',
      core: true,
      title: 'Where the rounding belongs',
      prompt: md(
        '`main(csvfile)` must return `[mean_days, mean_fine]`: the mean number of days a book is out, and the mean fine at 25 cents per day, both rounded to 4 decimal places.',
        '',
        'The project rules say to round only when a value goes into the returned result. Which helper and return line follow that rule?',
      ),
      options: [
        {
          id: 'a',
          correct: true,
          text: `def mean_days(days):
    return sum(days) / len(days)

# inside main
mean = mean_days(day_list)
return [round(mean, 4), round(mean * 0.25, 4)]`,
          why: 'Correct. The helper hands back the mean at full precision, so the multiplication uses every digit. Rounding happens twice, but only as the two values go into the returned list.',
        },
        {
          id: 'b',
          mistake: 'round_mid_calc',
          text: `def mean_days(days):
    return round(sum(days) / len(days), 4)

# inside main
mean = mean_days(day_list)
return [mean, round(mean * 0.25, 4)]`,
          why: 'The helper rounds a value that `main` then multiplies by 0.25, so up to 0.00005 of error is carried into the fine and its 4th decimal place can be wrong. A helper whose result is used again must not round.',
        },
        {
          id: 'c',
          mistake: 'print_in_main',
          text: `def mean_days(days):
    mean = sum(days) / len(days)
    print('mean days', mean)
    return mean

# inside main
mean = mean_days(day_list)
return [round(mean, 4), round(mean * 0.25, 4)]`,
          why: 'The arithmetic is right, but the `print` is extra output. The rules allow `print` only in a message while terminating gracefully after an error, and a leftover debugging print costs marks.',
        },
        {
          id: 'd',
          mistake: 'return_type_wrong',
          text: `def mean_days(days):
    return sum(days) / len(days)

# inside main
mean = mean_days(day_list)
return round(mean, 4), round(mean * 0.25, 4)`,
          why: 'The rounding is in the right place, but this returns a tuple `(mean, fine)`, not the list the specification asks for. A marker comparing against a list fails this.',
        },
      ],
      concepts: ['round-at-output', 'helper-functions', 'return-type', 'project-rules'],
      detects: ['round_mid_calc', 'print_in_main', 'return_type_wrong'],
      expectedSec: 150,
      hints: [
        'Ask three questions of each version: is any rounded value used in more maths, does anything get printed, and is the returned thing a list?',
        'The rule is about timing, not about how many `round` calls there are. A value that is used again must keep every digit; a value that goes straight into the result may be rounded.',
        'Only one version keeps the helper unrounded, prints nothing and returns a list.',
      ],
      solution: {
        explanation: md(
          '- (a) is correct. `mean_days` returns the full-precision mean, `main` multiplies it and rounds both values only as they go into the returned list.',
          '- (b) rounds in the helper, and that rounded mean is then multiplied by 0.25, so the fine is worked out from a value that has already lost precision.',
          '- (c) prints. Only the returned list is marked, and extra output breaks the tester.',
          '- (d) returns a tuple instead of a list. The specification states the return type, and matching it exactly is part of the task.',
        ),
      },
      selfExplain: 'In option (b), what is the largest amount the rounded mean can be out by, and how does that reach mean_fine?',
    },

    // ---------------------------------------------------------------- q3 fixBug
    {
      id: 't11-s5-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The column that moved',
      prompt: md(
        '`loan_counts(lines, category)` counts how many rows of a loans file belong to one category. `lines` is the list of lines read from the file: `lines[0]` is the header, and every later string is a row.',
        '',
        'Categories are compared ignoring letter case and spaces, and a row with the wrong number of fields is skipped. It returns an int.',
        '',
        'It works on the file Noor tested with, but the desk re-exported the file with the columns in a different order and now everything counts as 0. Fix it by changing one line.',
      ),
      buggy: `def loan_counts(lines, category):
    """Return how many rows of lines are loans in category (ignoring case)."""
    header = lines[0].strip().lower().split(',')
    cat_col = header.index('category')
    wanted = category.strip().lower()
    total = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[1].strip().lower() == wanted:
            total = total + 1
    return total`,
      bugMistake: 'header_order_assumed',
      maxChangedLines: 1,
      fnName: 'loan_counts',
      tests: [
        {
          id: 'v1',
          setup: "lines = ['Title,Category,Days', 'Dune,fiction,10', 'Python Crash Course,textbook,21', 'Ulysses,FICTION,7']",
          call: "loan_counts(lines, 'fiction')",
          expect: '2',
          label: 'category in the second column',
          hidden: false,
        },
        {
          id: 'v2',
          setup: "lines = ['Category,Title,Days', 'fiction,Dune,10', 'textbook,Python Crash Course,21', 'FICTION,Ulysses,7']",
          call: "loan_counts(lines, 'fiction')",
          expect: '2',
          label: 'the re-exported file, category first',
          hidden: false,
          tag: 'header_order_assumed',
        },
        {
          id: 'h1',
          setup: "lines = ['Title,Days,Branch,Category', 'Dune,10,Reid,fiction', 'Circe,7,Barry Watson, Fiction ', 'Deep Learning,30,Reid,textbook']",
          call: "loan_counts(lines, 'fiction')",
          expect: '2',
          label: 'an extra column, category last, spaces around a name',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          setup: "lines = ['Title,Days,Branch,Category', 'Dune,10,Reid,fiction', 'Deep Learning,30,Reid,textbook']",
          call: "loan_counts(lines, 'poetry')",
          expect: '0',
          label: 'category that is not in the file',
          hidden: true,
        },
        {
          id: 'h3',
          setup: "lines = ['Title,Category,Days', '', 'Dune,fiction', 'Circe,fiction,7', 'Emma,poetry,3']",
          call: "loan_counts(lines, 'fiction')",
          expect: '1',
          label: 'a blank line and a short row are skipped',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          setup: "lines = ['Category,Title,Days', 'textbook,Python Crash Course,21']",
          call: "loan_counts(lines, '  TEXTBOOK ')",
          expect: '1',
          label: 'category given with capitals and spaces',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
      ],
      concepts: ['header-lookup', 'csv', 'helper-functions'],
      detects: ['header_order_assumed'],
      expectedSec: 240,
      hints: [
        'Line 4 already works out where the category column is. Read the loop and ask whether that answer is ever used.',
        'Finding a column by header name only helps if the row is then read from that position. A fixed position such as `fields[1]` is a guess about the file, and the tester changes the file.',
        'The `if` in the loop should use `fields[cat_col]`.',
      ],
      solution: {
        code: `def loan_counts(lines, category):
    """Return how many rows of lines are loans in category (ignoring case)."""
    header = lines[0].strip().lower().split(',')
    cat_col = header.index('category')
    wanted = category.strip().lower()
    total = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[cat_col].strip().lower() == wanted:
            total = total + 1
    return total`,
        explanation: md(
          '1. Line 3 lower-cases the header and splits it, so `header` is a list such as `[\'category\', \'title\', \'days\']`.',
          '2. Line 4 asks that list where the category column sits. In the first file that is position 1; in the re-exported file it is position 0.',
          '3. The buggy line ignored `cat_col` and always read `fields[1]`, which in the new file holds the title, so nothing ever matched.',
          '4. `fields[cat_col]` reads the category wherever the column is, which is why the file with four columns and the category last also works.',
          '5. The rest is unchanged: `strip().lower()` on both sides makes the comparison ignore case and spaces, and the length check skips blank lines and short rows.',
        ),
      },
      selfExplain: 'Why does the length check on line 9 also deal with blank lines?',
    },

    // ---------------------------------------------------------------- q4 write project
    {
      id: 't11-s5-q4',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Project task: one category of loans',
      prompt: md(
        'Write `main(csvfile, category)` for the loans report, following every CITS1401 project rule: no imports, no `input()`, no `print()` except when terminating gracefully, no assumption that the file name ends in `.csv`, and rounding only in the returned result.',
        '',
        '**The file.** The first line is a header with at least the columns `Category`, `Borrower` and `Days`. The columns can be in any order and any letter case, and there may be extra columns.',
        '',
        '**Valid rows.** Use a row only if it has as many fields as the header, its category matches `category` (ignoring letter case and spaces around the name), its borrower card is not blank, and its `Days` converts with `int()` to a whole number that is **0 or more**. Skip every other row, including blank lines.',
        '',
        '**Return** a list `[loans, borrowers, mean_days, overdue_rate]`:',
        '',
        '- `loans`: how many valid rows there are (an int);',
        '- `borrowers`: how many **different** borrower cards those rows use, compared ignoring letter case and spaces (an int);',
        '- `mean_days`: the mean of `Days` over the valid rows, rounded to 4 dp;',
        '- `overdue_rate`: the proportion of valid rows with `Days` **more than 14**, rounded to 4 dp.',
        '',
        '**Terminate gracefully** by returning `None` if either argument is not a string, the file cannot be opened, or the category has no valid rows.',
        '',
        "Example: for the visible file, `main('loans_may', 'fiction')` returns `[2, 1, 15.5, 0.5]`. Splitting the work into helpers such as `read_loans(csvfile, category)` and `summarise(loans)` keeps `main` short.",
      ),
      fnName: 'main',
      starter: `def main(csvfile, category):
    """Return [loans, borrowers, mean_days, overdue_rate] for category, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('loans_may', 'fiction')",
          expect: '[2, 1, 15.5, 0.5]',
          cmp: 'float',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'fiction, one student borrowing twice',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('loans_may', 'textbook')",
          expect: '[2, 2, 22.0, 0.5]',
          cmp: 'float',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'textbooks, two different students',
          hidden: false,
        },
        {
          id: 'h1',
          call: "main('loans_may', 'FICTION')",
          expect: '[2, 1, 15.5, 0.5]',
          cmp: 'float',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'category given in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          call: "main('loans_jun.txt', 'nonfiction')",
          expect: '[4, 3, 13.75, 0.25]',
          cmp: 'float',
          files: [{ name: 'loans_jun.txt', content: LOANS_JUN }],
          label: 'columns in a different order, an extra column, capital headers',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h3',
          call: "main('loans_jun.txt', 'fiction')",
          expect: '[1, 1, 6.0, 0.0]',
          cmp: 'float',
          files: [{ name: 'loans_jun.txt', content: LOANS_JUN }],
          label: 'blank, negative, non-numeric and borrower-less rows are skipped',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          call: "main('loans_may', 'poetry')",
          expect: 'None',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'category with no rows',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h5',
          call: "main('loans_july', 'fiction')",
          expect: 'None',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          call: "main('loans_may', 7)",
          expect: 'None',
          files: [{ name: 'loans_may', content: LOANS_MAY }],
          label: 'category is not a string',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      concepts: ['main-contract', 'helper-functions', 'header-lookup', 'graceful-termination', 'round-at-output'],
      detects: [
        'missing_main', 'csv_ext_assumed', 'header_order_assumed', 'invalid_row_not_skipped', 'no_graceful_exit',
        'zero_division', 'case_sensitive_compare', 'print_in_main', 'round_mid_calc', 'import_used', 'input_called',
      ],
      expectedSec: 900,
      hints: [
        'Decide the shape before writing any loop: there is one normal result and four ways to end with `None`. Checking the arguments first and returning early keeps the rest of the code flat.',
        'Plan: (1) return None if either argument is not a string; (2) a helper opens the file inside `try`/`except OSError` and returns None if that fails; (3) lower-case the header and find the category, borrower and days columns with `index`; (4) for each later line, split it and skip it if the field count is wrong, the category does not match, the borrower is blank, `int()` raises ValueError or the number is negative; (5) if nothing is left, return None; (6) count the different borrower cards by keeping a list of the ones already seen, add up the days at full precision, and round only in the returned list.',
        md(
          '```python',
          'borrowers = []',
          'for borrower, days in loans:',
          '    if borrower not in borrowers:',
          '        borrowers.append(borrower)',
          '```',
        ),
      ],
      solution: {
        code: `def read_loans(csvfile, category):
    """Return the valid (borrower, days) pairs for category, or None if the file will not open."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    if len(lines) == 0:
        return []
    header = lines[0].strip().lower().split(',')
    if 'category' not in header or 'borrower' not in header or 'days' not in header:
        return []
    cat_col = header.index('category')
    borrower_col = header.index('borrower')
    days_col = header.index('days')
    wanted = category.strip().lower()
    loans = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[cat_col].strip().lower() != wanted:
            continue
        borrower = fields[borrower_col].strip().lower()
        if borrower == '':
            continue
        try:
            days = int(fields[days_col])
        except ValueError:
            continue
        if days < 0:
            continue
        loans.append((borrower, days))
    return loans


def summarise(loans):
    """Return [loans, borrowers, mean days, overdue rate] at full precision."""
    total = 0
    overdue = 0
    borrowers = []
    for borrower, days in loans:
        total = total + days
        if days > 14:
            overdue = overdue + 1
        if borrower not in borrowers:
            borrowers.append(borrower)
    return [len(loans), len(borrowers), total / len(loans), overdue / len(loans)]


def main(csvfile, category):
    """Return [loans, borrowers, mean_days, overdue_rate] for category, or None."""
    if not isinstance(csvfile, str) or not isinstance(category, str):
        return None
    loans = read_loans(csvfile, category)
    if loans is None or len(loans) == 0:
        return None
    count, borrowers, mean_days, overdue_rate = summarise(loans)
    return [count, borrowers, round(mean_days, 4), round(overdue_rate, 4)]`,
        explanation: md(
          '1. `main` has exactly the signature the task gives and stays four steps long: check the arguments, read, summarise, round and return.',
          '2. The `isinstance` checks come first, so a number or a list never reaches `open` or `strip`.',
          '3. `read_loans` opens the name exactly as it was given, inside `try`/`except OSError`, so a missing file returns `None` rather than crashing. There is no `.csv` anywhere in the code.',
          '4. The header is lower-cased and each column is found by name, so the June file with its shuffled columns, capital headers and extra `Branch` column reads correctly.',
          '5. Each row is checked before it is used: the right number of fields (which also skips blank lines and the short `Days`-less row), a matching category after `strip().lower()`, a borrower card that is not blank, and a `Days` value that `int()` accepts and that is not negative.',
          '6. `summarise` counts different borrowers by keeping a list of the cards already seen, so `s2201` and `S2201` count once because the card was lower-cased when it was read.',
          '7. `main` returns `None` before any division when there are no valid rows, so `ZeroDivisionError` cannot happen.',
          '8. The mean and the rate are worked out at full precision and rounded only as they go into the returned list. `loans` and `borrowers` stay ints.',
        ),
      },
      selfExplain: 'Which hidden test would fail if read_loans returned [] instead of None when the file cannot be opened?',
    },

    // ---------------------------------------------------------------- q5 write function
    {
      id: 't11-s5-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Overdue fines with sensible defaults',
      prompt: md(
        'The desk prints an overdue list at closing time. Write `overdue_report(loans, free_days=14, daily_fine=0.25, max_fine=None)`.',
        '',
        '- `loans` is a list of `(borrower, days)` tuples. Ignore any loan of `free_days` days or fewer.',
        '- A fine is `(days - free_days) * daily_fine`. When `max_fine` is not `None` and the fine is above it, charge `max_fine` instead.',
        '- Return a **list of `(borrower, fine)` tuples**, with each fine rounded to 2 decimal places, ordered by fine from largest to smallest. Loans with the same fine (before rounding) come out in alphabetical order of borrower.',
        '- Return an empty list `[]` when nothing is overdue, including when `loans` is empty. Do not change `loans`.',
        '',
        "Example: `overdue_report([('ana', 20), ('ben', 14), ('cara', 30)])` returns `[('cara', 4.0), ('ana', 1.5)]`.",
      ),
      fnName: 'overdue_report',
      starter: `def overdue_report(loans, free_days=14, daily_fine=0.25, max_fine=None):
    """Return the overdue (borrower, fine) tuples, dearest first, fines to 2 dp."""
    pass`,
      rules: ['noImport', 'roundAtEnd'],
      tests: [
        {
          id: 'v1',
          call: "overdue_report([('ana', 20), ('ben', 14), ('cara', 30)])",
          expect: "[('cara', 4.0), ('ana', 1.5)]",
          cmp: 'float',
          label: 'three loans, one of them on time',
          hidden: false,
        },
        {
          id: 'v2',
          call: "overdue_report([('ben', 14), ('dee', 3)])",
          expect: '[]',
          label: 'nothing overdue',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'overdue_report([])',
          expect: '[]',
          label: 'no loans at all',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h2',
          call: "overdue_report([('zoe', 20), ('ana', 20), ('mia', 24)])",
          expect: "[('mia', 2.5), ('ana', 1.5), ('zoe', 1.5)]",
          cmp: 'float',
          label: 'equal fines are ordered by name',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h3',
          call: "overdue_report([('ana', 100)], max_fine=12.5)",
          expect: "[('ana', 12.5)]",
          cmp: 'float',
          label: 'a fine above the cap',
          hidden: true,
        },
        {
          id: 'h4',
          call: "overdue_report([('ana', 10)], 7, 1.0)",
          expect: "[('ana', 3.0)]",
          cmp: 'float',
          label: 'a shorter free period and a higher daily fine',
          hidden: true,
        },
        {
          id: 'h5',
          call: "overdue_report([('ana', 17)], 14, 0.2)",
          expect: "[('ana', 0.6)]",
          cmp: 'float',
          label: 'float arithmetic tidied by rounding at the end',
          hidden: true,
          tag: 'round_mid_calc',
        },
        {
          id: 'h6',
          setup: "loans = [('ana', 20), ('ben', 2), ('cara', 30)]",
          call: 'overdue_report(loans)',
          expect: "[('cara', 4.0), ('ana', 1.5)]",
          cmp: 'float',
          argsUnchanged: ['loans'],
          label: 'the loans list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['default-parameters', 'none-default', 'sort-tiebreak', 'round-at-output'],
      detects: ['sort_tiebreak', 'mutated_input', 'return_type_wrong', 'no_graceful_exit', 'round_mid_calc'],
      expectedSec: 600,
      hints: [
        'Work in two stages: build a list of the overdue loans with their full-precision fines, then put that list in order and round as you build the answer. Deciding the order first and rounding second is what makes ties behave.',
        'Plan: loop over `loans` and skip any loan of `free_days` days or fewer. Work out the fine, and lower it to `max_fine` when `max_fine is not None` and the fine is above it. Append `(borrower, fine)` to a new list. Sort that list so the largest fine comes first and equal fines are ordered by name. Finally build the returned list with each fine rounded to 2 dp.',
        md(
          '```python',
          'overdue.sort(key=lambda pair: (-pair[1], pair[0]))',
          '```',
          '',
          'A negative key sorts that value from largest to smallest while the name still sorts A to Z.',
        ),
      ],
      solution: {
        code: `def overdue_report(loans, free_days=14, daily_fine=0.25, max_fine=None):
    """Return the overdue (borrower, fine) tuples, dearest first, fines to 2 dp."""
    overdue = []
    for borrower, days in loans:
        if days <= free_days:
            continue
        fine = (days - free_days) * daily_fine
        if max_fine is not None and fine > max_fine:
            fine = max_fine
        overdue.append((borrower, fine))
    overdue.sort(key=lambda pair: (-pair[1], pair[0]))
    report = []
    for borrower, fine in overdue:
        report.append((borrower, round(fine, 2)))
    return report`,
        explanation: md(
          '1. `overdue` is a new list built inside the function, so `loans` itself is never touched and a second call starts from nothing.',
          '2. `if days <= free_days: continue` is a guard: a loan that is exactly at the limit is not overdue, so 14 days is free with the default.',
          '3. `max_fine=None` is the safe way to say "no cap". `None` cannot be compared with `>` sensibly, so the check asks `max_fine is not None` first and only then compares.',
          '4. The fines put into `overdue` are unrounded, which matters for the order: two loans that both come to 1.5 are a genuine tie and are then separated by name.',
          '5. `key=lambda pair: (-pair[1], pair[0])` sorts by fine from largest to smallest (the minus flips the order) and then by borrower A to Z. Using `reverse=True` instead would reverse the names as well.',
          '6. The rounding happens once, as each tuple goes into `report`. `0.2 * 3` is `0.6000000000000001` in binary floating point, and rounding at the end tidies that without disturbing the order.',
          '7. An empty `loans`, or one with nothing overdue, falls through both loops and returns `[]` rather than crashing.',
        ),
      },
      selfExplain: 'Why does sorting on the unrounded fine give a different result from sorting on the rounded one?',
    },
  ],
};

export default scenario;
