// Foundations: assignment, names as labels, and the errors that come from using a name that is not there.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'variables-and-names',
  title: 'Variables and names',
  summary: 'A name is a label you attach to a value so you can use it again',
  track: 'foundations',
  order: 3,
  minutes: 14,
  prereqs: ['values-and-types'],
  outcomes: [
    'Store a value under a name and use it later',
    'Read an assignment right to left',
    'Tell `=` and `==` apart and say what each one does',
    'Change what a name holds, including using its own old value',
    'Recognise `NameError` and find the cause',
  ],
  sections: [
    {
      id: 'why-names',
      title: 'Why bother with names',
      blocks: [
        {
          kind: 'prose',
          body: 'Everything you have written so far works out a value, shows it, and forgets it. That is fine for one sum, and useless once a program uses the same value in several places. Here is the cost of twelve coffees, and the cost with a ten per cent discount, written with the price typed twice.',
        },
        {
          kind: 'code',
          caption: 'The price, 4.50, is written out twice.',
          code: 'print(12 * 4.50)\nprint(12 * 4.50 * 0.9)\n',
        },
        {
          kind: 'prose',
          body: "It works, until the price changes. Then you have to find every copy of `4.50` and fix it, and a missed copy runs cleanly and gives a wrong answer without a word of complaint. With two lines you won't miss one; with two hundred, you will.",
        },
        {
          kind: 'code',
          caption: 'The price is written once, under the name `price`. A **variable** is a label stuck to a value; everywhere you write `price`, Python looks up what it is stuck to. `12 * price` also says what it means, which `12 * 4.50` does not.',
          code: 'price = 5.00\nprint(12 * price)\nprint(12 * price * 0.9)\n',
        },
      ],
    },
    {
      id: 'right-to-left',
      title: 'How assignment works',
      blocks: [
        {
          kind: 'prose',
          body: 'Writing `price = 5.00` is **assignment**, and it reads right to left, not the way you learned in maths:\n\n> Work out everything on the **right** of the `=` first. Then attach the name on the **left** to the result.',
        },
        {
          kind: 'shell',
          caption: 'Making names, and using them. Assignment lines show no answer at all: it is an instruction, not a question. And reading a name never uses it up, as the last line shows.',
          lines: [
            'price = 4.50',
            'price * 2',
            'count = 3',
            'total = price * count',
            'total',
            'price',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Given `price = 4.50` and `count = 3`, what does `total = price * count` do?',
          options: [
            { text: 'Works out `price * count` first, then attaches the name `total` to the result', correct: true, why: 'Right to left: the right-hand side is finished before any name moves.' },
            { text: 'Attaches `total` to `price`, then multiplies by `count`', why: 'That reads left to right, which is not how assignment works. The right-hand side is always worked out first.' },
            { text: 'Compares `price` and `count` and stores whether they match', why: "That's what `==` does. A single `=` stores a value; it never asks a question." },
            { text: 'Nothing, because assignment never produces a value', why: 'It never shows an answer, but it very much does something: it stores a value under a name for later use.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'A label, not a box',
          body: 'It is tempting to picture a variable as a box with a value inside. A label stuck to a value is the better picture, and it will save you confusion later when several names are attached to the same thing.',
        },
      ],
    },
    {
      id: 'not-equality',
      title: 'One equals sign is not two',
      blocks: [
        {
          kind: 'prose',
          body: 'Python uses `=` for "store this" and `==` for "are these the same?": different operations, spelled similarly, confused by nearly everybody at first.',
        },
        {
          kind: 'shell',
          caption: 'Watch which lines change `count` and which only ask about it. The two `==` lines answer a question and leave `count` exactly as it was; the `=` lines answer nothing and change it.',
          lines: [
            'count = 3',
            'count == 3',
            'count == 4',
            'count',
            'count = 4',
            'count',
          ],
        },
        {
          kind: 'code',
          caption: 'A deliberate error. Because the name has to be the destination, it has to be on the left; `10 = total` is not readable at all. Notice even line 1 produced no output: Python could not make sense of the whole file, so nothing ran.',
          code: 'total = 10\n10 = total\nprint(total)\n',
        },
        {
          kind: 'quiz',
          prompt: 'What is the difference between `x = 5` and `x == 5`?',
          options: [
            { text: '`x = 5` makes `x` hold 5 and answers nothing; `x == 5` leaves `x` alone and answers `True` or `False`', correct: true, why: 'Read them aloud: "x becomes 5" against "x is equal to 5", and the two stop blurring together.' },
            { text: 'They do the same thing; `==` is just clearer to read', why: 'They are different operations. One stores a value, the other checks one, and mixing them up is a common source of bugs.' },
            { text: '`x = 5` checks whether `x` is 5; `x == 5` sets it', why: "That's the two swapped. A single `=` stores; a double `==` checks." },
            { text: '`x == 5` only works if `x` already holds 5', why: '`x == 5` works whatever `x` holds. It simply answers `False` when `x` is something else.' },
          ],
        },
      ],
    },
    {
      id: 'changing-it',
      title: 'Changing what a name holds',
      blocks: [
        {
          kind: 'prose',
          body: 'A name can be re-attached as often as you like, dropping the old value. This is how a running total, a score, or a counter works. `score = score + 10` is nonsense as maths and sensible as an instruction: read it right to left, working out `score + 10` from whatever `score` holds *now*, then attaching `score` to the answer.',
        },
        {
          kind: 'shell',
          caption: 'A name built up from its own old value. Each line uses the old value to work out the new one; nothing circular happens, because the right-hand side finishes before the name moves.',
          lines: [
            'score = 0',
            'score = score + 10',
            'score',
            'score = score + 10',
            'score',
            'score = score * 2',
            'score',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'order-of-updates',
            title: 'Two changes, two orders',
            intro: 'Choose a change for line 2 and a change for line 4. Each one works out the right-hand side using whatever `score` holds at that moment. Line 3 puts a second label on the halfway value so the picture can show it, and changes nothing else.',
            template: 'score = 8\nscore = ⟦first⟧\nhalfway = score\nscore = ⟦second⟧\nprint("8 became", halfway, "and then", score)\n',
            knobs: [
              {
                id: 'first',
                label: 'line 2 makes score',
                choices: [
                  { value: 'score + 10', caption: 'ten more' },
                  { value: 'score * 2', caption: 'double' },
                  { value: 'score - 3', caption: 'three less' },
                ],
              },
              {
                id: 'second',
                label: 'line 4 makes score',
                choices: [
                  { value: 'score + 10', caption: 'ten more' },
                  { value: 'score * 2', caption: 'double' },
                  { value: 'score - 3', caption: 'three less' },
                ],
              },
            ],
            probes: {
              stages: '[8, halfway, score]',
              'stage-names': '["at the start", "after line 2", "after line 4"]',
            },
            visual: {
              kind: 'bars',
              values: 'stages',
              labels: 'stage-names',
              caption: 'What the name `score` is attached to at each stage.',
            },
            notes: {
              '0-1': 'Ten more, then double. The ten is added first and then doubled along with everything else, so it is worth twenty by the end.',
              '1-0': 'Double, then ten more. The same two instructions as the setting above, in the other order, and the final bar is shorter. `score` was a different number when the second line read it.',
              '2-2': 'Three less, twice. Each line starts from what the line before left behind, so the total drop is six.',
              '1-1': 'Double, then double again. Nothing is written down twice and nothing is circular: each line works out the right-hand side first, then moves the label onto the answer.',
            },
            takeaway: 'A line like `score = score + 10` reads right to left: work out the right-hand side using the value the name holds now, then attach the name to the answer. Because each line starts from the value the one before it left, changing the order of two updates changes the result.',
          },
        },
        {
          kind: 'prose',
          body: 'A name is also free to hold a different *type* of value later. Python does not fix a name to one kind of thing, which is convenient and occasionally a trap.',
        },
        {
          kind: 'shell',
          caption: 'The same name, holding two different kinds of value. The last line fails on purpose: the name is currently attached to text, so adding a number to it is the mixture Python refuses. The name did not change; what it points at did.',
          lines: [
            'answer = 42',
            'type(answer)',
            'answer = "forty two"',
            'type(answer)',
            'answer + 1',
          ],
        },
      ],
    },
    {
      id: 'choosing-names',
      title: 'Choosing a name',
      blocks: [
        {
          kind: 'prose',
          body: 'Python has a few rules about what a name may be made of, and beyond those, complete freedom. A name that describes what it holds is the cheapest documentation there is; the usual style is lower case with underscores, like `first_name` or `total_cost`. Single letters like `a` or `x` save four keystrokes today and cost ten minutes later, though a loop counter named `i` is a traditional exception.',
        },
        {
          kind: 'match',
          ask: 'Match each name to whether it is legal, and why.',
          pairs: [
            { left: '`total_2`', right: 'Legal: letters, digits and underscores' },
            { left: '`2score`', right: 'Illegal: starts with a digit' },
            { left: '`first name`', right: 'Illegal: contains a space' },
            { left: '`Total_cost`', right: 'Legal, but a different name from `total_cost`' },
          ],
        },
        {
          kind: 'code',
          caption: 'A name starting with a digit. Another deliberate error, and another one that stops the file being read at all.',
          code: '2nd_place = "Sam"\nprint(2nd_place)\n',
        },
        {
          kind: 'shell',
          caption: 'Two names that differ by one capital letter. Capitals count, so a name typed with a capital in one place and without it in another is two separate names to Python.',
          lines: [
            'Total = 10',
            'total = 3',
            'Total',
            'total',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which of these are legal Python names: `total cost`, `total_cost`, `1st_total`?',
          options: [
            { text: 'Only `total_cost`', correct: true, why: '`total cost` has a space and `1st_total` starts with a digit, so neither can be read by Python at all.' },
            { text: 'All three', why: 'A space and a leading digit both make a name unreadable to Python.' },
            { text: 'Only `1st_total`', why: 'Starting with a digit is exactly what the rules forbid.' },
            { text: 'None of them', why: '`total_cost` breaks no rule: letters and an underscore, no spaces, no leading digit.' },
          ],
        },
      ],
    },
    {
      id: 'no-such-name',
      title: 'A name that is not there',
      blocks: [
        {
          kind: 'prose',
          body: 'Python knows nothing about a name until an assignment creates it. Ask for one it has never been given, and it stops and says so. There are only two ways this happens, and the message is the same for both: a typo, or asking for a name before the line that creates it.',
        },
        {
          kind: 'code',
          caption: 'A deliberate misspelling. Note the line number in the message.',
          code: 'total = 25\nprint(totl)\n',
        },
        {
          kind: 'code',
          caption: 'The right name, in the wrong order. The computer works top to bottom, so when it reaches line 1, line 2 has not happened yet.',
          code: 'print(count)\ncount = 5\n',
        },
        {
          kind: 'quiz',
          prompt: 'A program reads `average = totla / count` and stops on that line, saying the name `totla` is not defined. A line above reads `total = 240`. What happened?',
          options: [
            { text: 'The letters of `total` got swapped while typing; the two lines use different spellings for what was meant to be the same name', correct: true, why: 'Python sees two unrelated names and has only ever been given one of them. The value was never lost, only stored under a different label.' },
            { text: '`total` was never given a value', why: 'It was: the line above sets `total = 240`. The problem is that the line using it spells it differently.' },
            { text: 'You cannot divide by `count`', why: 'The error names `totla`, not `count` or a division problem. Read the message for the exact name it could not find.' },
            { text: 'Python ran the lines in the wrong order', why: 'Python always runs top to bottom. The line defining `total` runs before the line that fails, so order is not the issue here.' },
          ],
        },
      ],
    },
  ],
};

export default lesson;
