// Core lesson for topic 07: while loops and nested loops. Conditions, sentinels, digits, tolerance, pairs.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-while-loops',
  title: 'While loops and nested loops',
  summary: 'Repeating until something becomes true, and what happens when two loops sit inside each other',
  track: 'core',
  topicId: 'while-nested-loops',
  minutes: 25,
  prereqs: ['core-lists-tuples'],
  outcomes: [
    'Decide whether a job needs a while loop or a for loop',
    'Write a condition that stops, and find the update that makes it stop',
    'Stop at a sentinel value without reading past the end of a list',
    'Take a number apart digit by digit with % and //',
    'Sum a series until the terms are small enough, and round once at the end',
    'Work out how many times the inside of a nested loop runs',
  ],
  sections: [
    {
      id: 'which-loop',
      title: 'When a for loop cannot help',
      blocks: [
        {
          kind: 'prose',
          body: 'A `for` loop is a promise. It says: here is a collection, or a count, and I will go round once for each. That covers most repetition, and where it fits it is the clearer choice.\n\nSome jobs cannot make that promise. How many digits does a number have? Nobody knows until the digits run out. How many readings are there before the machine logs its end-of-batch marker? Until you find it, you do not know. How many terms of a series do you need before it is accurate enough? That depends on how accurate is enough. In every case the number of passes is not known in advance, and a `for` loop has nothing to count.',
        },
        {
          kind: 'code',
          caption: 'Counting the digits of a number. The loop has no idea how many passes it will take.',
          code: "n = 4096\ncount = 0\nwhile n > 0:\n    count = count + 1\n    n = n // 10\nprint('digits:', count)\nprint('n finished at', n)\n",
        },
        {
          kind: 'table',
          caption: 'The question to ask before you write the header.',
          head: ['The job', 'The loop'],
          rows: [
            ['Do something to every item of a list', 'for item in items'],
            ['Do something a known number of times', 'for i in range(n)'],
            ['Keep going until a value runs out or a marker appears', 'while'],
            ['Keep going until the answer is accurate enough', 'while'],
            ['Try every combination of two collections', 'for inside for'],
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'collatz-passes',
            title: 'How many passes, before you run it',
            intro: 'Drag the starting number. The rule never changes: halve an even number, or triple an odd one and add 1. Nobody, including the person who wrote this rule, can tell you how many passes it takes before you start.',
            template: 'n = ⟦start⟧\npasses = 0\nsteps = [n]\nwhile n != 1:\n    if n % 2 == 0:\n        n = n // 2\n    else:\n        n = n * 3 + 1\n    passes = passes + 1\n    steps.append(n)\nprint(\'passes:\', passes)\nprint(steps)\n',
            knobs: [
              { id: 'start', kind: 'range', label: 'starting number', min: 2, max: 20, start: 6 },
            ],
            probes: {
              points: '[[i, v] for i, v in enumerate(steps)]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'pass',
              yLabel: 'n',
              caption: 'The value of n after each pass of the loop, for this starting number.',
              series: [{ probe: 'points', label: 'n' }],
            },
            notes: {
              '0': 'Starting at 2 is the shortest real chain here: one halving and it is already at 1.',
              '5': 'Starting at 7 takes 16 passes, and along the way n climbs as high as 52 before it ever comes down. There was no way to see that coming from the number 7 alone.',
              '14': 'Starting at 16 is the smooth case: 16, 8, 4, 2, 1, four passes exactly, because 16 is a power of two and every pass is a plain halving.',
            },
            takeaway: 'A `for` loop can promise its count in advance because it is given the count. This loop cannot: two starting numbers a single step apart can take wildly different numbers of passes, and the only way to find out is to run it and watch the condition. That not-knowing-in-advance is exactly why `while` exists.',
          },
        },
      ],
    },
    {
      id: 'the-condition',
      title: 'The condition, and where it is checked',
      blocks: [
        {
          kind: 'prose',
          body: 'A `while` loop checks its condition at the **top**, before every pass, and nowhere else. Two consequences follow, and both of them surprise people.\n\nThe first is that a `while` loop can run zero times. If the condition is already false when the loop is reached, the body never happens at all, and any variable the body was supposed to set keeps whatever it had before.\n\nThe second is that a condition being broken halfway through the body does not stop anything. The pass finishes. Only then is the condition looked at again.',
        },
        {
          kind: 'code',
          caption: 'The same loop, twice, on different data.',
          code: "n = 0\ncount = 0\nwhile n > 0:\n    count = count + 1\n    n = n // 10\nprint('digits in 0 by this loop:', count)\n\ntemperature = 45\nwhile temperature > 40:\n    print('still hot at', temperature)\n    temperature = temperature - 2\nprint('the loop ended with temperature =', temperature)\n",
        },
        {
          kind: 'prose',
          body: 'The first loop never ran, so `count` kept the 0 it started with. That happens to look like a right answer here, which is exactly the danger: a zero-pass loop leaves no trace of itself. Whenever you write a `while` loop, ask what the smallest possible input does to it.\n\nThe second loop shows where a loop variable ends up. The printed values stop above 40, but the variable finished holding the first value that broke the condition, not the last one printed. Reading that final value as though it were the last good one is a standard off-by-one.',
        },
        {
          kind: 'experiment',
          id: 't07-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'A loop steps in threes and is written `while n != 30:`. What is the risk, and what would you write instead?',
          answer: 'If `n` starts somewhere that is not a multiple of 3 away from 30, it steps straight over 30 and the condition never becomes false again. A test for one exact value gets one chance to stop the loop. `while n < 30:` cannot be jumped over, because once `n` is past 30 the condition is false and stays false.',
        },
      ],
    },
    {
      id: 'loops-that-never-stop',
      title: 'Loops that never stop',
      blocks: [
        {
          kind: 'prose',
          body: 'A `while` loop only ends because something in the body changes a variable the condition reads. If a pass can happen without that change, the loop can get stuck, and the program hangs with no error message.\n\nThe usual cause is not a forgotten update. It is an update that was written inside an `if`, so it runs on some passes and not on others. Everything works on the data where the `if` is true, which is usually the data you tested with.\n\nThe program below has that bug. A counter and a limit have been added so the page can show you what it does; without them nothing would ever appear.',
        },
        {
          kind: 'code',
          caption: 'The update sits inside the if. The passes counter is a safety belt, not part of the real program.',
          code: "readings = [0, 0, 3, 0, -1]\ni = 0\npasses = 0\nwhile readings[i] != -1 and passes < 6:\n    passes = passes + 1\n    print('pass', passes, '  i =', i, '  reading =', readings[i])\n    if readings[i] == 0:\n        i = i + 1\nprint('gave up after', passes, 'passes, with i stuck at', i)\n",
        },
        {
          kind: 'prose',
          body: 'The first passes move along. Then a reading turns up that is not 0, the `if` is false, `i` is not moved, and every pass after that is a copy of the one before it. Nothing changes, so nothing can ever make the condition false.\n\nMoving one line out of the `if` fixes it, and nothing else has to change.',
        },
        {
          kind: 'code',
          caption: 'The same loop with the update on every pass.',
          code: "readings = [0, 0, 3, 0, -1]\ni = 0\nzeros = 0\nwhile readings[i] != -1:\n    if readings[i] == 0:\n        zeros = zeros + 1\n    i = i + 1\nprint('readings before the marker:', i)\nprint('dry readings:', zeros)\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The check to run in your head',
          body: 'Point at the variable in the condition. Then point at the line that changes it. If that line is indented under an `if`, ask what happens on a pass where the `if` is false.',
        },
      ],
    },
    {
      id: 'sentinels',
      title: 'Stopping at a marker',
      blocks: [
        {
          kind: 'prose',
          body: 'Data often arrives with a marker on the end that means "no more": a reading of -1 from a logger that only ever produces positive numbers, or the word `done` typed by a person. That value is called a **sentinel**, and it is never part of the data itself.\n\nThe loop has to do two things at once: stop at the sentinel, and not fall off the end if the sentinel is missing. Both go in the condition, and the order they are written in is not a matter of taste.',
        },
        {
          kind: 'compare',
          caption: 'The same two tests, in the two possible orders, on a list with no sentinel in it.',
          left: {
            label: 'Bounds check second',
            code: "readings = [4, 7, 2]\ni = 0\nwhile readings[i] != -1 and i < len(readings):\n    i = i + 1\nprint('read', i, 'values')\n",
            bad: true,
          },
          right: {
            label: 'Bounds check first',
            code: "readings = [4, 7, 2]\ni = 0\nwhile i < len(readings) and readings[i] != -1:\n    i = i + 1\nprint('read', i, 'values')\n",
          },
        },
        {
          kind: 'prose',
          body: '`and` reads from left to right and stops at the first part that is false, which means the right-hand part is not even looked at when the left-hand part has already settled the question. Put the bounds check first and the list is never read past its end. Put it second and the reading happens before anybody has checked whether the position exists.\n\nBoth versions work on data that does contain a sentinel, which is why this survives testing.',
        },
        {
          kind: 'prose',
          body: 'When the values come from a person rather than a list, the shape is slightly different. You cannot test something you have not read yet, so the first value is read **before** the loop, and the last line of the body reads the next one. Forgetting that last line is the other classic way to hang a program.',
        },
        {
          kind: 'code',
          caption: 'Marks typed one per line, ending with the word done.',
          stdin: ['70', '65', '81', 'done'],
          code: "total = 0\ncount = 0\nline = input()\nwhile line != 'done':\n    total = total + int(line)\n    count = count + 1\n    line = input()\nprint('readings:', count)\nprint('total:', total)\nprint('average:', total / count)\n",
        },
        {
          kind: 'prose',
          body: 'The sentinel is never added to the total, because the loop ends before the body runs on it. Note the last line: dividing by `count` would fail if the very first thing typed were `done`, and deciding what an empty batch should give is part of the question, not an afterthought.',
        },
      ],
    },
    {
      id: 'digits',
      title: 'Taking a number apart',
      blocks: [
        {
          kind: 'prose',
          body: 'A whole family of exam questions is about the digits of a number: the digit sum, a check digit, a number written in binary, whether a number is a palindrome. All of them use the same pair of operators, and no strings at all.',
        },
        {
          kind: 'shell',
          lines: [
            'n = 4096',
            'n % 10',
            'n // 10',
            'n / 10',
            'n % 2',
            'n // 2',
            '0 // 10',
          ],
        },
        {
          kind: 'prose',
          body: '`% 10` reads off the last digit and `// 10` throws it away, so the two together walk through a number from the right, one digit per pass, until nothing is left. The last line is why the walk ends: once there is nothing left, dividing again keeps it where it is, so a condition of `n > 0` becomes false and stays false. Change the 10 to a 2 and the same pair walks through the binary digits instead.\n\nThe third line is the trap. `/` always produces a number with a decimal point, and a decimal number shrinks towards 0 without ever reaching it in whole steps, so a `while n > 0` loop built on `/` runs hundreds of times before it stops. Use `//` for digits, every time.',
        },
        {
          kind: 'code',
          caption: 'Digit sum, then the same number in binary.',
          code: "n = 4096\ntotal = 0\nwhile n > 0:\n    total = total + n % 10\n    n = n // 10\nprint('digit sum:', total)\n\nn = 13\nbits = ''\nwhile n > 0:\n    bits = str(n % 2) + bits\n    n = n // 2\nprint('13 in binary:', bits)\n",
        },
        {
          kind: 'prose',
          body: 'The digits come out backwards, last one first, which does not matter for a sum and matters completely for a string. That is why the binary loop puts each new digit in **front** of what it has, rather than on the end.',
        },
        {
          kind: 'experiment',
          id: 't07-x2',
        },
        {
          kind: 'code',
          caption: 'The same binary loop given 0.',
          code: "n = 0\nbits = ''\nwhile n > 0:\n    bits = str(n % 2) + bits\n    n = n // 2\nprint('[' + bits + ']')\nprint('length:', len(bits))\n",
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Zero is an edge case every time',
          body: 'The condition `n > 0` is false straight away for 0, so the loop contributes nothing. For a digit sum that gives the right answer by luck. For anything that builds a string it gives an empty one, and the question is asking for a single character. Decide what 0 should produce and handle it before the loop.',
        },
      ],
    },
    {
      id: 'tolerance',
      title: 'Summing a series until it is close enough',
      blocks: [
        {
          kind: 'prose',
          body: 'Many quantities are worked out by adding a series of terms that get smaller and smaller. You cannot add all of them, because there is no end, so the task always says how small a term has to get before you stop. That number is the **tolerance**.\n\nThe temptation is to write `while term != 0`. The terms get closer and closer to zero, so that ought to finish eventually. Watch how long "eventually" is.',
        },
        {
          kind: 'code',
          caption: 'Halving a number four hundred times.',
          code: "term = 1.0\nhalvings = 0\nwhile halvings < 400:\n    term = term / 2\n    halvings = halvings + 1\nprint('after', halvings, 'halvings the term is', term)\nprint('is it exactly zero?', term == 0)\n",
        },
        {
          kind: 'prose',
          body: 'Four hundred passes in and the answer to the last question has not changed. A loop waiting for exactly zero is not slow, it is stuck, and the same goes for `==` against any other decimal value. Compare sizes against a tolerance instead.\n\nThe standard shape has four parts: a total starting at 0, the first term worked out before the loop, a condition on the size of the term, and a body that uses the current term and then builds the next one from it.',
        },
        {
          kind: 'code',
          caption: 'A series summed to three different tolerances.',
          code: 'def sum_series(tol):\n    total = 0\n    term = 1.0\n    k = 0\n    while abs(term) >= tol:\n        total = total + term\n        k = k + 1\n        term = term / k\n    return round(total, 6)\n\nprint(sum_series(0.1))\nprint(sum_series(0.0001))\nprint(sum_series(0.000001))\nprint(sum_series(2))\n',
        },
        {
          kind: 'prose',
          body: 'Three details are doing real work there. `abs` is around the term because a series that alternates between plus and minus would otherwise stop the moment a term went negative. The order inside the body is use-then-advance: the current term is added before the next one is worked out, so no term is skipped and none is counted twice. And each term is built from the one before it, which is both quicker and the only option when the task forbids importing anything.\n\nThe last call shows a tolerance so large that the very first term is already too small to qualify. The body never runs and the total is untouched, which is the zero-pass case from earlier turning up in a place where it is easy to miss.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Round once, at the end',
          body: 'Rounding inside the loop throws away a little accuracy on every pass, and the errors accumulate until the last decimal place of the answer is wrong. Keep full precision all the way through and round the value you return.',
        },
        {
          kind: 'prose',
          body: 'Here is the same shape applied to a series you may recognise, with every decision spelled out.',
        },
        {
          kind: 'workedExample',
        },
        {
          kind: 'checkpoint',
          prompt: 'A task says "stop when a term falls below the tolerance". Is that term added or not, and which comparison does the condition use?',
          answer: 'It is not added. The condition is tested at the top, so the first term smaller than the tolerance ends the loop before the body runs, and the body is where the adding happens. The condition is `while abs(term) >= tol:`, which keeps going while the term is still big enough. Read the wording carefully: "use every term of at least tol" and "stop when a term is below tol" describe the same loop, while "stop once the total changes by less than tol" is a different test again.',
        },
      ],
    },
    {
      id: 'nested-loops',
      title: 'A loop inside a loop',
      blocks: [
        {
          kind: 'prose',
          body: 'Put one loop inside another and the inner one runs all the way through for **every** pass of the outer one. The work does not add up, it multiplies, which is why a nested loop over two small lists can still do a surprising amount.',
        },
        {
          kind: 'code',
          caption: 'Every main with every drink.',
          code: "mains = ['Pie', 'Roll']\ndrinks = ['Tea', 'Juice', 'Water']\ndeals = []\nfor main in mains:\n    for drink in drinks:\n        deals.append(main + ' and ' + drink)\nprint(deals)\nprint('deals:', len(deals))\nprint('mains times drinks:', len(mains) * len(drinks))\n",
        },
        {
          kind: 'prose',
          body: 'Where the result is created decides what it collects. `deals = []` belongs before the **outer** loop, because it is the answer to the whole job. A value that starts fresh for each main, such as the cheapest deal on that main, would go inside the outer loop and above the inner one. Putting it in the wrong place still gives the right answer when the outer list has one item in it, which is why the mistake survives a quick test.',
        },
        {
          kind: 'experiment',
          id: 't07-x3',
        },
        {
          kind: 'prose',
          body: 'One variation comes up constantly: every **pair** from a single list, each pair once, and never an item with itself. Two loops over the whole list would give both orders of every pair and every item paired with itself. Starting the inner loop one past the outer position fixes both problems at once.',
        },
        {
          kind: 'code',
          caption: 'Each pair of stalls once.',
          code: "stalls = ['Bread', 'Fruit', 'Coffee', 'Flowers']\npairs = []\nfor i in range(len(stalls)):\n    for j in range(i + 1, len(stalls)):\n        pairs.append((stalls[i], stalls[j]))\nfor a, b in pairs:\n    print(a, '+', b)\nprint('pairs:', len(pairs))\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'In a nested loop, a `break` in the inner loop stops which loop?',
          answer: 'Only the inner one. The outer loop carries straight on to its next pass and starts the inner loop again from the beginning. To leave both you need something the outer condition can see, such as a flag set before the `break` and checked at the top of the outer loop, or a `return` when the whole thing is inside a function.',
        },
      ],
    },
    {
      id: 'traps',
      title: 'What goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'Every one of these has been shown in this lesson. Seeing them side by side as code somebody wrote and code that works is what makes them recognisable at speed.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'The zoo gates and rain gauge scenarios are digits and sentinels; the Observatory is series and tolerances; the Fremantle markets and the theatre seat map are nested loops and pairs.',
        },
      ],
    },
  ],
};

export default lesson;
