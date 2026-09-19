// Core lesson for topic 03: for loops and range().
// Nothing here states what Python does. Every value a reader sees comes from the verifier running the block.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-for-loops',
  title: 'Repeating with for and range',
  summary: 'Where a range starts and stops, the accumulator pattern, and how to trace a loop by hand',
  track: 'core',
  minutes: 22,
  topicId: 'for-loops-range',
  prereqs: ['core-decisions'],
  outcomes: [
    'Say exactly which values a range() produces, including the empty ones',
    'Write the accumulator pattern: set up before the loop, update inside, use after',
    'Put an if inside a loop to count or total only some of the values',
    'Decide from the indentation whether a line runs every pass or once at the end',
    'Trace a loop on paper, one row per pass, and check it against what Python does',
  ],
  sections: [
    {
      id: 'why-a-loop',
      title: 'Why a loop',
      blocks: [
        {
          kind: 'prose',
          body: 'A loop is not a way to save typing. It is a way to write code that does not know in advance how many things it will handle. Seven days of temperatures can be seven lines; a file with an unknown number of rows cannot be.\n\nA `for` loop has a header ending in a colon and an indented body. The body runs once for every item, with the loop variable holding a different item each time. The indentation is what decides which lines repeat, so it carries meaning rather than being a matter of taste.',
        },
        {
          kind: 'code',
          caption: 'One line repeats and one line does not. The difference is four spaces.',
          code: `for day in range(1, 4):
    print('Day', day)
print('Done')
`,
        },
        {
          kind: 'prose',
          body: 'Three passes, three indented lines of output, then one line at the end. Move `print(\'Done\')` in by four spaces and it would appear after every day; that is the single most common indentation bug in the topic, and it never raises an error.',
        },
      ],
    },
    {
      id: 'range-bounds',
      title: 'Where a range starts and stops',
      blocks: [
        {
          kind: 'prose',
          body: '`range()` produces whole numbers on demand. It takes up to three arguments: where to start, where to **stop before**, and how big each jump is. The stop value is the line the counting must not cross, not the last value, and that one fact is behind most off-by-one bugs in first year.\n\nWrapping a range in `list()` is how you look at what it produces without running a loop. Do this in the shell whenever you are unsure.',
        },
        {
          kind: 'shell',
          caption: 'Two of these produce nothing at all, on purpose.',
          lines: [
            'list(range(5))',
            'list(range(2, 6))',
            'list(range(1, 10, 3))',
            'list(range(10, 0, -2))',
            'list(range(5, 5))',
            'list(range(5, 1))',
            'len(range(2, 6))',
            'n = 4',
            'list(range(1, n + 1))',
          ],
        },
        {
          kind: 'predict',
          ask: 'Predict exactly which numbers this range produces, including whether 9 is one of them.',
          code: 'print(list(range(2, 9, 2)))\n',
        },
        {
          kind: 'prose',
          body: 'When a question says "from 1 to n", including n, the stop has to be `n + 1`. When it says "the first n values", starting at zero, `range(n)` is already right.\n\nA loop over an empty range is not an error. The body runs zero times, quietly, and whatever comes after the loop still runs. A loop that prints nothing is almost always a range whose start and stop are the wrong way round for its step.',
        },
        {
          kind: 'walkthrough',
          ask: 'Step through it one line at a time. Watch `total` climb, and watch `p` change on every pass.',
          code: "prices = [4, 3, 5]\ntotal = 0\nfor p in prices:\n    total = total + p\nprint(total)\n",
          watch: ['prices', 'p', 'total'],
        },
        {
          kind: 'experiment',
          id: 't03-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'You want the numbers 10, 9, 8, ... down to 1. What are the three arguments to `range`?',
          answer: '`range(10, 0, -1)`. The start is the first value you want, the step is negative because you are counting down, and the stop is one *past* the last value in the direction you are travelling — so to finish on 1, stop at 0. Check it the quick way: type `list(range(10, 0, -1))` in the shell and count what comes back.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'How many times does it run',
          body: 'For a step of 1, `range(a, b)` runs `b - a` times when `b` is above `a`, and zero times otherwise. Exam questions often ask for the number of passes rather than the output.',
        },
      ],
    },
    {
      id: 'what-the-variable-holds',
      title: 'What the loop variable holds',
      blocks: [
        {
          kind: 'prose',
          body: 'A `for` loop does not only work on ranges. It works on anything made of items, and what an "item" is depends on what you looped over. Getting this wrong produces a `TypeError` inside the loop that reads as though the loop is broken, when in fact the item was never the kind of thing you assumed.',
        },
        {
          kind: 'code',
          caption: 'A word is made of letters, so a loop over a word hands you one letter at a time.',
          code: `for letter in 'Perth':
    print(letter)
`,
        },
        {
          kind: 'code',
          caption: 'A list of numbers hands you numbers, so you can do arithmetic and comparisons on each one.',
          code: `for temp in [31.5, 42.0, 28.3]:
    print(temp, temp >= 35)
`,
        },
        {
          kind: 'experiment',
          id: 't03-x3',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Changing the loop variable changes nothing',
          body: 'At the start of every pass the `for` line hands the loop variable its next value, whatever the body did to it. To move in steps, give `range` a step. To stop early, use `return` inside a function, or `break`.',
        },
      ],
    },
    {
      id: 'accumulator',
      title: 'Building up an answer',
      blocks: [
        {
          kind: 'prose',
          body: 'Most useful loops build one answer out of many values: a total, a count, a highest so far. The pattern always has three parts, each at its own indentation level: set up before the loop, update inside it, use the result after.',
        },
        {
          kind: 'order',
          ask: 'These five lines build a running total over a list of prices. Drag them into the order that makes the loop work.',
          lines: [
            { text: 'prices = [4.9, 3.2, 4.9, 6.4]', indent: 0 },
            { text: 'total = 0', indent: 0 },
            { text: 'for price in prices:', indent: 0 },
            { text: 'total = total + price', indent: 1 },
            { text: 'print(round(total, 2))', indent: 0 },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Where an accumulator starts',
          body: 'A sum starts at 0, a count starts at 0, and a product starts at 1 — starting a product at 0 would hold it at 0 forever.',
        },
        {
          kind: 'prose',
          body: 'Read the update line as "whatever the total was, plus this one". `total = total + price` is not a claim that the two sides are equal; the right side is worked out first, using the old value, and the answer becomes the new value. `total += price` is a shorthand for exactly that line.\n\nPut the set-up line **inside** the loop instead and the whole thing falls apart, without an error to warn you.',
        },
        {
          kind: 'compare',
          caption: 'One line moved in by four spaces.',
          left: {
            label: 'Set up inside the loop',
            bad: true,
            code: `prices = [4.9, 3.2, 4.9, 6.4]
for price in prices:
    total = 0
    total = total + price
print(round(total, 2))
`,
          },
          right: {
            label: 'Set up before the loop',
            code: `prices = [4.9, 3.2, 4.9, 6.4]
total = 0
for price in prices:
    total = total + price
print(round(total, 2))
`,
          },
        },
        {
          kind: 'prose',
          body: 'On the left the total goes back to zero at the start of every pass, so only the last price survives. That is why the answer on the left is a price rather than a total, and why it looks almost plausible.',
        },
        {
          kind: 'experiment',
          id: 't03-x2',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'growing-total',
            title: 'Watching the total climb, pass by pass',
            intro: 'Drag how many prices have been counted so far. Each bar is the total right after that pass finished.',
            template: 'prices = [4, 3, 5, 6, 2, 7, 1, 8]\nn = ⟦n⟧\ntotal = 0\nfor price in prices[:n]:\n    total = total + price\nprint("after", n, "prices, total =", total)\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'how many prices counted so far', min: 0, max: 8, start: 4 },
            ],
            probes: {
              'running-totals': '[sum(prices[:i + 1]) for i in range(⟦n⟧)]',
              'pass-labels': '[str(i + 1) for i in range(⟦n⟧)]',
            },
            visual: {
              kind: 'bars',
              values: 'running-totals',
              labels: 'pass-labels',
              caption: 'The accumulator after each pass. One bar per price counted so far.',
            },
            notes: {
              '0': 'Zero passes. The loop body runs no times at all, so `total` never moves off its starting value of 0. The line after the loop still runs; a for loop over nothing is not an error.',
              '4': 'Four bars, each taller than the last. Every price is positive, so the total can only climb or stay flat between one pass and the next, never fall.',
              '8': 'Every price counted. The last bar is the same number `sum(prices)` would give you directly, because that is all an accumulator is: the running answer, kept one step at a time.',
            },
            takeaway: 'Each bar is the accumulator one pass further into the loop. Here it only ever grows, because every price is positive, which is the shape an accumulator always makes: a staircase that climbs or holds, one step per pass, never sideways in a single jump.',
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not call it sum',
          body: '`sum`, `max`, `min`, `len` and `list` are built-in functions. A variable with one of those names hides the function for the rest of the program, and the next call to it fails with a message about something not being callable. Use `total`, `highest`, `smallest`, `count`.',
        },
      ],
    },
    {
      id: 'deciding-inside',
      title: 'Deciding inside a loop',
      blocks: [
        {
          kind: 'prose',
          body: 'Put an `if` in the body and the loop stops treating every value the same. The condition is asked afresh on every pass, so the accumulator only moves for the values that matter. This is how you count the days above a threshold, total only the passing marks, or find the biggest value so far.',
        },
        {
          kind: 'code',
          caption: 'Two accumulators and one condition, all in the same loop.',
          code: `marks = [72, 45, 88, 50, 39]
passes = 0
pass_total = 0
for mark in marks:
    if mark >= 50:
        passes = passes + 1
        pass_total = pass_total + mark
print(passes, pass_total)
`,
        },
        {
          kind: 'prose',
          body: 'Note the three indentation levels doing three different jobs: the `for` body runs every pass, the `if` body runs on some passes, and the `print` runs once at the end. Counting the levels is how you read a loop you did not write.\n\nThere is a trap hiding in this shape, and it appears the moment no value passes the test.',
        },
        {
          kind: 'checkpoint',
          prompt: 'The block above could go on to print the average pass mark with `pass_total / passes`. What happens on a list where nothing reaches 50?',
          answer: 'The counter never moves, so the division is by zero and the program stops. The block below shows it happening. Any average built from a conditional count needs a guard before the division: `if passes > 0:` and a sensible answer, often 0 or `None`, for the empty case. Markers test this case deliberately.',
        },
        {
          kind: 'code',
          caption: 'The same code on a list where nothing passes. This one stops on purpose.',
          code: `marks = [39, 45]
passes = 0
pass_total = 0
for mark in marks:
    if mark >= 50:
        passes = passes + 1
        pass_total = pass_total + mark
print(pass_total / passes)
`,
        },
      ],
    },
    {
      id: 'tracing',
      title: 'Tracing a loop by hand',
      blocks: [
        {
          kind: 'prose',
          body: 'Tracing is the skill the exam tests directly and the skill that makes debugging possible. It is not reading the code and guessing the answer. It is writing down, one row at a time, what every variable holds at the end of each pass.',
        },
        {
          kind: 'steps',
          title: 'How to trace',
          items: [
            'Write the values the range produces, before anything else. That tells you how many rows your table needs.',
            'Draw a column for the loop variable and one for every variable the body changes.',
            'Fill the first row with the values as they are **before** the loop starts.',
            'Work through the body line by line for each pass, writing the new value the moment a line changes it. Never change two columns in one step.',
            'When the rows run out, the answer is whatever the accumulator column holds last.',
            'Check the edge cases separately: a range that runs zero times, and one that runs once.',
          ],
        },
        {
          kind: 'prose',
          body: 'Trace the loop below on paper first. Four passes, two columns. Then look at the block, which prints its own trace, and compare it with yours row by row.',
        },
        {
          kind: 'code',
          caption: 'The loop prints the state at the end of every pass, then the answer.',
          code: `total = 0
for k in range(1, 5):
    total = total + k
    print('pass with k =', k, 'total is now', total)
print('answer', total)
`,
        },
        {
          kind: 'checkpoint',
          prompt: 'Your trace and the block disagree on one row. Which is more likely to be wrong, and what do you do about it?',
          answer: 'Yours, and that is the point of doing it. Find the first row where the two differ and work out which line of the body you applied wrongly, or in the wrong order. A trace that agrees everywhere tells you nothing new; the first disagreement is exactly where your model of the code is broken, and fixing your model there is worth more than the answer.',
        },
      ],
    },
    {
      id: 'worked-example',
      title: 'A loop that answers a question',
      blocks: [
        {
          kind: 'prose',
          body: 'The worked example below is the whole lesson in seven lines: a range chosen so the last value is included, a counter set up before the loop, an `if` with an `or` so a value that matches both rules is counted once, and a `return` after the loop rather than inside it. Read the steps in order.',
        },
        {
          kind: 'workedExample',
        },
      ],
    },
    {
      id: 'traps',
      title: 'Traps and practice',
      blocks: [
        {
          kind: 'prose',
          body: 'Every one of these runs without an error message. That is what makes loops worth tracing.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'Now go and write loops. The trace questions are the highest-value practice in this topic: do a few of those before the writing questions.',
        },
      ],
    },
  ],
};

export default lesson;
