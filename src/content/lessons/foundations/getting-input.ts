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
          body: 'Every program so far does the same thing every time it runs, because everything it works with is written into it. A program that can ask a question is a different kind of object: it works for the person using it rather than only for the person who wrote it.\n\n`input()` asks. Here is the whole idea in two lines. Somebody typed `Ada` when it ran.',
        },
        {
          kind: 'code',
          caption: 'The person typed Ada. That is why it appears in the output.',
          code: 'name = input("What is your name? ")\nprint("Hello,", name)\n',
          stdin: ['Ada'],
        },
        {
          kind: 'prose',
          body: 'Three things happened on line 1. The text inside the brackets, called the **prompt**, was shown so the person knows what is wanted. The program then stopped and waited, doing nothing at all, until a line was typed and Enter was pressed. And what was typed was handed back, where the assignment attached the name `name` to it.\n\nThe prompt is part of the output, which is why the question and the typed answer both appear above the greeting. That is what using the program looks like from the outside.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Leave a space at the end of the prompt',
          body: 'Writing `input("What is your name? ")` with a space before the closing quote keeps what the person types from butting straight up against the question mark. A small thing, and it is the difference between output that looks finished and output that does not.',
        },
      ],
    },
    {
      id: 'what-it-does',
      title: 'What input() hands back',
      blocks: [
        {
          kind: 'prose',
          body: '`input()` reads exactly one line: everything typed up to Enter, and not the Enter itself. The prompt is optional, and leaving it out means the program waits with nothing on the screen, which is confusing for whoever is sitting there.\n\nIn the shell you can see what comes back, because the shell shows the value of every line.',
        },
        {
          kind: 'shell',
          caption: 'Two questions, and the person typed blue both times.',
          stdin: ['blue', 'blue'],
          lines: [
            'input("Favourite colour? ")',
            'colour = input("And again? ")',
            'colour',
            'len(colour)',
          ],
        },
        {
          kind: 'prose',
          body: 'Look closely at what came back from that first line and at what `colour` holds. Both have quote marks around them, which the last lesson explained is how the shell shows text. That is not a detail. It is the single most important fact about `input()`, and it has the whole of the next section to itself.',
        },
      ],
    },
    {
      id: 'always-text',
      title: 'It is always text',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the rule, and there are no exceptions to it anywhere in Python:\n\n> `input()` hands back text. Always. However numeric what the person typed looks.\n\nIf they type `42`, you get the two characters four and two, not the number forty-two. If they type `3.5`, you get three characters. If they type nothing at all and press Enter, you get an empty piece of text. `input()` does not look at what was typed and decide.\n\nThe session below asks for an age, the person types `21`, and then we ask Python what it has.',
        },
        {
          kind: 'shell',
          caption: 'The person typed 21. The last line fails, on purpose.',
          stdin: ['21'],
          lines: [
            'age = input("Age? ")',
            'age',
            'type(age)',
            'age == 21',
            'age == "21"',
            'age + 1',
          ],
        },
        {
          kind: 'prose',
          body: 'Every line there is the same fact seen from a different angle. The value shows with quote marks. `type()` names it as text. Comparing it to the number `21` is `False` while comparing it to the text `"21"` is `True`. And adding a number to it raises the mixing error from the types lesson.\n\nNone of this is Python being awkward. It cannot know whether `007` is a number, a house number or the start of a password, so it hands you exactly the characters that were typed and lets you say what they are.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program asks for two numbers with `input()` and prints their sum with `print(a + b)`. Somebody types 2 and then 3, and what comes out is not 5. What happened?',
          answer: 'Every line did what it was told. Both names hold text, because that is what `input()` hands back, so `+` joined the two pieces of text end to end rather than adding numbers, exactly as it did in the types lesson. The fix is to convert both to numbers before adding, which is the next section. Notice there was no error at all: this is the kind of bug that gets past you.',
        },
      ],
    },
    {
      id: 'converting',
      title: 'Turning it into a number',
      blocks: [
        {
          kind: 'prose',
          body: 'You already have the tools. `int()` makes a whole number from text holding one, and `float()` makes a decimal number. The only new part is where to put them.',
        },
        {
          kind: 'shell',
          caption: 'The person typed 21 again.',
          stdin: ['21'],
          lines: [
            'age = input("Age? ")',
            'type(age)',
            'int(age) + 1',
            'age',
            'age = int(age)',
            'type(age)',
            'age + 1',
          ],
        },
        {
          kind: 'prose',
          body: 'Line 3 converted the text, added one, and showed the answer. Line 4 then shows `age` still holding text, because converting makes a new value and leaves the original where it was.\n\nLine 5 is what you usually want: convert, and attach the name to the converted value, so that from then on the name holds a number and you can stop thinking about it.',
        },
        {
          kind: 'prose',
          body: 'Because converting straight away is so common, it is normally written as one line, with the `input()` inside the `int()`. Read it from the inside out: the innermost brackets happen first.',
        },
        {
          kind: 'code',
          caption: 'The usual shape. The person typed 21.',
          code: 'age = int(input("Age? "))\nprint("Next year you will be", age + 1)\n',
          stdin: ['21'],
        },
        {
          kind: 'prose',
          body: 'Three steps on that first line, innermost first: ask and get text back, convert the text to a whole number, attach the name to the number. Counting the brackets is worth doing while you are new to it, because a missing closing bracket here is a common typo and gives an error about the *next* line, which is bewildering until you know to expect it.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Which conversion would you use for a price like 4.50, and which for a number of people?',
          answer: '`float()` for the price, because it has a decimal part and `int()` would refuse it. `int()` for the number of people, because there is no such thing as 2.5 people and a whole number makes that explicit. When you are unsure, `float()` accepts anything `int()` accepts and more, so it is the safer guess.',
        },
      ],
    },
    {
      id: 'when-it-fails',
      title: 'When the typing is not a number',
      blocks: [
        {
          kind: 'prose',
          body: 'You cannot control what somebody types. Ask for an age and you will eventually be given `twenty`, or `21 years`, or an empty line because they pressed Enter by mistake. `int()` cannot make a number out of any of those, so it stops and says so.\n\nThe session below is a tour of what converts and what does not. Several lines fail on purpose.',
        },
        {
          kind: 'shell',
          caption: 'Four of these raise an error. Two do not.',
          lines: [
            'int("21")',
            'int("hello")',
            'int("")',
            'int("21 years")',
            'int("3.5")',
            'float("3.5")',
          ],
        },
        {
          kind: 'prose',
          body: 'The last two are the pair to remember. `float()` is happy with text holding a decimal, and `int()` is not, even though `3.5` reads as a perfectly good number to you. `int()` accepts text holding a whole number and nothing else, because turning 3.5 into a whole number means deciding whether to round it, and Python will not decide that for you.\n\nIf you want a whole number from text like that, convert to a decimal first and then cut it down yourself.',
        },
        {
          kind: 'shell',
          caption: 'Getting a whole number out of decimal text.',
          lines: [
            'int(float("3.5"))',
            'int(float("3.9"))',
            'round(float("3.5"))',
            'round(float("3.9"))',
            'int(" 7 ")',
          ],
        },
        {
          kind: 'prose',
          body: 'Those first two show that `int()` on a decimal number does not round: it cuts off everything after the point and keeps the whole part. `round()` is the one that rounds. Choosing the wrong one gives you an answer that is one out, sometimes, which is a horrible bug to find.\n\nThe last line is a small kindness: spaces around the digits are ignored, so somebody who types a stray space before their number does not break your program.',
        },
        {
          kind: 'prose',
          body: 'Now the whole thing together, as it happens in a real program. Somebody was asked for a number and typed a word.',
        },
        {
          kind: 'code',
          caption: 'A deliberate failure. This is what your program does to a person who types the wrong thing.',
          code: 'age = int(input("Age? "))\nprint("Next year you will be", age + 1)\n',
          stdin: ['twenty'],
        },
        {
          kind: 'prose',
          body: 'Read what that message is telling you, because it is precise and it is helpful. It names the value it could not deal with, quote marks and all, so you can see exactly what arrived. And it stopped on the line with the conversion on it, not on the line that used the number, so the report points at where the bad value came in.\n\nA program that stops like this is not acceptable in something other people use, and handling it properly needs conditions and a way to catch errors, both of which come later. What matters now is recognising the error on sight and knowing that its cause is outside your program: somebody typed something the conversion could not take.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Name the two different errors you have seen in this lesson, and what distinguishes them.',
          answer: 'The first came from adding a number to text that `input()` handed back, which is a mismatch of *types*: the operation made no sense for the kinds of value involved. The second came from `int()` being given text of the right type but the wrong *content*, such as a word: the type was fine and the value inside it was impossible. That distinction is worth holding onto, because the first is always your mistake as the author and the second is usually the fault of what somebody typed.',
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
          caption: 'All four steps. The person typed 4.50 and then 3.',
          code: 'price = float(input("Price of one: "))\ncount = int(input("How many? "))\ntotal = price * count\nprint(f"{count} at {price:.2f} each comes to {total:.2f}")\n',
          stdin: ['4.50', '3'],
        },
        {
          kind: 'prose',
          body: 'Every idea in the foundations track is in those four lines: values with types, names attached to them, arithmetic, conversion, and output shaped for a person to read. It is a small program, and it is a real one.\n\nThe one habit worth carrying forward is this. Whenever a value comes into your program from outside it, the first question is what type it is, and the answer for anything typed by a person is text. Ask the question every time, and a whole category of confusing bugs never happens to you.',
        },
      ],
    },
  ],
};

export default lesson;
