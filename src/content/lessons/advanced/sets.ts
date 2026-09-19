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
          body: 'A list answers *what is at position 3* and *what order are these in*. A set answers a different pair of questions: *is this thing in here* and *what do these two collections have in common*.\n\nTo answer those quickly, a set gives up two things a list has. It holds no duplicates, and it has no order.',
        },
        {
          kind: 'shell',
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
          kind: 'prose',
          body: 'Two things happened there that a list would not do. The duplicate `"fig"` collapsed on the way in, so the length came out smaller than the number of items written. And `add` called twice with the same value left the set the size it already was, without raising anything. Adding something already present is not an error; it is a no-op.\n\nNearly every set in this lesson is shown through `sorted(...)`. That is deliberate, and the section on order explains why.',
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
          body: 'Everyone is told that `in` is faster on a set than on a list. It is worth seeing *why*, because the reason tells you when it stops being true.\n\nTo answer `x in some_list`, Python has no choice but to compare `x` against item 0, then item 1, then item 2, until it finds a match or runs out. A set does not compare at all to begin with: it computes a number from the value (its **hash**), goes straight to the one place that value could be, and does at most a comparison or two when it gets there.\n\nCounting the comparisons makes the difference visible. The class below is a string that keeps a tally every time it is compared.',
        },
        {
          kind: 'code',
          caption: 'The same search, over a list and over a set built from the same items.',
          code: 'comparisons = 0\n\nclass Word(str):\n    def __eq__(self, other):\n        global comparisons\n        comparisons += 1\n        return str.__eq__(self, other)\n\n    def __hash__(self):\n        return str.__hash__(self)\n\nitems = [Word(f"w{i}") for i in range(500)]\nas_list = items\nas_set = set(items)\nneedle = Word("w499")\n\ncomparisons = 0\nprint("found in list:", needle in as_list)\nprint("comparisons:", comparisons)\n\ncomparisons = 0\nprint("found in set: ", needle in as_set)\nprint("comparisons:", comparisons)\n',
        },
        {
          kind: 'prose',
          body: 'The list had to walk the whole way. The set went more or less straight there, and the count it printed does not grow when the collection does: doubling the items would double the list figure and leave the set figure where it is.\n\nThat is the whole argument. If a collection is built once and then asked *is this in there* many times, a set is the right shape. If it is asked once, converting a list to a set to ask costs more than asking.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Converting is not free',
          body: 'Building a set out of a list looks at every item, so `x in set(big_list)` inside a loop is slower than the list version, not faster: it rebuilds the whole set on every pass. Build the set once, outside the loop, then ask it as often as you like.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are reading a file of 200,000 words and want to report which of them appear in a list of 5,000 banned words. Where exactly does the set go, and why is putting the file words in a set instead the wrong choice?',
          answer: 'The banned words go in the set, once, before the loop over the file. Then each of the 200,000 words is one fast `in` question.\n\nPutting the file words in a set answers the wrong question. You would then have to walk the 5,000 banned words asking about each, which gives the banned words in the file but loses how many times each appeared and in what order they turned up. Choose which collection becomes a set by which one you will be *asking about*, not by which one is bigger.',
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
          kind: 'table',
          caption: 'Read the operator as a question.',
          head: ['Written', 'Method', 'The question it answers'],
          rows: [
            ['`a | b`', '`a.union(b)`', 'Everyone who turned up on either day'],
            ['`a & b`', '`a.intersection(b)`', 'Who came both days'],
            ['`a - b`', '`a.difference(b)`', 'Who came Monday and not Tuesday'],
            ['`a ^ b`', '`a.symmetric_difference(b)`', 'Who came on exactly one of the two days'],
            ['`a <= b`', '`a.issubset(b)`', 'Is everyone in `a` also in `b`'],
            ['`a.isdisjoint(b)`', 'no operator', 'Do these two share nobody'],
          ],
        },
        {
          kind: 'prose',
          body: 'Note that `-` is not symmetric: the two difference lines above gave different answers. That is the point of `^`, which asks the question that does not care which way round you wrote it.\n\nThe comparison operators answer shape questions rather than membership ones.',
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
          kind: 'prose',
          body: 'The last two lines are the same distinction as `<` and `<=` on numbers. `<=` allows "the same set"; `<` demands that the right-hand side has something extra.\n\nThe method forms take any iterable, while the operators demand a set on both sides. `monday.union(["eli"])` works; `monday | ["eli"]` does not. When one side is a list, use the method.',
        },
      ],
    },
    {
      id: 'dedup',
      title: 'Removing duplicates',
      blocks: [
        {
          kind: 'prose',
          body: 'The shortest way to remove duplicates from a list is to put it through a set and back. It works, and it costs you the order.\n\nWhen the order does not matter, that is the right answer. When it does, a dict does the job instead, because a dict also refuses duplicate keys but *does* remember the order they were first put in.',
        },
        {
          kind: 'compare',
          caption: 'The same list, deduplicated two ways.',
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
          kind: 'prose',
          body: 'The left side is marked as the one not to copy only because it is so often written when the order *was* wanted. As a way of getting the distinct values it is fine, and it is wrapped in `sorted` here for a reason: printing the bare set would show an arrangement Python does not promise to repeat.\n\n`dict.fromkeys(names)` builds a dict whose keys are the names and whose values are all `None`. Taking `list(...)` of a dict gives its keys, in insertion order, and a repeated key does not move.',
        },
        {
          kind: 'shell',
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
        {
          kind: 'prose',
          body: 'The last line is a useful one-liner in its own right: comparing a list\'s length against the length of a set built from it answers "does this list contain a duplicate" without writing a loop.',
        },
      ],
    },
    {
      id: 'hashable',
      title: 'What can go in',
      blocks: [
        {
          kind: 'prose',
          body: 'The speed of a set comes from hashing each value, and that puts a condition on what can go in. A value can be hashed only if it cannot change, because a value that changed after it was filed away would be filed in the wrong place and could never be found again.\n\nNumbers, strings, `True`/`False`/`None` and tuples of those can go in a set. Lists, dicts and other sets cannot.',
        },
        {
          kind: 'code',
          caption: 'Tuples are fine. The last line raises on purpose; read the word it uses.',
          code: 'points = {(0, 0), (1, 2), (0, 0)}\nprint(len(points))\nprint(sorted(points))\n\nmixed = {1, "one", True, None, (1, 2)}\nprint(len(mixed))\n\nbad = {[1, 2]}\n',
        },
        {
          kind: 'prose',
          body: '"Unhashable" is the word to recognise. It means *this kind of value cannot be used where hashing is needed*, and it appears for exactly two situations: putting something in a set, and using something as a dict key. The fix is nearly always to turn the list into a tuple.\n\nThe `mixed` line has a trap in it worth knowing. `True` equals `1` in Python and hashes the same, so a set cannot hold both.',
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
          lines: [
            'pairs = {frozenset({"ana", "bo"}), frozenset({"bo", "ana"}), frozenset({"cy", "di"})}',
            'len(pairs)',
            'sorted(sorted(p) for p in pairs)',
            'frozenset({"ana", "bo"}) in pairs',
          ],
        },
        {
          kind: 'prose',
          body: 'Two `frozenset`s built from the same two names are the same value, even though the names were written in a different order, so the set kept one of them. That is a neat way to hold unordered pairs, such as "these two people are partnered", without caring which was written first.',
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
          body: 'This is the rule that catches people, because a set often *looks* ordered. Small whole numbers land in a pattern that tends to come out ascending, which is enough to convince someone the set sorted itself.\n\nIt did not. The arrangement you see is where the hashing happened to put things, and it is not the order the items went in.',
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
          body: 'The two sets came back looking the same even though they were typed in different orders, and neither matches what was typed. The sets compared as equal, because equality for a set is about *what is in it*, full stop.\n\n`pop()` is the honest one. It takes an item out and hands it back, and Python does not promise which item. Never write code that depends on which.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not print a set to a user',
          body: 'The arrangement of a set can differ between runs of the same program, most visibly with strings. Output that a person or a test will read should go through `sorted(...)` first, so the program produces the same thing every time it runs.',
        },
        {
          kind: 'prose',
          body: 'Because there is no order, the things that depend on order are not there either. Indexing and slicing are not available on a set.',
        },
        {
          kind: 'code',
          caption: 'Asking a set for its first item. This raises, and the message is the explanation.',
          code: 'tags = {"red", "blue", "green"}\nprint(len(tags))\nprint(tags[0])\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program reads a file of tags, builds `unique = set(tags)`, and prints `", ".join(unique)`. It passes on your machine and fails the marker\'s test. Give the likeliest reason and the one-word fix.',
          answer: 'The join produced the tags in whatever arrangement the set happened to have, and that arrangement is not something Python promises, so the printed string can differ between runs and between machines. The test was written against one particular run.\n\nThe fix is `sorted`: `", ".join(sorted(unique))`. Any output built from a set needs a deliberate order imposed on it, and sorting is the usual choice because it is repeatable.',
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
            ['Count how many times each value appeared', 'dict, or `collections.Counter`'],
            ['Compare two collections for overlap', 'set'],
            ['Look something up by an index', 'list'],
            ['Attach a value to each key', 'dict'],
          ],
        },
        {
          kind: 'prose',
          body: 'One combination is worth naming, because it comes up constantly: walk a list in order, and carry a set alongside it to remember what has been seen. The list keeps the order, the set answers the question quickly, and neither is asked to do the other\'s job.',
        },
        {
          kind: 'code',
          caption: 'Keeping the first time each name appears, in order, without a slow lookup.',
          code: 'names = ["di", "ana", "cy", "ana", "bo", "di", "cy"]\n\nseen = set()\nfirsts = []\nfor name in names:\n    if name not in seen:\n        seen.add(name)\n        firsts.append(name)\n\nprint(firsts)\nprint(sorted(seen))\nprint(len(names) - len(firsts), "repeats dropped")\n',
        },
      ],
    },
  ],
};

export default lesson;
