// Advanced: the collection that answers "is this in there" and "what do these two have in common".
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'sets',
  title: 'Sets',
  summary: 'The collection built for membership and overlap, and the two rules that come with it',
  track: 'advanced',
  order: 2,
  minutes: 22,
  outcomes: [
    'Choose a set over a list when the question is "is this in there"',
    'Use union, intersection, difference and subset to compare two collections',
    'Deduplicate a list, with or without keeping the original order',
    'Say which values can go in a set and why the others cannot',
  ],
  sections: [
    {
      id: 'what-it-is',
      title: 'What a set is',
      blocks: [
        {
          kind: 'prose',
          body: 'A list answers *what is at position 3* and *what order are these in*. A set answers a different pair of questions — *is this thing in here* and *what do these two collections have in common* — and gives up duplicates and order to answer them fast. Every set below is shown through `sorted(...)`, because a set\'s own order is not something Python promises.',
        },
        {
          kind: 'shell',
          caption: 'The duplicate "fig" collapses on the way in, and adding "plum" twice is a no-op, not an error.',
          lines: [
            'seen = {"fig", "apple", "fig", "kiwi"}',
            'len(seen)',
            'sorted(seen)',
            '"apple" in seen',
            '"plum" in seen',
            'seen.add("plum")',
            'seen.add("plum")',
            'sorted(seen)',
          ],
        },
        {
          kind: 'table',
          caption: 'The everyday methods.',
          head: ['Written', 'What it does'],
          rows: [
            ['`s.add(x)`', 'Puts `x` in, or does nothing if it is already there'],
            ['`s.discard(x)`', 'Takes `x` out, or does nothing if it was not there'],
            ['`s.remove(x)`', 'Takes `x` out, and raises `KeyError` if it was not there'],
            ['`x in s`', 'True when `x` is in the set'],
            ['`len(s)`', 'How many things are in it'],
            ['`s.update(other)`', 'Puts everything from `other` in'],
          ],
        },
        {
          kind: 'shell',
          caption: 'The difference between `discard` and `remove`. The last line raises on purpose.',
          lines: [
            'tags = {"red", "blue"}',
            'tags.discard("green")',
            'sorted(tags)',
            'tags.remove("green")',
          ],
        },
      ],
    },
    {
      id: 'membership',
      title: 'Why membership is faster',
      blocks: [
        {
          kind: 'prose',
          body: 'Everyone is told that `in` is faster on a set than on a list — it is worth seeing why, because the reason tells you when it stops being true. Checking `x in some_list` compares `x` against item 0, then item 1, then item 2, until it finds a match or runs out. A set does not compare at all to begin with: it computes a number from the value (its **hash**) and goes straight to the one place that value could be.',
        },
        {
          kind: 'code',
          caption: 'The same search, over a list and over a set built from the same items. This class tallies every comparison it is asked to do.',
          code: 'comparisons = 0\n\nclass Word(str):\n    def __eq__(self, other):\n        global comparisons\n        comparisons += 1\n        return str.__eq__(self, other)\n\n    def __hash__(self):\n        return str.__hash__(self)\n\nitems = [Word(f"w{i}") for i in range(500)]\nas_list = items\nas_set = set(items)\nneedle = Word("w499")\n\ncomparisons = 0\nprint("found in list:", needle in as_list)\nprint("comparisons:", comparisons)\n\ncomparisons = 0\nprint("found in set: ", needle in as_set)\nprint("comparisons:", comparisons)\n',
        },
        {
          kind: 'prose',
          body: 'The list walked the whole way; the set\'s comparison count does not grow as the collection does. If a collection is built once and then asked *is this in there* many times, a set is the right shape. If it is asked once, converting a list to a set to ask costs more than asking directly.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Converting is not free',
          body: 'Building a set out of a list looks at every item, so `x in set(big_list)` inside a loop is slower than the list version, not faster: it rebuilds the whole set on every pass. Build the set once, outside the loop, then ask it as often as you like.',
        },
        {
          kind: 'quiz',
          prompt: 'You are reading a file of 200,000 words and checking each against a list of 5,000 banned words. Which is fastest, and why?',
          options: [
            {
              text: 'Put the banned words in a set once, before the loop, then test each of the 200,000 words with in',
              correct: true,
              why: 'A one-time cost of building a 5,000-item set, then 200,000 fast hash lookups against it.',
            },
            {
              text: 'Put the 200,000 file words in a set, then loop over the banned words checking each one',
              why: 'This answers a different question — which banned words appear in the file — and loses how many times each file word appeared and in what order, since the file words are now an unordered set.',
            },
            {
              text: 'Convert the banned-words list to a set inside the loop, once per word checked',
              why: 'This rebuilds a 5,000-item set 200,000 times, far slower than building it once outside the loop.',
            },
            {
              text: 'Use in on the plain banned-words list for every word',
              why: 'This works but is the slow option: each of the 200,000 checks walks up to 5,000 items one at a time instead of hashing straight there.',
            },
          ],
        },
      ],
    },
    {
      id: 'operations',
      title: 'Comparing two collections',
      blocks: [
        {
          kind: 'prose',
          body: 'The second reason to reach for a set is that it makes "what do these two have in common" a single operator. Written as loops, each of these is five or six lines with a nested `if`.',
        },
        {
          kind: 'shell',
          lines: [
            'monday = {"ana", "bo", "cy", "di"}',
            'tuesday = {"cy", "di", "eli"}',
            'sorted(monday | tuesday)',
            'sorted(monday & tuesday)',
            'sorted(monday - tuesday)',
            'sorted(tuesday - monday)',
            'sorted(monday ^ tuesday)',
          ],
        },
        {
          kind: 'match',
          ask: 'Drag each operator onto the question it answers.',
          pairs: [
            { left: '`a | b`', right: 'Everyone who turned up on either day' },
            { left: '`a & b`', right: 'Who came both days' },
            { left: '`a - b`', right: 'Who came Monday and not Tuesday' },
            { left: '`a ^ b`', right: 'Who came on exactly one of the two days' },
            { left: '`a <= b`', right: 'Is everyone in a also in b' },
            { left: '`a.isdisjoint(b)`', right: 'Do these two share nobody' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'overlap-sizes',
            title: 'Union, intersection and the leftovers, moving together',
            intro: 'Drag **how many people came both days** and watch all four bars move at once. Monday always has six people; Tuesday\'s six slide across so that exactly this many of them match Monday\'s.',
            template: 'overlap = ⟦overlap⟧\nmonday = set(range(0, 6))\ntuesday = set(range(6 - overlap, 12 - overlap))\nprint("monday: ", sorted(monday))\nprint("tuesday:", sorted(tuesday))\nprint("came both days:", sorted(monday & tuesday))\n',
            knobs: [
              { id: 'overlap', kind: 'range', label: 'came both days', min: 0, max: 6, start: 3 },
            ],
            probes: {
              sizes: '[len(monday | tuesday), len(monday & tuesday), len(monday - tuesday), len(tuesday - monday)]',
              'size-labels': "['union', 'intersection', 'monday only', 'tuesday only']",
            },
            visual: {
              kind: 'bars',
              values: 'sizes',
              labels: 'size-labels',
              caption: 'Sizes of the union, the intersection, and each day\'s leftovers, as the overlap changes.',
            },
            notes: {
              '0': 'No overlap at all. The intersection bar is at zero, and the union is the full twelve people from both days added together, because nobody is being counted twice.',
              '3': 'Half of Monday also came Tuesday. The union bar sits below twelve, because the three who came both days are counted once, not twice.',
              '6': 'The two days are exactly the same six people. Intersection matches both days exactly, and each "only" bar drops to zero, because nobody attended just one day.',
            },
            takeaway: 'The union bar is never the sum of the two days on their own; it is always that sum minus whoever is being double-counted, which is exactly the intersection. Watch the two "only" bars and the intersection bar always add back up to the union, however far you drag the slider.',
          },
        },
        {
          kind: 'predict',
          ask: 'Two five-person teams share three members. Predict what these three lines print, in order.',
          code: 'team_a = {"ana", "bo", "cy", "di", "eli"}\nteam_b = {"cy", "di", "eli", "fen", "gia"}\nprint(len(team_a | team_b))\nprint(len(team_a & team_b))\nprint(len(team_a ^ team_b))\n',
          choices: [
            '7\n3\n4',
            '10\n3\n4',
            '7\n3\n7',
            '5\n5\n0',
          ],
        },
        {
          kind: 'prose',
          body: '`-` is not symmetric — the difference lines in the shell above gave different answers — which is exactly why `^` exists: it does not care which way round you write it. `<=` and `<` follow the same pattern as on numbers: `<=` allows "the same set", `<` demands the right-hand side has something extra.',
        },
        {
          kind: 'shell',
          lines: [
            'core = {"ana", "bo"}',
            'monday = {"ana", "bo", "cy", "di"}',
            'core <= monday',
            'monday <= core',
            'core.isdisjoint({"eli"})',
            'core < core',
            'core <= core',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Methods accept more than sets',
          body: 'Every operator above also has a method spelling (`a.union(b)`, `a.intersection(b)`, `a.difference(b)`, `a.symmetric_difference(b)`, `a.issubset(b)`), and the methods take any iterable while the operators demand a set on both sides. `monday.union(["eli"])` works; `monday | ["eli"]` does not. When one side is a list, use the method.',
        },
      ],
    },
    {
      id: 'dedup',
      title: 'Removing duplicates',
      blocks: [
        {
          kind: 'prose',
          body: 'The shortest way to remove duplicates from a list is to put it through a set and back — but that costs the order. When order matters, `dict.fromkeys(names)` does the job instead: a dict also refuses duplicate keys, but it *does* remember the order they were first put in.',
        },
        {
          kind: 'compare',
          caption: 'The same list, deduplicated two ways. The left side is marked as the one not to copy only because order is so often wanted; as a way of just getting the distinct values, it is fine.',
          left: {
            label: 'Through a set: order gone',
            code: 'names = ["di", "ana", "cy", "ana", "bo", "di"]\nprint(sorted(set(names)))\n',
            bad: true,
          },
          right: {
            label: 'Through a dict: first-seen order kept',
            code: 'names = ["di", "ana", "cy", "ana", "bo", "di"]\nprint(list(dict.fromkeys(names)))\n',
          },
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Why the dict trick works',
          body: '`dict.fromkeys(names)` builds a dict whose keys are the names and whose values are all `None`. `list(...)` of a dict gives its keys, in insertion order, and a repeated key does not move.',
        },
        {
          kind: 'shell',
          caption: 'The last line is a one-liner worth stealing: comparing a list\'s length against its set\'s length answers "does this list contain a duplicate" without a loop.',
          lines: [
            'names = ["di", "ana", "cy", "ana", "bo", "di"]',
            'len(names)',
            'len(set(names))',
            'sorted(set(names))',
            'dict.fromkeys(names)',
            'list(dict.fromkeys(names))',
            'len(names) != len(set(names))',
          ],
        },
      ],
    },
    {
      id: 'hashable',
      title: 'What can go in',
      blocks: [
        {
          kind: 'prose',
          body: 'The speed of a set comes from hashing each value, which requires the value to never change — a value that changed after being filed away would be filed in the wrong place and could never be found again. Numbers, strings, `True`/`False`/`None` and tuples of those can go in a set; lists, dicts and other sets cannot.',
        },
        {
          kind: 'code',
          caption: 'Tuples are fine. The last line raises on purpose; read the word it uses.',
          code: 'points = {(0, 0), (1, 2), (0, 0)}\nprint(len(points))\nprint(sorted(points))\n\nmixed = {1, "one", True, None, (1, 2)}\nprint(len(mixed))\n\nbad = {[1, 2]}\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Read the word: unhashable',
          body: '"Unhashable" means this kind of value cannot be used where hashing is needed — for a set, or as a dict key. The fix is nearly always to turn the list into a tuple. Watch the `mixed` line above too: `True` equals `1` in Python and hashes the same, so a set cannot hold both.',
        },
        {
          kind: 'shell',
          lines: [
            'True == 1',
            'hash(True) == hash(1)',
            'sorted({1, True, 2})',
            'len({1, True, 2})',
            '{(1, 2)} == {(1, 2)}',
            'hash((1, 2)) == hash((1, 2))',
          ],
        },
        {
          kind: 'prose',
          body: 'For the rare case where you want a set *of* sets, Python has `frozenset`: a set that cannot be changed after it is built, which makes it hashable.',
        },
        {
          kind: 'shell',
          caption: 'Two frozensets built from the same two names are equal even though the names were written in a different order, so the set kept one of them — a neat way to hold an unordered pair without caring which name came first.',
          lines: [
            'pairs = {frozenset({"ana", "bo"}), frozenset({"bo", "ana"}), frozenset({"cy", "di"})}',
            'len(pairs)',
            'sorted(sorted(p) for p in pairs)',
            'frozenset({"ana", "bo"}) in pairs',
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You want to count how many distinct rows appeared in a table, where each row arrives as a list like `["ana", 71]`. `set(rows)` raises. What is the one-line fix, and what does it quietly assume?',
          answer: '`len({tuple(r) for r in rows})`. Converting each row to a tuple makes it hashable, and the set comprehension counts the distinct ones.\n\nIt assumes every value *inside* the row is hashable too. A row like `["ana", [71, 80]]` still raises, because the tuple contains a list and hashing a tuple hashes its contents. It also assumes order within the row is meaningful: `("ana", 71)` and `(71, "ana")` count as two different rows.',
        },
      ],
    },
    {
      id: 'no-order',
      title: 'A set has no order',
      blocks: [
        {
          kind: 'prose',
          body: 'A set often *looks* ordered — small whole numbers tend to come out ascending, which is enough to convince someone it sorted itself. It did not: the arrangement is wherever hashing happened to put things, not the order items went in.',
        },
        {
          kind: 'shell',
          caption: 'Watch the order the items were written against the order they come back.',
          lines: [
            'list({10, 1, 5, 3})',
            'list({3, 5, 1, 10})',
            '{10, 1, 5, 3} == {3, 5, 1, 10}',
            'nums = {10, 1, 5, 3}',
            'nums.pop()',
            'sorted(nums)',
          ],
        },
        {
          kind: 'prose',
          body: 'The two sets above came back looking the same though typed in different orders, and neither matches what was typed — sets compare equal by *what is in them*, full stop. `pop()` is the honest one: it takes an item out and hands it back, and Python does not promise which; never write code that depends on which.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not print a set to a user',
          body: 'The arrangement of a set can differ between runs of the same program, most visibly with strings. Output that a person or a test will read should go through `sorted(...)` first, so the program produces the same thing every time it runs.',
        },
        {
          kind: 'code',
          caption: 'No order means no position either, so indexing is not available. Asking a set for its first item raises, and the message is the explanation.',
          code: 'tags = {"red", "blue", "green"}\nprint(len(tags))\nprint(tags[0])\n',
        },
        {
          kind: 'quiz',
          prompt: 'A program reads a file of tags, builds `unique = set(tags)`, and prints `", ".join(unique)`. It passes on your machine but fails the marker\'s automated test. What is the likeliest reason?',
          code: 'unique = set(tags)\nprint(", ".join(unique))\n',
          options: [
            {
              text: 'The join order depends on the set\'s internal arrangement, which is not guaranteed to match between runs or machines, and the test expects one fixed order',
              correct: true,
              why: 'Any output built straight from a set needs a deliberate order imposed on it — `sorted(unique)` is the usual fix, because it is repeatable.',
            },
            {
              text: 'join only works on lists, not sets, so this always raises',
              why: 'It runs fine — join accepts any iterable of strings, sets included. The problem is the order it produces, not whether it runs.',
            },
            {
              text: 'set(tags) drops tags that appear more than once, so the marker\'s test data must be different',
              why: 'That is intended behaviour, not a bug, and a marker\'s test would account for real duplicates being removed — the failure here is about order, not which tags survive.',
            },
            {
              text: 'The comma-space separator does not match the marker\'s expected format',
              why: 'Nothing in the scenario points at the separator; the classic trap with set and join together is unordered output.',
            },
          ],
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Choosing the collection',
      blocks: [
        {
          kind: 'prose',
          body: 'Nothing here says sets are better than lists. They answer different questions, and reaching for the wrong one shows up as code that works but takes a paragraph to say something that should take a line.',
        },
        {
          kind: 'table',
          caption: 'What the shape of your question tells you.',
          head: ['You need to...', 'Use'],
          rows: [
            ['Keep things in the order they arrived', 'list'],
            ['Ask "is this in there" over and over', 'set'],
            ['Allow the same value more than once', 'list'],
            ['Count how many times each value appeared', 'dict, or collections.Counter'],
            ['Compare two collections for overlap', 'set'],
            ['Look something up by an index', 'list'],
            ['Attach a value to each key', 'dict'],
          ],
        },
        {
          kind: 'code',
          caption: 'One combination is worth naming: walk a list in order, carrying a set alongside it to remember what has been seen — the list keeps the order, the set answers fast, and neither is asked to do the other\'s job.',
          code: 'names = ["di", "ana", "cy", "ana", "bo", "di", "cy"]\n\nseen = set()\nfirsts = []\nfor name in names:\n    if name not in seen:\n        seen.add(name)\n        firsts.append(name)\n\nprint(firsts)\nprint(sorted(seen))\nprint(len(names) - len(firsts), "repeats dropped")\n',
        },
      ],
    },
  ],
};

export default lesson;
