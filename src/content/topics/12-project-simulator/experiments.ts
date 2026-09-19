// "What if" experiments for the project simulator. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const rounding: Experiment = {
  id: 't12-x1',
  title: 'Rounding as you go, or only at the end',
  intro:
    "Each club's share of the members is turned into a percentage. Drag the slider to include more clubs, and change where the rounding happens. Watch the table, the list of percentages and whether they still add up to 100.",
  template: `counts = [17, 23, 11, 9, 31, 5, 14, 8][:⟦count⟧]
total = sum(counts)
percents = []
for c in counts:
    share = ⟦share⟧
    percents.append(round(share * 100, 4))
print('percentages:', percents)
print('they add up to:', round(sum(percents), 4))
`,
  knobs: [
    { id: 'count', kind: 'range', label: 'how many clubs are counted', min: 1, max: 8, start: 8 },
    {
      id: 'share',
      label: "each club's share of the members",
      choices: [
        { value: 'c / total', caption: 'keep every decimal' },
        { value: 'round(c / total, 4)', caption: 'round it to 4 decimal places first' },
        { value: 'round(c / total, 2)', caption: 'round it to 2 decimal places first' },
      ],
    },
  ],
  watch: ['c', 'share'],
  anchorLine: 5,
  notes: {
    '7-0':
      'The right way. Every share keeps its full precision, the rounding happens once as each percentage goes into the result, and the eight percentages add up to 100.',
    '7-1':
      'Four decimal places sounds harmless, and it is not. Every percentage is now wrong in its second decimal place, because rounding the share threw away digits that were then multiplied by 100. The total still lands on 100 here, which is exactly how this bug survives a quick check.',
    '5-1':
      'Six clubs, shares rounded to 4 decimal places, and the total comes out as 100.01. Nothing in this program rounds to fewer than 4 places, and the answer is still wrong, because the rounded share was multiplied afterwards.',
    '7-2':
      'The same mistake, made bigger. Rounding the share to 2 decimal places moves every percentage by up to half a point, and the total drifts a whole point away from 100.',
    '0-1':
      'With one club there is nothing to lose: its share is exactly 1.0, so all three settings agree. A bug that only shows up on bigger inputs is exactly the kind the hidden test files find.',
    '3-2':
      'Four clubs, shares rounded to 2 decimal places. The error is already visible in the total, and it grows as you drag the slider further right.',
  },
  takeaway:
    'Rounding is not a tidying-up step you can do anywhere. The moment a rounded value is used in another calculation, the digits you threw away are gone for good, and multiplying, dividing or adding them up makes the error bigger, not smaller. Calculate at full precision the whole way through and round only as a value goes into the result you return.',
};

const columnsByName: Experiment = {
  id: 't12-x2',
  title: 'Finding the column you want',
  intro:
    'The same three rows of rainfall data, once with the columns in the order you expected and once shuffled, as a hidden test file might be. Change how the rainfall column is found.',
  template: `⟦file⟧
header = lines[0].strip().lower().split(',')
column = ⟦column⟧
total = 0
for line in lines[1:]:
    fields = line.strip().split(',')
    total = total + float(fields[column])
print('total rainfall:', round(total, 4))
`,
  knobs: [
    {
      id: 'file',
      label: 'the file you are given',
      choices: [
        {
          value: "lines = ['Suburb,Rainfall,Station\\n', 'Subiaco,12.5,Perth\\n', 'Como,8.0,Perth\\n']",
          caption: 'rainfall in the middle column',
        },
        {
          value: "lines = ['Rainfall,Suburb,Station\\n', '12.5,Subiaco,Perth\\n', '8.0,Como,Perth\\n']",
          caption: 'the same data with the columns shuffled',
        },
      ],
    },
    {
      id: 'column',
      label: 'how the rainfall column is found',
      choices: [
        { value: '1', caption: 'count the columns by hand' },
        { value: "header.index('rainfall')", caption: 'look the name up in the header' },
        { value: "header.index('Rainfall')", caption: 'look up the name as it is spelt in the file' },
      ],
    },
  ],
  notes: {
    '0-0':
      'Right answer, wrong method. Counting by hand works on the file in front of you and tells you nothing about the file the marker will use.',
    '1-0':
      'A crash: `ValueError`, because column 1 now holds `Subiaco`, and `float()` will not turn a suburb name into a number. Nothing in the code changed; only the file did.',
    '0-1':
      'The version to write. `header.index` finds the column wherever it sits, so shuffling the file changes nothing.',
    '1-1':
      'The same code, the same answer, on the shuffled file. That is the whole point of looking the column up by name.',
    '0-2':
      "A crash: `ValueError: 'Rainfall' is not in list`. The header was lower-cased on the line above, so the list holds `'rainfall'`. Look up the lower-case spelling once the header has been lower-cased.",
  },
  takeaway:
    'Never assume a column number. The hidden test files shuffle the columns and add extra ones, so read the header, lower-case it, and call `header.index(...)` once, before the loop, for every column you need. Whatever you lower-case, look up in lower case too.',
};

const badRows: Experiment = {
  id: 't12-x3',
  title: 'The rows that are not rows',
  intro:
    'This little file has a blank line and a reading written as `n/a`, which is exactly what the project data does. Change the check before the conversion and the kind of error the `try` catches.',
  template: `lines = ['Suburb,Rainfall\\n', 'Subiaco,12.5\\n', '\\n', 'Como,n/a\\n', 'Perth,8.0\\n']
header = lines[0].strip().split(',')
values = []
for line in lines[1:]:
    fields = line.strip().split(',')
    ⟦guard⟧
    try:
        values.append(float(fields[1]))
    except ⟦catch⟧:
        continue
print('kept', len(values), 'rows:', values)
`,
  knobs: [
    {
      id: 'guard',
      label: 'check before touching the fields',
      choices: [
        { value: 'if len(fields) != len(header): continue', caption: 'skip a row with the wrong number of fields' },
        { value: 'pass', caption: 'use every row' },
      ],
    },
    {
      id: 'catch',
      label: 'the kind of bad row the try catches',
      choices: [
        { value: 'ValueError', caption: 'text where a number belongs' },
        { value: 'IndexError', caption: 'a field that is not there' },
        { value: '(ValueError, IndexError)', caption: 'either of those' },
      ],
    },
  ],
  notes: {
    '0-0':
      'The version to write. The length check throws out the blank line before any field is read, and `try` around `float()` throws out the `n/a` reading, leaving the two real readings.',
    '1-0':
      'A crash: `IndexError`. A blank line strips to an empty string, and splitting an empty string gives `[\'\']`, which is one field, so `fields[1]` does not exist. The `try` is watching for the wrong thing.',
    '0-1':
      "A crash: `ValueError`. The blank line is handled, but `float('n/a')` is not the error being caught, so it escapes and stops the program.",
    '1-2':
      'It survives, and it is still worse code. Catching both errors hides the blank row instead of recognising it, so a row that is short for some other reason is silently swallowed too. Check the length, then convert.',
  },
  takeaway:
    'Real data files contain blank lines, short rows, `n/a`, empty cells and text where numbers belong, and every one of them crashes a program that trusts the row. Check the number of fields first, convert inside `try`/`except ValueError`, reject values that are out of range, and only then keep the row. A row you cannot trust is skipped with `continue`, never guessed at.',
};

export const experiments: Experiment[] = [rounding, columnsByName, badRows];
