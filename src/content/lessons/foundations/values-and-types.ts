// Foundations: values, the types they have, and why 5 and "5" are different things.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'values-and-types',
  title: 'Values and types',
  summary: 'Every value is a kind of thing, and the kind decides what you can do with it',
  track: 'foundations',
  order: 2,
  minutes: 15,
  prereqs: ['what-a-program-is'],
  outcomes: [
    'Name the four kinds of value you meet first',
    'Explain why `5` and `"5"` are not the same thing',
    'Use `type()` to find out what a value is',
    'Recognise the error that comes from mixing text and numbers',
    'Convert between text and numbers with `int()`, `float()` and `str()`',
  ],
  sections: [
    {
      id: 'why-it-matters',
      title: 'Why this one matters',
      blocks: [
        {
          kind: 'prose',
          body: 'More beginner programs break for this one reason than for any other. The program below adds one to something that looks exactly like the number twenty-one, and stops with an error, on purpose.',
        },
        {
          kind: 'code',
          caption: 'This raises an error deliberately. `"21"` and `21` are genuinely different things to Python, the way a photograph of a key is not a key. By the end of this lesson, that message will look reasonable.',
          code: 'print("21" + 1)\n',
        },
      ],
    },
    {
      id: 'numbers',
      title: 'Numbers',
      blocks: [
        {
          kind: 'prose',
          body: 'A **value** is a single piece of information: a number, a word, an answer to a yes-or-no question. Python keeps two kinds of number apart: a **whole number**, written with no decimal point, and a **decimal number**, written with one. Their short names, which you will see in error messages constantly, are **int** and **float**.',
        },
        {
          kind: 'shell',
          caption: 'Numbers, and some arithmetic on them. Notice that `2.0` keeps its `.0`, and that `10 / 4` gives a decimal even though it is not something you asked to round.',
          lines: [
            '12',
            '12 + 30',
            '3.5',
            '3.5 + 1',
            '2.0',
            '10 / 4',
          ],
        },
      ],
    },
    {
      id: 'text',
      title: 'Text',
      blocks: [
        {
          kind: 'prose',
          body: 'Anything between quote marks is **text**, called a **string** (short name **str**) because it is a string of characters. Single or double quotes both work, as long as the pair match.',
        },
        {
          kind: 'shell',
          caption: 'Text, and a few things you can do to it. `+` joins two pieces of text end to end; `len()` gives the number of characters.',
          lines: [
            '"hello"',
            "'hello'",
            '"hello" + " there"',
            'len("hello")',
            'print("hello")',
          ],
        },
        {
          kind: 'predict',
          ask: '`*` between text and a number repeats the text that many times. What does this print?',
          code: 'print("ha" * 3)\n',
          choices: ['hahaha', 'ha3', '9'],
        },
      ],
    },
    {
      id: 'true-false',
      title: 'True and False',
      blocks: [
        {
          kind: 'prose',
          body: 'The third kind of value is the simplest: there are only two of them, `True` and `False`, the answer to a yes-or-no question. Python calls this kind a **bool**. Note the capital letters and the absence of quote marks: `"True"` would be a five-letter piece of text, not the value.',
        },
        {
          kind: 'shell',
          caption: 'Comparisons produce True or False. Two equals signs asks "are these the same?".',
          lines: [
            '5 > 3',
            '5 < 3',
            '10 == 10',
            '"cat" == "Cat"',
            '"cat" == "cat"',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which of these is `True`?',
          options: [
            { text: '`"cat" == "cat"`', correct: true, why: 'Comparing text is exact. Every character matches, so the two are the same.' },
            { text: '`"cat" == "Cat"`', why: 'A capital letter is a different character from a small one. Python does not decide the two are close enough.' },
            { text: '`"cat" == "cat "`', why: 'A trailing space is a character too. Two pieces of text that differ by even one space are not equal.' },
            { text: '`"5" == 5`', why: 'One side is text and the other is a number. They are different types, so they are never the same value.' },
          ],
        },
      ],
    },
    {
      id: 'asking-the-type',
      title: 'Asking what something is',
      blocks: [
        {
          kind: 'prose',
          body: 'Every value has a **type**: the kind of thing it is, which decides which operations make sense on it. You never have to guess. `type()` answers directly, and is one of the most useful things to type when something behaves strangely.',
        },
        {
          kind: 'shell',
          caption: 'Four different values, and one that is not what it looks like. Python answers with the word `class` and then the short name: `int`, `float`, `str`, `bool`.',
          lines: [
            'type(12)',
            'type(3.5)',
            'type("hello")',
            'type(True)',
            'type("12")',
          ],
        },
        {
          kind: 'match',
          ask: 'Match each kind of value to its short name.',
          pairs: [
            { left: 'A whole number', right: 'int' },
            { left: 'A decimal number', right: 'float' },
            { left: 'A piece of text', right: 'str' },
            { left: 'True or False', right: 'bool' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Without running it: what type is `"3.5"`, and what type is `3.5`?',
          options: [
            { text: '`"3.5"` is `str`, `3.5` is `float`', correct: true, why: 'The quote marks decide it, not the characters inside them. Text made entirely of digits and a dot is still text.' },
            { text: 'Both are `float`', why: 'Python does not look inside text to see whether it looks numeric. Quote marks always mean text, whatever is between them.' },
            { text: 'Both are `str`', why: '`3.5` with no quote marks is a calculation-ready number to Python, not text.' },
            { text: '`"3.5"` is `float`, `3.5` is `str`', why: "That's the two swapped. Quote marks make text; their absence, on a value that looks numeric, makes a number." },
          ],
        },
      ],
    },
    {
      id: 'five-and-five',
      title: '5 is not "5"',
      blocks: [
        {
          kind: 'prose',
          body: 'The two programs below look nearly identical and do genuinely different things.',
        },
        {
          kind: 'compare',
          caption: 'On the left, `+` joins two pieces of text end to end, because that is what `+` means for text. On the right, `+` adds two numbers. Same symbol, different job, depending on the type either side of it.',
          left: { label: 'Text that looks like numbers', code: 'print("5" + "3")\n' },
          right: { label: 'Actual numbers', code: 'print(5 + 3)\n' },
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'same-symbol-different-job',
            title: 'One symbol, four kinds of value',
            intro: 'Pick a value on the top row and an operation on the bottom row. The symbol never changes. What it does changes completely.',
            template: 'value = ⟦value⟧\nprint("the type is", type(value))\nprint("the answer is", value ⟦operation⟧)\n',
            knobs: [
              {
                id: 'value',
                label: 'the value',
                choices: [
                  { value: '5', caption: 'the number 5' },
                  { value: '"5"', caption: 'the text "5"' },
                  { value: '5.0', caption: 'the decimal 5.0' },
                  { value: 'True', caption: 'True' },
                ],
              },
              {
                id: 'operation',
                label: 'what to do with it',
                choices: [
                  { value: '+ 3', caption: 'add 3' },
                  { value: '* 3', caption: 'times 3' },
                  { value: '== 5', caption: 'is it equal to 5?' },
                ],
              },
            ],
            notes: {
              '0-0': 'Two numbers, added. This is the one everybody expects, and it is worth having on screen while you look at the others.',
              '1-0': 'Text and a number. Python will not choose between joining and adding, so it stops. The type line above the error already told you why: the value is text, whatever it looks like.',
              '1-1': 'No error, and no arithmetic either. For text, `*` repeats, so three copies come back stuck together. This is the dangerous kind: a wrong answer that nothing stops to warn you about.',
              '2-0': 'A decimal and a whole number mix happily, and the answer comes back as a decimal. Once a float is involved, the result is a float.',
              '3-0': 'Adding to `True` gives an answer, which surprises most people. When a number is wanted, Python counts `True` as 1 and `False` as 0.',
              '1-2': 'Text compared to a number is `False`, not an error. Two values of different types are simply not the same value.',
              '2-2': 'The decimal 5.0 and the whole number 5 compare as equal. They are different types standing for the same amount, and `==` asks about the amount.',
            },
            takeaway: 'The symbol you type does not decide what happens. The type of the value either side of it does. Before predicting what a line will do, ask what type each part is.',
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The quiet one',
          body: 'An error stops your program and tells you where. A wrong answer with no error does not. Text joined instead of added is the classic example, and it is why checking types early is a habit worth building.',
        },
      ],
    },
    {
      id: 'mixing-and-converting',
      title: 'Mixing them, and converting',
      blocks: [
        {
          kind: 'prose',
          body: 'What happens when there is one piece of text and one number? Python refuses rather than guessing, which is the error from the start of this lesson. The way out is to **convert**: `int()` makes a whole number from text that holds one, `float()` makes a decimal number, and `str()` makes text from a number.',
        },
        {
          kind: 'shell',
          caption: 'The first two lines fail on purpose. The rest show the two ways out, plus the one mixture Python does allow: a whole number and a decimal number together, which gives a decimal.',
          lines: [
            '"5" + 3',
            '5 + "3"',
            'int("5") + 3',
            '5 + int("3")',
            '"5" + str(3)',
            '5 + 3.0',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Converting makes a new value',
          body: '`int("5")` does not change `"5"` into a number. It works out a new value and hands it back; if you do not store or use it, it is thrown away like any other unused answer.',
        },
        {
          kind: 'quiz',
          prompt: 'You have the text `"7"` and the number `2`, and you want the result `9`. What do you write?',
          options: [
            { text: '`int("7") + 2`', correct: true, why: 'Convert the text to a number first, then add.' },
            { text: '`"7" + 2`', why: 'This raises the mixing error: one side is text and one is a number, and Python refuses to guess.' },
            { text: '`"7" + "2"`', why: '`+` joins text rather than adding it, so this gives the two characters stuck together, not the number nine, and nothing stops to warn you.' },
            { text: '`str(7) + 2`', why: 'This makes both the wrong type: now `7` is text and still needs to be added to a number, so it fails the same way as `"7" + 2`.' },
          ],
        },
      ],
    },
  ],
};

export default lesson;
