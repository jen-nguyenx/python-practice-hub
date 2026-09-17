import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

// ---------------------------------------------------------------- virtual files
// Refactor item: the draft only accepts names ending in .csv, so these sample files keep that ending.
const PERTH_RAIN = md(
  'Date,Station,Rainfall',
  '2026-06-01,Perth Airport,14.2',
  '2026-06-01,Swanbourne,9.6',
  '2026-06-02,Perth Airport,0.0',
  '2026-06-02,Swanbourne,2.4',
  '2026-06-03,Perth Airport,31.8',
  '2026-06-03,Swanbourne,27.0',
  '2026-06-04,perth airport,6.4',
  '',
);
const HILLS_RAIN = md(
  'Station,Quality,Rainfall,Date',
  'Kalamunda,Y,22.5,2026-07-10',
  'Bickley,Y,30.1,2026-07-10',
  'Kalamunda,N,3.0,2026-07-11',
  'KALAMUNDA,Y,11.7,2026-07-12',
  'Bickley,Y,0.4,2026-07-12',
  '',
);

// Project item: no .csv ending, shuffled headers, an extra column, blank and invalid rows, mixed case.
const RAIN_JAN = md(
  'Date,Station,Rainfall,Quality',
  '2026-01-03,Perth Airport,0.0,Y',
  '2026-01-03,Swanbourne,1.2,Y',
  '2026-01-04,Perth Airport,12.4,Y',
  '2026-01-04,Swanbourne,8.0,N',
  '2026-01-05,perth airport,3.2,Y',
  '2026-01-06,Perth Airport,,N',
  '2026-01-06,Swanbourne,0.6,Y',
  '2026-01-07,PERTH AIRPORT,5.1,Y',
  '',
);
const BOM_FEB = md(
  'RAINFALL,Quality,STATION,Date',
  '4.4,Y,Kings Park,2026-02-01',
  'NA,N,Kings Park,2026-02-02',
  '',
  '0.0,Y,KINGS PARK,2026-02-03',
  '-1.0,N,Kings Park,2026-02-04',
  '2.9,Y, Kings Park ,2026-02-05',
  '7.25,Y,Rottnest Island,2026-02-05',
  '',
);
const BAD_ROWS = md(
  'Date,Station,Rainfall,Quality',
  '2026-03-01,Bickley,6.5,Y',
  '2026-03-02,Bickley,trace,N',
  '2026-03-03,Bickley',
  '2026-03-04,Bickley,-2.0,N',
  '',
  '2026-03-05,Bickley,1.5,Y',
  '2026-03-06,Bickley,0.0,Y',
  '',
);

