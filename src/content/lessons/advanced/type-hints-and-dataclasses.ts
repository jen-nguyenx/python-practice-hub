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
          body: 'Read this signature and answer one question: `def process(data, limit, flag):` — what do you pass? A comment could tell you, and comments drift away from the code. An annotation sits in the signature, is read by editors and checkers, and is stored on the function as a real object.',
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
          kind: 'shell',
          caption: 'Annotations are values, not a separate language.',
          lines: [
            'list[int]',
            'dict[str, float]',
            'int | None',
            'def half(n: int) -> float: return n / 2',
            'half.__annotations__',
            'half(7)',
          ],
        },
      ],
    },
    {
      id: 'the-common-ones',
      title: 'The annotations you will actually write',
      blocks: [
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
          kind: 'quiz',
          prompt: '`parse_row` returns `tuple[str, int] | None`. What does that annotation buy the caller?',
          options: [
            {
              text: 'A written promise that the "could not parse" case exists, which `totals` then has to handle',
              correct: true,
              why: 'Without the annotation, the possibility of `None` is only discoverable by reading the whole body. With it, the `if row is None` line in `totals` is visibly the caller keeping their side of a stated contract.',
            },
            { text: 'Python refuses to call `parse_row` with the wrong kind of line', why: 'Nothing about the annotation changes what runs. `parse_row` is called the same way whether or not the hint is there — the next section covers this directly.' },
            { text: 'A guarantee that the return value is converted to a tuple automatically', why: 'No conversion happens. `parse_row` still has to build and return the tuple itself; the annotation only describes what it does.' },
            { text: 'It makes the function run faster, since the type is known ahead of time', why: 'Hints have no effect on execution speed. They are read by editors and separate checking tools, not used by the interpreter to skip work.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Annotate the edges, not every line',
          body: 'Function parameters and returns are where hints pay: they are the contract between two pieces of code. Annotate a local variable only when it starts empty and the type cannot be guessed — `out: dict[str, int] = {}` is the classic case.',
        },
      ],
    },
    {
      id: 'not-enforced',
      title: 'Python does not check them',
      blocks: [
        {
          kind: 'prose',
          body: 'This surprises everyone coming from a language where types are enforced. At run time, an annotation is stored and otherwise ignored: it converts nothing and refuses nothing.',
        },
        {
          kind: 'predict',
          ask: 'Every call here contradicts the annotations. What does the fourth line print?',
          code: "def add(a: int, b: int) -> int:\n    return a + b\n\nprint(add(2, 3))\nprint(add('two', 'three'))\nprint(add(1.5, 2.5))\n",
          choices: ['5\ntwothree\n4.0', '5\ntwothree\n4', '5\nTypeError\n4.0', 'TypeError\ntwothree\n4.0'],
        },
        {
          kind: 'prose',
          body: 'Only the first call matches the annotations, and nothing stops the other two. So who does the checking? A separate tool — mypy, pyright, or the one already running inside your editor — reads the annotations without running the program and flags the contradiction before you ship it. The annotation is a claim; the checker is what makes the claim worth anything.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'a-call-that-breaks-the-hint',
            title: 'Nothing stops the call',
            intro: 'This function\'s hint promises `str` in, `str` out. Choose what you actually pass and see whether Python minds.',
            template: 'def make_tag(name: str, count: int) -> str:\n    return name * count\n\nresult = make_tag(⟦args⟧)\nprint(repr(result))\nprint(type(result).__name__)\n',
            knobs: [
              {
                id: 'args',
                label: 'what you pass in',
                choices: [
                  { value: "'sale', 3", caption: 'matches the hint' },
                  { value: "['sale'], 3", caption: 'a list where a string was promised' },
                  { value: "'sale', 2.5", caption: 'a fraction where a whole number was promised' },
                ],
              },
            ],
            notes: {
              '0': 'Text in, text out, exactly as the signature says. This is the only one of the three that a type checker would accept.',
              '1': 'A list stood in for `name`, and `*` on a list repeats it — so the function runs to completion and returns a **list**, not the `str` its own signature promises. Nothing about that return value fails; it is simply not what the annotation said would come back.',
              '2': 'A fraction stood in for `count`. `*` on a string needs a whole number of repeats, so this one raises — the annotation warned about exactly this, and Python still did nothing to stop the call from being made.',
            },
            takeaway: 'The return annotation is exactly as unenforced as the parameter ones: `-> str` is a claim, not a check, so a function can hand back a list while its own signature says otherwise, and nothing at the call site will complain.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: '`def average(marks: list[int]) -> int: return sum(marks) / len(marks)` runs perfectly and its return annotation is a lie. Name the two things that would each catch it, and say which you would rather rely on.',
          answer: 'A type checker reading the file flags that `/` produces a `float` while the signature says `int`. A test asserting `average([70, 75]) == 72.5` would also catch it, if someone wrote one. The checker is the one to rely on here: it reads every line, including branches no test happens to exercise, and finds this class of mistake the moment you save. Tests are better at logic no type describes — which is why both matter, and why the next lesson is about testing.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Hints are not validation',
          body: 'If a value comes from a file, a form, or `input()`, the annotation will not convert it and will not reject it. You still need `int(...)`, a check, or a `try`. A hint documents what you intend to be true; validating that it *is* true is code you write.',
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
          caption: 'Written out by hand.',
          code: "class Student:\n    def __init__(self, name: str, mark: int, unit: str = 'CITS1401'):\n        self.name = name\n        self.mark = mark\n        self.unit = unit\n\n    def __repr__(self) -> str:\n        return f'Student(name={self.name!r}, mark={self.mark!r}, unit={self.unit!r})'\n\n    def __eq__(self, other) -> bool:\n        if not isinstance(other, Student):\n            return NotImplemented\n        return (self.name, self.mark, self.unit) == (other.name, other.mark, other.unit)\n\na = Student('Ada', 72)\nprint(a)\nprint(a == Student('Ada', 72), a == Student('Ada', 71))\n",
        },
        {
          kind: 'quiz',
          prompt: 'Every field name above appears in three places: `__init__`, `__repr__` and `__eq__`. What is the real cost of that repetition, versus just "it is a lot of typing"?',
          options: [
            {
              text: 'Adding a field means remembering to update all three, and forgetting one in `__eq__` gives a bug no error message mentions',
              correct: true,
              why: 'A field left out of `__eq__` still runs without complaint; two objects that differ only in that field are reported equal, and nothing about the program says why.',
            },
            { text: 'Python runs slower the more methods a class defines', why: 'The number of methods on a class has no meaningful effect on runtime speed for code like this.' },
            { text: 'It makes the class impossible to subclass', why: 'Nothing about writing `__init__`, `__repr__` and `__eq__` by hand prevents subclassing; the repetition is a maintenance cost, not a structural one.' },
            { text: 'It is only a cost while the class is being written, not afterwards', why: 'The risk is exactly the opposite: it is the *later* change, when a field is added and one of the three methods is missed, that causes the real damage.' },
          ],
        },
        {
          kind: 'code',
          caption: 'The same class. The names appear once, and `@dataclass` reads the annotations to find them.',
          code: "from dataclasses import dataclass\n\n@dataclass\nclass Student:\n    name: str\n    mark: int\n    unit: str = 'CITS1401'\n\na = Student('Ada', 72)\nprint(a)\nprint(a == Student('Ada', 72), a == Student('Ada', 71))\n",
        },
        {
          kind: 'code',
          caption: 'Asking the class what the decorator wrote into it.',
          code: "from dataclasses import dataclass, fields\n\n@dataclass\nclass Point:\n    x: int\n    y: int\n\np = Point(1, 2)\nprint(p)\nprint([f.name for f in fields(Point)])\nprint(sorted(n for n in vars(Point) if n in ('__init__', '__repr__', '__eq__', '__lt__', '__hash__')))\nprint(Point.__hash__ is None)\n",
        },
        {
          kind: 'prose',
          body: '`__hash__` was set to `None` — the same rule from the dunder lesson showing up again: a class that defines `__eq__` loses its inherited hash, and a dataclass is no exception. The way to get it back is `frozen=True`, next.',
        },
      ],
    },
    {
      id: 'dataclass-options',
      title: 'Defaults, frozen and order',
      blocks: [
        {
          kind: 'prose',
          body: 'A default value goes after the annotation, exactly as in a function signature, and the same rule applies: fields with defaults come after fields without. Mutable defaults are the interesting case, because the shared-list trap from the classes lesson would be waiting — the decorator refuses to walk into it.',
        },
        {
          kind: 'predict',
          ask: 'A dataclass field is given `[]` as a plain default. What happens when the class is defined?',
          code: "from dataclasses import dataclass\n\ntry:\n    @dataclass\n    class Basket:\n        owner: str\n        items: list[str] = []\nexcept ValueError as e:\n    print('ValueError:', e)\n",
          choices: [
            "ValueError: mutable default <class 'list'> for field items is not allowed: use default_factory",
            'Basket is created successfully, with items shared by every instance',
            'Basket is created successfully, with a fresh list per instance',
            'TypeError: __init__() missing 1 required positional argument',
          ],
        },
        {
          kind: 'code',
          caption: 'The fix, and the proof that each basket gets its own list.',
          code: "from dataclasses import dataclass, field\n\n@dataclass\nclass Basket:\n    owner: str\n    items: list[str] = field(default_factory=list)\n\na = Basket('Ada')\nb = Basket('Bob')\na.items.append('apple')\nprint(a)\nprint(b)\nprint(a.items is b.items)\n",
        },
        {
          kind: 'prose',
          body: '`default_factory=list` stores the *function* `list`, and the generated `__init__` calls it once per object — the general fix for any mutable default. Two more options: `frozen=True` makes the object read-only and gives it a hash back; `order=True` generates comparisons from the fields, in declaration order.',
        },
        {
          kind: 'code',
          caption: 'Frozen and ordered, with the refusal at the end on purpose.',
          code: "from dataclasses import dataclass\n\n@dataclass(frozen=True, order=True)\nclass Version:\n    major: int\n    minor: int\n\nv1 = Version(1, 9)\nv2 = Version(2, 0)\nprint(v1 < v2, max([v1, v2]))\nprint(sorted([Version(2, 1), Version(1, 0), Version(2, 0)]))\nprint(len({Version(1, 9), Version(1, 9), v2}))\ntry:\n    v1.minor = 10\nexcept Exception as e:\n    print(type(e).__name__, e)\n",
        },
        {
          kind: 'checkpoint',
          prompt: '`@dataclass(order=True)` on a class with `name: str` first and `mark: int` second sorts alphabetically, not by best mark. What is happening, and what are two fixes — one that changes the class, one that does not?',
          answer: 'Generated ordering compares the fields as a tuple in declaration order, so it sorts by name first and only uses mark to break ties. The fix that does not touch the class is `sorted(students, key=lambda s: s.mark, reverse=True)` — usually the right answer, since "best mark first" is one caller\'s idea of order, not the class\'s natural one. The fix inside the class is to declare `mark` first, or exclude `name` from comparison with `field(compare=False)`. Prefer the key function: a class should only claim a natural order when everyone would agree on it.',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Dataclass, dict or tuple',
      blocks: [
        {
          kind: 'prose',
          body: 'A dataclass is right when the fields are **fixed and known while you are writing the program**. A dict is right when the keys are decided by the data.',
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
          kind: 'code',
          caption: 'The same typo, in a dict and in a dataclass. Neither raises.',
          code: "from dataclasses import dataclass\n\n@dataclass\nclass Student:\n    name: str\n    mark: int\n\nrow = {'name': 'Ada', 'mark': 72}\nrow['makr'] = 100\nprint(row)\n\ns = Student('Ada', 72)\ns.makr = 100\nprint(s)\n",
        },
        {
          kind: 'prose',
          body: 'A type checker catches the dataclass version and cannot catch the dict version, and `@dataclass(slots=True)` makes the stray assignment fail outright. That asymmetry is the practical argument for named fields wherever the shape is known.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You read a CSV of unknown columns into dicts, then pass them through five functions. Someone proposes converting each row into a dataclass right after reading. What do you gain, and what must you decide first?',
          answer: 'You gain a single place where the shape of the data is checked and named: every function downstream gets real field names, typo protection from a checker, and a repr that shows what a row is. What you must decide first is what to do with rows that do not fit — a missing column, a mark that is not a number. The conversion forces that decision to the top of the program instead of letting it surface as a `KeyError` four functions later, which is the actual value of "parse at the edge, work with objects inside".',
        },
      ],
    },
  ],
};

export default lesson;
