// "What if" experiments for for loops and range(). Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const counting: Experiment = {
  id: 't03-x1',
  title: 'Where counting starts, where it stops, and how big the jumps are',
  intro: 'The three numbers in `range()` are the start, the stop and the step. Change one at a time and watch which numbers appear.',
  template: 'for n in range(⟦start⟧, ⟦stop⟧, ⟦step⟧):\n    print(n)\n',
  knobs: [
    { id: 'start', label: 'start counting at', choices: [{ value: '0' }, { value: '3' }, { value: '6' }] },
    { id: 'stop', label: 'stop before', choices: [{ value: '5' }, { value: '0' }] },
    {
      id: 'step',
      label: 'jump by',
      choices: [
        { value: '1', caption: '1 (every number)' },
        { value: '2', caption: '2 (every second)' },
        { value: '-1', caption: '-1 (backwards)' },
      ],
    },
  ],
  notes: {
    '0-0-0': 'The everyday case. Counting starts at the start number and stops **before** the stop number, so 5 never appears.',
    '0-1-0': 'Nothing prints. You asked to count up from 0 and stop before 0, which is over before it begins.',
    '2-1-2': 'Counting backwards works, but only when the start is above the stop.',
    '0-0-2': 'Nothing prints again. A negative step counts down, so it needs a stop **below** the start.',
  },
  takeaway: 'The stop number is never printed. It is the line the loop must not cross, not the last value. And a negative step only produces numbers when the start is above the stop, which is why a backwards loop that prints nothing is usually a start and stop the wrong way round.',
};

const accumulator: Experiment = {
  id: 't03-x2',
  title: 'Building up a total, and where the answer gets printed',
  intro: 'A running total needs two things: the right update inside the loop, and the print in the right place. Change either and watch both the table and the output.',
  template: 'prices = [4, 3, 5]\ntotal = 0\nfor p in prices:\n    ⟦update⟧\n⟦show⟧\n',
  knobs: [
    {
      id: 'update',
      label: 'each time round the loop',
      choices: [
        { value: 'total = total + p', caption: 'add this price' },
        { value: 'total = p', caption: 'replace with this price' },
        { value: 'total = total + 1', caption: 'add one' },
      ],
    },
    {
      id: 'show',
      label: 'print the total',
      choices: [
        { value: 'print(total)', caption: 'after the loop' },
        { value: '    print(total)', caption: 'inside the loop' },
      ],
    },
  ],
  watch: ['p', 'total'],
  anchorLine: 4,
  notes: {
    '0-0': 'The real answer: 12. The total keeps what it had and adds the new price on top.',
    '1-0': 'Only 5, the last price. `total = p` throws away everything counted so far, so the loop leaves you with whatever came last.',
    '2-0': 'You get 3, the number of prices rather than their value. Adding one each pass counts items; adding `p` each pass sums them.',
    '0-1': 'The same sum arrives in the end, but you see it being built: 4, then 7, then 12. Printing inside the loop shows the working, not the answer.',
  },
  takeaway: 'The variable has to appear on both sides of the update: `total = total + p` means "whatever the total was, plus this one". Indentation decides *when* you see it. Inside the loop you get one line per pass; outside, one line at the end.',
};

const loopVariable: Experiment = {
  id: 't03-x3',
  title: 'What the loop variable actually holds',
  intro: 'A for loop hands you one item at a time, but what an "item" is depends on what you are looping over. Some pairings here crash on purpose.',
  template: 'for item in ⟦thing⟧:\n    print(⟦what⟧)\n',
  knobs: [
    {
      id: 'thing',
      label: 'loop over',
      choices: [
        { value: '[10, 20, 30]', caption: 'a list of numbers' },
        { value: "['cat', 'dog']", caption: 'a list of words' },
        { value: "'cat'", caption: 'a single word' },
        { value: 'range(3)', caption: 'a range' },
      ],
    },
    {
      id: 'what',
      label: 'print',
      choices: [
        { value: 'item' },
        { value: 'item * 2' },
        { value: 'len(item)' },
      ],
    },
  ],
  notes: {
    '0-2': "`len()` of a number is a TypeError. A number has no length: it is one value, not a collection of parts.",
    '2-0': 'Looping over a word gives you one letter at a time, not the whole word once.',
    '3-0': '`range(3)` hands over 0, 1, 2. It does not hand over the range itself.',
    '1-1': "Multiplying a word repeats it rather than doing arithmetic, so 'cat' * 2 is 'catcat'.",
  },
  takeaway: 'The loop variable holds one **item**, and the kind of item comes from what you looped over: a list of numbers gives numbers, a word gives single letters, a range gives whole numbers. Most `TypeError` messages inside a loop mean the item is not the kind of thing you assumed.',
};

export const experiments: Experiment[] = [counting, accumulator, loopVariable];
