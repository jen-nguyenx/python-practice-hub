// Core lesson for topic 01: variables, types and expressions.
// Nothing here states what Python does. Every value a reader sees comes from the verifier running the block.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-variables-expressions',
  title: 'Variables and expressions',
  summary: 'What kind a value is, the three ways to divide, and why money in floats goes wrong',
  track: 'core',
  minutes: 22,
  topicId: 'variables-expressions',
  prereqs: ['reading-an-error'],
  outcomes: [
    'Say what kind a value is, and convert it on purpose rather than by accident',
    'Choose between /, // and % for the question you are actually asking',
    'Work out the order Python applies operators in, and use brackets when it matters',
    'Build output with an f-string instead of gluing text to numbers',
    'Explain why a float is an approximation, and handle money without losing a cent',
  ],
  sections: [
    {
      id: 'kinds-of-value',
      title: 'What kind is it',
      blocks: [
        {
          kind: 'prose',
          body: 'Almost every `TypeError` you will ever meet comes from the same thing: a value was a different **kind** of thing from the one you assumed. Not the wrong number, the wrong kind. The number 7 and the text `\'7\'` look identical on the screen and behave nothing alike.\n\nThis matters on your very first program, because `input()` hands back text no matter what the person typed. Every digit they type arrives as characters. If you do not convert it, the arithmetic you write is not arithmetic at all.',
        },
        {
          kind: 'shell',
          caption: 'A shell session. The lines after `>>>` are typed; what follows each one is what Python answered. Here the person typed 7 when asked.',
          stdin: ['7'],
          lines: [
            'trips = input()',
            'trips',
            'type(trips)',
            'trips * 2',
            'int(trips) * 2',
            'type(4.90)',
            "type('Perth')",
            'type(True)',
          ],
        },
        {
          kind: 'prose',
          body: 'Two things in that session are worth stopping on. `trips` came back wearing quote marks, which is how the shell tells you it is text. And `trips * 2` did something, and did not complain, and was still wrong — which is far more dangerous than an error, because nothing tells you about it.\n\nThe four kinds you will meet in this topic are `int` (a whole number), `float` (a number with a decimal point), `str` (text) and `bool` (`True` or `False`). `type()` settles any argument you are having with yourself about which one you have.',
        },
        {
          kind: 'experiment',
          id: 't01-x3',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program reads two numbers with `input()` and adds them. The answer that comes out is not too big, it is too **long**. What happened?',
          answer: 'Both values are still text, so `+` stuck the characters end to end instead of adding. The fix goes on the line that reads the value, not on the line that adds it: `int(input())`, or `float(input())` if decimals are possible. Convert as you read, and you never have to wonder later what kind something is.',
        },
      ],
    },
    {
      id: 'converting',
      title: 'Converting on purpose',
      blocks: [
        {
          kind: 'prose',
          body: 'Converting is asking Python to make a value of one kind from a value of another: `int()`, `float()` and `str()` each build a new value and leave the original alone. Two of them have a sharp edge that catches nearly everybody.',
        },
        {
          kind: 'shell',
          caption: 'The sixth line fails on purpose. Read the message before reading on.',
          lines: [
            "int('42')",
            "float('3.40')",
            'str(950)',
            'int(3.99)',
            'round(3.99)',
            "int('12.0')",
            "int(float('12.0'))",
          ],
        },
        {
          kind: 'prose',
          body: 'The first edge is `int()` on a number that already has decimals: it does not round, it cuts. Compare the `int(3.99)` line with the `round(3.99)` line above and you can see the two disagree by a whole one.\n\nThe second edge is `int()` on text. It accepts text only when the text is a whole number, which is why `int(\'12.0\')` stopped the program while `float(\'12.0\')` would not have. The last line shows the way through when you genuinely need a whole number out of decimal text: `float()` first, then `int()`.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Read a price with float()',
          body: 'Anything that could carry cents, a decimal point or a half — a price, a temperature, a time in hours — is read with `float()`. Use `int()` for counts of whole things: trips, pages, people.',
        },
        {
          kind: 'prose',
          body: 'There are three different ways to get rid of a decimal point, and on ordinary numbers they agree with each other, which is exactly how the wrong one gets into a program unnoticed. Play with the values below until you can say where they split apart.',
        },
        {
          kind: 'experiment',
          id: 't01-x2',
        },
      ],
    },
    {
      id: 'dividing',
      title: 'Three ways to divide',
      blocks: [
        {
          kind: 'prose',
          body: 'Python has three dividing operators because "divide" is three different questions. *How much each?* is `/`. *How many whole ones fit?* is `//`. *What is left over?* is `%`. Picking the wrong one rarely raises an error, it quietly answers a question you did not ask.',
        },
        {
          kind: 'shell',
          caption: 'The same two numbers, three ways, plus the cases people get wrong.',
          lines: [
            '18 / 4',
            '18 // 4',
            '18 % 4',
            '6 / 3',
            '7.0 // 2',
            '-7 // 2',
            '-7 % 2',
          ],
        },
        {
          kind: 'prose',
          body: 'Look hard at the `6 / 3` line. Plain `/` answers with a decimal point even when the division comes out exactly, which is how a program ends up printing a count of pages with a `.0` stuck on the end. When the answer is a count of whole things, the operator you want is `//`.\n\nThe last two lines are the ones to remember for the exam rather than reason about under pressure: `//` rounds **down**, towards negative infinity, not towards zero.',
        },
        {
          kind: 'experiment',
          id: 't01-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'A run took 135 minutes and you want to print it as hours and minutes. Which operator gives the hours, and which gives the minutes left over?',
          answer: '`135 // 60` gives the whole hours and `135 % 60` gives the minutes that did not make up another hour. They belong together: whenever you reach for one of them, ask whether you also need the other. This pairing is behind almost every "split a total into units" question — minutes into hours, cents into dollars, items into full boxes.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Dividing by zero is not a wrong answer',
          body: 'It is a stopped program. If the number you are dividing by came from a user, a count or a list length, check it is not zero before you divide.',
        },
      ],
    },
    {
      id: 'precedence',
      title: 'The order things happen',
      blocks: [
        {
          kind: 'prose',
          body: 'Python works an expression out in a fixed order, not left to right. You do not need to memorise the whole table, but you do need to know the three places where the order surprises people, because each one appears in exam papers as a "what does this print" question.',
        },
        {
          kind: 'shell',
          caption: 'Each pair is the same characters with and without brackets.',
          lines: [
            '2 + 3 * 4',
            '(2 + 3) * 4',
            '4 + 6 / 2',
            '(4 + 6) / 2',
            '2 ** 3 ** 2',
            '-3 ** 2',
            '(-3) ** 2',
            '100 // 30 * 2',
            '100 // (30 * 2)',
          ],
        },
        {
          kind: 'table',
          caption: 'Highest first. Anything on the same row is applied left to right, with one exception noted.',
          head: ['Order', 'Operators', 'Worth knowing'],
          rows: [
            ['1', 'Brackets ( )', 'Always wins, and always allowed'],
            ['2', '**', 'Applied right to left, so 2 ** 3 ** 2 in the session above is not read left to right'],
            ['3', 'A leading minus', 'It comes after **, which is why the two versions of -3 ** 2 above disagree'],
            ['4', '*  /  //  %', 'Left to right, so two divides in a row matter'],
            ['5', '+  -', 'Left to right, and last of all'],
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'brackets-cross-once',
            title: 'Two expressions, one number apart',
            intro: 'Drag the number and watch `n + 6 / 2` against `(n + 6) / 2`. They only ever agree at one value of n.',
            template: 'n = ⟦n⟧\nwrong = n + 6 / 2\nright = (n + 6) / 2\nprint("n + 6 / 2   =", wrong)\nprint("(n + 6) / 2 =", right)\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'the number', min: -10, max: 10, start: 0 },
            ],
            probes: {
              'no-brackets': '[[k, k + 6 / 2] for k in range(-10, 11)]',
              'with-brackets': '[[k, (k + 6) / 2] for k in range(-10, 11)]',
              here: '[[⟦n⟧, ⟦n⟧ + 6 / 2], [⟦n⟧, (⟦n⟧ + 6) / 2]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'n',
              yLabel: 'value',
              marker: 'here',
              caption: 'Both expressions plotted against n. They cross exactly once, and the dots mark the n you chose.',
              series: [
                { probe: 'no-brackets', label: 'n + 6 / 2' },
                { probe: 'with-brackets', label: '(n + 6) / 2' },
              ],
            },
            notes: {
              '10': 'At n = 0 the two lines meet: both come out at 3.0. Testing an expression only at 0 is how a precedence bug like this one gets past you completely.',
              '0': 'At n = -10 the gap is wide: -7.0 against -2.0. Away from zero, skipping the division does something very different from doing it last.',
              '20': 'At n = 10 the gap has swung the other way: 13.0 against 8.0. Whichever side of zero n sits on, only one of these lines is the average.',
            },
            takeaway: '`n + 6 / 2` always finishes the division first, so it is really `n + 3.0` in disguise. `(n + 6) / 2` divides the whole total, which is `n / 2 + 3`. The two lines cross exactly once, at n = 0, so a test built around zero can make a missing bracket look harmless when every other value would have caught it.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'You want the average of 4 and 6. Which of `4 + 6 / 2` and `(4 + 6) / 2` is the average, and why does the other one look so plausible?',
          answer: 'The bracketed one. Without brackets the division is applied before the addition, so Python halves the 6 and then adds the 4 — both lines are in the session above, and they do not agree. It looks plausible because it reads in English exactly like the thing you meant. Whenever an expression mixes `+` with `*`, `/` or `//`, put the brackets in even when they are not needed: they cost nothing and they say what you meant.',
        },
      ],
    },
    {
      id: 'showing-the-answer',
      title: 'Showing the answer',
      blocks: [
        {
          kind: 'prose',
          body: 'Having worked something out, you have to show it. The obvious move is to glue the label to the number with `+`, and that is the one move Python refuses.',
        },
        {
          kind: 'compare',
          caption: 'The left side stops the program. The right side is what to write instead.',
          left: {
            label: 'Gluing text to a number',
            bad: true,
            code: `fare = 4.9
print('Fare: $' + fare)
`,
          },
          right: {
            label: 'An f-string',
            code: `fare = 4.9
print(f'Fare: \${fare:.2f}')
`,
          },
        },
        {
          kind: 'prose',
          body: 'An f-string is a string with an `f` in front of it. Anything you put inside `{ }` is worked out and dropped into the text, whatever kind it is, so there is no converting to do. After a colon you can say how it should look.',
        },
        {
          kind: 'code',
          caption: 'Three format specifiers you will use constantly.',
          code: `fare = 4.9
trips = 7
minutes = 5
seconds = 7
print(f'{trips} trips cost \${fare * trips:.2f}')
print(f'{minutes}:{seconds:02d}')
print(f'{fare * trips:.0f} dollars, near enough')
`,
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Formatting is not rounding',
          body: '`:.2f` changes how a value is shown at that moment. `round(x, 2)` makes a new number. A question that says "round the answer to 2 decimal places" wants `round`, because the marker checks the returned value and never looks at the screen.',
        },
      ],
    },
    {
      id: 'floats-are-approximate',
      title: 'A float is not exact',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the part that sounds like a trick and is not. A `float` is stored in binary, and most ordinary decimal fractions have no exact binary form, in the same way that a third has no exact decimal form. So what gets stored is very close and not equal.\n\nYou will not notice for most of a program. You notice when you compare two floats, and when you multiply money by 100.',
        },
        {
          kind: 'shell',
          caption: 'Nothing is wrong with your computer. This is arithmetic on approximations.',
          lines: [
            '0.1 + 0.2',
            '0.1 + 0.2 == 0.3',
            'round(0.1 + 0.2, 2) == 0.3',
            '4.35 * 100',
            'int(4.35 * 100)',
            'round(4.35 * 100)',
          ],
        },
        {
          kind: 'prose',
          body: 'The `int(4.35 * 100)` line is where a real program loses a cent. `int()` cuts, and what it was handed was a hair under 435, so the cut takes a whole unit off. `round()` on the same value gives what you expected. Whenever you move money into whole cents, `round()` it.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not test two floats with ==',
          body: 'Compare them after rounding both to the number of places you care about, or test that the difference between them is tiny. Testing whether a float is exactly equal to a decimal you typed is a coin flip.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A till program adds up prices in dollars as floats and the total sometimes ends in a long tail of digits. What is the standard fix?',
          answer: 'Work in whole cents. Convert each price to cents once, with `round(price * 100)`, add up integers, and convert back to dollars for output at the very end. Integers have no rounding error at all, so every sum along the way is exact. The same idea works for any money calculation: do the arithmetic in the smallest whole unit and format on the way out.',
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'All of it at once',
      blocks: [
        {
          kind: 'prose',
          body: 'The worked example below uses every idea in this lesson in six lines: text arriving from `input()`, a conversion chosen to match the value, money moved into whole cents to dodge the float problem, `//` and `%` used as a pair, and an f-string on the way out. Read the steps in order rather than the code first.',
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
          body: 'These are the mistakes that cost marks in this topic. Most of them are quiet: the program runs and gives an answer, and the answer is wrong.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'Now go and use it. Start with the reading questions to check your predictions, then the code ones.',
        },
      ],
    },
  ],
};

export default lesson;
