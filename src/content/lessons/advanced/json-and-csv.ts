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
          body: 'A list of dictionaries lives in memory and dies when the program ends. To keep it, or read what another program produced, it has to become **text**, and both ends have to agree on how to read that text back.\n\nTwo agreements cover almost everything. CSV is a grid: rows and columns, like a spreadsheet. JSON is a tree: nested dictionaries and lists, the way a web service answers a request.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Not in the CITS1401 projects',
          body: 'The unit\'s project specifications forbid importing any module, so the marked work reads files with `open`, `strip` and `split`. Everything here is for your own programs and for after the unit — and it tells you what your hand-written parsing is trying to reproduce.',
        },
      ],
    },
    {
      id: 'json-round-trip',
      title: 'JSON: `dumps` and `loads`',
      blocks: [
        {
          kind: 'prose',
          body: 'Four names, and you have the whole module. `dumps` turns data into a string; `loads` reads a string back. The versions without the `s` do the same to an open file: `dump` writes, `load` reads.',
        },
        {
          kind: 'shell',
          caption: 'Out to text and back again.',
          lines: [
            'import json',
            "student = {'name': 'Ada', 'marks': [72, 65], 'passed': True, 'note': None}",
            'text = json.dumps(student)',
            'text',
            'back = json.loads(text)',
            'back',
            'back == student',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'The booleans and the empty value print differently inside `text` than inside `student`. What is going on?',
          options: [
            {
              text: 'JSON has its own spelling for those values — `true`, `false`, `null` — and `loads` translates it back on the way in',
              correct: true,
              why: 'The text is JSON\'s format, not Python\'s: `True` becomes `true`, `None` becomes `null`. `loads` reverses the translation, which is why `back == student` comes out true even though the text in between looked different.',
            },
            { text: 'The round trip lost the boolean and the missing value', why: '`back == student` says otherwise: both values survive intact. Only their spelling in the intermediate text differs, not their value after loading.' },
            { text: 'json.dumps converts every value to a string, including numbers', why: 'The marks come back as a list of integers, not text — `dumps` writes structured JSON, not a string representation of the whole object.' },
            { text: 'This is a bug specific to this dictionary\'s shape', why: 'Every dict serialised through `json.dumps` gets the same treatment for booleans and `None`; it is how the format is defined, not a quirk of this data.' },
          ],
        },
        {
          kind: 'code',
          caption: 'Writing to a file and reading it back, which is the usual reason to do any of this.',
          code: "import json\n\nstudents = [\n    {'name': 'Ada', 'mark': 72},\n    {'name': 'Bob', 'mark': 65},\n]\n\nwith open('marks.json', 'w') as f:\n    json.dump(students, f, indent=2)\n\nprint(open('marks.json').read())\n\nwith open('marks.json') as f:\n    loaded = json.load(f)\n\nprint(loaded == students)\n",
        },
        {
          kind: 'prose',
          body: '`indent=2` is the difference between a file a person can read and one long line. `sort_keys=True` is the other option worth knowing: it fixes the output order, so a difference between two runs really means a difference in the data.',
        },
      ],
    },
    {
      id: 'what-survives',
      title: 'What survives the round trip',
      blocks: [
        {
          kind: 'prose',
          body: 'JSON has fewer types than Python, so some values come back as something else, and some cannot go out at all. This is the part people get wrong from memory.',
        },
        {
          kind: 'predict',
          ask: 'A tuple and a dict with integer keys are both sent through `dumps` then `loads`. Which line shows they came back changed?',
          code: "import json\n\npair = (1, 2)\nback_pair = json.loads(json.dumps(pair))\nprint(type(back_pair).__name__, back_pair == pair)\n\ncounts = {1: 'one', 2: 'two'}\nback_counts = json.loads(json.dumps(counts))\nprint(sorted(back_counts.keys()))\n",
          choices: [
            'list False\n[\'1\', \'2\']',
            'tuple True\n[1, 2]',
            'list True\n[1, 2]',
            'list False\n[1, 2]',
          ],
        },
        {
          kind: 'prose',
          body: 'A tuple goes out as a JSON array and comes back a list, because JSON has no tuples. And **every key becomes a string**, even a number — which bites when you save a dictionary keyed by student number and read it back expecting numbers.',
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
            takeaway: 'JSON only really has arrays and text keys. Whatever left your program as a tuple, or was keyed by anything other than a string, comes back changed — quietly for a tuple or a numeric key, loudly for a set.',
          },
        },
        {
          kind: 'code',
          caption: 'Types JSON cannot take at all. This one raises on purpose.',
          code: "import json\nimport datetime\n\nprint(json.dumps({'rows': [1, 2], 'ok': True}))\nprint(json.dumps({'when': datetime.date(2024, 3, 1)}))\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'You save `{"scores": {1: 90, 2: 80}, "tags": {"maths", "stats"}}` and it raises. You fix that, save, load the file, and `data["scores"][1]` fails. Explain both problems and the two conversions that fix them.',
          answer: 'The first failure is the set: JSON has arrays and objects and nothing that means "set", so it refuses. Converting with `sorted(tags)` makes it a list and also makes the file deterministic; on load, `set(data["tags"])` puts it back. The second failure is the key rule: every JSON key is a string, so the integer keys `1` and `2` were written as `"1"` and `"2"` and came back as text, making `data["scores"][1]` a `KeyError` while `data["scores"]["1"]` works. The repair is `{int(k): v for k, v in data["scores"].items()}` at load time. Both conversions belong in one small function that turns loaded JSON into your program\'s shapes.',
        },
      ],
    },
    {
      id: 'csv-commas',
      title: 'CSV: why not `split(",")`',
      blocks: [
        {
          kind: 'prose',
          body: 'A CSV file is rows of fields separated by commas. Splitting on commas seems obviously enough — right up until a field contains a comma. The format\'s answer is to put the field in quotes, which means a reader now has to understand quotes, and quotes inside quotes.',
        },
        {
          kind: 'code',
          caption: 'One line with a comma inside a field, read two ways.',
          code: "import csv\n\nline = '\"Nguyen, Ada\",72,\"said \"\"hello\"\"\"'\n\nprint(line)\nprint('split:', line.split(','))\nprint('csv:  ', next(csv.reader([line])))\n",
        },
        {
          kind: 'prose',
          body: 'The split produced four fields out of a row that has three, and cut a person\'s name in half. The csv reader produced the three real fields and removed the quoting.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: '`newline=\'\'` when you open a file for csv',
          body: 'The csv module handles line endings itself. Without `newline=\'\'` in the `open` call, you can get a blank line between every row on some systems.',
        },
      ],
    },
    {
      id: 'dictreader',
      title: '`DictReader` and `DictWriter`',
      blocks: [
        {
          kind: 'prose',
          body: 'Reading rows as lists means writing `row[2]` and remembering what column two was. `DictReader` uses the header line to give each field its name, so the code survives someone adding a column.',
        },
        {
          kind: 'code',
          caption: 'Writing with a header, then reading it back by name.',
          code: "import csv\n\nstudents = [\n    {'name': 'Ada', 'mark': 72, 'unit': 'CITS1401'},\n    {'name': 'Bob', 'mark': 65, 'unit': 'CITS1401'},\n]\n\nwith open('marks.csv', 'w', newline='') as f:\n    writer = csv.DictWriter(f, fieldnames=['name', 'mark', 'unit'])\n    writer.writeheader()\n    writer.writerows(students)\n\nwith open('marks.csv') as f:\n    for row in csv.DictReader(f):\n        print(row)\n        print('  mark field:', repr(row['mark']), type(row['mark']).__name__)\n",
        },
        {
          kind: 'quiz',
          prompt: 'Every mark went out as a whole number and came back as text with quotes around it. Why?',
          options: [
            {
              text: 'A CSV file is plain text with no type system at all, so every field arrives as a string regardless of what it started as',
              correct: true,
              why: 'CSV has no concept of "this column is numbers". Converting is entirely your responsibility, at the moment you read the field back.',
            },
            { text: 'DictWriter wrote the marks incorrectly', why: 'The file on disk holds the digits correctly; the type information is simply not part of what CSV can express, so it is lost on the way out, not written wrong.' },
            { text: 'DictReader has a bug that only affects number-like fields', why: 'This is DictReader working as designed — every field it returns is text, whatever it looks like, because that is all a CSV row is.' },
            { text: 'The fieldnames list was given in the wrong order', why: 'The field named `mark` still holds the right value, `"72"` — the issue is its type as text, not its position or which column it is.' },
          ],
        },
        {
          kind: 'code',
          caption: 'Converting at the boundary, and what happens if you forget.',
          code: "import csv\n\nwith open('marks.csv', 'w', newline='') as f:\n    w = csv.DictWriter(f, fieldnames=['name', 'mark'])\n    w.writeheader()\n    w.writerows([{'name': 'Ada', 'mark': 9}, {'name': 'Bob', 'mark': 65}])\n\nwith open('marks.csv') as f:\n    raw = list(csv.DictReader(f))\n\nprint('top by number:', max(raw, key=lambda r: int(r['mark']))['name'])\nprint('top by text:  ', max(raw, key=lambda r: r['mark'])['name'])\n",
        },
        {
          kind: 'prose',
          body: 'The two "top student" lines disagree. Comparing marks as text compares them character by character, so a mark of `9` beats a mark of `65` and the report names the wrong student — no error, no clue. The pattern for any CSV: convert every field you will do arithmetic on, once, straight after reading.',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Which format, when',
      blocks: [
        {
          kind: 'prose',
          body: 'The choice is decided by the shape of the data, not by taste. A grid of rows that all have the same columns is a CSV. Anything nested, or where different records have different fields, is JSON.',
        },
        {
          kind: 'code',
          caption: 'Nested data, forced into a CSV cell.',
          code: "import csv\n\nstudent = {\n    'name': 'Ada',\n    'units': [{'code': 'CITS1401', 'mark': 72}],\n}\n\nwith open('flat.csv', 'w', newline='') as f:\n    w = csv.writer(f)\n    w.writerow(['name', 'units'])\n    w.writerow([student['name'], student['units']])\n\nwith open('flat.csv') as f:\n    row = list(csv.DictReader(f))[0]\nprint(type(row['units']).__name__)\nprint(row['units'][:20])\n",
        },
        {
          kind: 'prose',
          body: 'The nested structure went into the CSV as the text of its own repr, and came back as text that is no longer data. Nothing raised; the information is simply gone. That is what "the wrong format" looks like in practice.',
        },
        {
          kind: 'match',
          ask: 'Match each situation to the format that fits it.',
          pairs: [
            { left: '200,000 identical rows of (timestamp, sensor, value)', right: 'CSV: one uniform grid' },
            { left: 'A settings file where some options are lists', right: 'JSON: nested, nothing to flatten' },
            { left: 'Marks a colleague will open in a spreadsheet', right: 'CSV: opens directly as a grid' },
            { left: "A web service's reply, with records of varying shape", right: 'JSON: records are not uniform' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: '200,000 sensor readings of `(timestamp, sensor_id, value)` need loading into a spreadsheet by someone else. What goes wrong if you store them as JSON instead of CSV?',
          answer: 'The rows are identical in shape, so JSON would repeat all three key names 200,000 times for no benefit — a much larger file — and the person with the spreadsheet could not open it without writing a program first to flatten it. CSV fits exactly because the shape is uniform and the consumer is a spreadsheet; JSON earns its place only once the structure itself carries information, as it would for a settings file with optional, variously-shaped fields.',
        },
      ],
    },
  ],
};

export default lesson;
