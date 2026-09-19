// Foundations: how to read what Python says when something goes wrong.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'reading-an-error',
  title: 'Reading an error message',
  summary: 'Python tells you what went wrong and where. Most beginners never read it',
  track: 'foundations',
  order: 7,
  minutes: 12,
  outcomes: [
    'Read a traceback from the bottom up and say what went wrong',
    'Point at the line that caused an error',
    'Tell the four commonest error types apart by what they mean',
    'Know why the reported line is sometimes not the guilty one',
  ],
  sections: [
    {
      id: 'not-a-telling-off',
      title: 'An error is information',
      blocks: [
        {
          kind: 'prose',
          body: 'The first thing to unlearn is that a red error message means you have failed. It does not. An error is Python telling you, in detail and for free, exactly what it could not do and exactly where it gave up. Experienced programmers cause errors constantly. The difference is that they *read* them.\n\nA beginner sees a wall of red and scrolls away. That habit costs more time than any other single thing, because the answer is almost always written in the message.',
        },
        {
          kind: 'code',
          caption: 'Here is a program with a mistake in it. Read what Python says before reading on.',
          code: "prices = [4, 3, 5]\ntotal = 0\nfor p in prices:\n    total = total + p\nprint(avarage)\n",
        },
        {
          kind: 'prose',
          body: 'Three useful facts are in that message. The **type** is `NameError`. The **explanation** is that the name `avarage` is not defined. And the **line number** points at the exact line. Together those say: on that line, you used a name Python has never heard of. Which is true, because it is a typo for `average`, a variable that was never created in the first place.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Read it bottom up',
          body: 'When an error message has several lines, the **last** line is what went wrong. The lines above it show how Python got there. For short programs the last line is usually all you need.',
        },
      ],
    },
    {
      id: 'four-you-will-meet',
      title: 'The four you will meet',
      blocks: [
        {
          kind: 'prose',
          body: 'Nearly every error in your first months is one of four kinds. Learning what each one *means* is quicker than learning them case by case, because the type tells you which question to ask.',
        },
        {
          kind: 'table',
          head: ['Type', 'What Python is saying', 'First thing to check'],
          rows: [
            ['SyntaxError', 'I cannot even read this, so I have not run anything', 'The line above the one reported: a missing bracket or quote'],
            ['NameError', 'You used a name I have never been given', 'Spelling, and whether you created it before using it'],
            ['TypeError', 'That operation does not make sense for this kind of value', 'Whether something is text when you meant a number'],
            ['IndexError', 'There is no item at that position', 'The length, and that counting starts at 0'],
          ],
        },
        {
          kind: 'prose',
          body: 'Watch each of them happen. None of these programs is long, and in every case the message names the problem.',
        },
        {
          kind: 'code',
          caption: 'A name that was never created.',
          code: "score = 10\nprint(scores)\n",
        },
        {
          kind: 'code',
          caption: 'Text and a number, added. Python will not guess which you meant.',
          code: "age = input()\nprint(age + 1)\n",
          stdin: ['21'],
        },
        {
          kind: 'code',
          caption: 'Asking for the fourth item of a three-item list.',
          code: "days = ['Mon', 'Tue', 'Wed']\nprint(days[3])\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'The list above has three items, and `days[3]` failed. What is the largest position that works, and why?',
          answer: '`days[2]`, which is `Wed`. Positions start at 0, so three items occupy positions 0, 1 and 2. The last position is always one less than the length. This off-by-one is the single most common error in programming, and it has caught everyone who has ever written code.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'same-lines-different-mistake',
            title: 'Same three lines, four different mistakes',
            intro: 'Switch which one thing is wrong at the top of this program, and watch both the error type and the line it happens on change.',
            template: '⟦setup⟧\nfor row in report:\n    print(row[0])\nprint(\'done\')\n',
            knobs: [
              {
                id: 'setup',
                label: 'the mistake',
                choices: [
                  { value: 'report = [(1, 2), (3, 4)]', caption: 'no mistake' },
                  { value: 'report = [1, 2, 3]', caption: 'wrong kind of item in the list' },
                  { value: 'reports = [(1, 2)]', caption: 'misspelled the name' },
                  { value: 'report = [1, 2, 3][10]', caption: 'asked for an item past the end' },
                ],
              },
            ],
            notes: {
              '0': 'No mistake at all: `report` holds two pairs, so `row[0]` pulls the first number out of each one, and the program finishes cleanly with `done`.',
              '1': '`report` holds plain numbers instead of pairs. `row[0]` needs something with parts to index into, and a lone number has none, so `TypeError` fires on line 3, the moment the loop first tries it.',
              '2': '`report` itself was never created. The line above defines `reports` instead, one letter different. Python does not notice the typo until it needs the real name, so the failure lands on line 2, the `for` line, and it is a `NameError`.',
              '3': 'This time the mistake is on line 1 itself: asking for the eleventh item of a three-item list raises `IndexError` before the loop even starts, so nothing after it ever runs.',
            },
            takeaway: 'The same three-line program, with one line changed at the top, gives four different results: a clean run, and three different errors on three different lines. Type and line are the two clues Python always hands you, and reading both, rather than only noticing that something broke, is what gets you to the cause fastest.',
          },
        },
      ],
    },
    {
      id: 'syntax-is-different',
      title: 'Why SyntaxError is the odd one out',
      blocks: [
        {
          kind: 'prose',
          body: 'The other three happen **while** your program runs, so anything before them has already happened. A `SyntaxError` is different: Python could not understand the file at all, so **nothing ran**. Not one line.\n\nThat matters when you are hunting it, because a `SyntaxError` is often reported one line *later* than the real mistake. Python reads left to right and only realises something is wrong when it hits something that cannot follow.',
        },
        {
          kind: 'code',
          caption: 'The bracket is missing on line 1, but look at which line Python blames.',
          code: "total = (3 + 4\nprint(total)\n",
        },
        {
          kind: 'prose',
          body: 'Python got to the end of line 1 with a bracket still open, carried on to line 2 hoping the rest was coming, and only gave up there. So the rule for a `SyntaxError` is: **look at the reported line, and then look at the line above it**. Nine times out of ten the missing bracket or quote is on the earlier one.',
        },
        {
          kind: 'compare',
          caption: 'A missing colon is the other common one. Both of these look fine at a glance.',
          left: { label: 'Missing the colon', code: "for n in range(3)\n    print(n)\n", bad: true },
          right: { label: 'Correct', code: "for n in range(3):\n    print(n)\n" },
        },
      ],
    },
    {
      id: 'the-shell',
      title: 'Asking Python directly',
      blocks: [
        {
          kind: 'prose',
          body: 'You do not have to reason about an error in your head. You can ask. When something is not the kind of thing you assumed, `type()` settles it in one line, and `len()` settles a length question the same way.',
        },
        {
          kind: 'shell',
          caption: 'A shell session. The lines beginning >>> are typed; the lines under them are what Python answered. Here the person typed 21 when asked.',
          stdin: ['21'],
          lines: [
            'age = input()',
            'age',
            'type(age)',
            'age + 1',
            'int(age) + 1',
            "days = ['Mon', 'Tue', 'Wed']",
            'len(days)',
            'days[len(days) - 1]',
          ],
        },
        {
          kind: 'prose',
          body: 'Notice that `age` came back as `\'21\'` with quote marks around it, and `type(age)` said `str`. That is the whole explanation for the `TypeError` earlier: `input()` always hands back text, even when the person typed digits. `int(age)` converts it, and then the addition works.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In the exam',
          body: 'You will be asked to name the error a snippet raises and say why. The marks are for the reason, not just the type, so practise saying it in a sentence: "`TypeError`, because `input()` returns text and you cannot add a number to text."',
        },
      ],
    },
    {
      id: 'method',
      title: 'What to actually do',
      blocks: [
        {
          kind: 'steps',
          title: 'When you hit an error',
          items: [
            'Read the last line. It names the type and explains the problem in words.',
            'Find the line number, and open that line.',
            'If it is a `SyntaxError`, check the line above too.',
            'Ask what each name on that line is holding. Use `print()` or `type()` if you are not sure.',
            'Change one thing, then run it again. Changing three things at once tells you nothing.',
          ],
        },
        {
          kind: 'prose',
          body: 'That last point is worth more than it looks. The temptation when something breaks is to change everything that looks suspicious at once. If it then works you have no idea why, and if it still fails you have three new problems. One change, one run.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program crashes with `TypeError` on line 12. You look at line 12 and it reads `total = total + row[2]`. What are the two things worth checking first?',
          answer: 'What `total` is holding, and what `row[2]` is holding. A `TypeError` on an addition almost always means one of the two is text when you expected a number, which is the normal state of anything read from a file or from `input()`. Printing both just before line 12 settles it immediately.',
        },
      ],
    },
  ],
};

export default lesson;
