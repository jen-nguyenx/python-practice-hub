// "What if" experiments for strings. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const slicing: Experiment = {
  id: 't05-x1',
  title: 'What a slice actually takes',
  intro: 'Drag the two sliders and watch which letters light up. `word[a:b]` starts at position a and stops **before** position b.',
  template: "word = 'FREMANTLE'\npiece = word[⟦from⟧:⟦to⟧]\nprint(piece)\nprint(len(piece))\n",
  knobs: [
    { id: 'from', kind: 'range', label: 'from position', min: 0, max: 9, start: 0 },
    { id: 'to', kind: 'range', label: 'up to position', min: 0, max: 9, start: 4 },
  ],
  probes: {
    letters: 'list(word)',
    taken: 'list(range(len(word)))[⟦from⟧:⟦to⟧]',
  },
  visual: {
    kind: 'sequence',
    items: 'letters',
    picked: 'taken',
    caption: 'Each box is one letter, with its position underneath. The lit boxes are the ones the slice takes.',
  },
  notes: {
    '0-4': 'Four letters, from position 0 up to position 3. The second number says where to stop, not which letter to take last.',
    '0-0': 'Empty. Starting at 0 and stopping before 0 leaves no room for anything.',
    '4-0': 'Empty again. A slice never runs backwards on its own: if the start is after the stop, you get nothing rather than a reversed word.',
    '0-9': 'The whole word. Position 9 is one past the last letter, which is exactly where a slice has to stop to include everything.',
    '3-3': 'Empty. The same number twice always gives an empty slice, whatever it is.',
    '5-9': 'The tail of the word. Counting the letters is easier as a subtraction: 9 minus 5 is 4 letters.',
  },
  takeaway: 'The length of a slice is the second number minus the first, which is the quickest way to check one without counting letters. That only works because the stop position is left out, and it is why `word[0:4]` and `word[4:9]` fit together with nothing missing and nothing repeated.',
};


const matching: Experiment = {
  id: 't05-x2',
  title: 'Comparing what someone typed with what you expected',
  intro: 'People type with capitals and stray spaces. Switch the typed answer and the way you compare it, and watch how many of them a plain `==` turns away.',
  template: "typed = \u27e6typed\u27e7\nexpected = 'perth'\nprint(typed\u27e6compare\u27e7expected)\n",
  knobs: [
    {
      id: 'typed',
      label: 'what they typed',
      choices: [
        { value: "'perth'", caption: 'perth' },
        { value: "'Perth'", caption: 'Perth' },
        { value: "'PERTH'", caption: 'PERTH' },
        { value: "'  perth  '", caption: 'spaces around it' },
      ],
    },
    {
      id: 'compare',
      label: 'compare with',
      choices: [
        { value: ' == ', caption: 'just ==' },
        { value: '.lower() == ', caption: 'lower() first' },
        { value: '.strip().lower() == ', caption: 'strip() then lower()' },
      ],
    },
  ],
  notes: {
    '1-0': 'One capital letter and the answer is rejected. Python compares text exactly, character for character, and `P` is not `p`.',
    '3-1': '`lower()` fixed the capitals but not the spaces, so this is still False. Each method only does its own job.',
    '3-2': 'True at last. `strip()` removes the spaces at the ends, then `lower()` flattens the capitals.',
    '0-0': 'An exact match, so even a plain `==` is happy. This is the only typing that works without help.',
  },
  takeaway: 'Text comparison is exact and unforgiving, so clean both sides before comparing rather than hoping the person types carefully. `strip()` then `lower()` is the usual pair, and the order does not matter here because neither undoes the other. Note the original `typed` is untouched: these methods hand back a new string rather than changing the one you had.',
};

const building: Experiment = {
  id: 't05-x3',
  title: 'Building a string one letter at a time',
  intro: 'Strings get built the same way totals do: start with something empty, then add to it each time round. Change which side you add on and watch the table.',
  template: "letters = 'PERTH'\nout = \u27e6start\u27e7\nfor ch in letters:\n    \u27e6build\u27e7\nprint(out)\n",
  knobs: [
    {
      id: 'start',
      label: 'start out as',
      choices: [
        { value: "''", caption: 'empty text' },
        { value: "'-'", caption: 'a dash' },
      ],
    },
    {
      id: 'build',
      label: 'each time round',
      choices: [
        { value: 'out = out + ch', caption: 'add on the end' },
        { value: 'out = ch + out', caption: 'add on the front' },
        { value: 'out = ch', caption: 'replace it' },
      ],
    },
  ],
  watch: ['ch', 'out'],
  anchorLine: 4,
  notes: {
    '0-0': 'The everyday case. `out` keeps what it had and the new letter goes on the end, so the word rebuilds itself.',
    '0-1': 'The same loop with the two sides swapped spells the word backwards. Adding text is not like adding numbers: the order changes the answer.',
    '0-2': 'Only H survives. `out = ch` throws away everything built so far, so you end up with whatever came last.',
    '1-0': 'Starting from a dash leaves the dash at the front. Whatever you start with is still there at the end, which is why an accumulator usually starts empty.',
  },
  takeaway: 'Building a string needs the variable on both sides, `out = out + ch`, exactly like a running total. The difference from numbers is that the two sides are not interchangeable: `out + ch` spells the word forwards and `ch + out` spells it backwards, and that is the shortest way to reverse text by hand.',
};

export const experiments: Experiment[] = [slicing, matching, building];

