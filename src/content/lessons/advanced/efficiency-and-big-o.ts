// Advanced: how the cost of code grows with the size of its input, reasoned about rather than measured.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'efficiency-and-big-o',
  title: 'Efficiency and big O',
  summary: 'Counting the work a loop does, and seeing which choices make it grow faster than the data',
  track: 'advanced',
  order: 14,
  minutes: 28,
  outcomes: [
    'Say how the work a piece of code does grows as its input grows',
    'Explain why `in` on a list costs more as the list grows and `in` on a set does not',
    'Recognise the quadratic string-building loop and replace it with `join`',
    'Read a nested loop and state its cost without running it',
  ],
  sections: [
    {
      id: 'counting-not-timing',
      title: 'Count steps, not seconds',
      blocks: [
        {
          kind: 'prose',
          body: 'Timing a program tells you about your laptop today: what else was running, how warm the machine is, which interpreter you used. Counting **operations** tells you about the program, and that number is the same everywhere.\n\nThe question worth asking is not "how long does this take?" but "if the input gets ten times bigger, what happens to the work?" There are only a few answers you meet in practice.',
        },
        {
          kind: 'table',
          caption: 'The shapes of growth, in the order you want them.',
          head: ['Name', 'Work when the input doubles', 'Something that does it'],
          rows: [
            ['Constant', 'Unchanged', 'Reading `x[0]`, `len(x)`, a dict lookup'],
            ['Logarithmic', 'One more step', 'Binary search in a sorted list'],
            ['Linear', 'Doubles', 'One loop over the data, `sum`, `max`, `in` on a list'],
            ['Linear-logarithmic', 'A bit more than doubles', '`sorted()`'],
            ['Quadratic', 'Four times as much', 'A loop inside a loop over the same data'],
            ['Exponential', 'Squares', 'Trying every subset of the data'],
          ],
        },
        {
          kind: 'prose',
          body: 'Those names are the whole of "big O" for everyday purposes: linear is written O(n), quadratic O(n²), and so on, where n is the size of the input. The notation ignores constants on purpose — a linear loop that does three things per item is still linear — because what matters at scale is the shape, not the multiplier.\n\nThe rest of this lesson counts real operations, so you can see the shapes rather than take them on trust.',
        },
        {
          kind: 'code',
          caption: 'Three loops over the same list, with the work each one does counted.',
          code: "def count_single(values):\n    steps = 0\n    for v in values:\n        steps += 1\n    return steps\n\ndef count_two_passes(values):\n    steps = 0\n    for v in values:\n        steps += 1\n    for v in values:\n        steps += 1\n    return steps\n\ndef count_nested(values):\n    steps = 0\n    for a in values:\n        for b in values:\n            steps += 1\n    return steps\n\nfor n in [10, 20, 40, 80]:\n    data = list(range(n))\n    print(n, count_single(data), count_two_passes(data), count_nested(data))\n",
        },
        {
          kind: 'prose',
          body: 'Read the columns down, not across. The first two both double when `n` doubles — one is twice the other, and that constant is exactly what big O throws away, because both stay in step with the data. The third column quadruples. That is a different kind of thing, and no amount of tuning inside the loop will change it.',
        },
      ],
    },
    {
      id: 'list-versus-set',
      title: 'Why `in` on a list is slow',
      blocks: [
        {
          kind: 'prose',
          body: '`x in some_list` has no choice but to compare `x` against the items one at a time until it finds a match or runs out. `x in some_set` computes a hash and goes straight to the one place the value could be.\n\nYou do not have to take that on trust either. Here is an object that counts every time it is compared.',
        },
        {
          kind: 'code',
          caption: 'The same 1000 values, in a list and in a set. The counter is the number of `==` comparisons.',
          code: "class Counted:\n    checks = 0\n\n    def __init__(self, n):\n        self.n = n\n\n    def __eq__(self, other):\n        Counted.checks += 1\n        return self.n == other.n\n\n    def __hash__(self):\n        return hash(self.n)\n\nitems = [Counted(i) for i in range(1000)]\nas_list = items\nas_set = set(items)\n\nfor label, box in [('list', as_list), ('set', as_set)]:\n    Counted.checks = 0\n    found = Counted(999) in box\n    print(label, 'last item:', found, 'comparisons:', Counted.checks)\n    Counted.checks = 0\n    found = Counted(-1) in box\n    print(label, 'absent:', found, 'comparisons:', Counted.checks)\n",
        },
        {
          kind: 'prose',
          body: 'The list had to walk the whole way; the set did almost nothing, and for the absent value it did not compare anything at all, because the hash told it there was nothing in that place to compare against.\n\nThat difference is invisible in a 10-item list and decisive in a 100,000-item one. And it does not depend on how fast your computer is.',
        },
        {
          kind: 'code',
          caption: 'Where this actually bites: checking for duplicates two ways, with the steps counted.',
          code: "def duplicates_by_scanning(values):\n    steps = 0\n    seen = []\n    out = []\n    for v in values:\n        for s in seen:\n            steps += 1\n            if s == v:\n                out.append(v)\n                break\n        else:\n            seen.append(v)\n    return out, steps\n\ndef duplicates_by_set(values):\n    steps = 0\n    seen = set()\n    out = []\n    for v in values:\n        steps += 1\n        if v in seen:\n            out.append(v)\n        else:\n            seen.add(v)\n    return out, steps\n\nfor n in [100, 200, 400]:\n    data = list(range(n))\n    print(n, 'scanning:', duplicates_by_scanning(data)[1], ' set:', duplicates_by_set(data)[1])\nprint(duplicates_by_scanning([1, 2, 2, 3, 1])[0], duplicates_by_set([1, 2, 2, 3, 1])[0])\n",
        },
        {
          kind: 'prose',
          body: 'Same answer, same loop shape at a glance, and the step counts grow at completely different rates. The only change is what `seen` is. This is the single highest-value efficiency habit in everyday Python: **if a collection exists to answer "have I seen this?", make it a set.**',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Dicts are sets with a value attached',
          body: 'Looking a key up in a dict costs the same as checking membership in a set, and for the same reason. `counts[word] = counts.get(word, 0) + 1` over a million words is linear; the same tally kept in a list of pairs, searched each time, is quadratic.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program reads 20,000 names and keeps a list `seen`, testing `if name in seen:` on each one before appending. Roughly how many comparisons does that do in total when every name is new, and what is the exact change that fixes it? What does the fix cost you?',
          answer: 'The first name compares against nothing, the second against one, and so on, so it is 0 + 1 + 2 + ... + 19,999, which is about 200 million comparisons — n²/2. Changing `seen = []` to `seen = set()` and `seen.append(name)` to `seen.add(name)` makes it 20,000 lookups. What it costs: a set does not keep the order the names arrived in, cannot hold unhashable items such as lists, and uses more memory per item. If order matters, keep both — a set for the membership test and a list for the order — which is a normal and unembarrassing thing to do.',
        },
      ],
    },
    {
      id: 'strings',
      title: 'The string-building loop',
      blocks: [
        {
          kind: 'prose',
          body: 'Strings in Python cannot be changed. `s = s + piece` does not extend `s`; it builds a **new** string containing everything that was in `s` plus the piece, and points `s` at that. The old contents are copied every single time.\n\nSo a loop that grows a string one piece at a time copies 1 character, then 2, then 3, and so on. Count that up.',
        },
        {
          kind: 'code',
          caption: 'The characters copied by each approach, for a text built from n one-character pieces.',
          code: "def characters_copied_by_plus(n):\n    copied = 0\n    length = 0\n    for _ in range(n):\n        copied += length        # everything so far is copied into the new string\n        length += 1\n    return copied\n\ndef characters_copied_by_join(n):\n    return n                    # every piece is copied once, into the finished string\n\nprint('n     plus      join')\nfor n in [100, 200, 400, 800]:\n    print(n, characters_copied_by_plus(n), characters_copied_by_join(n))\n\nprint('plus, doubling n:', characters_copied_by_plus(800) / characters_copied_by_plus(400))\nprint('join, doubling n:', characters_copied_by_join(800) / characters_copied_by_join(400))\n",
        },
        {
          kind: 'prose',
          body: 'Doubling the input multiplied one of those by about four and the other by exactly two. That is the difference between quadratic and linear, arrived at without a stopwatch.\n\nThe two versions produce identical text, which is what makes the slow one so easy to write and so hard to notice.',
        },
        {
          kind: 'code',
          caption: 'Same output, different amount of copying.',
          code: "rows = ['apples,5', 'pears,2', 'plums,9']\n\nreport = ''\nfor row in rows:\n    report = report + row + '\\n'\n\njoined = '\\n'.join(rows) + '\\n'\n\nprint(repr(report))\nprint(repr(joined))\nprint(report == joined)\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The same trap wears other clothes',
          body: 'Any loop that builds a new whole thing on each pass is quadratic: `result = result + [item]` on lists, `merged = merged | {item}` on sets, `total = total + row` where `row` is a list. The fix is the same shape every time — collect the pieces in a list with `append`, and combine them once at the end with `join`, `extend` or a single `sum`.',
        },
        {
          kind: 'prose',
          body: 'One honest caveat: CPython has an optimisation that can sometimes extend a string in place when nothing else is using it, so a timed test of `+` in a loop occasionally looks fine. The optimisation is not a promise, it disappears as soon as a second name refers to the string, and it does not exist in other Python implementations. The counting above is what the language guarantees, and `join` is what you should write.',
        },
      ],
    },
    {
      id: 'nested-loops',
      title: 'Reading a nested loop',
      blocks: [
        {
          kind: 'prose',
          body: 'A loop inside a loop is not automatically quadratic. What matters is **what the inner loop runs over**. If the inner range grows with the input, the costs multiply. If it is fixed, the inner loop is a constant that big O ignores.',
        },
        {
          kind: 'code',
          caption: 'Three nested loops. Only some of them are quadratic.',
          code: "def all_pairs(values):\n    steps = 0\n    for a in values:\n        for b in values:\n            steps += 1\n    return steps\n\ndef later_pairs(values):\n    steps = 0\n    for i in range(len(values)):\n        for j in range(i + 1, len(values)):\n            steps += 1\n    return steps\n\ndef fixed_inner(values):\n    steps = 0\n    for v in values:\n        for field in ['name', 'mark', 'unit']:\n            steps += 1\n    return steps\n\nprint('n    all_pairs  later_pairs  fixed_inner')\nfor n in [10, 20, 40, 80]:\n    data = list(range(n))\n    print(n, all_pairs(data), later_pairs(data), fixed_inner(data))\n",
        },
        {
          kind: 'prose',
          body: 'Compare how each column changes as `n` doubles. `later_pairs` does a little under half the work of `all_pairs`, but both of them quadruple, so both are quadratic — the half is a constant, and constants do not change the shape. `fixed_inner` doubles, because three is three no matter how much data arrives.\n\nThe habit to build: when you see a nested loop, ask what the inner one iterates. Over the same data? Quadratic. Over a fixed list of fields? Linear.',
        },
        {
          kind: 'checkpoint',
          prompt: 'This function is a nested loop over two different inputs: `for name in names: for row in rows: if row[0] == name: ...`. With 500 names and 20,000 rows, how many comparisons is that, what shape is it, and what single data structure removes the inner loop?',
          answer: 'It is 500 × 20,000 = 10 million comparisons: the cost of a loop pair over two different inputs is the product, written O(n × m). Building a dict from the rows first — `by_name = {}` then one pass filling `by_name.setdefault(row[0], []).append(row)` — makes the inner loop a single lookup, so the total becomes 20,000 to build plus 500 to query. The point worth generalising: one extra pass over the data to build an index is almost always cheaper than searching the data repeatedly.',
        },
      ],
    },
    {
      id: 'reasoning',
      title: 'Working out a cost by reading',
      blocks: [
        {
          kind: 'steps',
          title: 'How to read the cost off a function',
          items: [
            'Find what "n" means for this function: the length of the list, the number of lines, the number of characters.',
            'Look at each loop and ask how many times it goes round in terms of n.',
            'Look inside each loop for anything that is itself a loop in disguise: `in` on a list, `sorted`, `max`, slicing, `+` on strings or lists, `list.remove`, `del x[0]`.',
            'Multiply the counts for nested loops; add the counts for loops that follow one another.',
            'Throw away constants and keep the fastest-growing term: n + n²/2 is quadratic, and 3n is linear.',
          ],
        },
        {
          kind: 'prose',
          body: 'Step three is where most surprises live, because the expensive things do not look like loops. `if name in names_list` is a loop. `values.remove(x)` is a loop. `sorted(data)` inside a loop over the data is n loops, each costing n log n.',
        },
        {
          kind: 'code',
          caption: 'A function whose cost is not what its one visible loop suggests.',
          code: "def max_by_sorting(rows):\n    comparisons = 0\n    out = []\n    for i in range(len(rows)):\n        ordered = sorted(rows[:i + 1])      # sorts everything so far, every pass\n        comparisons += (i + 1)\n        out.append(ordered[-1])\n    return out, comparisons\n\ndef running_max(rows):\n    comparisons = 0\n    out = []\n    best = None\n    for row in rows:\n        comparisons += 1\n        if best is None or row > best:\n            best = row\n        out.append(best)\n    return out, comparisons\n\nfor n in [50, 100, 200]:\n    data = list(range(n))\n    print(n, max_by_sorting(data)[1], running_max(data)[1])\nprint(max_by_sorting([3, 1, 2])[0] == running_max([3, 1, 2])[0])\n",
        },
        {
          kind: 'prose',
          body: 'Both functions produce the same list of running maximums. The counted numbers above understate the first one, because they count only the items handed to `sorted` and not the comparisons `sorted` makes inside itself — which is the point: the expensive work was hidden inside a call that occupies one line.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You need the smallest value in an unsorted list of a million numbers. One programmer writes `sorted(data)[0]`, another writes `min(data)`. Both are correct. What is the cost of each, and is there a case where the sort is the better choice?',
          answer: '`min` is linear: one pass, one comparison per item. `sorted(data)[0]` is n log n and builds a whole new million-item list to read one value from it, so it does more work and uses more memory. Yes, there is a case for sorting: if you also need the second smallest, the median, the top ten, or the data in order for anything else, sorting once and reading several answers off it beats several separate passes. The rule is not "never sort" but "do not sort to answer a question a single pass can answer".',
        },
      ],
    },
    {
      id: 'reference',
      title: 'What things cost',
      blocks: [
        {
          kind: 'table',
          caption: 'The operations worth knowing by heart. `n` is the number of items.',
          head: ['Operation', 'Cost', 'Note'],
          rows: [
            ['x[i], len(x), x.append(v)', 'Constant', 'Appending is constant on average, occasionally more while the list grows'],
            ['x in a_list, a_list.remove(v), a_list.index(v)', 'Linear', 'Every one of these is a hidden loop'],
            ['x in a_set, x in a_dict, d[k]', 'Constant', 'The reason sets and dicts exist'],
            ['a_list.insert(0, v), a_list.pop(0), del a_list[0]', 'Linear', 'Everything after the hole has to shuffle along'],
            ['sum, min, max, any, all', 'Linear', 'One pass'],
            ['sorted(x), x.sort()', 'n log n', 'Cheaper than you fear, but not free'],
            ['s + piece in a loop', 'Quadratic overall', 'Use a list and `join`'],
            ['a_list[a:b]', 'Linear in the slice', 'Slicing in a loop is a loop in a loop'],
            ['A loop inside a loop over the same data', 'Quadratic', 'The commonest accidental n²'],
          ],
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'What a first-year exam asks',
          body: 'You are more likely to be asked "how many times does this loop run?" or "what is the value of the counter at the end?" than to be asked for big-O notation. The counting you have done here answers both, and the notation is the summary of it.',
        },
        {
          kind: 'prose',
          body: 'Last, the part that keeps this honest: **most code does not matter.** A quadratic loop over the eight items in a menu will never be the slow part of anything. Write the clear version first; reach for the set, the dict or the `join` when the data is big, when it grows, or when the clear version is already the one you would have written anyway — which, for `join` and for sets, it usually is.\n\nWhen something is genuinely slow, find out which part before changing anything. A guess about where the time goes is wrong often enough that the profession has a saying about it.',
        },
      ],
    },
  ],
};

export default lesson;
