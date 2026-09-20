// Reference: files and CSV.
//
// The sandbox has an in-memory filesystem, so every snippet writes the file it reads within itself.
import type { Recipe } from '../recipeSchema.ts';

const recipes: Recipe[] = [
  {
    id: 'read-a-file-line-by-line',
    task: 'Read a file line by line',
    group: 'files',
    also: ['open', 'readlines', 'for line in file'],
    topicId: 'files-csv',
    code: "with open('notes.txt', 'w') as f:\n    f.write('first\\nsecond\\n')\nwith open('notes.txt') as f:\n    for line in f:\n        print(line.strip())\n",
    note: 'Each line still has its trailing `\\n` on it when you read it, so `.strip()` is almost always needed before you use or compare the text.',
  },
  {
    id: 'read-the-whole-file',
    task: 'Read the whole contents of a file at once',
    group: 'files',
    also: ['read()', 'whole file'],
    topicId: 'files-csv',
    code: "with open('notes.txt', 'w') as f:\n    f.write('line one\\nline two')\nwith open('notes.txt') as f:\n    text = f.read()\nprint(text)\n",
    note: '`f.read()` gives back the entire file as one string, newlines and all; it is fine for a small file, but reading line by line is kinder to memory for a large one.',
  },
  {
    id: 'write-a-file',
    task: 'Write text to a file',
    group: 'files',
    also: ["open mode 'w'", 'save to a file'],
    topicId: 'files-csv',
    code: "with open('out.txt', 'w') as f:\n    f.write('hello\\n')\n    f.write('world\\n')\nwith open('out.txt') as f:\n    print(f.read())\n",
    note: 'Opening a file with mode `\"w\"` erases whatever was already there before writing the new content, even if the write happens to fail partway through.',
  },
  {
    id: 'append-to-a-file',
    task: 'Add more lines to the end of a file without erasing it',
    group: 'files',
    also: ["open mode 'a'", 'add to a file'],
    topicId: 'files-csv',
    code: "with open('log.txt', 'w') as f:\n    f.write('start\\n')\nwith open('log.txt', 'a') as f:\n    f.write('more\\n')\nwith open('log.txt') as f:\n    print(f.read())\n",
    note: 'Mode `\"a\"` opens the file for writing at the end instead of from the start, so earlier content stays and new lines are added after it.',
  },
  {
    id: 'split-a-csv-line-into-fields',
    task: 'Split a CSV line into its fields',
    group: 'files',
    also: ['csv', 'comma separated', 'fields'],
    topicId: 'files-csv',
    code: "line = 'Ada,36,Perth'\nfields = line.strip().split(',')\nprint(fields)\n",
    note: 'A plain `.split(\",\")` is enough for CSV without quoted commas, which is what CITS1401 files use; strip the newline first or it ends up stuck to the last field.',
  },
  {
    id: 'skip-a-header-row',
    task: 'Skip the header row when reading a CSV file',
    group: 'files',
    also: ['header', 'first line', 'skip line'],
    topicId: 'files-csv',
    code: "with open('data.csv', 'w') as f:\n    f.write('name,age\\nAda,36\\nBo,28\\n')\nwith open('data.csv') as f:\n    lines = f.readlines()\nfor line in lines[1:]:\n    print(line.strip().split(','))\n",
    note: '`lines[1:]` is a slice that skips the first element, the header; forgetting it means the header text gets processed as if it were a real data row.',
  },
  {
    id: 'find-a-column-by-header-name',
    task: 'Find a column by its header name instead of its position',
    group: 'files',
    also: ['header lookup', 'column index', 'by name'],
    topicId: 'files-csv',
    code: "with open('data.csv', 'w') as f:\n    f.write('name,age,city\\nAda,36,Perth\\n')\nwith open('data.csv') as f:\n    header = f.readline().strip().split(',')\n    age_i = header.index('age')\n    for line in f:\n        print(line.strip().split(',')[age_i])\n",
    note: 'Looking up `header.index(\"age\")` once and reusing that position survives the columns being reordered later, unlike hard-coding `row[1]` and hoping age is always second.',
  },
  {
    id: 'convert-a-field-to-a-number-safely',
    task: 'Convert a CSV field to a number without crashing on a bad row',
    group: 'files',
    also: ['invalid row', 'bad data', 'skip invalid'],
    topicId: 'files-csv',
    code: "rows = ['Ada,36', 'Bo,n/a', 'Cy,28']\nfor row in rows:\n    name, age_text = row.split(',')\n    try:\n        print(name, int(age_text))\n    except ValueError:\n        print(name, 'skipped: bad age')\n",
    note: 'Real data always has at least one row that does not convert cleanly; wrapping the conversion in `try`/`except` lets the good rows still get processed instead of the whole program crashing.',
  },
  {
    id: 'write-a-csv-row',
    task: 'Write a row of values to a CSV file',
    group: 'files',
    also: ['write csv', 'comma join'],
    topicId: 'files-csv',
    code: "rows = [('Ada', 36), ('Bo', 28)]\nwith open('out.csv', 'w') as f:\n    f.write('name,age\\n')\n    for name, age in rows:\n        f.write(f'{name},{age}\\n')\nwith open('out.csv') as f:\n    print(f.read())\n",
    note: 'Building the row as `\",\".join(str(v) for v in values)` is safer than an f-string when a value might itself already contain a comma, though neither handles quoting properly.',
  },
];

export default recipes;
