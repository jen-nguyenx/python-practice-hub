import type { Scenario } from '../../schema.ts';

const RIVER_WEEK = 'time,site,temp_c\n' +
  '06:00,Maylands,18.4\n' +
  '06:00,Nedlands,19.2\n' +
  '07:00,Maylands,19.0\n' +
  '07:00,Point Walter,17.6\n' +
  '08:00,Nedlands,19.4\n';

const s1: Scenario = {
  id: 't09-s1',
  title: 'Swan River sensor logs',
  story:
    'Water temperature loggers in the Swan River at Maylands, Nedlands and Point Walter save one reading per line to a plain text file. ' +
    'A UWA honours student needs to pull readings out of these logs and save short reports, without importing anything.',
  questions: [
    {
      id: 't09-s1-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      choice: true,
      title: 'What the logger wrote',
      prompt:
        'The Maylands logger writes a small file, then a script reads it back. Look carefully at every `write`. Pick exactly what this program prints.',
      code: `with open('maylands.txt', 'w') as f:
    f.write('time,temp_c\\n')
    f.write('06:00,18.5\\n')
    f.write('07:00,19.1')
    f.write('08:00,19.4\\n')

with open('maylands.txt') as f:
    header = f.readline()
    for line in f:
        print(line.strip().split(','))
print(len(header))`,
      mutants: [
        {
          code: `with open('maylands.txt', 'w') as f:
    f.write('time,temp_c\\n')
    f.write('06:00,18.5\\n')
    f.write('07:00,19.1\\n')
    f.write('08:00,19.4\\n')

with open('maylands.txt') as f:
    header = f.readline()
    for line in f:
        print(line.strip().split(','))
print(len(header))`,
          mistake: 'file_newline',
        },
        {
          code: `with open('maylands.txt', 'w') as f:
    f.write('time,temp_c\\n')
    f.write('06:00,18.5\\n')
    f.write('07:00,19.1')
    f.write('08:00,19.4\\n')

with open('maylands.txt') as f:
    header = f.readline()
    for line in f:
        print(line.strip().split(','))
print(len(header.strip()))`,
          mistake: 'file_newline',
        },
      ],
      concepts: ['write', 'readline', 'newline', 'strip-split'],
      detects: ['file_newline'],
      expectedSec: 110,
      hints: [
        '`write` puts exactly the characters you give it into the file, and nothing else. `readline` gives back one whole line of the file.',
        'Write out what the file holds, character by character, and mark each `\\n`: that is where a line ends. Then remember the first line was already read before the loop starts.',
        "The third write has no `\\n`, so `08:00,19.4` carries straight on from `07:00,19.1` on the same line. For the last print, count every character of `'time,temp_c\\n'`.",
      ],
      solution: {
        explanation:
          "`open('maylands.txt', 'w')` creates the file (or wipes it). `write` never adds a newline of its own, so the file holds `time,temp_c\\n06:00,18.5\\n07:00,19.108:00,19.4\\n`. That is only three lines, because nothing ends the line after `19.1`.\n\n" +
          '`header = f.readline()` reads the first line **including** its newline. The `for` loop then carries on from the second line, so the header is not printed.\n\n' +
          "Each line is stripped and split on commas: `['06:00', '18.5']`, then `['07:00', '19.108:00', '19.4']` (three strings, because the two readings ran together).\n\n" +
          "`len(header)` counts the 11 visible characters of `time,temp_c` plus the newline: `12`.",
      },
      selfExplain: 'What one change to the program would make it print three separate readings?',
    },
    {
      id: 't09-s1-q2',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Maylands readings go missing',
      prompt:
        '`readings_for(filename, site)` should return a list of the temperatures (as floats) logged at `site`, in file order. ' +
        'The file starts with the header `time,temp_c,site`, then one reading per line, for example `06:00,18.5,Maylands`. Site names match exactly.\n\n' +
        'The function returns `[]` for every site, even though the file has readings. Find and fix the bug.',
      buggy: `def readings_for(filename, site):
    readings = []
    with open(filename) as f:
        f.readline()
        for line in f:
            fields = line.split(',')
            if fields[2] == site:
                readings.append(float(fields[1]))
    return readings`,
      bugMistake: 'file_newline',
      maxChangedLines: 1,
      fnName: 'readings_for',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'river_log', content: 'time,temp_c,site\n06:00,18.5,Maylands\n06:00,19.0,Nedlands\n07:00,19.1,Maylands\n' }],
          call: "readings_for('river_log', 'Maylands')",
          expect: '[18.5, 19.1]',
          cmp: 'float',
          label: 'two Maylands readings',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'v2',
          files: [{ name: 'river_log', content: 'time,temp_c,site\n06:00,18.5,Maylands\n06:00,19.0,Nedlands\n07:00,19.1,Maylands\n' }],
          call: "readings_for('river_log', 'Nedlands')",
          expect: '[19.0]',
          cmp: 'float',
          label: 'one Nedlands reading',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'h1',
          files: [{ name: 'point_walter', content: 'time,temp_c,site\n06:00,17.2,Point Walter\n07:00,17.8,Point Walter' }],
          call: "readings_for('point_walter', 'Point Walter')",
          expect: '[17.2, 17.8]',
          cmp: 'float',
          label: 'last line has no newline',
          hidden: true,
          tag: 'file_newline',
        },
        {
          id: 'h2',
          files: [{ name: 'river_log', content: 'time,temp_c,site\n06:00,18.5,Maylands\n07:00,19.1,Maylands\n' }],
          call: "readings_for('river_log', 'Nedlands')",
          expect: '[]',
          label: 'site not in the file',
          hidden: true,
        },
        {
          id: 'h3',
          files: [{ name: 'empty_log', content: 'time,temp_c,site\n' }],
          call: "readings_for('empty_log', 'Maylands')",
          expect: '[]',
          label: 'header only',
          hidden: true,
        },
      ],
      concepts: ['read-lines', 'strip-split', 'newline'],
      detects: ['file_newline'],
      expectedSec: 180,
      hints: [
        'Imagine printing `fields` for the first data line. Look very closely at the last item in that list.',
        'Compare what `fields[2]` actually holds with what `site` holds. Something invisible is left at the end of every line read from a file. Remove it before splitting.',
        'Only the split line needs to change. `strip()` removes spaces and newlines from both ends of a string.',
      ],
      solution: {
        code: `def readings_for(filename, site):
    readings = []
    with open(filename) as f:
        f.readline()
        for line in f:
            fields = line.strip().split(',')
            if fields[2] == site:
                readings.append(float(fields[1]))
    return readings`,
        explanation:
          '`f.readline()` reads past the header, so the loop starts at the first reading.\n\n' +
          "Every line read from a file ends with `'\\n'`. In the buggy version `line.split(',')` keeps it on the last field, so `fields[2]` is `'Maylands\\n'`, which never equals `'Maylands'`. Nothing is appended and the function returns `[]`.\n\n" +
          "`line.strip().split(',')` removes the newline first, so `fields[2]` is `'Maylands'` and the comparison works.\n\n" +
          "`float(fields[1])` turns the text `'18.5'` into the number 18.5. The temperature is the middle field, so the newline was never attached to it; only the site name at the end of the line carried it.",
      },
      selfExplain: 'Why did the buggy version still find a reading when it was on the very last line of a file with no newline at the end?',
    },
    {
      id: 't09-s1-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Save the warm sites',
      prompt:
        'Build `save_warm_sites(averages, limit, filename)`. `averages` is a dictionary such as `{\'Maylands\': 19.2, \'Nedlands\': 18.4}`.\n\n' +
        'The function creates the file `filename` and writes one line `site,average` (for example `Maylands,19.2`) for each site whose average is **above** `limit`, in dictionary order. ' +
        'Every line ends with a newline. It returns the number of lines written (an int). Not every line is needed.',
      lines: [
        { text: 'def save_warm_sites(averages, limit, filename):', indent: 0 },
        { text: 'count = 0', indent: 1 },
        { text: "with open(filename, 'w') as f:", indent: 1 },
        { text: 'for site in averages:', indent: 2 },
        { text: 'if averages[site] > limit:', indent: 3 },
        { text: "f.write(site + ',' + str(averages[site]) + '\\n')", indent: 4 },
        { text: 'count += 1', indent: 4 },
        { text: 'return count', indent: 1 },
      ],
      distractors: [
        { text: "f.write(site + ',' + str(averages[site]))", indent: 4, mistake: 'file_newline' },
        { text: "f.write(site + ',' + averages[site] + '\\n')", indent: 4, mistake: 'str_int_concat' },
      ],
      indentMatters: true,
      fnName: 'save_warm_sites',
      tests: [
        {
          id: 'v1',
          call: "(save_warm_sites({'Maylands': 19.2, 'Nedlands': 18.4, 'Point Walter': 19.6}, 19.0, 'warm_sites'), open('warm_sites').read())",
          expect: "(2, 'Maylands,19.2\\nPoint Walter,19.6\\n')",
          label: 'two of three sites are warm',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'v2',
          call: "(save_warm_sites({'Maylands': 18.9}, 19.0, 'none_warm'), open('none_warm').read())",
          expect: "(0, '')",
          label: 'no site above the limit',
          hidden: false,
        },
        {
          id: 'h1',
          call: "(save_warm_sites({'Nedlands': 19.0, 'Maylands': 19.5}, 19.0, 'warm_sites'), open('warm_sites').read())",
          expect: "(1, 'Maylands,19.5\\n')",
          label: 'average equal to the limit is not written',
          hidden: true,
        },
        {
          id: 'h2',
          call: "(save_warm_sites({'Point Walter': 21.25}, 20.0, 'report'), open('report').read())",
          expect: "(1, 'Point Walter,21.25\\n')",
          label: 'one warm site',
          hidden: true,
          tag: 'str_int_concat',
        },
        {
          id: 'h3',
          call: "(save_warm_sites({'Maylands': 20, 'Nedlands': 22}, 19, 'whole'), open('whole').read())",
          expect: "(2, 'Maylands,20\\nNedlands,22\\n')",
          label: 'whole-number averages',
          hidden: true,
          tag: 'str_int_concat',
        },
      ],
      concepts: ['write', 'newline', 'str-conversion', 'counter'],
      detects: ['file_newline', 'str_int_concat'],
      expectedSec: 200,
      hints: [
        "Opening with `'w'` creates the file. `write` accepts only a string, and it adds nothing to the end of it.",
        'Plan: start a counter at 0, then open the file for writing, then loop over the sites. If a site\'s average is above the limit, write one line and add 1 to the counter. Return the counter after the `with` block.',
        "The line that writes is `f.write(site + ',' + str(averages[site]) + '\\n')`.",
      ],
      solution: {
        code: `def save_warm_sites(averages, limit, filename):
    count = 0
    with open(filename, 'w') as f:
        for site in averages:
            if averages[site] > limit:
                f.write(site + ',' + str(averages[site]) + '\\n')
                count += 1
    return count`,
        explanation:
          '`count = 0` starts the counter before anything is written.\n\n' +
          "`with open(filename, 'w') as f:` creates the file (wiping any old one) and closes it when the block ends. Even if nothing is written, the file exists and is empty.\n\n" +
          '`for site in averages:` loops over the keys in dictionary order, and `if averages[site] > limit:` keeps only sites strictly above the limit.\n\n' +
          "`str(averages[site])` turns 19.2 into `'19.2'`, because `+` cannot join a string and a float. The `'\\n'` at the end is needed because `write` never adds a newline; without it every site would run together on one line.\n\n" +
          '`count += 1` sits inside the `if`, next to the write, so it counts only lines actually written. `return count` is outside the `with` block, after the file is closed.',
      },
      selfExplain: 'What would the file contain for the first visible test if the newline were left off the write line?',
    },
    {
      id: 't09-s1-q4',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Daily temperature range',
      prompt:
        'Write `temp_range(filename, site)` that returns a **tuple** `(lowest, highest)` of the temperatures (floats) logged at `site`.\n\n' +
        'The file starts with the header `time,temp_c,site`, then one reading per line, such as `06:00,18.5,Nedlands`.\n\n' +
        "- Match the site **ignoring case**, so `'Nedlands'` matches `nedlands` and `NEDLANDS` in the file.\n" +
        '- Skip blank lines.\n' +
        '- Return `None` if the site has no readings.\n' +
        '- Open `filename` exactly as given. No imports.\n\n' +
        "Example: if the file `nedlands_log` holds three Nedlands readings (18.5, 19.1 and 20.2) and one Maylands reading (19.4), `temp_range('nedlands_log', 'Nedlands')` returns `(18.5, 20.2)` and `temp_range('nedlands_log', 'Maylands')` returns `(19.4, 19.4)`.",
      fnName: 'temp_range',
      starter: `def temp_range(filename, site):
    """Return (lowest, highest) temperature for site, or None."""
    pass`,
      rules: ['noImport', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'nedlands_log', content: 'time,temp_c,site\n06:00,18.5,Nedlands\n07:00,19.4,Maylands\n08:00,19.1,Nedlands\n09:00,20.2,Nedlands\n' }],
          call: "temp_range('nedlands_log', 'Nedlands')",
          expect: '(18.5, 20.2)',
          cmp: 'float',
          label: 'three Nedlands readings',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'v2',
          files: [{ name: 'nedlands_log', content: 'time,temp_c,site\n06:00,18.5,Nedlands\n07:00,19.4,Maylands\n08:00,19.1,Nedlands\n09:00,20.2,Nedlands\n' }],
          call: "temp_range('nedlands_log', 'Maylands')",
          expect: '(19.4, 19.4)',
          cmp: 'float',
          label: 'one reading',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'mixed_case', content: 'time,temp_c,site\n06:00,18.1,nedlands\n07:00,18.9,NEDLANDS\n08:00,19.3,Nedlands\n' }],
          call: "temp_range('mixed_case', 'Nedlands')",
          expect: '(18.1, 19.3)',
          cmp: 'float',
          label: 'site written in different capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          files: [{ name: 'nedlands_log', content: 'time,temp_c,site\n06:00,18.5,Nedlands\n07:00,19.4,Maylands\n' }],
          call: "temp_range('nedlands_log', 'Point Walter')",
          expect: 'None',
          label: 'site not in the file',
          hidden: true,
        },
        {
          id: 'h3',
          files: [{ name: 'gaps', content: 'time,temp_c,site\n06:00,16.9,Point Walter\n\n07:00,16.4,Point Walter\n\n' }],
          call: "temp_range('gaps', 'Point Walter')",
          expect: '(16.4, 16.9)',
          cmp: 'float',
          label: 'blank lines in the file',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          files: [{ name: 'winter', content: 'time,temp_c,site\n06:00,14.2,Maylands\n07:00,13.8,Maylands\n08:00,13.5,Maylands' }],
          call: "temp_range('winter', 'Maylands')",
          expect: '(13.5, 14.2)',
          cmp: 'float',
          label: 'falling temperatures, no newline at the end',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h5',
          files: [{ name: 'header_only', content: 'time,temp_c,site\n' }],
          call: "temp_range('header_only', 'Maylands')",
          expect: 'None',
          label: 'header only',
          hidden: true,
        },
      ],
      concepts: ['read-lines', 'strip-split', 'case-insensitive', 'min-max', 'tuple-return'],
      detects: ['file_newline', 'case_sensitive_compare', 'invalid_row_not_skipped', 'accumulator_init', 'return_type_wrong', 'csv_ext_assumed'],
      expectedSec: 300,
      hints: [
        'Use the same reading pattern as the bug fix: skip the header, then strip and split each line. A blank line splits into a list with only one item.',
        'Plan: make an empty list of temperatures. Open the file and read past the header. For each line, strip and split it; skip it if it does not have 3 fields; if the lower-cased site matches the lower-cased argument, append the temperature as a float. After reading, return `None` for an empty list, otherwise the smallest and largest values as a tuple.',
        "Inside the loop: `if len(fields) == 3 and fields[2].lower() == site.lower():` then `temps.append(float(fields[1]))`. At the end: `return (min(temps), max(temps))`.",
      ],
      solution: {
        code: `def temp_range(filename, site):
    temps = []
    with open(filename) as f:
        f.readline()
        for line in f:
            fields = line.strip().split(',')
            if len(fields) == 3 and fields[2].lower() == site.lower():
                temps.append(float(fields[1]))
    if len(temps) == 0:
        return None
    return (min(temps), max(temps))`,
        explanation:
          '`temps = []` collects every matching temperature, so the lowest and highest can be found at the end.\n\n' +
          '`f.readline()` reads past the header. `for line in f:` then visits each remaining line once.\n\n' +
          "`line.strip().split(',')` removes the newline and splits the line into fields. A blank line becomes `['']`, which has 1 field, so `len(fields) == 3` skips it before `fields[2]` could raise IndexError.\n\n" +
          "`fields[2].lower() == site.lower()` compares both names in lower case, so `NEDLANDS`, `nedlands` and `Nedlands` all match.\n\n" +
          '`float(fields[1])` converts the text to a number before appending; comparing strings would put `\'9.5\'` above `\'18.5\'`.\n\n' +
          'If nothing matched, `temps` is empty and the function returns `None` (calling `min` on an empty list would crash). Otherwise `(min(temps), max(temps))` is the tuple. ' +
          'If you track the lowest value with a variable instead, start it from the first reading, not from 0, or it would stay 0.',
      },
      selfExplain: 'Why must the length check come before fields[2] in the same condition?',
    },
    {
      id: 't09-s1-q5',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 20,
      examSlot: 'file-report',
      diff: 'hard',
      core: true,
      title: 'Warmest sites of the week',
      prompt:
        'Exam practice: write your answer as you would on paper, without running it.\n\n' +
        'A week of logging is saved in one file and the honours student wants a single ranking table. The first line of `filename` is a header ' +
        'containing `site` and `temp_c` in an **unknown order and with unknown capitals**, and there may be other columns, such as `time` or `depth_m`, which you ignore. ' +
        'Each later line is one reading.\n\n' +
        'Write `site_ranking(filename)` that returns a **list of tuples** `(site, mean)`, one tuple for each site that has at least one usable reading:\n\n' +
        '- `site` is the site name in **upper case** with spaces at both ends removed, so two spellings that differ only in capitals or in surrounding spaces are the same site;\n' +
        '- `mean` is the mean of that site\'s usable temperatures, **rounded to 2 decimal places**;\n' +
        '- the list is ordered by `mean`, **largest first**, and if two sites have the same rounded mean the one whose upper-case name comes **first alphabetically** goes first.\n\n' +
        'Skip a line if it is blank, if it does not have one value for every header column, if its site name is empty once spaces are stripped, ' +
        'or if its temperature is not a number. The only values in the temperature column that are not numbers are the empty string and `N/A` in any capitals.\n\n' +
        'Return `[]` if the header does not contain both `site` and `temp_c`, if the file has nothing in it at all, or if no line can be used.\n\n' +
        'Open `filename` exactly as it is given; do not add `.csv`. No imports, and no recursion. ' +
        'You may assume the file itself opens, so you do not need `try` / `except` here (catching errors from `open` is the next topic).\n\n' +
        'Example: the file `river_week` contains\n\n' +
        '```\n' + RIVER_WEEK + '```\n\n' +
        "`site_ranking('river_week')` returns `[('NEDLANDS', 19.3), ('MAYLANDS', 18.7), ('POINT WALTER', 17.6)]`.",
      fnName: 'site_ranking',
      starter: `def site_ranking(filename):
    """Return [(SITE, mean temperature), ...] warmest first, or []."""
    pass`,
      rules: ['noImport', 'noCsvExt', 'roundAtEnd'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'river_week', content: RIVER_WEEK }],
          call: "site_ranking('river_week')",
          expect: "[('NEDLANDS', 19.3), ('MAYLANDS', 18.7), ('POINT WALTER', 17.6)]",
          cmp: 'float',
          label: 'the example file',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'river_week2', content: 'time,site,temp_c\n06:00,Nedlands,20.4\n07:00,Maylands,21.1\n08:00,Nedlands,20.0\n' }],
          call: "site_ranking('river_week2')",
          expect: "[('MAYLANDS', 21.1), ('NEDLANDS', 20.2)]",
          cmp: 'float',
          label: 'one site logged twice',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'deep_log', content: 'temp_c,depth_m,site,time\n21.0,0.5,Blackwall Reach,1200\n19.6,1.5,Claremont,1300\n20.4,0.5,Blackwall Reach,1400\n' }],
          call: "site_ranking('deep_log')",
          expect: "[('BLACKWALL REACH', 20.7), ('CLAREMONT', 19.6)]",
          cmp: 'float',
          label: 'columns in another order and an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'typed_by_hand', content: 'site,temp_c\nnedlands,18.0\nNEDLANDS,19.0\n Nedlands ,20.0\nmaylands,21.0\n' }],
          call: "site_ranking('typed_by_hand')",
          expect: "[('MAYLANDS', 21.0), ('NEDLANDS', 19.0)]",
          cmp: 'float',
          label: 'one site typed in three different ways',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h3',
          files: [{ name: 'patchy_log', content: 'time,site,temp_c\n06:00,Maylands,18.0\n\n07:00,Maylands\n08:00,Maylands,N/A\n09:00,,19.5\n10:00,Maylands,20.0\n11:00,Nedlands,\n' }],
          call: "site_ranking('patchy_log')",
          expect: "[('MAYLANDS', 19.0)]",
          cmp: 'float',
          label: 'blank line, short row, N/A, missing site and an empty temperature',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          files: [{ name: 'calm_day', content: 'site,temp_c\nPoint Walter,18.0\nMaylands,18.0\n' }],
          call: "site_ranking('calm_day')",
          expect: "[('MAYLANDS', 18.0), ('POINT WALTER', 18.0)]",
          cmp: 'float',
          label: 'two sites with the same mean',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h5',
          files: [{ name: 'logger_failed', content: '' }],
          call: "site_ranking('logger_failed')",
          expect: '[]',
          label: 'a file with nothing in it',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h6',
          files: [{ name: 'depths_only', content: 'time,site,depth_m\n06:00,Maylands,0.5\n' }],
          call: "site_ranking('depths_only')",
          expect: '[]',
          label: 'the header does not name a temperature column',
          hidden: true,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h7',
          files: [{ name: 'fine_log', content: 'site,temp_c\nMaylands,18.1\nMaylands,18.2\nMaylands,18.4' }],
          call: "site_ranking('fine_log')",
          expect: "[('MAYLANDS', 18.23)]",
          cmp: 'float',
          label: 'a mean that needs rounding, and no newline at the end',
          hidden: true,
        },
      ],
      concepts: ['header-lookup', 'validation', 'grouping', 'mean', 'ranking', 'sort-tiebreak'],
      detects: [
        'header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'sort_tiebreak',
        'no_graceful_exit', 'round_mid_calc', 'return_type_wrong', 'csv_ext_assumed',
      ],
      expectedSec: 900,
      hints: [
        'Three jobs hide inside this one: decide which rows are usable, add each site up as you go, and only then put the sites in order. Which of the three needs a dictionary?',
        'Plan: (1) read the header, strip it, lower-case it and split it, and return `[]` unless both column names are in it; (2) find the two positions with `index`; ' +
          '(3) for each later line, strip and split, skip it unless the field count matches, the cleaned site name is not empty and the temperature is neither empty nor `N/A`; ' +
          "(4) keep two dictionaries, one of totals and one of counts, keyed by the upper-case site name; (5) work out each site's rounded mean; (6) order the sites and build the list of tuples.",
        'Work out `means[site] = round(totals[site] / counts[site], 2)` first. A short way to get the order right is then to sort pairs that hold the **negative** mean first: ' +
          '`pairs.append((-means[site], site))`, then `pairs.sort()`. ' +
          'Sorting puts the largest mean first (because its negative is the smallest) and settles a tie by the site name, A to Z. Turn each pair back into `(site, -value)`.',
      ],
      solution: {
        code: `def site_ranking(filename):
    totals = {}
    counts = {}
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        if 'site' not in header or 'temp_c' not in header:
            return []
        site_col = header.index('site')
        temp_col = header.index('temp_c')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            site = fields[site_col].strip().upper()
            value = fields[temp_col].strip()
            if site == '' or value == '' or value.upper() == 'N/A':
                continue
            totals[site] = totals.get(site, 0) + float(value)
            counts[site] = counts.get(site, 0) + 1
    means = {}
    for site in totals:
        means[site] = round(totals[site] / counts[site], 2)
    pairs = []
    for site in means:
        pairs.append((-means[site], site))
    pairs.sort()
    ranking = []
    for value, site in pairs:
        ranking.append((site, -value))
    return ranking`,
        explanation:
          'A marker would look for these steps (20 marks):\n\n' +
          "1. Open `filename` with `with open(filename)` (nothing added to the name) and read the header once, stripped, lower-cased and split on commas (2 marks).\n" +
          "2. Guard the header: `if 'site' not in header or 'temp_c' not in header: return []`. This is what makes the file with nothing in it safe, because `readline` gives `''` there and " +
          "the header list is `['']`. Without the guard, `index` raises ValueError and the function crashes instead of returning an empty list (3 marks).\n" +
          '3. Find both positions with `index`, once, before the loop, so any column order, any capitals and extra columns such as `depth_m` all work (3 marks).\n' +
          "4. Check every row before using it: `len(fields) != len(header)` drops blank lines (which split into `['']`) and short rows before any `fields[...]` could raise IndexError, " +
          "and an empty site name or a temperature of `''` or `N/A` is skipped so `float` never crashes (4 marks).\n" +
          '5. Clean each site name once, on the way in, with `strip().upper()`, so `nedlands`, `NEDLANDS` and ` Nedlands ` all land on the same dictionary key and the key is already ' +
          'in the upper case the task asks for (3 marks).\n' +
          '6. Keep a total and a count per site with `dict.get(key, 0)` while reading, then work out each mean afterwards and round it to 2 decimal places there, not on the way in (3 marks).\n' +
          '7. Order the result. Each pair holds the **negative** mean first, so `pairs.sort()` puts the largest mean first and, when two means are equal, falls back to comparing the ' +
          'site names A to Z. Each pair is turned back into `(site, -value)`, giving a list of tuples (2 marks).\n\n' +
          'Sorting is not the only way. You could loop over `sorted(totals)` and insert each site into the result in front of the first site with a smaller mean; going through the ' +
          'names alphabetically is what keeps a tie in the right order. A bare `ranking.sort()` on `(site, mean)` pairs would sort by name instead, which is not what was asked.',
      },
      selfExplain: 'Why is the header checked for both column names before index is called on it?',
    },
  ],
};

export default s1;
