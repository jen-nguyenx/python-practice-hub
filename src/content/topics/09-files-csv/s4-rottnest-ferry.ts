import type { Scenario } from '../../schema.ts';

const SAT = 'time,destination,passengers\n0745,Fremantle,182\n0930,Hillarys,74\n1130,Fremantle,240\n';

const s4: Scenario = {
  id: 't09-s4',
  title: 'Rottnest ferry manifests',
  story:
    'Ferries leave B Shed and Hillarys for Rottnest Island all day, and the crew saves one line per sailing to a manifest file. ' +
    'The office compares those manifests with the boarding passes scanned at the gate, and the column order changes with whichever tablet typed the file.',
  questions: [
    {
      id: 't09-s4-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      choice: true,
      title: 'Reading the log twice',
      prompt:
        'This script writes a small manifest and then reads it back. Pick exactly what it prints.',
      code: `with open('ferry_log', 'w') as f:
    f.write('0745,Fremantle,182\\n')
    f.write('0930,Hillarys,74\\n')

f = open('ferry_log')
first = f.readlines()
second = f.readlines()
f.close()
print(len(first))
print(len(second))
print(first[1])
print('done')`,
      mutants: [
        {
          // believes readlines() can be called again and starts from the top
          code: `with open('ferry_log', 'w') as f:
    f.write('0745,Fremantle,182\\n')
    f.write('0930,Hillarys,74\\n')

f = open('ferry_log')
first = f.readlines()
f.close()
f = open('ferry_log')
second = f.readlines()
f.close()
print(len(first))
print(len(second))
print(first[1])
print('done')`,
          mistake: 'efficiency_repeat_pass',
        },
        {
          // believes readlines() removes the newline from each line
          code: `with open('ferry_log', 'w') as f:
    f.write('0745,Fremantle,182\\n')
    f.write('0930,Hillarys,74\\n')

f = open('ferry_log')
first = f.readlines()
second = f.readlines()
f.close()
print(len(first))
print(len(second))
print(first[1].strip())
print('done')`,
          mistake: 'file_newline',
        },
      ],
      concepts: ['readlines', 'file-cursor', 'newline'],
      detects: ['efficiency_repeat_pass', 'file_newline'],
      expectedSec: 110,
      hints: [
        'Reading a file moves a marker forward through it. Where is that marker after the first `readlines()` has finished?',
        'Two things to settle: how many lines each `readlines()` finds, and what `print` shows for a string that already ends in a newline.',
        'The second `readlines()` starts from the end of the file, so it finds nothing. `first[1]` is the string `\'0930,Hillarys,74\\n\'`.',
      ],
      solution: {
        explanation:
          "The file ends up holding `0745,Fremantle,182\\n0930,Hillarys,74\\n`, which is two lines.\n\n" +
          '`first = f.readlines()` reads from the marker to the end of the file and gives a list of two strings, each keeping its `\\n`. ' +
          'That leaves the marker at the end of the file, so `second = f.readlines()` finds nothing left and gives `[]`. This is why `len(first)` is `2` and `len(second)` is `0`.\n\n' +
          '`print(first[1])` shows `0930,Hillarys,74` and then the line\'s own newline, and `print` adds one of its own, so a blank line follows.\n\n' +
          'Output:\n\n```\n2\n0\n0930,Hillarys,74\n\ndone\n```\n\n' +
          'The fix, when you need the data twice, is not to read twice: keep the list from the first read and use it again.',
      },
      selfExplain: 'What would len(second) be if the file were opened a second time before that line?',
    },
    {
      id: 't09-s4-q2',
      format: 'multi',
      diff: 'medium',
      core: false,
      title: 'Opening the manifest',
      prompt:
        'The office keeps adding sailings to the same manifest file all day, and sometimes the file for a date has not been made yet.\n\n' +
        'Select **every** statement that is true.',
      options: [
        {
          id: 'a',
          text: "open('ferry_log', 'w') empties the file the moment it is opened, even if nothing is ever written",
          correct: true,
          why: "`'w'` means write from scratch. The old contents are gone as soon as the file is opened, so opening a manifest with `'w'` to read it is a good way to lose a day's sailings.",
        },
        {
          id: 'b',
          text: "open('ferry_log', 'a') adds what you write to the end, and creates the file if there is none",
          correct: true,
          why: "`'a'` is append mode: the marker starts at the end of whatever is already there. If there is no such file yet, it is created empty first, so the first sailing of the day is written the same way as the rest.",
        },
        {
          id: 'c',
          text: 'open(name) on a file that is not there gives back an empty file object, so a loop over it simply does nothing',
          correct: false,
          mistake: 'no_graceful_exit',
          why: 'Opening a file that does not exist raises `FileNotFoundError` straight away, and the program stops there. Catching it is the next topic; for now, be aware that the line itself can fail.',
        },
        {
          id: 'd',
          text: "out.write(182) writes the number 182 to the file as one more line",
          correct: false,
          mistake: 'str_int_concat',
          why: '`write` takes one string and nothing else, so this raises `TypeError`. Write `out.write(str(182))`, and add the `\\n` yourself if you want a new line.',
        },
        {
          id: 'e',
          text: 'with open(name) as f: closes the file at the end of the block, so no f.close() is needed',
          correct: true,
          why: 'That is what `with` is for. It also closes the file when an error happens inside the block, which a forgotten `f.close()` would not.',
        },
      ],
      concepts: ['open-modes', 'write', 'file-not-found'],
      detects: ['no_graceful_exit', 'str_int_concat'],
      expectedSec: 150,
      hints: [
        "Three modes to keep apart: read (the default), `'w'` and `'a'`. For each one, ask what happens to a file that already exists and to a file that does not.",
        'Check each statement against one question: does this line change the file, create it, crash, or refuse the value it was given?',
        "Two statements are false. One of them is about a file that does not exist; the other is about what `write` accepts.",
      ],
      solution: {
        explanation:
          '**True:**\n\n' +
          "- `'w'` wipes the file at the moment of opening, before any `write` runs.\n" +
          "- `'a'` appends, and creates the file when there is none, which is what a running log needs.\n" +
          '- `with` closes the file for you at the end of the block.\n\n' +
          '**False:**\n\n' +
          '- Reading a file that does not exist raises `FileNotFoundError`; you never get an empty file object.\n' +
          '- `write` takes a string only. Numbers must go through `str()` or an f-string first.',
      },
      selfExplain: "Why would opening the day's manifest with 'w' to check it be a disaster?",
    },
    {
      id: 't09-s4-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The total that read the wrong column',
      prompt:
        '`total_passengers(filename)` should return the total number of passengers listed in a manifest file, as an int.\n\n' +
        'The first line is a header containing `time`, `destination` and `passengers` in some order and any capitals. ' +
        'Every other line is one sailing with a value for every column and a whole number of passengers, and there are no blank lines.\n\n' +
        'It gives the right answer for the January file, but later files either crash with `ValueError` or return a wildly wrong total. Fix it by changing one line.',
      buggy: `def total_passengers(filename):
    """Return the total number of passengers in a manifest file."""
    total = 0
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        count_col = 2
        for line in f:
            fields = line.strip().split(',')
            total += int(fields[count_col])
    return total`,
      bugMistake: 'header_order_assumed',
      maxChangedLines: 1,
      fnName: 'total_passengers',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'jan_manifest', content: 'time,destination,passengers\n0745,Fremantle,182\n0930,Hillarys,74\n' }],
          call: "total_passengers('jan_manifest')",
          expect: '256',
          label: 'January file, passengers last',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'feb_manifest', content: 'Passengers,Time,Destination\n182,0745,Fremantle\n74,0930,Hillarys\n' }],
          call: "total_passengers('feb_manifest')",
          expect: '256',
          label: 'February file, passengers first',
          hidden: false,
          tag: 'header_order_assumed',
        },
        {
          id: 'h1',
          files: [{ name: 'mar_manifest', content: 'destination,passengers,time\nRottnest,240,0800\nFremantle,96,1100\n' }],
          call: "total_passengers('mar_manifest')",
          expect: '336',
          label: 'passengers in the middle, no crash but a wrong total',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'apr_manifest', content: 'TIME,PASSENGERS,DESTINATION\n0745,182,Fremantle\n0930,74,Hillarys\n' }],
          call: "total_passengers('apr_manifest')",
          expect: '256',
          label: 'header written in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h3',
          files: [{ name: 'may_manifest', content: 'time,destination,passengers\n' }],
          call: "total_passengers('may_manifest')",
          expect: '0',
          label: 'header only, no sailings',
          hidden: true,
        },
        {
          id: 'h4',
          files: [{ name: 'jun_manifest', content: 'passengers,time,destination,vessel\n96,0800,Rottnest,Quokka I\n210,1015,Rottnest,Quokka II' }],
          call: "total_passengers('jun_manifest')",
          expect: '306',
          label: 'an extra column and no newline at the end',
          hidden: true,
          tag: 'header_order_assumed',
        },
      ],
      concepts: ['header', 'index', 'strip-split'],
      detects: ['header_order_assumed', 'case_sensitive_compare'],
      expectedSec: 200,
      hints: [
        'The header is read into a list on the line above, and then never used. Why would the code bother reading it?',
        'The position of the passengers column is different in every file, so it cannot be written as a number in the code. Work it out from the header list instead.',
        "`header` is a list of lower-case column names, so `header.index('passengers')` gives the position of that column in this file.",
      ],
      solution: {
        code: `def total_passengers(filename):
    """Return the total number of passengers in a manifest file."""
    total = 0
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        count_col = header.index('passengers')
        for line in f:
            fields = line.strip().split(',')
            total += int(fields[count_col])
    return total`,
        explanation:
          "`count_col = 2` says \"passengers is always the third column\". That is true of the January file only.\n\n" +
          "`header.index('passengers')` asks this file where its passengers column is, so the February file (passengers first) gives 0 and the March file gives 1.\n\n" +
          'The two ways the bug shows up are worth telling apart. In the February file `fields[2]` is `Fremantle`, so `int()` raises ValueError and the crash is obvious. ' +
          'In the March file `fields[2]` is `0800`, which converts happily, so the function returns 1900 instead of 336: a wrong answer with no error at all.\n\n' +
          'The header was already lower-cased when it was read, so searching for `passengers` also matches a file whose header says `PASSENGERS`. ' +
          'The lookup is done once, before the loop, not on every row.',
      },
      selfExplain: 'Which is more dangerous in a marked project: the file that crashes or the file that returns 1900?',
    },
    {
      id: 't09-s4-q4',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'The fullest sailing',
      prompt:
        'Write `peak_departure(filename)` that returns a **tuple** `(time, passengers)` for the sailing that carried the most passengers: `time` is the text from the file and `passengers` is an **int**.\n\n' +
        '- The first line is a header containing `time`, `destination` and `passengers` in any order and any capitals. There may be extra columns.\n' +
        '- If two sailings are equally full, return the one that comes **first** in the file.\n' +
        '- Skip a line that is blank, that does not have one value for every header column, or whose passengers value is not all digits.\n' +
        '- Return `None` if no line can be used.\n' +
        '- Open `filename` exactly as given. No imports.\n\n' +
        'Example: the file `sailings_sat` contains\n\n' +
        '```\n' + SAT + '```\n\n' +
        "`peak_departure('sailings_sat')` returns `('1130', 240)`.",
      fnName: 'peak_departure',
      starter: `def peak_departure(filename):
    """Return (time, passengers) for the fullest sailing, or None."""
    pass`,
      rules: ['noImport', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'sailings_sat', content: SAT }],
          call: "peak_departure('sailings_sat')",
          expect: "('1130', 240)",
          label: 'the example file',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'sailings_sun', content: 'time,destination,passengers\n0745,Fremantle,120\n1130,Fremantle,120\n' }],
          call: "peak_departure('sailings_sun')",
          expect: "('0745', 120)",
          label: 'two equally full sailings',
          hidden: false,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h1',
          files: [{ name: 'sailings_mon', content: 'passengers,vessel,time,destination\n96,Quokka I,0800,Rottnest\n210,Quokka II,1015,Rottnest\n' }],
          call: "peak_departure('sailings_mon')",
          expect: "('1015', 210)",
          label: 'columns in another order and an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'sailings_tue', content: 'time,destination,passengers\n0745,Fremantle,N/A\n\n0930,Hillarys,\n1130,Fremantle,86\n1300,Fremantle\n' }],
          call: "peak_departure('sailings_tue')",
          expect: "('1130', 86)",
          label: 'N/A, a blank line, a blank value and a short row',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [{ name: 'sailings_wed', content: 'TIME,PASSENGERS,DESTINATION\n0745,182,Fremantle\n0930,74,Hillarys' }],
          call: "peak_departure('sailings_wed')",
          expect: "('0745', 182)",
          label: 'header in capitals, no newline at the end',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h4',
          files: [{ name: 'sailings_thu', content: 'time,destination,passengers\n0745,Fremantle,9\n0930,Hillarys,180\n' }],
          call: "peak_departure('sailings_thu')",
          expect: "('0930', 180)",
          label: 'a one-digit count beside a three-digit one',
          hidden: true,
        },
        {
          id: 'h5',
          files: [{ name: 'sailings_fri', content: 'time,destination,passengers\n0745,Fremantle,N/A\n' }],
          call: "peak_departure('sailings_fri')",
          expect: 'None',
          label: 'no usable sailing',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h6',
          files: [{ name: 'sailings_none', content: 'time,destination,passengers\n' }],
          call: "peak_departure('sailings_none')",
          expect: 'None',
          label: 'header only',
          hidden: true,
        },
      ],
      concepts: ['header', 'validation', 'maximum', 'tuple-return'],
      detects: ['header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'sort_tiebreak', 'csv_ext_assumed'],
      expectedSec: 330,
      hints: [
        'This is the "biggest so far" pattern with a file in front of it. Two things have to be remembered as you read: the best count and the time that went with it.',
        'Plan: read the header, lower-case it, split it, and find the positions of `time` and `passengers`. Start the best count below every possible count. For each line, strip and split it, skip it if the field count is wrong or the passengers value is not all digits, and otherwise compare it with the best so far. At the end, return `None` if nothing was ever kept, or the tuple.',
        "Use `if not count.isdigit(): continue` to skip a bad value, and `if int(count) > best_count:` so that a later sailing with the same count does not replace the first one.",
      ],
      solution: {
        code: `def peak_departure(filename):
    """Return (time, passengers) for the fullest sailing, or None."""
    best_time = ''
    best_count = -1
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        time_col = header.index('time')
        count_col = header.index('passengers')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            count = fields[count_col].strip()
            if not count.isdigit():
                continue
            if int(count) > best_count:
                best_count = int(count)
                best_time = fields[time_col].strip()
    if best_count < 0:
        return None
    return (best_time, best_count)`,
        explanation:
          '`best_count = -1` starts below every real count, so the very first valid sailing always replaces it. Starting at 0 would be wrong for a file where every sailing carried 0 passengers.\n\n' +
          "The header is stripped, lower-cased and split, and both column positions are found by name before the loop. That is what makes the file with `passengers` first and an extra `vessel` column work.\n\n" +
          "`len(fields) != len(header)` skips a blank line (which splits into `['']`) and the short row `1300,Fremantle`, before `fields[count_col]` could raise IndexError.\n\n" +
          "`count.isdigit()` is False for `'N/A'` and for an empty value, so those rows are skipped without `int()` ever crashing.\n\n" +
          "`int(count) > best_count` compares numbers, not text: as text, `'9'` is greater than `'180'`. Using `>` rather than `>=` keeps the earlier sailing when two are equally full.\n\n" +
          '`best_count < 0` means nothing was ever kept, so the function returns `None` instead of a made-up tuple.',
      },
      selfExplain: 'Why does the check on the number of fields have to come before fields[count_col] is read?',
    },
    {
      id: 't09-s4-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Who never boarded',
      prompt:
        'The gate scans a boarding pass for every passenger who actually gets on. Write `missed_boardings(manifest, scanned)` that returns a **list of strings**: the booking references that are on the manifest but were never scanned, in **upper case**, sorted A to Z, with no repeats.\n\n' +
        '- `manifest` is a file whose first line is a header containing `booking` and `name` in any order and any capitals, possibly with extra columns. Each later line is one booking.\n' +
        '- `scanned` is a file with one booking reference per line and **no header**.\n' +
        '- Compare references ignoring capitals and any spaces around them.\n' +
        '- Ignore blank lines in both files, manifest rows that do not have one value for every header column, and rows whose booking reference is empty.\n' +
        '- Return `[]` if everyone was scanned.\n' +
        '- Open both names exactly as given. No imports.\n\n' +
        "Example: a manifest holding `RX1042`, `RX1043` and `RX1044` with a scan file holding `RX1043` and `RX1044` gives `['RX1042']`.",
      fnName: 'missed_boardings',
      starter: `def missed_boardings(manifest, scanned):
    """Return the sorted upper-case booking references that were never scanned."""
    pass`,
      rules: ['noImport', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [
            { name: 'sat_manifest', content: 'booking,name\nRX1042,Aroha Ngata\nRX1043,Minh Tran\nRX1044,Sofia Rossi\n' },
            { name: 'sat_scans', content: 'RX1043\nRX1044\n' },
          ],
          call: "missed_boardings('sat_manifest', 'sat_scans')",
          expect: "['RX1042']",
          label: 'one passenger missed the ferry',
          hidden: false,
        },
        {
          id: 'v2',
          files: [
            { name: 'sun_manifest', content: 'booking,name\nRX2001,Grace Lee\nRX2002,Tom Price\n' },
            { name: 'sun_scans', content: 'RX2001\nRX2002\n' },
          ],
          call: "missed_boardings('sun_manifest', 'sun_scans')",
          expect: '[]',
          label: 'everyone boarded',
          hidden: false,
        },
        {
          id: 'h1',
          files: [
            { name: 'mon_manifest', content: 'name,fare,booking\nGrace Lee,4.90,rx2001\nTom Price,4.90,RX2002\nMei Chen,4.90, rx2003 \n' },
            { name: 'mon_scans', content: 'RX2002\n' },
          ],
          call: "missed_boardings('mon_manifest', 'mon_scans')",
          expect: "['RX2001', 'RX2003']",
          label: 'columns in another order, lower case and spaces',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          files: [
            { name: 'tue_manifest', content: 'booking,name\nRX3001,Priya Nair\n\nRX3002\n,Joel Smith\nRX3003,Amara Okafor\n' },
            { name: 'tue_scans', content: '\nrx3003\n\n' },
          ],
          call: "missed_boardings('tue_manifest', 'tue_scans')",
          expect: "['RX3001']",
          label: 'blank lines, a short row and an empty reference',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [
            { name: 'wed_manifest', content: 'booking,name\nRX4009,Tane Walker\nRX4002,Liam Byrne\nRX4009,Tane Walker\nRX4005,Sofia Rossi\n' },
            { name: 'wed_scans', content: 'RX4002\n' },
          ],
          call: "missed_boardings('wed_manifest', 'wed_scans')",
          expect: "['RX4005', 'RX4009']",
          label: 'a repeated booking, and the answer must be sorted',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h4',
          files: [
            { name: 'thu_manifest', content: 'BOOKING,NAME,SEAT\nRX5001,Minh Tran,12A\nRX5002,Aroha Ngata,12B\n' },
            { name: 'thu_scans', content: '' },
          ],
          call: "missed_boardings('thu_manifest', 'thu_scans')",
          expect: "['RX5001', 'RX5002']",
          label: 'capital header, extra column, nobody scanned',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h5',
          files: [
            { name: 'fri_manifest', content: 'booking,name\n' },
            { name: 'fri_scans', content: 'RX6001\n' },
          ],
          call: "missed_boardings('fri_manifest', 'fri_scans')",
          expect: '[]',
          label: 'an empty manifest',
          hidden: true,
        },
      ],
      concepts: ['two-files', 'header', 'membership', 'validation', 'sorting'],
      detects: ['header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'sort_tiebreak', 'csv_ext_assumed'],
      expectedSec: 700,
      hints: [
        'Two files, so two reading loops. Read the simpler one first and keep what it holds, because you need all of it before you can judge a single manifest row.',
        'Plan: read `scanned` into a list of cleaned references (stripped and upper-cased), ignoring blank lines. Then read `manifest`: take the header, find the `booking` column by name, and for each row skip it if the field count is wrong or the reference is empty. Clean the reference the same way; if it is not in the scanned list and not already collected, add it. Sort the collected list before returning it.',
        'Clean both files the same way with `line.strip().upper()` and `fields[booking_col].strip().upper()`, then use `if ref not in boarded and ref not in missed:` before appending. Finish with `missed.sort()`.',
      ],
      solution: {
        code: `def missed_boardings(manifest, scanned):
    """Return the sorted upper-case booking references that were never scanned."""
    boarded = []
    with open(scanned) as f:
        for line in f:
            ref = line.strip().upper()
            if ref != '':
                boarded.append(ref)
    missed = []
    with open(manifest) as f:
        header = f.readline().strip().lower().split(',')
        booking_col = header.index('booking')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            ref = fields[booking_col].strip().upper()
            if ref == '':
                continue
            if ref not in boarded and ref not in missed:
                missed.append(ref)
    missed.sort()
    return missed`,
        explanation:
          '**Read the scan file first.** It has no header, so every line is a reference. Each one is stripped and upper-cased as it goes into `boarded`, and blank lines are dropped. ' +
          'Cleaning on the way in means the comparison later is a plain `in` test, with no case or spacing to worry about.\n\n' +
          "**Find the booking column by name.** The manifest header is stripped, lower-cased and split, so `header.index('booking')` copes with a `BOOKING,NAME,SEAT` header and with an extra column.\n\n" +
          "**Skip the rows that cannot be used.** `len(fields) != len(header)` drops blank lines and the short row `RX3002`. An empty reference (the row `,Joel Smith`) is dropped by the next check, before it could be added as `''`.\n\n" +
          '**Two membership tests.** `ref not in boarded` is the real question. `ref not in missed` stops a booking that appears twice in the manifest from being listed twice.\n\n' +
          '**Sort at the end.** `missed.sort()` puts the list in order in place; `sorted(missed)` returned instead would do the same. The references are already upper case, so A to Z order is what the task asks for.\n\n' +
          'Reading the scan file into a list once, rather than reopening it for every manifest row, is the difference between one pass over each file and hundreds.',
      },
      selfExplain: 'What would go wrong if the references were compared without upper-casing both files?',
    },
  ],
};

export default s4;
