// "What if" experiments for variables, types and expressions. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const dividing: Experiment = {
  id: 't01-x1',
  title: 'Three ways to divide, and why they disagree',
  intro:
    'Eighteen lollies are being shared out. Drag the slider to change how many people are sharing, and switch between the three dividing symbols. One setting stops the program on purpose.',
  template: 'lollies = 18\npeople = ⟦people⟧\nprint(lollies ⟦op⟧ people)\n',
  knobs: [
    { id: 'people', kind: 'range', label: 'share between this many people', min: 0, max: 9, start: 4 },
    {
      id: 'op',
      label: 'divide with',
      choices: [
        { value: '/', caption: 'a plain divide  ( / )' },
        { value: '//', caption: 'a whole-number divide  ( // )' },
        { value: '%', caption: 'the left over  ( % )' },
      ],
    },
  ],
  notes: {
    '4-0': 'Sharing 18 between 4 gives 4.5. A plain `/` is happy to hand you half a lolly.',
    '4-1': 'Four each. `//` throws away the half, because you cannot give someone half a lolly.',
    '4-2': 'Two left over. Four people get four each, which is sixteen, and `%` tells you what is still in the bag.',
    '3-0': 'The surprise: 6.0, not 6. `/` always answers with a decimal point, even when the division is exact. If you print that as a count of boxes or pages, it reads as `6.0 boxes`.',
    '3-1': 'Plain 6. Use `//` whenever the answer is a count of whole things.',
    '3-2': 'Nothing left over, so `%` gives 0. Zero left over is how you check that one number divides another exactly.',
    '0-0': 'Sharing between nobody stops the program with a ZeroDivisionError. Division by zero has no answer, so Python refuses rather than guessing. If the number of people comes from a user, check it is not 0 before you divide.',
    '1-1': 'One person gets all 18. Dividing by 1 changes nothing, which is a handy way to sanity-check which symbol you picked.',
    '5-2': 'Three left over. Notice `18 // 5` and `18 % 5` answer two different questions about the same share: how many each, and what is stranded.',
  },
  takeaway:
    '`/`, `//` and `%` answer three different questions. `/` gives the exact share and **always** comes back with a decimal point, so `6 / 3` is `6.0`. `//` gives how many whole ones fit and `%` gives what is left over, and those two belong together: whenever you use one, ask yourself whether you also need the other. Dividing by zero is not a wrong answer, it is a stopped program.',
};

const wholeNumbers: Experiment = {
  id: 't01-x2',
  title: 'Turning a decimal into a whole number',
  intro:
    'Three different ways to get rid of a decimal point. Pick a number and a method, and watch which ones agree and which ones do not.',
  template: "value = ⟦value⟧\nwhole = ⟦how⟧\nprint(value, '->', whole)\n",
  knobs: [
    {
      id: 'value',
      label: 'start with',
      choices: [{ value: '3.2' }, { value: '3.7' }, { value: '2.5' }, { value: '-3.7' }],
    },
    {
      id: 'how',
      label: 'make it whole with',
      choices: [
        { value: 'int(value)' },
        { value: 'round(value)' },
        { value: 'value // 1', caption: 'value // 1  (divide by one, whole-number style)' },
      ],
    },
  ],
  notes: {
    '1-0': 'The one that catches everybody: `int(3.7)` is 3, not 4. `int()` cuts the decimals off and never looks at how big they were, so 3.99 also becomes 3.',
    '1-1': '`round(3.7)` is 4, which is what most people expected `int()` to do. If you want the nearest whole number, say `round`.',
    '0-0': '3.2 becomes 3 either way, which is exactly why this mistake survives testing: pick a number below the half and `int()` and `round()` agree.',
    '2-1': 'The half-way case: `round(2.5)` is 2, not 3. Python sends an exact half to the nearest **even** number, so `round(3.5)` is 4 while `round(2.5)` is 2.',
    '3-0': '`int(-3.7)` is -3. It cuts towards zero, so a negative number gets **bigger**.',
    '3-2': '`-3.7 // 1` is -4.0. This one always rounds **down**, so on a negative number it disagrees with `int()` by a whole one. That is the same rule that makes `-7 // 2` equal to -4.',
    '0-2': '`3.2 // 1` is 3.0, with the decimal point still there. `//` gives a whole value, not a whole *number type*, when a decimal went in.',
  },
  takeaway:
    '`int()` chops, `round()` goes to the nearest, and `// 1` goes down. On a plain positive number like 3.2 all three look the same, which is how the wrong one gets into a program unnoticed. They split apart on three kinds of value: anything above the half (`int(3.7)` is 3), an exact half (`round(2.5)` is 2, because exact halves go to the even number), and anything negative (`int(-3.7)` is -3 but `-3.7 // 1` is -4.0).',
};

const textOrNumber: Experiment = {
  id: 't01-x3',
  title: 'Is it the number 5, or the text "5"?',
  intro:
    'The quote marks are the whole difference. Switch each side between a number and a piece of text, then switch the symbol between them. Two settings stop the program.',
  template: 'first = ⟦first⟧\nsecond = ⟦second⟧\nprint(first ⟦op⟧ second)\n',
  knobs: [
    {
      id: 'first',
      label: 'on the left',
      choices: [
        { value: '5', caption: 'the number 5' },
        { value: "'5'", caption: "the text '5'" },
      ],
    },
    {
      id: 'second',
      label: 'on the right',
      choices: [
        { value: '3', caption: 'the number 3' },
        { value: "'3'", caption: "the text '3'" },
      ],
    },
    {
      id: 'op',
      label: 'joined with',
      choices: [
        { value: '+', caption: 'plus  ( + )' },
        { value: '*', caption: 'times  ( * )' },
      ],
    },
  ],
  notes: {
    '0-0-0': 'Two numbers and a `+` is ordinary arithmetic: 8.',
    '1-1-0': "Two pieces of text and a `+` gives '53'. With text, `+` does not add, it sticks the two lots of characters end to end. This is what happens to every value that came from `input()`, because `input()` always hands back text.",
    '0-1-0': 'Stopped: a number and a piece of text cannot be added. Python will not guess whether you meant 8 or 53, so it tells you the two kinds do not mix. The fix is to convert one side, with `int(second)` or `str(first)`.',
    '1-0-0': 'Stopped the same way, with the sides swapped in the message. Reading which kind is on the left and which is on the right is how you work out which one to convert.',
    '1-0-1': "Text times a number repeats it: '5' * 3 is '555'. No arithmetic happened at all.",
    '0-1-1': "The same thing the other way round: 5 * '3' is '333'. If a total suddenly grows very long instead of very large, one side is text.",
    '1-1-1': 'Stopped: text times text is meaningless. Repeating something three times makes sense; repeating it "five" times, where "five" is itself some characters, does not.',
    '0-0-1': 'Two numbers and a `*` is 15, the answer you would get on a calculator.',
  },
  takeaway:
    "Quote marks change what `+` and `*` mean. On numbers they add and multiply; on text they join and repeat; and when you mix the two kinds, Python stops rather than guess. The reason this matters on day one is that `input()` always gives you text, so `input()` plus `input()` joins two answers into one long string instead of adding them. Convert as you read: `int(input(...))`.",
};

export const experiments: Experiment[] = [dividing, wholeNumbers, textOrNumber];
