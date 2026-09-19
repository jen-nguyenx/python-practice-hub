// Foundations: the very first lesson. What a program is, and what running one looks like.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'what-a-program-is',
  title: 'What a program is',
  summary: 'A list of instructions, carried out in order, exactly as written',
  track: 'foundations',
  order: 1,
  minutes: 12,
  outcomes: [
    'Say what a program is in one sentence',
    'Predict the order the lines of a short program run in',
    'Use `print()` to see what your program did',
    'Tell the difference between what you meant and what you wrote',
  ],
  sections: [
    {
      id: 'you-can-do-this',
      title: 'Before you start',
      blocks: [
        {
          kind: 'prose',
          body: "Nothing you type here can break anything: the worst that happens is a message in red, which you read, fix, and run again. The list of things to learn is short, even if it is not easy. You get an answer in seconds, every time, so you are never left wondering if you got it right. And reading code fluently is a skill that arrives slowly for everybody, not a sign of anything about you.\n\nHere is a complete Python program, two lines long, with exactly what happens when it runs underneath it.",
        },
        {
          kind: 'code',
          caption: 'A whole program. The computer runs the first line, then the second, then stops.',
          code: 'print("Two coffees at 4.50 each cost:")\nprint(2 * 4.50)\n',
        },
      ],
    },
    {
      id: 'in-order',
      title: 'Instructions, in order',
      blocks: [
        {
          kind: 'prose',
          body: 'The whole definition:\n\n> A program is a list of instructions. The computer carries them out one at a time, from the top of the file to the bottom, finishing each one before it starts the next.\n\nIt never looks ahead, never does two things at once, and never reorders anything.',
        },
        {
          kind: 'code',
          caption: 'Three instructions. Compare the order of the lines with the order of the output.',
          code: 'print("First instruction")\nprint("Second instruction")\nprint("Third instruction")\n',
        },
        {
          kind: 'quiz',
          prompt: 'If you moved the third line of that program to the top and ran it again, what would print first?',
          code: 'print("First instruction")\nprint("Second instruction")\nprint("Third instruction")\n',
          options: [
            { text: '`Third instruction`', correct: true, why: 'The computer does not read the words for meaning. It runs whichever line now sits on top, and that line says "Third instruction".' },
            { text: '`First instruction`, because the program still describes a sequence in that order', why: 'The computer has no idea what the words mean or that "third" refers to a position. It only cares about position in the file, and you moved that line to position one.' },
            { text: 'An error, because the lines are now out of order', why: 'Three `print()` lines in any order all run without complaint. There is no correct sequence for Python to check against, only whatever order is in the file.' },
            { text: 'All three at once, since order stops mattering', why: 'The computer always runs one instruction at a time. Nothing ever happens simultaneously.' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'order-of-lines',
            title: 'The same three instructions, in any order',
            intro: 'Choose what goes on each line, and read the output underneath. Try an order that makes no sense to a person, and watch how little the computer minds.',
            template: '⟦first⟧\n⟦second⟧\n⟦third⟧\n',
            knobs: [
              {
                id: 'first',
                label: 'line 1 says',
                choices: [
                  { value: 'print("Boil the water")', caption: 'boil the water' },
                  { value: 'print("Put the tea in the pot")', caption: 'put the tea in' },
                  { value: 'print("Pour it into a cup")', caption: 'pour it out' },
                ],
              },
              {
                id: 'second',
                label: 'line 2 says',
                choices: [
                  { value: 'print("Boil the water")', caption: 'boil the water' },
                  { value: 'print("Put the tea in the pot")', caption: 'put the tea in' },
                  { value: 'print("Pour it into a cup")', caption: 'pour it out' },
                ],
              },
              {
                id: 'third',
                label: 'line 3 says',
                choices: [
                  { value: 'print("Boil the water")', caption: 'boil the water' },
                  { value: 'print("Put the tea in the pot")', caption: 'put the tea in' },
                  { value: 'print("Pour it into a cup")', caption: 'pour it out' },
                ],
              },
            ],
            notes: {
              '0-1-2': 'The order a person would use. Nothing about the program marks this one as correct; it is only the one that happens to describe making tea properly.',
              '2-1-0': 'Poured out before the water is boiled. The program runs without a word of complaint, because the computer has no idea what tea is. It is moving down the lines, and that is all it is doing.',
              '0-0-0': 'The same instruction three times. The computer does not notice the repetition or wonder whether you meant it. Three lines, three pieces of output.',
              '1-0-2': 'The tea goes in before the water boils. Wrong to you, fine to the computer: it carried out line 1, then line 2, then line 3, exactly as written.',
            },
            takeaway: 'The order of the output is the order of the lines. The computer does not look ahead, does not reorder anything into a sensible sequence, and cannot tell a good order from a bad one. Getting the order right is your job, every time.',
          },
        },
      ],
    },
    {
      id: 'seeing-output',
      title: 'Nothing shows unless you ask',
      blocks: [
        {
          kind: 'predict',
          ask: 'This program has two lines, each working out a sum. What does it show when it runs?',
          code: '3 + 4\nprint(10 + 5)\n',
          choices: ['15', '7\n15', '7'],
        },
        {
          kind: 'prose',
          body: 'Python worked out `3 + 4`, found that nothing was waiting for the answer, and dropped it. Existing and being shown are separate events, and `print()` is the only thing that makes the second one happen. A program that runs with no errors and shows nothing is almost never broken; it is a program that was never asked to say anything.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What the brackets are for',
          body: 'In `print("hello")`, the word `print` names the thing you want done and the brackets hold what you want it done to. `print` on its own, with no brackets, does not show anything.',
        },
      ],
    },
    {
      id: 'the-shell',
      title: 'Asking Python one line at a time',
      blocks: [
        {
          kind: 'prose',
          body: 'Instead of writing a whole file and running it, you can type one line, get an answer, and type another. This is called the **shell**, and these lessons use it constantly. In the blocks below, lines beginning `>>>` are what somebody typed; the line underneath is what Python answered.',
        },
        {
          kind: 'shell',
          caption: 'A short shell session. Read it top to bottom, like a conversation.',
          lines: [
            '2 + 3',
            'print(2 + 3)',
            '"2 + 3"',
            '60 * 60 * 24',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'In the shell, what does `"2 + 3"`, with the quote marks, show?',
          options: [
            { text: 'the text `2 + 3`', correct: true, why: 'Quote marks mean "this is text, hand it back exactly as written." Nothing is calculated.' },
            { text: '`5`', why: 'That is what `2 + 3` without quotes gives. Quote marks stop Python from doing arithmetic at all.' },
            { text: 'a NameError', why: 'There is no name to look up here, only a piece of text between quote marks, which always works.' },
            { text: 'nothing, because text needs `print()` to show', why: 'That rule is for programs in a file. In the shell, typing an expression on its own shows its value automatically, with no `print()` needed.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Why you are shown both',
          body: 'A shell session is the fastest way to show what something *is*. A program is the right way to show what a sequence of steps *does*. These lessons use whichever fits, and you can type either one yourself.',
        },
      ],
    },
    {
      id: 'literal',
      title: 'What you said, not what you meant',
      blocks: [
        {
          kind: 'prose',
          body: 'The computer carries out exactly what is written. It cannot tell that you meant a calculation, or that a word was a typo. Below, one program has quote marks around the sum and one does not; nothing else differs.',
        },
        {
          kind: 'compare',
          caption: 'The same characters. One pair of quote marks between them. Quote marks mean "this is text, do not work anything out"; without them, Python treats `2 + 3` as a calculation.',
          left: { label: 'With quote marks', code: 'print("2 + 3")\n' },
          right: { label: 'Without quote marks', code: 'print(2 + 3)\n' },
        },
        {
          kind: 'quiz',
          prompt: 'You want a program that shows the number of hours in a week. Which one does that?',
          options: [
            { text: '`print(7 * 24)`', correct: true, why: 'No quote marks, so Python treats `7 * 24` as a calculation and works it out.' },
            { text: '`print("7 * 24")`', why: 'Quote marks mean "show this exactly as written." It prints the six characters `7 * 24`, not an answer.' },
            { text: '`print("168")`', why: 'That only works because someone already did the multiplication by hand and typed the answer in as text. Change the numbers and it stops being right.' },
            { text: 'Either one works the same', why: 'They ask for different things: one is a calculation, the other is fixed text. Only one of them produces a number.' },
          ],
        },
      ],
    },
    {
      id: 'when-it-stops',
      title: 'When something goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'At some point, fairly soon, a program of yours will stop partway through and print a message in red. Here is one doing that on purpose: the third line has a typo, `prnt` instead of `print`.',
        },
        {
          kind: 'code',
          caption: 'The first two lines run normally. The third one stops the program.',
          code: 'print("This line runs.")\nprint("So does this one.")\nprnt("But this one does not.")\n',
        },
        {
          kind: 'annotate',
          ask: 'Click each line to see what actually happened.',
          code: 'print("This line runs.")\nprint("So does this one.")\nprnt("But this one does not.")\n',
          notes: {
            '1': 'Runs normally: this line prints its message and moves on.',
            '2': 'Also runs normally, straight after line 1. Its output is real and stays on screen.',
            '3': '`prnt` is not a real instruction, so Python raises a `NameError` here and the program stops. Nothing after this line ever runs.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A five-line program stops with an error reported on line 4. Did line 2 run?',
          options: [
            { text: 'Yes', correct: true, why: 'The computer works top to bottom, so lines 1 through 3 all ran before it reached the problem on line 4. Any output they produced already happened.' },
            { text: 'No, the whole program failed together', why: 'A program does not fail all at once. It runs each line until it cannot continue, so everything before the failing line already happened.' },
            { text: "Only if line 4 doesn't use anything from line 2", why: "Whether line 4 depends on line 2 is beside the point. Line 2 comes before line 4 in the file, so it runs first regardless." },
            { text: "There's no way to know without running it", why: 'You do know: Python always runs top to bottom and stops only when it reaches trouble, so everything above the failing line has already run.' },
          ],
        },
        {
          kind: 'prose',
          body: 'So: a program is a list of instructions, carried out in order, exactly as written, and the output is the part you asked to be shown. Everything else you learn is built on those two sentences.',
        },
      ],
    },
  ],
};

export default lesson;
