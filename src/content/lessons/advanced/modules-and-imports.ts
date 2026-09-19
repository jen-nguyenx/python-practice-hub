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
          body: 'There is nothing special about a module. It is a `.py` file. When you write `import marks`, Python goes looking for `marks.py`, **runs it from top to bottom**, and hands you back a single object whose attributes are the names that file created.\n\nThat is worth seeing rather than believing. Here is a file written to disk, and then the two steps `import` performs on it, done by hand so that each one is visible.',
        },
        {
          kind: 'code',
          caption: 'A module file, and what importing it amounts to.',
          code: "source = '''PASS_MARK = 50\n\n\ndef mean(values):\n    return sum(values) / len(values)\n\n\ndef passed(mark):\n    return mark >= PASS_MARK\n'''\n\nwith open('marks_lib.py', 'w') as f:\n    f.write(source)\n\nprint(open('marks_lib.py').read())\n\n# Step one: run the file. Step two: keep the names it left behind.\nleft_behind = {'__name__': 'marks_lib'}\nexec(source, left_behind)\n\nprint(sorted(n for n in left_behind if not n.startswith('__')))\nprint(left_behind['PASS_MARK'])\nprint(left_behind['mean']([72, 65, 58]))\nprint(left_behind['passed'](49))\n",
        },
        {
          kind: 'prose',
          body: 'That is the whole of it. `import marks_lib` runs the file exactly once, collects everything it defined, and wraps the collection in a **module object** so you can reach the names with a dot instead of with square brackets.\n\nA real module, fetched with a real import, is that object.',
        },
        {
          kind: 'code',
          caption: 'A module from the standard library, examined.',
          code: "import statistics\n\nprint(type(statistics).__name__)\nprint(statistics.__name__)\nprint(statistics.mean([72, 65, 58]))\nprint(sorted(n for n in dir(statistics) if n.startswith('me')))\nprint(statistics.__file__.endswith('statistics.py'))\n",
        },
        {
          kind: 'prose',
          body: 'The import did not copy anything into your program: it produced one object, and every dotted name is an attribute lookup on it, exactly like `account.balance` was in the classes lesson. The last line asks the module where it came from, and the answer is a path to a file — somebody\'s `.py`, already written.',
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
            "sorted(n for n in dir(statistics) if n.startswith('me'))",
          ],
        },
        {
          kind: 'prose',
          body: 'The `is` line settles what `from` does: it does not make a copy, it binds a second name to the same function object.\n\nWhich to prefer? `import x` keeps the origin of every name visible, which matters most when you come back in six months and wonder where `mean` came from. `from x import y` reads better when the name is used many times and its origin is obvious. Aliasing with `as` is for long names and for the conventional short forms a community has settled on.',
        },
        {
          kind: 'code',
          caption: 'The two names are separate bindings, and this is how you can tell.',
          code: "import statistics\nfrom statistics import mean\n\nprint(mean is statistics.mean)\nprint(mean([1, 2, 3, 4]))\n\ndef mean(values):\n    return 'my own mean'\n\nprint(mean([1, 2, 3, 4]))\nprint(statistics.mean([1, 2, 3, 4]))\nprint(mean is statistics.mean)\n",
        },
        {
          kind: 'prose',
          body: 'Rebinding the local name left the module untouched, because `from statistics import mean` did not connect the two names — it pointed a second name at the same object, once, at import time.\n\nThe same thing happens in the other direction, and that is where it costs you: if a module reassigns one of its own names while the program runs — a counter, a configuration value, a cached result — a name you pulled out with `from` still refers to whatever it was at import time, while `statistics.mean`-style access looks it up fresh each time. For functions this rarely matters. For a value that changes, it matters a lot.',
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
      ],
    },
    {
      id: 'star-imports',
      title: 'Why `import *` is a bad bargain',
      blocks: [
        {
          kind: 'prose',
          body: '`from math import *` copies **every** public name out of the module and into yours, all at once. It saves a few characters and it buys a large problem: you no longer know what names exist in your own program.',
        },
        {
          kind: 'shell',
          caption: 'Count the names before and after, and watch a built-in change underneath you.',
          lines: [
            'pow(2, 10)',
            "before = set(dir()) | {'before'}",
            'from math import *',
            'pow(2, 10)',
            'len(set(dir()) - before)',
            "sorted(n for n in set(dir()) - before if len(n) <= 3)",
            'e',
            "'e' in before",
          ],
        },
        {
          kind: 'prose',
          body: 'One line added dozens of names. `pow` was a built-in that answers in whole numbers; after the star import it is the maths library\'s version, and the answer is the same number in a different type. Nothing warned you. If the rest of the program had used that result as a list index, the failure would appear far from the import that caused it.\n\nThe short names are the real hazard. A variable called `e` — for an exception, an edge, an element — is now competing with a mathematical constant.',
        },
        {
          kind: 'compare',
          caption: 'Your own function, and a star import written below it.',
          left: {
            label: 'Star import silently wins',
            bad: true,
            code: "def mean(values):\n    return 'my own careful mean of %d values' % len(values)\n\nfrom statistics import *\n\nprint(mean([1, 2, 3]))\n",
          },
          right: {
            label: 'Named import, no collision',
            code: "from statistics import median\n\ndef mean(values):\n    return 'my own careful mean of %d values' % len(values)\n\nprint(mean([1, 2, 3]))\nprint(median([1, 2, 3]))\n",
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'In the left-hand version the call did not reach the function defined three lines above it. Move the star import to the top of the file instead, above the `def`, and the same program behaves differently. Explain both outcomes with one rule, and say why that makes star imports hard to debug.',
          answer: 'The rule is that both a `def` and an import are just assignments to a name, and the last one to run wins. With the star import below, `mean` is rebound to the library function and your definition is lost. With it above, your `def` runs second and rebinds `mean` back to yours. Neither order raises anything, and nothing appears at the call site to say which one is in force — the deciding factor is the line order of two statements that do not mention each other. That is why the fix is not "put star imports at the top" but "do not use them": with `from statistics import median` you would have seen the collision immediately, because the name you imported is written down.',
        },
      ],
    },
    {
      id: 'name-main',
      title: 'The `__name__` guard',
      blocks: [
        {
          kind: 'prose',
          body: 'Importing a module **runs it**. If the file has a print at the top level, or a demo, or a loop over a test file, that happens on import, in someone else\'s program, when they only wanted one function.\n\nPython gives every module a variable called `__name__`. It holds the module\'s own name when the file was imported, and the text `__main__` when the file is the program being run. One `if` turns that into the standard arrangement: a file that is both a library and a runnable program.',
        },
        {
          kind: 'code',
          caption: 'The same file, imported and then run as the main program.',
          code: "source = '''def mean(values):\n    return sum(values) / len(values)\n\nprint('the body of this file just ran, and __name__ is', __name__)\n\nif __name__ == '__main__':\n    print('self-test:', mean([1, 2, 3]))\n'''\nwith open('tools_lib.py', 'w') as f:\n    f.write(source)\n\nprint('--- what another file sees when it imports tools_lib ---')\nimported = {'__name__': 'tools_lib'}\nexec(source, imported)\nprint('and the importer can now call:', imported['mean']([2, 4]))\n\nprint('--- what happens when tools_lib.py is the program you run ---')\nexec(source, {'__name__': '__main__'})\n",
        },
        {
          kind: 'prose',
          body: 'Both times the file\'s text ran, and it reported a different `__name__` each time — which is the only difference between being imported and being run, and in a real program Python sets it for you. The guarded line happened once, on the pass where the file was the program.\n\nSo the shape of a file that is meant to be both is: imports at the top, then definitions, then at the very bottom the guard with the code that actually starts things.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What goes under the guard',
          body: 'Anything with an effect: reading a file, printing a report, asking for input, starting a loop. Definitions of functions, classes and constants stay outside it, because an importer wants those.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A classmate\'s `analysis.py` ends with three lines that read a CSV, compute a summary and print it — no guard. You write `from analysis import summarise` in your own program. What happens, and in what order relative to your own first line of code?',
          answer: 'Their three lines run first, before any of your code, because the import statement itself runs the whole file top to bottom and only then binds the name `summarise`. So their file is read, their summary is printed, and any error in their path handling raises inside your import statement — which will point at your import line as the place things went wrong. Wrapping their three lines in `if __name__ == "__main__":` fixes it without changing anything else, which is exactly why the guard exists.',
        },
      ],
    },
    {
      id: 'imported-once',
      title: 'A module runs once, no matter how often you import it',
      blocks: [
        {
          kind: 'prose',
          body: 'After the first import, Python keeps the module object in a cache. Every later import of the same name finds it there and skips the file entirely, so the body runs exactly once per program.',
        },
        {
          kind: 'code',
          caption: 'The cache, modelled. Python keeps one of these dictionaries and calls it `sys.modules`.',
          code: "already_imported = {}\n\ndef import_by_hand(name, source):\n    if name in already_imported:\n        print(' ', name, 'is already imported, so nothing runs')\n        return already_imported[name]\n    print(' ', name, 'is new, so the file runs')\n    left_behind = {'__name__': name}\n    exec(source, left_behind)\n    already_imported[name] = left_behind\n    return left_behind\n\nsource = \"print('    the body of greet.py is running')\\nMSG = 'hello'\\n\"\n\nprint('first import:')\nfirst = import_by_hand('greet', source)\nprint('second import:')\nsecond = import_by_hand('greet', source)\nprint('third import:')\nthird = import_by_hand('greet', source)\n\nprint(first is second is third, first['MSG'])\n",
        },
        {
          kind: 'prose',
          body: 'The real thing behaves the same way, and you can check that the second import hands back the very same object rather than a new one.',
        },
        {
          kind: 'code',
          caption: 'Two imports of a real module, compared by identity.',
          code: "import json\nimport json as json_again\nfrom json import dumps\n\nprint(json is json_again)\nprint(dumps is json.dumps)\n\nimport statistics\nprint(json is statistics)\n",
        },
        {
          kind: 'prose',
          body: 'This is why importing the same module from ten different files of your program costs nothing after the first one, and why you should put your imports at the top of each file without worrying about the expense.\n\nIt is also why editing a module while a program is running does not change the running program, and why two modules importing each other in a circle is a real trap: one of them is part-finished at the moment the other looks at it. If you hit that, the fix is almost always to move the shared thing into a third module that both import.',
        },
      ],
    },
    {
      id: 'stdlib',
      title: 'A tour of what already exists',
      blocks: [
        {
          kind: 'prose',
          body: 'Python ships with a large library of modules, already installed, already tested by everyone. The main skill is knowing enough of the names to recognise when a problem is somebody else\'s solved problem.',
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
            'datetime.date(2024, 3, 1) - datetime.date(2024, 2, 1)',
            '(datetime.date(2024, 3, 1) - datetime.date(2024, 2, 1)).days',
            'collections.defaultdict(list)[999]',
          ],
        },
        {
          kind: 'table',
          caption: 'The ones worth recognising by name.',
          head: ['Module', 'What it is for', 'A name from it'],
          rows: [
            ['math', 'Square roots, logs, constants, ceiling and floor', 'math.sqrt, math.inf'],
            ['random', 'Choices, shuffles, sampling. Seed it to make runs repeatable', 'random.choice, random.seed'],
            ['statistics', 'Mean, median, mode, standard deviation', 'statistics.mean'],
            ['collections', 'Counter, defaultdict, deque, namedtuple', 'collections.Counter'],
            ['itertools', 'Combinations, pairs, running totals, grouping', 'itertools.accumulate'],
            ['functools', 'Caching, reduce, filling in comparison methods', 'functools.cache'],
            ['json', 'Reading and writing JSON text', 'json.dumps'],
            ['csv', 'Reading and writing comma-separated files properly', 'csv.DictReader'],
            ['re', 'Regular expressions: patterns over text', 're.findall'],
            ['datetime', 'Dates, times and the arithmetic between them', 'datetime.date'],
            ['textwrap', 'Wrapping, shortening and re-indenting text', 'textwrap.shorten'],
            ['unittest', 'Writing tests that report themselves', 'unittest.TestCase'],
          ],
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In CITS1401',
          body: 'Project specifications in this unit usually forbid importing anything at all, so everything here is for your own programs rather than for the projects. Knowing that `collections.Counter` exists is still worth something in an exam: it tells you what the hand-written dictionary-counting loop is meant to produce.',
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
          body: 'Python searches the folder your program is in before it searches its own library. A file of yours called `random.py`, `json.py`, `csv.py` or `statistics.py` is found first, so `import random` gets your file, and every error that follows points somewhere confusing — often inside a library that imported the real module and got yours instead. The same applies to a stray `math.py` you wrote once for practice and forgot about.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are splitting a 400-line program into files. Someone suggests `helpers.py` holding everything that is not the main flow. What is wrong with that as a plan, and what would you use instead as the test for where a function belongs?',
          answer: '`helpers.py` is named after where the code is not, rather than what it does, so nothing ever tells you whether a new function belongs in it — and it grows until it is the 400-line file you were splitting up. The useful test is the import line the other file will have to write: if `from marks import grade_for` reads like a sentence about the problem, the module has a subject. If the only honest name is "stuff the main file did not want", the split is not carrying real weight, and you would do better to keep one file until a second subject actually appears.',
        },
      ],
    },
  ],
};

export default lesson;
