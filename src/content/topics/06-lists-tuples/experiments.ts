// "What if" experiments for lists and tuples. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const slicing: Experiment = {
  id: 't06-x1',
  title: 'Which items a slice takes, counting from either end',
  intro: 'Drag the two sliders and watch which boxes light up. A negative number counts back from the end, so the same items can be asked for in two different ways.',
  template: "nums = [10, 20, 30, 40, 50, 60]\npiece = nums[⟦from⟧:⟦to⟧]\nprint(piece)\nprint('how many:', len(piece))\n",
  knobs: [
    { id: 'from', kind: 'range', label: 'from position', min: -6, max: 6, start: 0 },
    { id: 'to', kind: 'range', label: 'up to position', min: -6, max: 6, start: 3 },
  ],
  probes: {
    boxes: '[str(n) for n in nums]',
    taken: 'list(range(len(nums)))[⟦from⟧:⟦to⟧]',
  },
  visual: {
    kind: 'sequence',
    items: 'boxes',
    picked: 'taken',
    caption: 'One box per item, with its position underneath. The lit boxes are the ones the slice takes.',
  },
  notes: {
    '6-9': 'Three items, from position 0 up to position 2. The second number says where to **stop**, not which item to take last.',
    '6-6': 'Empty. Starting at 0 and stopping before 0 leaves no room for anything.',
    '9-6': 'Empty again. A slice never runs backwards on its own: when the start is past the stop you get nothing, not a reversed list.',
    '6-12': 'The whole list. Position 6 is one past the last item, which is exactly where a slice has to stop to include everything.',
    '6-3': 'The same three items as `nums[0:3]`. A stop of -3 means "three from the end", so it lops the last three off.',
    '3-12': 'The last three items. A start of -3 means "three from the end", and leaving the stop at 6 runs to the end of the list.',
    '3-0': 'Empty. -3 is position 3 and -6 is position 0, so this still asks to start after it stops.',
    '0-12': 'The whole list again. For a six-item list, -6 and 0 point at the very same box.',
  },
  takeaway: 'A slice is described by two positions, not by two items: it begins at the first and stops **before** the second, so `nums[0:3]` and `nums[3:6]` fit together with nothing missing and nothing repeated. A negative number is just another name for a position counted from the end (-1 is the last box), which is why `nums[-3:]` and `nums[len(nums) - 3:]` pick out the same items. Slicing always hands back a **new** list; the original is never touched.',
};

const sortVsSorted: Experiment = {
  id: 't06-x2',
  title: 'sort() changes the list; sorted() hands you a new one',
  intro: 'Two ways to put a list in order, and they hand back very different things. Watch what `result` ends up holding, and what happens to `scores`.',
  template: "scores = [7, 3, 9]\n⟦how⟧\nprint('scores is now', scores)\nprint('result is  ', result)\n⟦use⟧\n",
  knobs: [
    {
      id: 'how',
      label: 'put them in order by',
      choices: [
        { value: 'result = sorted(scores)', caption: 'asking sorted() for a new list' },
        { value: 'result = scores.sort()', caption: 'saving what scores.sort() hands back' },
        { value: 'result = sorted(scores, reverse=True)', caption: 'asking sorted() for a new list, biggest first' },
      ],
    },
    {
      id: 'use',
      label: 'then read the first item of',
      choices: [
        { value: "print('first of result', result[0])", caption: 'result' },
        { value: "print('first of scores', scores[0])", caption: 'scores' },
      ],
    },
  ],
  notes: {
    '0-0': 'What most people want. `sorted(scores)` builds a new ordered list and leaves `scores` in its original order, so the smallest score is `result[0]`.',
    '1-0': "The crash everyone meets sooner or later. `scores.sort()` hands back `None`, so `result` is `None` and `result[0]` is a TypeError. The sorting did happen, just not into `result`.",
    '1-1': '`scores` really is in order now, so reading it works. `sort()` does its job **to the list**; it simply has nothing to hand back.',
    '0-1': "`sorted()` left `scores` exactly as it was, so its first item is still 7. If a task says the input must not change, this is the version you want.",
    '2-0': '`reverse=True` only flips the order of the new list. `scores` is still untouched, because `sorted()` never touches it.',
  },
  takeaway: 'The rule is about what comes **back**, not about what happens. `scores.sort()` reorders the list itself and returns `None`, so it belongs on a line of its own: writing `scores = scores.sort()` throws the list away and leaves you with `None`. `sorted(scores)` reorders nothing and returns a new list, so its result is the only thing worth saving. The same split covers `append`, `insert`, `remove` and `reverse`: they all change the list and return `None`.',
};

const aliasing: Experiment = {
  id: 't06-x3',
  title: 'When two names are really one list',
  intro: 'A second name for a list is not a second list. Change how the copy is made and what you do to it, then watch whether the first list changed as well.',
  template: "squad = ['Kai', 'Ava']\nbackup = ⟦copy⟧\n⟦change⟧\nprint('squad  ', squad)\nprint('backup ', backup)\n",
  knobs: [
    {
      id: 'copy',
      label: 'make backup from',
      choices: [
        { value: 'squad', caption: 'squad itself' },
        { value: 'squad[:]', caption: 'a slice of the whole thing' },
        { value: 'list(squad)', caption: 'a new list built from it' },
      ],
    },
    {
      id: 'change',
      label: 'then do this to backup',
      choices: [
        { value: "backup.append('Noor')", caption: 'add a name to the end' },
        { value: "backup = backup + ['Noor']", caption: 'join it with another list' },
        { value: 'backup.sort()', caption: 'put it in order' },
      ],
    },
  ],
  notes: {
    '0-0': 'Both lists gained Noor, because there is only one list here. `backup = squad` gives the same list a second name; it does not copy anything.',
    '0-2': 'Sorting through one name reorders what the other name sees too. Anything that changes a list in place is visible from every name it has.',
    '0-1': 'Only `backup` gained Noor, even though `backup` started as the same list. `backup + [...]` builds a **new** list and points `backup` at it, leaving `squad` alone.',
    '1-0': "A slice of everything, `squad[:]`, is a genuine copy, so appending to it leaves `squad` alone. This is the one-character difference between `backup = squad` and `backup = squad[:]`.",
    '2-2': '`list(squad)` copies just as well as `[:]` does; use whichever reads more clearly. Sorting the copy leaves the original in its first order.',
    '1-2': "Sorting the copy changes only the copy. When a task says the input must stay as it was, copy first or use `sorted()`.",
  },
  takeaway: 'The `=` sign never copies a list. `backup = squad` is a second label on one box of items, so `append`, `sort`, `remove` and `backup[0] = ...` through either name are seen by both. To get a separate list, ask for one: `squad[:]` or `list(squad)`. Rebuilding (`backup = backup + [...]`) also makes a new list, which is why it looks like it "does nothing" to the original while `append` clearly does. The same catch bites inside functions: the list handed to a function is the caller\'s own list.',
};

export const experiments: Experiment[] = [slicing, sortVsSorted, aliasing];
