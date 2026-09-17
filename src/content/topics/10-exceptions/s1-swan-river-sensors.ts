import type { Scenario } from '../../schema.ts';

const s1: Scenario = {
  id: 't10-s1',
  title: 'Swan River water sensors',
  story:
    'Sensors along the Swan River send pH and dissolved oxygen readings to a monitoring team, and volunteers on the jetties add their own counts. ' +
    'Some entries arrive as `N/A`, `ERR` or blank text when a sensor drops out, and one bad reading must not stop the whole report.',
  questions: [
    {
      id: 't10-s1-q1',
      format: 'errorTranslator',
      diff: 'easy',
      core: true,
      title: 'The Maylands sensor dropped out',
      prompt:
        'This script adds up the morning pH readings. It prints one line, then crashes. ' +
        'Click the line that raised the error, pick the exception, then pick the cause and the fix.',
      code: `readings = ['Nedlands,7.4', 'Maylands,N/A', 'Ascot,7.1']
total = 0
for row in readings:
    parts = row.split(',')
    level = float(parts[1])
    print(parts[0], level)
    total += level
print('total', total)`,
      exceptionOptions: ['ValueError', 'TypeError', 'IndexError', 'NameError'],
      causes: [
        {
          id: 'a',
          text:
            "The Maylands reading is the text `'N/A'`, which is not a number, so `float()` cannot convert it. " +
            'Fix: put the conversion inside `try:` with `except ValueError:` inside the loop, and skip that row.',
          correct: true,
        },
        {
          id: 'b',
          text:
            "`float()` cannot convert text with a decimal point such as `'7.4'`. " +
            'Fix: use `int(parts[1])` instead.',
          mistake: 'int_of_float_string',
        },
        {
          id: 'c',
          text:
            '`parts[1]` does not exist because the loop ran past the last row. ' +
            'Fix: loop over `range(len(readings) - 1)` instead.',
          mistake: 'index_out_of_range',
        },
      ],
      concepts: ['traceback', 'value-error', 'float-conversion'],
      detects: ['invalid_row_not_skipped', 'int_of_float_string', 'index_out_of_range'],
      expectedSec: 90,
      hints: [
        'Nedlands printed fine, so the first pass worked. Which row was being processed when it crashed?',
        'Work through the second pass one line at a time: what does `row.split(\',\')` give, and which line then receives text it cannot use? Ask whether the problem is the type of that value (a string) or its content.',
        "On the second pass `parts` is `['Maylands', 'N/A']`. Try `float('N/A')` in your head.",
      ],
      solution: {
        explanation:
          "Pass 1: `parts` is `['Nedlands', '7.4']`, `float('7.4')` is `7.4`, and line 6 prints `Nedlands 7.4`.\n\n" +
          "Pass 2: `parts` is `['Maylands', 'N/A']`. Line 5 calls `float('N/A')`, and Python raises " +
          "`ValueError: could not convert string to float: 'N/A'`. Lines 6 and 7 never run for this row, the loop never reaches Ascot, and line 8 never runs.\n\n" +
          'ValueError means the value had the right type (a string) but its content could not be used. ' +
          "`float('7.4')` works fine, and `parts[1]` exists, so the other causes do not fit.\n\n" +
          'The fix keeps the loop going:\n\n' +
          "```python\nfor row in readings:\n    parts = row.split(',')\n    try:\n        level = float(parts[1])\n    except ValueError:\n        continue\n    print(parts[0], level)\n    total += level\n```",
      },
      selfExplain: 'Why would putting the whole for loop inside one try block still lose the Ascot reading?',
    },
    {
      id: 't10-s1-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Dolphin counts from the jetties',
      prompt:
        'Volunteers type how many dolphins they saw from each jetty. Pick exactly what this program prints.',
      code: `sightings = ['4', '2.0', 'none', '3']
total = 0
for s in sightings:
    try:
        total += int(s)
        print('kept', s)
    except ValueError:
        print('skipped', s)
print('total', total)`,
      choice: true,
      mutants: [
        {
          code: `sightings = ['4', '2.0', 'none', '3']
total = 0
for s in sightings:
    try:
        total += int(float(s))
        print('kept', s)
    except ValueError:
        print('skipped', s)
print('total', total)`,
          mistake: 'int_of_float_string',
        },
        {
          code: `sightings = ['4', '2.0', 'none', '3']
total = 0
try:
    for s in sightings:
        total += int(s)
        print('kept', s)
except ValueError:
    print('skipped', s)
print('total', total)`,
          mistake: 'invalid_row_not_skipped',
        },
      ],
      concepts: ['try-except', 'int-conversion', 'loop-flow'],
      detects: ['int_of_float_string', 'invalid_row_not_skipped'],
      expectedSec: 90,
      hints: [
        "Two questions for each entry: does `int()` accept this exact text, and if not, where does Python jump to?",
        "`int()` only accepts text that looks like a whole number. When line 5 fails, line 6 is skipped, the except block runs, and then the loop moves to the next entry.",
        "`int('2.0')` raises ValueError. The first two lines of output are `kept 4` and `skipped 2.0`.",
      ],
      solution: {
        explanation:
          "`'4'`: `int('4')` is 4, so total becomes 4 and line 6 prints `kept 4`.\n\n" +
          "`'2.0'`: `int()` does not accept text with a decimal point, even `.0`, so line 5 raises ValueError. " +
          'Line 6 is skipped, the except block prints `skipped 2.0`, and total stays 4.\n\n' +
          "`'none'`: same again, `skipped none`.\n\n" +
          "`'3'`: `kept 3`, total becomes 7.\n\n" +
          'The try/except is inside the loop, so each bad entry is handled and the loop carries on. The last line prints `total 7`.',
      },
      selfExplain: "What would you change on line 5 so that '2.0' is kept as 2?",
    },
    {
      id: 't10-s1-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Every reading vanished',
      prompt:
        '`valid_levels(readings)` should return a list of the readings that are numbers, converted to `float`, in their original order. ' +
        "Readings may have spaces or a newline around them (`float()` allows that). Anything that is not a number, such as `'N/A'` or `''`, is skipped.\n\n" +
        'Instead it returns `[]` for every list, and no error appears. ' +
        'Find out what is going wrong, fix it, and make the handler catch only the error you expect from a bad reading.',
      buggy: `def valid_levels(readings):
    levels = []
    for reading in readings:
        try:
            levels.append(float(reading.strip))
        except:
            pass
    return levels`,
      bugMistake: 'bare_except',
      maxChangedLines: 2,
      fnName: 'valid_levels',
      tests: [
        { id: 'v1', call: "valid_levels(['7.4', '7.1'])", expect: '[7.4, 7.1]', cmp: 'float', label: 'two good readings', hidden: false, tag: 'bare_except' },
        { id: 'v2', call: "valid_levels([' 6.9 ', 'N/A', '7.25'])", expect: '[6.9, 7.25]', cmp: 'float', label: 'one reading missing', hidden: false, tag: 'bare_except' },
        { id: 'h1', call: 'valid_levels([])', expect: '[]', label: 'no readings', hidden: true },
        { id: 'h2', call: "valid_levels(['', 'ERR', '-'])", expect: '[]', label: 'nothing valid', hidden: true },
        { id: 'h3', call: "valid_levels(['8', '7.0\\n', 'ERR', '-0.5'])", expect: '[8.0, 7.0, -0.5]', cmp: 'float', label: 'whole number, newline and a negative', hidden: true, tag: 'bare_except' },
      ],
      solution: {
        code: `def valid_levels(readings):
    levels = []
    for reading in readings:
        try:
            levels.append(float(reading.strip()))
        except ValueError:
            pass
    return levels`,
        explanation:
          'There are two problems on two lines, and the second one hides the first.\n\n' +
          '`except:` with no name catches every kind of error, so whatever went wrong on line 5 was silently thrown away and every reading was skipped.\n\n' +
          'Change it to `except ValueError:` and run again. Now Python shows the real error: ' +
          "`TypeError: float() argument must be a string or a real number, not 'builtin_function_or_method'`. " +
          '`reading.strip` without brackets is the method itself, not the stripped text.\n\n' +
          'Adding the brackets, `reading.strip()`, gives the text, `float()` converts it, and only genuinely bad readings such as `N/A` raise ValueError and are skipped.',
      },
      hints: [
        'The handler catches every kind of error. What if the error it catches is not a bad reading at all?',
        'Change `except:` to `except ValueError:` (the error `float()` raises for bad text) and run the visible tests. Read the new error message carefully.',
        'The message mentions `builtin_function_or_method`. Look at `reading.strip` on line 5: is the method being called?',
      ],
      concepts: ['specific-except', 'bare-except', 'method-call'],
      detects: ['bare_except', 'forgot_to_call'],
      expectedSec: 240,
      selfExplain: 'Why is a bare except more dangerous in a loop that skips bad rows than in code that runs once?',
    },
    {
      id: 't10-s1-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Average dissolved oxygen per site',
      prompt:
        'The monitoring team saves dissolved oxygen readings (mg/L) in a text file. Write `site_averages(filename)` that returns a **dictionary** mapping each site name to its mean oxygen reading, **rounded to 2 decimal places**.\n\n' +
        'The file format:\n\n' +
        '- The first line is a header. It always has a `site` column and an `oxygen` column, but the columns can be in any order and there may be other columns.\n' +
        '- Every other line is one reading, with values separated by commas and no spaces. The file name may have no extension.\n' +
        '- Skip a line if it has too few values to reach the site or oxygen column, or if its oxygen reading is not a number (for example `N/A` or blank).\n\n' +
        'Terminate gracefully: return `{}` (an empty dictionary) if the file does not exist, is empty, or its header has no `site` or no `oxygen` column. Do not print anything.',
      fnName: 'site_averages',
      starter: `def site_averages(filename):
    """Return {site: mean oxygen rounded to 2 dp}, or {} if the file cannot be used."""
    pass
`,
      tests: [
        {
          id: 'v1',
          call: "site_averages('swan_jan')",
          expect: "{'Nedlands': 6.9, 'Maylands': 5.4}",
          cmp: 'float',
          files: [{ name: 'swan_jan', content: 'site,date,oxygen\nNedlands,2026-01-05,7.2\nMaylands,2026-01-05,5.4\nNedlands,2026-01-12,6.6\n' }],
          label: 'two sites',
          hidden: false,
        },
        {
          id: 'v2',
          call: "site_averages('swan_feb')",
          expect: '{}',
          files: [{ name: 'swan_jan', content: 'site,date,oxygen\nNedlands,2026-01-05,7.2\n' }],
          label: 'file does not exist',
          hidden: false,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h1',
          call: "site_averages('swan_mar')",
          expect: "{'Ascot': 6.77, 'Bayswater': 8.0}",
          cmp: 'float',
          files: [{ name: 'swan_mar', content: 'oxygen,temp_c,date,site\n6.5,24.1,2026-03-02,Ascot\n8,23.8,2026-03-02,Bayswater\n7.0,22.9,2026-03-09,Ascot\n6.8,23.0,2026-03-16,Ascot\n' }],
          label: 'columns in a different order, site last',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "site_averages('swan_apr')",
          expect: "{'Nedlands': 7.0, 'Crawley': 6.25}",
          cmp: 'float',
          files: [{ name: 'swan_apr', content: 'date,site,oxygen\n2026-04-01,Nedlands,7.0\n2026-04-01,Crawley,N/A\n2026-04-08,Crawley,6.5\n\n2026-04-08\n2026-04-15,Crawley,\n2026-04-15,Crawley,6.0\n' }],
          label: 'N/A, blank line, short line and a blank reading',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          call: "site_averages('swan_sal')",
          expect: '{}',
          files: [{ name: 'swan_sal', content: 'site,date,salinity\nNedlands,2026-05-01,29.5\n' }],
          label: 'no oxygen column',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h4',
          call: "site_averages('swan_empty')",
          expect: '{}',
          files: [{ name: 'swan_empty', content: '' }],
          label: 'empty file',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h5',
          call: "site_averages('swan_bad')",
          expect: '{}',
          files: [{ name: 'swan_bad', content: 'site,oxygen\nNedlands,ERR\nMaylands,\n' }],
          label: 'every row is bad',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
      ],
      solution: {
        code: `def site_averages(filename):
    """Return {site: mean oxygen rounded to 2 dp}, or {} if the file cannot be used."""
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return {}
    if len(lines) == 0:
        return {}

    header = lines[0].strip().split(',')
    if 'site' not in header or 'oxygen' not in header:
        return {}
    site_col = header.index('site')
    oxygen_col = header.index('oxygen')

    totals = {}
    counts = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        try:
            site = fields[site_col]
            oxygen = float(fields[oxygen_col])
        except (IndexError, ValueError):
            continue
        totals[site] = totals.get(site, 0) + oxygen
        counts[site] = counts.get(site, 0) + 1

    averages = {}
    for site in totals:
        averages[site] = round(totals[site] / counts[site], 2)
    return averages
`,
        explanation:
          '**Open safely.** Only `open` and `readlines` go inside the first `try`. A missing file raises `FileNotFoundError`, and the function returns `{}` straight away instead of crashing.\n\n' +
          '**Check the header.** An empty file has no header line, so return `{}`. `header.index(\'oxygen\')` would raise ValueError if the column is missing, so check with `in` first and return `{}`. ' +
          'Looking the columns up by name means a file with the columns in a different order still works.\n\n' +
          '**Skip bad lines, keep going.** The second `try` is *inside* the loop and wraps only the two lines that can fail. ' +
          'A short line such as `2026-04-08` raises IndexError; `N/A` or a blank reading raises ValueError. `continue` moves to the next line.\n\n' +
          '**Accumulate per site.** `totals` and `counts` use `get(site, 0)` so the first reading for a site does not raise KeyError. ' +
          '`strip()` on each line removes the newline, so a site in the last column is `Ascot`, not `Ascot\\n`.\n\n' +
          '**Divide and round at the end.** Every site in `totals` has at least one reading, so `counts[site]` is never 0. Rounding happens once, when the result is stored.',
      },
      hints: [
        'List every way this can go wrong before you write the happy path: no file, empty file, missing column, short line, bad number. Each one needs its own small check or `try`.',
        'Plan: (1) open and read the lines inside try/except FileNotFoundError, returning {}. (2) If there are no lines, or the header is missing a column, return {}. (3) Find both column positions with `header.index(...)`. (4) Loop over the other lines with a try/except inside the loop that skips IndexError and ValueError. (5) Keep a total and a count per site in two dictionaries. (6) Build the result of rounded means.',
        "```python\nfor line in lines[1:]:\n    fields = line.strip().split(',')\n    try:\n        site = fields[site_col]\n        oxygen = float(fields[oxygen_col])\n    except (IndexError, ValueError):\n        continue\n```",
      ],
      concepts: ['try-except', 'file-not-found', 'header-lookup', 'skip-invalid-rows'],
      detects: ['no_graceful_exit', 'invalid_row_not_skipped', 'header_order_assumed', 'file_newline', 'bare_except', 'dict_keyerror'],
      expectedSec: 720,
      selfExplain: 'Why does the second try go inside the for loop, while the first try is outside it?',
    },
  ],
};

export default s1;
