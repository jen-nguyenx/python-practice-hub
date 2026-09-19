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
          body: 'You already keep data in lists and dictionaries and write functions that work on them. A class does one specific job: it keeps **one thing\'s data and the operations on that data in one place**, so they cannot drift apart.\n\nHere is what drifting apart looks like. Two lists hold the parts of the same accounts, and nothing in the language forces them to stay in step.',
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
          kind: 'quiz',
          prompt: 'The left-hand version does not crash on a typo. Why does it fail?',
          options: [
            {
              text: 'The design allows a half-finished account to exist',
              correct: true,
              why: 'Appending to `names` without appending to `balances` is legal Python. Nothing ties the two lists together, so an account can exist in one and not the other.',
            },
            { text: '`append` is the wrong method to add an item to a list', why: '`append` is correct and works exactly as intended. The bug is not in that call, it is in there being two lists to keep in step at all.' },
            { text: 'Python lists cannot hold both text and numbers across two lists', why: 'They can, and do here without complaint. The mismatch is in length, not in type.' },
            { text: 'The `deposit` function has a bug in its arithmetic', why: 'The arithmetic is right: `balances[0]` genuinely gains 30.0. The account added afterwards is the one that breaks.' },
          ],
        },
        {
          kind: 'prose',
          body: 'An `Account` object cannot be half-finished: making one demands a name and a balance at once, and the two travel together for the rest of their lives. That is the reason to reach for a class — not "this is the advanced way", but "these pieces belong to each other and I want the language to enforce it".',
        },
      ],
    },
    {
      id: 'what-an-object-is',
      title: 'What an object actually is',
      blocks: [
        {
          kind: 'prose',
          body: 'Strip away the vocabulary and an object is a small bag of named values, plus a label saying what kind of thing it is. `vars()` shows the bag; `type()` shows the label.',
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
            'type(d)',
            'isinstance(d, Dog)',
            'e = Dog()',
            'vars(e)',
            'd is e',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Two `Dog` objects were made above, and only one of them got a `name`. What does that show about how objects hold data?',
          options: [
            {
              text: 'Each object carries its own bag; nothing is shared between instances by default',
              correct: true,
              why: '`vars(e)` came back empty. Making a second `Dog` did not inherit the first one\'s attributes — each object starts with a bag of its own.',
            },
            { text: 'The class itself changed once `d.name` was set', why: 'The class did not change. `Dog.name` still does not exist; only `d`, one specific object, gained the attribute.' },
            { text: '`d` and `e` are two names for the same object', why: '`d is e` says `False`. They are two separate objects, made by two separate calls to `Dog()`.' },
            { text: 'Setting an attribute from outside the class is required to give an object any data', why: 'It works here, but it is a poor habit for exactly the reason this section is heading toward: a reader of `Dog` has no way to know what a `Dog` is supposed to hold.' },
          ],
        },
      ],
    },
    {
      id: 'init-and-self',
      title: '`__init__` and `self`',
      blocks: [
        {
          kind: 'prose',
          body: '`__init__` runs automatically, once, straight after a new object is made. Its job is to put the object into a usable state, so a reader can learn the whole shape of the object from one method. The first parameter, `self`, is the object being set up — a convention, not a keyword, but every Python reader expects it.',
        },
        {
          kind: 'code',
          caption: 'Two accounts, made from one class.',
          code: "class Account:\n    def __init__(self, name, balance):\n        self.name = name\n        self.balance = balance\n\na = Account('Ada', 120.0)\nb = Account('Grace', 40.0)\nprint(a.name, a.balance)\nprint(b.name, b.balance)\nprint(a is b, type(a) is type(b))\n",
        },
        {
          kind: 'order',
          ask: 'These lines build a working `Point` class and use it. Drag them into an order that runs.',
          lines: [
            { text: 'class Point:', indent: 0 },
            { text: 'def __init__(self, x, y):', indent: 1 },
            { text: 'self.x = x', indent: 2 },
            { text: 'self.y = y', indent: 2 },
            { text: 'def move(self, dx):', indent: 1 },
            { text: 'self.x = self.x + dx', indent: 2 },
            { text: 'p = Point(0, 0)', indent: 0 },
          ],
        },
        {
          kind: 'predict',
          ask: 'Here `self.` is left off inside `__init__`. What prints?',
          code: "class Account:\n    def __init__(self, name, balance):\n        name = name\n        balance = balance\n\na = Account('Ada', 120.0)\ntry:\n    print(a.name)\nexcept AttributeError as e:\n    print('AttributeError:', e)\n",
          choices: [
            'Ada',
            "AttributeError: 'Account' object has no attribute 'name'",
            '120.0',
            'None',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A bare `name = name` does nothing useful',
          body: 'It makes a local variable that dies when `__init__` ends. Only assignments to `self.something` outlive the call. If an attribute is missing later, this is the first thing to check.',
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
          code: "class Account:\n    def __init__(self, name, balance):\n        self.name = name\n        self.balance = balance\n\n    def deposit(self, amount):\n        self.balance = self.balance + amount\n        return self.balance\n\n    def can_afford(self, cost):\n        return cost <= self.balance\n\na = Account('Ada', 100.0)\nprint(a.deposit(10.0))\nprint(Account.deposit(a, 10.0))\nprint(a.balance)\nprint(a.can_afford(50.0), a.can_afford(500.0))\n",
        },
        {
          kind: 'quiz',
          prompt: 'A method is written as `def deposit(amount):` with no `self` parameter, and `a.deposit(10.0)` is called. What happens?',
          code: "class Account:\n    def __init__(self, balance):\n        self.balance = balance\n\n    def deposit(amount):\n        return amount\n\na = Account(100.0)\nprint(a.deposit(10.0))\n",
          options: [
            {
              text: 'TypeError: deposit() takes 1 positional argument but 2 were given',
              correct: true,
              why: 'The dot call always passes the object on the left of the dot as the first argument, so `a.deposit(10.0)` really hands over two values: `a` and `10.0`. The method as written has room for one.',
            },
            { text: '10.0, because the object is not needed for this method', why: 'The call never gets that far. It fails before the body runs, on the mismatched number of arguments.' },
            { text: '100.0, the balance the account started with', why: '`deposit` never even reaches `return amount`; the call fails on the argument count first.' },
            { text: 'Nothing prints, but no error is raised either', why: 'An uncaught `TypeError` does raise, and does stop the program — it does not fail silently.' },
          ],
        },
        {
          kind: 'prose',
          body: 'Adding `self` back does not silence anything: it gives the object somewhere to land, which the method needs if it is ever to read `self.balance`. A method that never mentions `self` is usually a function wearing a costume.',
        },
      ],
    },
    {
      id: 'class-vs-instance',
      title: 'Class attributes and the shared trap',
      blocks: [
        {
          kind: 'prose',
          body: 'An attribute written in the class body, outside any method, belongs to the **class**; every instance can see it, and there is only one of it. An attribute assigned through `self` belongs to that **instance** alone. Reading checks the instance\'s own bag first, then the class. Writing always makes an instance attribute.',
        },
        {
          kind: 'shell',
          caption: 'One value in the class body, two dogs looking at it.',
          lines: [
            'class Dog: legs = 4',
            'a = Dog()',
            'b = Dog()',
            'a.legs, b.legs, Dog.legs',
            'a.legs = 3',
            'a.legs, b.legs, Dog.legs',
            'Dog.legs = 5',
            'a.legs, b.legs',
          ],
        },
        {
          kind: 'prose',
          body: 'Assigning to `a.legs` did not touch the class or the other dog. That is harmless for a number, because assignment replaces the value. It is not harmless for a list or a dict, because those are usually **changed in place** instead — and an in-place change is visible to everyone sharing the object.',
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
          body: 'A list, dict or set written in the class body is created once, when the class is defined, and shared by every object of that class for the whole run. This is the same trap as a mutable default argument, and it is found late because it only shows up once a second object exists.',
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
            takeaway: 'The class body runs once, when the class is defined; `__init__` runs once per object. A mutable value written in the class body is therefore one object shared by everyone, and a mutable value assigned in `__init__` is a new one per instance.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A class has `counts = {}` in its body. One method\'s only line is `self.counts[word] = 1`; another\'s only line is `self.counts = {}`. Which one changes what other instances see?',
          options: [
            {
              text: 'Only `self.counts[word] = 1`',
              correct: true,
              why: 'It looks up `counts`, finds nothing in the instance bag, falls back to the shared class dict, and mutates that dict in place — every instance sees the new key. `self.counts = {}` is an assignment, which never falls back: it creates an instance attribute and leaves the shared dict alone.',
            },
            { text: 'Only `self.counts = {}`', why: 'Assignment to `self.counts` creates a fresh instance attribute; it does not reach back and change the shared dict other instances still see.' },
            { text: 'Both, equally', why: 'They look similar but perform different operations: one reads then mutates a shared object, the other replaces what the instance points to. Only the first is visible elsewhere.' },
            { text: 'Neither — `self.counts` always refers to the instance', why: 'Reading falls back to the class when the instance has nothing of its own, which is exactly what lets `self.counts[word] = 1` reach the shared dict.' },
          ],
        },
      ],
    },
    {
      id: 'when-not-a-class',
      title: 'When a class is the wrong tool',
      blocks: [
        {
          kind: 'prose',
          body: 'Classes are over-used by people who have recently learned them. The test is not "is this a thing in the real world". The test is: **is there state that several operations share?** If not, a class adds a layer between the reader and the work.',
        },
        {
          kind: 'code',
          caption: 'A class that never touches `self` is a function wearing a costume.',
          code: "class Stats:\n    def mean(self, values):\n        return sum(values) / len(values)\n\ndef mean(values):\n    return sum(values) / len(values)\n\nprint(Stats().mean([2, 4, 9]))\nprint(mean([2, 4, 9]))\nprint(Stats.mean(None, [2, 4, 9]))\n",
        },
        {
          kind: 'quiz',
          prompt: 'You are reading 2000 rows of `(student_id, mark)` from a file and reporting the highest mark per student. Someone proposes a `Student` class with `add_mark` and `best`. When is that a good idea?',
          options: [
            {
              text: 'Once students grow other behaviour that depends on the same state — a pass flag, a weighted average, a printable report',
              correct: true,
              why: 'A class earns its place when several operations share and depend on the same state. "Group, then take the max" alone has no such sharing — a dict from id to a running maximum says everything in a couple of lines.',
            },
            { text: 'As soon as the data represents something real, like a student', why: 'The test is not whether the thing is real-world, it is whether several operations share mutable state. A real-world subject with one operation on it is still better as a function.' },
            { text: 'Never — 2000 rows is too many for a class to handle well', why: 'The row count has nothing to do with it. A class does not become slower or wrong because there are many instances of it.' },
            { text: 'Only if the marks need to be sorted', why: 'Sorting is a single operation with no shared state to protect; it does not by itself justify a class over a plain data structure.' },
          ],
        },
        {
          kind: 'prose',
          body: 'The other common alternative is a plain dict or tuple for data with no behaviour attached — especially data that arrived from a file or a web service, where the keys are decided elsewhere.',
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
          caption: 'A dict is a perfectly respectable record, and it costs one line — and one typo.',
          lines: [
            "row = {'name': 'Ada', 'mark': 72}",
            "row['mark']",
            "row['marc']",
            "row['grade'] = 'D'",
            'row',
          ],
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
          kind: 'annotate',
          ask: 'A small class that follows all five habits. Click a line to see which habit it demonstrates.',
          code: "class Marks:\n    def __init__(self, unit):\n        self.unit = unit\n        self.scores = []\n\n    def record(self, score):\n        self.scores.append(score)\n\n    def average(self):\n        if not self.scores:\n            return 0.0\n        return sum(self.scores) / len(self.scores)\n",
          notes: {
            '3': '`self.scores = []` is set in `__init__`, even though it starts empty. A reader learns the whole shape of a `Marks` object from this one method, and the mutable list lives here rather than in the class body, so it is never shared between instances.',
            '6': '`record` only changes the object — it appends and returns nothing. It never doubles as a question-answering method.',
            '9': '`average` only answers a question and changes nothing. The empty case is handled without a separate flag, because `__init__` already guaranteed `self.scores` exists.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'You are asked to write code that reads 2000 rows of `(student_id, mark)` and reports the highest mark per student. Someone suggests a `Student` class with `add_mark` and `best`. What would you write first, and when would you promote it to a class?',
          answer: 'Write the dict version first: a dict from id to a running maximum, or to a list of marks. Promote it to a class the moment a second kind of behaviour arrives that depends on the same state — a pass flag, a weighted average, a printable report. The class earns its place through shared state and multiple operations on it, not through the subject being a person rather than a number.',
        },
      ],
    },
  ],
};

export default lesson;
