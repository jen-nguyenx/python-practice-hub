import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't06-s2',
  title: 'Bureau of Meteorology weather logs',
  story:
    'A volunteer project collects Bureau of Meteorology readings from stations around Perth. ' +
    'Each reading is a tuple, a week of rain gauges is a list of lists, and the weekly summary has to come back as one tuple.',
  questions: [
    // ------------------------------------------------------------------ q1 mcq (easy)
    {
      id: 't06-s2-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Which line crashes?',
      prompt:
        'Each reading is stored as a tuple `(station, max_temp, wind)`. The first line below runs, then **one** of the options is run on its own. Which option raises an error?',
      code: "reading = ('Perth Airport', 38.4, 'SW')",
      concepts: ['tuple', 'unpacking', 'immutability'],
      detects: ['tuple_immutability', 'index_out_of_range'],
      expectedSec: 75,
      options: [
        {
          id: 'a',
          text: 'station, temp, wind = reading',
          mistake: 'tuple_immutability',
          why: 'Unpacking only reads the tuple. There are three names for three items, so `station` gets \'Perth Airport\', `temp` gets 38.4 and `wind` gets \'SW\'.',
        },
        {
          id: 'b',
          text: 'reading[1] = 39.0',
          correct: true,
          why: 'Tuples cannot be changed after they are made. Python raises `TypeError: \'tuple\' object does not support item assignment`.',
        },
        {
          id: 'c',
          text: 'reading = (reading[0], 39.0, reading[2])',
          mistake: 'tuple_immutability',
          why: 'This builds a brand new tuple and points the name `reading` at it. No tuple is changed, so it is allowed. It is the usual way to "update" a tuple.',
        },
        {
          id: 'd',
          text: 'print(reading[-1])',
          mistake: 'index_out_of_range',
          why: 'Negative indexes count back from the end, so `reading[-1]` is the last item and this prints `SW`.',
        },
      ],
      hints: [
        'Tuples allow reading (indexing, slicing, unpacking) but not changing. Which option tries to change an existing tuple?',
        'Tell apart "change an item inside the tuple" and "make a new tuple and reuse the name". Only one of those is an error.',
        'Look at the option with `[...] =` on the left of the equals sign.',
      ],
      solution: {
        explanation:
          '(a) unpacks the three items into three names, which is fine.\n\n' +
          '(b) tries to replace the item at position 1 inside the tuple. Tuples are immutable, so this raises a TypeError.\n\n' +
          '(c) looks similar, but it creates a new tuple from the old values and 39.0, then rebinds the name `reading`; nothing is modified.\n\n' +
          '(d) reads the last item with a negative index and prints `SW`.',
      },
      selfExplain: 'If the temperature needs to change often, what type would you store the reading in instead, and why?',
    },

    // ------------------------------------------------------------------ q2 trace (medium)
    {
      id: 't06-s2-q2',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'Rain gauge totals',
      prompt:
        'Rainfall in mm from three gauges is stored as a list of lists: each inner list is one gauge\'s readings for Monday to Wednesday. ' +
        'Fill in `gauge`, `total` and `totals` each time line 7 finishes running.',
      code: `rain = [[0, 4, 12], [3, 0, 0], [7, 1, 9]]
totals = []
for gauge in rain:
    total = 0
    for mm in gauge:
        total += mm
    totals.append(total)
print(totals)`,
      watch: ['gauge', 'total', 'totals'],
      anchorLine: 7,
      concepts: ['nested-list', 'nested-loop', 'accumulator', 'append'],
      detects: ['accumulator_init'],
      expectedSec: 200,
      hints: [
        'The outer loop runs once per inner list, so line 7 runs three times. What is `gauge` on each pass?',
        'For each gauge: `total` goes back to 0, the inner loop adds up that gauge\'s three readings, then line 7 appends the finished total. `totals` grows by one item per row.',
        'Row 1 is `gauge` = `[0, 4, 12]`, `total` = 16, `totals` = `[16]`.',
      ],
      solution: {
        explanation:
          'Pass 1: `gauge` is `[0, 4, 12]`. `total` restarts at 0, the inner loop adds 0 + 4 + 12 = 16, and line 7 appends it, so `totals` is `[16]`.\n\n' +
          'Pass 2: `gauge` is `[3, 0, 0]`, `total` restarts at 0 and ends at 3, and `totals` becomes `[16, 3]`.\n\n' +
          'Pass 3: `gauge` is `[7, 1, 9]`, `total` is 17, and `totals` becomes `[16, 3, 17]`.\n\n' +
          'Because `total = 0` sits inside the outer loop, each gauge is added up on its own.',
      },
      selfExplain: 'What would totals be if the line total = 0 were moved above the outer for loop?',
    },

    // ------------------------------------------------------------------ q3 write (medium)
    {
      id: 't06-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Weekly summary as a tuple',
      prompt:
        'The Bickley station in the Perth Hills logs overnight temperatures, which can drop below zero in winter. ' +
        'Write `min_max_mean(temps)` that takes a list of temperatures (floats) and returns a **tuple** `(lowest, highest, mean)`, with the mean rounded to 2 decimal places. ' +
        'If `temps` is empty, return `None`.\n\n' +
        '`min()`, `max()` and `sum()` are allowed here, but also try it with a single loop: some exam questions rule those built-ins out.',
      fnName: 'min_max_mean',
      starter: `def min_max_mean(temps):
    """Return (lowest, highest, mean rounded to 2 dp), or None if temps is empty."""
    pass`,
      tests: [
        {
          id: 'v1',
          call: 'min_max_mean([8.1, 11.2, 9.4])',
          expect: '(8.1, 11.2, 9.57)',
          cmp: 'float',
          label: 'three nights',
          hidden: false,
        },
        {
          id: 'v2',
          call: 'min_max_mean([6.0])',
          expect: '(6.0, 6.0, 6.0)',
          cmp: 'float',
          label: 'one night',
          hidden: false,
        },
        {
          id: 'h1',
          call: 'min_max_mean([])',
          expect: 'None',
          label: 'empty list',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h2',
          call: 'min_max_mean([-2.0, -5.5])',
          expect: '(-5.5, -2.0, -3.75)',
          cmp: 'float',
          label: 'every night below zero',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h3',
          call: 'min_max_mean([4.2, 4.3, 4.3])',
          expect: '(4.2, 4.3, 4.27)',
          cmp: 'float',
          label: 'mean needs rounding',
          hidden: true,
        },
        {
          id: 'h4',
          call: 'min_max_mean([3.5, 0.5, 7.25, 1.2])',
          expect: '(0.5, 7.25, 3.11)',
          cmp: 'float',
          label: 'lowest and highest in the middle',
          hidden: true,
        },
      ],
      concepts: ['tuple-return', 'min-max', 'accumulator', 'round'],
      detects: ['index_out_of_range', 'accumulator_init', 'return_type_wrong', 'zero_division'],
      expectedSec: 300,
      hints: [
        'Deal with the empty list before you touch `temps[0]` or divide by `len(temps)`. Then think about where `lowest` and `highest` should start so that negative temperatures still work.',
        'Plan: if the list is empty return None; set `lowest` and `highest` to the first reading and `total` to 0; loop over every reading, updating `lowest`, `highest` and `total`; after the loop return a tuple with the rounded mean.',
        '```python\nlowest = temps[0]\nhighest = temps[0]\ntotal = 0\nfor t in temps:\n    ...\nreturn (lowest, highest, round(total / len(temps), 2))\n```',
      ],
      solution: {
        code: `def min_max_mean(temps):
    """Return (lowest, highest, mean rounded to 2 dp), or None if temps is empty."""
    if len(temps) == 0:
        return None
    lowest = temps[0]
    highest = temps[0]
    total = 0
    for t in temps:
        if t < lowest:
            lowest = t
        if t > highest:
            highest = t
        total += t
    return (lowest, highest, round(total / len(temps), 2))`,
        explanation:
          'Lines 3-4 return `None` for an empty list, before anything reads `temps[0]` or divides by a length of 0.\n\n' +
          'Lines 5-6 start `lowest` and `highest` at the first real reading. Starting them at 0 would break a week where every night is below zero (`highest` would stay 0).\n\n' +
          'Line 7 starts the running total at 0, before the loop.\n\n' +
          'Inside the loop, one `if` updates `lowest`, another updates `highest`, and every reading is added to `total`.\n\n' +
          'Line 14 builds the answer as a tuple with round brackets and rounds only the mean, only at the end.\n\n' +
          'The one-line version `return (min(temps), max(temps), round(sum(temps) / len(temps), 2))` after the empty check is also correct.',
      },
      selfExplain: 'Why does starting highest at 0 give the wrong answer for [-2.0, -5.5]?',
    },
  ],
};

export default scenario;
