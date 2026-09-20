// Foundations: arithmetic, including the three operators people have not met before and the traps.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'doing-arithmetic',
  title: 'Doing arithmetic',
  summary: 'The seven operators, the order they happen in, and the three that surprise people',
  track: 'foundations',
  order: 4,
  minutes: 16,
  prereqs: ['values-and-types'],
  outcomes: [
    'Use `+`, `-`, `*` and `/` on numbers',
    'Say what `//`, `%` and `**` do and when each is useful',
    'Explain why `/` gives a decimal even when it divides evenly',
    'Work out which part of an expression happens first, and add brackets when it is not what you wanted',
    'Recognise what happens when you divide by zero',
  ],
  sections: [
    {
      id: 'why-it-matters',
      title: 'The four you know',
      blocks: [
        {
          kind: 'prose',
          body: 'The arithmetic in programming is the arithmetic you did at school. What is different is a handful of small gaps between what Python does and what you would expect, and this lesson is about those gaps. Start with the four operators you already know: `*` for multiply and `/` for divide are the two you might not have typed before.',
        },
        {
          kind: 'shell',
          caption: 'The four familiar operations. Spaces around the symbols are optional; the spaced version is just easier to read.',
          lines: [
            '4 + 3',
            '4 - 3',
            '4 * 3',
            '4 / 3',
          ],
        },
      ],
    },
    {
      id: 'division-is-decimal',
      title: 'Division always gives a decimal',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the first gap. `/` gives a decimal answer: not usually, always, even when the division comes out exactly.',
        },
        {
          kind: 'shell',
          caption: 'Even when it divides evenly, the answer keeps a `.0` and `type()` confirms it is a `float`, not an `int`.',
          lines: [
            '10 / 2',
            '9 / 3',
            'type(10 / 2)',
            '7 / 2',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which best explains why `10 / 2` gives `5.0` rather than `5`?',
          options: [
            { text: '`/` always produces a decimal, so a program behaves the same way whether or not its numbers happen to divide evenly', correct: true, why: 'This is a deliberate choice: the type of the answer never depends on the particular values you happen to have.' },
            { text: "It's a display quirk and the value is really the whole number 5", why: '`type()` says otherwise: the value really is a `float`, not an `int` that merely looks decorated.' },
            { text: 'It only happens because 10 is an even number', why: '`7 / 2`, which does not divide evenly, also gives a decimal. `/` gives a decimal every time, regardless of whether the division is exact.' },
            { text: 'It only happens in the shell, not in a real program', why: 'The shell and a program file run the same Python. `/` gives a decimal wherever it is written.' },
          ],
        },
      ],
    },
    {
      id: 'floor-and-remainder',
      title: 'Whole division and remainder',
      blocks: [
        {
          kind: 'prose',
          body: "Before decimals, division had a quotient and a remainder: seven divided by two is three, remainder one. `//` gives the whole-number part of a division; `%` gives what is left over, read aloud as \"mod\". Together they split a quantity into groups and a leftover, `% 2` tells you whether a number is even, and `% n` giving zero means \"divides exactly by n\".",
        },
        {
          kind: 'shell',
          caption: 'The two halves of a division.',
          lines: [
            '7 // 2',
            '7 % 2',
            '17 // 5',
            '17 % 5',
            '9 % 2',
            '20 % 5',
          ],
        },
        {
          kind: 'code',
          caption: 'Both halves used together, to split seconds into minutes and seconds.',
          code: 'seconds = 500\nminutes = seconds // 60\nleft_over = seconds % 60\nprint(minutes)\nprint(left_over)\n',
        },
        {
          kind: 'quiz',
          prompt: 'You have 47 eggs and boxes that hold 6. Which pair gives full boxes and eggs left over?',
          options: [
            { text: '`47 // 6` and `47 % 6`', correct: true, why: 'Whole division gives the number of full boxes; the remainder gives what does not fit in one.' },
            { text: '`47 / 6` and `47 % 6`', why: '`47 / 6` gives a decimal number of boxes, which is not something you can put eggs in.' },
            { text: '`47 % 6` and `47 // 6`', why: "That's the two swapped: `%` gives the leftover, `//` gives the count of full boxes, not the other way round." },
            { text: '`47 // 6` and `47 // 6`', why: 'That names full boxes twice and never finds the leftover at all.' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'remainder-pattern',
            title: 'The pattern a remainder makes',
            intro: 'Drag **divide by** and watch the bars. Each bar is one number from 0 to 15, and its height is the remainder that number leaves.',
            template: 'divisor = ⟦k⟧\nfor n in range(16):\n    print(n, "%", divisor, "=", n % divisor)\n',
            knobs: [
              { id: 'k', kind: 'range', label: 'divide by', min: 1, max: 8, start: 3 },
            ],
            probes: {
              remainders: '[n % ⟦k⟧ for n in range(16)]',
              numbers: '[str(n) for n in range(16)]',
            },
            visual: {
              kind: 'bars',
              values: 'remainders',
              labels: 'numbers',
              caption: 'The remainder left by each number from 0 to 15.',
            },
            notes: {
              '2': 'Dividing by 3 gives the repeating pattern 0, 1, 2, 0, 1, 2. A remainder counts how far past the last exact multiple you are, so it climbs and resets forever.',
              '0': 'Every bar is flat. Every whole number divides exactly by 1, so nothing is ever left over.',
              '1': 'Alternating 0 and 1: the zeros are the even numbers. This is why `n % 2 == 0` is how you ask whether something is even.',
              '7': 'The saw gets wider as the divisor grows, but it never reaches 8. A remainder is always smaller than what you divided by, which is the single most useful fact about it.',
            },
            takeaway: 'A remainder always lands between 0 and one less than the divisor, and it resets to 0 on every exact multiple. That saw-tooth is why `%` is the tool for "every nth time", for "is this even", and for pulling the last digit off a number with `% 10`.',
          },
        },
      ],
    },
    {
      id: 'powers',
      title: 'Powers',
      blocks: [
        {
          kind: 'prose',
          body: 'Two stars mean "to the power of". Raising to the power `0.5` is the same as a square root, which saves looking anything up the first time you need one.',
        },
        {
          kind: 'shell',
          caption: 'Powers, including a fractional one.',
          lines: [
            '2 ** 3',
            '2 ** 10',
            '9 ** 0.5',
          ],
        },
        {
          kind: 'predict',
          ask: 'In many places, `^` means "to the power of", so people reach for it here. Python has a `^`, and it does something else entirely. What does this print?',
          code: 'print(3 ^ 2)\n',
          choices: ['9', '1', '5'],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Wrong, without complaint',
          body: 'Writing `^` where you meant `**` gives you a number, silently, and your program carries on with it. Errors that stop the program are the easy kind to catch. This is the other kind.',
        },
      ],
    },
    {
      id: 'order',
      title: 'What happens first',
      blocks: [
        {
          kind: 'prose',
          body: 'When several operators appear in one line, Python follows the same precedence taught in school: powers first, then multiply and divide, then add and subtract. Brackets override all of it.',
        },
        {
          kind: 'table',
          caption: 'Highest priority at the top. Anything on the same row happens left to right.',
          head: ['Priority', 'Operators'],
          rows: [
            ['1 (first)', '( ) brackets'],
            ['2', '** powers'],
            ['3', '* / // % multiply, divide, whole division, remainder'],
            ['4 (last)', '+ - add, subtract'],
          ],
        },
        {
          kind: 'shell',
          caption: 'The same numbers, grouped differently.',
          lines: [
            '2 + 3 * 4',
            '(2 + 3) * 4',
            '2 * 3 ** 2',
            '(2 * 3) ** 2',
          ],
        },
        {
          kind: 'compare',
          caption: 'The average of 2, 4 and 9. On the left, `9 / 3` happens first and gets added to the rest, answering a question nobody asked. On the right, the brackets force the addition to finish before anything divides.',
          left: { label: 'Written without brackets', code: 'print(2 + 4 + 9 / 3)\n', bad: true },
          right: { label: 'With brackets', code: 'print((2 + 4 + 9) / 3)\n' },
        },
        {
          kind: 'quiz',
          prompt: 'What does `10 - 4 / 2` give?',
          options: [
            { text: '`8.0`', correct: true, why: 'Division outranks subtraction, so `4 / 2` happens first, giving `2.0`, which is then taken from 10.' },
            { text: '`3.0`', why: "That's what `(10 - 4) / 2` gives. Without brackets, the subtraction does not happen first." },
            { text: '`8`', why: 'Close, but division always gives a decimal, so the result is `8.0`, not the whole number `8`.' },
            { text: 'An error, because you cannot mix `-` and `/` in one line', why: 'Mixing operators in one line is completely normal; Python has a fixed order for working through them.' },
          ],
        },
      ],
    },
    {
      id: 'dividing-by-zero',
      title: 'Dividing by zero',
      blocks: [
        {
          kind: 'prose',
          body: 'Dividing by zero has no answer in mathematics, and Python does not invent one: it stops with an error. This is rarely a typo. It usually happens because you divide by a name that turns out to hold zero: a total before anything is added, a count of an empty list.',
        },
        {
          kind: 'shell',
          caption: 'Three of these fail on purpose. The last shows that zero divided *by* something is perfectly fine.',
          lines: [
            '10 / 0',
            '10 // 0',
            '10 % 0',
            '0 / 10',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Three of these raise an error and one does not. Which one is safe?',
          options: [
            { text: '`0 / 10`', correct: true, why: 'Zero on top is fine. Only dividing *by* zero is the problem.' },
            { text: '`10 / 0`', why: 'Dividing by zero has no answer, so Python raises `ZeroDivisionError`.' },
            { text: '`10 // 0`', why: 'Whole division by zero fails for the same reason as `/`.' },
            { text: '`10 % 0`', why: 'Asking for a remainder after dividing by zero fails the same way.' },
          ],
        },
      ],
    },
    {
      id: 'decimals-are-approximate',
      title: 'Decimals are not exact',
      blocks: [
        {
          kind: 'prose',
          body: 'One last surprise. Decimal numbers are stored in binary, in a fixed amount of space, and some ordinary decimal fractions have no exact binary form, the way one third has no exact decimal form. The result is correct to about fifteen digits and wrong in the sixteenth. It never matters for ordinary arithmetic; it matters exactly when comparing two decimals with `==`.',
        },
        {
          kind: 'shell',
          caption: 'Arithmetic you can do in your head. Python disagrees very slightly, until you round.',
          lines: [
            '0.1 + 0.2',
            '0.1 + 0.2 == 0.3',
            'round(0.1 + 0.2, 2)',
            'round(0.1 + 0.2, 2) == 0.3',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not compare decimals with ==',
          body: 'Comparing two whole numbers with `==` is exact and safe. Comparing two decimal numbers that came out of arithmetic is asking for the failure above. Round both first, or compare whole numbers where you can: count pence rather than pounds.',
        },
        {
          kind: 'quiz',
          prompt: 'A program adds up prices and checks `total == 100.00`, and the check fails even though the receipt clearly shows 100.00. Why?',
          options: [
            { text: 'The total carries a tiny stored binary error, so it is not exactly 100.0 to the last digit, though it prints as 100.00 once rounded', correct: true, why: 'Printing rounds for display and hides the difference; `==` compares to the last digit and sees it.' },
            { text: 'The prices were added in the wrong order', why: 'Order does not cause this. The rounding error comes from decimals not having an exact binary form, regardless of the order they are added in.' },
            { text: '`==` does not work on decimal numbers at all', why: '`==` works on any two values; it simply compares them exactly, which is the source of the surprise here, not a broken operator.' },
            { text: 'One of the prices must be text instead of a number', why: 'That would raise a `TypeError` on the addition itself, not a silent comparison failure after a normal-looking total.' },
          ],
        },
        {
          kind: 'task',
          prompt: 'Write a function `change(total, paid)` that returns how many whole dollars of change are owed, and how many cents are left over, as two values.\n\nFor example `change(4.55, 10)` is `(5, 45)`: five whole dollars and forty-five cents.',
          run: 'function',
          fnName: 'change',
          starter: "def change(total, paid):\n    owed = paid - total\n    # How many whole dollars fit into owed?\n    dollars = 0\n    # And how many cents are left after those dollars?\n    cents = 0\n    return dollars, cents\n",
          solution: "def change(total, paid):\n    owed = round((paid - total) * 100)\n    dollars = owed // 100\n    cents = owed % 100\n    return dollars, cents\n",
          hint: 'Work in cents to avoid the decimal trouble from earlier: `round((paid - total) * 100)` gives a whole number of cents. Then `//` takes the whole dollars out and `%` leaves the rest.',
          tests: [
            { id: 't1', call: 'change(4.55, 10)', expect: '(5, 45)', label: '4.55 paid with 10', hidden: false },
            { id: 't2', call: 'change(2.00, 5)', expect: '(3, 0)', label: 'no cents left over', hidden: false },
            { id: 't3', call: 'change(9.99, 10)', expect: '(0, 1)', label: 'only a cent owed', hidden: true },
            { id: 't4', call: 'change(0.10, 0.10)', expect: '(0, 0)', label: 'exact money', hidden: true },
          ],
        },
      ],
    },
  ],
};

export default lesson;
