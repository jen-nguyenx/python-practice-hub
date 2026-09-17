import type { Topic } from '../../schema.ts';

export const cheatsheet = `**Open a file with \`with\`**

\`\`\`python
with open(filename) as f:           # read mode ('r') is the default
    text = f.read()
# the file is closed here, even if an error happened inside the block

with open('report', 'w') as out:    # 'w' creates the file, or WIPES an old one
    out.write('site,total\\n')
with open('report', 'a') as out:    # 'a' adds to the end
    out.write('Maylands,3\\n')
\`\`\`

- Open the name exactly as you were given it. Never add or check \`.csv\`: a project file may be called \`data_b\`.
- Without \`with\` you must call \`f.close()\` yourself. Text you wrote may not reach the file until it is closed.
- A missing file raises \`FileNotFoundError\`. Catching it is part of the next topic (exceptions).

**Four ways to read**

\`\`\`python
f.readline()      # the next line as a str, WITH its '\\n'; '' at the end of the file
f.readlines()     # a list of all remaining lines, each with its '\\n'
f.read()          # everything that is left, as one str
for line in f:    # each remaining line in turn
\`\`\`

- Reading moves forward. After \`header = f.readline()\`, \`for line in f:\` starts at the second line.
- Each \`open\` can be read through once. A second \`for line in f:\` on the same file gets nothing.

**Split one CSV line by hand**

\`\`\`python
line = 'Perth Airport,2025,640.0\\n'
fields = line.strip().split(',')    # ['Perth Airport', '2025', '640.0']
year = int(fields[1])               # 2025: split gives strings, so convert
rain = float(fields[2])             # 640.0

''.split(',')                       # ['']  a blank line still gives 1 field
'Perth,,3.2'.split(',')             # ['Perth', '', '3.2']  an empty value
'Perth, 3.2'.split(',')             # ['Perth', ' 3.2']  spaces are kept
\`\`\`

- \`strip()\` first, then \`split(',')\`. Otherwise the last field keeps its \`'\\n'\` and comparisons with it are always False.
- \`int('640.0')\` crashes; use \`float\` for decimals. \`float(' 3.5\\n')\` is fine, but \`float('')\` and \`float('N/A')\` crash.

**Find columns by header name**

\`\`\`python
with open(filename) as f:
    header = f.readline().strip().lower().split(',')
    stop_col = header.index('stop')     # ValueError if there is no such column
    fare_col = header.index('fare')
    for line in f:
        fields = line.strip().split(',')
        stop = fields[stop_col]
        fare = float(fields[fare_col])
\`\`\`

- Look each column up **once**, before the loop, then use \`fields[col]\` on every row.
- \`index\` is case-sensitive. Lower-case the header, and search for a lower-case name.

**Skip bad rows with \`continue\`**

\`\`\`python
for line in f:
    fields = line.strip().split(',')
    if len(fields) != len(header):      # blank line or missing values
        continue
    fare = fields[fare_col].strip()
    if fare == '' or fare.upper() == 'N/A':
        continue
    number = fields[number_col].strip()
    if len(number) != 8 or not number.isdigit():
        continue
    total += float(fare)
\`\`\`

- \`'0412'.isdigit()\` is True. \`'-4'.isdigit()\`, \`'4.5'.isdigit()\` and \`''.isdigit()\` are all False.
- Keep ids such as student numbers as strings, so a leading 0 is not lost.

**Write a file**

\`\`\`python
with open(outfile, 'w') as out:
    out.write('stop,total\\n')                            # write adds NO newline
    for stop in sorted(totals):
        out.write(stop + ',' + str(totals[stop]) + '\\n')  # write takes one str
        # same line with an f-string: out.write(f'{stop},{totals[stop]}\\n')
\`\`\`

- \`out.write(3.2)\` raises TypeError. Convert numbers with \`str()\` or an f-string.
- Write the header line yourself if the task asks for one.

**CITS1401 project and exam rules for files**

- No \`import\` at all, not even \`csv\` or \`math\`.
- Open the file name you are given, as given.
- Find every column by its header name. Hidden test files change the column order and the capitals, and add extra columns.
- Skip invalid rows instead of crashing: blank lines, empty values, \`N/A\`, numbers out of range, duplicates.
- Read the file once. Keep what you need in lists or dictionaries instead of reopening the file for every question.
- Round only the final values you return.

**Gotchas the night before**

- \`'Maylands\\n' == 'Maylands'\` is False. Strip before you split.
- \`readline()\` gives \`''\` at the end of the file but \`'\\n'\` for a blank line in the middle.
- \`'w'\` wipes the file the moment it is opened, before you write anything.
- \`header.index('Fare')\` fails on a header that says \`FARE\`.
- Everything from \`split\` is a str: \`'9.5' > '18.5'\` is True, so convert before comparing numbers.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Kings Park wildflower survey: totals per species',
  code: `def survey_summary(infile, outfile):
    """Total the wildflower counts per species in infile, write them to
    outfile sorted A to Z, and return the number of species."""
    totals = {}
    with open(infile) as f:
        # Step 2: read the header once and find the columns by name
        header = f.readline().strip().lower().split(',')
        species_col = header.index('species')
        count_col = header.index('count')

        # Step 3: one pass over the rows, skipping bad ones
        for line in f:
            fields = line.strip().split(',')
            if len(fields) != len(header):
                continue
            species = fields[species_col].strip().lower()
            count = fields[count_col].strip()
            if species == '' or not count.isdigit():
                continue

            # Step 4: running total per species
            totals[species] = totals.get(species, 0) + int(count)

    # Step 5: write the results, one line each, newline included
    with open(outfile, 'w') as out:
        out.write('species,total\\n')
        for species in sorted(totals):
            out.write(species + ',' + str(totals[species]) + '\\n')
    return len(totals)


