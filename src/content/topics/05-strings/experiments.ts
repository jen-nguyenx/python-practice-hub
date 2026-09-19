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

export const experiments: Experiment[] = [slicing];
