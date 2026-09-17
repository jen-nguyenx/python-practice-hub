import type { Scenario } from '../../schema.ts';

// Virtual data files for the Swan River project question. File names have no .csv extension on purpose.
const SWAN_JAN = `Site,Date,Salinity_ppt,Temp_C
Blackwall Reach,2026-01-05,34.2,24.1
Maylands,2026-01-05,21.6,25.3
Guildford,2026-01-05,9.8,26.0
Blackwall Reach,2026-01-12,33.7,24.8
Maylands,2026-01-12,23.4,25.9
Guildford,2026-01-12,11.2,26.4
Blackwall Reach,2026-01-19,35.0,23.9
Maylands,2026-01-19,22.4,24.7
Guildford,2026-01-19,10.5,25.8
`;

const SWAN_FEB = `Temp_C,SALINITY_PPT,Depth_m,site,Date
24.1,34.2,1.5,Blackwall Reach,2026-02-02
25.0,19.8,0.8,MAYLANDS,2026-02-02
24.6,20.4,0.9,maylands,2026-02-09
24.9,18.9,0.8, Maylands ,2026-02-16
`;

const SWAN_MAR = `Site,Date,Salinity_ppt,Temp_C
Guildford,2026-03-02,12.6,22.0
Guildford,2026-03-09,NA,22.4
Guildford,2026-03-16,,21.9
Guildford,2026-03-23,-1,22.1

Guildford,2026-03-30,13.9,21.5
Guildford,2026-04-06
Guildford,2026-04-13,11.8,20.8
Maylands,2026-03-02,err,22.0
Maylands,2026-03-09,17.2,22.3
`;

const SWAN_APR = `Site,Date,Salinity_ppt,Temp_C
Blackwall Reach,2026-04-06,34.2,20.1
Blackwall Reach,2026-04-06,34.2,20.1
Blackwall Reach,2026-04-13,31.0,19.8
blackwall reach,2026-04-13,36.5,19.8
Blackwall Reach,2026-04-20,33.3,19.5
`;

const SWAN_MAY = `Site,Date,Salinity_ppt,Temp_C
Blackwall Reach,2026-05-04,35.9,18.2
Blackwall Reach,2026-05-11,35.8,17.9
Blackwall Reach,2026-05-18,33.9,17.5
Blackwall Reach,2026-05-25,33.7,17.1
`;

