// Advanced: annotations as documentation, and the decorator that writes the boring parts of a class.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'type-hints-and-dataclasses',
  title: 'Type hints and dataclasses',
  summary: 'Writing down what a function expects, and letting Python write the boilerplate class',
  track: 'advanced',
  order: 10,
  minutes: 24,
  prereqs: ['classes-and-objects'],
  outcomes: [
    'Annotate parameters, returns and variables with the common types',
    'Show that Python does not check annotations while it runs, and say who does',
    'Turn a hand-written class into a `@dataclass` and know what it generated',
    'Use `field(default_factory=...)`, `frozen=True` and `order=True` for the right reasons',
  ],
  sections: [
    {
      id: 'what-they-are',
      title: 'Hints are documentation that does not rot',
      blocks: [
        {
          kind: 'prose',
          body: 'Read this signature and answer one question: `def process(data, limit, flag):` — what do you pass?\n\nA comment could tell you, and comments drift away from the code. An annotation sits in the signature, is read by editors and checkers, and is impossible to miss when the signature changes.',
        },
        {
          kind: 'compare',
          caption: 'The same function, one of them able to explain itself.',
          left: {
            label: 'You have to read the body to know',
            bad: true,
            code: "def top(data, n, key):\n    ordered = sorted(data, key=key, reverse=True)\n    return ordered[:n]\n\nprint(top([('a', 3), ('b', 9)], 1, lambda pair: pair[1]))\nprint(top.__annotations__)\n",
          },
          right: {
            label: 'The signature says it',
            code: "def top(data: list[tuple[str, int]], n: int) -> list[tuple[str, int]]:\n    ordered = sorted(data, key=lambda pair: pair[1], reverse=True)\n    return ordered[:n]\n\nprint(top([('a', 3), ('b', 9)], 1))\nprint(top.__annotations__)\n",
          },
        },
        {
          kind: 'prose',
          body: 'The annotations are not thrown away: they are stored on the function, which is how editors and checkers read them. They are ordinary Python expressions, so everything you can write in one is a real object you can look at.',
        },
        {
          kind: 'shell',
          caption: 'Annotations are values, not a separate language.',
          lines: [
            'list[int]',
            'dict[str, float]',
            'int | None',
            'type(list[int]).__name__',
            'def half(n: int) -> float: return n / 2',
            'half.__annotations__',
            'half(7)',
            "half.__annotations__['return']",
            'list[int] == list[int]',
          ],
        },
      ],
    },
    {
      id: 'the-common-ones',
      title: 'The annotations you will actually write',
      blocks: [
        {
          kind: 'prose',
          body: 'Nearly everything you write is covered by a handful of forms. The built-in container types take their contents in square brackets, and `|` means "or".',
        },
        {
          kind: 'table',
          caption: 'The working set.',
          head: ['Written', 'Means', 'Example value'],
          rows: [
            ['int, float, str, bool', 'A single value of that type', '3, 3.5, "hi", True'],
            ['list[str]', 'A list where every item is text', "['a', 'b']"],
            ['dict[str, int]', 'A dict with text keys and whole-number values', "{'a': 1}"],
            ['tuple[str, int]', 'A pair: text first, number second', "('a', 1)"],
            ['tuple[int, ...]', 'A tuple of any length, all numbers', '(1, 2, 3)'],
            ['set[str]', 'A set of text', "{'a'}"],
            ['str | None', 'Text, or nothing at all', "'a' or None"],
            ['-> None', 'The function returns nothing useful', 'a function that only prints'],
          ],
        },
        {
          kind: 'code',
          caption: 'A small program written with hints throughout.',
          code: "def parse_row(line: str) -> tuple[str, int] | None:\n    parts = line.strip().split(',')\n    if len(parts) != 2 or not parts[1].strip().isdigit():\n        return None\n    return parts[0].strip(), int(parts[1])\n\ndef totals(lines: list[str]) -> dict[str, int]:\n    out: dict[str, int] = {}\n    for line in lines:\n        row = parse_row(line)\n        if row is None:\n            continue\n        name, amount = row\n        out[name] = out.get(name, 0) + amount\n    return out\n\nprint(parse_row('apples, 5'))\nprint(parse_row('broken line'))\nprint(totals(['apples, 5', 'pears, 2', 'apples, 3', 'oops']))\n",
        },
        {
          kind: 'prose',
          body: 'The return annotation on `parse_row` is doing real work. `tuple[str, int] | None` is a promise that the caller must handle the "no" case, and the `if row is None` line in `totals` is the caller keeping their side of it. Without the annotation, that possibility is only discoverable by reading the whole body.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Annotate the edges, not every line',
          body: 'Function parameters and returns are where hints pay: they are the contract between two pieces of code. A local variable whose value is obvious from the line above it needs nothing. Annotate a local only when it starts empty and the type cannot be guessed — `out: dict[str, int] = {}` is the classic case.',
        },
      ],
    },
    {
      id: 'not-enforced',
      title: 'Python does not check them',
      blocks: [
        {
          kind: 'prose',
          body: 'This surprises everyone coming from a language where types are enforced. At run time, an annotation is stored and otherwise ignored. It converts nothing and refuses nothing. Watch a function that asks for whole numbers be handed text, happily.',
        },
        {
          kind: 'code',
          caption: 'Every call here contradicts the annotations. Python does not mind.',
          code: "def add(a: int, b: int) -> int:\n    return a + b\n\nprint(add(2, 3))\nprint(add('two', 'three'))\nprint(add([1], [2]))\nprint(add(1.5, 2.5))\nprint(type(add(1.5, 2.5)).__name__, 'but the hint said int')\nprint(add.__annotations__)\n",
        },
        {
          kind: 'prose',
          body: 'Only the first call matches the annotations. Text and lists went in where whole numbers were promised, and the float call came back as a float where the signature promises a whole number. No error, no warning, no conversion.\n\nSo who does the checking? A separate tool — mypy, pyright, or the one already running inside your editor — reads the annotations without running the program and tells you about the contradiction before you ship it. The annotation is a claim; the checker is what makes the claim worth anything.',
        },
        {
          kind: 'code',
          caption: 'Where an annotation does bite: a wrong hint sends the reader the wrong way.',
          code: "def average(marks: list[int]) -> int:\n    return sum(marks) / len(marks)\n\nresult = average([70, 75])\nprint(result, type(result).__name__)\nprint('the annotation promised int and the body cannot deliver it')\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'The function above runs perfectly and its annotation is a lie. Name the two things that would each have caught it, and say which one you would rather rely on and why.',
          answer: 'A type checker reading the file would flag that `/` produces a float and the signature says `int`. A test asserting `average([70, 75]) == 72` (or `== 72.5`) would catch it too, if someone wrote one. The checker is the one to rely on here, because it costs nothing per function: it reads every line of the file, including branches no test happens to exercise, and it finds this class of mistake the moment you save. Tests are better at logic you can get wrong in ways no type describes — which is why you want both, and why the next lesson is about testing.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Hints are not validation',
          body: 'If a value is coming from a file, a form, or `input()`, the annotation will not convert it and will not reject it. You still need `int(...)`, a check, or a `try`. A hint documents what you intend to be true; validating that it *is* true is code you write.',
        },
      ],
    },
    {
      id: 'the-boilerplate',
      title: 'The class you are tired of writing',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is a class that holds three values and does nothing else. Count the lines that say something interesting, and the lines that are ceremony.',
        },
        {
          kind: 'code',
          caption: 'Written out by hand, with the methods from the dunder lesson.',
          code: "class Student:\n    def __init__(self, name: str, mark: int, unit: str = 'CITS1401'):\n        self.name = name\n        self.mark = mark\n        self.unit = unit\n\n    def __repr__(self) -> str:\n        return f'Student(name={self.name!r}, mark={self.mark!r}, unit={self.unit!r})'\n\n    def __eq__(self, other) -> bool:\n        if not isinstance(other, Student):\n            return NotImplemented\n        return (self.name, self.mark, self.unit) == (other.name, other.mark, other.unit)\n\na = Student('Ada', 72)\nprint(a)\nprint(a == Student('Ada', 72), a == Student('Ada', 71))\n",
        },
        {
          kind: 'prose',
          body: 'Three field names, repeated in three places each. Every time you add a field you must remember all three, and the day you forget one in `__eq__` you get a bug that no error message will ever mention.\n\n`@dataclass` writes those methods from the annotations.',
        },
        {
          kind: 'code',
          caption: 'The same class. The names appear once.',
          code: "from dataclasses import dataclass\n\n@dataclass\nclass Student:\n    name: str\n    mark: int\n    unit: str = 'CITS1401'\n\na = Student('Ada', 72)\nprint(a)\nprint(a.name, a.mark, a.unit)\nprint(a == Student('Ada', 72), a == Student('Ada', 71))\nprint(Student('Bob', 60, 'CITS2401'))\nprint(sorted([Student('Bob', 60), Student('Ada', 72)], key=lambda s: s.mark))\n",
        },
        {
          kind: 'prose',
          body: 'Look closely at what came out of `print(a)`: that is a generated `__repr__`, and it shows every field with its value. The equality comparisons are a generated `__eq__` over all the fields. The annotations were not decoration here — the decorator reads them to find out which names are fields, which is the one place in Python where a hint has an effect at run time.',
        },
        {
          kind: 'code',
          caption: 'Asking the class what the decorator wrote into it.',
          code: "from dataclasses import dataclass, fields, asdict, astuple\n\n@dataclass\nclass Point:\n    x: int\n    y: int\n\np = Point(1, 2)\nprint(p)\nprint([f.name for f in fields(Point)])\nprint(asdict(p), astuple(p))\nprint(sorted(n for n in vars(Point) if n in ('__init__', '__repr__', '__eq__', '__lt__', '__hash__')))\nprint(Point.__hash__ is None)\n",
        },
        {
          kind: 'prose',
          body: 'Three methods were generated and `__hash__` was set to nothing at all — which is the rule from the dunder lesson showing up again: a class that defines `__eq__` loses its inherited hash, and a dataclass is no exception. The way to get it back is `frozen=True`, in the next section.',
        },
      ],
    },
    {
      id: 'dataclass-options',
      title: 'Defaults, frozen and order',
      blocks: [
        {
          kind: 'prose',
          body: 'A default value goes after the annotation, exactly as in a function signature, and the same rule applies: fields with defaults come after fields without.\n\nMutable defaults are the interesting case, because the shared-list trap from the classes lesson would be waiting. The decorator refuses to walk into it.',
        },
        {
          kind: 'code',
          caption: 'A list as a default. This raises when the class is defined, before any object exists.',
          code: "from dataclasses import dataclass\n\n@dataclass\nclass Basket:\n    owner: str\n    items: list[str] = []\n\nprint('this line is never reached')\n",
        },
        {
          kind: 'code',
          caption: 'The fix, and the proof that each basket gets its own list.',
          code: "from dataclasses import dataclass, field\n\n@dataclass\nclass Basket:\n    owner: str\n    items: list[str] = field(default_factory=list)\n\na = Basket('Ada')\nb = Basket('Bob')\na.items.append('apple')\nprint(a)\nprint(b)\nprint(a.items is b.items)\n",
        },
        {
          kind: 'prose',
          body: '`default_factory=list` stores the *function* `list`, and the generated `__init__` calls it once per object. That is the general fix for any mutable default: a list, a dict, a set, or your own object.\n\nTwo more options are worth knowing. `frozen=True` makes the object read-only after construction, and gives it a hash so it can live in a set. `order=True` generates the comparison methods from the fields, in the order they are declared.',
        },
        {
          kind: 'code',
          caption: 'Frozen and ordered, with the refusal at the end on purpose.',
          code: "from dataclasses import dataclass\n\n@dataclass(frozen=True, order=True)\nclass Version:\n    major: int\n    minor: int\n\nv1 = Version(1, 9)\nv2 = Version(2, 0)\nprint(v1, v2)\nprint(v1 < v2, max([v1, v2]))\nprint(sorted([Version(2, 1), Version(1, 0), Version(2, 0)]))\nprint(len({Version(1, 9), Version(1, 9), v2}))\nv1.minor = 10\n",
        },
        {
          kind: 'prose',
          body: 'Sorting compared the major numbers first and fell through to the minor ones, because `order=True` compares the fields as a tuple in declaration order. The set treated two identical versions as one value, which is what `frozen=True` bought: unchangeable fields mean a hash that stays true.\n\nAnd the last line refused, which is the whole point of freezing. An object that other code has put in a set or a dict must not change underneath it.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You have `@dataclass(order=True)` on a class whose first field is `name: str` and whose second is `mark: int`, and you want "best mark first". Sorting gives you something else. What is happening, and what are the two ways to fix it — one changing the class, one not?',
          answer: 'Generated ordering compares the fields as a tuple in declaration order, so it sorts alphabetically by name and only looks at the mark to break ties. The fix that does not touch the class is `sorted(students, key=lambda s: s.mark, reverse=True)`, which is usually the right answer because "best mark first" is one caller\'s idea of order, not the class\'s natural one. The fix inside the class is to declare the fields in the order that matters, or to keep `name` out of the comparison with `field(compare=False)`. Prefer the key function: a class should only claim a natural order when everyone would agree on it.',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Dataclass, dict or tuple',
      blocks: [
        {
          kind: 'prose',
          body: 'A dataclass is the right tool when the fields are **fixed and known while you are writing the program**. A dict is right when the keys are decided by the data. The difference shows up the moment you misspell something.',
        },
        {
          kind: 'code',
          caption: 'The same typo, in a dict and in a dataclass.',
          code: "from dataclasses import dataclass\n\n@dataclass\nclass Student:\n    name: str\n    mark: int\n\nrow = {'name': 'Ada', 'mark': 72}\nrow['makr'] = 100\nprint(row)\n\ns = Student('Ada', 72)\ns.makr = 100\nprint(s)\nprint(vars(s))\n",
        },
        {
          kind: 'prose',
          body: 'Neither one raised, which is worth knowing: a plain dataclass will let you attach a name that is not a field, and it will not appear in the repr, so the object prints as if nothing happened. The dict swallowed it too.\n\nA type checker catches the dataclass version and cannot catch the dict version, and `@dataclass(slots=True)` makes the assignment fail outright. That asymmetry is the practical argument for named fields wherever the shape is known.',
        },
        {
          kind: 'table',
          caption: 'Choosing.',
          head: ['Use', 'When', 'Watch out for'],
          rows: [
            ['@dataclass', 'Fixed fields, known now; you may want equality or ordering', 'Mutable defaults; it still allows stray attributes without slots=True'],
            ['dict', 'Keys come from the data: a JSON payload, a CSV header row', 'Typos in keys, and no place to hang behaviour'],
            ['tuple', 'Two or three values with an obvious order, returned from a function', 'Reading `row[2]` three files away from where it was built'],
            ['A hand-written class', 'Behaviour and state, with more happening than storage', 'Writing __init__ and __repr__ by hand when a dataclass would do'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You read a CSV of unknown columns into dicts, then pass them through five functions. Someone proposes converting each row into a dataclass right after reading. What do you gain at the moment of conversion, and what do you have to decide first?',
          answer: 'You gain a single place where the shape of the data is checked and named: after that line, every function downstream has real field names, typo protection from a checker, and a repr that shows what a row is. What you have to decide first is what to do with rows that do not fit — a missing column, a mark that is not a number, an extra field you did not expect. The conversion forces that decision to the top of the program instead of letting it surface as a `KeyError` in the fourth function. That is the actual value of the boundary, and it is why "parse at the edge, work with objects inside" is the usual advice.',
        },
      ],
    },
  ],
};

export default lesson;
