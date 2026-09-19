// Advanced: the two text formats you will actually meet, and the modules that handle them properly.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'json-and-csv',
  title: 'JSON and CSV',
  summary: 'Two ways to put data in a text file, and the standard-library modules that get the details right',
  track: 'advanced',
  order: 12,
  minutes: 24,
  outcomes: [
    'Turn Python data into JSON text and back with `dumps` and `loads`',
    'Say which Python types survive a JSON round trip and which change',
    'Read and write CSV with `csv.DictReader` and `csv.writer` instead of `split(",")`',
    'Choose the right format for a given piece of data',
  ],
  sections: [
    {
      id: 'why',
      title: 'Data has to leave the program',
      blocks: [
        {
          kind: 'prose',
          body: 'A list of dictionaries lives in memory and dies when the program ends. To keep it, send it somewhere, or read what another program produced, it has to become **text**, and both ends have to agree on how to read that text back.\n\nTwo agreements cover almost everything you will meet. CSV is a grid: rows and columns, like a spreadsheet. JSON is a tree: nested dictionaries and lists, the way a web service answers a request. Python ships with a module for each, and both modules exist because the fiddly cases are fiddlier than they look.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Not in the CITS1401 projects',
          body: 'The unit\'s project specifications forbid importing any module, so the marked work reads files with `open`, `strip` and `split`. Everything here is for your own programs and for after the unit. It is still worth knowing now, because it tells you what your hand-written parsing is trying to reproduce — and which cases it will get wrong.',
        },
      ],
    },
    {
      id: 'json-round-trip',
      title: 'JSON: `dumps` and `loads`',
      blocks: [
        {
          kind: 'prose',
          body: 'Four names, and you have the whole module. `dumps` turns data into a string; `loads` reads a string back. The versions without the `s` do the same to an open file: `dump` writes, `load` reads. The `s` stands for string.',
        },
        {
          kind: 'shell',
          caption: 'Out to text and back again.',
          lines: [
            'import json',
            "student = {'name': 'Ada', 'marks': [72, 65], 'passed': True, 'note': None}",
            'text = json.dumps(student)',
            'text',
            'type(text).__name__, len(text)',
            'back = json.loads(text)',
            'back',
            'back == student',
            "back['marks'][0] + 1",
            "json.loads('[1, 2, 3]')",
            'json.dumps([1, 2, 3])',
          ],
        },
        {
          kind: 'prose',
          body: 'Look at what changed in the text version of those values: the booleans and the empty value are spelled differently in JSON than in Python, and the quotes are always double. That is JSON\'s spelling, not Python\'s, and `loads` translates it back — which is why the comparison at the end came out as it did.',
        },
        {
          kind: 'code',
          caption: 'Writing to a file and reading it back, which is the usual reason to do any of this.',
          code: "import json\n\nstudents = [\n    {'name': 'Ada', 'mark': 72},\n    {'name': 'Bob', 'mark': 65},\n]\n\nwith open('marks.json', 'w') as f:\n    json.dump(students, f, indent=2)\n\nprint(open('marks.json').read())\n\nwith open('marks.json') as f:\n    loaded = json.load(f)\n\nprint(loaded == students)\nprint(loaded[0]['name'], loaded[0]['mark'] + 1)\n",
        },
        {
          kind: 'prose',
          body: '`indent=2` is the difference between a file a person can read and one long line. It costs a little space and is worth it for anything you might open yourself. `sort_keys=True` is the other option worth knowing: it makes the output order fixed, so two runs produce identical files and a difference in a file really means a difference in the data.',
        },
      ],
    },
    {
      id: 'what-survives',
      title: 'What survives the round trip',
      blocks: [
        {
          kind: 'prose',
          body: 'JSON has fewer types than Python, so some values come back as something else, and some cannot go out at all. This is the part people get wrong from memory, so here it is, run.',
        },
        {
          kind: 'code',
          caption: 'Each value sent out and read back, with what it became.',
          code: "import json\n\nvalues = [\n    42,\n    3.5,\n    'text',\n    True,\n    None,\n    [1, 2],\n    (1, 2),\n    {'a': 1},\n    {1: 'one'},\n    {2.5: 'two and a half'},\n    {True: 'yes'},\n]\n\nfor v in values:\n    text = json.dumps(v)\n    back = json.loads(text)\n    same = 'same' if back == v else 'CHANGED'\n    print(f'{v!r:24} -> {text:22} -> {back!r:22} {type(back).__name__:5} {same}')\n",
        },
        {
          kind: 'prose',
          body: 'Two rows in that table are the ones to remember. A tuple goes out as a JSON array and comes back a list, because JSON has no tuples. And **every key becomes a string**: numbers, and even `True`, are spelled as text keys on the way out, and stay text on the way back.\n\nThat last one bites when you save a dictionary keyed by student number and read it back expecting numbers.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'round-trip-a-value',
            title: 'Pick a value, send it through JSON',
            intro: 'Choose what goes in, then compare it with what comes back out the other side.',
            template: 'import json\n\nvalue = ⟦value⟧\ntext = json.dumps(value)\nback = json.loads(text)\nprint(repr(value))\nprint(text)\nprint(repr(back))\nprint(back == value)\n',
            knobs: [
              {
                id: 'value',
                label: 'the value sent through',
                choices: [
                  { value: '[1, 2, 3]', caption: 'a list' },
                  { value: '(1, 2, 3)', caption: 'a tuple' },
                  { value: "{1: 'a', 2: 'b'}", caption: 'a dict with number keys' },
                  { value: "{'x', 'y'}", caption: 'a set' },
                ],
              },
            ],
            notes: {
              '0': 'A list survives exactly: same type, same contents, `back == value` is `True`.',
              '1': 'A tuple goes out as a JSON array — JSON has nothing else to make it — and `loads` has no way to know it should come back as a tuple, so it comes back a list. Same numbers, different type, and `[1, 2, 3] == (1, 2, 3)` is `False`.',
              '2': 'The keys `1` and `2` are written as the text `"1"` and `"2"`, because every JSON key is a string. `back` looks right when printed and fails the equality check, because its keys are text where the original had numbers.',
              '3': 'A set has no JSON equivalent at all, so `dumps` refuses outright before anything is written. Converting to a sorted list first is the fix, and it is a decision you make, not one the module makes for you.',
            },
            takeaway: 'JSON only really has arrays and text keys. Whatever left your program as a tuple, or was keyed by anything other than a string, comes back changed — quietly for a tuple or a numeric key, loudly for a set — so the round trip is only safe for the types JSON actually has.',
          },
        },
        {
          kind: 'shell',
          caption: 'Keyed by number, saved, reloaded.',
          lines: [
            'import json',
            "counts = {1: 'one', 2: 'two'}",
            'json.dumps(counts)',
            'back = json.loads(json.dumps(counts))',
            'back',
            'back == counts',
            'sorted(back)',
            'back[1]',
            "back['1']",
            '{int(k): v for k, v in back.items()} == counts',
          ],
        },
        {
          kind: 'prose',
          body: 'The lookup by number failed and the lookup by text worked, and the last line shows the usual repair: convert the keys back yourself, at the moment you load, so the rest of the program never has to know.',
        },
        {
          kind: 'code',
          caption: 'Types JSON cannot take at all. This one raises on purpose.',
          code: "import json\nimport datetime\n\nprint(json.dumps({'when': '2024-03-01'}))\nprint(json.dumps({'rows': [1, 2], 'ok': True}))\nprint(json.dumps({'when': datetime.date(2024, 3, 1)}))\n",
        },
        {
          kind: 'prose',
          body: 'Dates, sets, objects of your own classes and anything else JSON has never heard of are refused, with the offending field named. The fix is to convert to something JSON knows before dumping — `str(date)`, `sorted(a_set)`, `dataclasses.asdict(obj)` — and to convert back after loading.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You save `{"scores": {1: 90, 2: 80}, "tags": {"maths", "stats"}}` and it raises. You fix that, save successfully, load the file, and `data["scores"][1]` fails. Explain both problems and write the two conversions that fix them properly.',
          answer: 'The first failure is the set: JSON has arrays and objects and nothing that means "set", so it refuses. Converting with `sorted(tags)` makes it a list and also makes the file deterministic; on load, `set(data["tags"])` puts it back. The second failure is the key rule: every JSON key is a string, so the integer keys `1` and `2` were written as `"1"` and `"2"` and came back as text, making `data["scores"][1]` a `KeyError` while `data["scores"]["1"]` works. The repair is a comprehension at load time: `{int(k): v for k, v in data["scores"].items()}`. Both conversions belong in one small function that turns loaded JSON into your program\'s shapes, so that nothing downstream has to remember the format\'s limits.',
        },
      ],
    },
    {
      id: 'csv-commas',
      title: 'CSV: why not `split(",")`',
      blocks: [
        {
          kind: 'prose',
          body: 'A CSV file is rows of fields separated by commas. It looks so simple that splitting on commas seems obviously enough — and it is, right up until a field contains a comma.\n\nThe format has an answer for that: put the field in quotes. Which means a reader now has to understand quotes, and quotes inside quotes, and line breaks inside quoted fields.',
        },
        {
          kind: 'code',
          caption: 'One line with a comma inside a field, read two ways.',
          code: "import csv\n\nline = '\"Nguyen, Ada\",72,\"said \"\"hello\"\"\"'\n\nprint(line)\nprint('split:', line.split(','))\nprint('csv:  ', next(csv.reader([line])))\n",
        },
        {
          kind: 'prose',
          body: 'The split produced four fields out of a row that has three, cut a person\'s name in half, and left the quote characters in place. The csv reader produced the three real fields, joined the name back together and removed the quoting.\n\nThe same applies when writing: a field containing a comma, a quote or a newline has to be quoted on the way out, and the module does it for you.',
        },
        {
          kind: 'code',
          caption: 'Writing rows that contain the awkward characters.',
          code: "import csv\n\nrows = [\n    ['name', 'mark', 'note'],\n    ['Nguyen, Ada', 72, 'said \"hello\"'],\n    ['Bob', 65, 'plain'],\n]\n\nwith open('marks.csv', 'w', newline='') as f:\n    csv.writer(f).writerows(rows)\n\nprint(repr(open('marks.csv').read()))\nprint()\nwith open('marks.csv') as f:\n    for row in csv.reader(f):\n        print(row)\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: '`newline=\'\'` when you open a file for csv',
          body: 'The csv module handles line endings itself. Without `newline=\'\'` in the `open` call, you can get a blank line between every row on some systems. It is a small thing that looks like a bug in your data.',
        },
      ],
    },
    {
      id: 'dictreader',
      title: '`DictReader` and `DictWriter`',
      blocks: [
        {
          kind: 'prose',
          body: 'Reading rows as lists means writing `row[2]` and remembering what column two was. `DictReader` uses the header line to give each field its name, so the code says what it means and survives someone adding a column.',
        },
        {
          kind: 'code',
          caption: 'Writing with a header, then reading it back by name.',
          code: "import csv\n\nstudents = [\n    {'name': 'Ada', 'mark': 72, 'unit': 'CITS1401'},\n    {'name': 'Bob', 'mark': 65, 'unit': 'CITS1401'},\n]\n\nwith open('marks.csv', 'w', newline='') as f:\n    writer = csv.DictWriter(f, fieldnames=['name', 'mark', 'unit'])\n    writer.writeheader()\n    writer.writerows(students)\n\nprint(open('marks.csv').read())\n\nwith open('marks.csv') as f:\n    for row in csv.DictReader(f):\n        print(row)\n        print('  mark field:', repr(row['mark']), type(row['mark']).__name__)\n",
        },
        {
          kind: 'prose',
          body: 'The marks went out as whole numbers and came back with quotes around them. That is not a quirk of the module: **a CSV file is text and has no types at all**, so every field arrives as a string and converting is your job.',
        },
        {
          kind: 'code',
          caption: 'Converting at the boundary, and what happens if you forget.',
          code: "import csv\n\nwith open('marks.csv', 'w', newline='') as f:\n    w = csv.DictWriter(f, fieldnames=['name', 'mark'])\n    w.writeheader()\n    w.writerows([{'name': 'Ada', 'mark': 9}, {'name': 'Bob', 'mark': 65}])\n\nwith open('marks.csv') as f:\n    raw = list(csv.DictReader(f))\n\nprint(raw)\nprint('total:', sum(int(row['mark']) for row in raw))\nprint('top by number:', max(raw, key=lambda r: int(r['mark']))['name'])\nprint('top by text:  ', max(raw, key=lambda r: r['mark'])['name'])\nprint(sum(row['mark'] for row in raw))\n",
        },
        {
          kind: 'prose',
          body: 'The two "top student" lines disagree, and only one of them converted. Comparing the marks as text compares them character by character, so a mark of 9 beats a mark of 65 and the report names the wrong student — no error, no clue. The last line did raise, which in this company counts as the friendly failure.\n\nSo the pattern for any CSV is: read the rows, convert every field you will do arithmetic on, and do it once, in one place, straight after reading.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A CSV has columns `id,name,mark` and 50,000 rows, some with an empty mark and one with the text `absent`. Write the shape of the loading step in words: what do you convert, what do you do with the bad rows, and why should this be its own function?',
          answer: 'Convert `id` and `mark` to numbers row by row, inside a `try` that catches `ValueError`, because the empty string and `absent` both fail `int()`. For the bad rows you decide once and write the decision down: skip them, collect them in a second list to report at the end, or store the mark as `None` and let the later code ignore it — "the average of the marks that exist" and "the average counting absences as zero" are different answers, so this is a specification question, not a coding one. It belongs in its own function because that gives the rest of the program a single guarantee: after `load_marks(path)` returns, every mark is a number or explicitly missing, and no other code has to carry a `try` or wonder about text. Testing that one function against an empty file, a header-only file and a row with a bad mark then covers the whole class of problem.',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Which format, when',
      blocks: [
        {
          kind: 'prose',
          body: 'The choice is decided by the shape of the data, not by taste. A grid of rows that all have the same columns is a CSV. Anything nested, or ragged, or where different records have different fields, is JSON.',
        },
        {
          kind: 'code',
          caption: 'The same data, forced into each format.',
          code: "import json\nimport csv\n\nstudent = {\n    'name': 'Ada',\n    'units': [\n        {'code': 'CITS1401', 'assessments': [{'name': 'project 1', 'mark': 18}]},\n    ],\n}\n\nprint(json.dumps(student, indent=2))\n\nwith open('flat.csv', 'w', newline='') as f:\n    w = csv.writer(f)\n    w.writerow(['name', 'units'])\n    w.writerow([student['name'], student['units']])\n\nprint(repr(open('flat.csv').read()))\nwith open('flat.csv') as f:\n    row = list(csv.DictReader(f))[0]\nprint(type(row['units']).__name__, row['units'][:20])\n",
        },
        {
          kind: 'prose',
          body: 'The nested structure went into the CSV as the text of its own repr, and came back as text that is no longer data. Nothing raised; the information is simply gone. That is what "the wrong format" looks like in practice.',
        },
        {
          kind: 'table',
          caption: 'Choosing.',
          head: ['', 'CSV', 'JSON'],
          rows: [
            ['Shape', 'A grid: every row has the same columns', 'A tree: dicts and lists inside each other'],
            ['Types', 'None. Everything is text', 'Numbers, text, booleans, null, arrays, objects'],
            ['Opens in a spreadsheet', 'Yes, which is often the whole point', 'No'],
            ['Good for', 'Marks, readings, transactions, anything tabular', 'Settings, web service replies, records of varying shape'],
            ['Watch out for', 'Commas and quotes inside fields; no types', 'Keys always become strings; no dates, sets or tuples'],
            ['Module', 'csv: reader, writer, DictReader, DictWriter', 'json: dumps, loads, dump, load'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You are storing 200,000 sensor readings of `(timestamp, sensor_id, value)` that will be loaded into a spreadsheet by someone else, and separately a settings file with about twenty options, some of them lists. Choose a format for each and give the reason that decides it — not "one is nested", but what goes wrong with the other choice.',
          answer: 'Readings go in a CSV. The rows are identical in shape, so JSON would repeat all three key names 200,000 times for no benefit — a much larger file — and the person with the spreadsheet could not open it without writing a program first. Settings go in JSON. Forced into a CSV, the options that are lists would have to be flattened into some private convention such as semicolon-separated text, and every reader and writer of the file would then have to know and agree on that convention — which is the moment you have invented a format instead of using one. The deciding question is not the shape of the data but what the other end has to know: CSV when the shape is uniform and the consumer is a spreadsheet, JSON when the structure itself is part of the information.',
        },
      ],
    },
  ],
};

export default lesson;
