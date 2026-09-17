import type { Scenario } from '../../schema.ts';

const MAY = 'Card,Stop,Zone,Fare\n0412,Elizabeth Quay,1,3.20\n0977,Cottesloe,2,4.90\n1150,Perth,1,N/A\n';

const s2: Scenario = {
  id: 't09-s2',
  title: 'SmartRider fare exports',
  story:
    'Transperth sends a monthly SmartRider export as a CSV text file for a transport planning project. ' +
    'The same columns appear every month, but their order (and sometimes their capitals) changes, and trips inside the free transit zone have a blank or `N/A` fare. ' +
    'Every helper has to find its columns by name.',
  questions: [
    {
      id: 't09-s2-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Finding the Fare column',
      prompt:
        "The March export starts with the header line `Card,Stop,Zone,Fare`. Next month's file may list the same columns in a different order.\n\n" +
        'Which expression should replace `...` so that `fare_col` is the position of the Fare column in **any** month\'s file?',
      code: `with open(filename) as f:
    header = f.readline()
    fare_col = ...`,
      options: [
        {
          id: 'a',
          text: '3',
          mistake: 'header_order_assumed',
          why: "Correct for March only. When the columns move, `fields[3]` reads a different column. CITS1401 hidden test files shuffle the columns on purpose.",
        },
        {
          id: 'b',
          text: "header.split(',').index('Fare')",
          mistake: 'file_newline',
          why: "`readline` keeps the newline, so the last name in the list is `'Fare\\n'`, not `'Fare'`. `index('Fare')` finds no exact match and raises ValueError.",
        },
        {
          id: 'c',
          text: "header.strip().split(',').index('Fare')",
          correct: true,
          why: "`strip` removes the newline, `split` makes the list `['Card', 'Stop', 'Zone', 'Fare']`, and `index` finds `'Fare'` wherever it is: 3 here, and the right position in any other order.",
        },
        {
          id: 'd',
          text: "header.strip().split(',').index('fare')",
          mistake: 'case_sensitive_compare',
          why: "The header says `Fare` with a capital F, and `index` compares strings exactly, so this raises ValueError. Lower-case the header first if the capitals can vary.",
        },
      ],
      concepts: ['header', 'index', 'strip-split'],
      detects: ['header_order_assumed', 'file_newline', 'case_sensitive_compare'],
      expectedSec: 90,
      hints: [
        'What exactly does `readline` give back, character for character, including the end of the line?',
        'You need a list of column names with nothing extra on the last one, then the position of one exact name in that list.',
        "`header.strip().split(',')` is `['Card', 'Stop', 'Zone', 'Fare']`.",
      ],
      solution: {
        explanation:
          "`header` is the string `'Card,Stop,Zone,Fare\\n'`.\n\n" +
          "`header.strip()` removes the newline, `.split(',')` gives `['Card', 'Stop', 'Zone', 'Fare']`, and `.index('Fare')` returns 3.\n\n" +
          'If next month the header is `Fare,Card,Stop,Zone`, the same expression returns 0, so `fields[fare_col]` still reads the fare. ' +
          "A hard-coded 3 would read the zone instead. Without `strip`, the last name is `'Fare\\n'` and `index` raises ValueError; searching for `'fare'` fails because the case differs.",
      },
      selfExplain: 'What would you add so the expression also works when the header says FARE?',
    },
    {
      id: 't09-s2-q2',
      format: 'multi',
      diff: 'medium',
      core: false,
      title: 'What the project marker penalises',
      prompt:
        'A CITS1401 project marker calls `main(csvfile)` with file names such as `\'taps_april\'` (no `.csv`), and the hidden test files list their columns in a different order.\n\n' +
        "Assume `header` was read with `f.readline().strip().lower().split(',')`. Select **every** line that would lose marks.",
      options: [
        {
          id: 'a',
          text: 'import csv',
          correct: true,
          why: 'Projects and the exam allow no imports at all, not even `csv` or `math`, and breaking that rule costs marks. Split each line yourself with `strip()` and `split(\',\')`.',
        },
        {
          id: 'b',
          text: "with open(csvfile + '.csv') as f:",
          correct: true,
          why: "The name `'taps_april'` becomes `'taps_april.csv'`, which does not exist, so the program crashes with FileNotFoundError.",
        },
        {
          id: 'c',
          text: "if not csvfile.endswith('.csv'):\n    return None",
          correct: true,
          why: "`'taps_april'` is a valid file name, but this check rejects it, so every test with that name gets `None` instead of the answer.",
        },
        {
          id: 'd',
          text: 'with open(csvfile) as f:',
          correct: false,
          mistake: 'csv_ext_assumed',
          why: 'This is right. The marker passes the complete file name, whatever it ends with, so open it exactly as given.',
        },
        {
          id: 'e',
          text: "fare_col = header.index('fare')",
          correct: false,
          mistake: 'header_order_assumed',
          why: 'This is the right way to cope with shuffled columns: find the position by name once, then use `fields[fare_col]` on every row.',
        },
      ],
      concepts: ['project-rules', 'no-import', 'file-name', 'header'],
      detects: ['import_used', 'csv_ext_assumed', 'header_order_assumed'],
      expectedSec: 150,
      hints: [
        'Think about two things the marker controls: the file name it passes in, and which modules your program may use.',
        'Check each line against three rules: no imports, open the file name exactly as given, and find columns by header name.',
        'Three lines break a rule. `with open(csvfile) as f:` is not one of them.',
      ],
      solution: {
        explanation:
          '**Lose marks:**\n\n' +
          '- `import csv`: any import breaks the project and exam rules and costs marks, even if the answers are right.\n' +
          "- `open(csvfile + '.csv')`: the marker's name `'taps_april'` becomes a file that does not exist, so the program crashes.\n" +
          "- `if not csvfile.endswith('.csv'): return None`: a perfectly good file name is rejected, so the test gets `None`.\n\n" +
          '**Fine:**\n\n' +
          '- `open(csvfile)` opens exactly the name the marker gave.\n' +
          "- `header.index('fare')` finds the column by name, which is what makes shuffled columns work. The header was lower-cased, so searching for `'fare'` matches `Fare` or `FARE`.",
      },
      selfExplain: 'Why is looking up a column by name safer than using its position, even if the sample file never changes?',
    },
    {
      id: 't09-s2-q3',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Total fares at one stop',
      prompt:
        'Complete `stop_fares(filename, stop)`, which returns the total of all fares paid at `stop`, rounded to 2 decimal places. ' +
        'Every row in these files has a fare. The header always spells the columns `Stop` and `Fare` exactly like that, but the columns can be in any order.',
      template: `def stop_fares(filename, stop):
    total = 0
    with open(filename) as f:
        header = f.readline().strip().split(',')
        stop_col = ⟦1⟧
        fare_col = header.index('Fare')
        for line in f:
            fields = ⟦2⟧
            if fields[stop_col] == stop:
                total += float(fields[fare_col])
    return round(total, 2)`,
      blanks: [
        { id: '1', accept: ["header.index('Stop')", 'header.index("Stop")'] },
        {
          id: '2',
          accept: ["line.strip().split(',')", 'line.strip().split(",")', "line.rstrip().split(',')", 'line.rstrip().split(",")'],
        },
      ],
      fnName: 'stop_fares',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'taps_march', content: 'Card,Stop,Zone,Fare\n0412,Elizabeth Quay,1,3.20\n0977,Perth Underground,1,3.20\n0412,Elizabeth Quay,1,3.20\n' }],
          call: "stop_fares('taps_march', 'Elizabeth Quay')",
          expect: '6.4',
          cmp: 'float',
          label: 'March file, Elizabeth Quay',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'taps_april', content: 'Fare,Zone,Card,Stop\n4.90,2,1150,Cottesloe\n3.20,1,0412,Perth Underground\n4.90,2,2231,Cottesloe\n' }],
          call: "stop_fares('taps_april', 'Cottesloe')",
          expect: '9.8',
          cmp: 'float',
          label: 'April file, Stop is the last column',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'h1',
          files: [{ name: 'taps_june', content: 'Stop,Fare,Card,Zone\nClaremont,4.90,0977,2\nPerth,3.20,1150,1\nClaremont,4.90,2231,2\n' }],
          call: "stop_fares('taps_june', 'Claremont')",
          expect: '9.8',
          cmp: 'float',
          label: 'columns in another order',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'taps_march', content: 'Card,Stop,Zone,Fare\n0412,Elizabeth Quay,1,3.20\n' }],
          call: "stop_fares('taps_march', 'Fremantle')",
          expect: '0',
          label: 'stop with no trips',
          hidden: true,
        },
        {
          id: 'h3',
          files: [{ name: 'taps_july', content: 'Card,Zone,Fare,Stop\n' }],
          call: "stop_fares('taps_july', 'Perth')",
          expect: '0',
          label: 'header only',
          hidden: true,
        },
      ],
      concepts: ['header', 'index', 'strip-split', 'accumulator'],
      detects: ['header_order_assumed', 'file_newline'],
      expectedSec: 180,
      hints: [
        'Both blanks work with text read from the file. What does the `header` list hold, and what is still stuck to the end of every line that `for line in f:` gives you?',
        'Blank 1 is the position of the Stop column, found by name the same way as `fare_col`. Blank 2 turns one line into a list of fields; when Stop is the last column, the stop name must not keep the newline.',
        "Blank 1 is `header.index('Stop')`. Blank 2 strips the line first and then splits it on commas.",
      ],
      solution: {
        code: `def stop_fares(filename, stop):
    total = 0
    with open(filename) as f:
        header = f.readline().strip().split(',')
        stop_col = header.index('Stop')
        fare_col = header.index('Fare')
        for line in f:
            fields = line.strip().split(',')
            if fields[stop_col] == stop:
                total += float(fields[fare_col])
    return round(total, 2)`,
        explanation:
          "The header line is stripped and split into a list of names, so `header.index('Stop')` and `header.index('Fare')` give the positions of those columns in **this** file. " +
          'The April file has Stop last and Fare first, and the code still reads the right fields.\n\n' +
          "`fields = line.strip().split(',')` removes the newline before splitting. In the April file Stop is the last column, so without `strip` the field would be `'Cottesloe\\n'` and never match.\n\n" +
          '`float(fields[fare_col])` converts the fare text to a number before adding. `round(total, 2)` happens once, at the end, so the total does not drift.',
      },
      selfExplain: 'Why is stop_col worked out before the loop instead of inside it?',
    },
    {
      id: 't09-s2-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Mean of any column',
      prompt:
        "Write `column_mean(filename, column)` that works for any numeric column of a SmartRider export, such as `'Fare'` or `'Zone'`.\n\n" +
        "- The first line is the header. Find `column` by name **ignoring case**: `'fare'`, `'Fare'` and `'FARE'` all match a header `Fare` or `FARE`. Columns can be in any order.\n" +
        '- Skip blank lines, and skip a row whose value in that column is empty or `N/A` (in any case).\n' +
        '- Return the mean of the remaining values as a float **rounded to 4 decimal places**, or `None` if no values are left.\n' +
        '- Open `filename` exactly as given. No imports.\n\n' +
        'Example: the file `taps_may` contains\n\n' +
        '```\n' + MAY + '```\n\n' +
        "`column_mean('taps_may', 'Fare')` returns `4.05` and `column_mean('taps_may', 'zone')` returns `1.3333`.",
      fnName: 'column_mean',
      starter: `def column_mean(filename, column):
    """Return the mean of column rounded to 4 dp, or None if no valid values."""
    pass`,
      rules: ['noImport', 'noCsvExt', 'roundAtEnd'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'taps_may', content: MAY }],
          call: "column_mean('taps_may', 'Fare')",
          expect: '4.05',
          cmp: 'float',
          label: 'Fare column with an N/A',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'taps_may', content: MAY }],
          call: "column_mean('taps_may', 'zone')",
          expect: '1.3333',
          cmp: 'float',
          label: 'zone in lower case',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'taps_june', content: 'fare,card,stop,zone\n2.50,1150,Perth,1\n4.90,2231,Cottesloe,2\n' }],
          call: "column_mean('taps_june', 'fare')",
          expect: '3.7',
          cmp: 'float',
          label: 'columns in another order',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'taps_july', content: 'CARD,STOP,ZONE,FARE\n0412,Perth,1,3.20\n0977,Subiaco,1,3.30\n' }],
          call: "column_mean('taps_july', 'Fare')",
          expect: '3.25',
          cmp: 'float',
          label: 'header in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h3',
          files: [{ name: 'taps_aug', content: 'card,stop,fare\n0412,Perth,\n0977,Perth,2.50\n1150,Perth,n/a\n\n2231,Perth,3.10\n' }],
          call: "column_mean('taps_aug', 'fare')",
          expect: '2.8',
          cmp: 'float',
          label: 'blank value, lower-case n/a and a blank line',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          files: [{ name: 'taps_sept', content: 'card,stop,fare\n0412,Perth,N/A\n0977,Perth,\n' }],
          call: "column_mean('taps_sept', 'fare')",
          expect: 'None',
          label: 'no valid values',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h5',
          files: [{ name: 'taps_oct', content: 'Zone,Fare,Stop\n2,4.90,Cottesloe\n1,3.20,Perth\n2,4.90,Claremont' }],
          call: "column_mean('taps_oct', 'ZONE')",
          expect: '1.6667',
          cmp: 'float',
          label: 'rounding, and no newline at the end',
          hidden: true,
        },
      ],
      concepts: ['header', 'case-insensitive', 'validation', 'mean', 'round'],
      detects: ['header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'zero_division', 'round_mid_calc', 'csv_ext_assumed'],
      expectedSec: 540,
      hints: [
        'Three jobs: find the column position from the header, collect a total and a count of the valid values, then work out the mean once at the end.',
        'Plan: read the header, strip it, lower-case it and split it; find the position of the lower-cased column name. For each later line, strip and split; skip it if it has the wrong number of fields; strip the value and skip it if it is empty or `N/A` after upper-casing. Add valid values to a total and count them. After the loop, return `None` if the count is 0, otherwise the rounded mean.',
        "`header = f.readline().strip().lower().split(',')` then `col = header.index(column.lower())`. Skip rows with `if value == '' or value.upper() == 'N/A': continue`.",
      ],
      solution: {
        code: `def column_mean(filename, column):
    total = 0
    count = 0
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        col = header.index(column.lower())
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            value = fields[col].strip()
            if value == '' or value.upper() == 'N/A':
                continue
            total += float(value)
            count += 1
    if count == 0:
        return None
    return round(total / count, 4)`,
        explanation:
          '`total` and `count` start at 0 before anything is read.\n\n' +
          "`header = f.readline().strip().lower().split(',')` gives a list of lower-case column names, so `header.index(column.lower())` finds the column whatever its capitals and position.\n\n" +
          "Each line is stripped and split. A blank line becomes `['']`, which does not have one field per column, so `continue` skips it.\n\n" +
          "`value = fields[col].strip()` is the text in the chosen column. An empty value or `N/A` (checked in upper case so `n/a` counts too) is skipped before `float` could crash on it.\n\n" +
          'Valid values are added to `total` and counted.\n\n' +
          'After the loop, `count == 0` means no valid values, so return `None` instead of dividing by zero. Otherwise the mean is rounded to 4 decimal places once, only when it is returned.',
      },
      selfExplain: 'Why is the value checked for N/A before it is passed to float?',
    },
  ],
};

export default s2;
