// Advanced: taking a structure apart on the left of an assignment, and the star in a call signature.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'unpacking-and-args',
  title: 'Unpacking and star arguments',
  summary: 'Pulling a structure apart into names, and writing functions that take however many arguments arrive',
  track: 'advanced',
  order: 4,
  minutes: 24,
  outcomes: [
    'Unpack tuples, lists and nested structures into named variables',
    'Use a starred name to take "all the rest" on either side of an assignment',
    'Write and call functions using `*args` and `**kwargs`',
    'Make a parameter keyword-only and say why that helps the caller',
  ],
  sections: [
    {
      id: 'tuple-unpacking',
      title: 'Names on the left',
      blocks: [
        {
          kind: 'prose',
          body: 'Assignment does not have to be one name to one value: put several names on the left, separated by commas, and Python takes the thing on the right apart to fill them — not just for tuples, but for anything walkable: lists, strings, dict pairs, whatever a function returns.',
        },
        {
          kind: 'shell',
          lines: [
            'point = (3, 7)',
            'x, y = point',
            'x',
            'y',
            'a, b, c = [1, 2, 3]',
            'first, second = "hi"',
            'name, score = ("ana", 71)',
            '(day, month), year = (14, 3), 2026',
            'day, month, year',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Counts must match exactly',
          body: 'Brackets on the left describe the shape of the right, nested included — see `(day, month), year = (14, 3), 2026` above. The count must match exactly: too few or too many names raises a `ValueError`, and the message says which way round the problem is, as the two code blocks below show.',
        },
        {
          kind: 'code',
          caption: 'Both of these raise on purpose. Read which one says "too many" and which says "not enough".',
          code: 'a, b = (1, 2, 3)\n',
        },
        {
          kind: 'code',
          code: 'a, b, c = (1, 2)\n',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'unpack-count',
            title: 'The count has to match exactly',
            intro: 'The pattern always wants three names filled. Drag **values sliced off the list** and watch which counts Python accepts.',
            template: 'values = [10, 20, 30, 40, 50][:⟦n⟧]\na, b, c = values\nprint(a, b, c)\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'values sliced off the list', min: 1, max: 5, start: 3 },
            ],
            probes: {
              counts: '[⟦n⟧, 3]',
              'count-labels': "['values given', 'names to fill']",
            },
            visual: {
              kind: 'bars',
              values: 'counts',
              labels: 'count-labels',
              caption: 'How many values arrived against how many names the pattern has.',
            },
            notes: {
              '0': 'One value for three names. `a, b, c = [10]` cannot find enough values, and the message says exactly that: not enough values to unpack.',
              '1': 'Two values, three names. Still short by one, and Python refuses rather than leaving one name unset.',
              '2': 'Exactly three values for three names: the only setting here that runs to completion. Count both sides before you write the line.',
              '3': 'Four values, three names. Now there is one value with nowhere to go, and unpacking refuses just as firmly as it did when there were too few.',
              '4': 'Five values, three names — the gap is wider, but the error is the same shape as it was with four.',
            },
            takeaway: 'Plain unpacking is not a best-effort operation. The number of names on the left has to match the number of values on the right exactly, or Python raises rather than guessing which name to leave empty or which value to drop. A starred name is the only way to accept "at least this many" — without one, three names always means exactly three values.',
          },
        },
        {
          kind: 'code',
          caption: 'A function returning two things. `return a, b` needs no brackets — it is the comma that makes a tuple — and receiving it into one name keeps the whole tuple; into two, it unpacks.',
          code: 'def split_name(full):\n    parts = full.split(" ")\n    return parts[0], parts[-1]\n\nboth = split_name("Ada Lovelace")\nprint(both, type(both))\n\nfirst, last = split_name("Ada Lovelace")\nprint(first)\nprint(last)\n',
        },
        {
          kind: 'shell',
          caption: 'The right side is worked out completely before anything on the left is assigned, so this swap needs no temporary variable.',
          lines: [
            'a, b = "left", "right"',
            'a, b = b, a',
            '(a, b)',
            'nums = [1, 2, 3]',
            'nums[0], nums[2] = nums[2], nums[0]',
            'nums',
          ],
        },
      ],
    },
    {
      id: 'starred',
      title: 'Taking the rest',
      blocks: [
        {
          kind: 'prose',
          body: 'A star in front of one name says "put everything left over in here, as a list". Exactly one name may be starred, and it can be anywhere in the row.',
        },
        {
          kind: 'shell',
          lines: [
            'first, *rest = [10, 20, 30, 40]',
            '(first, rest)',
            '*most, last = [10, 20, 30, 40]',
            '(most, last)',
            'head, *middle, tail = [1, 2, 3, 4, 5]',
            '(head, middle, tail)',
            'only, *nothing = [7]',
            '(only, nothing)',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The starred name is always a list, even empty',
          body: 'Even when nothing is left over, the starred name still gets an empty list rather than raising — which is why `first, *rest = items` safely splits any list of at least one item. When a value is not wanted, the convention is to unpack it into `_`; nothing enforces this, but readers take it to mean "ignored on purpose", as in the shell block below.',
        },
        {
          kind: 'shell',
          lines: [
            'row = ("ana", 71, "PASS", "2026-03-14")',
            'name, score, *_ = row',
            '(name, score)',
            'name, *_, when = row',
            '(name, when)',
            'pairs = [("ana", 71), ("bo", 88)]',
            '[n for n, _ in pairs]',
          ],
        },
        {
          kind: 'prose',
          body: 'Unpacking in a `for` loop is the same feature, applied once per item — and it is where most people meet it.',
        },
        {
          kind: 'compare',
          caption: 'The same rows, read two ways. One of these has a mistake in it, and it does not raise.',
          left: {
            label: 'Indexing every time',
            code: 'rows = [("ana", 71, "PASS"), ("bo", 48, "FAIL")]\nfor row in rows:\n    print(row[0], "scored", row[2], "and", row[1])\n',
            bad: true,
          },
          right: {
            label: 'Unpacking in the loop header',
            code: 'rows = [("ana", 71, "PASS"), ("bo", 48, "FAIL")]\nfor name, score, outcome in rows:\n    print(f"{name} scored {score} and {outcome.lower()}")\n',
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Name the columns, do not count them',
          body: 'The left version above has the last two columns swapped and ran perfectly happily — nothing in `row[1]` or `row[2]` says what it holds. Naming the columns makes a swap visible on the line itself, and it fails loudly on a row with the wrong number of fields instead of quietly reading the wrong one. The same applies to `enumerate`\'s `(index, item)` and `dict.items()`\'s `(key, value)` pairs, both almost always unpacked.',
        },
        {
          kind: 'code',
          caption: 'The three loops worth having in your fingers — the last is the nested case: enumerate hands over a pair whose second item is itself a pair, and the brackets on the left describe that shape.',
          code: 'names = ["ana", "bo", "cy"]\nscores = [71, 88, 65]\nprices = {"tea": 3, "cocoa": 5}\n\nfor i, name in enumerate(names, start=1):\n    print(i, name)\n\nfor name, score in zip(names, scores):\n    print(name, score)\n\nfor item, price in prices.items():\n    print(item, price)\n\nfor i, (name, score) in enumerate(zip(names, scores)):\n    print(i, name, score)\n',
        },
        {
          kind: 'quiz',
          prompt: 'A CSV line arrives as `"ana,71,83,90,PASS"`, where the middle is any number of scores. Which line correctly gives you the name, the outcome, and the scores as a list of strings?',
          options: [
            {
              text: 'name, *scores, outcome = line.split(",")',
              correct: true,
              why: 'The starred name collects everything between the first and last fields, however many scores there are — it does not care about the count.',
            },
            {
              text: 'name, scores, outcome = line.split(",")',
              why: 'This demands exactly three fields. With more than three, Python raises a ValueError for too many values to unpack.',
            },
            {
              text: 'name, *outcome, scores = line.split(",")',
              why: 'This puts everything except the first and last field into a variable named outcome, and the real outcome — PASS — ends up alone in scores. The names are swapped from what was wanted, even though it runs without error.',
            },
            {
              text: '*name, scores, outcome = line.split(",")',
              why: 'This makes name a list containing everything except the last two fields — including the real name and all but one score — which is not what was asked for.',
            },
          ],
        },
      ],
    },
    {
      id: 'star-in-calls',
      title: 'Stars in a call',
      blocks: [
        {
          kind: 'prose',
          body: 'The star does the opposite job in a call: on the left of an assignment it collects; in a call it spreads. `f(*items)` means *use each item of items as a separate argument*; `f(**options)` means *use each key and value as a keyword argument*.',
        },
        {
          kind: 'shell',
          lines: [
            'def area(width, height): return width * height',
            'size = (3, 4)',
            'area(*size)',
            'area(size)',
            'settings = {"width": 5, "height": 2}',
            'area(**settings)',
            'nums = [3, 1, 2]',
            'max(nums)',
            'max(*nums)',
          ],
        },
        {
          kind: 'predict',
          ask: 'Predict what this prints.',
          code: 'def describe(name, age, city):\n    return f"{name} ({age}) from {city}"\n\ninfo = ("Ana", 24, "Perth")\nprint(describe(*info))\n',
          choices: [
            'Ana (24) from Perth',
            "('Ana', 24, 'Perth')",
            'Ana 24 Perth',
            'None',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Two different max calls',
          body: 'Without the star, the tuple arrives as one argument and the second parameter has nothing to fill it — that is the `area(size)` line above failing. `max(nums)` asks for the largest item **in** the list; `max(*nums)` passes three separate arguments to max\'s other form, which compares whatever it is given directly — they agree here, and stop agreeing the moment the list has one item, or none.',
        },
        {
          kind: 'code',
          caption: 'Where the two forms of `max` part company. The last line raises on purpose.',
          code: 'nums = [3, 1, 2]\nprint(max(nums), max(*nums))\n\nnone_at_all = []\nprint(max(none_at_all, default="empty"))\n\none = [7]\nprint(max(one))\nprint(max(*one))\n',
        },
        {
          kind: 'prose',
          body: 'With one item, `max(one)` still answers, but `max(*one)` hands a single number to something meant to compare several. With none, the starred form passes no arguments at all — `default=` is how you tell the list form what an empty collection should give back.',
        },
        {
          kind: 'shell',
          caption: 'Stars also spread into new collections — the modern way to join lists and merge dicts without changing either original.',
          lines: [
            'front = [1, 2]',
            'back = [3, 4]',
            '[*front, *back]',
            '[0, *front, 99]',
            'defaults = {"colour": "red", "size": 1}',
            'chosen = {"size": 3}',
            '{**defaults, **chosen}',
            '{**chosen, **defaults}',
            'defaults',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Later key wins',
          body: 'The two merge lines above are the same two dicts in the other order, and they do not match — a later key wins, so the dict you want to take priority goes **last**. The final line confirms neither original was touched.',
        },
      ],
    },
    {
      id: 'args-kwargs',
      title: 'Functions that take any number',
      blocks: [
        {
          kind: 'prose',
          body: 'The same two stars appear in a `def`: `*args` gathers every extra positional argument into a tuple, and `**kwargs` gathers every extra keyword argument into a dict. The names are a convention, not a rule — the stars are what matters.',
        },
        {
          kind: 'code',
          caption: 'Watch what each call puts in each of the two.',
          code: 'def inspect(*args, **kwargs):\n    print("args  :", args, type(args).__name__)\n    print("kwargs:", kwargs, type(kwargs).__name__)\n    print("-")\n\ninspect(1, 2, 3)\ninspect(mode="fast", tries=2)\ninspect(1, 2, mode="fast")\ninspect()\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Order in a def',
          body: '`args` is always a tuple and `kwargs` always a dict, even when empty, so a function using them never has to check whether anything arrived. Parameters come in a fixed order: the ordinary ones, then `*args`, then any keyword-only ones, then `**kwargs` — a call fills the ordinary ones first, and everything left over goes into the stars.',
        },
        {
          kind: 'code',
          caption: 'Named parameters first, and the stars taking whatever is left.',
          code: 'def order(item, *extras, **details):\n    print("item   :", item)\n    print("extras :", extras)\n    print("details:", details)\n    print("-")\n\norder("coffee")\norder("coffee", "milk", "sugar")\norder("coffee", "milk", size="large", hot=True)\n',
        },
        {
          kind: 'prose',
          body: 'The single most common real use is passing arguments through one function to another without listing them: a wrapper taking `*args, **kwargs` and handing them straight on works no matter what the function underneath expects, which is what makes decorators possible.',
        },
        {
          kind: 'code',
          caption: 'One wrapper, two functions with completely different signatures.',
          code: 'def announced(fn):\n    def wrapper(*args, **kwargs):\n        print(f"calling {fn.__name__} with {args} {kwargs}")\n        return fn(*args, **kwargs)\n    return wrapper\n\ndef area(width, height):\n    return width * height\n\ndef greet(name, greeting="hello", loudly=False):\n    line = f"{greeting}, {name}"\n    return line.upper() if loudly else line\n\nannounced_area = announced(area)\nannounced_greet = announced(greet)\n\nprint(announced_area(3, 4))\nprint(announced_greet("ana", loudly=True))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Collect in, spread out',
          body: 'Inside `wrapper`, the stars collect; on the call to `fn`, they spread. That pair is the shape to recognise, and it turns up in every piece of code that wraps something else.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: '*args is not a free pass',
          body: 'A function whose signature is `*args, **kwargs` tells the caller nothing about what it accepts, and no editor can help them. Use it where the arguments genuinely pass through to something else. When there are three known parameters, write the three names.',
        },
      ],
    },
    {
      id: 'keyword-only',
      title: 'Keyword-only parameters',
      blocks: [
        {
          kind: 'prose',
          body: 'A bare `*` in a parameter list has no name to collect into — that is the point: everything after it can only be passed by keyword, so a caller cannot write a line nobody can read. Compare `connect("db", 30, True, False)` with `connect("db", timeout=30, retry=True, verbose=False)`.',
        },
        {
          kind: 'code',
          caption: 'The last call raises on purpose; read what the message counts.',
          code: 'def connect(host, *, timeout=5, retry=False):\n    return f"{host} timeout={timeout} retry={retry}"\n\nprint(connect("db"))\nprint(connect("db", timeout=30))\nprint(connect("db", retry=True, timeout=1))\nprint(connect("db", 30))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Use it for flags and settings',
          body: 'The error above counts positional arguments — the function accepts exactly one, and everything after the `*` is off limits positionally. Keyword-only parameters are worth using whenever a parameter is a flag, a setting, or anything a reader could not guess from its position: `sorted(items, key=..., reverse=...)` cannot be called as `sorted(items, f, True)`.',
        },
        {
          kind: 'shell',
          caption: 'Proving it on a function you did not write.',
          lines: [
            'words = ["bb", "a", "ccc"]',
            'sorted(words, key=len)',
            'sorted(words, key=len, reverse=True)',
            'sorted(words, len)',
          ],
        },
        {
          kind: 'prose',
          body: 'Parameters after a `*args` are keyword-only too, without needing the bare star, because `*args` has already swallowed every remaining positional argument.',
        },
        {
          kind: 'code',
          caption: 'A keyword-only parameter sitting after *args.',
          code: 'def join_all(*parts, separator=", ", upper=False):\n    line = separator.join(parts)\n    return line.upper() if upper else line\n\nprint(join_all("a", "b", "c"))\nprint(join_all("a", "b", "c", separator=" - "))\nprint(join_all("a", "b", "c", separator=" - ", upper=True))\nprint(join_all())\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Why the star is unavoidable here',
          body: 'A plain `def join_all(parts, separator)` would force every caller to build a list first, and `def join_all(*parts, separator)` without a default would be impossible to satisfy positionally — which is exactly why Python makes it keyword-only.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You maintain `def report(rows, verbose, limit)`. Callers write `report(rows, True, 10)` all over the codebase. You want to add a `format` option and make the two existing flags keyword-only. What breaks, and how would you make the change without breaking every caller at once?',
          answer: 'Adding the bare star — `def report(rows, *, verbose=False, limit=None, format="text")` — breaks every existing call immediately, because `report(rows, True, 10)` now passes two positional arguments to a function that accepts one.\n\nThe unbreaking way is to do it in two steps. First add the new parameter as keyword-only at the end and leave the old ones positional, so nothing changes for existing callers. Then update the call sites to use keywords, which is a mechanical change that leaves the code working at every step. Only once they all pass keywords does the bare star go in, and at that point it cannot break anything, because nothing is passing those arguments positionally any more.\n\nThe wider lesson: a parameter that is keyword-only from the day it is written costs the caller four characters. Making one keyword-only later is a breaking change.',
        },
      ],
    },
    {
      id: 'together',
      title: 'Where it adds up',
      blocks: [
        {
          kind: 'prose',
          body: 'None of these pieces is large. Together they change what a readable function call looks like, because the shape of the data and the shape of the call stop having to be written out by hand.',
        },
        {
          kind: 'table',
          caption: 'The star, in each of the four places it appears.',
          head: ['Written', 'Where', 'What it does'],
          rows: [
            ['first, *rest = items', 'left of an assignment', 'Collects the leftovers into a list'],
            ['f(*items)', 'in a call', 'Spreads items out as separate arguments'],
            ['def f(*args)', 'in a def', 'Collects extra positional arguments into a tuple'],
            ['def f(*, flag)', 'in a def', 'Makes everything after it keyword-only'],
            ['f(**options)', 'in a call', 'Spreads a dict out as keyword arguments'],
            ['def f(**kwargs)', 'in a def', 'Collects extra keyword arguments into a dict'],
          ],
        },
        {
          kind: 'code',
          caption: 'A small program using most of them at once.',
          code: 'def summarise(label, *values, places=1, prefix="  "):\n    if not values:\n        return f"{label}: nothing recorded"\n    lowest, *_, highest = sorted(values)\n    mean = sum(values) / len(values)\n    return f"{prefix}{label}: n={len(values)} low={lowest} high={highest} mean={mean:.{places}f}"\n\nreadings = [3.2, 7.8, 5.1, 9.0]\nsettings = {"places": 2, "prefix": "* "}\n\nprint(summarise("morning", *readings))\nprint(summarise("evening", *readings, **settings))\nprint(summarise("night"))\n',
        },
        {
          kind: 'quiz',
          prompt: 'In that program, `lowest, *_, highest = sorted(values)` is meant to pick the smallest and largest of `values`. What breaks it, and why?',
          options: [
            {
              text: 'A single-item values: sorted(values) has one element, but the pattern needs at least two — one for lowest, one for highest',
              correct: true,
              why: 'The starred name can be empty, but the two plain names cannot: with one item there is nothing left for both lowest and highest to bind to, so it raises a ValueError.',
            },
            {
              text: 'An empty values: sorted([]) already raises before unpacking begins',
              why: 'sorted([]) does not raise — it returns an empty list. The failure, when it happens, comes from the unpacking line having nothing to fill lowest and highest with, not from sorted() itself.',
            },
            {
              text: 'Duplicate values: sorted([5, 5, 5]) cannot be unpacked because all the items are equal',
              why: 'Unpacking never cares whether values are equal, only how many there are — three equal items unpack fine into lowest=5, _=[5], highest=5.',
            },
            {
              text: 'Values containing strings and numbers together: sorted() cannot compare them',
              why: 'That would indeed raise, but inside sorted() itself before unpacking is even reached — it is not the weak point this particular line has.',
            },
          ],
        },
      ],
    },
  ],
};

export default lesson;
