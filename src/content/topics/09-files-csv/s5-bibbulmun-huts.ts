import type { Scenario } from '../../schema.ts';

const SEP = 'date,hut,walkers\n03/09,Hewitt,3\n04/09,Beraking,5\n05/09,Waalegh,4\n';
const SECTION_01 = 'date,hut,walkers\n03/09,Hewitt,3\n04/09,Beraking,5\n05/09,Waalegh,4\n06/09,Hewitt,6\n';
const SECTION_02 = 'walkers,hut,date,cleaned\n2,Helena,11/10,yes\n5,Waalegh,12/10,no\n1,Helena,13/10,yes\n';

const s5: Scenario = {
  id: 't09-s5',
  title: 'Bibbulmun Track hut logbooks',
  story:
    'Walkers on the Bibbulmun Track sign the logbook at every overnight hut, and the volunteer who clears the huts types the pages into one file per section. ' +
    'Each volunteer types the columns in whatever order suits them, and a few lines are half written, so the track office code has to read the header before it trusts anything.',
  questions: [
    {
      id: 't09-s5-q1',
      format: 'trace',
      diff: 'easy',
      core: true,
      title: 'Walkers counted line by line',
      prompt:
        'This script writes a small logbook file and then adds up the walkers in it.\n\n' +
        'Fill in `fields` and `nights` each time **line 13** finishes. Write `fields` the way Python would show it, for example `[\'Hewitt\', \'3\']`.',
      code: `with open('hut_log', 'w') as f:
    f.write('hut,walkers\\n')
    f.write('Hewitt,3\\n')
    f.write('Beraking,0\\n')
    f.write('Waalegh,5\\n')
    f.write('Helena,2\\n')

nights = 0
with open('hut_log') as f:
    f.readline()
    for line in f:
        fields = line.strip().split(',')
        nights = nights + int(fields[1])
print(nights)`,
      watch: ['fields', 'nights'],
      anchorLine: 13,
      concepts: ['readline', 'strip-split', 'accumulator', 'trace'],
      detects: ['file_newline', 'str_int_concat', 'accumulator_init'],
      expectedSec: 115,
      hints: [
        'Line 10 is not there by accident. `f.readline()` takes one line out of the file before the loop starts, so which line of the file does the loop see first?',
        'Each pass does three things: `line` is one row of the file with its newline still on the end, `strip().split(\',\')` turns it into a list of two strings, and `int(fields[1])` turns the second one into a number that is added to `nights`.',
        'The first row of the table is `[\'Hewitt\', \'3\']` with `nights` 3. The second hut logged 0 walkers, so `nights` does not change on that pass.',
      ],
      solution: {
        explanation:
          'The file holds five lines: the header `hut,walkers` and four huts.\n\n' +
          '`nights = 0` is set before the file is opened, so it keeps its value across every pass of the loop.\n\n' +
          '`f.readline()` reads the header and throws it away. The `for` loop carries on from where the marker now sits, which is the start of the `Hewitt,3` line, so the header is never split or converted.\n\n' +
          '`line.strip()` removes the newline at the end of the row, and `split(\',\')` breaks what is left into two strings. The second one is text, so `int()` is needed before it can be added.\n\n' +
          '1. `[\'Hewitt\', \'3\']`, nights 0 + 3 = 3\n' +
          '2. `[\'Beraking\', \'0\']`, nights 3 + 0 = 3\n' +
          '3. `[\'Waalegh\', \'5\']`, nights 3 + 5 = 8\n' +
          '4. `[\'Helena\', \'2\']`, nights 8 + 2 = 10\n\n' +
          'After the loop the program prints `10`.',
      },
      selfExplain: 'What would the first row of the table be if line 10 were deleted, and what would happen on that pass?',
    },
    {
      id: 't09-s5-q2',
      format: 'refactor',
      diff: 'medium',
      core: false,
      title: 'One pass through the logbook',
      prompt:
        '`hut_average(filename)` returns the mean number of walkers per usable row, rounded to 2 decimal places, or `None` when the file has no usable row. ' +
        'The first line is a header containing `hut` and `walkers` in any order and any capitals, and a row is skipped when it does not have one value for every header column.\n\n' +
        'It works, but it pulls the whole file into a list, opens and closes the file by hand, and then walks that list with a counter.\n\n' +
        'Rewrite it so the file is opened with `with` and the rows are read one at a time by a `for` loop over the file itself, with no `readlines`, no slicing and no `range(len(...))`. The returned values must not change.',
      code: `def hut_average(filename):
    f = open(filename)
    lines = f.readlines()
    f.close()
    header = lines[0].strip().lower().split(',')
    walkers_col = header.index('walkers')
    rows = lines[1:]
    total = 0
    count = 0
    for i in range(len(rows)):
        fields = rows[i].strip().split(',')
        if len(fields) != len(header):
            continue
        total = total + int(fields[walkers_col])
        count = count + 1
    if count == 0:
        return None
    return round(total / count, 2)`,
      fnName: 'hut_average',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'logbook_sep', content: SEP }],
          call: "hut_average('logbook_sep')",
          expect: '4.0',
          cmp: 'float',
          label: 'three huts in September',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'logbook_oct', content: 'walkers,hut,date\n2,Helena,11/10\n5,Waalegh,12/10\n' }],
          call: "hut_average('logbook_oct')",
          expect: '3.5',
          cmp: 'float',
          label: 'walkers column first',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'logbook_nov', content: 'date,hut,walkers\n' }],
          call: "hut_average('logbook_nov')",
          expect: 'None',
          label: 'header only, no rows',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h2',
          files: [{ name: 'logbook_dec', content: 'date,hut,walkers\n01/12,Hewitt,4\n\n02/12,Beraking\n03/12,Waalegh,7\n' }],
          call: "hut_average('logbook_dec')",
          expect: '5.5',
          cmp: 'float',
          label: 'a blank line and a half-typed row',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [{ name: 'logbook_jan', content: 'DATE,WALKERS,HUT\n05/01,6,Helena\n06/01,3,Hewitt\n' }],
          call: "hut_average('logbook_jan')",
          expect: '4.5',
          cmp: 'float',
          label: 'header typed in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h4',
          files: [{ name: 'logbook_feb', content: 'date,hut,walkers\n01/02,Hewitt,1\n02/02,Beraking,2\n03/02,Waalegh,2\n' }],
          call: "hut_average('logbook_feb')",
          expect: '1.67',
          cmp: 'float',
          label: 'a mean that has to be rounded',
          hidden: true,
        },
      ],
      mustRemove: ['open_without_with', 'range_len_index'],
      mustAdd: ['with_open', 'for_each'],
      pattern: 'with-open-strip-split',
      concepts: ['with-open', 'for-each', 'header-lookup', 'strip-split'],
      detects: ['file_not_closed', 'invalid_row_not_skipped', 'case_sensitive_compare'],
      expectedSec: 240,
      hints: [
        'Two habits to drop. `open` and `close` in separate statements is what `with` was made for, and `rows[i]` is only ever used to get the line that a `for` loop would hand you anyway.',
        'Plan: open the file with `with open(filename) as f:` and do the reading inside that block. Read the header with `f.readline()` and find the walkers column exactly as before. Then loop with `for line in f:`, which carries on from the second line of the file. The body of the loop does not change at all. Keep the count check and the rounding after the block.',
        'The loop becomes `for line in f:` with `fields = line.strip().split(\',\')` as its first line. Nothing else in the body changes.',
      ],
      solution: {
        code: `def hut_average(filename):
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        walkers_col = header.index('walkers')
        total = 0
        count = 0
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            total = total + int(fields[walkers_col])
            count = count + 1
    if count == 0:
        return None
    return round(total / count, 2)`,
        explanation:
          '**`with` replaces open, readlines and close.** The block closes the file for you at the end, and it closes it even when something inside the block raises. A forgotten `f.close()` leaves the file open, which is one of the easiest marks to lose in a project.\n\n' +
          '**`f.readline()` takes the header, `for line in f:` takes the rest.** Reading from a file moves a marker forward, so the loop starts from the second line without any slicing. `rows = lines[1:]` and `range(len(rows))` both disappear.\n\n' +
          '**The body is unchanged.** `line` is the string that `rows[i]` used to be, so `strip().split(\',\')`, the field-count check and the running total all stay exactly as they were.\n\n' +
          '**The results are identical.** Every test gives the same answer as before, including the header-only file, which returns `None` because `count` never leaves 0.\n\n' +
          'The old version also had to hold the whole file in memory at once. Reading line by line handles a logbook of any size the same way.',
      },
      selfExplain: 'Why does the for loop start at the second line of the file, without any slicing?',
    },
    {
      id: 't09-s5-q3',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Section summary for the track office',
      prompt:
        'Write `main(logfile)` for the track office, following the CITS1401 project rules: no imports, no `input()`, no `print()`, open the file name exactly as it is given, and round only in the value you return.\n\n' +
        '**The file.** The first line is a header containing `hut` and `walkers` in any order and any capitals, and there may be extra columns such as `date` or `cleaned`. Every later line is one night at one hut. The file always exists and always has a header line.\n\n' +
        '**Usable rows.** Use a row only if it has one value for every header column, its hut name is not blank, and its walkers value is all digits once spaces are stripped. Skip every other row, including blank lines.\n\n' +
        '**Return** a list `[total, mean, busiest]`:\n\n' +
        '- `total`: the total number of walkers in the usable rows, as an **int**;\n' +
        '- `mean`: the mean walkers per usable row, rounded to **4 decimal places**;\n' +
        '- `busiest`: the hut with the most walkers added up across the file, in **upper case**. Compare hut names ignoring capitals and spaces around them. If two huts are equally busy, return the one that comes **first** alphabetically.\n\n' +
        'Return `None` if the header has no `hut` column or no `walkers` column, or if no row can be used.\n\n' +
        'Example: the file `section_01` contains\n\n' +
        '```\n' + SECTION_01 + '```\n\n' +
        "`main('section_01')` returns `[18, 4.5, 'HEWITT']`, because Hewitt logged 3 + 6 = 9 walkers.\n\n" +
        'Splitting the work into helpers such as `read_rows(logfile)` and `busiest_hut(rows)` is good style and makes each part easy to check on its own.',
      fnName: 'main',
      starter: `def main(logfile):
    """Return [total, mean, busiest hut] for logfile, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'section_01', content: SECTION_01 }],
          call: "main('section_01')",
          expect: "[18, 4.5, 'HEWITT']",
          cmp: 'float',
          label: 'the example file',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'section_02', content: SECTION_02 }],
          call: "main('section_02')",
          expect: "[8, 2.6667, 'WAALEGH']",
          cmp: 'float',
          label: 'columns in another order with an extra column',
          hidden: false,
          tag: 'header_order_assumed',
        },
        {
          id: 'h1',
          files: [{ name: 'section_03', content: 'date,hut,walkers\n01/12,Hewitt,4\n\n02/12,Beraking\n03/12,Waalegh,N/A\n04/12,,6\n05/12,Hewitt,7\n' }],
          call: "main('section_03')",
          expect: "[11, 5.5, 'HEWITT']",
          cmp: 'float',
          label: 'a blank line, a short row, N/A walkers and a missing hut name',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'section_04.txt', content: 'DATE,WALKERS,HUT\n05/01,6,helena\n06/01,3,HELENA\n07/01,4,Waalegh\n' }],
          call: "main('section_04.txt')",
          expect: "[13, 4.3333, 'HELENA']",
          cmp: 'float',
          label: 'capital header, the same hut typed two ways, a name that is not a .csv file',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h3',
          files: [{ name: 'section_05', content: 'date,hut,walkers\n01/03,Waalegh,5\n02/03,Beraking,5\n' }],
          call: "main('section_05')",
          expect: "[10, 5.0, 'BERAKING']",
          cmp: 'float',
          label: 'two huts equally busy',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h4',
          files: [{ name: 'section_06', content: 'date,hut,walkers\n' }],
          call: "main('section_06')",
          expect: 'None',
          label: 'header only, no nights logged',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h5',
          files: [{ name: 'section_07', content: 'date,hut,walkers\n01/04,Hewitt,none\n02/04,Hewitt,-2\n' }],
          call: "main('section_07')",
          expect: 'None',
          label: 'every row unusable, including a negative count',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h6',
          files: [{ name: 'section_08', content: 'hut,walkers,date\nHewitt,0,09/09' }],
          call: "main('section_08')",
          expect: "[0, 0.0, 'HEWITT']",
          cmp: 'float',
          label: 'one hut with nobody in it, and no newline at the end',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h7',
          files: [{ name: 'section_09', content: 'date,site,count\n01/05,Hewitt,3\n' }],
          call: "main('section_09')",
          expect: 'None',
          label: 'the header does not name the columns this task needs',
          hidden: true,
          tag: 'header_order_assumed',
        },
      ],
      concepts: ['main-contract', 'header-lookup', 'validation', 'grouping', 'round-at-output'],
      detects: [
        'header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'sort_tiebreak',
        'csv_ext_assumed', 'round_mid_calc', 'print_in_main', 'import_used', 'missing_main', 'accumulator_init',
      ],
      expectedSec: 840,
      hints: [
        'Three questions are being asked about the same rows: how many walkers in total, how many per row, and which hut is busiest. Decide what a usable row is once, collect those rows, and answer the three questions from what you collected.',
        'Plan: (1) a helper opens the file, reads the header, lower-cases it and checks that `hut` and `walkers` are both in it; (2) find both columns with `index`, then for each later line split it and skip it unless the field count matches, the hut name is not empty and the walkers value `isdigit()`; (3) keep each usable row as a pair of the upper-case hut name and the int count; (4) `main` returns `None` when nothing was collected, otherwise adds the counts, works out the mean and finds the busiest hut; (5) round only in the list you return.',
        'For the busiest hut, build a dictionary of hut to total with `totals[hut] = totals.get(hut, 0) + walkers`, then loop over `sorted(totals)` and keep the first hut whose total is strictly greater than the best so far. Going through the names in sorted order is what settles a tie in favour of the earlier name.',
      ],
      solution: {
        code: `def read_rows(logfile):
    """Return a list of (hut, walkers) pairs for the usable rows of logfile."""
    rows = []
    with open(logfile) as f:
        header = f.readline().strip().lower().split(',')
        if 'hut' not in header or 'walkers' not in header:
            return rows
        hut_col = header.index('hut')
        walkers_col = header.index('walkers')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            hut = fields[hut_col].strip().upper()
            walkers = fields[walkers_col].strip()
            if hut == '' or not walkers.isdigit():
                continue
            rows.append((hut, int(walkers)))
    return rows


def busiest_hut(rows):
    """Return the hut with the most walkers, ties going to the earlier name."""
    totals = {}
    for hut, walkers in rows:
        totals[hut] = totals.get(hut, 0) + walkers
    best = ''
    best_total = -1
    for hut in sorted(totals):
        if totals[hut] > best_total:
            best = hut
            best_total = totals[hut]
    return best


def main(logfile):
    """Return [total, mean, busiest hut] for logfile, or None."""
    rows = read_rows(logfile)
    if len(rows) == 0:
        return None
    total = 0
    for hut, walkers in rows:
        total = total + walkers
    return [total, round(total / len(rows), 4), busiest_hut(rows)]`,
        explanation:
          '**One helper decides what counts.** `read_rows` is the only place that knows about the file, so every rule about a usable row lives in one loop and `main` stays short enough to read in one go.\n\n' +
          '**The header decides the columns, not the author.** The header is stripped, lower-cased and split, checked for both names (which is what stops `index` from raising on the `date,site,count` file), and then `index` gives the position of each column in this file. That is what makes the shuffled header with a `cleaned` column work.\n\n' +
          '**Each row is checked before it is used.** `len(fields) != len(header)` drops blank lines and the short row `02/12,Beraking` before any field is read. `hut == \'\'` drops the row with no hut name. `walkers.isdigit()` is False for `N/A`, for an empty value and for `-2`, so `int()` never raises.\n\n' +
          '**Hut names are cleaned once, on the way in.** `strip().upper()` means `helena` and `HELENA` land on the same key of the dictionary and the returned name is already in the upper case the task asks for.\n\n' +
          '**The busiest hut.** The totals go into a dictionary with `get(hut, 0)`, and the winner is found by walking `sorted(totals)` and keeping a hut only when its total is **strictly** greater. Sorted order plus `>` means the alphabetically earlier hut keeps the title when two are equal.\n\n' +
          '**Rounding happens once.** `total` is an int and the mean is worked out from full-precision values; `round(..., 4)` appears only in the returned list. Rounding inside the loop would drift on a file with hundreds of rows, and the marker checks the 4th decimal place.\n\n' +
          '**Nothing is printed and nothing is imported.** The one file name used is the argument, exactly as given, so a file called `section_04.txt` opens just as well as one with no extension.',
      },
      selfExplain: 'Why does the hut name have to be upper-cased before it is used as a dictionary key, rather than when the answer is returned?',
    },
  ],
};

export default s5;