const scenario: Scenario = {
  id: 't11-s4',
  title: 'BOM rainfall project',
  story: md(
    'Project-style practice. The Bureau of Meteorology publishes daily rainfall for Perth stations, from Perth Airport to Kalamunda in the hills, as comma-separated files.',
    'Like a CITS1401 project, the program is marked by a tester that calls `main` directly, so it has to follow the project rules exactly.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 multi
    {
      id: 't11-s4-q1',
      format: 'multi',
      diff: 'medium',
      core: true,
      title: 'Spot the rule breaks',
      prompt: md(
        'Tariq\'s draft of `main(csvfile, station)` returns a list of rainfall results for one station. The project rules are: no imports, never call `input()`, no `print()` except to explain a graceful termination, do not assume the file name ends in `.csv`, and round to 4 decimal places only when putting values into the returned result.',
        '',
        'Select **every** snippet from the draft that breaks a rule.',
      ),
      options: [
        {
          id: 'a',
          correct: true,
          text: 'import csv',
          why: 'Breaks the rule. No module may be imported, not even `csv` or `math`. Split each line with `strip()` and `split(\',\')` instead.',
        },
        {
          id: 'b',
          correct: true,
          text: `if not csvfile.endswith('.csv'):
    return None`,
          why: 'Breaks the rule. The tester may pass a name such as `rain_jan` with no extension, and this check would reject a valid file. Open the name exactly as given.',
        },
        {
          id: 'c',
          correct: true,
          text: `print(results)
return results`,
          why: 'Breaks the rule. The return is right, but the `print` is not an error message, so it is extra output the rules forbid. Remove debugging prints before submitting.',
        },
        {
          id: 'd',
          correct: false,
          mistake: 'round_mid_calc',
          text: 'return [round(total, 4), round(total / days, 4)]',
          why: 'Allowed. Rounding as the values go into the returned list is exactly what the rules ask for. The rule only forbids rounding during the calculation.',
        },
        {
          id: 'e',
          correct: false,
          mistake: 'print_in_main',
          text: `except OSError:
    print('Cannot open', csvfile)
    return None`,
          why: 'Allowed. A message printed while terminating gracefully is the one exception to the no-print rule, and the function still returns a safe value.',
        },
      ],
      concepts: ['project-rules', 'no-import', 'no-print', 'round-at-output'],
      detects: ['import_used', 'csv_ext_assumed', 'print_in_main', 'round_mid_calc'],
      expectedSec: 150,
      hints: [
        'Three snippets break a rule and two follow the rules. Check each one against the five rules in the prompt, one rule at a time.',
        'Two of the rules have an exception or a timing: `print` is allowed when terminating gracefully after an error, and `round` is allowed at the moment a value goes into the returned result.',
        'The `except OSError:` block is a graceful termination. The `return [round(...), ...]` line is the output step.',
      ],
      solution: {
        explanation: md(
          '- (a) breaks the no-import rule. Every CITS1401 project does its own splitting and maths.',
          '- (b) breaks the file name rule: names may not end in `.csv`, so this rejects valid test files.',
          '- (c) breaks the no-print rule. Only the `return` is marked; the print is extra output.',
          '- (d) is allowed: rounding to 4 dp happens only as the values go into the returned list.',
          '- (e) is allowed: printing a short message during graceful termination is the stated exception, and it still returns `None`.',
        ),
      },
      selfExplain: 'Why would rounding total inside the loop be against the rules when rounding it in the return line is not?',
    },

    // ---------------------------------------------------------------- q2 refactor
    {
      id: 't11-s4-q2',
      format: 'refactor',
      diff: 'hard',
      core: true,
      title: 'Make the draft marker-safe',
      prompt: md(
        'This draft of `main(csvfile, station)` returns `[total, mean, wettest]` for one station and passes the sample tests, whose file names happen to end in `.csv`. It still breaks four project rules, and each one would cost marks with the real tester.',
        '',
        'Rewrite `main` so that it:',
        '',
        '- never calls `input()` (the tester always passes a file name);',
        '- does not check for or mention `.csv` anywhere;',
        '- calls `print()` nowhere (this draft has no error handling, so it needs no message);',
        '- keeps full precision while adding up, and rounds to 4 decimal places only in the returned list.',
        '',
        'The returned values must stay the same for the sample files.',
      ),
      code: `def main(csvfile, station):
    if csvfile == '':
        csvfile = input('Rainfall file: ')
    if not csvfile.endswith('.csv'):
        print('Please give a .csv file')
        return None
    total = 0
    days = 0
    wettest = 0
    with open(csvfile) as f:
        header = f.readline().strip().lower().split(',')
        station_col = header.index('station')
        rain_col = header.index('rainfall')
        for line in f:
            fields = line.strip().split(',')
            if fields[station_col].strip().lower() == station.strip().lower():
                rain = float(fields[rain_col])
                total = round(total + rain, 4)
                days = days + 1
                if rain > wettest:
                    wettest = rain
    print('Total:', total, 'Wettest:', wettest)
    return [total, round(total / days, 4), wettest]`,
      fnName: 'main',
      tests: [
        {
          id: 'v1',
          call: "main('perth_rain.csv', 'Perth Airport')",
          expect: '[52.4, 13.1, 31.8]',
          cmp: 'float',
          files: [{ name: 'perth_rain.csv', content: PERTH_RAIN }],
          label: 'Perth Airport, June',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('hills_rain.csv', 'Kalamunda')",
          expect: '[37.2, 12.4, 22.5]',
          cmp: 'float',
          files: [{ name: 'hills_rain.csv', content: HILLS_RAIN }],
          label: 'Kalamunda, columns in a different order',
          hidden: false,
        },
        {
          id: 'h1',
          call: "main('perth_rain.csv', 'SWANBOURNE')",
          expect: '[39.0, 13.0, 27.0]',
          cmp: 'float',
          files: [{ name: 'perth_rain.csv', content: PERTH_RAIN }],
          label: 'station name in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          call: "main('hills_rain.csv', 'Bickley')",
          expect: '[30.5, 15.25, 30.1]',
          cmp: 'float',
          files: [{ name: 'hills_rain.csv', content: HILLS_RAIN }],
          label: 'Bickley, two readings',
          hidden: true,
        },
      ],
      mustRemove: ['input_call', 'print_call', 'round_in_loop', 'csv_ext_literal'],
      pattern: 'round-at-output',
      concepts: ['project-rules', 'main-contract', 'round-at-output', 'refactor'],
      detects: ['input_called', 'print_in_main', 'round_mid_calc', 'csv_ext_assumed'],
      expectedSec: 420,
      hints: [
        'Go through the draft line by line and ask of each: would the auto-marker be happy with this? Four places need to change; the header lookup and the loop are fine.',
        'Plan: delete the `input` block and the whole `.csv` check including its message. Change the running total back to a plain `total = total + rain`. Delete the final `print`. In the return line, round `total`, the mean and `wettest` to 4 decimal places.',
        md(
          '```python',
          '                total = total + rain',
          '...',
          '    return [round(total, 4), round(total / days, 4), round(wettest, 4)]',
          '```',
        ),
      ],
      solution: {
        code: `def main(csvfile, station):
    """Return [total, mean, wettest] rainfall for station, each rounded to 4 dp."""
    total = 0
    days = 0
    wettest = 0
    with open(csvfile) as f:
        header = f.readline().strip().lower().split(',')
        station_col = header.index('station')
        rain_col = header.index('rainfall')
        for line in f:
            fields = line.strip().split(',')
            if fields[station_col].strip().lower() == station.strip().lower():
                rain = float(fields[rain_col])
                total = total + rain
                days = days + 1
                if rain > wettest:
                    wettest = rain
    return [round(total, 4), round(total / days, 4), round(wettest, 4)]`,
        explanation: md(
          '1. **`input()` removed.** The tester always passes `csvfile`, and a program that calls `input()` is not tested at all.',
          '2. **`.csv` check removed.** Hidden test files may be called `rain_jan` or `data.txt`; the program opens exactly the name it was given.',
          '3. **Rounding moved to the output.** `total = total + rain` keeps full precision. Rounding inside the loop changes later values slightly, and over many rows the 4th decimal place of the mean can end up wrong.',
          '4. **Both prints removed.** Only the returned list is marked; extra output is against the rules.',
          '5. The header lookup, the case-insensitive station match and the return shape are unchanged, so the results for the sample files are the same.',
          '',
          'The draft still crashes on a missing file or a station with no rows. Handling those is the next step: see the full project question in this scenario.',
        ),
      },
      selfExplain: 'Why does round(total + rain, 4) inside the loop count as rounding during the calculation?',
    },

    // ---------------------------------------------------------------- q3 write project
    {
      id: 't11-s4-q3',
      format: 'write',
      kind: 'project',
      diff: 'hard',
      core: true,
      title: 'Station summary main()',
      prompt: md(
        'Write `main(csvfile, station)` for a rainfall project, following every CITS1401 project rule: no imports, no `input()`, no `print()` except when terminating gracefully, no assumptions about a `.csv` ending, and rounding only in the returned result.',
        '',
        '**The file.** The first line is a header with at least the columns `Date`, `Station` and `Rainfall` (millimetres). The columns can be in any order, header names can be in any case, and there may be extra columns.',
        '',
        '**Valid readings.** Use a row only if its station matches `station` (ignore case and spaces around the name), it has as many fields as the header, and its rainfall converts to a number that is **0 or more**. Skip every other row, including blank lines.',
        '',
        '**Return** a list `[total, mean, rain_days]`:',
        '',
        '- `total`: total rainfall of the valid readings, rounded to 4 dp;',
        '- `mean`: mean rainfall per valid reading, rounded to 4 dp;',
        '- `rain_days`: how many valid readings are more than 0 (an int).',
        '',
        '**Terminate gracefully** by returning `None` if either argument is not a string, the file cannot be opened, or the station has no valid readings.',
        '',
        "Example: for the visible test file, `main('rain_jan', 'Perth Airport')` returns `[20.7, 5.175, 3]`. Splitting the work into helpers such as `read_readings(csvfile, station)` and `summarise(readings)` is good style.",
      ),
      fnName: 'main',
      starter: `def main(csvfile, station):
    """Return [total, mean, rain_days] for station from csvfile, or None."""
    pass`,
      rules: ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'mainSignature'],
      tests: [
        {
          id: 'v1',
          call: "main('rain_jan', 'Perth Airport')",
          expect: '[20.7, 5.175, 3]',
          cmp: 'float',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'Perth Airport, file name without .csv',
          hidden: false,
        },
        {
          id: 'v2',
          call: "main('rain_jan', 'swanbourne')",
          expect: '[9.8, 3.2667, 3]',
          cmp: 'float',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'station name in lower case',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h1',
          call: "main('bom_feb.txt', 'Kings Park')",
          expect: '[7.3, 2.4333, 2]',
          cmp: 'float',
          files: [{ name: 'bom_feb.txt', content: BOM_FEB }],
          label: 'columns in a different order with capital headers',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          call: "main('bad_rows', 'Bickley')",
          expect: '[8.0, 2.6667, 2]',
          cmp: 'float',
          files: [{ name: 'bad_rows', content: BAD_ROWS }],
          label: 'text, short, negative and blank rows',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          call: "main('rain_march', 'Perth Airport')",
          expect: 'None',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'file does not exist',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h4',
          call: "main('rain_jan', 'Rottnest Island')",
          expect: 'None',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'station with no readings',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h5',
          call: "main('rain_jan', 42)",
          expect: 'None',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'station is not a string',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          call: "main(['rain_jan'], 'Perth Airport')",
          expect: 'None',
          files: [{ name: 'rain_jan', content: RAIN_JAN }],
          label: 'file name is not a string',
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
        'Plan the shape before writing loops: what does `main` return on each path? There is one normal result and four ways to end with `None`. Checking arguments first and returning early keeps the rest simple.',
        'Plan: (1) return None if either argument is not a string; (2) a helper opens the file inside `try`/`except OSError` and returns None if that fails; (3) read the header, lower-case it, and find the station and rainfall columns with `index`; (4) for each later line, split it, skip it if the field count is wrong, the station does not match, the rainfall does not convert (`except ValueError`) or is negative; (5) if no readings are left, return None; (6) add up at full precision and round only in the returned list.',
        md(
          '```python',
          'header = lines[0].strip().lower().split(\',\')',
          "station_col = header.index('station')",
          "rain_col = header.index('rainfall')",
          'for line in lines[1:]:',
          "    fields = line.strip().split(',')",
          '    if len(fields) != len(header):',
          '        continue',
          '```',
        ),
      ],
      solution: {
        code: `def read_readings(csvfile, station):
    """Return the valid rainfall readings for station, or None if the file cannot be opened."""
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None
    if len(lines) == 0:
        return []
    header = lines[0].strip().lower().split(',')
    if 'station' not in header or 'rainfall' not in header:
        return []
    station_col = header.index('station')
    rain_col = header.index('rainfall')
    wanted = station.strip().lower()
    readings = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[station_col].strip().lower() != wanted:
            continue
        try:
            rain = float(fields[rain_col])
        except ValueError:
            continue
        if rain < 0:
            continue
        readings.append(rain)
    return readings


def summarise(readings):
    """Return [total, mean, rain_days] for a non-empty list of readings, not rounded."""
    total = 0
    rain_days = 0
    for rain in readings:
        total = total + rain
        if rain > 0:
            rain_days = rain_days + 1
    return [total, total / len(readings), rain_days]


def main(csvfile, station):
    """Return [total, mean, rain_days] for station from csvfile, or None."""
    if not isinstance(csvfile, str) or not isinstance(station, str):
        return None
    readings = read_readings(csvfile, station)
    if readings is None or len(readings) == 0:
        return None
    total, mean, rain_days = summarise(readings)
    return [round(total, 4), round(mean, 4), rain_days]`,
        explanation: md(
          '1. `main` has exactly the signature the task gives and stays short: check the arguments, call the helpers, round and return.',
          '2. The `isinstance` checks come first, so a number or a list never reaches `open` or `strip`.',
          '3. `read_readings` opens the name exactly as given, inside `try`/`except OSError`, so a missing file returns `None` instead of crashing. There is no `.csv` anywhere.',
          '4. The header is lower-cased and each column is found by name with `index`, so shuffled columns, capital headers and extra columns all work.',
          '5. Each row is checked before it is used: the right number of fields (this also skips blank lines and short rows), a matching station after `strip().lower()`, a rainfall that converts (`except ValueError` skips `NA` and `trace`), and a value of 0 or more.',
          '6. If no valid readings are left, `main` returns `None` before any division, so there is no `ZeroDivisionError`.',
          '7. `summarise` adds at full precision. Rounding happens once, in the returned list, and `rain_days` stays an int.',
          '8. There is no `import`, `input()` or `print()`, so the marker can call `main` directly.',
        ),
      },
      selfExplain: 'Which hidden test would fail if the station comparison used == without strip() and lower()?',
    },
  ],
};

export default scenario;
