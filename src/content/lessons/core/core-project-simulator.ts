// Core: method. Turning a specification into a working, marked program.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-project-simulator',
  title: 'Building a whole project',
  summary: 'How to turn a specification into a program that answers exactly what was asked',
  track: 'core',
  topicId: 'project-simulator',
  minutes: 25,
  prereqs: ['core-scope-and-main'],
  outcomes: [
    'Turn a specification into a checklist you can tick off',
    'Break a task into helpers with one job each, called from main()',
    'Read a file once and answer every part of the task from what you kept',
    'Validate rows in an order that cannot crash, and handle duplicates',
    'Keep full precision until the result is built, and rank with a proper tie-break',
    'Test your own program the way the marker will',
  ],
  sections: [
    {
      id: 'what-you-are-being-asked',
      title: 'What you are actually being asked',
      blocks: [
        {
          kind: 'prose',
          body: 'Every question up to now has had one idea in it. A project has none: it is a page of ordinary English describing a program, testing not a Python feature but the ability to read carefully, break a job into pieces, and finish something. There is nothing in it you have not already met — files, loops, dictionaries, functions, try/except — only the **quantity** is new, and nobody tells you which part to write first.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'What the marker runs',
          body: 'Your file is imported by a program. It calls `main(...)` with arguments it chose, including file names you have never seen and arguments of the wrong type, and compares what comes back with what the specification promised. It does not read your code while it does this, and it does not look at the screen. Everything you are marked on goes out through `return`.',
        },
      ],
    },
    {
      id: 'reading-the-spec',
      title: 'Reading the specification',
      blocks: [
        {
          kind: 'steps',
          title: 'From a page of English to a checklist',
          items: [
            'Find the **signature**. Write `def main(...)` with exactly the names and order the spec gives, and its docstring, before anything else. Nothing else matters if the tester cannot call it.',
            'Find the **return shape** and write it down as an example: a list of two floats, a dictionary of lists, a list of lists sorted a particular way. Underline whether it says list or tuple, int or float.',
            'Find the **failure value**. What comes back for a missing file, an empty file, no matching rows, a non-string argument? It is usually `None`, and it is usually stated once, in passing.',
            'List every **column** named in the spec and every **rule** about a row: what makes a row invalid, what counts as a duplicate, which values are out of range.',
            'List every **number** the answer contains, and for each one write the formula and where the rounding happens. Copy the formula exactly: `n` and `n - 1` are different questions.',
            'Work one small example **by hand** on paper, including one bad row. That number is the test you will check against before you trust anything.',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The words that hide the marks',
          body: 'Read for the small words: *case-insensitive*, *ignore*, *first occurrence*, *at least two*, *in descending order*, *rounded to four decimal places*, *excluding*. Each one is a rule somebody wrote deliberately, and each one has a hidden test file behind it.',
        },
        {
          kind: 'checkpoint',
          prompt: 'The spec says "for each club with at least two valid entries, return the mean and the sample standard deviation". Which three decisions does that sentence make for you?',
          answer: 'Which clubs appear in the answer at all (a club with one valid entry is left out entirely, not given a zero); that you need to count the valid entries per club before calculating anything; and that "sample" means the formula divides by `n - 1`, which is also why one entry is not enough — `n - 1` would be zero. One sentence, three rules, and each one has a test behind it.',
        },
      ],
    },
    {
      id: 'decompose',
      title: 'Cutting it into helpers',
      blocks: [
        {
          kind: 'prose',
          body: 'Write `main` as if the helpers already existed. Read the body of it back as a sentence: *read the rows, pick out the ones for this suburb, average them, build the answer*. If that sentence is not what the specification said, the code is wrong and you have not typed anything yet — which is the cheapest time to find out.\n\nThen write the helpers, and give each one exactly one job and one returned value.',
        },
        {
          kind: 'code',
          caption: 'A complete small project, and the four calls a tester would make. The spec: return `[number of valid readings, mean rainfall to 4 dp]` for one suburb, or `None`.',
          code: `def read_lines(csvfile):
    """Every line of the file, or None if it cannot be opened."""
    try:
        with open(csvfile) as f:
            return f.readlines()
    except OSError:
        return None


def rainfall_for(lines, suburb):
    """The valid rainfall readings for one suburb, unrounded."""
    header = lines[0].strip().lower().split(',')
    if 'suburb' not in header or 'rainfall' not in header:
        return []
    suburb_col = header.index('suburb')
    rain_col = header.index('rainfall')
    wanted = suburb.strip().lower()
    values = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        if fields[suburb_col].strip().lower() != wanted:
            continue
        try:
            rain = float(fields[rain_col])
        except ValueError:
            continue
        if rain < 0:
            continue
        values.append(rain)
    return values


def main(csvfile, suburb):
    """Return [count, mean rainfall rounded to 4 dp] for suburb, or None."""
    if not isinstance(csvfile, str) or not isinstance(suburb, str):
        return None
    lines = read_lines(csvfile)
    if lines is None or len(lines) == 0:
        return None
    values = rainfall_for(lines, suburb)
    if len(values) == 0:
        return None
    return [len(values), round(sum(values) / len(values), 4)]


with open('rain_march', 'w') as f:
    f.write('Date,Suburb,Rainfall\\n')
    f.write('2026-03-01,Subiaco,12.5\\n')
    f.write('2026-03-02,subiaco ,n/a\\n')
    f.write('\\n')
    f.write('2026-03-03,SUBIACO,8.0\\n')
    f.write('2026-03-04,Como,3.0\\n')

print(main('rain_march', 'Subiaco'))
print(main('rain_march', 'Bassendean'))
print(main('no_such_file', 'Subiaco'))
print(main(42, 'Subiaco'))
`,
        },
        {
          kind: 'prose',
          body: 'Look at where each kind of work happens. `read_lines` knows about files and nothing else, so it is the only place a `FileNotFoundError` can come from. `rainfall_for` knows about rows and nothing about the answer, so it returns plain numbers at full precision. `main` knows the contract: it guards the arguments, decides when there is no answer, and is the only place a `round` appears.\n\nThat separation is what makes the program testable. You can call `rainfall_for` with a list of strings you typed yourself and see immediately whether the row rules are right, with no file anywhere near it.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Why does `rainfall_for` return an empty list when the `rainfall` column is missing, while `read_lines` returns `None` when the file is missing?',
          answer: 'So that `main` can tell the two situations apart if it ever needs to, and so that each helper returns one consistent shape. `read_lines` returns a list of lines or `None`; `rainfall_for` always returns a list, possibly empty. `main` collapses both into the single failure value the spec names. A helper that sometimes returns a list and sometimes a number is the thing to avoid.',
        },
        {
          kind: 'order',
          ask: 'A spec asks for the count and mean of the valid readings in this list. Drag these lines into an order that works.',
          lines: [
            { text: "rows = ['12.4', 'n/a', '8.0']", indent: 0 },
            { text: 'values = []', indent: 0 },
            { text: 'for r in rows:', indent: 0 },
            { text: 'try:', indent: 1 },
            { text: 'values.append(float(r))', indent: 2 },
            { text: 'except ValueError:', indent: 1 },
            { text: 'continue', indent: 2 },
            { text: 'print(len(values), round(sum(values) / len(values), 4))', indent: 0 },
          ],
        },
      ],
    },
    {
      id: 'one-pass',
      title: 'Read it once, keep what you need',
      blocks: [
        {
          kind: 'prose',
          body: 'A project usually asks several questions about the same file. The tempting shape is one loop per question, or a loop over the groups with a file read inside it. It gives the right answer and it loses efficiency marks, because the data is being walked over again and again for no reason.\n\nRead the file once. On that single pass, put what you will need into lists and dictionaries, and answer every part of the task from what you kept.',
        },
        {
          kind: 'compare',
          caption: 'Totals per suburb. Both print the same thing; only one of them scales.',
          left: {
            label: 'A pass per suburb',
            bad: true,
            code: `rows = [('subiaco', 12.5), ('como', 3.0), ('subiaco', 8.0), ('como', 1.5)]
suburbs = ['subiaco', 'como']

looks = 0
totals = {}
for suburb in suburbs:
    total = 0
    for name, rain in rows:
        looks = looks + 1
        if name == suburb:
            total = total + rain
    totals[suburb] = total
print(totals, 'after', looks, 'row visits')
`,
          },
          right: {
            label: 'One pass, grouped as it goes',
            code: `rows = [('subiaco', 12.5), ('como', 3.0), ('subiaco', 8.0), ('como', 1.5)]

looks = 0
totals = {}
for name, rain in rows:
    looks = looks + 1
    totals[name] = totals.get(name, 0) + rain
print(totals, 'after', looks, 'row visits')
`,
          },
        },
        {
          kind: 'prose',
          body: 'Four rows and two suburbs is a small difference. A project file has thousands of rows and dozens of groups, and the left-hand shape multiplies one by the other. The right-hand loop never grows past one visit per row, however many groups turn up.\n\nThe same argument applies to `header.index(...)`: call it once, above the loop, not on every row.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'one-pass-grouping',
            title: 'Watching the totals fill in as rows are read',
            intro: 'Drag **rows read so far** and watch each suburb\'s bar grow. Nothing here re-reads a row once it has been counted.',
            template: 'rows = [\n    ("subiaco", 12.5), ("como", 3.0), ("subiaco", 8.0),\n    ("victoria park", 6.0), ("como", 1.5), ("subiaco", 4.0),\n    ("como", 2.5), ("victoria park", 9.5),\n][:⟦n⟧]\n\ntotals = {}\nfor name, rain in rows:\n    totals[name] = totals.get(name, 0) + rain\n\nfor name in sorted(totals):\n    print(name, round(totals[name], 2))\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'rows read so far', min: 1, max: 8, start: 8 },
            ],
            probes: {
              'suburb-totals': "[round(totals.get(s, 0), 2) for s in ['subiaco', 'como', 'victoria park']]",
              'suburb-names': "['subiaco', 'como', 'victoria park']",
            },
            visual: {
              kind: 'bars',
              values: 'suburb-totals',
              labels: 'suburb-names',
              caption: "Each suburb's running total after the rows read so far.",
            },
            notes: {
              '0': 'After one row, only Subiaco has a bar. Como and Victoria Park sit at zero because they have not been seen yet, not because they are missing — `totals.get(name, 0)` is what keeps a suburb\'s first row from crashing the lookup.',
              '2': 'Three rows in, Subiaco has two readings added together and Como has one. Victoria Park is still waiting for its first row to arrive.',
              '7': 'All eight rows read, and every bar matches what the printed totals show. The bars would end up exactly the same if the rows arrived in a different order, because addition does not care what order it happens in — only that every row is visited once.',
            },
            takeaway: 'A one-pass accumulator does not wait for the whole file before it has an answer: each row updates one bar and leaves the others untouched. That is why building the group totals into a dictionary as the rows are read costs one visit per row, no matter how many groups eventually turn up — the alternative, a separate scan per group, would cost one visit per row for every single group.',
          },
        },
        { kind: 'experiment', id: 't12-x2' },
        { kind: 'mistakes', only: ['header_order_assumed', 'efficiency_repeat_pass'] },
      ],
    },
    {
      id: 'validate',
      title: 'Deciding whether a row counts',
      blocks: [
        {
          kind: 'prose',
          body: 'You already know how to skip a bad row. What a project adds is **order**, because the checks depend on each other and one of them will raise if it runs too early.\n\nThe order that cannot crash is: count the fields, then read them, then convert inside `try`, then test the value against the task\'s rules, and only then record the row as seen. A duplicate check belongs at the end for exactly that reason — a row that was going to be rejected anyway should not claim the name.',
        },
        {
          kind: 'code',
          caption: 'Four rows, one duplicate name, one unusable value, one out of range.',
          code: `header = ['club', 'members']
rows = [
    'Rowing,42\\n',
    'rowing ,17\\n',
    'Chess,n/a\\n',
    'Hockey,-3\\n',
    'Chess,28\\n',
]

members = {}
skipped = []
for line in rows:
    fields = line.strip().split(',')
    if len(fields) != len(header):
        skipped.append(('wrong number of fields', line.strip()))
        continue
    name = fields[0].strip().lower()
    try:
        count = int(fields[1])
    except ValueError:
        skipped.append(('not a number', line.strip()))
        continue
    if name == '' or count < 0:
        skipped.append(('out of range', line.strip()))
        continue
    if name in members:
        skipped.append(('duplicate', line.strip()))
        continue
    members[name] = count

print(members)
for reason, line in skipped:
    print('skipped:', reason, '->', repr(line))
`,
        },
        {
          kind: 'prose',
          body: 'Printing the reasons is a habit worth having while you build, and deleting before you submit. It turns "the answer is wrong" into "row four was thrown out for the wrong reason", which is a question you can answer.\n\nNotice that `rowing ` with a trailing space became the same club as `Rowing`. Cleaning a name with `strip().lower()` before comparing is what makes a duplicate check mean anything, and the argument the caller passed in gets cleaned the same way.',
        },
        { kind: 'experiment', id: 't12-x3' },
        { kind: 'mistakes', only: ['invalid_row_not_skipped'] },
      ],
    },
    {
      id: 'precision-and-order',
      title: 'Round last, rank properly',
      blocks: [
        {
          kind: 'prose',
          body: 'Two things go wrong at the end of a project, after all the hard work is done, and both of them are worth more marks than they look.',
        },
        {
          kind: 'quiz',
          prompt: 'A helper returns `round(share, 4)`, and `main` multiplies that by 100 for the final percentage. A second version keeps `share` unrounded through the helper and rounds only after multiplying by 100. Do the two final answers always agree?',
          options: [
            { text: 'No — rounding before the multiplication can shift digits that the multiplication would otherwise have used', correct: true, why: 'Rounding throws digits away for good. Multiplying the rounded value afterwards spreads that loss instead of undoing it.' },
            { text: 'Yes, because 4 decimal places is already far more precise than the task needs', why: 'How precise 4 decimal places sounds does not matter — the digits dropped by rounding are gone before the multiplication ever sees them, and the gap shows up exactly where the task checks it.' },
            { text: 'Yes, as long as `share` is never negative', why: 'The sign of `share` changes nothing about whether rounding happened before or after the multiplication.' },
            { text: 'No, but only because `round()` always rounds down', why: 'Python\'s `round()` rounds to the nearest value, not down. The disagreement comes from removing digits early, not from which way rounding goes.' },
          ],
        },
        { kind: 'experiment', id: 't12-x1' },
        {
          kind: 'prose',
          body: 'The second is ranking. Hidden test files contain ties, deliberately, because a tie is where a careless sort gives a different order from a careful one. Put every tie-break into the sort key, in the order the specification lists them, and sort on the **unrounded** values so two numbers that differ in the seventh decimal place still rank correctly.',
        },
        {
          kind: 'code',
          caption: 'Three clubs, two on the same score. The spec says: score high to low, then name A to Z.',
          code: `rows = [['hockey', 12, 0.81], ['chess', 12, 0.64], ['rowing', 9, 0.95]]

by_score = sorted(rows, key=lambda row: row[1], reverse=True)
print('score only, reversed: ', [r[0] for r in by_score])

with_tiebreak = sorted(rows, key=lambda row: (-row[1], row[0]))
print('score then name A-Z:  ', [r[0] for r in with_tiebreak])
`,
        },
        {
          kind: 'prose',
          body: 'Compare the two orders. Sorting by score alone gives no rule for the tie at all: the two clubs on 12 come out in whatever order they were listed in, not alphabetical order. Adding the name to the key is what fixes that — negating the score keeps it high to low while the name, left alone, still sorts A to Z.\n\nRound after ranking, as the final list is built — never before it.',
        },
        { kind: 'mistakes', only: ['round_mid_calc', 'sort_tiebreak'] },
      ],
    },
    {
      id: 'test-like-the-marker',
      title: 'Testing it the way the marker will',
      blocks: [
        {
          kind: 'prose',
          body: 'The file you were given is the easiest input your program will ever see. Everything that costs marks happens on a file you have not got, so make the files yourself: three lines each, one awkward thing per file, written by your own test code.',
        },
        {
          kind: 'steps',
          title: 'The calls to make before you submit',
          items: [
            'The sample file, checked against the number you worked out by hand.',
            'The same data with the columns shuffled, and one extra column added.',
            'The same data with the headers and the names in different capitals, and stray spaces around them.',
            'A file containing a blank line, a short row, an empty value, an `N/A` and a duplicate — each between two good rows.',
            'A file where every row is invalid, and an empty file: both must return the failure value, not crash.',
            'A file name that does not exist, and arguments of the wrong type such as `main(42, \'x\')`.',
            'The same call twice in a row: the second answer must equal the first.',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Before you upload',
          body: 'Delete every test call, every leftover `print`, and every `input()` from the top level of the file. Code sitting at the top level runs the moment the tester imports your file, and anything it prints, asks for, or crashes on happens before `main` is ever called.',
        },
        {
          kind: 'prose',
          body: 'The worked example below is a whole small project in this shape: read once, validate, group, calculate at full precision, rank with a tie-break, round as the result is built.',
        },
        { kind: 'workedExample' },
        {
          kind: 'checkpoint',
          prompt: 'Your program gives the right answer on the sample file and returns `None` for one of the marker\'s files, which you cannot see. What are the three likeliest causes?',
          answer: 'A column found by a position or a capitalised name rather than a lower-cased header name, so no row ever matched; a validity rule that is too strict, so every row was skipped and the "no valid rows" guard fired; or a file name you altered, by adding `.csv` or by checking the extension. All three are cheap to rule out: rebuild the sample file with shuffled and re-capitalised headers, and print how many rows survived validation.',
        },
        { kind: 'mistakes', only: ['zero_division'] },
        {
          kind: 'practice',
          body: 'The questions for this topic are full project specifications. Treat each one the way you would treat the real thing: signature first, checklist second, one example worked by hand, and helpers before any calculation.',
        },
      ],
    },
  ],
};

export default lesson;
