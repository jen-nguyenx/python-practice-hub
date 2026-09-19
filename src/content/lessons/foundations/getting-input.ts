// Foundations: input(), the fact that it always hands back text, and converting safely.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'getting-input',
  title: 'Getting input',
  summary: 'Asking a person for something, and dealing with the fact that it always arrives as text',
  track: 'foundations',
  order: 6,
  minutes: 15,
  prereqs: ['values-and-types', 'showing-your-work'],
  outcomes: [
    'Ask a person for a value with `input()` and store what they typed',
    'Say what type `input()` hands back, whatever was typed',
    'Convert typed text to a number with `int()` or `float()`',
    'Recognise the error a conversion raises when the text is not a number',
    'Write the usual shape of a program that reads a number',
  ],
  sections: [
    {
      id: 'why-ask',
      title: 'A program that asks',
      blocks: [
        {
          kind: 'prose',
          body: 'Every program so far does the same thing every time it runs, because everything it works with is written into it. `input()` asks a question instead, so a program can work for whoever is using it, not only for the person who wrote it.',
        },
        {
          kind: 'code',
          caption: 'The person typed Ada. Three things happened on line 1: the prompt was shown, the program waited for Enter, and what was typed was handed back and attached to `name`. The prompt is part of the output, which is why the question and the typed answer both appear above the greeting.',
          code: 'name = input("What is your name? ")\nprint("Hello,", name)\n',
          stdin: ['Ada'],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Leave a space at the end of the prompt',
          body: 'Writing `input("What is your name? ")` with a space before the closing quote keeps what the person types from butting straight up against the question mark.',
        },
      ],
    },
    {
      id: 'what-it-does',
      title: 'What input() hands back',
      blocks: [
        {
          kind: 'prose',
          body: '`input()` reads exactly one line, up to Enter, and not the Enter itself. The prompt is optional, though leaving it out means the program waits with nothing on screen. In the shell you can see what comes back, quote marks and all, because the shell shows the value of every line.',
        },
        {
          kind: 'shell',
          caption: 'Two questions; the person typed blue both times.',
          stdin: ['blue', 'blue'],
          lines: [
            'input("Favourite colour? ")',
            'colour = input("And again? ")',
            'colour',
          ],
        },
        {
          kind: 'predict',
          ask: 'If `colour` holds "blue", what does this print?',
          code: 'colour = "blue"\nprint(len(colour))\n',
          choices: ['4', '5', 'blue'],
        },
      ],
    },
    {
      id: 'always-text',
      title: 'It is always text',
      blocks: [
        {
          kind: 'prose',
          body: 'The rule, with no exceptions anywhere in Python:\n\n> `input()` hands back text. Always. However numeric what the person typed looks.\n\nType `42` and you get the two characters four and two, not the number forty-two.',
        },
        {
          kind: 'shell',
          caption: 'The person typed 21. Every line here is the same fact from a different angle: the value shows with quote marks, `type()` names it as text, it equals the text `"21"` but not the number `21`, and adding a number to it raises the mixing error from the types lesson.',
          stdin: ['21'],
          lines: [
            'age = input("Age? ")',
            'type(age)',
            'age == 21',
            'age == "21"',
            'age + 1',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A program asks for two numbers with `input()` and prints their sum with `print(a + b)`. Somebody types 2 and then 3, and what comes out is not 5. What happened?',
          options: [
            { text: 'Both names hold text, so `+` joined the two pieces of text end to end instead of adding numbers', correct: true, why: 'This is the kind of bug that gets past you: there is no error at all, just a wrong answer.' },
            { text: '`input()` cannot read numbers, only words', why: '`input()` reads whatever is typed just fine. The issue is that what it hands back is always text, digits included, until you convert it.' },
            { text: 'The program crashed before printing anything', why: 'It ran to completion and printed something; it is just not the sum you expected, because `+` joined text rather than adding numbers.' },
            { text: '`a` and `b` were never given values', why: 'They were: `input()` handed each of them the typed text. The problem is the type of what they hold, not whether they hold anything.' },
          ],
        },
      ],
    },
    {
      id: 'converting',
      title: 'Turning it into a number',
      blocks: [
        {
          kind: 'prose',
          body: '`int()` makes a whole number from text holding one, and `float()` makes a decimal number. Converting makes a new value and leaves the original text where it was, so the usual pattern attaches the name to the converted result.',
        },
        {
          kind: 'shell',
          caption: 'The person typed 21. Line 3 converts and adds without changing `age`; line 5 converts and re-attaches the name, so from then on it holds a number.',
          stdin: ['21'],
          lines: [
            'age = input("Age? ")',
            'int(age) + 1',
            'age',
            'age = int(age)',
            'type(age)',
          ],
        },
        {
          kind: 'code',
          caption: 'Because converting immediately is so common, it is usually written as one line, `input()` inside `int()`. Read it inside out: ask and get text, convert to a whole number, attach the name.',
          code: 'age = int(input("Age? "))\nprint("Next year you will be", age + 1)\n',
          stdin: ['21'],
        },
        {
          kind: 'quiz',
          prompt: 'Which conversion would you use for a price like 4.50, and which for a number of people?',
          options: [
            { text: '`float()` for the price, `int()` for the number of people', correct: true, why: 'The price has a decimal part, which `int()` would refuse. There is no such thing as 2.5 people, so a whole number makes that explicit.' },
            { text: '`int()` for both', why: '`int()` refuses text holding a decimal point outright, so this fails on the price.' },
            { text: '`float()` for both', why: 'This works without error, but a count of people as `2.5` hides a mistake that `int()` would have caught.' },
            { text: '`str()` for both, then compare the text', why: '`str()` makes text, not a number, and you cannot do arithmetic on text without converting it back.' },
          ],
        },
      ],
    },
    {
      id: 'when-it-fails',
      title: 'When the typing is not a number',
      blocks: [
        {
          kind: 'prose',
          body: "You cannot control what somebody types: `twenty`, `21 years`, or an empty line. `int()` cannot make a number out of any of those and stops with an error. `float()` and `int()` are the pair to remember: `float()` accepts text holding a decimal, `int()` does not, even though `3.5` reads as a perfectly good number to you, because turning it into a whole number means deciding whether to round, and Python will not decide that for you.",
        },
        {
          kind: 'shell',
          caption: 'Four of these raise an error. `int("3.5")` fails; `float("3.5")` does not.',
          lines: [
            'int("21")',
            'int("hello")',
            'int("3.5")',
            'float("3.5")',
          ],
        },
        {
          kind: 'shell',
          caption: 'To get a whole number out of decimal text, convert to a decimal first and cut it down yourself. `int()` on a decimal does not round, it cuts off everything after the point; `round()` is the one that rounds. Spaces around digits are ignored.',
          lines: [
            'int(float("3.5"))',
            'round(float("3.5"))',
            'int(" 7 ")',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'typed-vs-converted',
            title: 'What was typed, and what int() does with it',
            intro: 'Pick what somebody typed into the age box, and watch where `int()` draws the line between a number and everything else.',
            template: 'typed = "⟦typed⟧"\nprint("The age box holds:", typed)\nage = int(typed)\nprint("As a number:", age)\n',
            knobs: [
              {
                id: 'typed',
                label: 'somebody typed',
                choices: [
                  { value: '21', caption: '"21"' },
                  { value: '3.5', caption: '"3.5"' },
                  { value: 'hello', caption: '"hello"' },
                ],
              },
            ],
            notes: {
              '0': '21 is nothing but digits, so `int()` accepts it outright and hands back the whole number 21. Nothing goes wrong.',
              '1': '3.5 has a decimal point in it. `int()` will not round it and will not cut it for you, because text holding a decimal is not text holding a whole number. It stops with a `ValueError`, right on the line with the conversion.',
              '2': 'hello has no digits in it at all. Same error, same reason: `int()` only accepts text that is entirely a whole number.',
            },
            takeaway: '`int()` converts text only when the text is nothing but a whole number. A decimal point, a word, anything else at all, and it raises `ValueError` at the exact line doing the converting, never later where the number gets used.',
          },
        },
        {
          kind: 'code',
          caption: 'The whole thing, as it happens in a real program: asked for a number, given a word. Read the message: it names the value it could not deal with, and it stops on the line with the conversion, not on the line that used the number.',
          code: 'age = int(input("Age? "))\nprint("Next year you will be", age + 1)\n',
          stdin: ['twenty'],
        },
        {
          kind: 'quiz',
          prompt: 'Name the two different errors you have met with converted input, and what distinguishes them.',
          options: [
            { text: 'Adding a number to un-converted text is a mismatch of type; converting a word with `int()` is the right type but impossible content', correct: true, why: 'The first is always the fault of the program, forgetting to convert; the second is usually the fault of what somebody typed.' },
            { text: 'Both errors are the same `TypeError`, just triggered differently', why: 'They are different error types: adding text to a number raises `TypeError`, and `int()` failing on impossible text raises `ValueError`.' },
            { text: 'One happens only in the shell, the other only in a program', why: 'Both happen the same way in either place. The shell and a program file run the same Python.' },
            { text: 'They are both caused by a missing `print()`', why: 'Neither is about output at all. One is a type mismatch on `+`, the other is `int()` given text it cannot parse as a whole number.' },
          ],
        },
      ],
    },
    {
      id: 'a-whole-program',
      title: 'Putting it together',
      blocks: [
        {
          kind: 'prose',
          body: 'Almost every program that asks for something follows the same four steps.',
        },
        {
          kind: 'steps',
          title: 'The usual shape',
          items: [
            'Ask, with a prompt that says what you want and ends in a space.',
            'Convert, with `int()` or `float()`, unless what you want really is text.',
            'Work out whatever the program is for, using the converted numbers.',
            'Show the result, with commas or an f-string, rounded if it is a decimal.',
          ],
        },
        {
          kind: 'code',
          caption: 'All four steps. The person typed 4.50 and then 3. Every idea in this track is in these four lines: values with types, names, arithmetic, conversion, output shaped for a person to read.',
          code: 'price = float(input("Price of one: "))\ncount = int(input("How many? "))\ntotal = price * count\nprint(f"{count} at {price:.2f} each comes to {total:.2f}")\n',
          stdin: ['4.50', '3'],
        },
        {
          kind: 'order',
          ask: 'The same shape, with the two answers already typed in as `4.50` and `3` instead of asked for. Drag these four lines into an order that works.',
          lines: [
            { text: 'price = 4.50', indent: 0 },
            { text: 'count = 3', indent: 0 },
            { text: 'total = price * count', indent: 0 },
            { text: 'print(f"{count} at {price:.2f} each comes to {total:.2f}")', indent: 0 },
          ],
        },
      ],
    },
  ],
};

export default lesson;
