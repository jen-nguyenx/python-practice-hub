import type { Scenario } from '../../schema.ts';

const ODAY = 'Name,Student_Number,Club\n' +
  'Aroha Ngata,23456789,Chess Club\n' +
  'Minh Tran,24123456,Rock Climbing\n' +
  'Sofia Rossi,23999001,chess club \n' +
  'Aroha Ngata,23456789,CHESS CLUB\n' +
  'Liam Byrne,2412,Rock Climbing\n';

const s3: Scenario = {
  id: 't09-s3',
  title: 'UWA Guild O-Day sign-ups',
  story:
    'At O-Day, UWA Guild clubs take sign-ups on shared tablets, and every export lands in one folder. ' +
    'Volunteers typed fast, so the files have blank rows, missing or mistyped student numbers, and club names in every mix of capitals.',
  questions: [
    {
      id: 't09-s3-q1',
      format: 'fixBug',
      diff: 'hard',
      core: false,
      title: 'Two bugs in the sign-up counter',
      prompt:
        '`count_signups(filename, club)` should return how many rows of a sign-up file are for `club`, matching the club name **ignoring case**. ' +
        'A row with an **empty student number** must not be counted.\n\n' +
        'The header contains `Name`, `Student_Number` and `Club` in some order. Every row has all its commas and there are no blank lines.\n\n' +
        "The marker calls the function with file names such as `'oday_signups'`, and every test crashes. There are **two** bugs. Fix both.",
      buggy: `def count_signups(filename, club):
    count = 0
    with open(filename + '.csv') as f:
        header = f.readline().strip().lower().split(',')
        club_col = header.index('club')
        number_col = header.index('student_number')
        for line in f:
            fields = line.strip().split(',')
            if fields[club_col].lower() == club.lower():
                count += 1
    return count`,
      bugMistake: 'csv_ext_assumed',
      maxChangedLines: 2,
      fnName: 'count_signups',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'oday_signups', content: 'Name,Student_Number,Club\nAroha Ngata,23456789,Chess Club\nMinh Tran,24123456,Rock Climbing\nSofia Rossi,23999001,chess club\n' }],
          call: "count_signups('oday_signups', 'Chess Club')",
          expect: '2',
          label: 'Chess Club in two spellings',
          hidden: false,
          tag: 'csv_ext_assumed',
        },
        {
          id: 'v2',
          files: [{ name: 'climbing', content: 'Club,Name,Student_Number\nRock Climbing,Minh Tran,24123456\nChess Club,Aroha Ngata,23456789\nROCK CLIMBING,Priya Nair,25001234\n' }],
          call: "count_signups('climbing', 'rock climbing')",
          expect: '2',
          label: 'columns in another order',
          hidden: false,
          tag: 'csv_ext_assumed',
        },
        {
          id: 'h1',
          files: [{ name: 'oday_signups', content: 'Name,Student_Number,Club\nAroha Ngata,23456789,Chess Club\nLiam Byrne,,Chess Club\nMinh Tran,24123456,chess club\n' }],
          call: "count_signups('oday_signups', 'Chess Club')",
          expect: '2',
          label: 'a row with no student number',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'debating', content: 'Club,Name,Student_Number\nDebating,Liam Byrne,\nDebating,Amara Okafor,\nDebating,Joel Smith,25004321\n' }],
          call: "count_signups('debating', 'DEBATING')",
          expect: '1',
          label: 'empty student number in the last column',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [{ name: 'anime.csv', content: 'Name,Student_Number,Club\nPriya Nair,25001234,Anime Club\n' }],
          call: "count_signups('anime.csv', 'Anime Club')",
          expect: '1',
          label: 'a file name that already ends in .csv',
          hidden: true,
          tag: 'csv_ext_assumed',
        },
        {
          id: 'h4',
          files: [{ name: 'oday_signups', content: 'Name,Student_Number,Club\nAroha Ngata,23456789,Chess Club\n' }],
          call: "count_signups('oday_signups', 'Surf Club')",
          expect: '0',
          label: 'club with no sign-ups',
          hidden: true,
        },
      ],
      concepts: ['file-name', 'validation', 'header', 'case-insensitive'],
      detects: ['csv_ext_assumed', 'invalid_row_not_skipped'],
      expectedSec: 420,
      hints: [
        'Run a visible test and read the error: which file name did Python try to open? For the second bug, reread the spec and look for a rule the code never checks.',
        'Bug 1 is on the `open` line: use the name exactly as it was passed in. Bug 2: `number_col` is worked out but never used. A row should count only when its club matches **and** its student number is not empty.',
        "The counting condition needs a second part joined with `and`, comparing `fields[number_col]` with the empty string `''`.",
      ],
      solution: {
        code: `def count_signups(filename, club):
    count = 0
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        club_col = header.index('club')
        number_col = header.index('student_number')
        for line in f:
            fields = line.strip().split(',')
            if fields[club_col].lower() == club.lower() and fields[number_col] != '':
                count += 1
    return count`,
        explanation:
          "**Bug 1 (line 3).** `open(filename + '.csv')` turns `'oday_signups'` into `'oday_signups.csv'`, which does not exist, so every call raises FileNotFoundError. " +
          "It would also turn `'anime.csv'` into `'anime.csv.csv'`. The marker always passes the full name, so open it as given: `open(filename)`.\n\n" +
          '**Bug 2 (line 9).** The code finds `number_col` but never looks at it, so a row with an empty student number is still counted. ' +
          "Adding `and fields[number_col] != ''` counts a row only when both parts are true. The line was stripped before splitting, so an empty value in the last column is `''`, not `'\\n'`.\n\n" +
          'The rest was already right: the header is lower-cased before `index`, and both club names are lower-cased before comparing.',
      },
      selfExplain: 'Why did fixing only the open line pass both visible tests but still fail on Submit?',
    },
    {
      id: 't09-s3-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Members per club',
      prompt:
        'Write `club_members(filename)` that returns a **dictionary** mapping each club name, **stripped of spaces at both ends and lower-cased**, to the number of **different** students (different student numbers) who signed up for it.\n\n' +
        'The header contains `Name`, `Student_Number` and `Club` in any order and any capitals, and there may be extra columns. Skip a row if:\n\n' +
        '- it is blank or does not have one value for every header column,\n' +
        '- its club name is empty, or\n' +
        '- its student number, after stripping spaces from both ends, is not exactly 8 digits.\n\n' +
        'A student who signs up for the same club twice counts once; the same student can count for several clubs. A file with no valid rows gives `{}`. ' +
        'Open `filename` exactly as given. No imports.\n\n' +
        'Example: the file `oday_2026` contains\n\n' +
        '```\n' + ODAY + '```\n\n' +
        "`club_members('oday_2026')` returns `{'chess club': 2, 'rock climbing': 1}`. Aroha signed up for chess twice, and Liam's number has only 4 digits.",
      fnName: 'club_members',
      starter: `def club_members(filename):
    """Return {club name in lower case: number of different valid students}."""
    pass`,
      rules: ['noImport', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'oday_2026', content: ODAY }],
          call: "club_members('oday_2026')",
          expect: "{'chess club': 2, 'rock climbing': 1}",
          label: 'the example file',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'anime', content: 'Name,Student_Number,Club\nPriya Nair,25001234,Anime Club\nJoel Smith,25004321,Anime Club\n' }],
          call: "club_members('anime')",
          expect: "{'anime club': 2}",
          label: 'two students, one club',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'guild_b', content: 'club,email,name,student_number\ndebating,priya@example.com,Priya Nair,25001234\nsurf club,joel@example.com,Joel Smith,25004321\ndebating,mei@example.com,Mei Chen,23111222\n' }],
          call: "club_members('guild_b')",
          expect: "{'debating': 2, 'surf club': 1}",
          label: 'columns in another order and an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
        {
          id: 'h2',
          files: [{ name: 'guild_c', content: 'name,student_number,club\nAmara Okafor,23111222,film society\n\nLiam Byrne,N/A,film society\nJoel Smith,250043210,film society\nMei Chen,2311122,film society\nGrace Lee,2345678O,film society\nPriya Nair,25001234,\nTane Walker,24556677\n' }],
          call: "club_members('guild_c')",
          expect: "{'film society': 1}",
          label: 'blank line, bad student numbers, empty club, short row',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [{ name: 'guild_d', content: 'name,student_number,club\nMei Chen,23111222,chess club\nMei Chen,23111222,rock climbing\nMei Chen,23111222,chess club\nJoel Smith,25004321,rock climbing' }],
          call: "club_members('guild_d')",
          expect: "{'chess club': 1, 'rock climbing': 2}",
          label: 'same student twice in one club and in two clubs',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h4',
          files: [{ name: 'guild_e', content: 'Name,Student_Number,Club\n' }],
          call: "club_members('guild_e')",
          expect: '{}',
          label: 'header only',
          hidden: true,
        },
        {
          id: 'h5',
          files: [{ name: 'guild_f', content: 'Club,Student_Number,Name\nUWA Rowing,23111222,Grace Lee\nuwa rowing ,23456789,Tom Price\n' }],
          call: "club_members('guild_f')",
          expect: "{'uwa rowing': 2}",
          label: 'club name in different capitals, with a trailing space',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h6',
          files: [{ name: 'guild_g', content: 'club,student_number,name\nhiking, 01234567 ,Grace Lee\nhiking,01234567,Grace Lee\nhiking, 24998877,Tom Price\n' }],
          call: "club_members('guild_g')",
          expect: "{'hiking': 2}",
          label: 'spaces around student numbers, and a leading zero',
          hidden: true,
        },
      ],
      concepts: ['header', 'validation', 'dict-of-lists', 'duplicates', 'case-insensitive'],
      detects: ['header_order_assumed', 'invalid_row_not_skipped', 'case_sensitive_compare', 'index_out_of_range', 'csv_ext_assumed'],
      expectedSec: 720,
      hints: [
        "Counting **different** students means remembering which student numbers each club already has. What could each club's value be while you are still reading?",
        'Plan: read the header (strip, lower, split) and find the student number and club positions. For each line: strip and split; skip it if the number of fields differs from the header; clean the number (strip) and the club (strip, lower); skip it if the club is empty or the number is not 8 digits. Keep a dictionary of club to a list of student numbers, adding a number only if it is not already in that list. At the end, build a new dictionary of club to the length of its list.',
        "Validity check: `if club == '' or len(number) != 8 or not number.isdigit(): continue`. Adding a student once: `if number not in members[club]: members[club].append(number)`.",
      ],
      solution: {
        code: `def club_members(filename):
    members = {}
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        number_col = header.index('student_number')
        club_col = header.index('club')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            number = fields[number_col].strip()
            club = fields[club_col].strip().lower()
            if club == '' or len(number) != 8 or not number.isdigit():
                continue
            if club not in members:
                members[club] = []
            if number not in members[club]:
                members[club].append(number)
    counts = {}
    for club in members:
        counts[club] = len(members[club])
    return counts`,
        explanation:
          '`members` maps each club to a list of the student numbers seen so far for that club.\n\n' +
          "The header is stripped, lower-cased and split, so `header.index('student_number')` and `header.index('club')` work with any order, any capitals and extra columns.\n\n" +
          "Each line is stripped and split. `len(fields) != len(header)` skips a blank line (it gives `['']`) and a row with missing values, before any `fields[...]` could raise IndexError.\n\n" +
          "`number` is stripped and kept as a **string**, so `'01234567'` keeps its leading zero. `club` is stripped and lower-cased, so `' Uwa Rowing '` and `'UWA Rowing'` become the same key.\n\n" +
          "`len(number) != 8 or not number.isdigit()` rejects `'N/A'`, `'2412'` and 9-digit numbers without converting anything, so nothing can crash.\n\n" +
          'A club gets a new empty list the first time it is seen. A number is appended only if it is not already in that club\'s list, so a repeat sign-up is ignored, while the same student in a different club is still counted there.\n\n' +
          'Finally, a second dictionary maps each club to the length of its list, which is the number of different students.',
      },
      selfExplain: 'Why are student numbers kept as strings instead of being converted with int()?',
    },
    {
      id: 't09-s3-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 15,
      diff: 'hard',
      core: true,
      title: 'Mailing list for volunteers',
      prompt:
        'Exam practice: write your answer as you would on paper, without running it.\n\n' +
        'The Guild wants a mailing list from a volunteer file. The first line of `infile` is a header containing `First name`, `Last name` and `Student number` in an unknown order and with unknown capitals. There may be other columns too. Each later line is one volunteer.\n\n' +
        'Write `write_emails(infile, outfile)` that creates the file `outfile` containing:\n\n' +
        '- the header line `name,email`, then\n' +
        '- one line per volunteer, in the same order as `infile`, of the form `First Last,NNNNNNNN@student.uwa.edu.au`, where each name and the student number have any spaces around them removed.\n\n' +
        'Skip blank lines, and skip volunteers whose student number is empty once its spaces are removed. Every line written ends with a newline. ' +
        'Return the number of volunteers written (an int). You do not need to handle a missing file.\n\n' +
        'Example: if `infile` contains\n\n' +
        '```\nLast name,First name,Student number\nNgata,Aroha,23456789\nTran,Minh,\n```\n\n' +
        'then `outfile` must contain\n\n' +
        '```\nname,email\nAroha Ngata,23456789@student.uwa.edu.au\n```\n\n' +
        'and the function returns `1`.',
      fnName: 'write_emails',
      starter: `def write_emails(infile, outfile):
    pass`,
      rules: ['noImport', 'noCsvExt'],
      tests: [
        {
          id: 'v1',
          files: [{ name: 'volunteers', content: 'Last name,First name,Student number\nNgata,Aroha,23456789\nTran,Minh,\n' }],
          call: "(write_emails('volunteers', 'emails'), open('emails').read())",
          expect: "(1, 'name,email\\nAroha Ngata,23456789@student.uwa.edu.au\\n')",
          label: 'the example file',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'volunteers', content: 'first name,last name,student number\nMinh,Tran,24123456\nSofia,Rossi,23999001\n' }],
          call: "(write_emails('volunteers', 'mailing_list'), open('mailing_list').read())",
          expect: "(2, 'name,email\\nMinh Tran,24123456@student.uwa.edu.au\\nSofia Rossi,23999001@student.uwa.edu.au\\n')",
          label: 'two volunteers',
          hidden: false,
          tag: 'file_newline',
        },
        {
          id: 'h1',
          files: [{ name: 'helpers', content: 'STUDENT NUMBER,CLUB,FIRST NAME,LAST NAME\n25001234,Debating,Priya,Nair\n' }],
          call: "(write_emails('helpers', 'out'), open('out').read())",
          expect: "(1, 'name,email\\nPriya Nair,25001234@student.uwa.edu.au\\n')",
          label: 'capital headers and an extra column',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          files: [{ name: 'volunteers', content: 'first name,last name,student number\nJoel,Smith,25004321\n\nAmara,Okafor,\nLiam,Byrne,24998877' }],
          call: "(write_emails('volunteers', 'emails'), open('emails').read())",
          expect: "(2, 'name,email\\nJoel Smith,25004321@student.uwa.edu.au\\nLiam Byrne,24998877@student.uwa.edu.au\\n')",
          label: 'blank line, missing number, no newline at the end',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h3',
          files: [{ name: 'volunteers', content: 'Last name,Student number,First name\n Chen , 23111222 , Mei \nWalker,   ,Tane\n' }],
          call: "(write_emails('volunteers', 'emails'), open('emails').read())",
          expect: "(1, 'name,email\\nMei Chen,23111222@student.uwa.edu.au\\n')",
          label: 'spaces around the values, and a number that is only spaces',
          hidden: true,
        },
        {
          id: 'h4',
          files: [{ name: 'volunteers', content: 'First name,Last name,Student number\n' }],
          call: "(write_emails('volunteers', 'emails'), open('emails').read())",
          expect: "(0, 'name,email\\n')",
          label: 'no volunteers',
          hidden: true,
        },
        {
          id: 'h5',
          files: [{ name: 'crew', content: 'club,last name,student number,first name\nDebating,Nair,25001234,Priya\nSurf Club,Smith,25004321,Joel\n' }],
          call: "(write_emails('crew', 'crew_emails'), open('crew_emails').read())",
          expect: "(2, 'name,email\\nPriya Nair,25001234@student.uwa.edu.au\\nJoel Smith,25004321@student.uwa.edu.au\\n')",
          label: 'columns in another order and an extra column',
          hidden: true,
          tag: 'header_order_assumed',
        },
      ],
      concepts: ['header', 'read-then-write', 'validation', 'string-building'],
      detects: ['header_order_assumed', 'case_sensitive_compare', 'invalid_row_not_skipped', 'file_newline', 'str_int_concat', 'csv_ext_assumed'],
      expectedSec: 780,
      hints: [
        'Split the job in two: read the volunteers you need from `infile`, then write `outfile`. Which three column positions do you need before the loop?',
        "Plan: read the header line, strip it, lower-case it and split it, then find the positions of `'first name'`, `'last name'` and `'student number'`. Read each later line into a list of fields, skipping blank lines and rows whose stripped student number is empty. Then open `outfile` with `'w'`, write the header line, write one line per kept row, and return how many rows you kept.",
        "Building one output line: `name = fields[first_col].strip() + ' ' + fields[last_col].strip()` and then `out.write(name + ',' + fields[number_col].strip() + '@student.uwa.edu.au\\n')`.",
      ],
      solution: {
        code: `def write_emails(infile, outfile):
    rows = []
    with open(infile) as f:
        header = f.readline().strip().lower().split(',')
        first_col = header.index('first name')
        last_col = header.index('last name')
        number_col = header.index('student number')
        for line in f:
            fields = line.strip().split(',')
            if len(fields) == len(header) and fields[number_col].strip() != '':
                rows.append(fields)
    with open(outfile, 'w') as out:
        out.write('name,email\\n')
        for fields in rows:
            name = fields[first_col].strip() + ' ' + fields[last_col].strip()
            email = fields[number_col].strip() + '@student.uwa.edu.au'
            out.write(name + ',' + email + '\\n')
    return len(rows)`,
        explanation:
          'A marker would look for these steps (15 marks):\n\n' +
          "1. Open `infile` with `with open(infile)` (no `.csv` added), read the header once, and strip, lower-case and split it (2 marks).\n" +
          "2. Find the three columns by name with `header.index('first name')` and so on, so any column order, capitals or extra columns work (3 marks). A space inside `'first name'` is fine: `split(',')` only splits at commas.\n" +
          "3. For each remaining line, strip and split, and skip blank lines (`['']` has the wrong length) and rows whose stripped student number is `''`. Keep the valid rows in a list (3 marks).\n" +
          "4. Open `outfile` with `'w'` and write the header `name,email\\n` (2 marks).\n" +
          "5. For each kept row, build `First Last` and the email from the stripped values and write them joined by a comma, ending with `'\\n'` because `write` adds no newline (3 marks).\n" +
          '6. Return the number of volunteers written, `len(rows)`, as an int, not a printed message (2 marks).\n\n' +
          'Reading everything first and writing afterwards keeps the two files apart. Writing inside the reading loop, with both files open, is also correct.',
      },
      selfExplain: "Why does the check for an empty student number have to use the stripped value?",
    },
  ],
};

export default s3;
