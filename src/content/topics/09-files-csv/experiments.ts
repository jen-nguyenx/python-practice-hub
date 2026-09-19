// "What if" experiments for files and CSV lines. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const splitting: Experiment = {
  id: 't09-x1',
  title: 'What a line out of a file really looks like',
  intro:
    'A line read from a file is one long piece of text, and it still has the newline on the end. Change the line and change whether it is tidied up first, then look at the boxes: one box per field.',
  template:
    "line = \u27e6raw\u27e7\nfields = \u27e6prep\u27e7\nprint(fields)\nprint(len(fields))\nprint(fields[-1] == '3.2')\n",
  knobs: [
    {
      id: 'raw',
      label: 'the line in the file says',
      choices: [
        { value: "'Maylands,3.2\\n'", caption: 'a normal line' },
        { value: "'Maylands, 3.2\\n'", caption: 'a space after the comma' },
        { value: "'Maylands,\\n'", caption: 'the reading is missing' },
        { value: "'\\n'", caption: 'a blank line' },
      ],
    },
    {
      id: 'prep',
      label: 'break it into fields with',
      choices: [
        { value: "line.split(',')", caption: 'split on the commas' },
        { value: "line.strip().split(',')", caption: 'tidy the ends first, then split' },
      ],
    },
  ],
  probes: { parts: '[repr(x) for x in fields]' },
  visual: {
    kind: 'sequence',
    items: 'parts',
    caption:
      'One box per field, with its position underneath. The quotes are shown so you can see the spaces and the `\\n` that are really in there.',
  },
  notes: {
    '0-1':
      'What you want. `strip()` takes the newline off the end of the whole line, then `split(\',\')` cuts it at the commas, and the last field really is `\'3.2\'`.',
    '0-0':
      "The trap. It looks right — two fields, the numbers are there — but the last field is `'3.2\\n'`, so comparing it with `'3.2'` is **False**. Nothing crashes, nothing looks wrong, and your count silently stays at 0. Strip before you split.",
    '1-1':
      "Still not `'3.2'`. `strip()` only tidies the two ends of the whole line, so a space sitting after a comma stays inside the field as `' 3.2'`. If the file might have spaces like this, strip each field too.",
    '2-1':
      "Two fields, and the second is the empty text `''`. The row is not missing, the value is — which is exactly the row you have to skip, because `float('')` would crash.",
    '3-1':
      "A blank line does not give you zero fields, it gives you **one** empty field. That is why the usual guard is `if len(fields) != len(header): continue` — a blank line has one field, and the header has several.",
  },
  takeaway:
    "Every line from a file ends in `'\\n'`, and `split` leaves it stuck to the last field, so `strip()` first and `split(',')` second is the order that never bites you. After that, count the boxes rather than trusting the line: a blank line gives one empty field, a missing value gives an empty field in the middle, and a stray space stays inside the field it belongs to.",
};

const stillText: Experiment = {
  id: 't09-x2',
  title: 'It is text until you convert it, and converting can fail',
  intro:
    'Everything `split` gives you is text, even when it looks like a number. Change what the file says and how you convert it, and watch what doubling it and comparing it actually do.',
  template:
    "line = 'Perth Airport,\u27e6value\u27e7'\nfields = line.split(',')\nrain = \u27e6convert\u27e7\nprint(rain)\nprint(rain * 2)\nprint(rain > 20)\n",
  knobs: [
    {
      id: 'value',
      label: 'the reading in the file says',
      choices: [
        { value: '9.5', caption: '9.5 — a decimal' },
        { value: '640', caption: '640 — a whole number' },
        { value: 'N/A', caption: 'N/A — no reading that day' },
      ],
    },
    {
      id: 'convert',
      label: 'turn it into a number with',
      choices: [
        { value: 'fields[1]', caption: 'nothing — leave it as text' },
        { value: 'float(fields[1])', caption: 'float' },
        { value: 'int(fields[1])', caption: 'int' },
      ],
    },
  ],
  notes: {
    '0-1':
      'The right way for a rainfall reading. `float` handles decimals, doubling does arithmetic, and the comparison answers a real question.',
    '0-0':
      "Left as text, `rain * 2` does not double anything — it repeats the text, giving `'9.59.5'`. Then comparing text with a number is a **TypeError**, because Python refuses to guess what you meant.",
    '0-2':
      "`int('9.5')` is a **ValueError**, even though 9.5 is obviously a number. `int` only accepts text that is a whole number, with no decimal point in it. Use `float` for anything that might have decimals.",
    '1-2': '`int` is fine here, because the text really is a whole number. Notice the result prints as `640`, while `float` would print `640.0`.',
    '2-0':
      "No crash yet, which is the danger: `'N/A'` doubled gives `'N/AN/A'`, and the program carries on with nonsense until the comparison finally stops it.",
    '2-1':
      "The crash the skipping rules exist for: **ValueError**, because `'N/A'` is not a number in any form. This is why real files are checked *before* converting, with `continue` past the rows that would fail.",
  },
  takeaway:
    "`split` always gives text, so `'640'` is a piece of text that happens to look like a number: multiplying repeats it and comparing it with a number stops the program. Convert on purpose, with `float` for anything that might have a decimal point (`int('9.5')` fails), and remember that a conversion is a place your program can crash — check or `try` before converting anything that came out of a file.",
};

const header: Experiment = {
  id: 't09-x3',
  title: 'The header line, and reading the file past it',
  intro:
    'This writes a small file and then adds up the second column. Change whether the file has a header line and what you read before the loop, and see how often the answer is quietly wrong.',
  template:
    "with open('sightings', 'w') as out:\n    out.write(\u27e6content\u27e7)\n\nf = open('sightings')\n\u27e6skip\u27e7\ntotal = 0\nfor line in f:\n    fields = line.strip().split(',')\n    total = total + int(fields[1])\nf.close()\nprint(total)\n",
  knobs: [
    {
      id: 'content',
      label: 'the file starts with',
      choices: [
        { value: "'name,count\\nquokka,12\\nosprey,7\\n'", caption: 'a header line, then two rows' },
        { value: "'quokka,12\\nosprey,7\\n'", caption: 'straight into the rows, no header' },
      ],
    },
    {
      id: 'skip',
      label: 'before the loop',
      choices: [
        { value: 'header = f.readline()', caption: 'read one line and keep it aside' },
        { value: 'pass', caption: 'read nothing' },
        { value: 'header = f.read()', caption: 'read the whole file' },
      ],
    },
  ],
  notes: {
    '0-0':
      'The right pairing: the file has a header, so one `readline()` takes it out of the way and the loop starts at the first real row. 12 + 7 = 19.',
    '0-1':
      "A **ValueError** on the header itself: `int('count')` cannot work, because `count` is the name of the column, not a number. A crash on the very first row nearly always means the header was never skipped.",
    '1-0':
      "No crash, and the answer is wrong: 7 instead of 19. `readline()` swallowed the quokka row because there was no header to swallow, and nothing in the output says so. A silently wrong total is worse than a crash.",
    '1-1': 'No header in the file and nothing skipped, so every line is a real row and the total is right. 19.',
    '0-2':
      '0. `read()` takes **everything** that is left, so by the time the loop starts there is nothing to read and it goes round zero times. Reading always moves forward through the file; whatever you read, the loop does not see again.',
  },
  takeaway:
    'A file is read forwards, once. `readline()` takes exactly one line, `read()` takes all of it, and whatever you take is gone from the loop that follows. So skip the header once, before the loop, and only when there really is one — the total being too small by one row is the sign that you skipped a row of data by mistake.',
};

export const experiments: Experiment[] = [splitting, stillText, header];
