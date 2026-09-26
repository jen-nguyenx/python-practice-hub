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
          body: 'One loop shape appears constantly: make an empty list, walk over something, append one new value per item. A comprehension writes that exact shape as a single expression.',
        },
        {
          kind: 'order',
          ask: "Before the comprehension, here is the loop it replaces. Drag these into an order that actually builds `lengths`.",
          lines: [
            { text: 'lengths = []', indent: 0 },
            { text: 'for word in ["fig", "apple", "kiwi"]:', indent: 0 },
            { text: 'lengths.append(len(word))', indent: 1 },
            { text: 'print(lengths)', indent: 0 },
          ],
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
          kind: 'callout',
          tone: 'note',
          title: 'Three pieces, no side effect',
          body: 'A comprehension is *what goes in*, then *for each name*, then *in what* — the same three pieces as the loop, just reordered. It also never touches the thing it walks over: `words` above comes back untouched. If you throw the result away, writing it gained nothing.',
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
          body: 'The next common shape adds a condition: walk over everything, keep only some of it. A comprehension takes an `if` at the end for exactly that — read it as *this value, for each item, in this thing, if this is true*.',
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
          kind: 'callout',
          tone: 'note',
          title: 'Order of operations',
          body: 'Python walks the items first, tests the `if` on each one, and only works out the front expression for survivors. So build the filtered list and take its length (the last line above) and you have counted without a counter variable.',
        },
        {
          kind: 'predict',
          ask: 'Predict what this prints before you check.',
          code: 'nums = [3, 8, 15, 4, 21, 6, 30]\nmultiples = [n for n in nums if n % 3 == 0]\nprint(multiples)\nprint(len(multiples))\n',
          choices: [
            '[3, 15, 21, 6, 30]\n5',
            '[3, 15, 21, 6, 30]\n7',
            '[3, 8, 15, 4, 21, 6, 30]\n7',
            '[6, 30]\n2',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which one-line expression gives the sum of column-1 values that are at least 50, without building a list only to throw it away?',
          code: 'rows = [[1, 40], [2, 55], [3, 20]]\n',
          options: [
            {
              text: 'sum(row[1] for row in rows if row[1] >= 50)',
              correct: true,
              why: 'No square brackets — this is a generator expression. It hands values to `sum` one at a time instead of building a whole list first.',
            },
            {
              text: 'sum([row[1] for row in rows if row[1] >= 50])',
              why: 'This gives the same number, but the square brackets build a whole list first only to hand it to `sum` and throw it away.',
            },
            {
              text: '[row[1] for row in rows if row[1] >= 50]',
              why: 'This is a list, not a sum. Printing it would show the surviving values themselves, not their total.',
            },
            {
              text: 'sum(row[1] for row in rows) if row[1] >= 50',
              why: 'The `if` sits outside the parentheses entirely, so Python reads it as the start of an `x if condition else y` expression with no `else`. That is a `SyntaxError`: the line never runs at all.',
            },
          ],
        },
      ],
    },
    {
      id: 'if-else',
      title: 'Two different ifs',
      blocks: [
        {
          kind: 'prose',
          body: 'There are two places an `if` can appear in a comprehension, and they do different jobs. One at the **end** decides whether an item gets in at all; one at the **front**, paired with `else`, decides which value goes in — every item still gets in.',
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
          body: 'Compare the lengths above: the filtered list is shorter than `nums`, but both front-`if ... else` versions keep every item, because they replace values instead of dropping them. That front form is a **conditional expression** — it exists outside comprehensions too, and needs the `else` because an expression must always produce something.',
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
          body: 'Before the `for`, an `if` must have an `else`. After the `for`, an `if` must not have one. Want both a filter and a replacement? Write the replacement at the front and the filter at the end: `[f(n) if n > 0 else 0 for n in nums if n != 0]`.',
        },
      ],
    },
    {
      id: 'dict-and-set',
      title: 'Dicts and sets',
      blocks: [
        {
          kind: 'prose',
          body: 'The same shape builds dicts and sets. Curly braces with `key: value` build a dict; curly braces with a single value build a set.',
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
          body: 'Flipping a dict end for end (`{v: k for k, v in prices.items()}`) is only safe when the values are unique — equal values collide, and the later one wins. A repeated key also collapses, which is why `{w: len(w) for w in words}` came out shorter than `words`. And a set has no order: sort it before printing, or the order shown means nothing.',
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
          kind: 'quiz',
          prompt: 'How many entries does `{w: len(w) for w in words if len(w) >= 4}` end up with, given `words = ["fig", "apple", "kiwi", "fig", "plum"]`?',
          options: [
            {
              text: '3',
              correct: true,
              why: '`apple`, `kiwi` and `plum` pass the length filter. `fig` is filtered out, and its repeat would have collapsed into one key anyway.',
            },
            { text: '5', why: 'That is the length of `words` before any filtering or de-duplication happened.' },
            { text: '4', why: '`fig` is filtered out by the length check, so it never gets the chance to collide with its own repeat.' },
            { text: '2', why: '`kiwi` and `plum` both have four letters, the same as `apple` — three words pass, not two.' },
          ],
        },
      ],
    },
    {
      id: 'nested',
      title: 'Two loops, one line',
      blocks: [
        {
          kind: 'prose',
          body: 'A comprehension can have more than one `for`. The rule: clauses come in the same order as the nested loops they replace, outermost first — this is order that actually matters, not a style choice.',
        },
        {
          kind: 'code',
          caption: 'The nested loop, then the comprehension that replaces it — read the comprehension as `for row in grid` then `for n in row`, the same order as the loop headers.',
          code: 'grid = [[1, 2], [3, 4], [5, 6]]\n\nflat = []\nfor row in grid:\n    for n in row:\n        flat.append(n)\nprint(flat)\n\nprint([n for row in grid for n in row])\n',
        },
        {
          kind: 'code',
          caption: 'Swap the clauses and it is not quietly wrong — it raises, because the second clause is the only one allowed to use the name the first clause created.',
          code: 'grid = [[1, 2], [3, 4], [5, 6]]\nprint([n for n in row for row in grid])\n',
        },
        {
          kind: 'shell',
          caption: 'A comprehension inside a comprehension builds a list of lists instead of flattening — this is how columns become rows.',
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
          body: 'A comprehension is not a reward for cleverness — it exists because *build a new sequence from an old one* is a thought worth writing as one expression. The clearest misuse writes one for a side effect, when the list it produces was never wanted at all.',
        },
        {
          kind: 'compare',
          caption: 'Both print the items — but `print` hands back nothing, so the left one built a list of nothing, one per item, wasted work proportional to the size of the input.',
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
          body: 'The second misuse is length: a comprehension that will not fit on a line is harder to read than the loop it replaced. The spread-out version above is longer and better — it names the three columns instead of indexing them, separates two unrelated conditions, and every line fits in the eye. Line count is a poor measure of quality.',
        },
        {
          kind: 'table',
          caption: 'Which to reach for.',
          head: ['If the loop...', 'Then'],
          rows: [
            ['appends one value per item, and nothing else', 'Comprehension'],
            ['filters, then appends one value per item', 'Comprehension with a trailing if'],
            ['prints, writes, or changes something outside itself', 'Loop'],
            ['keeps a running total or a running best', 'Loop, or sum() or max() with a key'],
            ['needs break or continue beyond a plain filter', 'Loop'],
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
          body: 'A `for` loop leaves its loop variable behind afterward. A comprehension runs its loop in a scope of its own, so the name it used does not exist once it finishes — a genuine advantage, and one that surprises people who have written Python for years.',
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
          body: 'After the comprehension, the loop name is gone; after the plain `for` loop, it survives holding the last value reached — which is how a loop can quietly overwrite a variable you still need, and a comprehension cannot. The same protection applies to dict and set comprehensions and to generator expressions: it is a property of comprehensions, not of square brackets specifically.',
        },
        {
          kind: 'quiz',
          prompt: 'After `squares = [n * n for n in range(4)]` runs, what happens when you next evaluate `n` on its own?',
          code: 'squares = [n * n for n in range(4)]\n',
          options: [
            {
              text: 'NameError — n was never a name outside the comprehension',
              correct: true,
              why: "A comprehension runs its loop in a scope of its own and discards it when done, so the binding it made for n never reaches the surrounding scope.",
            },
            {
              text: '3 — n holds the last value the loop reached',
              why: 'That is what happens after an ordinary for loop, which has no scope of its own and assigns to whichever n already exists. A comprehension does not leak this way.',
            },
            {
              text: '0 — n resets to its starting value',
              why: 'Nothing resets it, because nothing outside the comprehension was ever bound to n in the first place.',
            },
            {
              text: '[0, 1, 4, 9] — n becomes the result list',
              why: 'That value belongs to squares, the name the comprehension result was assigned to; n itself is untouched by the assignment.',
            },
          ],
        },
      ],
    },
  ],
};

export default lesson;
