// Advanced: what a module is, the import forms, the name-main guard, and the standard library.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'modules-and-imports',
  title: 'Modules and imports',
  summary: 'Splitting a program across files, and borrowing the thousands of files Python ships with',
  track: 'advanced',
  order: 11,
  minutes: 22,
  outcomes: [
    'Say what a module is and what `import` actually does',
    'Choose between `import x` and `from x import y`, and avoid `import *`',
    'Explain what `if __name__ == "__main__":` is for',
    'Name a dozen standard-library modules and what each is for',
  ],
  sections: [
    {
      id: 'what-a-module-is',
      title: 'A module is a file',
      blocks: [
        {
          kind: 'prose',
          body: 'There is nothing special about a module. It is a `.py` file. When you write `import marks`, Python goes looking for `marks.py`, **runs it from top to bottom**, and hands you back a single object whose attributes are the names that file created.\n\nHere is that idea, done by hand with `exec` so each step is visible: run the source, then keep the names it left behind.',
        },
        {
          kind: 'code',
          caption: 'A module\'s text, and what importing it amounts to.',
          code: "source = '''PASS_MARK = 50\n\n\ndef mean(values):\n    return sum(values) / len(values)\n\n\ndef passed(mark):\n    return mark >= PASS_MARK\n'''\n\n# Step one: run the text. Step two: keep the names it left behind.\nleft_behind = {'__name__': 'marks_lib'}\nexec(source, left_behind)\n\nprint(sorted(n for n in left_behind if not n.startswith('__')))\nprint(left_behind['mean']([72, 65, 58]))\nprint(left_behind['passed'](49))\n",
        },
        {
          kind: 'code',
          caption: 'A real module, fetched with a real import, is exactly that object.',
          code: "import statistics\n\nprint(type(statistics).__name__)\nprint(statistics.mean([72, 65, 58]))\nprint(statistics.__file__.endswith('statistics.py'))\n",
        },
        {
          kind: 'quiz',
          prompt: 'A dotted name like `statistics.mean` — what is actually happening when Python evaluates it?',
          options: [
            {
              text: 'An attribute lookup on the module object, exactly like `account.balance` on any other object',
              correct: true,
              why: 'Import produced one object; every dotted name after it is an ordinary attribute lookup, no different from reading an attribute off any instance.',
            },
            { text: 'A copy of the function is pasted into your file at that point', why: 'Nothing is copied or pasted. The module object already holds the function; the dot reaches into it.' },
            { text: 'Python re-reads statistics.py every time the dotted name is used', why: 'The file was run once, at import time. Later lookups reach into the already-built module object, not the file again.' },
            { text: 'It only works for functions, not for other kinds of value', why: '`statistics.__file__` on the line above is a string, reached the same way. Any name the module defines is reachable by dot, whatever it holds.' },
          ],
        },
      ],
    },
    {
      id: 'import-forms',
      title: '`import x` against `from x import y`',
      blocks: [
        {
          kind: 'prose',
          body: 'Both forms run the module. They differ in **what name lands in your program**: the module itself, or the one thing you asked for.',
        },
        {
          kind: 'shell',
          caption: 'The same function reached four ways.',
          lines: [
            'import statistics',
            'statistics.mean([1, 2, 3, 4])',
            'from statistics import mean',
            'mean([1, 2, 3, 4])',
            'mean is statistics.mean',
            'import statistics as st',
            'st.median([3, 1, 2])',
            'from statistics import median as middle',
            'middle([3, 1, 2])',
          ],
        },
        {
          kind: 'prose',
          body: 'The `is` line settles what `from` does: it does not copy, it binds a second name to the same function object. If a module later reassigns one of its own names, a name pulled out with `from` still refers to what it was at import time — `import x` and dotted access look it up fresh every time.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'what-lands-in-your-program',
            title: 'What one import statement actually adds',
            intro: 'Choose an import style and see exactly which names it adds to your program — not what you assume it adds.',
            template: "before = set(dir())\n⟦style⟧\nafter = sorted(n for n in set(dir()) - before if n != 'before')\nprint(after)\nprint('statistics' in dir())\nprint('mean' in dir())\n",
            knobs: [
              {
                id: 'style',
                label: 'how you import statistics',
                choices: [
                  { value: 'import statistics', caption: 'import statistics' },
                  { value: 'from statistics import mean', caption: 'from statistics import mean' },
                  { value: 'from statistics import *', caption: 'from statistics import *' },
                ],
              },
            ],
            notes: {
              '0': 'Exactly one new name: `statistics` itself. `mean` does not exist on its own — it is only reachable as `statistics.mean`, which is why the last line answers `False`.',
              '1': 'Exactly one new name again, but a different one: `mean`. `statistics` itself was never bound, so `statistics.mean(...)` would fail here even though `mean(...)` works.',
              '2': 'Dozens of names arrive at once, and you cannot tell from this line alone which ones. `mean` is among them, and so is everything else the module considered public — including names that might already mean something else in your file.',
            },
            takeaway: 'An import statement is an assignment, and what it assigns depends entirely on its form: one module name, one function name, or every public name the module has. `import *` is the only one of the three where you cannot read the line and know what you got.',
          },
        },
        {
          kind: 'quiz',
          prompt: '`from x import *` is discouraged. What specifically does it make unknowable, just by reading the import line?',
          options: [
            {
              text: 'Which names now exist in your file, and whether any of them collide with names you already had',
              correct: true,
              why: 'The line does not list what it brings in, so a reader — and you, in six months — cannot tell which of the module\'s public names just landed, or whether one silently replaced something you defined yourself.',
            },
            { text: 'Whether the module being imported actually exists', why: 'That fails immediately and loudly with `ModuleNotFoundError` if the module is missing — `import *` does not make existence uncertain.' },
            { text: 'Whether the import happens at the top of the file or partway through', why: 'That is visible directly from where the line sits in the file; the star does not hide it.' },
            { text: 'The name of the module you imported from', why: 'The module name is written right there in the statement — `from x import *` still tells you `x` is the source.' },
          ],
        },
      ],
    },
    {
      id: 'star-imports',
      title: 'Why `import *` is a bad bargain',
      blocks: [
        {
          kind: 'shell',
          caption: 'Count the names before and after, and watch a built-in change underneath you.',
          lines: [
            'pow(2, 10)',
            "before = set(dir()) | {'before'}",
            'from math import *',
            'pow(2, 10)',
            'len(set(dir()) - before)',
            'e',
          ],
        },
        {
          kind: 'prose',
          body: 'One line added dozens of names. `pow` was a built-in that answers in whole numbers; after the star import it is the maths library\'s version, and the answer is the same number in a different type — nothing warned you. Short names are the real hazard: a variable called `e` for an exception or an edge is now competing with a mathematical constant.',
        },
        {
          kind: 'predict',
          ask: 'Your own `mean` is defined, then a star import of `statistics` runs below it. What does the call print?',
          code: "def mean(values):\n    return 'my own careful mean of %d values' % len(values)\n\nfrom statistics import *\n\nprint(mean([1, 2, 3]))\n",
          choices: [
            'my own careful mean of 3 values',
            '2',
            '2.0',
            "TypeError: mean() missing 1 required positional argument",
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Moving the same star import to the top of the file, above the `def`, makes the program behave differently. Explain both outcomes with one rule.',
          answer: 'A `def` and an import are both just assignments to a name, and the last one to run wins. With the star import below the `def`, `mean` is rebound to the library function afterwards, so your definition is lost. With it above, your `def` runs second and rebinds `mean` back to yours. Neither order raises anything, and nothing at the call site says which is in force — which is why the fix is not "put star imports at the top" but "name what you import": `from statistics import median` would make any collision visible on the line itself.',
        },
      ],
    },
    {
      id: 'name-main',
      title: 'The `__name__` guard',
      blocks: [
        {
          kind: 'prose',
          body: 'Importing a module **runs it**. If the file has a print at the top level, or a demo, that happens on import, in someone else\'s program, when they only wanted one function. Every module has a variable `__name__`: its own name when imported, and `__main__` when the file is the program being run.',
        },
        {
          kind: 'code',
          caption: 'The same source, run as an import and then as the main program.',
          code: "source = '''def mean(values):\n    return sum(values) / len(values)\n\nprint('the body just ran, and __name__ is', __name__)\n\nif __name__ == '__main__':\n    print('self-test:', mean([1, 2, 3]))\n'''\n\nprint('--- imported ---')\nimported = {'__name__': 'tools_lib'}\nexec(source, imported)\n\nprint('--- run as the main program ---')\nexec(source, {'__name__': '__main__'})\n",
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What goes under the guard',
          body: 'Anything with an effect: reading a file, printing a report, asking for input, starting a loop. Definitions of functions, classes and constants stay outside it, because an importer wants those.',
        },
        {
          kind: 'quiz',
          prompt: 'A classmate\'s `analysis.py` ends with three unguarded lines that read a CSV and print a summary. You write `from analysis import summarise` in your own program. What happens?',
          options: [
            {
              text: 'Their three lines run first, before any of your own code, and any error in them points at your import line',
              correct: true,
              why: 'Importing runs the whole file top to bottom before binding any name out of it, so their unguarded code executes as a side effect of your import statement, and a failure there surfaces at your import line.',
            },
            { text: 'Python skips the three lines because you only imported one function', why: 'Import has no way to run only part of a file — the whole module body executes first, and only afterwards is `summarise` bound and handed to you.' },
            { text: 'The three lines run, but only after your program finishes', why: 'They run immediately, at the moment the import statement executes, not deferred to any later point.' },
            { text: 'Nothing happens until `summarise` is actually called', why: 'Defining a function does not run its body early, but the three lines in question are not inside a function — they are at the top level of the file, which runs immediately on import.' },
          ],
        },
      ],
    },
    {
      id: 'imported-once',
      title: 'A module runs once, no matter how often you import it',
      blocks: [
        {
          kind: 'prose',
          body: 'After the first import, Python keeps the module object in a cache (`sys.modules`). Every later import of the same name finds it there and skips the file entirely, so the body runs exactly once per program — which is why importing the same module from ten files costs nothing after the first.',
        },
        {
          kind: 'code',
          caption: 'The cache, modelled by hand.',
          code: "already_imported = {}\n\ndef import_by_hand(name, source):\n    if name in already_imported:\n        print(' ', name, 'is already imported, so nothing runs')\n        return already_imported[name]\n    print(' ', name, 'is new, so the file runs')\n    left_behind = {'__name__': name}\n    exec(source, left_behind)\n    already_imported[name] = left_behind\n    return left_behind\n\nsource = \"print('    the body of greet.py is running')\\nMSG = 'hello'\\n\"\n\nprint('first import:')\nfirst = import_by_hand('greet', source)\nprint('second import:')\nsecond = import_by_hand('greet', source)\n\nprint(first is second, first['MSG'])\n",
        },
        {
          kind: 'code',
          caption: 'The real thing, checked by identity.',
          code: "import json\nimport json as json_again\nfrom json import dumps\n\nprint(json is json_again)\nprint(dumps is json.dumps)\n",
        },
        {
          kind: 'prose',
          body: 'This is also why editing a module while a program runs does not change the running program, and why two modules importing each other in a circle is a real trap — each is part-finished at the moment the other looks at it. The fix is almost always to move the shared thing into a third module that both import.',
        },
      ],
    },
    {
      id: 'stdlib',
      title: 'A tour of what already exists',
      blocks: [
        {
          kind: 'prose',
          body: 'Python ships with a large library of modules, already installed and tested. The main skill is knowing enough of the names to recognise when a problem is somebody else\'s solved problem.',
        },
        {
          kind: 'shell',
          caption: 'Four modules, one line each.',
          lines: [
            'import collections, itertools, statistics, datetime',
            "collections.Counter('mississippi').most_common(2)",
            'list(itertools.pairwise([1, 4, 9, 16]))',
            "list(itertools.combinations('abc', 2))",
            'statistics.median([3, 1, 2]), statistics.mode([1, 1, 2])',
            '(datetime.date(2024, 3, 1) - datetime.date(2024, 2, 1)).days',
          ],
        },
        {
          kind: 'match',
          ask: 'Match each stdlib module to the job it does.',
          pairs: [
            { left: 'statistics', right: 'Mean, median, mode, standard deviation' },
            { left: 'collections', right: 'Counter, defaultdict, deque, namedtuple' },
            { left: 'itertools', right: 'Combinations, pairs, running totals, grouping' },
            { left: 'json', right: 'Reading and writing JSON text' },
            { left: 'csv', right: 'Reading and writing comma-separated files properly' },
            { left: 're', right: 'Regular expressions: patterns over text' },
          ],
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In CITS1401',
          body: 'Project specifications in this unit usually forbid importing anything at all, so everything here is for your own programs rather than for the projects. Knowing that `collections.Counter` exists is still worth something in an exam: it tells you what a hand-written dictionary-counting loop is meant to produce.',
        },
      ],
    },
    {
      id: 'habits',
      title: 'Habits that save you',
      blocks: [
        {
          kind: 'steps',
          title: 'Working with imports',
          items: [
            'Put every import at the top of the file, one per line, before any other code.',
            'Import the module (`import json`) rather than a crowd of names, unless one name is used everywhere.',
            'Never `from x import *` in a file anyone else will read, including future you.',
            'Put anything that *does* something under `if __name__ == "__main__":`.',
            'Name your own files so they cannot collide with a standard-library module.',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not call your file `random.py`',
          body: 'Python searches the folder your program is in before it searches its own library. A file of yours called `random.py`, `json.py`, `csv.py` or `statistics.py` is found first, so `import random` gets your file, and every error that follows points somewhere confusing.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are splitting a 400-line program into files. Someone suggests `helpers.py` holding everything that is not the main flow. What is the test for where a function actually belongs?',
          answer: 'The useful test is the import line the other file will have to write: if `from marks import grade_for` reads like a sentence about the problem, the module has a subject. `helpers.py` is named after where the code is not, rather than what it does, so nothing tells you whether a new function belongs in it, and it grows until it is the 400-line file being split up. If the only honest name is "stuff the main file did not want", the split is not carrying real weight yet.',
        },
      ],
    },
  ],
};

export default lesson;
