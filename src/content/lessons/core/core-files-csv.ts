// Core: reading and writing data files by hand, the way the unit requires.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-files-csv',
  title: 'Files and CSV data',
  summary: 'Open a file, cut each line into fields, and survive the rows that are broken',
  track: 'core',
  topicId: 'files-csv',
  minutes: 24,
  prereqs: ['reading-an-error'],
  outcomes: [
    'Open a file safely and read it one line at a time',
    'Turn a line into fields with strip and split, and convert the ones you need',
    'Find a column by its header name instead of counting positions',
    'Skip a row that cannot be used instead of crashing on it',
    'Write a results file, header line and all',
  ],
  sections: [
    {
      id: 'why-a-file',
      title: 'Why a file at all',
      blocks: [
        {
          kind: 'prose',
          body: 'Everything you have written so far made up its own data. A real program is given data it did not create: a year of river readings, a term of bus trips, a spreadsheet somebody exported at four in the afternoon. That data lives in a **file**, and a file is the only part of a program that is still there tomorrow.\n\nA CSV file is the plainest form of that. It is ordinary text. The first line usually names the columns, every line after it is one record, and the values are separated by commas. There is nothing clever about it, which is exactly why it is everywhere.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Where these files come from',
          body: 'The examples here make their own file first and then read it back. That is not a trick for the lesson: it is the fastest way to test your own code. You can build a file that has exactly the awkward rows you are worried about, in three lines, without leaving the editor.',
        },
        {
          kind: 'code',
          caption: 'Write a small file, then read the whole thing back as one piece of text.',
          code: `with open('sensors', 'w') as f:
    f.write('Site,Date,Salinity\\n')
    f.write('Matilda Bay,2026-03-01,12.4\\n')
    f.write('Matilda Bay,2026-03-02,13.1\\n')

with open('sensors') as f:
    print(f.read())
`,
        },
        {
          kind: 'prose',
          body: 'Two things are going on there. `open(name, \'w\')` makes a file to write into, and `open(name)` on its own opens it to read: reading is what you get when you do not ask for anything else.\n\nThe `\'\\n\'` on the end of each written line is the newline character. `write` does not add one, so if you leave it out the whole file ends up as a single long line.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'No csv module in this unit',
          body: 'Python has a `csv` module, and plenty of tutorials online start with `import csv`. CITS1401 forbids **every** import, in the project and in the exam. Everything in this lesson is done with `open`, `strip()` and `split(\',\')`, by hand. That is the method you are marked on, so it is the only one worth practising.',
        },
      ],
    },
    {
      id: 'with-open',
      title: 'Opening and closing safely',
      blocks: [
        {
          kind: 'prose',
          body: 'A file is not a variable. It is a connection to something outside your program, and it has to be handed back when you are done with it. `with open(...) as f:` hands it back for you, the moment the indented block ends, whether the block finished normally or blew up halfway through.\n\nThe cost of forgetting shows up most clearly when you write. Text you `write` sits in a buffer in memory until the file is closed, so a file you have not closed can still be empty on disk.',
        },
        {
          kind: 'compare',
          caption: 'The same two lines written, then read straight back. `repr` is used so an empty result is visible rather than invisible.',
          left: {
            label: 'Opened, written, never closed',
            bad: true,
            code: `out = open('notes', 'w')
out.write('Fremantle,3\\n')

with open('notes') as f:
    print(repr(f.read()))
`,
          },
          right: {
            label: 'Closed by `with`',
            code: `with open('notes', 'w') as out:
    out.write('Fremantle,3\\n')

with open('notes') as f:
    print(repr(f.read()))
`,
          },
        },
        {
          kind: 'prose',
          body: 'Compare the two results above. Nothing raised on the left: the program ran to the end, reported no error at all, and the data was not there. That is the worst kind of bug, because there is nothing to read and nothing to search for.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: '`\'w\'` empties the file immediately',
          body: 'Opening a file with `\'w\'` wipes whatever was in it the instant it opens, before you have written a single character. If you want to add to the end instead, open it with `\'a\'`.',
        },
        { kind: 'mistakes', only: ['file_not_closed'] },
      ],
    },
    {
      id: 'line-by-line',
      title: 'One line at a time',
      blocks: [
        {
          kind: 'prose',
          body: 'Reading the whole file with `read()` gives you one enormous string, which is rarely what you want. A data file is a stack of records, so read it the way it is built: one line per turn of a loop.\n\n`for line in f:` does that. Watch what each `line` actually contains — `repr` is used again so nothing is hidden.',
        },
        {
          kind: 'code',
          caption: 'Every line still carries the newline that ended it.',
          code: `with open('sensors', 'w') as f:
    f.write('Site,Date,Salinity\\n')
    f.write('Matilda Bay,2026-03-01,12.4\\n')
    f.write('Matilda Bay,2026-03-02,13.1\\n')

with open('sensors') as f:
    for line in f:
        print(repr(line))
`,
        },
        {
          kind: 'prose',
          body: 'That trailing character is the single most common cause of a file-reading program that runs happily and gets the wrong answer. It never raises. It makes a comparison quietly false.\n\nThe fix is two method calls in a fixed order: **`strip()` first, `split(\',\')` second**. `strip()` removes whitespace from both ends of the whole line, including the newline; `split(\',\')` then cuts what is left at every comma and hands back a list of fields.',
        },
        {
          kind: 'experiment',
          id: 't09-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your program counts the rows for the suburb Maylands, the file definitely contains three of them, and the count comes out as 0. No error appears. What is the first thing to check?',
          answer: 'Whether the line was stripped before it was split. If the suburb happens to be the **last** field on the line, `fields[-1]` is `\'Maylands\\n\'`, and comparing that with `\'Maylands\'` is false every time. Printing `repr(fields)` for one row settles it in seconds: `repr` shows the `\\n` that a plain `print` hides.',
        },
        { kind: 'mistakes', only: ['file_newline'] },
      ],
    },
    {
      id: 'text-until-converted',
      title: 'It is text until you convert it',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the idea that catches everyone once. A file has no idea what a number is. It holds characters, so `split` hands you characters, and a field that looks like a number is a piece of text that happens to be made of digits.\n\nPython will not guess. It will let you do text things to text, which is why the bug often survives a long way past the line that caused it.',
        },
        {
          kind: 'shell',
          caption: 'One line out of the file, taken apart and then converted. The last line fails on purpose.',
          lines: [
            "line = 'Matilda Bay,2026-03-02,13.1\\n'",
            "fields = line.strip().split(',')",
            'fields',
            'fields[2]',
            'fields[2] * 2',
            'fields[2] + 1',
            'float(fields[2])',
            'float(fields[2]) + 1',
            'int(fields[2])',
          ],
        },
        {
          kind: 'prose',
          body: 'Multiplying the field did not double anything, and adding a number to it stopped the program: `float` is what turned the characters into a value you can do arithmetic with. `int` only accepts text that spells a **whole** number; use `float` for anything that might have a decimal point.',
        },
        {
          kind: 'order',
          ask: 'These five lines turn one raw line of a file into a usable number. Drag them into an order that runs.',
          lines: [
            { text: "line = 'Matilda Bay,2026-03-02,13.1\\n'", indent: 0 },
            { text: 'line = line.strip()', indent: 0 },
            { text: "fields = line.split(',')", indent: 0 },
            { text: 'value = float(fields[2])', indent: 0 },
            { text: 'print(value)', indent: 0 },
          ],
        },
        {
          kind: 'experiment',
          id: 't09-x2',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Keep ids as text',
          body: 'Convert a value because you are going to calculate with it. A student number, a postcode or a bus route number is an identifier, not a quantity: converting it throws away a leading zero, and you will never add two of them together anyway.',
        },
      ],
    },
    {
      id: 'columns-by-name',
      title: 'Find the column by its name',
      blocks: [
        {
          kind: 'prose',
          body: 'You will be tempted to count the columns once and write `fields[2]` everywhere. It works on the file in front of you, and it tells you nothing about the file your work will actually be tested on.\n\nThe header line exists so you do not have to count. Read it once, lower-case it, split it, and ask it where each column is with `index`. Then the same code works whatever order the columns arrive in.',
        },
        {
          kind: 'code',
          caption: 'One function, two files holding the same data with the columns in different orders.',
          code: `def total_salinity(filename):
    with open(filename) as f:
        header = f.readline().strip().lower().split(',')
        salinity_col = header.index('salinity')
        total = 0
        for line in f:
            fields = line.strip().split(',')
            total = total + float(fields[salinity_col])
    return total


with open('normal', 'w') as f:
    f.write('Site,Date,Salinity\\n')
    f.write('Matilda Bay,2026-03-01,12.4\\n')
    f.write('Matilda Bay,2026-03-02,13.1\\n')

with open('shuffled', 'w') as f:
    f.write('Salinity,Site,Date\\n')
    f.write('12.4,Matilda Bay,2026-03-01\\n')
    f.write('13.1,Matilda Bay,2026-03-02\\n')

print(total_salinity('normal'))
print(total_salinity('shuffled'))
`,
        },
        {
          kind: 'prose',
          body: 'Three details in that code are doing real work.\n\n`f.readline()` takes **one** line, so the header is out of the way before the loop starts and the loop only ever sees data rows. `lower()` is applied to the header before `index`, so a file that shouts `SALINITY` is found as easily as one that whispers `salinity` — and because the header was lower-cased, the name you look up must be lower-case too. And `index` is called **once**, above the loop, not on every row.',
        },
        {
          kind: 'experiment',
          id: 't09-x3',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your program adds up a column and the total is right except that it is missing the very first row. Nothing raised. What has probably happened?',
          answer: 'You called `readline()` to skip a header on a file that does not have one, so the first row of real data was eaten. The mirror image is worse: a file that does have a header, not skipped, crashes with `ValueError` when it tries to convert the column name into a number. A crash on the first row nearly always means the header was never skipped.',
        },
        { kind: 'mistakes', only: ['header_order_assumed'] },
      ],
    },
    {
      id: 'bad-rows',
      title: 'The rows that are not rows',
      blocks: [
        {
          kind: 'prose',
          body: 'Data that people collected is never clean. There will be a blank line where somebody pressed return, a reading written as `N/A` because the sensor was down, a row that is short because a field was left empty, and a name in capitals that should match a name in lower case.\n\nOne of those rows stops a program that trusts its input, and in a marked project a single crash takes every test after it with it. So check a row **before** you use it, and `continue` past anything you cannot trust.',
        },
        {
          kind: 'compare',
          caption: 'The same messy file, read twice. Both sides are complete programs.',
          left: {
            label: 'Trusting every row',
            bad: true,
            code: `with open('messy', 'w') as f:
    f.write('Site,Date,Salinity\\n')
    f.write('Matilda Bay,2026-03-01,12.4\\n')
    f.write('\\n')
    f.write('Matilda Bay,2026-03-02,N/A\\n')
    f.write('Matilda Bay,2026-03-03,13.1\\n')

total = 0
count = 0
with open('messy') as f:
    header = f.readline().strip().lower().split(',')
    col = header.index('salinity')
    for line in f:
        fields = line.strip().split(',')
        total = total + float(fields[col])
        count = count + 1
print(total, count)
`,
          },
          right: {
            label: 'Checking each row first',
            code: `with open('messy', 'w') as f:
    f.write('Site,Date,Salinity\\n')
    f.write('Matilda Bay,2026-03-01,12.4\\n')
    f.write('\\n')
    f.write('Matilda Bay,2026-03-02,N/A\\n')
    f.write('Matilda Bay,2026-03-03,13.1\\n')

total = 0
count = 0
with open('messy') as f:
    header = f.readline().strip().lower().split(',')
    col = header.index('salinity')
    for line in f:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        value = fields[col].strip()
        if value == '' or value.upper() == 'N/A':
            continue
        total = total + float(value)
        count = count + 1
print(total, count)
`,
          },
        },
        {
          kind: 'prose',
          body: 'The guard on the left-hand version is missing entirely, so one unusable row stops the whole program. The right-hand version keeps going. Click each numbered line below to see what it is guarding against.',
        },
        {
          kind: 'annotate',
          ask: 'The same guarded loop, self-contained: one blank row and one N/A row hidden among good ones.',
          code: "header = ['site', 'date', 'salinity']\nrows = ['Matilda Bay,2026-03-01,12.4', '', 'Matilda Bay,2026-03-02,N/A', 'Matilda Bay,2026-03-03,13.1']\ntotal = 0\ncount = 0\nfor row in rows:\n    fields = row.strip().split(',')\n    if len(fields) != len(header):\n        continue\n    value = fields[2].strip()\n    if value == '' or value.upper() == 'N/A':\n        continue\n    total = total + float(value)\n    count = count + 1\nprint(total, count)\n",
          notes: {
            '5': 'Checked one row at a time, so a bad row costs only itself, never the rows before or after it.',
            '6': 'A blank row still splits into one field, `[\'\']`, not zero fields.',
            '7': 'Comparing the field count with the header catches the blank row, and every short row, before anything tries to read a field from it.',
            '9': 'N/A is stripped and compared in upper case, so `n/a`, `N/A` and `NA` are all caught the same way.',
            '10': 'The row is abandoned here, before `float` ever sees the text that would make it raise.',
            '12': 'Only a row that survived both guards reaches the arithmetic, so `total` never has to cope with text.',
          },
        },
        {
          kind: 'table',
          caption: 'Guards worth having in your fingers.',
          head: ['The row problem', 'The check that catches it'],
          rows: [
            ['Blank line, or a row missing a field', '`if len(fields) != len(header): continue`'],
            ['An empty value in a column you need', "`if value == '': continue`"],
            ['`N/A`, `NA`, `n/a` where a number belongs', "`if value.upper() in ('N/A', 'NA'): continue`"],
            ['An id that should be eight digits', '`if len(number) != 8 or not number.isdigit(): continue`'],
            ['Names in mixed capitals and with stray spaces', '`name = fields[name_col].strip().lower()`'],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Test with a bad row in the middle',
          body: 'A bad row at the end of your test file proves nothing: the program was going to finish anyway. Put the unusable row between two good ones, as the file above does, and then check that the rows after it were still counted.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'guard-isolates-damage',
            title: 'One bad row, and what happens around it',
            intro: 'Four sites, and the second one is whatever you pick here. Watch the running total after every row: a guard should let the rows on either side keep working.',
            template:
              "rows = [\n    'Matilda Bay,12.4',\n    ⟦crawley⟧,\n    'Applecross,9.8',\n    'Point Walter,6.3',\n    'South Perth,15.1',\n]\ntotal = 0.0\nkept = 0\nprogress = []\nfor row in rows:\n    fields = row.split(',')\n    value = fields[1].strip()\n    if value == '' or value.upper() == 'N/A':\n        progress.append(round(total, 1))\n        continue\n    total = total + float(value)\n    kept = kept + 1\n    progress.append(round(total, 1))\nprint('kept', kept, 'of', len(rows))\nprint('total', round(total, 1))\n",
            knobs: [
              {
                id: 'crawley',
                label: 'the Crawley row says',
                choices: [
                  { value: "'Crawley,11.0'", caption: 'a normal reading' },
                  { value: "'Crawley,N/A'", caption: 'sensor was down (N/A)' },
                  { value: "'Crawley,'", caption: 'the reading is missing' },
                  { value: "'Crawley, 11.0 '", caption: 'stray spaces around the number' },
                ],
              },
            ],
            probes: {
              values: 'progress',
              labels: "[r.split(',')[0] for r in rows]",
            },
            visual: {
              kind: 'bars',
              values: 'values',
              labels: 'labels',
              caption: 'The running total after each row. Whatever Crawley says, the rows after it should keep adding correctly.',
            },
            notes: {
              '0': 'A normal reading, so the total after Crawley is 23.4 and every bar after it keeps climbing normally.',
              '1': 'N/A is caught by the guard, so the bar after Crawley is exactly the same height as the bar before it — nothing was added, and nothing crashed either.',
              '2': 'A missing value looks empty rather than absent, and the guard catches that too: the bar does not move on that row, but the three rows after it still climb exactly as before.',
              '3': "Stray spaces are not a bad value at all. `' 11.0 '.strip()` is `'11.0'`, so this row is counted like any other and the bars are identical to the normal reading.",
            },
            takeaway: 'A guard that checks one row does not care what happened before it or after it. Whatever Crawley turns out to say, Applecross, Point Walter and South Perth are added exactly the same way every time — a bad row costs you that row, and nothing else, which is the entire point of checking before you use a value rather than trusting it.',
          },
        },
        { kind: 'mistakes', only: ['invalid_row_not_skipped'] },
      ],
    },
    {
      id: 'writing-a-file',
      title: 'Writing the answer back out',
      blocks: [
        {
          kind: 'code',
          caption: '`write` takes exactly one string and adds nothing to it. Handing it a number, on purpose.',
          code: `with open('summary', 'w') as out:
    out.write(12.4)
`,
        },
        {
          kind: 'prose',
          body: 'A number has to become text first — `str(value)` works, and an f-string is usually easier to read — and the newline at the end of each line is yours to supply.',
        },
        {
          kind: 'code',
          caption: 'Total per site, written to a file with a header line, then read back to check it.',
          code: `totals = {'matilda bay': 25.5, 'crawley': 11.0, 'applecross': 18.25}

with open('summary', 'w') as out:
    out.write('site,total\\n')
    for site in sorted(totals):
        out.write(f'{site},{totals[site]}\\n')

with open('summary') as f:
    print(f.read())
`,
        },
        {
          kind: 'prose',
          body: 'Looping over `sorted(totals)` puts the sites in a predictable order, which matters when somebody else has to compare your file with theirs. Reading the file back in the same program is the cheapest check there is, and it catches a missing newline immediately.',
        },
      ],
    },
    {
      id: 'all-together',
      title: 'All of it at once',
      blocks: [
        {
          kind: 'prose',
          body: 'Every piece of this lesson appears in the worked example below: one pass over the file, columns found by name, unusable rows skipped, a running total per group, and a results file written at the end. Read it with the six steps beside it rather than as one block of code.',
        },
        { kind: 'workedExample' },
        {
          kind: 'checkpoint',
          prompt: 'A task gives you a file name in a variable called `csvfile` and asks for the average of one column. Why is `open(csvfile + \'.csv\')` a mistake, even though the sample file you were given is called `data.csv`?',
          answer: 'Because the name you are handed is the complete name. The files used to mark your work may be called `data_b` or `readings.txt`, and adding `.csv` asks for a file that does not exist. Checking `csvfile.endswith(\'.csv\')` and refusing anything else is the same mistake wearing a hat. Open exactly the name you were given.',
        },
        { kind: 'mistakes', only: ['csv_ext_assumed', 'efficiency_repeat_pass'] },
        {
          kind: 'practice',
          body: 'The questions for this topic use the same shapes on real Perth data: sensor exports, ferry timetables, sign-up sheets. Write the guards before the arithmetic and you will find most of them are the same problem in different clothes.',
        },
      ],
    },
  ],
};

export default lesson;
