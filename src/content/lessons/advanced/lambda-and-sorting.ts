// Advanced: sorting by something other than the value itself, and the small function that says what.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'lambda-and-sorting',
  title: 'Sorting by a key',
  summary: 'Telling sorted what to sort by, breaking ties on purpose, and the stability that makes it possible',
  track: 'advanced',
  order: 3,
  minutes: 26,
  outcomes: [
    'Sort by something other than the value itself using `key`',
    'Break ties deliberately with a tuple key',
    'Write a `lambda` and say when a named function is the better choice',
    'Explain what a stable sort guarantees and use it on purpose',
  ],
  sections: [
    {
      id: 'two-ways',
      title: 'sorted and .sort',
      blocks: [
        {
          kind: 'prose',
          body: 'Python has two ways to sort a list, and mixing them up is one of the most common bugs in beginner code. `sorted(x)` hands back a **new list**; `x.sort()` rearranges the list in place and hands back nothing at all.',
        },
        {
          kind: 'shell',
          caption: 'Look at what each line evaluates to, and at what happened to the original.',
          lines: [
            'nums = [3, 1, 2]',
            'sorted(nums)',
            'nums',
            'nums.sort()',
            'nums',
            'print(nums.sort())',
            'sorted("cab")',
            'sorted({"b": 1, "a": 2})',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The assignment trap',
          body: '`nums.sort()` returns nothing, so `nums = nums.sort()` throws the list away and replaces it with `None` — a bug that fails later, wherever the name is next treated as a list, far from where the mistake was made. `sorted` also differs in what it accepts: it works on any iterable and always hands back a list, so it sorts a string into characters and a dict into its keys; `.sort()` is a list method that only lists have.',
        },
        {
          kind: 'compare',
          caption: 'The assignment trap in practice. The left one is the version people write by accident.',
          left: {
            label: 'Assigning the result of .sort()',
            code: 'scores = [70, 92, 55]\nscores = scores.sort()\nprint(scores)\nprint(len(scores))\n',
            bad: true,
          },
          right: {
            label: 'Sorting in place, or taking a new list',
            code: 'scores = [70, 92, 55]\nscores.sort()\nprint(scores)\nprint(len(scores))\n',
          },
        },
      ],
    },
    {
      id: 'key',
      title: 'Sorting by something else',
      blocks: [
        {
          kind: 'prose',
          body: 'By default, sorting compares the items themselves — but often the question is different: sort words by length, or names ignoring capitals. The `key` argument takes a function; Python calls it once per item and sorts by what comes back, while the items themselves stay untouched.',
        },
        {
          kind: 'shell',
          lines: [
            'words = ["fig", "Apple", "kiwi", "plum", "banana"]',
            'sorted(words)',
            'sorted(words, key=len)',
            'sorted(words, key=str.lower)',
            'sorted(words, key=len, reverse=True)',
            'max(words, key=len)',
            'min(words, key=len)',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which of these correctly sorts words by length?',
          options: [
            {
              text: 'sorted(words, key=len)',
              correct: true,
              why: 'len is passed as the function itself — Python calls it once per word during the sort.',
            },
            {
              text: 'sorted(words, key=len())',
              why: 'len() calls the function immediately, with no argument, and raises a TypeError before sorting even starts.',
            },
            {
              text: 'sorted(words, key=len(words))',
              why: 'This calls len once on the whole list, getting a single number, then tries to use that number as the key function itself — sorting fails.',
            },
            {
              text: 'sorted(len(words))',
              why: 'This tries to sort the single integer len(words), which is not iterable at all, and raises a TypeError immediately.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A key function takes exactly one item',
          body: 'Python calls your key function once per item, with that item as its only argument. A function that expects two arguments, or none, raises a `TypeError` as soon as sorting starts.',
        },
      ],
    },
    {
      id: 'lambda',
      title: 'Writing the key inline',
      blocks: [
        {
          kind: 'prose',
          body: 'Most keys are not a ready-made function like `len` — they are something small and specific, and naming a function three lines up for something used once puts distance between the sort and what it sorts by. `lambda r: r[1]` means *a function that takes one thing, called `r`, and gives back `r[1]`* — the same function `def` would make, with no name attached.',
        },
        {
          kind: 'shell',
          lines: [
            'double = lambda n: n * 2',
            'double(5)',
            'rows = [("cy", 71), ("bo", 88), ("ana", 71)]',
            'sorted(rows, key=lambda r: r[1])',
            'sorted(rows, key=lambda r: len(r[0]))',
            'people = [{"name": "cy", "age": 30}, {"name": "ana", "age": 24}]',
            'sorted(people, key=lambda p: p["age"])',
            '(lambda a, b: a + b)(2, 3)',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'lambda is an argument, not a definition',
          body: 'Assigning a lambda to a name, as the first shell line did, is a worse way of writing `def double(n): return n * 2` — the `def` version gets a real name in tracebacks. Use `lambda` where the function is an argument. It also cannot contain a statement: no `if:` block, loop, `try`, assignment or `return` — the single expression is the return value, as the broken line below shows.',
        },
        {
          kind: 'code',
          caption: 'Trying to put a statement in a lambda. This one does not run at all.',
          code: 'clean = lambda s: s = s.strip()\nprint(clean("  hi "))\n',
        },
        {
          kind: 'prose',
          body: 'A conditional *expression* is fine, because it is an expression: `lambda r: r[1] if r[1] is not None else 0` is a legal key. When the rule needs more than that, give it a name — a `def` can be tested, documented and reused, and `key=grade_order` says more than a `lambda` with a conditional buried in it.',
        },
        {
          kind: 'compare',
          caption: 'The same sort, with the rule written two ways. Both work; one of them explains itself.',
          left: {
            label: 'A lambda doing too much',
            code: 'rows = [("cy", None), ("bo", 88), ("ana", 71)]\nprint(sorted(rows, key=lambda r: -1 if r[1] is None else r[1]))\n',
          },
          right: {
            label: 'A named rule',
            code: 'rows = [("cy", None), ("bo", 88), ("ana", 71)]\n\ndef score_or_missing(row):\n    """Missing scores sort before every real score."""\n    name, score = row\n    if score is None:\n        return -1\n    return score\n\nprint(sorted(rows, key=score_or_missing))\nprint(score_or_missing(("zz", None)))\n',
          },
        },
      ],
    },
    {
      id: 'tuple-keys',
      title: 'Breaking ties',
      blocks: [
        {
          kind: 'prose',
          body: 'Sorting by one field leaves ties, and the tie order is then out of your hands. A tuple key fixes that, because tuples compare item by item: the first items decide, and only when those are equal does the second matter.',
        },
        {
          kind: 'shell',
          caption: '`(71, "zz") < (88, "aa")` is settled by the first items alone; the second is never looked at.',
          lines: [
            '(71, "ana") < (71, "cy")',
            '(71, "zz") < (88, "aa")',
            'rows = [("cy", 71), ("bo", 88), ("ana", 71)]',
            'sorted(rows, key=lambda r: r[1])',
            'sorted(rows, key=lambda r: (r[1], r[0]))',
          ],
        },
        {
          kind: 'predict',
          ask: 'Three rows, two of them tied on 71. Predict what this prints.',
          code: 'rows = [("cy", 71), ("bo", 88), ("ana", 71)]\nprint(sorted(rows, key=lambda r: (-r[1], r[0])))\n',
          choices: [
            "[('bo', 88), ('ana', 71), ('cy', 71)]",
            "[('bo', 88), ('cy', 71), ('ana', 71)]",
            "[('cy', 71), ('ana', 71), ('bo', 88)]",
            "[('ana', 71), ('cy', 71), ('bo', 88)]",
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Mixed types in a tuple key',
          body: 'Every item at the same position must be comparable with the others. If one row has a number where another has `None`, the sort raises a `TypeError` partway through, because `None < 3` has no answer. Clean the data in the key function, as the named-rule example did.',
        },
        {
          kind: 'quiz',
          prompt: 'rows hold `(name, score, grade)` and you want them ordered by grade ascending, then score **descending**, then name ascending, where grade is "A", "B" or "C". Which key achieves it?',
          options: [
            {
              text: 'lambda r: (r[2], -r[1], r[0])',
              correct: true,
              why: 'Grade ascending needs no negation, because "A" before "B" before "C" is already the wanted order; the score is negated to sort descending; the name breaks any remaining tie.',
            },
            {
              text: 'lambda r: (-r[2], -r[1], r[0])',
              why: 'Negating a string raises a TypeError — you cannot negate "A". Grade order does not need reversing here anyway.',
            },
            {
              text: 'lambda r: (r[2], r[1], r[0])',
              why: 'This sorts score ascending, not descending — ties on grade would put the lowest score first instead of the highest.',
            },
            {
              text: 'lambda r: (r[0], -r[1], r[2])',
              why: 'This sorts by name first, which ignores the requirement that grade decides the order before anything else.',
            },
          ],
        },
      ],
    },
    {
      id: 'itemgetter',
      title: 'itemgetter and attrgetter',
      blocks: [
        {
          kind: 'prose',
          body: '"The item at index 1" and "the value under this key" are common enough keys that the standard library has them ready-made: `operator.itemgetter` builds `lambda r: r[1]` for you, and reads better at the point of use.',
        },
        {
          kind: 'shell',
          lines: [
            'from operator import itemgetter',
            'rows = [("cy", 71), ("bo", 88), ("ana", 71)]',
            'sorted(rows, key=itemgetter(1))',
            'sorted(rows, key=itemgetter(1, 0))',
            'people = [{"name": "cy", "age": 30}, {"name": "ana", "age": 24}]',
            'sorted(people, key=itemgetter("age"))',
            'second = itemgetter(1)',
            'second(["a", "b", "c"])',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'attrgetter for objects',
          body: '`itemgetter(1, 0)` is the tuple key without the tuple: given more than one index, it produces a tuple of those items, in that order. It works on anything supporting `[...]`, which is why the dict version above needed no change. `attrgetter` does the same job for objects with named fields — what you reach for with a dataclass.',
        },
        {
          kind: 'code',
          caption: 'Sorting objects by a field.',
          code: 'from dataclasses import dataclass\nfrom operator import attrgetter\n\n@dataclass\nclass Student:\n    name: str\n    score: int\n\nclass_list = [Student("cy", 71), Student("bo", 88), Student("ana", 71)]\n\nfor s in sorted(class_list, key=attrgetter("score", "name")):\n    print(s.name, s.score)\n',
        },
        {
          kind: 'table',
          caption: 'Which form to use.',
          head: ['The key you want', 'Written as'],
          rows: [
            ['The item itself', 'leave key out'],
            ['A built-in applied to the item', 'key=len, key=abs, key=str.lower'],
            ['One position or dict key', 'key=itemgetter(1)'],
            ['Several, as a tie-break', 'key=itemgetter(1, 0)'],
            ['A field of an object', 'key=attrgetter("score")'],
            ['Anything with a rule in it', 'key=lambda, or a named function'],
          ],
        },
      ],
    },
    {
      id: 'stability',
      title: 'What stable means',
      blocks: [
        {
          kind: 'prose',
          body: 'Python\'s sort is **stable** — a promise, not an accident: when two items have equal keys, they come out in the order they went in. That is what makes a two-pass sort work, and it is one of the few guarantees you can build real behaviour on.',
        },
        {
          kind: 'code',
          caption: 'Sort by name, then sort that result by score. The second sort never disturbs the first.',
          code: 'rows = [("cy", 71), ("bo", 88), ("ana", 71)]\n\nby_name = sorted(rows, key=lambda r: r[0])\nprint("after pass 1:", by_name)\n\nby_score_then_name = sorted(by_name, key=lambda r: r[1])\nprint("after pass 2:", by_score_then_name)\n\nprint("tuple key:   ", sorted(rows, key=lambda r: (r[1], r[0])))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Two passes or one tuple',
          body: 'The two-pass result and the tuple-key result above came out the same: sort by the least important field first, then the most important, and the earlier order survives inside each tie. A tuple key is usually clearer for two or three fields; two passes earn their place when directions differ and one field is not a number, or the passes happen in different parts of a program.',
        },
        {
          kind: 'compare',
          caption: 'Both give descending scores, but reverse=True is not the same as sorting then reversing — look at what happens to the two rows tied on 71.',
          left: {
            label: 'Sort, then reverse the list',
            code: 'rows = [("cy", 71), ("bo", 88), ("ana", 71)]\nprint(sorted(rows, key=lambda r: r[1])[::-1])\n',
            bad: true,
          },
          right: {
            label: 'reverse=True',
            code: 'rows = [("cy", 71), ("bo", 88), ("ana", 71)]\nprint(sorted(rows, key=lambda r: r[1], reverse=True))\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Both sides above give descending scores. Why do the tied rows (both scoring 71) end up in a different order?',
          options: [
            {
              text: '[::-1] reverses the whole list, ties included, so tied rows come out in the opposite of their original order; reverse=True reverses the comparison and leaves ties in their original order',
              correct: true,
              why: 'That is exactly the mechanism: slicing does not know or care which rows were tied, while reverse=True changes how the sort compares, not the list it produces afterward.',
            },
            {
              text: 'reverse=True is buggy for tied values and should be avoided',
              why: 'reverse=True works correctly here — it deliberately preserves tie order, which is usually the behaviour you want, not a bug.',
            },
            {
              text: 'Both sides give the exact same order; ties cannot be told apart after sorting',
              why: 'They do not match: the compare block above shows the tied rows land in a different relative order on each side.',
            },
            {
              text: 'sorted() with a key does not guarantee stability the way plain sorted() does',
              why: 'Stability is a property of Python\'s sort itself, regardless of whether a key is given — it applies exactly the same either way.',
            },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'stable-tiebreak',
            title: 'Where a tie lands depends on what came before',
            intro: 'Five students, three of them tied on 71. Choose what to sort by and watch the three ties settle into a different order each time — never scrambled, always inherited from somewhere.',
            template: 'rows = [("cy", 71), ("bo", 88), ("ana", 71), ("di", 95), ("eli", 71)]\nresult = ⟦sortby⟧\nprint(result)\n',
            knobs: [
              {
                id: 'sortby',
                label: 'sort by',
                choices: [
                  { value: 'sorted(rows, key=lambda r: r[0])', caption: 'name' },
                  { value: 'sorted(rows, key=lambda r: r[1])', caption: 'score' },
                  { value: 'sorted(sorted(rows, key=lambda r: r[0]), key=lambda r: r[1])', caption: 'name, then score' },
                  { value: 'sorted(rows, key=lambda r: r[1], reverse=True)', caption: 'score, high to low' },
                ],
              },
            ],
            probes: {
              'order-scores': '[r[1] for r in (⟦sortby⟧)]',
              'order-names': '[r[0] for r in (⟦sortby⟧)]',
            },
            visual: {
              kind: 'bars',
              values: 'order-scores',
              labels: 'order-names',
              caption: 'The scores in the order the sort produced, labelled with whose score each bar is.',
            },
            notes: {
              '0': 'Sorted by name: ana, bo, cy, di, eli. The three tied scores of 71 are scattered wherever their names put them — this key does not group them at all.',
              '1': 'Sorted by score: the three 71s tie, and a stable sort never reorders a tie, so they keep the order they already had in `rows` — cy, then ana, then eli.',
              '2': 'Sorted by name first, then by score: the first pass already put the ties in alphabetical order — ana, cy, eli — and because the second sort is stable, it has no reason to disturb that order. Same three names, same scores, a different tie order from sorting by score alone.',
              '3': '`reverse=True` sorted by score, high to low: the highest scores come first, and the tied 71s still keep their original order from `rows` — cy, ana, eli — because `reverse=True` flips the comparison, not the list.',
            },
            takeaway: 'A stable sort never reorders two rows whose keys are equal — it leaves them exactly as they were relative to each other. That is why the three tied scores land in a different order depending on what happened before the sort: whatever order existed going in is the order ties come out in, whichever key you choose and whichever direction you sort.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'A leaderboard is built by sorting entries alphabetically by name, then sorting by score with `reverse=True`. A colleague replaces the second step with `sorted(entries, key=score)[::-1]` and says it is the same thing. What breaks, and for whom?',
          answer: 'Ties break. Two players on the same score were in alphabetical order after the first pass, and `reverse=True` keeps them that way. Slicing with `[::-1]` reverses the whole list, so tied players come out in **reverse** alphabetical order.\n\nIt breaks for exactly the players who are level with someone else, which is why it survives a casual test on data where no two scores are equal, and shows up in production the first week two people tie.',
        },
      ],
    },
    {
      id: 'in-practice',
      title: 'Putting it together',
      blocks: [
        {
          kind: 'prose',
          body: 'A realistic sort usually has three parts: a rule that cleans the data, a key that expresses the ordering, and a decision about direction. Written together, they stay readable.',
        },
        {
          kind: 'code',
          caption: 'Ranking a class: highest score first, ties alphabetically, missing scores last.',
          code: 'rows = [\n    ("Cy", 71),\n    ("bo", 88),\n    ("Ana", 71),\n    ("di", None),\n    ("Eli", 95),\n]\n\ndef ranking_key(row):\n    """Rank highest first, then by name, with missing scores at the end."""\n    name, score = row\n    missing = score is None\n    return (missing, -score if score is not None else 0, name.lower())\n\nfor place, (name, score) in enumerate(sorted(rows, key=ranking_key), start=1):\n    shown = "no score" if score is None else score\n    print(f"{place}. {name:<4} {shown}")\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Three things worth copying',
          body: '`missing` is a boolean used as the first sort field — `False` sorts before `True`, so every row with a score comes before every row without one, no separate filtering pass needed. The score is negated so high scores come first, meaning `reverse=True` is never needed, so the name tie-break still runs the direction it was written. `name.lower()` makes the tie-break ignore capitals, the same job `key=str.lower` did earlier, done inside a bigger key.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Rewrite that ranking using `reverse=True` on the score instead of negating it. What has to change about the name tie-break, and which version would you keep?',
          answer: 'You cannot do it in one sort. `reverse=True` reverses the whole comparison, so the name tie-break would run backwards too, and the missing-score flag would flip and put missing scores first.\n\nTwo passes do it: sort by `name.lower()` ascending, then sort by `(score is None, score)` with `reverse=True` — and even then the missing flag needs inverting, because reversing puts `True` first.\n\nKeep the negation version. One sort, one key, and every direction stated in the key itself. `reverse=True` is at its best when there is a single field and no tie-break worth protecting.',
        },
      ],
    },
  ],
};

export default lesson;
