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
          body: 'A lot of people arrive here believing that programming is for a certain kind of mind, and that they do not have one. So before any Python, four facts that are worth more than encouragement, because you can check every one of them yourself.\n\n**Nothing you type can break anything.** Not the computer, not this page, not your work. The worst that happens is a message in red saying Python could not do what you asked. You read it, change a character, and run it again.\n\n**The list of things to learn is short.** Not easy, but short. A handful of ways to store a value, a handful of ways to repeat something, a handful of ways to make a decision. That is most of it. You are not facing an endless subject.\n\n**You get an answer every few seconds.** Unlike most things worth learning, you are never left wondering whether you got it right. You run the code, and the computer tells you at once.\n\n**Nobody reads code fluently at the start.** Reading a line of Python and knowing what it does is a skill that arrives slowly and without you noticing. Feeling slow now is what the beginning feels like, not a sign about you.',
        },
        {
          kind: 'prose',
          body: 'Here is a complete Python program. It is two lines long. Underneath it is exactly what happens when the computer runs it.',
        },
        {
          kind: 'code',
          caption: 'A whole program, and its output.',
          code: 'print("Two coffees at 4.50 each cost:")\nprint(2 * 4.50)\n',
        },
        {
          kind: 'prose',
          body: 'That is not a fragment or a simplified version. That is a program. The computer read the first line, did what it said, then read the second line and did what that said, and then stopped because there was nothing left.\n\nThe area underneath the code is called the **output**: everything the program showed you while it ran. For now, the output is the only way you can see what your program did.',
        },
      ],
    },
    {
      id: 'in-order',
      title: 'Instructions, in order',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the definition, and it really is the whole thing:\n\n> A program is a list of instructions. The computer carries them out one at a time, from the top of the file to the bottom, finishing each one before it starts the next.\n\nThat is worth trusting, because almost every confusion a beginner has comes from quietly assuming the computer did something in a different order, or did two things at once, or looked ahead. It does not. It starts at the top, and it works down.',
        },
        {
          kind: 'code',
          caption: 'Three instructions. Compare the order of the lines with the order of the output.',
          code: 'print("First instruction")\nprint("Second instruction")\nprint("Third instruction")\n',
        },
        {
          kind: 'prose',
          body: 'The output came out in the same order as the lines, because the computer went through them in that order. There is nothing clever happening. That is the point.',
        },
        {
          kind: 'checkpoint',
          prompt: 'If you moved the third line of that program to the top and ran it again, what would come out first?',
          answer: '`Third instruction`. The computer does not know that "third" is a word about position, and it does not read the words for meaning at all. It reads line one, shows whatever that line says to show, and moves on. Order in the file is order in the output, always.',
        },
      ],
    },
    {
      id: 'seeing-output',
      title: 'Nothing shows unless you ask',
      blocks: [
        {
          kind: 'prose',
          body: 'A program is silent by default. It can work out an enormous amount and show you none of it. `print()` is how you ask for something to be shown.\n\nThe program below has two lines. The first works out a number and the second works out a different number. Look at how much of that reaches the output.',
        },
        {
          kind: 'code',
          caption: 'Two calculations. Only one of them is shown.',
          code: '3 + 4\nprint(10 + 5)\n',
        },
        {
          kind: 'prose',
          body: 'The first line ran. The computer worked out the answer to `3 + 4`, and then, because nothing was done with that answer, threw it away. It was never shown because nothing asked for it to be shown.\n\nThis catches everybody at least once: you write a program, it runs with no errors at all, and nothing appears. That is almost never a broken program. It is a program that was never asked to say anything.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What the brackets are for',
          body: 'In `print("hello")`, the word `print` names the thing you want done and the brackets hold what you want it done to. The brackets are not decoration: `print` on its own, with no brackets, does not show anything.',
        },
      ],
    },
    {
      id: 'the-shell',
      title: 'Asking Python one line at a time',
      blocks: [
        {
          kind: 'prose',
          body: 'There is a second way to use Python, and these lessons use it constantly, so it is worth meeting now.\n\nInstead of writing a whole file and running it, you can type one line, get an answer, and type another. This is called the **shell**. In the blocks below, the lines beginning with `>>>` are what somebody typed, and the line underneath each one is what Python answered.',
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
          kind: 'prose',
          body: 'Two things in there are worth slowing down for.\n\nThe first line had no `print()` and still showed an answer. That is the shell being helpful: it shows you the value of whatever you type, so you can ask it questions. Inside a program file, the same line would show nothing, as you saw in the last section.\n\nThe third line has quote marks around it, and what came back is not a number at all. Quote marks change the meaning of what you write, completely, and that is the subject of the next section.',
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
          body: 'The computer has no idea what you are trying to achieve. It cannot tell that you meant a calculation, or that a word was a typo, or that you had a sensible intention. It carries out what is written, exactly, and that is the single most useful thing to remember while you are learning.\n\nBelow, one program has quote marks around the sum and one does not. Nothing else differs.',
        },
        {
          kind: 'compare',
          caption: 'The same characters. One pair of quote marks between them.',
          left: { label: 'With quote marks', code: 'print("2 + 3")\n' },
          right: { label: 'Without quote marks', code: 'print(2 + 3)\n' },
        },
        {
          kind: 'prose',
          body: 'Quote marks mean *this is text, hand it back to me as written, do not work anything out*. Without them, Python treats `2 + 3` as a calculation and does it.\n\nNeither program is wrong. They ask for different things, and each one did what was asked. The lesson is not "avoid quote marks", it is that a character you might not even notice can change the whole meaning of a line.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You want a program that shows the number of hours in a week. Which of `print("7 * 24")` and `print(7 * 24)` does what you want?',
          answer: '`print(7 * 24)`, with no quote marks. The version with quotes would show the characters `7 * 24` and leave you to do the arithmetic yourself. If you are ever unsure which you have written, run it: the answer is immediate, and you never have to guess.',
        },
      ],
    },
    {
      id: 'when-it-stops',
      title: 'When something goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'At some point, fairly soon, a program of yours will stop partway through and print a message in red. Here is one doing that on purpose, so that the first time you see it is not while you are also worried about something else.\n\nThe third line below has a typo: `prnt` instead of `print`.',
        },
        {
          kind: 'code',
          caption: 'The first two lines run normally. The third one stops the program.',
          code: 'print("This line runs.")\nprint("So does this one.")\nprnt("But this one does not.")\n',
        },
        {
          kind: 'prose',
          body: 'Notice what survived. The first two lines had already been carried out, and their output is still there. The program did not undo anything or lose anything. It went top to bottom exactly as always, reached an instruction it could not carry out, said so, and stopped.\n\nThat message is not a telling-off and it is not a judgement of you. It is the most useful thing the computer produces: it names the kind of problem and the line number where it gave up. There is a whole lesson on reading these messages, and reading them is the habit that separates people who get unstuck quickly from people who do not.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A five-line program stops with an error reported on line 4. Did line 2 run?',
          answer: 'Yes. The computer works from the top down, so lines 1, 2 and 3 were all carried out before it reached the problem, and any output they produced is real. Line 5 did not run, because the program stopped before it got there. This is why it is worth reading the output above an error, not only the error itself: it tells you how far the program got.',
        },
        {
          kind: 'prose',
          body: 'So: a program is a list of instructions, carried out in order, exactly as written, and the output is the part you asked to be shown. Everything else you will learn is built on top of those two sentences.',
        },
      ],
    },
  ],
};

export default lesson;
