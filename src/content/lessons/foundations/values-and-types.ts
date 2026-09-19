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
          body: 'More beginner programs break for this one reason than for any other, so this lesson is worth reading slowly even though the idea in it is small.\n\nHere is the problem in three characters. The program below adds one to something that looks exactly like the number twenty-one. It stops with an error. That is on purpose.',
        },
        {
          kind: 'code',
          caption: 'This raises an error deliberately. Read the last line of the message.',
          code: 'print("21" + 1)\n',
        },
        {
          kind: 'prose',
          body: 'Python is not being difficult. `"21"` and `21` are genuinely different things to it, in the same way that a photograph of a key is not a key. By the end of this lesson that message will look reasonable to you, which is the whole point: an error you understand is a small delay, and an error you do not understand is an afternoon.',
        },
      ],
    },
    {
      id: 'numbers',
      title: 'Numbers',
      blocks: [
        {
          kind: 'prose',
          body: 'A **value** is a single piece of information: a number, a word, an answer to a yes-or-no question. Values are what your programs push around, and everything else is machinery for pushing them.\n\nPython keeps two kinds of number apart. A **whole number**, written with no decimal point. And a **decimal number**, written with one.',
        },
        {
          kind: 'shell',
          caption: 'Numbers, and some arithmetic on them.',
          lines: [
            '12',
            '12 + 30',
            '3.5',
            '3.5 + 1',
            '2.0',
            '10 / 4',
          ],
        },
        {
          kind: 'prose',
          body: 'Two things there are worth noticing now and will be explained in full later.\n\n`2.0` came back with its `.0` still attached. To you and me that is the number two; to Python it is a decimal number that happens to land on a whole value, and it stays written as a decimal.\n\nAnd `10 / 4` gave a decimal answer, which you expected. What you might not expect is that division gives a decimal answer *even when it divides evenly*. There is a lesson on arithmetic that shows this properly.',
        },
        {
          kind: 'prose',
          body: 'Python has short names for these two kinds. A whole number is an **int**, short for integer. A decimal number is a **float**, which is short for floating point and is an odd name for a very ordinary thing. You will see both words in error messages constantly, so it is worth learning them now rather than being surprised by them later.',
        },
      ],
    },
    {
      id: 'text',
      title: 'Text',
      blocks: [
        {
          kind: 'prose',
          body: 'Anything written between quote marks is **text**: a name, a sentence, a postcode, a single letter, or nothing at all. Python calls a piece of text a **string**, because it is a string of characters one after another. Its short name is **str**.\n\nYou can use single or double quote marks. Python does not mind which, as long as the pair match.',
        },
        {
          kind: 'shell',
          caption: 'Text, and a few things you can do to it.',
          lines: [
            '"hello"',
            "'hello'",
            '"hello" + " there"',
            '"ha" * 3',
            'len("hello")',
            'print("hello")',
          ],
        },
        {
          kind: 'prose',
          body: 'Some of that is worth unpacking.\n\n`+` between two pieces of text does not add anything. It **joins** them, end to end, with nothing in between: notice that the space in the result came from the space inside the second piece of text, not from Python being tidy.\n\n`*` with a number repeats the text that many times, which is more useful than it sounds for drawing lines and lining things up.\n\n`len()` gives the number of characters.\n\nAnd the last line is the important one. When Python *shows you a value* in the shell, it puts quote marks around text so you can see where it starts and ends. When `print()` shows it, the quote marks are gone. The quotes were never part of the text. They are how you tell Python where the text begins and ends when you write it down.',
        },
      ],
    },
    {
      id: 'true-false',
      title: 'True and False',
      blocks: [
        {
          kind: 'prose',
          body: 'The third kind of value is the simplest: there are only two of them, `True` and `False`, and they are the answer to a yes-or-no question. Python calls this kind a **bool**, after George Boole, a mathematician who worked out the logic of such things long before computers existed.\n\nYou will meet them properly when you start making decisions in code. For now, meet them at all. Note the capital letters, and note that they have no quote marks: `True` is the value, and `"True"` would be a five-letter piece of text.',
        },
        {
          kind: 'shell',
          caption: 'Comparisons produce True or False. Two equals signs asks "are these the same?".',
          lines: [
            'True',
            'False',
            '5 > 3',
            '5 < 3',
            '10 == 10',
            '"cat" == "Cat"',
            '"cat" == "cat"',
          ],
        },
        {
          kind: 'prose',
          body: 'The last two are a warning in advance. Comparing text is exact and fussy: a capital letter is a different character from a small one, and a trailing space is a character too. Python does not decide that two pieces of text are close enough.',
        },
      ],
    },
    {
      id: 'asking-the-type',
      title: 'Asking what something is',
      blocks: [
        {
          kind: 'prose',
          body: 'Every value in Python has a **type**: the kind of thing it is. The type is what decides which operations make sense on it, which is why the type is usually the first thing to check when something behaves strangely.\n\nYou never have to guess. `type()` answers directly, and it is one of the most useful things you can type while you are stuck.',
        },
        {
          kind: 'shell',
          caption: 'Four different values, and one that is not what it looks like.',
          lines: [
            'type(12)',
            'type(3.5)',
            'type("hello")',
            'type(True)',
            'type("12")',
          ],
        },
        {
          kind: 'prose',
          body: 'Python answers with the word `class` and then the type name, which is a piece of vocabulary you can ignore for now; the part that matters is the short name at the end. Those are the four you will meet first: `int`, `float`, `str`, `bool`.\n\nLook at the last two lines again. `type(12)` and `type("12")` gave different answers, and the only difference between them is a pair of quote marks. That is the whole of the next section.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Without running it, what type is `"3.5"`? And what type is `3.5`?',
          answer: 'The first is `str` and the second is `float`. The quote marks decide it, not the characters inside them. Text that is made entirely of digits, dots and minus signs is still text, and Python will not quietly treat it as a number because it looks like one.',
        },
      ],
    },
    {
      id: 'five-and-five',
      title: '5 is not "5"',
      blocks: [
        {
          kind: 'prose',
          body: 'The two programs below look nearly identical, and they do genuinely different things. Read the output of each before reading on.',
        },
        {
          kind: 'compare',
          caption: 'The same digits, with and without quote marks.',
          left: { label: 'Text that looks like numbers', code: 'print("5" + "3")\n' },
          right: { label: 'Actual numbers', code: 'print(5 + 3)\n' },
        },
        {
          kind: 'prose',
          body: 'On the left, `+` joined two pieces of text end to end, because that is what `+` means for text. On the right, `+` added two numbers, because that is what `+` means for numbers.\n\nNothing went wrong on the left. It obeyed the rule for the type it was given. This is why type matters more than it first seems: the *same symbol* does a different job depending on what is either side of it, so if you are wrong about the type, you are wrong about what your program does, and often with no error at all to warn you.',
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
          body: 'So `+` joins text and `+` adds numbers. What happens when there is one of each? Python refuses, rather than guessing, and the refusal is the error from the start of this lesson. The session below raises it on purpose and then fixes it two different ways.',
        },
        {
          kind: 'shell',
          caption: 'Lines 1 and 2 fail on purpose. The rest show the two ways out.',
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
          kind: 'prose',
          body: 'Python could have picked one and carried on, and languages that do this exist. They are harder to work in, because the day it guesses wrong is the day you get a wrong answer with nothing to show you where it came from. Refusing is the kinder behaviour.\n\nThe way out is to **convert**: say which kind you want.\n\n- `int()` makes a whole number from text that holds one.\n- `float()` makes a decimal number.\n- `str()` makes text from a number.\n\nAnd the last line shows the one mixture Python does allow: a whole number and a decimal number together. Both are numbers, so it works out an answer and gives it to you as a decimal.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Converting makes a new value',
          body: '`int("5")` does not change `"5"` into a number. Nothing in Python changes a value in place like that. It works out a new value and hands it back, and if you do not store or use it, it is thrown away exactly like any other unused answer.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You have the text `"7"` and the number `2`, and you want the result `9`. What do you write?',
          answer: '`int("7") + 2`. Convert the text to a number first, then add. Writing `"7" + 2` raises the error you saw above. Writing `"7" + "2"` is worse: `+` joins text rather than adding it, as the comparison earlier showed, so you get the digits stuck together and nothing stops to tell you the answer is wrong.',
        },
        {
          kind: 'prose',
          body: 'This matters far beyond these examples, because everything a program reads from the outside world arrives as text. What somebody types, what is in a file, what comes back from a website: text, every time, however numeric it looks. Knowing that, and converting on purpose, is most of what keeps real programs working.',
        },
      ],
    },
  ],
};

export default lesson;
