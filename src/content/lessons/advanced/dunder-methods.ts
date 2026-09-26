// Advanced: the methods with double underscores that let your objects work with Python's own syntax.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'dunder-methods',
  title: 'Dunder methods',
  summary: 'Teaching your own objects to print, compare, measure and answer `in`',
  track: 'advanced',
  order: 9,
  minutes: 25,
  prereqs: ['classes-and-objects'],
  outcomes: [
    'Explain why `__repr__` is the first method to write and how `__str__` differs',
    'Give an object a length, an equality test and an order',
    'Say why defining `__eq__` costs you the ability to put the object in a set, and fix it',
    'Use `__contains__` to give `in` a meaning of your own',
  ],
  sections: [
    {
      id: 'before',
      title: 'An object with no manners',
      blocks: [
        {
          kind: 'prose',
          body: 'Python\'s syntax is not reserved for built-in types. `len(x)`, `x == y`, `sorted(xs)`, `x in y` and `print(x)` are all requests that Python forwards to methods with double underscores at each end — **dunder** methods, from "double underscore". A class that defines none of them still works, but every one of those requests either fails or answers something unhelpful.',
        },
        {
          kind: 'code',
          caption: 'Four ordinary operations, tried on an object that defines nothing. The failures are the point.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\nm = Money(250)\ntrials = [\n    ('len(m)', lambda: len(m)),\n    ('sorted', lambda: sorted([Money(2), Money(1)])),\n    ('250 in m', lambda: 250 in m),\n    ('m == Money(250)', lambda: m == Money(250)),\n]\nfor label, attempt in trials:\n    try:\n        print(label, '->', attempt())\n    except TypeError as e:\n        print(label, '-> TypeError:', e)\n",
        },
        {
          kind: 'quiz',
          prompt: 'The equality trial above did not raise. It answered `False`, for two objects both holding 250 cents. Why?',
          options: [
            {
              text: 'Without `__eq__`, `==` compares identity, and the two objects are not the same object in memory',
              correct: true,
              why: 'That is the inherited behaviour: `==` falls back to `is`. Two separate `Money` objects with equal contents still count as different, because nothing has told Python that "money" means "same number of cents".',
            },
            { text: '`Money` objects cannot hold the number 250 twice', why: 'Both objects genuinely hold 250; printing `m.cents` for each would show it. The comparison is what gives the wrong answer, not the storage.' },
            { text: 'Python raises a warning instead of comparing', why: 'No warning is raised here — the comparison completes and returns `False`, silently, which is the more dangerous outcome.' },
            { text: 'Only one `Money` object can exist at a time', why: 'Nothing prevents making as many `Money` objects as you like; `Money(2)` and `Money(1)` above are two of several created in this block alone.' },
          ],
        },
        {
          kind: 'prose',
          body: 'The display is unhelpful in a different way: it names the class and where the object sits in memory, not what it is worth. Fixing that is the first job.',
        },
      ],
    },
    {
      id: 'repr-first',
      title: '`__repr__` before `__str__`',
      blocks: [
        {
          kind: 'prose',
          body: 'There are two display methods for different audiences. `__repr__` is for **you**: unambiguous, aimed at debugging, ideally looking like the code that would build the object again. `__str__` is for **the person using your program**: readable, formatted, possibly leaving detail out. Write `__repr__` first, always — Python falls back to it, and never the other way round.',
        },
        {
          kind: 'code',
          caption: 'Only `__repr__` is defined here. Notice how many places pick it up.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\nm = Money(250)\nprint(m)\nprint([Money(1), Money(2)])\nprint({'price': Money(999)})\nprint(f'the total is {m}')\n",
        },
        {
          kind: 'predict',
          ask: 'Now `__str__` is added too, giving the friendly dollar form. What does printing the *list* show — the friendly form or the debugging form?',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\n    def __str__(self):\n        return f'${self.cents / 100:.2f}'\n\nm = Money(250)\nprint(m)\nprint([m, Money(50)])\n",
          choices: [
            '$2.50\n[$2.50, $0.50]',
            '$2.50\n[Money(250), Money(50)]',
            'Money(250)\n[Money(250), Money(50)]',
            'Money(250)\n[$2.50, $0.50]',
          ],
        },
        {
          kind: 'prose',
          body: 'Printing the object alone uses `__str__`. Putting it in a list still uses `__repr__`, because a container has no way of knowing whether you want the pretty form, so it always shows the honest one. `!r` in an f-string asks for the repr explicitly, even outside a container.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A class defines only `__str__`, and you print a list of 200 of these objects. Explain the mechanism in one sentence, and say what `__repr__` should return for a class holding a name and a mark.',
          answer: 'Containers display their contents with `repr`, and `repr` never falls back to `__str__`, so a list of objects that define only `__str__` prints the default angle-bracket form with a memory address. A good `__repr__` looks like the call that rebuilds the object: `f\'Student({self.name!r}, {self.mark!r})\'` — the `!r` on each field keeps the quotes on text, so a trailing space or a number secretly stored as a string is still visible.',
        },
      ],
    },
    {
      id: 'len-and-truth',
      title: '`__len__`, and the truthiness it brings with it',
      blocks: [
        {
          kind: 'prose',
          body: '`len(x)` calls `x.__len__()`. Define it whenever your object wraps a collection and "how many" has an obvious answer. It comes with a side effect: when an object has no `__bool__`, Python decides truth by asking for the length, and a length of zero is false.',
        },
        {
          kind: 'code',
          caption: 'One method defined; two behaviours gained.',
          code: "class Deck:\n    def __init__(self, cards):\n        self.cards = cards\n\n    def __len__(self):\n        return len(self.cards)\n\nfull = Deck(['A', 'K', 'Q'])\nempty = Deck([])\nprint(len(full), len(empty))\nprint(bool(full), bool(empty))\nprint('full is truthy' if full else 'full is falsy')\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Length zero means false',
          body: 'Right for a deck or a basket; wrong for something like a measurement or a vector, where zero is a real value — `if reading:` would quietly skip a reading of zero. In those cases define `__bool__` yourself and return what you actually mean.',
        },
        {
          kind: 'quiz',
          prompt: 'A class wraps one sensor reading, `self.value`, and wants `if reading:` to mean "a reading exists", true even when the value is exactly `0.0`. Someone writes `def __len__(self): return 1`. What is wrong with that?',
          options: [
            {
              text: 'It answers a question about size for something that has no size — write `__bool__` instead',
              correct: true,
              why: '`__len__` promises "how many items", and a reading is not a collection. `__bool__` is the method built for exactly this question and does not misuse a different promise to get there.',
            },
            { text: 'Nothing — returning 1 always makes the object truthy, which is the goal', why: 'It achieves the immediate goal by accident, but it also makes `len(reading)` return 1, which is meaningless for a single value and misleading to any caller who checks it.' },
            { text: '`__len__` must return `True` or `False`, not a number', why: '`__len__` is required to return a non-negative integer; Python converts a nonzero length to true itself. The problem is the choice of method, not the return type.' },
            { text: 'Truthiness cannot be customised for a class at all', why: 'It can: `__bool__` exists precisely to let a class decide truthiness itself, overriding the length-based fallback.' },
          ],
        },
      ],
    },
    {
      id: 'equality',
      title: '`__eq__`, and what it takes away',
      blocks: [
        {
          kind: 'prose',
          body: 'Without `__eq__`, `==` on your objects means "the same object in memory" — wrong for anything that represents a **value**: money, a point, a date. Defining `__eq__` also repairs `in` on a list and `.count`/`.index`, because all of them compare with `==`.',
        },
        {
          kind: 'code',
          caption: 'Value equality, and the things that quietly start working with it.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __eq__(self, other):\n        if not isinstance(other, Money):\n            return NotImplemented\n        return self.cents == other.cents\n\na = Money(250)\nb = Money(250)\nprint(a == b, a is b, a != b)\nprint(Money(250) in [Money(100), Money(250)])\nprint(a == 250)\n",
        },
        {
          kind: 'prose',
          body: 'Returning `NotImplemented` for a type you do not understand is the polite form: it tells Python "I cannot answer this", so Python asks the other object, and only if that one also declines does it fall back to identity. There is a cost, and it arrives without warning.',
        },
        {
          kind: 'predict',
          ask: 'This class defines `__eq__` and nothing else, then goes into a set. What happens?',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __eq__(self, other):\n        return isinstance(other, Money) and self.cents == other.cents\n\ntry:\n    print({Money(250), Money(100)})\nexcept TypeError as e:\n    print('TypeError:', e)\n",
          choices: [
            "TypeError: cannot use 'Money' as a set element (unhashable type: 'Money')",
            'A set containing both Money objects',
            'A set containing only one Money object',
            'An empty set',
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Defining `__eq__` removed the object\'s ability to live in a set, and nothing in the class mentions sets. Why does Python do this, and what is the rule for putting it back safely?',
          answer: 'Sets and dicts find things by hash first and compare only within a bucket, relying on an invariant: objects that are equal must have the same hash. The inherited hash is based on identity, so two objects the new `__eq__` calls equal would hash to different buckets, silently breaking the set. Python removes the inherited hash whenever `__eq__` is defined. To restore it, define `__hash__` over the same fields `__eq__` compares — usually `hash(self.cents)` — and only do this if those fields never change after the object is made, because a hash that changes while the object sits in a set makes it unfindable.',
        },
        {
          kind: 'code',
          caption: 'Hash over the same field that equality uses.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __eq__(self, other):\n        return isinstance(other, Money) and self.cents == other.cents\n\n    def __hash__(self):\n        return hash(self.cents)\n\nwallet = {Money(250), Money(250), Money(100)}\nprint(len(wallet))\nprint(sorted(coin.cents for coin in wallet))\n",
        },
      ],
    },
    {
      id: 'ordering',
      title: '`__lt__` and how sorting really works',
      blocks: [
        {
          kind: 'prose',
          body: '`sorted`, `min` and `max` do not need a full set of comparisons. They need one question: **is this one less than that one?** Answering `__lt__` is enough to power all three, in both directions — Python turns `a > b` around and asks `b.__lt__(a)`.',
        },
        {
          kind: 'code',
          caption: 'One comparison method, and several operations start working.',
          code: "class Card:\n    def __init__(self, name, rank):\n        self.name = name\n        self.rank = rank\n\n    def __repr__(self):\n        return f'Card({self.name!r}, {self.rank})'\n\n    def __lt__(self, other):\n        return self.rank < other.rank\n\nhand = [Card('Q', 12), Card('A', 14), Card('7', 7)]\nprint(sorted(hand))\nprint(max(hand), min(hand))\nprint(hand[0] < hand[1], hand[0] > hand[1])\n",
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Often you want a key instead',
          body: '`sorted(hand, key=lambda c: c.rank)` needs no dunder at all, and lets each call sort by something different. Define `__lt__` when the class has **one** natural order everybody would expect; use `key=` when the order is the caller\'s decision.',
        },
        {
          kind: 'match',
          ask: 'Match each piece of syntax to the dunder method that answers it.',
          pairs: [
            { left: 'len(x)', right: '__len__' },
            { left: 'x == y', right: '__eq__' },
            { left: 'sorted(xs), min(xs)', right: '__lt__' },
            { left: 'x in y', right: '__contains__' },
            { left: 'print(x)', right: '__str__' },
            { left: 'a set or dict key', right: '__hash__' },
          ],
        },
      ],
    },
    {
      id: 'contains',
      title: '`__contains__`: giving `in` a meaning',
      blocks: [
        {
          kind: 'prose',
          body: '`x in thing` tries `thing.__contains__(x)` first, then falls back to iterating with `__iter__` and comparing each item, then gives up. So an iterable object gets `in` for free, and `__contains__` is how you make it faster or make it mean something more specific.',
        },
        {
          kind: 'code',
          caption: 'A membership test with rules of its own: case is ignored, and plurals count.',
          code: "class Inventory:\n    def __init__(self, items):\n        self.items = {name.lower() for name in items}\n\n    def __contains__(self, name):\n        text = name.lower()\n        return text in self.items or text.rstrip('s') in self.items\n\nshed = Inventory(['Hammer', 'nail', 'Saw'])\nprint('hammer' in shed, 'HAMMER' in shed, 'hammers' in shed)\nprint('drill' in shed)\n",
        },
        {
          kind: 'prose',
          body: 'That class never iterates to answer `in`: it asks a set, which does not care how many items are in it. That speed difference is the usual reason to write `__contains__` on a class that wraps a big collection.',
        },
      ],
    },
    {
      id: 'together',
      title: 'Before and after',
      blocks: [
        {
          kind: 'interactive',
          experiment: {
            id: 'which-dunders-exist',
            title: 'Add a dunder, watch one more thing start working',
            intro: 'Choose which methods the class defines. The five trials below are unchanged; only the class changes.',
            template: "class Team:\n    def __init__(self, name, players):\n        self.name = name\n        self.players = players\n\n⟦dunders⟧\n\nteams = [Team('Reds', ['a', 'b']), Team('Blues', ['c'])]\ntrials = [\n    ('str', lambda: str(teams[0])),\n    ('len', lambda: len(teams[0])),\n    ('sorted names', lambda: [t.name for t in sorted(teams)]),\n    ('a in team', lambda: 'a' in teams[0]),\n    ('equal', lambda: teams[0] == Team('Reds', [])),\n]\nfor label, attempt in trials:\n    try:\n        print(label, '->', attempt())\n    except TypeError:\n        print(label, '-> TypeError')\n",
            knobs: [
              {
                id: 'dunders',
                label: 'which dunders are defined',
                choices: [
                  { value: 'pass', caption: 'none' },
                  { value: "Team.__repr__ = lambda self: f'Team({self.name!r})'", caption: 'repr only' },
                  {
                    value:
                      "Team.__repr__ = lambda self: f'Team({self.name!r})'; Team.__len__ = lambda self: len(self.players)",
                    caption: 'repr + len',
                  },
                  {
                    value:
                      "Team.__repr__ = lambda self: f'Team({self.name!r})'; Team.__len__ = lambda self: len(self.players); Team.__eq__ = lambda self, other: self.name == other.name; Team.__lt__ = lambda self, other: self.name < other.name; Team.__contains__ = lambda self, who: who in self.players",
                    caption: 'all five',
                  },
                ],
              },
            ],
            notes: {
              '0': 'Nothing defined. `str` falls back to the default display, `len` and membership both refuse with a `TypeError`, `sorted` refuses too because there is no `__lt__`, and equality answers `False` by identity — two different `Team` objects are never equal, whatever they hold.',
              '1': 'Printing improved and nothing else did. `__repr__` only teaches Python how to display the object; it has no opinion on length, order or membership.',
              '2': '`len` now works, because `__len__` exists. `sorted` and `in` still refuse: a size is not an order, and it is not a way of asking "is this inside you".',
              '3': 'All five trials succeed. Nothing about `Team` changed except which promises it makes — each dunder answers exactly one piece of syntax, and only that one.',
            },
            takeaway: 'Every one of `len(x)`, `sorted(xs)`, `x in y`, `x == y` and `print(x)` is a separate promise, answered by a separate method. Defining one never buys you another — `__len__` never got you `in`, and `__repr__` never got you `sorted`.',
          },
        },
        {
          kind: 'table',
          caption: 'The ones worth knowing, roughly in the order you would add them.',
          head: ['Method', 'Called by', 'Add it when'],
          rows: [
            ['__repr__', 'repr(x), printing a container of x, the shell', 'Always. It is the first one to write'],
            ['__str__', 'print(x), str(x), f-strings', 'The friendly form differs from the debugging form'],
            ['__len__', 'len(x), and truth testing', 'The object wraps a collection'],
            ['__eq__', 'x == y, in on a list, .index, .count', 'Two objects with the same contents should count as one value'],
            ['__hash__', 'sets, dict keys', 'You defined __eq__ and the fields never change'],
            ['__lt__', 'sorted, min, max, x < y', 'There is one order everyone would expect'],
            ['__contains__', 'x in y', 'Membership has a faster or more specific meaning than scanning'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A class defines `__lt__` comparing only rank, and `__eq__` comparing rank and suit. Sorting a list containing two same-rank, different-suit cards puts them in input order; sorting the reversed list reverses them. Why does this not contradict `sorted` being stable?',
          answer: 'Neither card is less than the other, so `sorted` never swaps them — stability means equal-comparing items keep their relative input order. Sorting the reversed list therefore produces the opposite order to sorting the original, which is exactly what stability predicts, not a contradiction. What it reveals is that the class has two different notions of sameness: `__lt__` and `__eq__` disagree about which fields matter, so results depend on input order — the reason `functools.total_ordering`, which builds the other comparisons from these two, simply assumes they agree: nothing checks it for you.',
        },
      ],
    },
  ],
};

export default lesson;
