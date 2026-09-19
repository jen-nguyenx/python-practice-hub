// Advanced: building a list from another list in one expression, and knowing when not to.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'comprehensions',
  title: 'Comprehensions',
  summary: 'Turning a build-a-list loop into one expression, and knowing when that is the wrong move',
  track: 'advanced',
  order: 1,
  minutes: 24,
  outcomes: [
    'Rewrite a three-line build-a-list loop as a comprehension',
    'Filter with a trailing `if`, and choose values with a leading `if ... else`',
    'Write dict and set comprehensions, and flatten a nested list',
    'Say when a loop is the better choice and defend it',
  ],
  sections: [
    {
      id: 'the-shape',
      title: 'The shape of the loop',
      blocks: [
        {
          kind: 'prose',
          body: 'One loop shape turns up more than any other. Make an empty list, walk over something, append one new value per item. It is so common that Python has a single expression for it.\n\nStart with the loop, because the comprehension is built out of the same three pieces.',
        },
        {
          kind: 'code',
          caption: 'The shape: empty list, loop, append.',
          code: 'lengths = []\nfor word in ["fig", "apple", "kiwi"]:\n    lengths.append(len(word))\nprint(lengths)\n',
        },
        {
          kind: 'prose',
          body: 'Three pieces do the work. **What goes in** is `len(word)`. **What you walk over** is the list of words. **What each item is called** is `word`. A comprehension writes those three in one line, in the order *what goes in*, then *for each name*, then *in what*.\n\nThe brackets around it say what is being built: square brackets build a list.',
        },
        {
          kind: 'shell',
          caption: 'Each line here is an expression, so its value is shown underneath.',
          lines: [
            'words = ["fig", "apple", "kiwi"]',
            '[len(word) for word in words]',
            '[w.upper() for w in words]',
            '[w + "!" for w in words]',
            'words',
          ],
        },
        {
          kind: 'prose',
          body: 'The last line is worth a second look. None of the comprehensions changed `words`. A comprehension never touches the thing it walks over; it builds a **new** list and hands it back. If you do not keep the result, it was computed for nothing.',
        },
        {
          kind: 'steps',
          title: 'Rewriting a loop as a comprehension',
          items: [
            'Check the loop body is one `append` and nothing else. If it does more, stop here.',
            'Take the expression inside the `append` and write it first.',
            'Write `for`, the loop variable, `in`, and the thing being walked over.',
            'Wrap it in square brackets and assign the whole thing to the name the empty list had.',
            'Delete the empty list line and the loop.',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The result is the point',
          body: 'A comprehension exists to produce a value. If you find yourself writing one and throwing the list away, you wanted a loop.',
        },
      ],
    },
    {
      id: 'filtering',
      title: 'Filtering with if',
      blocks: [
        {
          kind: 'prose',
          body: 'The second commonest loop shape adds a condition: walk over everything, keep only some of it. A comprehension takes an `if` at the end for exactly that.\n\nRead it left to right as a sentence: *this value, for each item, in this thing, if this is true*.',
        },
        {
          kind: 'shell',
          lines: [
            'nums = [4, -2, 7, 0, -9, 12]',
            '[n for n in nums if n > 0]',
            '[n * n for n in nums if n % 2 == 0]',
            'words = ["fig", "apple", "kiwi", "plum"]',
            '[w for w in words if len(w) == 4]',
            '[w.upper() for w in words if w.startswith("p")]',
            'len([n for n in nums if n < 0])',
          ],
        },
        {
          kind: 'prose',
          body: 'The order the pieces run in is not the order they are written. Python walks the items first, tests the `if` on each one, and only then works out the expression at the front. So the expression at the front only ever sees items that survived the filter.\n\nThat last line is a pattern worth stealing: build the filtered list, take its length, and you have counted without writing a counter variable.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'filter-threshold',
            title: 'Which numbers survive the filter',
            intro: 'Drag **keep numbers at least** and watch which boxes stay lit. Every number is checked, every time, even the ones you already know will fail.',
            template: 'nums = [4, -2, 7, 0, -9, 12, 5, -6, 9, 1]\nthreshold = ⟦threshold⟧\nkept = [n for n in nums if n >= threshold]\nprint(kept)\nprint(len(kept), "out of", len(nums), "survived")\n',
            knobs: [
              { id: 'threshold', kind: 'range', label: 'keep numbers at least', min: -9, max: 13, start: 0 },
            ],
            probes: {
              items: '[str(n) for n in nums]',
              picked: '[i for i, n in enumerate(nums) if n >= ⟦threshold⟧]',
            },
            visual: {
              kind: 'sequence',
              items: 'items',
              picked: 'picked',
              caption: 'The ten numbers in their original positions; lit boxes are the ones the trailing `if` kept.',
            },
            notes: {
              '0': 'The threshold matches the smallest number in the list, so every box lights up. The trailing `if` did not throw anything out here, but Python still checked all ten to find that out.',
              '9': 'At a threshold of 0, the negative numbers are the only ones dropped. Notice the surviving boxes keep their original order and their original spacing — a comprehension filters, it never reshuffles.',
              '22': 'No number in the list reaches 13, so nothing survives and the comprehension returns an empty list. An empty result is not an error; it is a completely ordinary answer to "which of these are at least 13".',
            },
            takeaway: 'A trailing `if` walks every item and asks the same question of each one before deciding what goes in the result. Moving the threshold never changes which numbers exist, only which ones pass the test — the comprehension rebuilds its answer from the whole list every time, in the order the list already had.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'Here is a loop:\n\n```\ntotal = 0\nfor row in rows:\n    if row[1] >= 50:\n        total = total + row[1]\n```\n\nIt is not a build-a-list loop, so the rewrite is not a plain comprehension. What is the one-line version, and what is the name of the thing in the brackets?',
          answer: '`total = sum(row[1] for row in rows if row[1] >= 50)`.\n\nThe thing inside `sum(...)` is a **generator expression**, not a list comprehension: it has no square brackets, and it hands values to `sum` one at a time instead of building a whole list first. Writing `sum([...])` with the brackets also works and gives the same answer, but it builds a list only to add it up and throw it away. Generator expressions have a lesson of their own.',
        },
      ],
    },
    {
      id: 'if-else',
      title: 'Two different ifs',
      blocks: [
        {
          kind: 'prose',
          body: 'There are two places an `if` can appear in a comprehension, and they do different jobs. This catches people who have used one and assume the other works the same way.\n\nAn `if` at the **end** decides whether an item gets in at all. An `if ... else` at the **front** decides which value goes in, and every item still gets in.',
        },
        {
          kind: 'shell',
          lines: [
            'nums = [4, -2, 7, 0, -9]',
            '[n for n in nums if n > 0]',
            '["+" if n > 0 else "-" for n in nums]',
            '[n if n > 0 else 0 for n in nums]',
            'len(nums)',
          ],
        },
        {
          kind: 'prose',
          body: 'Compare the lengths. The filtered one is shorter than `nums`; the two with `if ... else` at the front are the same length, because they replaced values rather than dropping them.\n\nThe front form is a **conditional expression**, and it exists outside comprehensions too: `n if n > 0 else 0` is a value anywhere you can write a value. It needs the `else`, because an expression must always produce something.',
        },
        {
          kind: 'code',
          caption: 'Trying to hang an `else` off the trailing filter. This one does not run at all.',
          code: 'nums = [4, -2, 7]\nkept = [n for n in nums if n > 0 else 0]\nprint(kept)\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Position tells you which one you wrote',
          body: 'Before the `for`, an `if` must have an `else`. After the `for`, an `if` must not have one. If you find yourself wanting both a filter and a replacement, write the replacement at the front and the filter at the end: `[f(n) if n > 0 else 0 for n in nums if n != 0]`.',
        },
      ],
    },
    {
      id: 'dict-and-set',
      title: 'Dicts and sets',
      blocks: [
        {
          kind: 'prose',
          body: 'The same shape builds dicts and sets. The brackets and the colon decide which. Curly braces with `key: value` build a dict; curly braces with a single value build a set.',
        },
        {
          kind: 'shell',
          lines: [
            'prices = {"tea": 3, "cocoa": 5, "milk": 2}',
            '{k: v * 2 for k, v in prices.items()}',
            '{k: v for k, v in prices.items() if v > 2}',
            '{v: k for k, v in prices.items()}',
            'words = ["fig", "apple", "kiwi", "fig"]',
            '{w: len(w) for w in words}',
            'sorted({len(w) for w in words})',
          ],
        },
        {
          kind: 'prose',
          body: 'Three things to notice.\n\n`{v: k for k, v in prices.items()}` flips a dict end for end, which is the shortest way to answer "which name had this price". It is only safe when the values are unique, because two equal values would collide and the later one would win.\n\n`{w: len(w) for w in words}` was given a list with a repeat in it, and a dict cannot hold the same key twice, so the count came out shorter than the list.\n\nThe last line is wrapped in `sorted` on purpose. A set has no order, so printing one directly shows an order you must not rely on. Sorting it first makes the output mean something.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Empty braces are a dict',
          body: 'There is no empty set literal. `{}` is an empty dict, and an empty set is written `set()`. The shell block below settles it.',
        },
        {
          kind: 'shell',
          lines: ['type({})', 'type({1, 2})', 'type(set())'],
        },
        {
          kind: 'checkpoint',
          prompt: 'You have `words = ["fig", "apple", "kiwi", "fig", "plum"]`. Write one expression giving a dict from each word to its length, keeping only words of four letters or more, and say how many entries it ends up with.',
          answer: '`{w: len(w) for w in words if len(w) >= 4}`.\n\nIt ends up with three entries: `apple`, `kiwi` and `plum`. `fig` is filtered out by the `if`, and the repeat of `fig` would have collapsed into one key anyway, because a dict key can only appear once.',
        },
      ],
    },
    {
      id: 'nested',
      title: 'Two loops, one line',
      blocks: [
        {
          kind: 'prose',
          body: 'A comprehension can have more than one `for`. The rule is the only one you need: the clauses come in the same order as the nested loops they replace, outermost first.',
        },
        {
          kind: 'code',
          caption: 'The nested loop, then the comprehension that replaces it.',
          code: 'grid = [[1, 2], [3, 4], [5, 6]]\n\nflat = []\nfor row in grid:\n    for n in row:\n        flat.append(n)\nprint(flat)\n\nprint([n for row in grid for n in row])\n',
        },
        {
          kind: 'prose',
          body: 'Read the comprehension as the two loop headers in the order they were written: `for row in grid`, then `for n in row`. The expression at the front comes last even though it is written first.\n\nSwapping the two clauses is the common mistake, and it does not quietly give the wrong answer. Python reads left to right, so the second clause is the one allowed to use the name the first clause created.',
        },
        {
          kind: 'code',
          caption: 'The clauses in the wrong order. This raises, and the message names the problem.',
          code: 'grid = [[1, 2], [3, 4], [5, 6]]\nprint([n for n in row for row in grid])\n',
        },
        {
          kind: 'prose',
          body: 'A comprehension **inside** a comprehension is a different thing again, and it builds a list of lists rather than flattening. This is how you turn columns into rows.',
        },
        {
          kind: 'shell',
          lines: [
            'grid = [[1, 2], [3, 4], [5, 6]]',
            '[[row[i] for row in grid] for i in range(2)]',
            '[sum(row) for row in grid]',
            '[len(row) for row in grid]',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Two clauses is the ceiling',
          body: 'A comprehension with three `for` clauses and two `if` clauses is a paragraph of English written without spaces. It runs, and nobody can read it, including you in a fortnight. At that size, write the loop.',
        },
      ],
    },
    {
      id: 'worse',
      title: 'When a loop is better',
      blocks: [
        {
          kind: 'prose',
          body: 'A comprehension is not a reward for cleverness. It exists because *build a new sequence from an old one* is a thought worth having a single expression for. When the code is doing something else, a comprehension hides that fact rather than expressing it.\n\nThe clearest misuse is a comprehension written for its side effects, where the list it produces is not wanted at all.',
        },
        {
          kind: 'compare',
          caption: 'Both print the items. Look at the extra thing the left one built.',
          left: {
            label: 'A comprehension used as a loop',
            code: 'nums = [1, 2, 3]\njunk = [print("item", n) for n in nums]\nprint(junk)\n',
            bad: true,
          },
          right: {
            label: 'A loop, because printing is the point',
            code: 'nums = [1, 2, 3]\nfor n in nums:\n    print("item", n)\n',
          },
        },
        {
          kind: 'prose',
          body: '`print` hands back nothing, so the comprehension dutifully built a list with one nothing per item. The list is pure waste, and on a large input it is waste proportional to the size of the input. The loop on the right says what it means.\n\nThe second misuse is length. A comprehension that will not fit on a line is harder to read than the loop it replaced, not easier.',
        },
        {
          kind: 'code',
          caption: 'This works. Read it out loud and time yourself.',
          code: 'rows = [["ana", "71", "PASS"], ["bo", "48", "FAIL"], ["cy", "83", "PASS"]]\nnames = [r[0].title() for r in rows if r[2] == "PASS" and int(r[1]) >= 70 and len(r[0]) > 2]\nprint(names)\n',
        },
        {
          kind: 'code',
          caption: 'The same work, spread out.',
          code: 'rows = [["ana", "71", "PASS"], ["bo", "48", "FAIL"], ["cy", "83", "PASS"]]\n\nnames = []\nfor name, score, outcome in rows:\n    if outcome != "PASS":\n        continue\n    if int(score) >= 70 and len(name) > 2:\n        names.append(name.title())\nprint(names)\n',
        },
        {
          kind: 'prose',
          body: 'The second version is longer and better. It names the three columns instead of indexing them, it separates two unrelated conditions, and every line fits in the eye. Line count is a poor measure of quality.',
        },
        {
          kind: 'table',
          caption: 'Which to reach for.',
          head: ['If the loop...', 'Then'],
          rows: [
            ['appends one value per item, and nothing else', 'Comprehension'],
            ['filters, then appends one value per item', 'Comprehension with a trailing `if`'],
            ['prints, writes, or changes something outside itself', 'Loop'],
            ['keeps a running total or a running best', 'Loop, or `sum()` or `max()` with a key'],
            ['needs `break` or `continue` beyond a plain filter', 'Loop'],
            ['would not fit on one readable line', 'Loop'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A colleague replaces a loop that reads a file line by line and appends to a list with a comprehension over the same file. The comprehension is shorter and the tests pass. Name one situation where their version is worse, and one where it is not.',
          answer: 'It is worse on a file too big to hold in memory: the loop could process a line and let it go, while the comprehension builds the whole list first. A generator expression would fix that.\n\nIt is fine, and better, when the file is small and the loop body really was a single append. The test to apply is not "is it shorter" but "does the shape of the code match the shape of the work".',
        },
      ],
    },
    {
      id: 'scope',
      title: 'The variable does not leak',
      blocks: [
        {
          kind: 'prose',
          body: 'One difference between a loop and a comprehension surprises people who have been writing Python for years, and it is a genuine advantage of the comprehension.\n\nA `for` loop leaves its loop variable behind. A comprehension runs its loop in a scope of its own, so the name it used does not exist afterwards.',
        },
        {
          kind: 'shell',
          caption: 'The third line raises on purpose; read what it says about the name.',
          lines: [
            'squares = [n * n for n in range(4)]',
            'squares',
            'n',
            'for n in range(4): pass',
            'n',
          ],
        },
        {
          kind: 'prose',
          body: 'After the comprehension, `n` was not a name Python knew. After the loop, it was, and it held the last value the loop reached.\n\nThat is why a loop can quietly wreck a variable you are still using, and a comprehension cannot.',
        },
        {
          kind: 'shell',
          caption: 'The same name used outside and inside. The last three lines try it with a set comprehension.',
          lines: [
            'row = "the row I care about"',
            '[len(row) for row in ["ab", "cde"]]',
            'row',
            'for row in ["ab", "cde"]: pass',
            'row',
            'total = 0',
            '{total for total in range(5)}',
            'total',
          ],
        },
        {
          kind: 'prose',
          body: 'The comprehension borrowed the name `row` and gave it back untouched. The loop took it and kept it. In a long function, that is a bug that takes a while to find, because the damage happens nowhere near where it shows up.\n\nThe set comprehension behaved the same way, and so do dict comprehensions and generator expressions. The private scope is a property of comprehensions, not of square brackets.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Explain in one sentence why the loop above changed `row` and the comprehension did not. Then say what this means for a comprehension that wants to read a variable from the function around it.',
          answer: 'The comprehension runs its loop in a scope of its own and discards that scope when it finishes, so the binding it made for `row` never reaches the function around it; the `for` loop has no scope of its own and assigns to the one `row` there is.\n\nReading still works. A comprehension can see names from the scope around it in the normal way, which is how `[n * factor for n in nums]` finds `factor`. The private scope only affects names the comprehension itself **binds**: its loop variables.',
        },
      ],
    },
  ],
};

export default lesson;
