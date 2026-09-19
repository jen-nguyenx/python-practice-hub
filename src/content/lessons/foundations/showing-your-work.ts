// Foundations: print, commas, f-strings, rounding for display, and value-exists vs value-shown.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'showing-your-work',
  title: 'Showing your work',
  summary: 'How to get what your program knows onto the screen, in a shape a person can read',
  track: 'foundations',
  order: 5,
  minutes: 15,
  prereqs: ['variables-and-names'],
  outcomes: [
    'Explain why a value can exist without ever appearing',
    'Print several values on one line and control what goes between them',
    'Build a line of text from values with an f-string',
    'Round a number for display without changing what is stored',
    'Work out why a program printed nothing',
  ],
  sections: [
    {
      id: 'existing-and-showing',
      title: 'Existing and being shown',
      blocks: [
        {
          kind: 'prose',
          body: 'A program can work out a great deal and show you none of it. Below, both lines work out a number, and only one reaches the screen.',
        },
        {
          kind: 'code',
          caption: 'Python worked out `3 + 4`, found nothing waiting for the answer, and dropped it. Existing and being shown are separate events; `print()` is the only thing that makes the second one happen.',
          code: '3 + 4\nprint(10 + 5)\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Why the shell is not lying to you',
          body: 'The shell is a conversation, so it answers every line. A program is a set of instructions written in advance, so it says only what you told it to say. Both are Python; they differ in what they do with a value nobody asked for.',
        },
      ],
    },
    {
      id: 'one-value',
      title: 'Printing one thing',
      blocks: [
        {
          kind: 'predict',
          ask: 'Put a value between the brackets of `print()`, and it appears. A name is looked up like any other name; quote marks around a word mean take it literally. What does this print, line by line?',
          code: 'name = "Sam"\nprint("Hello")\nprint(name)\nprint(7 * 6)\nprint("name")\n',
        },
        {
          kind: 'shell',
          caption: 'The shell shows text with quote marks, as a Python programmer would write it. `print()` shows it as a reader would want it, with the quote marks off. Neither is more correct; they answer different questions.',
          lines: [
            'greeting = "Hello"',
            'greeting',
            'print(greeting)',
          ],
        },
      ],
    },
    {
      id: 'several-values',
      title: 'Several things on one line',
      blocks: [
        {
          kind: 'prose',
          body: 'Give `print()` several things separated by commas, and each one is shown in turn. Each comma puts one space between the pieces, whether or not you typed one; use `sep=` for anything else. `print()` with nothing inside prints a blank line.',
        },
        {
          kind: 'shell',
          caption: 'Commas, and what goes between the pieces.',
          lines: [
            'print("Total:", 42)',
            'print(1, 2, 3, sep=" - ")',
            'print("a", "b", sep="")',
          ],
        },
        {
          kind: 'code',
          caption: 'Commas handle each piece separately, so text and numbers mix freely. Joining them with `+` instead asks Python to add text to a number, which it refuses. Deliberate error.',
          code: 'total = 42\nprint("Total: " + total)\n',
        },
        {
          kind: 'code',
          caption: 'The same output, reached two ways: a comma instead of `+`, or converting the number to text first with `str()`.',
          code: 'total = 42\nprint("Total:", total)\nprint("Total: " + str(total))\n',
        },
        {
          kind: 'quiz',
          prompt: 'Why does `print("Total: " + total)` fail while `print("Total:", total)` works, when `total` holds a number in both?',
          options: [
            { text: '`+` asks Python to join text and a number, which it refuses; the comma hands `print()` two separate items and shows each in turn', correct: true, why: 'The comma works for a value of any type, because it never has to decide between joining and adding.' },
            { text: '`total` is a different type in the two lines', why: '`total` holds the same number both times. It is the operator, `+` versus a comma, that differs.' },
            { text: '`print()` can only take one argument at a time', why: '`print()` happily takes several items separated by commas, as the working line shows.' },
            { text: 'Both actually work; the first just looks different', why: 'The first raises a `TypeError` and stops the program. It does not run at all.' },
          ],
        },
      ],
    },
    {
      id: 'f-strings',
      title: 'Building a line with an f-string',
      blocks: [
        {
          kind: 'prose',
          body: 'Put the letter `f` immediately before the opening quote mark, and anything inside curly brackets `{}` is worked out and dropped into the text. This is an **f-string**. Everything outside the brackets is taken literally; everything inside is worked out first.',
        },
        {
          kind: 'shell',
          caption: 'Values dropped into a piece of text. An f-string is still text, so it needs `print()` around it in a program, like any other value.',
          lines: [
            'name = "Sam"',
            'score = 87',
            'print(f"{name} scored {score}.")',
            'print(f"Twice {score} is {score * 2}")',
          ],
        },
        {
          kind: 'compare',
          caption: 'One letter apart. Without the `f`, curly brackets stop meaning anything and become ordinary characters; the left side prints them literally rather than raising an error.',
          left: { label: 'Without the f', code: 'name = "Sam"\nprint("Hello, {name}")\n', bad: true },
          right: { label: 'With the f', code: 'name = "Sam"\nprint(f"Hello, {name}")\n' },
        },
        {
          kind: 'quiz',
          prompt: 'If `name = "Sam"`, what does `print("Hello, {name}")` show?',
          options: [
            { text: 'Hello, {name}', correct: true, why: 'With no `f`, the curly brackets are just characters. Nothing is worked out.' },
            { text: 'Hello, Sam', why: "That's what the `f` version gives. Without it, the braces are not evaluated at all." },
            { text: 'A NameError', why: 'Without an `f`, Python never looks inside the string for a name to look up, so nothing fails.' },
            { text: 'A SyntaxError', why: 'A piece of text with curly brackets in it is completely valid Python; it just is not treated as a template unless it starts with `f`.' },
          ],
        },
      ],
    },
    {
      id: 'rounding',
      title: 'Rounding for display',
      blocks: [
        {
          kind: 'prose',
          body: '`round(value, places)` works out a **new, shorter number**. An f-string can instead shorten a number only where it is shown, with `:.2f` inside the curly brackets, meaning "two places, decimal". Neither one changes the value under the name: keep the full number for arithmetic, and shorten it only where a person is about to read it.',
        },
        {
          kind: 'shell',
          caption: 'Shortening a number two ways. `price` is unchanged after both.',
          lines: [
            'price = 2 / 3',
            'round(price, 2)',
            'f"{price:.2f}"',
            'price',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'places-shown',
            title: 'How many places to show',
            intro: 'Pick a value, then drag **places**. The middle line is what a reader sees. The line under it asks Python what is still stored.',
            template: 'price = ⟦value⟧\nprint("stored:", price)\nprint("shown: ", f"{price:.⟦places⟧f}")\nprint("stored, still:", price)\n',
            knobs: [
              {
                id: 'value',
                label: 'the value',
                choices: [
                  { value: '2 / 3', caption: 'two thirds' },
                  { value: '1234.5678', caption: 'a big one' },
                  { value: '2.5', caption: 'exactly a half' },
                  { value: '0.1 + 0.2', caption: 'a tenth plus two tenths' },
                ],
              },
              { id: 'places', kind: 'range', label: 'places', min: 0, max: 6, start: 2 },
            ],
            notes: {
              '0-2': 'Two places is the usual choice for money. Notice the last line: the stored value still runs to as many digits as it ever did.',
              '0-0': 'Zero places rounds all the way to a whole number for showing, and the stored value is untouched underneath it. Nothing has been lost, only hidden.',
              '2-0': 'Exactly a half, shown to zero places, does not go up. That is not a typo and not a bug; the next part of this section explains which way halves go.',
              '1-0': 'The big number is rounded rather than chopped, so the digit before the point changes. Shortening for display still looks at what it is throwing away.',
              '3-2': 'Look at the stored line. A tenth plus two tenths is not quite three tenths, because decimals are kept in binary and some of them do not fit exactly. Shown to two places it reads as you expect, which is one reason to shorten only at the last moment.',
            },
            takeaway: 'An f-string format like `:.2f` changes what is shown and nothing else. The value under the name keeps every digit it had, which is what you want: do the arithmetic with the full number, and shorten it once, where a person is about to read it.',
          },
        },
        {
          kind: 'shell',
          caption: 'One detail of `round()` is not a bug: it rounds a number sitting exactly halfway towards the even one of its two neighbours, rather than always upward.',
          lines: [
            'round(2.5)',
            'round(3.5)',
            'round(4.5)',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A program works out `total = 10 / 3` and prints it with `print(f"{total:.2f}")`. Is `total` now a two-decimal number?',
          options: [
            { text: 'No, `total` still holds the full decimal', correct: true, why: 'The f-string made a piece of text for showing. The value under the name is untouched, and any later arithmetic uses the full number.' },
            { text: 'Yes, printing it that way rounds it in place', why: 'Nothing about printing changes a stored value. If you want the rounded number kept, you have to assign it back yourself: `total = round(total, 2)`.' },
            { text: 'Only if `total` is used again later in the program', why: 'Whether it is used again makes no difference. The value under the name never changes just from being printed.' },
            { text: "It becomes two decimals the first time, then reverts", why: 'Values do not change and then revert on their own. `total` simply never changes here.' },
          ],
        },
      ],
    },
    {
      id: 'nothing-appeared',
      title: 'When nothing appears',
      blocks: [
        {
          kind: 'prose',
          body: 'If a program runs cleanly and shows nothing, or shows the wrong nothing, it is nearly always one of three things. **You never asked**: a calculation with no `print()` is worked out and dropped. **You asked before it happened**: a `print()` above the line that works the value out shows old state or fails outright. **You printed the wrong thing**: `print("total")` shows a word, `print(total)` shows a value, and both run without complaint.',
        },
        {
          kind: 'shell',
          caption: "There is a fourth, subtler one. `print()` shows a value but does not hand one back: storing its result gives `None`, Python's word for \"nothing here\". Line 2 shows nothing because the shell does not display `None` on its own; only an explicit `print()` reveals it.",
          lines: [
            'x = print("hello")',
            'x',
            'print(x)',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A program is meant to show a total and shows nothing at all, with no error. Where do you look first?',
          options: [
            { text: 'For a missing `print()` around the calculation', correct: true, why: 'A calculation on a line by itself runs perfectly and shows nothing, which is exactly the symptom.' },
            { text: 'For a syntax error', why: 'A syntax error stops the whole file from running at all and is reported loudly. This is a program that runs cleanly.' },
            { text: 'For a `NameError`', why: 'A `NameError` stops the program with a message. Silence with no error points somewhere else: a missing `print()`.' },
            { text: 'Nowhere; a program with no errors always produces output', why: 'A program can work out any amount and show none of it. Running without error says nothing about whether anything was printed.' },
          ],
        },
      ],
    },
  ],
};

export default lesson;