const s1: Scenario = {
  id: 't12-s1',
  title: 'Swan River salinity report',
  story:
    'Volunteers log salinity readings (parts per thousand) from sensors on the Swan River at Blackwall Reach, Maylands and Guildford. ' +
    'You are writing the statistics for their monthly report the way Project 1 asks: no imports, full precision while calculating, and 4 decimal places only in the result.',
  questions: [
    {
      id: 't12-s1-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'From formula to loop',
      prompt:
        'The report uses the **sample standard deviation**:\n\n' +
        '`s = √( Σ (x − mean)² / (n − 1) )`\n\n' +
        'The function already works out `n` and `mean`. Which lines complete it correctly?',
      code: `def std_dev(readings):
    n = len(readings)
    mean = sum(readings) / n
    # which lines go here?`,
      options: [
        {
          id: 'a',
          text: `total = 0
for x in readings:
    total += (x - mean) ** 2
return (total / (n - 1)) ** 0.5`,
          correct: true,
          why:
            'Correct. `Σ` means "add up over every reading", so the total starts at 0 before the loop and grows by one squared difference each pass. After the loop, divide by `n - 1` and take the square root with `** 0.5`.',
        },
        {
          id: 'b',
          text: `for x in readings:
    total = 0
    total += (x - mean) ** 2
return (total / (n - 1)) ** 0.5`,
          mistake: 'accumulator_init',
          why:
            '`total = 0` inside the loop wipes the running total on every pass, so only the last squared difference is left when the loop ends.',
        },
        {
          id: 'c',
          text: `total = 0
for x in readings:
    total += round((x - mean) ** 2, 4)
return round(total / (n - 1), 4) ** 0.5`,
          mistake: 'round_mid_calc',
          why:
            'Rounding each squared difference and the variance throws away precision before the last step, so the 4th decimal place of the answer can be wrong. Round once, on the final value.',
        },
        {
          id: 'd',
          text: `total = 0
for x in readings:
    total += (x - mean) ** 2
    return (total / (n - 1)) ** 0.5`,
          mistake: 'early_return_in_loop',
          why:
            'The `return` is indented inside the loop, so the function returns during the first pass, after adding only one squared difference.',
        },
      ],
      concepts: ['statistics', 'standard-deviation', 'accumulator'],
      detects: ['accumulator_init', 'round_mid_calc', 'early_return_in_loop'],
      expectedSec: 100,
      hints: [
        'Read the formula from the inside out: what is added up, and what happens only once at the end?',
        'The Σ becomes a loop with a running total that starts before the loop. The division by n − 1 and the square root happen once, after the loop, and nothing is rounded along the way.',
        'Check where `total = 0` sits and how far the `return` line is indented in each option.',
      ],
      solution: {
        explanation:
          'Option a matches the formula piece by piece.\n\n' +
          '- `total = 0` before the loop starts the sum.\n' +
          '- `total += (x - mean) ** 2` adds one squared difference per reading: that is the `Σ (x − mean)²` part.\n' +
          '- After the loop, `total / (n - 1)` is the sample variance, and `** 0.5` takes its square root.\n\n' +
          'Option b resets the total every pass, option c rounds in the middle of the calculation, and option d returns after the first reading.',
      },
      selfExplain: 'Why does the formula need at least two readings before it can be used?',
    },
    {
      id: 't12-s1-q2',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The standard error is off by 0.0001',
      prompt:
        '`std_error(values)` should return the standard error `s / √n`, rounded to 4 decimal places, where `s` is the sample standard deviation. ' +
        'It returns `None` when there are fewer than 2 values.\n\n' +
        'Most results are right, but some come out 0.0001 too high or too low, which fails the marker\'s tests. Run the tests, find the line that causes it and fix it. `std_dev` is only used by `std_error`.',
      buggy: `def std_dev(values):
    """Sample standard deviation of values."""
    n = len(values)
    mean = sum(values) / n
    total = 0
    for x in values:
        total += (x - mean) ** 2
    return round((total / (n - 1)) ** 0.5, 4)


def std_error(values):
    """Standard error s / sqrt(n), rounded to 4 dp. None if fewer than 2 values."""
    if len(values) < 2:
        return None
    return round(std_dev(values) / len(values) ** 0.5, 4)`,
      bugMistake: 'round_mid_calc',
      maxChangedLines: 1,
      fnName: 'std_error',
      tests: [
        { id: 'v1', call: 'std_error([12.4, 15.1, 13.8, 14.6])', expect: '0.5893', cmp: 'float', label: 'four readings', hidden: false },
        { id: 'v2', call: 'std_error([17.5, 19.0, 14.1, 13.6])', expect: '1.3105', cmp: 'float', label: 'four readings where early rounding shows', hidden: false, tag: 'round_mid_calc' },
        { id: 'h1', call: 'std_error([34.0, 25.7, 22.5, 18.5, 12.2])', expect: '3.6369', cmp: 'float', label: 'five readings', hidden: true, tag: 'round_mid_calc' },
        { id: 'h2', call: 'std_error([21.3])', expect: 'None', label: 'only one reading', hidden: true, tag: 'zero_division' },
        { id: 'h3', call: 'std_error([18.5, 18.5, 18.5])', expect: '0.0', cmp: 'float', label: 'identical readings', hidden: true },
      ],
      concepts: ['statistics', 'standard-error', 'rounding'],
      detects: ['round_mid_calc'],
      expectedSec: 240,
      hints: [
        'Both functions round. Which of those rounded values is then used in another calculation?',
        'std_dev hands a value that is already rounded to 4 places to std_error, which divides it by √n and rounds again. The small error from the first rounding is enough to change the 4th decimal place. Keep full precision until the very last step.',
        'Only one `round` belongs in this code: the one applied to the value `std_error` returns. Look at the `return` line of `std_dev`.',
      ],
      solution: {
        code: `def std_dev(values):
    """Sample standard deviation of values."""
    n = len(values)
    mean = sum(values) / n
    total = 0
    for x in values:
        total += (x - mean) ** 2
    return (total / (n - 1)) ** 0.5


def std_error(values):
    """Standard error s / sqrt(n), rounded to 4 dp. None if fewer than 2 values."""
    if len(values) < 2:
        return None
    return round(std_dev(values) / len(values) ** 0.5, 4)`,
        explanation:
          'The bug is on the last line of `std_dev`: it rounds the standard deviation to 4 places, and `std_error` then divides that rounded number by √n.\n\n' +
          'For `[17.5, 19.0, 14.1, 13.6]` the true standard deviation is 2.62106848..., which rounds to 2.6211. Dividing the true value by √4 = 2 gives 1.31053..., so the answer is 1.3105. Dividing the rounded 2.6211 by 2 gives 1.31055, which rounds up to 1.3106.\n\n' +
          'The fix is to return the full-precision value from the helper. `std_error` still rounds once, on the value it returns, which is exactly what the project rules ask for.',
      },
      selfExplain: 'Why can a rounding error of less than 0.00005 still change the final 4th decimal place?',
    },
    {
      id: 't12-s1-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Mean, standard deviation and standard error',
      prompt:
        'A reading below 0 means the sensor failed (the logger writes `-1.0`). Write `salinity_stats(readings)` that takes a list of floats and:\n\n' +
        '1. ignores every negative reading (a reading of exactly `0.0` is valid),\n' +
        '2. returns a **tuple** `(mean, std_dev, std_error)` for the valid readings, each rounded to 4 decimal places,\n' +
        '3. returns `None` when there are fewer than 2 valid readings.\n\n' +
        'Use the sample standard deviation `s = √( Σ (x − mean)² / (n − 1) )` and the standard error `s / √n`. ' +
        'Do not import anything, do not change the list you are given, and round only the three values you return.\n\n' +
        'Example: `salinity_stats([30.2, -1.0, 28.9, 29.5])` returns `(29.5333, 0.6506, 0.3756)`.',
      fnName: 'salinity_stats',
      starter: `def salinity_stats(readings):
    """Return (mean, std_dev, std_error) of the non-negative readings, each to 4 dp,
    or None if there are fewer than 2 valid readings."""
    pass`,
      rules: ['noImport', 'roundAtEnd'],
      tests: [
        { id: 'v1', call: 'salinity_stats([12.4, 15.1, 13.8, 14.6])', expect: '(13.975, 1.1786, 0.5893)', cmp: 'float', label: 'four valid readings', hidden: false },
        { id: 'v2', call: 'salinity_stats([30.2, -1.0, 28.9, 29.5])', expect: '(29.5333, 0.6506, 0.3756)', cmp: 'float', label: 'one failed reading', hidden: false, tag: 'invalid_row_not_skipped' },
        { id: 'h1', call: 'salinity_stats([-1.0, 22.0])', expect: 'None', label: 'only one valid reading', hidden: true, tag: 'zero_division' },
        { id: 'h2', call: 'salinity_stats([])', expect: 'None', label: 'no readings at all', hidden: true, tag: 'zero_division' },
        { id: 'h3', call: 'salinity_stats([18.5, 18.5, 18.5])', expect: '(18.5, 0.0, 0.0)', cmp: 'float', label: 'identical readings', hidden: true },
        { id: 'h4', call: 'salinity_stats([22.0, 23.7, 22.4])', expect: '(22.7, 0.8888, 0.5132)', cmp: 'float', label: 'rounding the standard deviation too early shows here', hidden: true, tag: 'round_mid_calc' },
        { id: 'h5', call: 'salinity_stats([0.0, 2.5])', expect: '(1.25, 1.7678, 1.25)', cmp: 'float', label: 'a reading of exactly 0.0 is valid', hidden: true },
        {
          id: 'h6',
          setup: 'log = [-1.0, 8.6, -1.0, 9.4, 7.7]',
          call: 'salinity_stats(log)',
          expect: '(8.5667, 0.8505, 0.491)',
          cmp: 'float',
          argsUnchanged: ['log'],
          label: 'failed readings in a row, and the list is not changed',
          hidden: true,
        },
      ],
      concepts: ['statistics', 'standard-deviation', 'standard-error', 'validation'],
      detects: ['zero_division', 'round_mid_calc', 'mutated_input', 'invalid_row_not_skipped', 'return_type_wrong'],
      expectedSec: 330,
      hints: [
        'Do it in two stages: first build a new list of the valid readings, then do all the statistics on that list.',
        'Plan: loop over readings and append each one that is 0 or more to a new list. If the new list has fewer than 2 items, return None. Work out the mean, then the sum of squared differences in a loop, then s and s / √n at full precision. Round all three only inside the returned tuple.',
        `\`\`\`python
valid = []
for r in readings:
    if r >= 0:
        valid.append(r)
n = len(valid)
if n < 2:
    return None
\`\`\``,
      ],
      solution: {
        code: `def salinity_stats(readings):
    """Return (mean, std_dev, std_error) of the non-negative readings, each to 4 dp,
    or None if there are fewer than 2 valid readings."""
    valid = []
    for r in readings:
        if r >= 0:
            valid.append(r)
    n = len(valid)
    if n < 2:
        return None
    mean = sum(valid) / n
    total = 0
    for x in valid:
        total += (x - mean) ** 2
    std = (total / (n - 1)) ** 0.5
    se = std / n ** 0.5
    return (round(mean, 4), round(std, 4), round(se, 4))`,
        explanation:
          '`valid` is a new list, so the caller\'s list is never changed. Removing items from `readings` while looping over it would both change the caller\'s data and skip readings.\n\n' +
          '`if n < 2: return None` comes before any division. With 0 readings the mean would divide by zero, and with 1 reading `n - 1` is zero.\n\n' +
          'The mean, the sum of squared differences, `std` and `se` all keep full precision. `se` uses the unrounded `std`, so rounding cannot carry into the standard error.\n\n' +
          '`n ** 0.5` is √n without importing `math`. The three values are rounded only in the returned tuple.',
      },
      selfExplain: 'Which hidden test would fail if se were calculated from round(std, 4)?',
    },
    {
      id: 't12-s1-q4',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Project task: one site from the logger file',
      prompt:
        'Write `main(csvfile, site)`. `csvfile` is the name of a data file (it may not end in `.csv`; open it exactly as given). The first line is a header that includes the columns `Site`, `Date` and `Salinity_ppt`, in any order, in any letter case, and possibly with extra columns.\n\n' +
        'Return a **list** `[count, mean, std_dev, std_error]` for the valid readings of `site`: `count` is an int, and the other three are rounded to 4 decimal places (sample standard deviation, and standard error `s / √n`).\n\n' +
        'Rules:\n\n' +
        '- Compare site names ignoring letter case and spaces around them.\n' +
        '- Skip a row that is blank, has a different number of comma-separated fields from the header, or whose salinity is missing, not a number, or negative.\n' +
        '- If a valid row has the same site (compared as above) and the same date as an earlier valid row, it is a duplicate: ignore it.\n' +
        '- Return `None` if the file cannot be opened, or if the site has fewer than 2 valid readings.\n' +
        '- No `import`, `input()` or `print()`, and round only the values you return.\n\n' +
        'Example: for the visible file `swan_jan`, `main(\'swan_jan\', \'Maylands\')` returns `[3, 22.4667, 0.9018, 0.5207]`.',
      fnName: 'main',
      starter: `def main(csvfile, site):
    """Return [count, mean, std_dev, std_error] for the valid salinity readings of site,
    or None if the file cannot be opened or there are fewer than 2 valid readings."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('swan_jan', 'Maylands')",
          expect: '[3, 22.4667, 0.9018, 0.5207]',
          cmp: 'float',
          files: [{ name: 'swan_jan', content: SWAN_JAN }],
          label: 'January file, Maylands',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('swan_jan', 'guildford')",
          expect: '[3, 10.5, 0.7, 0.4041]',
          cmp: 'float',
          files: [{ name: 'swan_jan', content: SWAN_JAN }],
          label: 'site name given in lower case',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h1',
          call: "main('swan_feb', 'Maylands')",
          expect: '[3, 19.7, 0.755, 0.4359]',
          cmp: 'float',
          files: [{ name: 'swan_feb', content: SWAN_FEB }],
          label: 'columns in a different order, an extra column and mixed-case names',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('swan_mar', 'Guildford')",
          expect: '[3, 12.7667, 1.0599, 0.6119]',
          cmp: 'float',
          files: [{ name: 'swan_mar', content: SWAN_MAR }],
          label: 'blank, missing, NA and negative readings',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          call: "main('swan_mar', 'Maylands')",
          expect: 'None',
          files: [{ name: 'swan_mar', content: SWAN_MAR }],
          label: 'site with only one valid reading',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h4',
          call: "main('swan_apr', 'BLACKWALL REACH')",
          expect: '[3, 32.8333, 1.6503, 0.9528]',
          cmp: 'float',
          files: [{ name: 'swan_apr', content: SWAN_APR }],
          label: 'the same site and date logged twice',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h5',
          call: "main('swan_jun', 'Maylands')",
          expect: 'None',
          files: [{ name: 'swan_jan', content: SWAN_JAN }],
          label: 'file that does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          call: "main('swan_jan', 'Kings Park')",
          expect: 'None',
          files: [{ name: 'swan_jan', content: SWAN_JAN }],
          label: 'site that is not in the file',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h7',
          call: "main('swan_may', 'Blackwall Reach')",
          expect: '[4, 34.825, 1.1871, 0.5935]',
          cmp: 'float',
          files: [{ name: 'swan_may', content: SWAN_MAY }],
          label: 'rounding the standard deviation too early shows here',
          hidden: true,
          tag: 'round_mid_calc',
        },
      ],
      concepts: ['csv', 'header-lookup', 'validation', 'statistics', 'main-contract'],
      detects: [
        'header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare', 'no_graceful_exit',
        'zero_division', 'round_mid_calc', 'csv_ext_assumed', 'import_used', 'print_in_main',
      ],
      expectedSec: 900,
      hints: [
        'Split the job: (1) open and read the file once, (2) find the three columns from the header, (3) collect the valid readings for the site in a list, (4) do the statistics on that list. A small helper for step 4 keeps main short.',
        'Plan: wrap `with open(csvfile)` in try/except OSError and return None on failure. Lower-case the header and use `index` to find site, date and salinity. For each later line: strip and split, skip it if the field count differs from the header, try `float()` on the salinity and skip on ValueError or a negative value. Keep a dictionary of (site, date) pairs already used to skip duplicates. After the loop, return None for fewer than 2 values, otherwise compute at full precision and round in the returned list.',
        `\`\`\`python
header = lines[0].strip().lower().split(',')
site_col = header.index('site')
date_col = header.index('date')
salinity_col = header.index('salinity_ppt')
target = site.strip().lower()
seen = {}
values = []
\`\`\``,
      ],
      solution: {
        code: `def mean_std_se(values):
    """Full-precision (mean, sample std dev, standard error). Needs at least 2 values."""
    n = len(values)
    mean = sum(values) / n
    total = 0
    for x in values:
        total += (x - mean) ** 2
    std = (total / (n - 1)) ** 0.5
    return mean, std, std / n ** 0.5


def main(csvfile, site):
    """Return [count, mean, std_dev, std_error] for the valid salinity readings of site,
    or None if the file cannot be opened or there are fewer than 2 valid readings."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    header = lines[0].strip().lower().split(',')
    site_col = header.index('site')
    date_col = header.index('date')
    salinity_col = header.index('salinity_ppt')
    target = site.strip().lower()
    seen = {}
    values = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        name = fields[site_col].strip().lower()
        try:
            salinity = float(fields[salinity_col])
        except ValueError:
            continue
        if salinity < 0:
            continue
        key = (name, fields[date_col].strip())
        if key in seen:
            continue
        seen[key] = True
        if name == target:
            values.append(salinity)
    if len(values) < 2:
        return None
    mean, std, se = mean_std_se(values)
    return [len(values), round(mean, 4), round(std, 4), round(se, 4)]`,
        explanation:
          '**Reading.** `with open(csvfile)` inside `try` reads the file once and closes it. A missing file raises an `OSError` (FileNotFoundError is one kind), and the function returns `None` instead of crashing. The name is used exactly as given, with no `.csv` added.\n\n' +
          '**Columns.** The header is lower-cased and split, and `header.index(...)` finds each column wherever it is. That is why the February file with its shuffled and extra columns still works.\n\n' +
          '**Valid rows.** A blank line strips to `\'\'` and splits into one field, so `len(fields) != len(header)` skips it, along with short rows. `float()` raises ValueError for `\'\'`, `NA` and `err`, and the `except` moves on to the next line. Negative readings are skipped with `continue`.\n\n' +
          '**Duplicates.** `key` pairs the cleaned site name with the date. The first valid row with that key is kept and recorded in `seen`; later rows with the same key are ignored.\n\n' +
          '**Statistics.** The helper keeps full precision, including using the unrounded standard deviation for the standard error. `main` rounds only when building the returned list, and `len(values)` stays an int.',
      },
      selfExplain: 'Why is the site and date pair recorded in seen only after the row has passed every validity check?',
    },
  ],
};

export default s1;
