// Advanced: why two names can be one list, and what copy actually copies.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'mutability-and-copying',
  title: 'Mutability and copying',
  summary: 'Why two names can share one list, what a copy really copies, and the default argument that remembers',
  track: 'advanced',
  order: 5,
  minutes: 26,
  outcomes: [
    'Say which types can be changed in place and which cannot',
    'Explain why changing one name changed another',
    'Choose between a shallow copy and `copy.deepcopy`',
    'Recognise the mutable default argument trap and fix it',
  ],
  sections: [
    {
      id: 'two-kinds',
      title: 'Two kinds of value',
      blocks: [
        {
          kind: 'prose',
          body: 'Python\'s types split into two groups: some can be changed after they are made — lists, dicts, sets — and some cannot — numbers, strings, tuples, booleans, `None`. The difference, called **mutable** and **immutable**, is whether a change happens to the value itself or produces a new one.',
        },
        {
          kind: 'shell',
          caption: 'Two ways of "adding to the end". Watch which line changes the original.',
          lines: [
            'items = [1, 2]',
            'items.append(3)',
            'items',
            'text = "ab"',
            'text.upper()',
            'text',
            'text = text + "c"',
            'text',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Read the return value',
          body: '`append` changed the list already there and returned nothing; `upper()` could not change the string, so it returned a new one, leaving the original untouched until reassigned. That pattern runs through the language: a method that changes a mutable value in place usually returns nothing, and one on an immutable value always returns something new. If a string method looks like it did nothing, the result was thrown away.',
        },
        {
          kind: 'table',
          caption: 'The everyday types.',
          head: ['Type', 'Can it be changed in place?', 'Can it be a dict key?'],
          rows: [
            ['`int`, `float`, `bool`', 'no', 'yes'],
            ['`str`', 'no', 'yes'],
            ['`tuple`', 'no', 'yes, if everything inside it can'],
            ['`list`', 'yes', 'no'],
            ['`dict`', 'yes', 'no'],
            ['`set`', 'yes', 'no'],
            ['`frozenset`', 'no', 'yes'],
          ],
        },
        {
          kind: 'code',
          caption: 'Tuples really are fixed — `point + (9,)` builds a new tuple and leaves `point` alone, the same way string addition does; assigning into a position is the operation a tuple does not have. This raises on purpose.',
          code: 'point = (3, 7)\nprint(point[0])\nprint(point + (9,))\nprint(point)\npoint[0] = 5\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A tuple can still contain something changeable',
          body: 'Immutable means the tuple\'s own contents — which objects it points at — cannot change. If one of those objects is a list, that list can still be changed. The last section shows why this matters for dict keys.',
        },
      ],
    },
    {
      id: 'names-not-boxes',
      title: 'Names, not boxes',
      blocks: [
        {
          kind: 'prose',
          body: 'The mental picture that causes trouble is a variable as a box holding a value, so `b = a` makes a second box with a copy in it. Python does not work that way: a name is a label attached to an object, and `b = a` attaches a second label to the **same object**. With immutable values you never notice; with a list, you notice immediately.',
        },
        {
          kind: 'shell',
          caption: '`is` asks whether two names are labels on the same object. `==` asks whether they hold the same thing — two different lists can be equal, which the last two lines show.',
          lines: [
            'a = [1, 2, 3]',
            'b = a',
            'a is b',
            'b.append(99)',
            'a',
            'c = [1, 2, 3, 99]',
            'a == c',
            'a is c',
          ],
        },
        {
          kind: 'predict',
          ask: '`a` and `b` start as labels on the same list. Predict what the last two lines print.',
          code: 'a = [1, 2]\nb = a\nb.append(3)\nprint(a)\nb = [7, 8]\nprint(a)\n',
          choices: [
            '[1, 2, 3]\n[1, 2, 3]',
            '[1, 2, 3]\n[7, 8]',
            '[1, 2]\n[1, 2]',
            '[1, 2]\n[7, 8]',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Mutating vs rebinding',
          body: '**Mutating** changes an object, and everyone looking at it sees the change — that is `b.append(3)` above. **Rebinding** changes what one name points at: `b = [7, 8]` moved the label `b` onto a different object and left `a` exactly where it was; nobody else is affected.',
        },
        {
          kind: 'shell',
          caption: 'When you want a separate list, ask for one — three ways say the same thing.',
          lines: [
            'a = [1, 2, 3]',
            'b = list(a)',
            'c = a[:]',
            'd = a.copy()',
            'b is a',
            'b == a',
            'b.append(99)',
            'a',
          ],
        },
      ],
    },
    {
      id: 'arguments',
      title: 'What a function can change',
      blocks: [
        {
          kind: 'prose',
          body: 'Passing a value into a function is an assignment: the parameter name becomes another label on the same object, so a function that mutates a list it was given changes the caller\'s list, while a function that rebinds its parameter changes nothing outside itself.',
        },
        {
          kind: 'compare',
          caption: 'Two functions that look like they do the same thing. The left one returns a list **and** changes the caller\'s — the worst of both, because the caller cannot tell from the call site that their data was altered. A function should either change what it was given and return nothing (like `list.sort()`), or leave it alone and return something new (like `sorted()`) — never both.',
          left: {
            label: 'Mutating the argument',
            code: 'def add_bonus(scores):\n    scores.append(100)\n    return scores\n\nmine = [70, 80]\nresult = add_bonus(mine)\nprint("returned:", result)\nprint("original:", mine)\nprint("same object:", result is mine)\n',
            bad: true,
          },
          right: {
            label: 'Building a new list',
            code: 'def with_bonus(scores):\n    return scores + [100]\n\nmine = [70, 80]\nresult = with_bonus(mine)\nprint("returned:", result)\nprint("original:", mine)\nprint("same object:", result is mine)\n',
          },
        },
        {
          kind: 'match',
          ask: 'This pair runs right through the standard library. Match each way of changing something to what it does.',
          pairs: [
            { left: '`list.sort()`', right: 'Changes the list in place and returns None' },
            { left: '`sorted(list)`', right: 'Leaves the list alone and returns a new one' },
            { left: '`dict.update(other)`', right: 'Changes the dict in place' },
            { left: '`{**a, **b}`', right: 'Builds a new dict, leaving both alone' },
            { left: '`list.reverse()`', right: 'Reverses in place and returns None' },
            { left: '`reversed(list)`', right: 'Returns a new reverse iterator, leaving the list alone' },
          ],
        },
        {
          kind: 'prose',
          body: 'When a function must not change what it was given, it takes a copy on the way in — one line at the top is cheaper than a bug report.',
        },
        {
          kind: 'code',
          caption: 'Defensive copying, and what it costs.',
          code: 'def top_three(scores):\n    ranked = sorted(scores, reverse=True)\n    return ranked[:3]\n\ndef top_three_careless(scores):\n    scores.sort(reverse=True)\n    return scores[:3]\n\nmine = [70, 95, 80, 65]\nprint(top_three(mine), "original:", mine)\n\nyours = [70, 95, 80, 65]\nprint(top_three_careless(yours), "original:", yours)\n',
        },
      ],
    },
    {
      id: 'shallow-and-deep',
      title: 'How deep a copy goes',
      blocks: [
        {
          kind: 'prose',
          body: '`list(a)` makes a new list, and that is all it makes — it points at the **same objects** the old one pointed at. If those are numbers or strings, nothing can go wrong, because they cannot change. If they are lists, the copy is only skin deep.',
        },
        {
          kind: 'code',
          caption: 'A copy of a list of lists. Watch what happens to the copy.',
          code: 'original = [[1, 2], [3, 4]]\nshallow = list(original)\n\nprint("different outer list:", shallow is original)\nprint("same inner list:    ", shallow[0] is original[0])\n\nshallow.append([5, 6])\nprint("after append to copy:", original)\n\nshallow[0].append(99)\nprint("after change inside: ", original)\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Shallow copies share what is inside',
          body: 'Appending to the copy above left the original alone, because the outer list really was new. Changing something **inside** the copy showed up in the original, because the inner lists were never copied at all. `copy.deepcopy` walks the whole structure and copies everything it finds.',
        },
        {
          kind: 'code',
          caption: 'The same change, through a deep copy. Reach for deepcopy when the structure is nested and the copy must be genuinely independent — it is slower, and the wrong tool for a flat list of numbers.',
          code: 'import copy\n\noriginal = [[1, 2], [3, 4]]\nshallow = copy.copy(original)\ndeep = copy.deepcopy(original)\n\nprint("shallow shares inner:", shallow[0] is original[0])\nprint("deep shares inner:   ", deep[0] is original[0])\n\ndeep[0].append(99)\nprint("original after deep change: ", original)\n\nshallow[0].append(99)\nprint("original after shallow change:", original)\n',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'copy-depth',
            title: 'Which names change when b is built',
            intro: 'Choose how `b` is built from `a`, then watch what happens when `b` is appended to and its first inner list is appended to.',
            template: 'import copy\n\na = [[1, 2], [3, 4]]\nb = ⟦method⟧\n\nb.append([9, 9])\nb[0].append(99)\n\nprint("a:", a)\nprint("b:", b)\nprint("same object:", a is b)\n',
            knobs: [
              {
                id: 'method',
                label: 'build b as',
                choices: [
                  { value: 'a', caption: '= (same object)' },
                  { value: 'list(a)', caption: 'list(a)' },
                  { value: 'copy.deepcopy(a)', caption: 'copy.deepcopy(a)' },
                ],
              },
            ],
            probes: {
              sizes: '[len(a), len(b), len(a[0]), len(b[0])]',
              'size-labels': "['len(a)', 'len(b)', 'len(a[0])', 'len(b[0])']",
            },
            visual: {
              kind: 'bars',
              values: 'sizes',
              labels: 'size-labels',
              caption: 'How many items are in each list after both appends, for the copy method chosen.',
            },
            notes: {
              '0': '`a` and `b` are two names for the same list. Every bar matches: appending to `b` and appending to its first inner list both show up in `a`, because there is only one list to change.',
              '1': 'The outer list is new: `len(a)` stays at 2 while `len(b)` grows to 3. But the inner lists were never copied, so `len(a[0])` grows right alongside `len(b[0])` — a shallow copy is only skin deep.',
              '2': 'Every bar involving `a` stays at its original size. `deepcopy` walked the whole structure, so `b` owns its own outer list and its own inner lists, and nothing done through `b` reaches `a`.',
            },
            takeaway: '`=` shares the object outright, `list(a)` makes a new outer container but keeps the same inner objects, and `copy.deepcopy` copies all the way down. A shallow copy is enough when nothing inside the outer list can change, and wrong the moment something inside it can.',
          },
        },
        {
          kind: 'compare',
          caption: 'The same trap has a second form, and arrives without any copying at all: multiplying a list repeats the **reference**, not the contents. Only one of these builds a real grid.',
          left: {
            label: 'Multiplying the row',
            code: 'grid = [[0] * 3] * 3\nprint(grid)\nprint("rows are the same object:", grid[0] is grid[1])\ngrid[0][0] = 9\nprint(grid)\n',
            bad: true,
          },
          right: {
            label: 'Building each row',
            code: 'grid = [[0] * 3 for _ in range(3)]\nprint(grid)\nprint("rows are the same object:", grid[0] is grid[1])\ngrid[0][0] = 9\nprint(grid)\n',
          },
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'One row, listed three times',
          body: 'On the left there is one row, listed three times — setting one cell appears to set three, because there is only ever one row to set. The comprehension on the right runs `[0] * 3` once per row, so each row is a separate list. `[0] * 3` itself is fine, since zeros are immutable and sharing them is harmless; the danger is multiplying a list **of** mutable things.',
        },
        {
          kind: 'quiz',
          prompt: 'You have `board = [["."] * 3 for _ in range(3)]` and want a copy you can experiment on without touching the original. Which of these fails to protect the original board?',
          options: [
            {
              text: 'board[:]',
              correct: true,
              why: 'This copies only the outer list; the rows themselves are still shared, so writing into a square of the copy also changes the original.',
            },
            {
              text: '[row[:] for row in board]',
              why: 'This copies each row individually. Since the squares hold strings, which cannot change, this fully protects the original.',
            },
            {
              text: 'copy.deepcopy(board)',
              why: 'This walks the whole structure and copies every level, so it also fully protects the original — though it does more work than this board actually needs.',
            },
            {
              text: '[list(row) for row in board]',
              why: 'This builds a new list for each row, the same protection as [row[:] for row in board], just written with list() instead of slicing.',
            },
          ],
        },
      ],
    },
    {
      id: 'default-argument',
      title: 'The default that remembers',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the most famous trap in the language, and it follows from one rule: **a default value is worked out once, when the def line runs**, not each time the function is called. For a number or a string that makes no difference; for a list, every call that uses the default shares one list.',
        },
        {
          kind: 'compare',
          caption: 'The same three calls to two functions that look identical. On the left the list grows across calls, because there is exactly one default list, made when the function was defined; passing an explicit bag works normally, and the next default call carries on from where the shared list had got to. The fix is always the same shape: default to None, and build the real value inside the function.',
          left: {
            label: 'A list as the default',
            code: 'def collect(item, bag=[]):\n    bag.append(item)\n    return bag\n\nprint(collect("a"))\nprint(collect("b"))\nprint(collect("c"))\nprint(collect("x", ["own bag"]))\nprint(collect("d"))\n',
            bad: true,
          },
          right: {
            label: 'None as the default',
            code: 'def collect(item, bag=None):\n    if bag is None:\n        bag = []\n    bag.append(item)\n    return bag\n\nprint(collect("a"))\nprint(collect("b"))\nprint(collect("c"))\nprint(collect("x", ["own bag"]))\nprint(collect("d"))\n',
          },
        },
        {
          kind: 'code',
          caption: 'The default really is built once and stored on the function object itself — these are the same object every time, which is why it outlives any one call.',
          code: 'def collect(item, bag=[]):\n    return bag\n\nfirst = collect("a")\nsecond = collect("b")\nprint("same object:", first is second)\nprint("stored on the function:", collect.__defaults__)\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The rule, short',
          body: 'A default value must be immutable. Numbers, strings, `True`, `False`, `None` and tuples are safe; a list, dict, set, or a call to anything, is not — a default of `datetime.date.today()` is the date the program started, not the date the function was called, a bug that can live for months unnoticed. When you need a mutable default, default to `None` and build it in the first line of the body.',
        },
        {
          kind: 'quiz',
          prompt: 'Why does `def collect(item, bag=[]): bag.append(item); return bag` accumulate items across unrelated calls?',
          options: [
            {
              text: 'The default list [] is created once, when the function is defined, and every call that omits bag shares that same list object',
              correct: true,
              why: 'That is the whole mechanism: nothing rebuilds the default between calls, so every call relying on it mutates one shared list.',
            },
            {
              text: 'Lists are mutable, so Python recreates a fresh empty list for every call automatically, but append still remembers old calls',
              why: 'Python does the opposite of recreating it — the very fact that nothing recreates the default list is the cause of the bug.',
            },
            {
              text: 'bag.append(item) is a global side effect, unrelated to how bag was created',
              why: 'The side effect is real, but it is not the cause: the same append inside a function using bag=None and building a new list per call causes no such accumulation.',
            },
            {
              text: 'The function was called with the same argument by accident',
              why: 'No arguments are passed in the calls that trigger this — bag is only ever left at its default, which is exactly when the bug shows up.',
            },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Someone argues that `def add_tag(post, tags=[])` is fine as long as the function never mutates `tags` — it only ever does `return tags + [new]`. Are they right? Is it still a bad idea?',
          answer: 'They are right that it does not misbehave. `tags + [new]` builds a new list and never touches the shared default, so no state leaks between calls.\n\nIt is still a bad idea. The safety depends on every line of the body, now and for ever, avoiding mutation — and the next person to add a line has no warning. The `None` version cannot be broken by a later edit, costs two lines, and tells the reader that the default is "nothing was given" rather than "an empty list that happens to be shared". Treat "mutable default" as a rule, not a judgement call.',
        },
      ],
    },
    {
      id: 'keys',
      title: 'Why keys must be immutable',
      blocks: [
        {
          kind: 'prose',
          body: 'Dicts and sets file each key by its hash. If a key changed after being filed, it would sit in the wrong drawer and could never be found again, so Python refuses mutable keys outright — which is why a tuple works as a dict key and a list does not.',
        },
        {
          kind: 'code',
          caption: 'A coordinate as a key — a tuple of numbers is a natural key for anything grid-shaped: a board position, a row and column, a date as (year, month, day). It costs nothing and reads better than a string glued together from numbers. The last line raises on purpose.',
          code: 'visits = {}\nvisits[(0, 0)] = "start"\nvisits[(2, 3)] = "treasure"\nprint(visits[(2, 3)])\nprint(sorted(visits))\n\nvisits[[4, 5]] = "nope"\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Hashable all the way down',
          body: 'A tuple is hashable only if everything inside it is, so a tuple containing a list is not a valid key either, as the last line of the shell below shows. A value used as a key should be one you would not have wanted to change anyway — wanting to edit a key is usually a sign the information belongs in the value instead.',
        },
        {
          kind: 'shell',
          caption: 'The last line raises on purpose.',
          lines: [
            'hash((1, 2))',
            'hash((1, (2, 3)))',
            'hash(("ana", 71)) == hash(("ana", 71))',
            'hash((1, [2, 3]))',
          ],
        },
        {
          kind: 'code',
          caption: 'Grouping rows under a tuple key.',
          code: 'rows = [\n    ("2026-03", "ana", 71),\n    ("2026-03", "bo", 88),\n    ("2026-04", "ana", 95),\n]\n\nby_month_and_name = {}\nfor month, name, score in rows:\n    by_month_and_name[(month, name)] = score\n\nfor key in sorted(by_month_and_name):\n    print(key, by_month_and_name[key])\n\nprint(by_month_and_name[("2026-04", "ana")])\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'You want to remember which sets of ingredients you have already tried. `tried = set()` then `tried.add({"flour", "egg"})` raises. Give the fix, and explain why the same fix would not work for a dict you wanted to use as a key.',
          answer: 'Use a `frozenset`: `tried.add(frozenset({"flour", "egg"}))`. A frozenset cannot be changed after it is built, so it can be hashed, and two frozensets with the same members are equal regardless of the order they were written — which is exactly what "the same set of ingredients" means.\n\nThere is no frozen dict in the standard library, so the same fix is not available. The usual substitute is a tuple of sorted key-value pairs, `tuple(sorted(d.items()))`, which is hashable as long as the keys and values are. It works, but it is a sign the data might be better represented as a small class or a `dataclass` with `frozen=True`, which is hashable and says what it is.',
        },
      ],
    },
  ],
};

export default lesson;
