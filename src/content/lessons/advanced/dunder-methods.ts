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
          body: 'Python\'s syntax is not reserved for built-in types. `len(x)`, `x == y`, `sorted(xs)`, `x in y` and `print(x)` are all requests that Python forwards to methods with double underscores at each end — **dunder** methods, from "double underscore".\n\nA class that defines none of them still works, but every one of those requests either fails or answers something unhelpful. Watch what a plain class can and cannot do.',
        },
        {
          kind: 'code',
          caption: 'Four ordinary operations, tried on an object that defines nothing. The failures are the point.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\nm = Money(250)\ntrials = [\n    ('len(m)', lambda: len(m)),\n    ('sorted', lambda: sorted([Money(2), Money(1)])),\n    ('250 in m', lambda: 250 in m),\n    ('m == Money(250)', lambda: m == Money(250)),\n    ('str(m) == repr(m)', lambda: str(m) == repr(m)),\n]\nfor label, attempt in trials:\n    try:\n        print(label, '->', attempt())\n    except TypeError as e:\n        print(label, '-> TypeError:', e)\n",
        },
        {
          kind: 'prose',
          body: 'Three of those refused outright. The equality test did not refuse, which is worse: it answered, and the answer it gave was about **identity**, not about money. Two separate objects holding the same number of cents are reported as different.\n\nAnd the display? Look at what the object says about itself.',
        },
        {
          kind: 'code',
          caption: 'The address at the end changes every run, so it is cut off here. Everything before it is fixed.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\nm = Money(250)\nprint(repr(m).split(' object at ')[0] + ' object at 0x...>')\nprint(repr(m) == str(m))\nprint(repr(m).endswith('>'), 'cents' in repr(m))\n",
        },
        {
          kind: 'prose',
          body: 'The default display tells you the class and where the object happens to sit in memory. It does not tell you the one thing you wanted to know, which is how much money it is. Fixing that is the first job.',
        },
      ],
    },
    {
      id: 'repr-first',
      title: '`__repr__` before `__str__`',
      blocks: [
        {
          kind: 'prose',
          body: 'There are two display methods and they have different audiences. `__repr__` is for **you**: unambiguous, aimed at debugging, and ideally looking like the code that would build the object again. `__str__` is for **the person using your program**: readable, formatted, possibly leaving detail out.\n\nWrite `__repr__` first, always, because Python falls back to it and never the other way round.',
        },
        {
          kind: 'code',
          caption: 'Only `__repr__` is defined here. Notice how many different places pick it up.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\nm = Money(250)\nprint(m)\nprint(repr(m), str(m))\nprint([Money(1), Money(2)])\nprint({'price': Money(999)})\nprint(f'the total is {m}')\nprint(repr(m) == str(m))\n",
        },
        {
          kind: 'prose',
          body: 'One method, and the object is now legible when printed on its own, inside a list, inside a dict and inside an f-string. That is the return on writing `__repr__` first.\n\nNow add `__str__` for the friendly form, and watch which places switch and which do not.',
        },
        {
          kind: 'code',
          caption: 'Both defined. The list is the interesting line.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\n    def __str__(self):\n        return f'${self.cents / 100:.2f}'\n\nm = Money(250)\nprint(m)\nprint(repr(m))\nprint([m, Money(50)])\nprint(f'you owe {m}, or exactly {m!r}')\nprint('{} vs {!r}'.format(m, m))\n",
        },
        {
          kind: 'prose',
          body: 'Printing the object alone uses `__str__`. Putting it in a list still uses `__repr__`, because a container shows the repr of everything inside it — a container has no way of knowing whether you want the pretty form, so it shows the honest one. `!r` in an f-string asks for the repr explicitly.',
        },
        {
          kind: 'code',
          caption: 'The same class with `__str__` only, which is the wrong way round.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __str__(self):\n        return f'${self.cents / 100:.2f}'\n\nm = Money(250)\nprint(m)\nprint(str([m]).split(' object at ')[0] + ' 0x...>]')\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'You are debugging a list of 200 of these objects and you print the list. With only `__str__` defined you learn nothing from it. Explain the mechanism in one sentence, and say what `__repr__` should return for a class holding a name and a mark.',
          answer: 'Containers display their contents with `repr`, and `repr` does not fall back to `__str__`, so a list of objects that define only `__str__` prints the default angle-bracket form with an address — exactly the line above. A good `__repr__` looks like the call that would rebuild the object, so for a name and a mark: `f\'Student({self.name!r}, {self.mark!r})\'`. The `!r` on each field matters — it keeps the quotes on the text, so you can see a trailing space or a number that is secretly a string.',
        },
      ],
    },
    {
      id: 'len-and-truth',
      title: '`__len__`, and the truthiness it brings with it',
      blocks: [
        {
          kind: 'prose',
          body: '`len(x)` calls `x.__len__()`. Define it whenever your object wraps a collection and "how many" has an obvious answer.\n\nIt comes with a side effect that catches people out: when an object has no `__bool__`, Python decides truth by asking for the length, and a length of zero is false.',
        },
        {
          kind: 'code',
          caption: 'One method defined; two behaviours gained.',
          code: "class Deck:\n    def __init__(self, cards):\n        self.cards = cards\n\n    def __repr__(self):\n        return f'Deck({self.cards!r})'\n\n    def __len__(self):\n        return len(self.cards)\n\nfull = Deck(['A', 'K', 'Q'])\nempty = Deck([])\nprint(len(full), len(empty))\nprint(bool(full), bool(empty))\nprint('full is truthy' if full else 'full is falsy')\nprint('empty is truthy' if empty else 'empty is falsy')\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Length zero means false',
          body: 'This is what you want for a deck or a basket. It is not what you want for something like a measurement or a vector, where zero is a perfectly real value: `if reading:` would quietly skip a reading of zero. In those cases define `__bool__` yourself and return what you actually mean.',
        },
        {
          kind: 'shell',
          caption: 'The same rule, on types you already use.',
          lines: [
            'bool([]), bool([0]), bool(0), bool(0.0)',
            "bool(''), bool(' ')",
            'bool({}), bool({0: 0})',
            "len(''), len({}), len(set())",
            'bool(None)',
            'bool(range(0)), bool(range(1))',
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
          body: 'Without `__eq__`, `==` on your objects means "the same object in memory". For anything that represents a **value** — money, a point, a date — that is the wrong question. Two five-dollar notes are equal even though they are two notes.\n\nDefining `__eq__` also repairs `in` on a list and the `count`/`index` methods, because all of them compare with `==`.',
        },
        {
          kind: 'code',
          caption: 'Value equality, and the things that quietly start working with it.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\n    def __eq__(self, other):\n        if not isinstance(other, Money):\n            return NotImplemented\n        return self.cents == other.cents\n\na = Money(250)\nb = Money(250)\nprint(a == b, a is b, a != b)\nprint(Money(250) in [Money(100), Money(250)])\nprint([Money(1), Money(2)].index(Money(2)))\nprint(a == 250)\nprint(a == 'two fifty')\n",
        },
        {
          kind: 'prose',
          body: 'Returning `NotImplemented` for a type you do not understand is the polite form. It tells Python "I cannot answer this", so Python asks the other object, and only if that one also declines does it fall back to identity — which is how the comparison against a number and against text ended up answering as it did, instead of raising.\n\nThere is a cost, and it arrives without warning.',
        },
        {
          kind: 'code',
          caption: 'The same class, now asked to go into a set. It raises on purpose.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __eq__(self, other):\n        return isinstance(other, Money) and self.cents == other.cents\n\nprint(Money(250) == Money(250))\nprint({Money(250), Money(100)})\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'Defining `__eq__` removed the object\'s ability to live in a set or be a dict key, and nothing in the class mentions sets. Why does Python do this, and what is the rule for putting it back safely?',
          answer: 'Sets and dicts find things by hash first and compare only within a bucket, so they depend on an invariant: objects that are equal must have the same hash. The inherited hash is based on identity, so two objects your new `__eq__` calls equal would hash to different buckets and the set would happily hold both — a silently broken container. Rather than allow that, Python removes the inherited hash when you define `__eq__`. To put it back, define `__hash__` over the **same fields** `__eq__` compares, usually `hash((self.a, self.b))`. The safety rule: only do this if those fields never change after the object is made, because a hash that changes while the object sits in a set makes it unfindable.',
        },
        {
          kind: 'code',
          caption: 'Hash over the same field that equality uses.',
          code: "class Money:\n    def __init__(self, cents):\n        self.cents = cents\n\n    def __repr__(self):\n        return f'Money({self.cents})'\n\n    def __eq__(self, other):\n        return isinstance(other, Money) and self.cents == other.cents\n\n    def __hash__(self):\n        return hash(self.cents)\n\nwallet = {Money(250), Money(250), Money(100)}\nprint(len(wallet))\nprint(sorted(coin.cents for coin in wallet))\nprint(hash(Money(250)) == hash(Money(250)))\nprint({Money(250): 'lunch'}[Money(250)])\n",
        },
      ],
    },
    {
      id: 'ordering',
      title: '`__lt__` and how sorting really works',
      blocks: [
        {
          kind: 'prose',
          body: '`sorted`, `min` and `max` do not need a full set of comparisons. They need exactly one question: **is this one less than that one?** Answering `__lt__` is enough to power all three, in both directions.',
        },
        {
          kind: 'code',
          caption: 'One comparison method, and four operations start working.',
          code: "class Card:\n    def __init__(self, name, rank):\n        self.name = name\n        self.rank = rank\n\n    def __repr__(self):\n        return f'Card({self.name!r}, {self.rank})'\n\n    def __lt__(self, other):\n        return self.rank < other.rank\n\nhand = [Card('Q', 12), Card('A', 14), Card('7', 7)]\nprint(sorted(hand))\nprint(sorted(hand, reverse=True))\nprint(max(hand), min(hand))\nprint(hand[0] < hand[1], hand[0] > hand[1])\nprint(hand[0] <= hand[1])\n",
        },
        {
          kind: 'prose',
          body: 'The `>` worked without a `__gt__`: Python turns `a > b` around and asks `b.__lt__(a)`. The `<=` on the last line had no such fallback, so that is where the block stopped.\n\nIf you want the full set, write them out or let `functools.total_ordering` fill in the rest from `__lt__` and `__eq__`.',
        },
        {
          kind: 'code',
          caption: 'Two methods written, six comparisons available.',
          code: "import functools\n\n@functools.total_ordering\nclass Card:\n    def __init__(self, name, rank):\n        self.name = name\n        self.rank = rank\n\n    def __repr__(self):\n        return f'Card({self.name!r}, {self.rank})'\n\n    def __eq__(self, other):\n        return self.rank == other.rank\n\n    def __lt__(self, other):\n        return self.rank < other.rank\n\nq, a = Card('Q', 12), Card('A', 14)\nprint(q < a, q <= a, q > a, q >= a, q == a, q != a)\nprint(sorted([a, q, Card('7', 7)]))\n",
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Often you want a key instead',
          body: '`sorted(hand, key=lambda c: c.rank)` needs no dunder at all, and lets each call sort by something different. Define `__lt__` when the class has **one** natural order that everybody would expect. Use `key=` when the order is a decision the caller makes.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A class defines `__lt__` comparing only the rank, and a `__eq__` comparing rank and suit. You sort a list containing two cards of the same rank and different suits, then sort the reversed list. What can you say about where those two cards end up, and why does it not contradict `sorted` being stable?',
          answer: 'Neither card is less than the other, so `sorted` never swaps them: each keeps the position it had relative to the other in the input. That is exactly what stability means — equal-comparing items stay in input order — so sorting the reversed list puts them in the opposite order to sorting the original. Nothing is contradicted; you have simply discovered that the class has two different notions of sameness. When `__lt__` and `__eq__` disagree about which fields matter, results depend on input order, which is why `total_ordering` insists both are defined over the same fields.',
        },
      ],
    },
    {
      id: 'contains',
      title: '`__contains__`: giving `in` a meaning',
      blocks: [
        {
          kind: 'prose',
          body: '`x in thing` tries three things in order: `thing.__contains__(x)`, then failing that it iterates the object with `__iter__` and compares each item, and failing that it gives up. So an iterable object gets `in` for free, and `__contains__` is how you make it faster or make it mean something more specific.',
        },
        {
          kind: 'code',
          caption: 'Membership for free, from iteration alone.',
          code: "class Deck:\n    def __init__(self, cards):\n        self.cards = cards\n\n    def __iter__(self):\n        return iter(self.cards)\n\nd = Deck(['A', 'K', 'Q'])\nprint('A' in d, 'J' in d)\nprint([c.lower() for c in d])\nfor c in d:\n    print('card:', c)\n",
        },
        {
          kind: 'code',
          caption: 'A membership test with rules of its own: case is ignored, and plurals count.',
          code: "class Inventory:\n    def __init__(self, items):\n        self.items = {name.lower() for name in items}\n\n    def __len__(self):\n        return len(self.items)\n\n    def __contains__(self, name):\n        text = name.lower()\n        return text in self.items or text.rstrip('s') in self.items\n\nshed = Inventory(['Hammer', 'nail', 'Saw'])\nprint(len(shed))\nprint('hammer' in shed, 'HAMMER' in shed, 'hammers' in shed)\nprint('drill' in shed)\nprint(sorted(shed.items))\n",
        },
        {
          kind: 'prose',
          body: 'The second class never iterates to answer `in`: it asks a set, which does not care how many items are in it. That speed difference is the subject of the efficiency lesson, and it is the usual reason to write `__contains__` on a class that wraps a big collection.',
        },
      ],
    },
    {
      id: 'together',
      title: 'Before and after',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the same driver code run against two versions of one class. Nothing in the driver changes. All that changes is which dunder methods exist.',
        },
        {
          kind: 'compare',
          caption: 'Same script, same data, five methods apart.',
          left: {
            label: 'Attributes only',
            bad: true,
            code: "class Team:\n    def __init__(self, name, players):\n        self.name = name\n        self.players = players\n\nteams = [Team('Reds', ['a', 'b']), Team('Blues', ['c'])]\nprint(len(teams[0].players))\nprint(teams[0].name)\nprint(sorted(t.name for t in teams))\nprint('a' in teams[0].players)\nprint(teams[0].name == teams[1].name)\n",
          },
          right: {
            label: 'With the dunders',
            code: "class Team:\n    def __init__(self, name, players):\n        self.name = name\n        self.players = players\n\n    def __repr__(self):\n        return f'Team({self.name!r}, {self.players!r})'\n\n    def __len__(self):\n        return len(self.players)\n\n    def __eq__(self, other):\n        return isinstance(other, Team) and self.name == other.name\n\n    def __lt__(self, other):\n        return self.name < other.name\n\n    def __contains__(self, who):\n        return who in self.players\n\nteams = [Team('Reds', ['a', 'b']), Team('Blues', ['c'])]\nprint(len(teams[0]))\nprint(teams[0])\nprint(sorted(teams))\nprint('a' in teams[0])\nprint(teams[0] == teams[1], Team('Reds', []) == teams[0])\n",
          },
        },
        {
          kind: 'prose',
          body: 'The left-hand code works. It just makes every caller reach inside the object and know which attribute holds what. The right-hand version moves that knowledge into the class once, and the callers read like ordinary Python.',
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
            ['__iter__', 'for, list(), unpacking, in as a fallback', 'The object has items worth looping over'],
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Do not add them all out of habit',
          body: 'Each dunder is a promise about how your object behaves with syntax everyone already understands. An order that only makes sense half the time, or an equality that ignores a field that matters, is worse than not defining it at all, because the caller has no reason to suspect it. Write `__repr__` in every class; write the rest when the meaning is obvious.',
        },
      ],
    },
  ],
};

export default lesson;
