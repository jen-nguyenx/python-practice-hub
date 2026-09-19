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
          body: 'A program can work out a great deal and show you none of it, and this is the source of a particular kind of misery: the program runs, there are no errors, and the screen stays empty.\n\nThe two lines below both work out a number. Only one of them reaches the screen.',
        },
        {
          kind: 'code',
          caption: 'Two calculations, one line of output.',
          code: '3 + 4\nprint(10 + 5)\n',
        },
        {
          kind: 'prose',
          body: 'The first line was carried out. Python worked out the answer, found that nothing was waiting for it, and dropped it. Existing and being shown are separate events, and `print()` is the only thing that makes the second one happen.\n\nThis is a different arrangement from the shell, where every line you type shows its value automatically. That difference is worth holding onto, because it explains a lot of "but it worked when I typed it" confusion.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Why the shell is not lying to you',
          body: 'The shell is a conversation, so it answers every line. A program is a set of instructions you wrote in advance, so it says only what you told it to say. Both are Python; they differ in what they do with a value nobody asked for.',
        },
      ],
    },
    {
      id: 'one-value',
      title: 'Printing one thing',
      blocks: [
        {
          kind: 'prose',
          body: 'Put a value between the brackets of `print()`, and that value appears. It can be a piece of text, a number, or a calculation that produces one, and it can be a name holding any of those.',
        },
        {
          kind: 'code',
          caption: 'Four different things to show.',
          code: 'name = "Sam"\nprint("Hello")\nprint(name)\nprint(7 * 6)\nprint("name")\n',
        },
        {
          kind: 'prose',
          body: 'Notice the difference between the third line and the last one. `print(name)` showed what the name holds, because a name between the brackets is looked up like a name anywhere else. `print("name")` showed the four letters, because quote marks mean "take this literally". Both lines ran without complaint, since Python has no way of telling which you meant.',
        },
        {
          kind: 'shell',
          caption: 'The shell shows text with quote marks. `print()` does not.',
          lines: [
            'greeting = "Hello"',
            'greeting',
            'print(greeting)',
            '"Hello"',
          ],
        },
        {
          kind: 'prose',
          body: 'Both lines had the same value. The shell shows you the value as a Python programmer would write it, quote marks and all, so you can see exactly what it is. `print()` shows it as a reader would want it, which means the quote marks come off. Neither is more correct. They answer different questions.',
        },
      ],
    },
    {
      id: 'several-values',
      title: 'Several things on one line',
      blocks: [
        {
          kind: 'prose',
          body: 'Most output is a mixture: some fixed words, and some values worked out while the program ran. The first way to do that is to give `print()` several things, separated by commas.',
        },
        {
          kind: 'shell',
          caption: 'Commas, and what goes between the pieces.',
          lines: [
            'print("Total:", 42)',
            'print("a", "b", "c")',
            'print(1, 2, 3, sep=" - ")',
            'print("a", "b", sep="")',
            'print()',
            'print("done")',
          ],
        },
        {
          kind: 'prose',
          body: 'Each comma puts one space between the pieces. You did not ask for the space and you cannot remove it by deleting the space you typed in your own code, because it does not come from there: it is what a comma means. If you want something else between the pieces, say so with `sep=`, as the third and fourth lines do.\n\nAnd `print()` with nothing at all in the brackets prints an empty line, which is how you put a gap in your output.',
        },
        {
          kind: 'prose',
          body: 'Commas have a second advantage, and it is a real one. Each piece is handled separately, so you can mix text and numbers freely. Trying to join them with `+` instead gets you the mixing error from the types lesson. The program below does that on purpose.',
        },
        {
          kind: 'code',
          caption: 'Joining text and a number with `+`. A deliberate error.',
          code: 'total = 42\nprint("Total: " + total)\n',
        },
        {
          kind: 'prose',
          body: 'Two ways out. Use a comma instead of `+`, which handles the pieces separately, or convert the number to text yourself with `str()` so that both sides of the `+` are text.',
        },
        {
          kind: 'code',
          caption: 'The same output, reached two ways.',
          code: 'total = 42\nprint("Total:", total)\nprint("Total: " + str(total))\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'Why does `print("Total: " + total)` fail while `print("Total:", total)` works, when `total` holds a number in both?',
          answer: 'The `+` asks Python to join a piece of text to a number, and it refuses to guess whether you meant joining or adding. The comma asks for nothing of the sort: it hands `print()` two separate items and lets it show each one in turn, which it can do for a value of any type. The comma is the easier habit for ordinary output.',
        },
      ],
    },
    {
      id: 'f-strings',
      title: 'Building a line with an f-string',
      blocks: [
        {
          kind: 'prose',
          body: 'Commas are fine until you want something more particular: a full stop straight after a value with no space in front of it, a currency symbol, a sentence with three values buried inside it. For that there is a better tool.\n\nPut the letter `f` immediately before the opening quote mark, and then anything you write inside curly brackets `{}` is worked out and dropped into the text at that spot. This is called an **f-string**, f for format.',
        },
        {
          kind: 'shell',
          caption: 'Values dropped into a piece of text.',
          lines: [
            'name = "Sam"',
            'score = 87',
            'f"{name} scored {score}"',
            'print(f"{name} scored {score}.")',
            'print(f"{name} scored {score} out of 100, which is {score / 100}")',
            'print(f"Twice {score} is {score * 2}")',
          ],
        },
        {
          kind: 'prose',
          body: 'Everything outside the curly brackets is taken literally, spaces and full stops included, so you control the shape of the line exactly. Everything inside is worked out first and then shown, which is why `{score * 2}` produced a number rather than the characters you typed.\n\nAn f-string is still a piece of text, so it needs a `print()` around it in a program, exactly like any other value.',
        },
        {
          kind: 'prose',
          body: 'The `f` is not optional decoration. Leave it off, and the curly brackets stop meaning anything and become ordinary characters.',
        },
        {
          kind: 'compare',
          caption: 'One letter apart.',
          left: { label: 'Without the f', code: 'name = "Sam"\nprint("Hello, {name}")\n', bad: true },
          right: { label: 'With the f', code: 'name = "Sam"\nprint(f"Hello, {name}")\n' },
        },
        {
          kind: 'prose',
          body: 'The left one did not raise an error. It printed the curly brackets, because without the `f` that is all they are. If your output ever contains curly brackets you did not want to see, a missing `f` is the first thing to check.',
        },
      ],
    },
    {
      id: 'rounding',
      title: 'Rounding for display',
      blocks: [
        {
          kind: 'prose',
          body: 'Division gives decimals, and decimals can run to a great many digits. Nobody wants a price with fifteen decimal places, so there are two ways to shorten a number, and they are not the same thing.\n\n`round(value, places)` works out a **new, shorter number**. An f-string can instead shorten a number **only where it is shown**, by writing `:.2f` after the value inside the curly brackets, meaning "two places, decimal".',
        },
        {
          kind: 'shell',
          caption: 'Shortening a number two ways. Watch what happens to `price` itself.',
          lines: [
            'price = 2 / 3',
            'price',
            'round(price, 2)',
            'price',
            'f"{price:.2f}"',
            'price',
            'print(f"That is {price:.2f} each")',
          ],
        },
        {
          kind: 'prose',
          body: 'After both of those, `price` is unchanged. Neither `round()` nor an f-string alters the value it was given: one hands back a new number and the other hands back a piece of text. Nothing in Python edits a number where it sits.\n\nThat is usually what you want. Keep the full number for arithmetic, so that errors do not build up, and shorten it at the last moment, when a person is about to read it. If you genuinely want the shortened number kept, store it: `price = round(price, 2)`.',
        },
        {
          kind: 'prose',
          body: 'One detail of `round()` surprises people, and it is not a bug. Watch what it does with a number exactly halfway.',
        },
        {
          kind: 'shell',
          caption: 'Halfway cases do not all go up.',
          lines: [
            'round(2.5)',
            'round(3.5)',
            'round(4.5)',
            'round(2.4)',
            'round(2.6)',
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Halves go to the even neighbour',
          body: 'Python rounds a value sitting exactly halfway towards the even one of its two neighbours, rather than always upwards. Over many numbers this keeps totals from drifting steadily high, which is why statisticians prefer it. Expect it, so that a single result one below what you predicted does not send you hunting for a bug that is not there.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program works out `total = 10 / 3` and prints it with `print(f"{total:.2f}")`. Is `total` now a two-decimal number?',
          answer: 'No. The f-string made a piece of text for showing, and the value under the name `total` is untouched, exactly as the session above showed for `price`. Any later arithmetic uses the full number. If you want the stored value shortened, you have to assign the rounded result back to the name yourself.',
        },
      ],
    },
    {
      id: 'nothing-appeared',
      title: 'When nothing appears',
      blocks: [
        {
          kind: 'prose',
          body: 'Worth collecting in one place, because all three of these happen to everybody. If a program runs cleanly and shows nothing, or shows the wrong nothing, it is nearly always one of these.\n\n**You never asked.** A calculation with no `print()` around it is worked out and dropped. This is much the commonest cause.\n\n**You asked before it happened.** The computer runs top to bottom, so a `print()` above the line that works the value out shows the old state of things, or stops with an error about a name it has not been given yet.\n\n**You printed the wrong thing.** `print("total")` shows a word, `print(total)` shows a value, and both run without complaint.',
        },
        {
          kind: 'prose',
          body: 'There is a fourth, subtler one. `print()` shows a value, but it does not hand one back to the surrounding code. Storing the result of a `print()` gets you a value called `None`, which is Python\'s word for "nothing here".',
        },
        {
          kind: 'shell',
          caption: 'What `print()` gives back, as opposed to what it shows.',
          lines: [
            'x = print("hello")',
            'x',
            'print(x)',
            'type(x)',
          ],
        },
        {
          kind: 'prose',
          body: 'The first line printed something, as you would expect. The second line, asking what `x` holds, showed nothing at all, because the shell does not display `None`. Only when it was printed explicitly did the word appear.\n\nYou will not often write `x = print(...)` on purpose. You will write something that produces `None` by accident later on, and recognising that word on the screen as "something handed back nothing" will save you a long search.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A program is meant to show a total and shows nothing at all, with no error. Where do you look first?',
          answer: 'For a missing `print()`. A calculation on a line by itself runs perfectly and shows nothing, which is exactly the symptom. After that, check that the `print()` is below the lines that work the value out, and that what is inside its brackets is the name rather than the name in quote marks.',
        },
      ],
    },
  ],
};

export default lesson;
