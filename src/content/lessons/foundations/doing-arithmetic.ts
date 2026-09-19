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
          body: 'If you have ever avoided this subject because of maths, here is the good news: the arithmetic in programming is arithmetic you did at school. There is no advanced mathematics hiding in here. What there is instead is a handful of small differences between what Python does and what you would expect, and every one of them catches beginners. This lesson is about those differences.\n\nStart with the four operations you already know. Two of them use symbols you might not have typed before: `*` for multiply and `/` for divide.',
        },
        {
          kind: 'shell',
          caption: 'The four familiar operations.',
          lines: [
            '4 + 3',
            '4 - 3',
            '4 * 3',
            '4 / 3',
          ],
        },
        {
          kind: 'prose',
          body: 'No surprises yet. Spaces around the symbols are optional, and `4+3` works identically, but the spaced version is easier to read and is what Python programmers write.',
        },
      ],
    },
    {
      id: 'division-is-decimal',
      title: 'Division always gives a decimal',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the first difference, and it is small enough to ignore until the day it matters. `/` gives a decimal answer. Not usually, not when it needs to: always, even when the division comes out exactly.',
        },
        {
          kind: 'shell',
          caption: 'Even when it divides evenly.',
          lines: [
            '10 / 2',
            '9 / 3',
            '100 / 10',
            'type(10 / 2)',
            '7 / 2',
            '1 / 3',
          ],
        },
        {
          kind: 'prose',
          body: 'Ten divided by two came back with a `.0` on the end, and `type()` confirms it is a `float`, a decimal number, and not an `int`.\n\nThis is a deliberate decision by the people who designed Python, and it is the safer one: the type of the answer does not depend on the values you happen to have, so your program behaves the same on every input rather than changing character when the numbers divide neatly.\n\nIt bites when you use the result somewhere that insists on a whole number, such as counting items or picking a position in a list. When that day comes, the operator in the next section is what you want.',
        },
      ],
    },
    {
      id: 'floor-and-remainder',
      title: 'Whole division and remainder',
      blocks: [
        {
          kind: 'prose',
          body: 'Before decimals, you did division with a quotient and a remainder: seven divided by two is three, remainder one. Python still has both halves of that, and they are two of the most useful operators in the language.\n\n`//` gives the whole-number part of a division, throwing away anything after the point. `%` gives what is left over, and is read aloud as "mod" or "modulo".',
        },
        {
          kind: 'shell',
          caption: 'The two halves of a division.',
          lines: [
            '7 // 2',
            '7 % 2',
            '17 // 5',
            '17 % 5',
            '8 % 2',
            '9 % 2',
            '20 % 5',
          ],
        },
        {
          kind: 'prose',
          body: 'Three patterns in there are worth keeping.\n\nTogether, `//` and `%` split a quantity into a number of groups and a leftover. That is exactly how you turn seconds into minutes and seconds, or pence into pounds and pence.\n\n`% 2` tells you whether a number is even: an even number has nothing left over.\n\nAnd `%` giving zero is how you ask "does this divide exactly?", which is the usual way of finding every third item, every tenth customer, or a leap year.',
        },
        {
          kind: 'code',
          caption: 'Both halves used together.',
          code: 'seconds = 500\nminutes = seconds // 60\nleft_over = seconds % 60\nprint(minutes)\nprint(left_over)\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'You have 47 eggs and boxes that hold 6. How many full boxes, and how many eggs left over?',
          answer: '`47 // 6` gives the number of full boxes and `47 % 6` gives the eggs left over. Type both and check them against each other: the boxes multiplied by six, plus the leftovers, has to come back to 47. Using `47 / 6` here would give a decimal number of boxes, which is not something you can put eggs in.',
        },
      ],
    },
    {
      id: 'powers',
      title: 'Powers',
      blocks: [
        {
          kind: 'prose',
          body: 'Two stars mean "to the power of". Three stars would mean nothing, and one star is multiply, so the count matters.',
        },
        {
          kind: 'shell',
          caption: 'Powers, including a fractional one and a symbol that is not what it looks like.',
          lines: [
            '2 ** 3',
            '2 ** 10',
            '9 ** 0.5',
            '2 ** 0.5',
            '3 ^ 2',
          ],
        },
        {
          kind: 'prose',
          body: 'Raising to the power of `0.5` is the same as taking a square root, which saves you looking anything up the first time you need one.\n\nThe last line is the trap. In many places outside programming, `^` means "to the power of", so people reach for it. Python has a `^` and it does something else entirely, to do with the binary digits inside a number. Look at what it answered: whatever that is, it is not nine. It did not raise an error either, which is what makes this one dangerous.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Wrong, without complaint',
          body: 'Writing `^` where you meant `**` gives you a number, silently, and your program carries on with it. Errors that stop the program are the easy kind. This is the other kind.',
        },
      ],
    },
    {
      id: 'order',
      title: 'What happens first',
      blocks: [
        {
          kind: 'prose',
          body: 'When several operators appear in one line, Python does not work through them left to right. It follows the same precedence you were taught in school: powers first, then multiply and divide, then add and subtract. Brackets override all of it.',
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
            '10 - 2 - 3',
            '100 / 10 / 2',
            '2 * 3 ** 2',
            '(2 * 3) ** 2',
          ],
        },
        {
          kind: 'prose',
          body: 'The place this catches people almost every time is an average. Adding several numbers and dividing by how many there are reads naturally from left to right, and Python does the division first.',
        },
        {
          kind: 'compare',
          caption: 'The average of 2, 4 and 9. One of these is not it.',
          left: { label: 'Written without brackets', code: 'print(2 + 4 + 9 / 3)\n', bad: true },
          right: { label: 'With brackets', code: 'print((2 + 4 + 9) / 3)\n' },
        },
        {
          kind: 'prose',
          body: 'On the left, `9 / 3` happened first and the result was added to the rest, which answers a question nobody asked. On the right, the brackets forced the addition to finish before anything was divided.\n\nThe practical advice is not to memorise the table. It is this: **when you are not certain, add brackets**. Extra brackets that agree with the rules cost nothing, change nothing, and make the line readable to somebody who also does not want to check the table.',
        },
        {
          kind: 'checkpoint',
          prompt: 'What does `10 - 4 / 2` give, and how would you write it so the subtraction happens first?',
          answer: 'Division outranks subtraction, so `4 / 2` happens first and its result is then taken away from 10. The answer comes out as a decimal, because division always gives one. To make the subtraction happen first, write `(10 - 4) / 2`. Run both lines side by side: the two answers are far enough apart that you can see at a glance which one you meant.',
        },
      ],
    },
    {
      id: 'dividing-by-zero',
      title: 'Dividing by zero',
      blocks: [
        {
          kind: 'prose',
          body: 'Dividing by zero has no answer in mathematics, and Python does not invent one. It stops with an error. The lines below fail on purpose, all three of them, and the fourth is there to show that zero divided *by* something is perfectly fine.',
        },
        {
          kind: 'shell',
          caption: 'Three deliberate failures, and one line that works.',
          lines: [
            '10 / 0',
            '10 // 0',
            '10 % 0',
            '0 / 10',
          ],
        },
        {
          kind: 'prose',
          body: 'This is worth taking seriously because it is rarely a typo. Nobody writes `/ 0` on purpose. What happens is that you divide by a name, and one day that name holds zero: a total when nothing has been added yet, a count of items when the list is empty, a number somebody typed.\n\nThe cure is to check before you divide, which you will be able to write once you have met conditions. Until then, knowing the error by sight and knowing it means "something you divided by was zero" is enough to find the cause quickly.',
        },
      ],
    },
    {
      id: 'decimals-are-approximate',
      title: 'Decimals are not exact',
      blocks: [
        {
          kind: 'prose',
          body: 'One last surprise, and it is the one that makes people doubt the computer. Run this.',
        },
        {
          kind: 'shell',
          caption: 'Arithmetic you can do in your head. Python disagrees very slightly.',
          lines: [
            '0.1 + 0.2',
            '0.1 + 0.2 == 0.3',
            '1.1 * 3',
            'round(0.1 + 0.2, 2)',
            'round(0.1 + 0.2, 2) == 0.3',
          ],
        },
        {
          kind: 'prose',
          body: 'Python is not broken and neither is your computer. Decimal numbers are stored in binary, in a fixed amount of space, and some ordinary decimal fractions have no exact binary form, in the same way that one third has no exact decimal form however many 3s you write. The result is an answer that is correct to about fifteen digits and wrong in the sixteenth.\n\nFor almost everything you will write, the tiny error never matters and you never see it. It matters in exactly one place: comparing two decimal numbers with `==`, which asks whether they are identical to the last digit, and the answer is often no.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not compare decimals with ==',
          body: 'Comparing two whole numbers with `==` is exact and safe. Comparing two decimal numbers that came out of arithmetic is asking for the failure above. Round both first, or compare whole numbers where you can: count pence rather than pounds.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Why does a program that adds up prices and checks `total == 100.00` sometimes fail when the receipt clearly says 100.00?',
          answer: 'The prices were added as decimal numbers, so the total carries a tiny stored error and is not exactly 100.0 to the last digit. Printing it rounded shows 100.00 and hides the difference, while `==` sees it. Rounding the total before comparing, or working in whole pence and comparing to 10000, both avoid the problem.',
        },
      ],
    },
  ],
};

export default lesson;
