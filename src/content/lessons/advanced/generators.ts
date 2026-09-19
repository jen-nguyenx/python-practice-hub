// Advanced: producing values one at a time instead of building a list nobody needed whole.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'generators',
  title: 'Generators',
  summary: 'Producing values one at a time, why that lets a sequence be endless, and the trap of using one twice',
  track: 'advanced',
  order: 6,
  minutes: 26,
  prereqs: ['comprehensions'],
  outcomes: [
    'Write a function with `yield` and say what calling it does',
    'Explain why a generator can be endless when a list cannot',
    'Choose between a list comprehension and a generator expression',
    'Recognise the bug where a generator has already been used up',
  ],
  sections: [
    {
      id: 'yield',
      title: 'A function that pauses',
      blocks: [
        {
          kind: 'prose',
          body: 'An ordinary function runs top to bottom, hands back one value, and forgets everything. A function containing `yield` is different enough to get its own name — a **generator function**. Calling it does not run the body: it hands back a generator object, wound up and ready, that runs a little at a time and pauses at each `yield`, remembering exactly where it was.',
        },
        {
          kind: 'code',
          caption: 'The prints show when the body is running. Notice where they appear relative to the calls.',
          code: 'def countdown(n):\n    print("  [body starts]")\n    while n > 0:\n        print("  [about to yield]", n)\n        yield n\n        n = n - 1\n    print("  [body ends]")\n\nprint("calling the function")\ncounter = countdown(3)\nprint("got back a:", type(counter).__name__)\n\nprint("first next()")\nprint("value:", next(counter))\n\nprint("second next()")\nprint("value:", next(counter))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Read the order of those prints',
          body: 'Calling `countdown(3)` printed nothing from inside the body — it only started on the first `next()`, ran to the first `yield`, and stopped. The second `next()` picked up on the line **after** the yield, with `n` still holding what it held before. A generator is a function you can stop in the middle and come back to.',
        },
        {
          kind: 'code',
          caption: 'You rarely call next() by hand — a for loop does it for you, driving the same generator, and stops when it runs out.',
          code: 'def countdown(n):\n    while n > 0:\n        yield n\n        n = n - 1\n\nfor value in countdown(3):\n    print("tick", value)\nprint("done")\n\nprint(list(countdown(5)))\nprint(sum(countdown(5)))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'return in a generator',
          body: 'When the body finishes, the generator is finished and a `for` loop over it ends; `list(...)` and `sum(...)` drive it the same way, which is how you get all the values at once when you do want them all. A bare `return` inside a generator stops it early, exactly like falling off the end of the body — it does not produce a value the way `return` does in an ordinary function.',
        },
      ],
    },
    {
      id: 'laziness',
      title: 'Work that never happens',
      blocks: [
        {
          kind: 'prose',
          body: 'Because the body only runs when a value is asked for, work you never ask for is never done — not a saving in principle, but one you can watch. The two blocks below do the same "expensive" step, once per item; both are then asked for two values.',
        },
        {
          kind: 'compare',
          caption: 'Count how many times each version says "computing".',
          left: {
            label: 'A list: everything computed up front',
            code: 'def expensive(n):\n    print("computing", n)\n    return n * n\n\nvalues = [expensive(n) for n in range(6)]\nprint("first two:", values[0], values[1])\n',
            bad: true,
          },
          right: {
            label: 'A generator: only what was asked for',
            code: 'def expensive(n):\n    print("computing", n)\n    return n * n\n\ndef squares(count):\n    for n in range(count):\n        yield expensive(n)\n\nvalues = squares(6)\nprint("first two:", next(values), next(values))\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'The compare above asks both versions for their first two values. Why does the list version print "computing" six times while the generator prints it only twice?',
          options: [
            {
              text: 'The list comprehension runs its expression for every item immediately, building the whole list before anything is read; the generator only runs expensive() when next() actually asks for a value',
              correct: true,
              why: 'That is the whole idea of laziness: work happens exactly when a value is demanded, no earlier.',
            },
            {
              text: 'Generators are faster at arithmetic, so expensive() finishes without printing every time',
              why: 'expensive() always prints when it runs — the difference is how many times it is called, not how fast it runs.',
            },
            {
              text: 'The list version has a bug that skips some print statements',
              why: 'There is no bug — the list comprehension deliberately evaluates its expression once for every item in range(6), which is why all six computations happen.',
            },
            {
              text: 'Both actually compute all six values; the generator just delays printing them to the screen',
              why: 'The generator has not computed the other four squares at all yet — they do not exist until a further next() reaches them, they are not merely unprinted.',
            },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Laziness is provable, not assumed',
          body: 'The list version did all six pieces of work before the first value was read; the generator did two, because two were asked for. If the program had stopped after the first match it found, the difference would be larger still. This is also where the memory argument comes from: a list of a million results holds a million results, a generator holds one function, paused.',
        },
        {
          kind: 'code',
          caption: 'Adding up a million squares without ever building a list of them — nothing in this line ever holds more than one square at a time. The same sum written with square brackets inside builds the whole list first, uses it once, and throws it away.',
          code: 'total = sum(n * n for n in range(1_000_000))\nprint(total)\nprint(len(str(total)), "digits")\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Lazy means errors arrive late',
          body: 'A mistake inside a generator does not show up when the generator is created. It shows up on the `next()` that reaches that line, which may be in a completely different part of the program. If a traceback points at a `for` loop over a generator, the fault is often in the generator body.',
        },
      ],
    },
    {
      id: 'endless',
      title: 'A sequence with no end',
      blocks: [
        {
          kind: 'prose',
          body: 'A list has to finish being built before anything can use it, so a list of every even number is not a thing you can have. A generator has no such problem: it produces values for as long as it is asked. A generator with `while True` in it is normal, not a bug — asking it for *all* of its values would be.',
        },
        {
          kind: 'code',
          caption: 'An endless generator, stopped by the code that consumes it.',
          code: 'def evens():\n    n = 0\n    while True:\n        yield n\n        n = n + 2\n\nfirst_five = []\nfor value in evens():\n    if len(first_five) == 5:\n        break\n    first_five.append(value)\nprint(first_five)\n\nstream = evens()\nprint(next(stream), next(stream), next(stream))\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The caller decides how much',
          body: 'The `break` above is what ends it — control over how many values are taken moves out of the generator and into whoever is reading it, and that is often exactly the right split: the generator knows how to make evens, the caller knows how many it wants. `itertools` has the standard tools for taking a piece of something endless, reading better than a loop with a counter in it.',
        },
        {
          kind: 'shell',
          caption: '`itertools.count(1)` counts upward for ever, and the generator expression built on it is endless the same way `evens()` is — `islice` takes the first few, and `takewhile` takes values until one fails a test, which is how you say "while they are still small enough" without knowing how many that will be.',
          lines: [
            'import itertools',
            'squares = (n * n for n in itertools.count(1))',
            'list(itertools.islice(squares, 5))',
            'list(itertools.islice(itertools.count(10), 4))',
            'list(itertools.takewhile(lambda n: n < 30, (n * n for n in itertools.count(1))))',
            'list(itertools.islice(itertools.cycle("ab"), 5))',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Never call list() on something endless',
          body: '`list(evens())` and `sum(itertools.count())` do not raise. They run until the program is stopped or memory is gone. Anything that consumes an endless generator must have its own reason to stop: a `break`, an `islice`, a `takewhile`, or a condition in the loop.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'how-many-are-ever-made',
            title: 'Only what you ask for exists',
            intro: 'Drag **how many to take** from an endless generator of even numbers. Nothing beyond that count is ever produced, however far the slider goes.',
            template: 'def evens():\n    n = 0\n    while True:\n        yield n\n        n = n + 2\n\ngen = evens()\nproduced = [next(gen) for _ in range(⟦take⟧)]\nprint(produced)\n',
            knobs: [
              { id: 'take', kind: 'range', label: 'how many to take', min: 1, max: 12, start: 4 },
            ],
            probes: {
              picked: 'produced',
            },
            visual: {
              kind: 'numberline',
              min: 0,
              max: 22,
              picked: 'picked',
              caption: 'The even numbers this run actually produced. The generator has no opinion about the rest.',
            },
            notes: {
              '0': 'Taking one value runs the body exactly once, to the first `yield`, and then leaves it paused there. The generator does not know or care that it could keep going.',
              '11': 'Even at the top of the slider this is still twelve numbers out of an endless supply. Nothing about `evens()` changed; only how many times it was asked to continue.',
            },
            takeaway: 'A generator does not compute a batch and hand you a slice of it. Each `next()` runs the body forward to the next `yield` and no further, so the numberline only ever lights up exactly as many values as were asked for — never more, however large the ask.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'Write a generator that produces the Fibonacci numbers for ever, then use it to get the first Fibonacci number over 1000 — without producing any more values than you need.',
          answer: 'The generator is four lines, and the caller does the stopping:\n\n```\ndef fibonacci():\n    a, b = 0, 1\n    while True:\n        yield a\n        a, b = b, a + b\n\nfor value in fibonacci():\n    if value > 1000:\n        print(value)\n        break\n```\n\n`next(v for v in fibonacci() if v > 1000)` does the same in one line: the generator expression filters lazily, and `next` asks for exactly one value and stops. Neither version computes a single Fibonacci number past the first one that qualifies.',
        },
      ],
    },
    {
      id: 'genexp',
      title: 'Generator expressions',
      blocks: [
        {
          kind: 'prose',
          body: 'A generator expression is a comprehension with round brackets instead of square ones — the same three pieces, the same optional filter — but it produces the values lazily instead of building a list.',
        },
        {
          kind: 'shell',
          lines: [
            'nums = [4, -2, 7, 0, -9, 12]',
            '[n * n for n in nums]',
            'type(n * n for n in nums)',
            'list(n * n for n in nums)',
            'sum(n for n in nums if n > 0)',
            'max(n * n for n in nums)',
            'any(n < 0 for n in nums)',
            'all(n < 0 for n in nums)',
            'sorted((n for n in nums if n > 0), reverse=True)',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Round brackets earn their keep',
          body: 'Square brackets built a list with its contents right there; round brackets built something of an entirely different type with no values computed yet — getting at them means consuming the generator. When a comprehension sits directly inside a function that consumes it once (`sum`, `max`, `any`, `all`, `sorted`, `min`, `"".join`), square brackets build a list for no reason. `any` and `all` also stop early, which only works because the generator is lazy: `any(is_bad(x) for x in huge)` stops at the first bad one, while the list version tests every item first. The brackets can be dropped only when the generator expression is the sole argument to a call — with another argument, they are required.',
        },
        {
          kind: 'code',
          caption: 'Dropping the brackets when the generator expression is the only argument.',
          code: 'nums = [3, 1, 2]\nprint(sum(n * n for n in nums))\nprint(", ".join(str(n) for n in nums))\nprint(sorted((n * n for n in nums), reverse=True))\n',
        },
        {
          kind: 'code',
          caption: 'The same sort with the brackets left out. This does not run at all; the message is the rule.',
          code: 'nums = [3, 1, 2]\nprint(sorted(n * n for n in nums, reverse=True))\n',
        },
        {
          kind: 'match',
          ask: 'Drag each need onto the brackets that answer it.',
          pairs: [
            { left: 'A list to index, slice, or use more than once', right: 'square brackets' },
            { left: 'To pass straight into sum, max, any, all, join', right: 'round brackets, or none' },
            { left: 'To loop over once and discard', right: 'round brackets' },
            { left: 'Something endless', right: 'round brackets, or a generator function' },
            { left: 'To know the length', right: 'square brackets — a generator has no len()' },
          ],
        },
        {
          kind: 'shell',
          caption: 'The last row of that table, checked.',
          lines: [
            'nums = [3, 1, 2]',
            'len([n for n in nums])',
            'len(n for n in nums)',
          ],
        },
      ],
    },
    {
      id: 'exhausted',
      title: 'Used once, then empty',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the trap that catches everyone at least once: a generator is not a collection, it is a single pass over one. When the pass finishes, the generator is finished, and it does not go back to the start. It does not raise when used again — it behaves as though empty, which is worse, because the program carries on with a wrong answer.',
        },
        {
          kind: 'predict',
          ask: 'Predict the last two lines this prints.',
          code: 'squares = (n * n for n in range(4))\nprint(list(squares))\nprint(list(squares))\n',
          choices: [
            '[0, 1, 4, 9]\n[]',
            '[0, 1, 4, 9]\n[0, 1, 4, 9]',
            '[]\n[0, 1, 4, 9]',
            '[0, 1, 4, 9]\n[0]',
          ],
        },
        {
          kind: 'shell',
          caption: 'The same pattern with sum: the second call gets a suspiciously plausible zero instead of an error.',
          lines: [
            'again = (n * n for n in range(4))',
            'sum(again)',
            'sum(again)',
            'max(again, default="nothing left")',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'No error, no warning',
          body: 'A second pass returns empty or zero rather than raising, and a total of zero looks like a plausible answer — that is how this bug reaches production. Partial consumption is the sneakier version: anything that reads part of a generator leaves the rest behind, and the next reader starts from wherever the last one stopped.',
        },
        {
          kind: 'shell',
          caption: 'A membership test reads until it finds a match, and leaves the rest — `3 in values` reads 0, 1, 2 and 3 to answer, and those four are gone; what is left is what comes after, so the final line finds nothing.',
          lines: [
            'values = (n for n in range(6))',
            '3 in values',
            'list(values)',
            '0 in values',
          ],
        },
        {
          kind: 'compare',
          caption: 'Two passes over the same data. The left one gets a wrong answer without complaining. The rule: if the values are needed more than once, keep them — build a list, or call the generator function again for a fresh one, which is why generator *functions* are more reusable than generator *expressions*.',
          left: {
            label: 'Reusing a generator',
            code: 'readings = (n for n in [3, 8, 5, 8, 1])\n\nbiggest = max(readings)\ncount = len(list(readings))\naverage = sum(readings) / 5\n\nprint("biggest:", biggest)\nprint("count:  ", count)\nprint("average:", average)\n',
            bad: true,
          },
          right: {
            label: 'Keeping the values you need twice',
            code: 'readings = [n for n in [3, 8, 5, 8, 1]]\n\nbiggest = max(readings)\ncount = len(readings)\naverage = sum(readings) / 5\n\nprint("biggest:", biggest)\nprint("count:  ", count)\nprint("average:", average)\n',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'This function is meant to report whether a file of readings has any negative value, and what the largest reading is. It gets the right answer for the first question and a strange one for the second. Why, and what are the two ways to fix it?\n\n```\ndef report(readings):\n    has_negative = any(r < 0 for r in readings)\n    biggest = max(readings)\n    return has_negative, biggest\n```',
          answer: 'Nothing is wrong when `readings` is a list. It goes wrong when the caller passes a generator, which is what a caller who read the last section is likely to do.\n\n`any` stops at the first negative reading and leaves the rest of the generator unread; if there was no negative one, `any` consumes the whole thing. Either way `max` gets only the leftovers, and on an exhausted generator it raises a `ValueError` for having nothing to take a maximum of.\n\nThe two fixes: make the function defensive with `readings = list(readings)` on the first line, so one pass is guaranteed no matter what was passed; or make the contract explicit by taking a list and documenting it. The defensive version is friendlier and costs memory; the documented version is cheaper and puts the duty on the caller.',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'When to reach for one',
      blocks: [
        {
          kind: 'prose',
          body: 'A generator is not automatically better — it trades away looking twice, indexing, and knowing the length, for laziness and memory. When the data is small and you want it all, a list is the honest, simpler-to-debug choice.',
        },
        {
          kind: 'table',
          caption: 'Reading the trade.',
          head: ['Question', 'List', 'Generator'],
          rows: [
            ['Can you take len()?', 'yes', 'no'],
            ['Can you index or slice it?', 'yes', 'no'],
            ['Can you loop over it twice?', 'yes', 'no, it is spent'],
            ['How much does it hold?', 'every item', 'one item, and where it was'],
            ['Can it be endless?', 'no', 'yes'],
            ['Is the work done up front?', 'yes', 'only what is asked for'],
          ],
        },
        {
          kind: 'code',
          caption: 'Where a generator really pays is as a **pipeline**: three stages, each taking values one at a time from the stage before and passing them on, so only one value is ever in flight — the trace below shows reads and results interleaved rather than in two blocks, proof that no stage waited for the one before it to finish.',
          code: 'def read_rows(lines):\n    for line in lines:\n        print("  read:", line)\n        yield line.split(",")\n\ndef only_passes(rows):\n    for row in rows:\n        if row[2] == "PASS":\n            yield row\n\ndef names(rows):\n    for row in rows:\n        yield row[0].title()\n\nlines = ["ana,71,PASS", "bo,48,FAIL", "cy,83,PASS"]\n\npipeline = names(only_passes(read_rows(lines)))\nfor name in pipeline:\n    print("got:", name)\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The shape worth taking away',
          body: 'Swap the list of lines for a file with ten million rows and nothing about that code changes, including how much memory it uses. Write each stage as a small generator that does one thing, and let the last consumer decide how much to pull through.',
        },
      ],
    },
  ],
};

export default lesson;
