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
          body: 'Assignment in Python does not have to be one name to one value. Put several names on the left, separated by commas, and Python takes the thing on the right apart to fill them.\n\nThis is not a special case for tuples. It works on anything Python can walk over: lists, strings, the pairs that come out of a dict, whatever a function returns.',
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
          kind: 'prose',
          body: 'The second-to-last line shows that the shape can be nested: brackets on the left describe the shape of the thing on the right, and Python matches them up.\n\nThe count has to match exactly. Too few names or too many is a `ValueError`, and the message says which way round the problem is.',
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
          kind: 'prose',
          body: 'The most useful thing unpacking does is return more than one value from a function. Python has no special syntax for that: the function returns a tuple, and the caller unpacks it.',
        },
        {
          kind: 'code',
          caption: 'A function returning two things, and the two ways to receive them.',
          code: 'def split_name(full):\n    parts = full.split(" ")\n    return parts[0], parts[-1]\n\nboth = split_name("Ada Lovelace")\nprint(both, type(both))\n\nfirst, last = split_name("Ada Lovelace")\nprint(first)\nprint(last)\n',
        },
        {
          kind: 'prose',
          body: 'The `return` statement had no brackets, and a tuple came back anyway: it is the comma that makes a tuple, not the brackets. Receiving it into one name gives the whole tuple; receiving it into two unpacks it.',
        },
        {
          kind: 'prose',
          body: 'Unpacking also explains the shortest swap in any language. The right-hand side is worked out completely before anything on the left is assigned, so no temporary variable is needed.',
        },
        {
          kind: 'shell',
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
          body: 'Exact counts are not always what you have. A star in front of one name on the left says "put everything left over in here, as a list". Exactly one name may be starred, and it can be anywhere in the row.',
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
          kind: 'prose',
          body: 'The starred name always ends up holding a list, even when the thing being unpacked was a tuple or a string, and even when there is nothing left for it. That last case is the useful one: a starred name never causes a `ValueError` for being empty, which is why `first, *rest = items` is a safe way to split a list of at least one item.\n\nWhen a value is not wanted, the convention is to unpack it into `_`. It is an ordinary name, and nothing enforces this, but readers take it to mean "ignored on purpose".',
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
          body: 'Unpacking in a `for` loop is the same feature, applied once per item, and it is where most people meet it. Compare the two versions below: one names the parts, the other counts positions.',
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
          kind: 'prose',
          body: 'The left version has the last two columns the wrong way round, and it ran perfectly happily. Nothing in `row[1]` or `row[2]` says what those columns hold, so nothing could have caught it except a reader checking the numbers against the data.\n\nThe right version names the columns once, at the top, where a reader can see what the data is. A swap there would read `outcome` where a score belongs, which is visible on the line itself. It also fails loudly if a row turns up with the wrong number of fields, instead of quietly reading the wrong column.\n\nThe same applies to the standard pairs: `enumerate` produces `(index, item)` and `dict.items()` produces `(key, value)`, and both are almost always unpacked.',
        },
        {
          kind: 'code',
          caption: 'The three loops worth having in your fingers.',
          code: 'names = ["ana", "bo", "cy"]\nscores = [71, 88, 65]\nprices = {"tea": 3, "cocoa": 5}\n\nfor i, name in enumerate(names, start=1):\n    print(i, name)\n\nfor name, score in zip(names, scores):\n    print(name, score)\n\nfor item, price in prices.items():\n    print(item, price)\n\nfor i, (name, score) in enumerate(zip(names, scores)):\n    print(i, name, score)\n',
        },
        {
          kind: 'prose',
          body: 'The last loop is the nested case: `enumerate` hands over a pair whose second item is itself a pair, and the brackets on the left describe that shape.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A CSV line arrives as `"ana,71,83,90,PASS"`, where the middle is any number of scores. Write one line that gives you the name, the outcome, and the scores as a list of integers.',
          answer: '```\nname, *scores, outcome = line.split(",")\n```\n\nThat leaves `scores` as a list of strings, so the conversion is a second step: `scores = [int(s) for s in scores]`, or write it as two lines from the start.\n\nThe reason the starred form is right here is that it does not care how many scores there are. Indexing would need `line.split(",")[1:-1]`, which works but states the same idea twice: once as "from 1" and once as "to the last but one".',
        },
      ],
    },
    {
      id: 'star-in-calls',
      title: 'Stars in a call',
      blocks: [
        {
          kind: 'prose',
          body: 'The star does the opposite job in a call. On the left of an assignment it collects; in a call it spreads. `f(*items)` means *use each item of `items` as a separate argument*, and `f(**options)` means *use each key and value as a keyword argument*.',
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
          kind: 'prose',
          body: 'The fourth line shows what happens without the star: the tuple arrives as a single argument and the second parameter has nothing to fill it.\n\nThe last two lines are worth staring at, because they both work and they mean different things. `max(nums)` asks for the largest item **in** the list. `max(*nums)` passes three separate arguments, and `max` has a second form that compares whatever it is given. They agree here, and they stop agreeing the moment the list has one item in it, or none.',
        },
        {
          kind: 'code',
          caption: 'Where the two forms of `max` part company. The last line raises on purpose.',
          code: 'nums = [3, 1, 2]\nprint(max(nums), max(*nums))\n\nnone_at_all = []\nprint(max(none_at_all, default="empty"))\n\none = [7]\nprint(max(one))\nprint(max(*one))\n',
        },
        {
          kind: 'prose',
          body: 'With one item, `max(one)` still answered and `max(*one)` was handed a single number, which is not something it can look through. With none, the starred form passes no arguments at all. The list form is the one that handles both, and `default=` is how you say what an empty collection should give back.',
        },
        {
          kind: 'prose',
          body: 'Stars also spread things into new collections, which is the modern way to join lists and merge dicts without changing either original.',
        },
        {
          kind: 'shell',
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
          kind: 'prose',
          body: 'The two merge lines are the same two dicts in the other order, and they did not produce the same result. A later key wins, so the dict you want to take priority goes **last**. The final line confirms that neither original was touched.',
        },
      ],
    },
    {
      id: 'args-kwargs',
      title: 'Functions that take any number',
      blocks: [
        {
          kind: 'prose',
          body: 'The same two stars appear in a `def`, where they mean "collect" again. `*args` gathers every extra positional argument into a tuple, and `**kwargs` gathers every extra keyword argument into a dict.\n\nThe names are a convention, not a rule — `*numbers` and `**options` are often clearer — but the stars are what matters.',
        },
        {
          kind: 'code',
          caption: 'Watch what each call puts in each of the two.',
          code: 'def inspect(*args, **kwargs):\n    print("args  :", args, type(args).__name__)\n    print("kwargs:", kwargs, type(kwargs).__name__)\n    print("-")\n\ninspect(1, 2, 3)\ninspect(mode="fast", tries=2)\ninspect(1, 2, mode="fast")\ninspect()\n',
        },
        {
          kind: 'prose',
          body: '`args` is always a tuple and `kwargs` is always a dict, even when they are empty, so a function using them never has to check whether anything arrived.\n\nParameters come in a fixed order in a `def`: the ordinary ones, then `*args`, then any keyword-only ones, then `**kwargs`. A call fills the ordinary ones first and everything left over goes into the stars.',
        },
        {
          kind: 'code',
          caption: 'Named parameters first, and the stars taking whatever is left.',
          code: 'def order(item, *extras, **details):\n    print("item   :", item)\n    print("extras :", extras)\n    print("details:", details)\n    print("-")\n\norder("coffee")\norder("coffee", "milk", "sugar")\norder("coffee", "milk", size="large", hot=True)\n',
        },
        {
          kind: 'prose',
          body: 'The single most common real use is passing arguments through one function to another without listing them. A wrapper that takes `*args, **kwargs` and hands them straight on works no matter what the function underneath expects, which is what makes decorators possible.',
        },
        {
          kind: 'code',
          caption: 'One wrapper, two functions with completely different signatures.',
          code: 'def announced(fn):\n    def wrapper(*args, **kwargs):\n        print(f"calling {fn.__name__} with {args} {kwargs}")\n        return fn(*args, **kwargs)\n    return wrapper\n\ndef area(width, height):\n    return width * height\n\ndef greet(name, greeting="hello", loudly=False):\n    line = f"{greeting}, {name}"\n    return line.upper() if loudly else line\n\nannounced_area = announced(area)\nannounced_greet = announced(greet)\n\nprint(announced_area(3, 4))\nprint(announced_greet("ana", loudly=True))\n',
        },
        {
          kind: 'prose',
          body: 'Inside `wrapper`, the stars collect; on the call to `fn`, they spread. That pair — collect on the way in, spread on the way out — is the shape to recognise, and it turns up in every piece of code that wraps something else.',
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
          body: 'A bare `*` in a parameter list has no name to collect into, and that is the point: everything after it can only be passed by keyword. It exists to stop a caller writing a line nobody can read.\n\nCompare `connect("db", 30, True, False)` with `connect("db", timeout=30, retry=True, verbose=False)`. The second is longer and the first is a puzzle.',
        },
        {
          kind: 'code',
          caption: 'The last call raises on purpose; read what the message counts.',
          code: 'def connect(host, *, timeout=5, retry=False):\n    return f"{host} timeout={timeout} retry={retry}"\n\nprint(connect("db"))\nprint(connect("db", timeout=30))\nprint(connect("db", retry=True, timeout=1))\nprint(connect("db", 30))\n',
        },
        {
          kind: 'prose',
          body: 'The error counts positional arguments, and the function accepts exactly one. Everything after the `*` is off limits positionally, so the caller is made to write the name.\n\nKeyword-only parameters are worth using whenever a parameter is a flag, a setting, or anything a reader could not guess from its position. The standard library does this constantly: `sorted(items, key=..., reverse=...)` cannot be called as `sorted(items, f, True)`.',
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
          kind: 'prose',
          body: 'There would be no way to write that function without the star. A plain `def join_all(parts, separator)` would force every caller to build a list first, and `def join_all(*parts, separator)` without a default would be impossible to satisfy positionally — which is exactly why Python makes it keyword-only.',
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
            ['`first, *rest = items`', 'left of an assignment', 'Collects the leftovers into a list'],
            ['`f(*items)`', 'in a call', 'Spreads items out as separate arguments'],
            ['`def f(*args)`', 'in a `def`', 'Collects extra positional arguments into a tuple'],
            ['`def f(*, flag)`', 'in a `def`', 'Makes everything after it keyword-only'],
            ['`f(**options)`', 'in a call', 'Spreads a dict out as keyword arguments'],
            ['`def f(**kwargs)`', 'in a `def`', 'Collects extra keyword arguments into a dict'],
          ],
        },
        {
          kind: 'code',
          caption: 'A small program using most of them at once.',
          code: 'def summarise(label, *values, places=1, prefix="  "):\n    if not values:\n        return f"{label}: nothing recorded"\n    lowest, *_, highest = sorted(values)\n    mean = sum(values) / len(values)\n    return f"{prefix}{label}: n={len(values)} low={lowest} high={highest} mean={mean:.{places}f}"\n\nreadings = [3.2, 7.8, 5.1, 9.0]\nsettings = {"places": 2, "prefix": "* "}\n\nprint(summarise("morning", *readings))\nprint(summarise("evening", *readings, **settings))\nprint(summarise("night"))\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'In that program, `lowest, *_, highest = sorted(values)` picks the smallest and largest. It has a bug. What input breaks it, and what is the smallest fix?',
          answer: 'A single reading breaks it. `sorted([3.2])` has one item, and the pattern demands at least two — one for `lowest`, one for `highest` — so it raises a `ValueError` for not having enough values to unpack. The starred name can be empty, but the two plain names cannot.\n\nThe smallest fix is not to unpack at all: `lowest, highest = min(values), max(values)`. That works for one value and says what it means. Starred unpacking is the right tool for "the first, the last, and I do not care about the middle" only when you know there are at least as many items as plain names.',
        },
      ],
    },
  ],
};

export default lesson;
