// "What if" experiments for functions, scope and the project main(). Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const scope: Experiment = {
  id: 't11-x1',
  title: 'What a function can and cannot change outside itself',
  intro:
    'A counter starts at 0 outside the function. Change what the function does with it, and change what the program does with the answer, then look at the last line: is the outside counter any different?',
  template: `visitors = 0

def add_visitor(amount):
    ⟦body⟧

⟦call⟧
print('outside, visitors is', visitors)
`,
  knobs: [
    {
      id: 'body',
      label: 'what the function does',
      choices: [
        { value: 'return visitors + amount', caption: 'work out the new count and give it back' },
        { value: 'visitors = visitors + amount', caption: 'add to the counter right there' },
        { value: 'print(visitors + amount)', caption: 'print the new count' },
      ],
    },
    {
      id: 'call',
      label: 'what the program does with the answer',
      choices: [
        { value: 'add_visitor(1)', caption: 'just call it' },
        { value: 'visitors = add_visitor(1)', caption: 'store what comes back' },
      ],
    },
  ],
  notes: {
    '0-1':
      'The only version that works. The function hands a new number back and the line that called it stores that number in `visitors`. Nothing magic happens inside the function; the change happens at the call.',
    '0-0':
      'Still 0. The function worked out the right answer and the program threw it away. A call on a line by itself keeps nothing.',
    '1-0':
      'A crash: `UnboundLocalError`. Because `visitors` is assigned somewhere inside the function, Python treats it as a **local** name everywhere in that function, so the right-hand side has nothing to read yet. The outer `visitors` is not involved at all.',
    '2-0':
      'You see 1 printed, and then `visitors` is still 0. Printing puts a number on the screen; it does not hand anything back and it does not touch the outer variable.',
    '2-1':
      '`visitors` becomes `None`. A function that only prints has no `return`, and a function with no `return` gives back `None`, so storing the answer stores nothing useful.',
  },
  takeaway:
    'A function cannot reach out and change a variable that lives outside it. The pattern that works is: pass the value in, `return` the new value, and **store it where the function was called**. Two failures follow from that: a call whose answer is not stored changes nothing, and a function that prints instead of returning gives back `None`. And the moment you assign to a name inside a function, that name is local for the whole function, which is what `UnboundLocalError` is telling you.',
};

const defaults: Experiment = {
  id: 't11-x2',
  title: 'Leaving an argument out, and the list that remembers',
  intro:
    'Two songs are added to a playlist, one call after the other. Change the starting value of `playlist`, change whether the function makes a fresh list, and change whether the second call brings its own list.',
  template: `def add_song(song, playlist=⟦default⟧):
    ⟦setup⟧
    playlist.append(song)
    return playlist

print('first playlist: ', add_song('Down Under'))
print('second playlist:', ⟦second⟧)
`,
  knobs: [
    {
      id: 'default',
      label: 'the playlist to use when none is given',
      choices: [
        { value: '[]', caption: 'an empty list' },
        { value: 'None', caption: 'nothing at all' },
      ],
    },
    {
      id: 'setup',
      label: 'first line of the function',
      choices: [
        { value: 'pass', caption: 'get straight on with it' },
        { value: 'if playlist is None: playlist = []', caption: 'start a fresh list if none was given' },
      ],
    },
    {
      id: 'second',
      label: 'the second call',
      choices: [
        { value: "add_song('Land Down Under')", caption: 'leave the playlist out again' },
        { value: "add_song('Land Down Under', [])", caption: 'hand it a brand new empty list' },
      ],
    },
  ],
  notes: {
    '0-0-0':
      'The bug. The second playlist comes back with **both** songs on it, even though nothing was carried between the calls on purpose. `playlist=[]` builds one list when the `def` line runs, and every call that leaves the argument out appends to that same list.',
    '0-0-1':
      'Looks perfect, and that is what makes the bug so hard to find. As soon as a call brings its own list, the shared one is not touched, so a quick test can pass while the real use is broken.',
    '1-0-0':
      'A crash: `AttributeError`, because `None` has no `append`. `None` is a safe default only when the function makes a real list before using it.',
    '1-1-0':
      'The version to write. `None` means "nothing was given", and the first line inside the function makes a **new** empty list every time, so the two playlists stay separate.',
    '0-1-0':
      'The guard is there but it never fires, because the default is `[]` and not `None`, so both songs still end up on the same list. Guarding against the wrong value is the same as not guarding at all.',
  },
  takeaway:
    'A default value is worked out **once**, when the `def` line runs, not each time the function is called. For a number, a string, `True`, `False` or `None` that makes no difference, because they cannot change. For a list or a dictionary it means every call that leaves the argument out shares one object, and the second call sees what the first one left behind. Write `=None` and build the real list inside the function.',
};

const mainContract: Experiment = {
  id: 't11-x3',
  title: 'What main() hands back to the marker',
  intro:
    'The project tester never looks at the screen. It calls `main` and looks at what comes back, which is the `answer` printed on the last line here. Change what the helper does and what `main` does, and watch `answer`.',
  template: `def average(values):
    ⟦helper⟧

def main(values):
    result = average(values)
    ⟦finish⟧

answer = main([4, 5, 9])
print('the marker sees:', answer)
`,
  knobs: [
    {
      id: 'helper',
      label: 'what the helper does with the average',
      choices: [
        { value: 'return sum(values) / len(values)', caption: 'give it back' },
        { value: 'print(sum(values) / len(values))', caption: 'print it' },
        { value: 'total = sum(values) / len(values)', caption: 'work it out and stop there' },
      ],
    },
    {
      id: 'finish',
      label: 'the last line of main',
      choices: [
        { value: 'return round(result, 2)', caption: 'give the rounded answer back' },
        { value: 'print(round(result, 2))', caption: 'print the rounded answer' },
      ],
    },
  ],
  notes: {
    '0-0':
      'The only version that scores marks. The helper returns, `main` returns, and the caller ends up holding 6.0.',
    '0-1':
      'The number appears on the screen and `answer` is `None`. A tester that compares `main(...)` with the expected result sees `None` and scores zero, no matter how right the printed number looks.',
    '1-0':
      'The average is printed by the helper, and then `main` crashes with a `TypeError`, because `result` is `None` and `None` cannot be rounded. The printed line is the trap: something appeared, so the helper looks like it worked.',
    '2-0':
      'A crash with nothing printed at all. The helper works the average out, stores it in a local variable that disappears the moment the call ends, and gives back `None`.',
    '2-1':
      'The same crash. Changing how `main` finishes cannot help, because the value never got out of the helper in the first place.',
  },
  takeaway:
    '`print` puts something on the screen; `return` hands a value to whoever called the function. The project is marked entirely on what `main` returns, so a missing `return` anywhere in the chain turns the answer into `None`, and the next thing that tries to use it raises a `TypeError`. Every helper returns to `main`, and `main` returns to the marker.',
};

export const experiments: Experiment[] = [scope, defaults, mainContract];
