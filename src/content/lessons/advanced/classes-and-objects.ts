// Advanced: what a class is for, and when it is the wrong tool.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'classes-and-objects',
  title: 'Classes and objects',
  summary: 'Keeping data and the behaviour that belongs to it in one place, and knowing when not to',
  track: 'advanced',
  order: 8,
  minutes: 25,
  outcomes: [
    'Say what a class gives you that a pile of variables does not',
    'Write `__init__`, store state on `self`, and add methods that use it',
    'Tell an instance attribute from a class attribute, and avoid the shared-mutable trap',
    'Decide when a function, a dict or a tuple is the better answer',
  ],
  sections: [
    {
      id: 'why-objects',
      title: 'The problem classes solve',
      blocks: [
        {
          kind: 'prose',
          body: 'You already know how to keep data in lists and dictionaries and how to write functions that work on them. A class is not a new kind of power. It is a way of keeping **one thing\'s data and the operations on that data in one place**, so they cannot drift apart.\n\nHere is what drifting apart looks like. Two lists hold the parts of the same accounts, and nothing in the language makes them stay the same length.',
        },
        {
          kind: 'compare',
          caption: 'Both versions add an account. Only one of them survives it.',
          left: {
            label: 'Parts kept in parallel lists',
            bad: true,
            code: "names = ['Ada', 'Grace']\nbalances = [120.0, 40.0]\n\ndef deposit(i, amount):\n    balances[i] = balances[i] + amount\n\ndeposit(0, 30.0)\nnames.append('Alan')          # a new account, added in one place only\nprint(names[2], balances[2])\n",
          },
          right: {
            label: 'One object per account',
            code: "class Account:\n    def __init__(self, name, balance):\n        self.name = name\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance = self.balance + amount\n\naccounts = [Account('Ada', 120.0), Account('Grace', 40.0)]\naccounts[0].deposit(30.0)\naccounts.append(Account('Alan', 0.0))\nprint(accounts[2].name, accounts[2].balance)\nprint(accounts[0].balance)\n",
          },
        },
        {
          kind: 'prose',
          body: 'The left-hand version does not fail because of a typo. It fails because the design allows a half-finished account to exist. An `Account` object cannot be half-finished: making one demands both parts at once, and the name and the balance travel together for the rest of their lives.\n\nThat is the reason to reach for a class. Not "this is the advanced way", but "these pieces belong to each other and I want the language to enforce it".',
        },
      ],
    },
    {
      id: 'what-an-object-is',
      title: 'What an object actually is',
      blocks: [
        {
          kind: 'prose',
          body: 'Strip away the vocabulary and an object is a small bag of named values, plus a label saying what kind of thing it is. You can watch that in the shell. `vars()` shows the bag; `type()` shows the label.',
        },
        {
          kind: 'shell',
          caption: 'A class with an empty body is legal, and enough to make objects with.',
          lines: [
            'class Dog: pass',
            'd = Dog()',
            'vars(d)',
            "d.name = 'Rex'",
            'd.age = 4',
            'vars(d)',
            'd.name',
            'type(d)',
            'isinstance(d, Dog)',
            'e = Dog()',
            'vars(e)',
            'd is e',
          ],
        },
        {
          kind: 'prose',
          body: 'Two facts from that session are worth holding on to. Each object carries **its own** bag: creating a second `Dog` did not inherit the first one\'s name. And the class is the label, not the contents: both objects are `Dog`s while holding completely different things.\n\nWriting attributes on from outside, the way that session did, works but is a poor habit. Anyone reading the class has no idea what a `Dog` is supposed to hold. That is what `__init__` is for.',
        },
      ],
    },
    {
      id: 'init-and-self',
      title: '`__init__` and `self`',
      blocks: [
        {
          kind: 'prose',
          body: '`__init__` runs automatically, once, straight after a new object is made. Its job is to put the object into a usable state: every attribute the rest of the class relies on should be set here, so a reader can learn the whole shape of the object from one method.\n\nThe first parameter, `self`, is the object being set up. The name is a convention, not a keyword, but use it: every Python reader expects it.',
        },
        {
          kind: 'code',
          caption: 'Two accounts, made from one class.',
          code: "class Account:\n    def __init__(self, name, balance):\n        self.name = name\n        self.balance = balance\n\na = Account('Ada', 120.0)\nb = Account('Grace', 40.0)\nprint(a.name, a.balance)\nprint(b.name, b.balance)\nprint(vars(a))\nprint(vars(b))\nprint(a is b, type(a) is type(b))\n",
        },
        {
          kind: 'prose',
          body: 'Notice what `Account(...)` gave back, and what the two bags hold. `self.name = name` is not a mystery: on the left is an attribute of this one object, on the right is the argument that was passed in. They are spelled the same here out of habit, and you could call the parameter anything.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A bare `name = name` does nothing useful',
          body: 'Inside `__init__`, writing `name = name` makes a local variable that dies when the method ends. Only assignments to `self.something` outlive the call. If an attribute is missing later, this is the first thing to check.',
        },
        {
          kind: 'code',
          caption: 'The same class with the `self.` left off. It raises on purpose.',
          code: "class Account:\n    def __init__(self, name, balance):\n        name = name\n        balance = balance\n\na = Account('Ada', 120.0)\nprint(a.name)\n",
        },
      ],
    },
    {
      id: 'methods',
      title: 'Methods: behaviour that belongs to the data',
      blocks: [
        {
          kind: 'prose',
          body: 'A method is a function written inside the class, taking the object as its first argument. The dot call is the short way of writing it, and Python turns one into the other for you.',
        },
        {
          kind: 'code',
          caption: 'The same deposit, called two ways.',
          code: "class Account:\n    def __init__(self, name, balance):\n        self.name = name\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance = self.balance + amount\n        return self.balance\n\n    def can_afford(self, cost):\n        return cost <= self.balance\n\na = Account('Ada', 100.0)\nprint(a.deposit(10.0))\nprint(Account.deposit(a, 10.0))\nprint(a.balance)\nprint(a.can_afford(50.0), a.can_afford(500.0))\nprint(type(a.deposit).__name__, type(Account.deposit).__name__)\n",
        },
        {
          kind: 'prose',
          body: '`a.deposit(10.0)` and `Account.deposit(a, 10.0)` did the same work, and the balance shows both deposits landed. The dot form fills in the first argument with the object on the left of the dot. That is the whole of `self`.\n\nThe last line is the same idea seen from the other end: reached through an instance the function has become something that already knows its object, and reached through the class it has not.',
        },
        {
          kind: 'code',
          caption: 'A method written without `self` in its signature. This one raises, and the message is worth reading closely.',
          code: "class Account:\n    def __init__(self, balance):\n        self.balance = balance\n\n    def deposit(amount):\n        return amount\n\na = Account(100.0)\nprint(a.deposit(10.0))\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'The call above passed one argument, and the complaint counts two. Where did the second one come from, and why does adding `self` to the signature fix it rather than hiding the problem?',
          answer: 'The dot call always passes the object on the left of the dot as the first argument, so `a.deposit(10.0)` really hands over two values: `a` and `10.0`. The method as written has room for one. Adding `self` does not silence anything — it gives the object somewhere to land, which is what the method needed all along if it is ever to read `self.balance`. A method that genuinely has no use for the object is a sign it should not be a method at all.',
        },
        {
          kind: 'prose',
          body: 'A useful habit when naming methods: a method that **changes** the object (`deposit`, `append`, `sort`) usually returns nothing, and a method that **answers a question** about it (`can_afford`, `count`, `sorted`) returns a value and changes nothing. Mixing the two in one method is how surprising bugs get written.',
        },
      ],
    },
    {
      id: 'class-vs-instance',
      title: 'Class attributes and the shared trap',
      blocks: [
        {
          kind: 'prose',
          body: 'An attribute written in the class body, outside any method, belongs to the **class**. Every instance can see it, and there is only one of it. An attribute assigned through `self` belongs to that **instance** alone.\n\nReading follows a simple order: the instance\'s own bag first, the class second. Writing never follows that order — it always makes an instance attribute.',
        },
        {
          kind: 'shell',
          caption: 'One value in the class body, two dogs looking at it.',
          lines: [
            'class Dog: legs = 4',
            'a = Dog()',
            'b = Dog()',
            'a.legs, b.legs, Dog.legs',
            'vars(a)',
            'a.legs = 3',
            'a.legs, b.legs, Dog.legs',
            'vars(a)',
            'Dog.legs = 5',
            'a.legs, b.legs',
          ],
        },
        {
          kind: 'prose',
          body: 'Assigning to `a.legs` did not change the class or the other dog: it put a value in `a`\'s own bag, which is then found first. Changing the class attribute afterwards moved `b`, which still has nothing of its own, and left `a` where it was.\n\nThat is harmless for a number. It is not harmless for a list or a dict, because there you usually **change the object in place** instead of assigning a new one, and in-place changes are visible to everyone sharing it.',
        },
        {
          kind: 'compare',
          caption: 'Two baskets, filled one apple at a time.',
          left: {
            label: 'List in the class body',
            bad: true,
            code: "class Basket:\n    items = []\n\n    def add(self, thing):\n        self.items.append(thing)\n\nb1 = Basket()\nb2 = Basket()\nb1.add('apple')\nb2.add('pear')\nprint(b1.items)\nprint(b2.items)\nprint(b1.items is b2.items)\n",
          },
          right: {
            label: 'List made per instance in `__init__`',
            code: "class Basket:\n    def __init__(self):\n        self.items = []\n\n    def add(self, thing):\n        self.items.append(thing)\n\nb1 = Basket()\nb2 = Basket()\nb1.add('apple')\nb2.add('pear')\nprint(b1.items)\nprint(b2.items)\nprint(b1.items is b2.items)\n",
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Anything mutable belongs in `__init__`',
          body: 'A list, dict or set written in the class body is created once, when the class is defined, and shared by every object of that class for the whole run. This is the same trap as a mutable default argument in a function, and it is found late because it only shows up once a second object exists.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'where-the-list-is-made',
            title: 'One word decides whether it is shared',
            intro: 'Choose where `items` is created. Both versions look reasonable; only one of them gives every basket its own list.',
            template: "class Basket:\n    ⟦decl⟧\n\n    def add(self, thing):\n        self.items.append(thing)\n\nb1 = Basket()\nb2 = Basket()\nb1.add('apple')\nb2.add('pear')\nprint(b1.items)\nprint(b2.items)\nprint(b1.items is b2.items)\n",
            knobs: [
              {
                id: 'decl',
                label: 'where items is created',
                choices: [
                  { value: 'items = []', caption: 'in the class body' },
                  { value: 'def __init__(self): self.items = []', caption: 'inside __init__' },
                ],
              },
            ],
            notes: {
              '0': "One list, made once when the class was defined. Both baskets read `self.items`, find nothing of their own, and fall back to that same class attribute — so `b1.add('apple')` and `b2.add('pear')` both land in it, and `b1.items is b2.items` is `True`.",
              '1': "`__init__` runs once per basket and creates a fresh list each time. `b1.items` and `b2.items` are now different objects, so each basket only ever holds what was added to it.",
            },
            takeaway: 'The class body runs once, when the class is defined; `__init__` runs once per object. A mutable value written in the class body is therefore one object shared by everyone, and a mutable value assigned in `__init__` is a new one per instance — the only difference is which of those two places the line sits in.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'A class has `counts = {}` in its body and a method whose only line is `self.counts[word] = 1`. A second method\'s only line is `self.counts = {}`. Which of the two changes what other instances see, and why are they different when both are spelled with `self.counts`?',
          answer: 'The first one changes what everyone sees. `self.counts[word] = 1` looks up `counts`, finds nothing in the instance bag, falls back to the class attribute, and then mutates that one shared dict in place. The second one is an assignment to `self.counts`, and assignment never falls back: it creates an instance attribute, so that instance stops seeing the shared dict entirely and no one else is affected. Same spelling, different operation — one reads then mutates, the other binds.',
        },
      ],
    },
    {
      id: 'when-not-a-class',
      title: 'When a class is the wrong tool',
      blocks: [
        {
          kind: 'prose',
          body: 'Classes are over-used by people who have recently learned them. The test is not "is this a thing in the real world". The test is: **is there state that several operations share?** If there is not, a class adds a layer between the reader and the work.',
        },
        {
          kind: 'code',
          caption: 'A class that never touches `self` is a function wearing a costume.',
          code: "class Stats:\n    def mean(self, values):\n        return sum(values) / len(values)\n\ndef mean(values):\n    return sum(values) / len(values)\n\nprint(Stats().mean([2, 4, 9]))\nprint(mean([2, 4, 9]))\nprint(Stats.mean(None, [2, 4, 9]))\n",
        },
        {
          kind: 'prose',
          body: 'All three lines agree, and the last one is the giveaway: the method works with `None` where the object should be, because it never looks at `self`. Creating a `Stats()` only to throw it away is a signal you can learn to spot in your own code.\n\nThe other common alternative is a plain dict or tuple for data with no behaviour attached — especially data that arrived from a file or a web service, where the keys are decided elsewhere and might change.',
        },
        {
          kind: 'table',
          caption: 'Choosing the shape of some data.',
          head: ['Shape', 'Fits when', 'Gives up'],
          rows: [
            ['Tuple', 'Two or three values with a fixed order and no behaviour', 'Names for the parts; it cannot be changed'],
            ['Dict', 'Keys decided by data, not by you; shape varies row to row', 'Typo protection; no place to hang behaviour'],
            ['Function', 'One operation, all its inputs in the arguments', 'Nothing remembered between calls'],
            ['Class', 'State that several operations read and change together', 'Some ceremony: a definition to read before the work'],
          ],
        },
        {
          kind: 'shell',
          caption: 'A dict is a perfectly respectable record, and it costs one line.',
          lines: [
            "row = {'name': 'Ada', 'mark': 72}",
            "row['mark']",
            "row['marc']",
            "sorted(row)",
            "row['grade'] = 'D'",
            'row',
          ],
        },
        {
          kind: 'prose',
          body: 'That mistyped key is the price of a dict: nothing checks the spelling, and you find out when it runs. A class with named attributes catches it earlier, and the next lesson on dataclasses makes writing such a class almost free. Neither is correct in every case — choose by what changes.',
        },
      ],
    },
    {
      id: 'shaping',
      title: 'Shaping a class well',
      blocks: [
        {
          kind: 'steps',
          title: 'When you write one',
          items: [
            'Name the thing first. If you cannot name it in one noun, the class is doing more than one job.',
            'Set every attribute in `__init__`, even the ones that start empty. A reader should learn the whole shape from one method.',
            'Keep mutable attributes (lists, dicts, sets) inside `__init__`, never in the class body.',
            'Let each method either change the object or answer a question about it, not both.',
            'If a method never mentions `self`, move it out and make it a function.',
          ],
        },
        {
          kind: 'code',
          caption: 'A small class that follows all five.',
          code: "class Marks:\n    def __init__(self, unit):\n        self.unit = unit\n        self.scores = []\n\n    def record(self, score):\n        self.scores.append(score)\n\n    def average(self):\n        if not self.scores:\n            return 0.0\n        return sum(self.scores) / len(self.scores)\n\n    def best(self):\n        return max(self.scores, default=0)\n\ncits = Marks('CITS1401')\nprint(cits.average(), cits.best())\nfor s in [62, 78, 55]:\n    cits.record(s)\nprint(cits.scores)\nprint(cits.average())\nprint(cits.best())\nprint(vars(Marks('OTHER')))\n",
        },
        {
          kind: 'prose',
          body: 'The empty case was handled without a special "have I started yet" flag, because `__init__` guaranteed `self.scores` exists from the first moment. That is the quiet benefit of setting everything up front: the rest of the class has fewer states to worry about.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are asked to write code that reads 2000 rows of `(student_id, mark)` from a file and reports the highest mark per student. Someone suggests a `Student` class with `add_mark` and `best`. What question decides whether that is a good idea, and what would you write if the answer is no?',
          answer: 'The question is whether anything else happens to a student besides accumulating marks. If the whole program is "group, then take the max", there is no shared state worth a class and no behaviour to attach — a dict from id to a list of marks, or straight to a running maximum, says everything in a couple of lines and is faster to read. The class earns its place the moment students grow other behaviour that depends on the same state: a pass flag, a weighted average, a printable report. Write the dict version first; promote it to a class when the second operation arrives.',
        },
      ],
    },
  ],
};

export default lesson;
