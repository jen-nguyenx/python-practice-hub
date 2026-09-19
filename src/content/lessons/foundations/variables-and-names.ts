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
          body: 'Everything you have written so far has worked out a value, shown it, and forgotten it. That is enough for one sum and useless for anything longer, because real programs use the same value in several places.\n\nHere is a program that works out the cost of twelve coffees, and then the cost with a ten per cent discount.',
        },
        {
          kind: 'code',
          caption: 'The price is written out twice.',
          code: 'print(12 * 4.50)\nprint(12 * 4.50 * 0.9)\n',
        },
        {
          kind: 'prose',
          body: 'It works. Now the price goes up to five pounds. You have to find every copy of `4.50` and change it, and if you miss one, the program keeps running and gives you a wrong answer without a word of complaint. With two lines you will not miss one. With two hundred lines, you will.\n\nThe fix is to write the price down once, under a name.',
        },
        {
          kind: 'code',
          caption: 'The price is written once, at the top. One line to change when it moves.',
          code: 'price = 5.00\nprint(12 * price)\nprint(12 * price * 0.9)\n',
        },
        {
          kind: 'prose',
          body: 'A name used like this is called a **variable**, because what it holds can vary. That is the whole idea: `price` is a label, `5.00` is the value the label is stuck to, and everywhere you write `price`, Python looks up what the label is on and uses that.\n\nThe second reason to use names has nothing to do with changing values. `12 * price` says what it means. `12 * 4.50` does not, and in six months neither will you.',
        },
      ],
    },
    {
      id: 'right-to-left',
      title: 'How assignment works',
      blocks: [
        {
          kind: 'prose',
          body: 'Writing `price = 5.00` is called **assignment**. There is one rule for reading it, and it is not the rule you learned in maths:\n\n> Work out everything on the **right** of the `=` first. Then attach the name on the **left** to the result.\n\nRight to left, always. The name is the destination, not one side of a balance.',
        },
        {
          kind: 'shell',
          caption: 'Making names, and using them.',
          lines: [
            'price = 4.50',
            'price',
            'price * 2',
            'count = 3',
            'total = price * count',
            'total',
            'price',
          ],
        },
        {
          kind: 'prose',
          body: 'Three things to take from that session.\n\nThe assignment lines showed no answer at all. Assignment is an instruction, not a question: it stores something and hands nothing back. If you ever wonder why a line "did nothing", check whether it was an assignment.\n\nLine 5 worked out `price * count` first, got a number, and only then attached the name `total` to it. Right to left.\n\nAnd the last line shows `price` unchanged. Using a value never uses it up. You can read a name as often as you like.',
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
          body: 'Python uses `=` for "store this" and `==` for "are these the same?". They are different operations that happen to be spelled similarly, and confusing them is close to universal at the start.\n\n- `=` is an instruction. It changes what a name holds. It answers nothing.\n- `==` is a question. It changes nothing. It answers `True` or `False`.',
        },
        {
          kind: 'shell',
          caption: 'Watch which lines change `count` and which only ask about it.',
          lines: [
            'count = 3',
            'count',
            'count == 3',
            'count == 4',
            'count',
            'count = 4',
            'count',
          ],
        },
        {
          kind: 'prose',
          body: 'The two `==` lines answered a question and left `count` exactly as it was. The `=` lines answered nothing and changed it. Read `=` out loud as "becomes" and `==` as "is equal to", and the two stop blurring together.',
        },
        {
          kind: 'prose',
          body: 'Because assignment is an instruction and the name is the destination, the name has to be on the left. Putting it on the right is not a different way of saying the same thing; it is something Python cannot read at all. The program below is wrong on purpose.',
        },
        {
          kind: 'code',
          caption: 'A deliberate error. Notice that even line 1 produced no output.',
          code: 'total = 10\n10 = total\nprint(total)\n',
        },
        {
          kind: 'prose',
          body: 'This error type is different from the others you have seen. Python could not make sense of the file as a piece of writing, so it refused to run **any** of it, including the first line, which was perfectly fine. Nothing at all ran. When you get one of these, the program has not half-worked: it has not started.',
        },
        {
          kind: 'checkpoint',
          prompt: 'What is the difference between `x = 5` and `x == 5`?',
          answer: 'The first makes `x` hold `5`, replacing whatever it held before, and produces no answer. The second leaves `x` alone and produces `True` or `False` depending on what `x` already holds. Reading them aloud is the reliable way to keep them apart: "x becomes 5" against "x is equal to 5".',
        },
      ],
    },
    {
      id: 'changing-it',
      title: 'Changing what a name holds',
      blocks: [
        {
          kind: 'prose',
          body: 'A name can be re-attached as often as you like, and the old value is dropped when you do. This is how anything that accumulates works: a running total, a score, a counter.\n\nThe line that surprises people is `score = score + 10`, which is nonsense as a mathematical statement and perfectly sensible as an instruction. Read it right to left: work out `score + 10` using what `score` holds *now*, then attach `score` to the answer.',
        },
        {
          kind: 'shell',
          caption: 'A name built up from its own old value.',
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
          kind: 'prose',
          body: 'Each line used the old value to work out the new one. Nothing circular happened, because the right-hand side was finished before the name moved.',
        },
        {
          kind: 'prose',
          body: 'A name is also free to hold a different *type* of value later. Python does not fix a name to one kind of thing. That flexibility is convenient and occasionally a trap, so it is worth seeing once.',
        },
        {
          kind: 'shell',
          caption: 'The same name, holding two different kinds of value.',
          lines: [
            'answer = 42',
            'type(answer)',
            'answer = "forty two"',
            'type(answer)',
            'answer + 1',
          ],
        },
        {
          kind: 'prose',
          body: 'The last line fails on purpose, and by now the message should read as reasonable: the name is currently attached to text, so adding a number to it is the mixture Python refuses. The name did not change. What it points at did.',
        },
      ],
    },
    {
      id: 'choosing-names',
      title: 'Choosing a name',
      blocks: [
        {
          kind: 'prose',
          body: 'Python has a few rules about what a name may be made of, and beyond those, complete freedom. The rules are short:',
        },
        {
          kind: 'table',
          caption: 'The rules for a legal name.',
          head: ['Rule', 'Works', 'Does not work'],
          rows: [
            ['Letters, digits and underscores only', 'total_2', 'total-2'],
            ['Cannot start with a digit', 'score2', '2score'],
            ['No spaces', 'first_name', 'first name'],
            ['Capital letters count as different', 'total_cost', 'Total_cost is a separate name'],
          ],
        },
        {
          kind: 'code',
          caption: 'A name starting with a digit. Another deliberate error, and another one that stops the file being read at all.',
          code: '2nd_place = "Sam"\nprint(2nd_place)\n',
        },
        {
          kind: 'prose',
          body: 'The last rule in the table is the one that bites quietly. Capital letters matter, so a name typed with a capital in one place and without it in another is two separate names as far as Python is concerned.',
        },
        {
          kind: 'shell',
          caption: 'Two names that differ by one capital letter.',
          lines: [
            'Total = 10',
            'total = 3',
            'Total',
            'total',
          ],
        },
        {
          kind: 'prose',
          body: 'Now the part the rules do not cover. A name that describes what it holds is the cheapest documentation there is, and the usual style in Python is lower case with underscores between words: `first_name`, `total_cost`, `days_late`.\n\nSingle letters like `a` and `x` are a false economy. They save you four keystrokes today and cost you ten minutes every time you come back to the code, because nothing on the screen tells you what they are for. The exception that everyone accepts is a counter in a loop, where `i` is traditional and understood.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Which of these are legal Python names: `total cost`, `total_cost`, `TotalCost`, `1st_total`, `_total`?',
          answer: '`total_cost`, `TotalCost` and `_total` are legal. `total cost` has a space in it and `1st_total` starts with a digit, so neither can be read by Python at all. Of the legal three, `total_cost` is the one that matches the usual Python style and the one another reader would expect.',
        },
      ],
    },
    {
      id: 'no-such-name',
      title: 'A name that is not there',
      blocks: [
        {
          kind: 'prose',
          body: 'Python knows nothing about a name until an assignment creates it. Ask for one it has never been given, and it stops and says so. There are only two ways this happens, and the message is the same for both.\n\nThe first is a typo.',
        },
        {
          kind: 'code',
          caption: 'A deliberate misspelling. Note the line number in the message.',
          code: 'total = 25\nprint(totl)\n',
        },
        {
          kind: 'prose',
          body: 'The second is asking for a name before the line that creates it. Remember that the computer works top to bottom: when it reaches line 1 below, line 2 has not happened yet.',
        },
        {
          kind: 'code',
          caption: 'The right name, in the wrong order. Also deliberate.',
          code: 'print(count)\ncount = 5\n',
        },
        {
          kind: 'prose',
          body: 'Both programs raise the same type of error, and it is worth committing to memory because you will see it weekly: Python is telling you that the name on that line means nothing to it.\n\nThe fix is one of two things, and the error alone cannot tell you which. Either you spelled it differently from the line that created it, or you have not created it yet. Check the spelling first, since that is the commoner of the two and takes a second to rule out.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program reads `average = totla / count` and stops on that line saying the name `totla` is not defined. You look above and find a line reading `total = 240`. What happened, and what changes?',
          answer: 'The letters of `total` got swapped while typing. The line that stored the value used one spelling and the line that reads it uses another, so Python sees two unrelated names and has only ever been given one of them. Fix the spelling on the line that failed. The value was never lost; it was under the other label the whole time.',
        },
      ],
    },
  ],
};

export default lesson;