# Step 6: test on a tiny file with the awkward cases in it
with open('kings_park_survey', 'w') as f:
    f.write('Species,Date,Count\\n')
    f.write('Kangaroo Paw,2026-09-05,12\\n')
    f.write('Cowslip Orchid,2026-09-05,N/A\\n')
    f.write('\\n')
    f.write('kangaroo paw ,2026-09-06,7\\n')
    f.write('Cowslip Orchid,2026-09-06,3\\n')

print(survey_summary('kings_park_survey', 'summary'))   # 2
with open('summary') as f:
    print(f.read())   # species,total / cowslip orchid,3 / kangaroo paw,19`,
  steps: [
    '**Understand the file and the output.** Volunteers in Kings Park log `Date`, `Count` and `Species` for each patch of wildflowers, but the columns are not always in that order, some counts are `N/A`, and species names come in mixed capitals. ' +
      'The task: add up the count for each species, write a file with a `species,total` header and one line per species A to Z, and return how many species there were.',
    '**Read the header once and find the columns by name.** `f.readline().strip().lower().split(\',\')` turns the first line into a list of lower-case names. ' +
      "`header.index('species')` and `header.index('count')` give the positions, so the code works whatever order the columns come in. This happens once, before the loop.",
    '**One pass over the rows, skipping bad ones.** Each line is stripped and split. A blank line gives `[\'\']`, which has the wrong number of fields, so `continue` skips it. ' +
      'A count must be all digits (`\'N/A\'.isdigit()` is False) and a species must not be empty. Checking before converting means `int(count)` can never crash.',
    '**Keep a running total per species.** Clean the name first (`strip().lower()`), so `\'kangaroo paw \'` adds to `\'kangaroo paw\'` instead of becoming a new key. ' +
      '`totals.get(species, 0) + int(count)` starts a new species at 0 without a KeyError.',
    "**Write the results file.** Open the output with `'w'`, write the header line, then loop over `sorted(totals)` so the species come out A to Z. " +
      "`write` needs one string and adds no newline, so each line is built as `species + ',' + str(total) + '\\n'`. The function returns `len(totals)`, not a printed message.",
    '**Test on a tiny file with the awkward cases in it.** The test file has columns out of order, an `N/A` count, a blank line and a name with different capitals and a trailing space. ' +
      'Working it by hand: kangaroo paw is 12 + 7 = 19, cowslip orchid is 3 (the `N/A` row is skipped), so the function returns 2.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'file_newline',
    bad: `for line in f:
    fields = line.split(',')
    if fields[2] == 'Maylands':
        count += 1`,
    good: `for line in f:
    fields = line.strip().split(',')
    if fields[2] == 'Maylands':
        count += 1`,
    note:
      "Every line read from a file ends with `'\\n'` (except possibly the last), and `split` leaves it on the last field. `'Maylands\\n' == 'Maylands'` is False, so the count quietly stays 0. " +
      'Strip first. The same is true when writing: `write` adds no newline, so end each line with `\'\\n\'` yourself.',
  },
  {
    mistake: 'header_order_assumed',
    bad: `f.readline()
for line in f:
    fields = line.strip().split(',')
    fare = float(fields[3])`,
    good: `header = f.readline().strip().lower().split(',')
fare_col = header.index('fare')
for line in f:
    fields = line.strip().split(',')
    fare = float(fields[fare_col])`,
    note:
      'A fixed position only works for the sample file. Hidden test files move the columns around and add extra ones, so `fields[3]` reads the wrong value or crashes. ' +
      'Look each column up by name once, before the loop.',
  },
  {
    mistake: 'invalid_row_not_skipped',
    bad: `for line in f:
    fields = line.strip().split(',')
    total += float(fields[fare_col])`,
    good: `for line in f:
    fields = line.strip().split(',')
    if len(fields) != len(header):
        continue
    fare = fields[fare_col].strip()
    if fare == '' or fare.upper() == 'N/A':
        continue
    total += float(fare)`,
    note:
      "Real data files have blank lines, empty values and `N/A`. `float('')` stops the whole program, and in a project one crash fails every remaining test. " +
      'Check the row first and `continue` past anything invalid.',
  },
  {
    mistake: 'csv_ext_assumed',
    bad: `def main(csvfile):
    with open(csvfile + '.csv') as f:
        header = f.readline()`,
    good: `def main(csvfile):
    with open(csvfile) as f:
        header = f.readline()`,
    note:
      "The marker passes the complete file name, such as `'data_b'` or `'suburbs.csv'`. Adding `.csv` gives a name that does not exist, and checking `endswith('.csv')` rejects valid names. Open exactly what you were given.",
  },
  {
    mistake: 'file_not_closed',
    bad: `out = open('summary', 'w')
out.write('site,average\\n')
result = open('summary').read()`,
    good: `with open('summary', 'w') as out:
    out.write('site,average\\n')
with open('summary') as f:
    result = f.read()`,
    note:
      'Written text waits in a buffer until the file is closed, so reading a file you have not closed can give an empty string. ' +
      '`with open(...) as f:` closes the file as soon as the indented block ends.',
  },
  {
    mistake: 'efficiency_repeat_pass',
    bad: `totals = {}
for stop in stops:
    with open(filename) as f:           # reads the whole file again for every stop
        for line in f:
            fields = line.strip().split(',')
            if fields[stop_col] == stop:
                totals[stop] = totals.get(stop, 0) + float(fields[fare_col])`,
    good: `totals = {}
with open(filename) as f:               # one pass over the file
    for line in f:
        fields = line.strip().split(',')
        if fields[stop_col] in stops:
            stop = fields[stop_col]
            totals[stop] = totals.get(stop, 0) + float(fields[fare_col])`,
    note:
      'CITS1401 projects give efficiency marks for looking at the data as few times as possible. Opening and reading the file inside another loop repeats all of that work. ' +
      'Read the file once and collect everything you need in lists or dictionaries on the way.',
  },
];
