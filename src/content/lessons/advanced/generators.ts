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
          body: 'An ordinary function runs from top to bottom, hands one value back, and forgets everything it was doing. A function containing `yield` behaves differently enough that it is given a different name: a **generator function**.\n\nCalling it does not run the body. It hands back a generator object with the body inside it, wound up and ready. The body runs a little at a time, and pauses at each `yield`, remembering exactly where it was.',
        },
        {
          kind: 'code',
          caption: 'The prints show when the body is running. Notice where they appear relative to the calls.',
          code: 'def countdown(n):\n    print("  [body starts]")\n    while n > 0:\n        print("  [about to yield]", n)\n        yield n\n        n = n - 1\n    print("  [body ends]")\n\nprint("calling the function")\ncounter = countdown(3)\nprint("got back a:", type(counter).__name__)\n\nprint("first next()")\nprint("value:", next(counter))\n\nprint("second next()")\nprint("value:", next(counter))\n',
        },
        {
          kind: 'prose',
          body: 'Read the order of those lines carefully, because it is the whole idea. Calling `countdown(3)` printed nothing from inside the body. The body only started on the first `next()`, ran as far as the first `yield`, and stopped there. The second `next()` picked up on the line **after** the `yield`, with `n` still holding what it held before.\n\nThat is what a generator is: a function you can stop in the middle and come back to.',
        },
        {
          kind: 'prose',
          body: 'You rarely call `next()` by hand. A `for` loop does it for you, and stops when the generator runs out.',
        },
        {
          kind: 'code',
          caption: 'The same generator, driven by a loop.',
          code: 'def countdown(n):\n    while n > 0:\n        yield n\n        n = n - 1\n\nfor value in countdown(3):\n    print("tick", value)\nprint("done")\n\nprint(list(countdown(5)))\nprint(sum(countdown(5)))\n',
        },
        {
          kind: 'prose',
          body: 'When the body finishes, the generator is finished, and the `for` loop ends. `list(...)` and `sum(...)` drive it the same way a loop does, which is how you get all the values at once when you do want them all.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'return in a generator',
          body: 'A bare `return` inside a generator stops it early, exactly like falling off the end of the body. It does not produce a value the way `return` does in an ordinary function.',
        },
      ],
    },
    {
      id: 'laziness',
      title: 'Work that never happens',
      blocks: [
        {
          kind: 'prose',
          body: 'Because the body only runs when a value is asked for, work you never ask for is never done. That is not a saving in principle; it is a saving you can watch.\n\nThe two blocks below do the same "expensive" step, once per item. One builds a list, the other yields. Both are then asked for two values.',
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
          kind: 'prose',
          body: 'The list version did all six pieces of work before the first value was read. The generator did two, because two were asked for. If the program had stopped after the first match it found, the difference would be larger still.\n\nThis is also where the memory argument comes from. A list of a million results holds a million results. A generator holds one function, paused.',
        },
        {
          kind: 'code',
          caption: 'Adding up a million squares without ever building a list of them.',
          code: 'total = sum(n * n for n in range(1_000_000))\nprint(total)\nprint(len(str(total)), "digits")\n',
        },
        {
          kind: 'prose',
          body: 'Nothing in that line ever held more than one square at a time. The same sum written with square brackets inside — `sum([n * n for n in range(1_000_000)])` — builds the whole list first, uses it once, and throws it away.',
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
          body: 'A list has to finish being built before anything can use it, so a list of every even number is not a thing you can have. A generator has no such problem: it produces values for as long as it is asked, and nobody has to decide in advance how many that will be.\n\nA generator with `while True` in it is normal, not a bug. What would be a bug is asking such a generator for *all* of its values.',
        },
        {
          kind: 'code',
          caption: 'An endless generator, stopped by the code that consumes it.',
          code: 'def evens():\n    n = 0\n    while True:\n        yield n\n        n = n + 2\n\nfirst_five = []\nfor value in evens():\n    if len(first_five) == 5:\n        break\n    first_five.append(value)\nprint(first_five)\n\nstream = evens()\nprint(next(stream), next(stream), next(stream))\n',
        },
        {
          kind: 'prose',
          body: 'The `break` is what ends it. Control over how many values are taken has moved out of the generator and into whoever is reading it, and that is often exactly the right split: the generator knows how to make evens, the caller knows how many it wants.\n\n`itertools` has the standard tools for taking a piece of something endless, and they read better than a loop with a counter in it.',
        },
        {
          kind: 'shell',
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
          kind: 'prose',
          body: '`itertools.count(1)` counts upwards for ever, and the generator expression built on top of it is endless in exactly the same way `evens()` is. Neither one is asked for all of its values.\n\n`islice` takes the first few. `takewhile` takes values until one fails a test and then stops, which is how you say "while they are still small enough" without knowing how many that will be.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Never call list() on something endless',
          body: '`list(evens())` and `sum(itertools.count())` do not raise. They run until the program is stopped or memory is gone. Anything that consumes an endless generator must have its own reason to stop: a `break`, an `islice`, a `takewhile`, or a condition in the loop.',
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
          body: 'A generator expression is a comprehension with round brackets instead of square ones. It has the same three pieces and the same optional filter, and it produces the values lazily instead of building a list.',
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
          kind: 'prose',
          body: 'Compare the first two results. Square brackets produced a list, with its contents right there. Round brackets produced something of an entirely different type, and no values at all — none have been computed yet. Getting at them means consuming the generator, which is what the `list(...)` on the next line does.\n\nThe lines after it are where generator expressions earn their keep. When a comprehension sits directly inside a function that is going to consume it once — `sum`, `max`, `any`, `all`, `sorted`, `min`, `"".join` — the square brackets build a list for no reason.',
        },
        {
          kind: 'prose',
          body: '`any` and `all` also stop early, which only works because the generator is lazy. `any(is_bad(x) for x in huge)` stops at the first bad one; the list version tests every item before `any` sees anything.\n\nThe brackets can be dropped when the generator expression is the only argument to a function. When there is another argument, they are required.',
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
          kind: 'table',
          caption: 'Which bracket.',
          head: ['You want', 'Write'],
          rows: [
            ['A list to index, slice, or use more than once', 'square brackets'],
            ['To pass straight into `sum`, `max`, `any`, `all`, `join`', 'round brackets, or none'],
            ['To loop over once and discard', 'round brackets'],
            ['Something endless', 'round brackets, or a generator function'],
            ['To know the length', 'square brackets: a generator has no `len()`'],
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
          body: 'This is the trap, and it catches everyone at least once. A generator is not a collection. It is a single pass over one. When the pass is finished, the generator is finished, and it does not go back to the start.\n\nIt does not raise when you use it again. It behaves as though it were empty, which is much worse, because the program carries on with a wrong answer.',
        },
        {
          kind: 'shell',
          caption: 'The same generator, consumed twice.',
          lines: [
            'squares = (n * n for n in range(4))',
            'list(squares)',
            'list(squares)',
            'sum(squares)',
            'again = (n * n for n in range(4))',
            'sum(again)',
            'sum(again)',
            'max(again, default="nothing left")',
          ],
        },
        {
          kind: 'prose',
          body: 'The second `list(squares)` came back empty and the second `sum(again)` came back as zero. No error, no warning. A total of zero looks like a plausible answer, and that is how this bug reaches production.\n\nPartial consumption is the sneakier version: anything that reads part of a generator leaves the rest behind, and the next reader starts from wherever the last one stopped.',
        },
        {
          kind: 'shell',
          caption: 'A membership test reads until it finds a match, and leaves the rest.',
          lines: [
            'values = (n for n in range(6))',
            '3 in values',
            'list(values)',
            '0 in values',
          ],
        },
        {
          kind: 'prose',
          body: '`3 in values` had to read 0, 1, 2 and 3 to answer, and those four are gone. What was left when the list was taken is what came after. The final line then found nothing at all.',
        },
        {
          kind: 'compare',
          caption: 'Two passes over the same data. The left one gets a wrong answer without complaining.',
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
          kind: 'prose',
          body: 'The rule that falls out of this is short. **If the values are needed more than once, keep them.** A generator is for one pass. When you want a second pass, either build a list, or call the generator function again to get a fresh generator.\n\nThat second option is the reason generator *functions* are more reusable than generator *expressions*: `countdown(3)` can be called as many times as you like, and each call gives a new one.',
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
          body: 'A generator is not automatically better. It trades away the ability to look twice, to index, and to know the length, in return for laziness and memory. When the data is small and you want it all, a list is the honest choice and the simpler one to debug.',
        },
        {
          kind: 'table',
          caption: 'Reading the trade.',
          head: ['Question', 'List', 'Generator'],
          rows: [
            ['Can you take `len()`?', 'yes', 'no'],
            ['Can you index or slice it?', 'yes', 'no'],
            ['Can you loop over it twice?', 'yes', 'no, it is spent'],
            ['How much does it hold?', 'every item', 'one item, and where it was'],
            ['Can it be endless?', 'no', 'yes'],
            ['Is the work done up front?', 'yes', 'only what is asked for'],
          ],
        },
        {
          kind: 'prose',
          body: 'Where a generator really pays is as a **pipeline**. Each stage takes values one at a time from the stage before, does its bit, and passes them on, so however many stages there are, only one value is ever in flight.',
        },
        {
          kind: 'code',
          caption: 'Three stages, and a trace showing that the value goes all the way through before the next one starts.',
          code: 'def read_rows(lines):\n    for line in lines:\n        print("  read:", line)\n        yield line.split(",")\n\ndef only_passes(rows):\n    for row in rows:\n        if row[2] == "PASS":\n            yield row\n\ndef names(rows):\n    for row in rows:\n        yield row[0].title()\n\nlines = ["ana,71,PASS", "bo,48,FAIL", "cy,83,PASS"]\n\npipeline = names(only_passes(read_rows(lines)))\nfor name in pipeline:\n    print("got:", name)\n',
        },
        {
          kind: 'prose',
          body: 'The reads and the results are interleaved rather than coming in two blocks, which shows that no stage waited for the one before it to finish. Swap the list of lines for a file with ten million rows and nothing about that code changes, including how much memory it uses.\n\nThat is the shape worth taking away. Write each stage as a small generator that does one thing, and let the last consumer decide how much to pull through.',
        },
      ],
    },
  ],
};

export default lesson;
