// "What if" experiments for recursion. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const baseCase: Experiment = {
  id: 't13-x1',
  title: 'The base case is the only thing that stops it',
  intro:
    'A function adds up the numbers from the starting number down towards zero, keeping a note of every call it makes. Drag the starting number, change how big each step down is, and change the test that says "stop here".',
  template: `calls = []

def count_down(n):
    calls.append(n)
    if ⟦base⟧:
        return 0
    return n + count_down(n - ⟦step⟧)

print('total:', count_down(⟦start⟧))
print('calls made:', len(calls))
`,
  knobs: [
    {
      id: 'base',
      label: 'when to stop',
      choices: [
        { value: 'n == 0', caption: 'exactly at zero' },
        { value: 'n <= 0', caption: 'at zero or below' },
      ],
    },
    {
      id: 'step',
      label: 'how far down each call goes',
      choices: [
        { value: '1', caption: 'one at a time' },
        { value: '2', caption: 'two at a time' },
      ],
    },
    { id: 'start', kind: 'range', label: 'the starting number', min: 0, max: 8, start: 5 },
  ],
  probes: { chain: 'list(calls[:12])' },
  visual: {
    kind: 'sequence',
    items: 'chain',
    caption: 'One box per call, in the order they happened. The number in the box is what `n` was inside that call.',
  },
  notes: {
    '0-0-5':
      'Five plus four plus three plus two plus one, and then a sixth call that answers 0 without calling anything. Six boxes for a starting number of 5: the base case is a call too.',
    '0-1-5':
      'A crash: `RecursionError`. Going down two at a time from 5 gives 5, 3, 1, -1, -3 and so on: it steps straight over zero and never equals it, so nothing ever stops. Python gives up after a few hundred calls.',
    '1-1-5':
      'The same steps, the same starting number, and now it finishes. `n <= 0` catches -1 on the way past, which `n == 0` never did.',
    '0-1-6':
      'Two at a time from an even number does land on zero, so this one works. A base case that only happens to be reached is a bug waiting for the next input.',
    '0-0-0':
      'The smallest case. One call, no further calls, and the answer is 0 straight away. Always check that the base case on its own gives the right answer.',
  },
  takeaway:
    'A recursive function stops because a call finally matches the base case, and for nothing else. So the base case has to catch **every** input the calls can arrive at, not just the one you had in mind: write `n <= 0` rather than `n == 0`, `len(text) <= 1` rather than `len(text) == 1`. `RecursionError: maximum recursion depth exceeded` always means the same thing: the calls went past the base case, or the argument never really got smaller.',
};

const combining: Experiment = {
  id: 't13-x2',
  title: 'What the recursive call gives you, and what you do with it',
  intro:
    'This function should return `PERTH` spelled backwards. Change what the base case returns and how the first letter is joined onto the answer from the rest of the word.',
  template: `def reverse(text):
    if text == '':
        return ⟦base⟧
    return ⟦combine⟧

print(reverse('PERTH'))
`,
  knobs: [
    {
      id: 'base',
      label: 'the answer for an empty word',
      choices: [
        { value: "''", caption: 'an empty piece of text' },
        { value: '0', caption: 'zero' },
      ],
    },
    {
      id: 'combine',
      label: 'how the answer is put together',
      choices: [
        { value: 'reverse(text[1:]) + text[0]', caption: 'the rest reversed, then the first letter' },
        { value: 'text[0] + reverse(text[1:])', caption: 'the first letter, then the rest reversed' },
        { value: 'reverse(text[1:])', caption: 'just the rest reversed' },
        { value: 'text[0] + reverse(text[0:])', caption: 'the first letter, then the whole word reversed' },
      ],
    },
  ],
  notes: {
    '0-0':
      '`HTREP`. Each call puts its own letter on the **end** of whatever the shorter word came back as, so the first letter finishes up last.',
    '0-1':
      '`PERTH`, unchanged. Putting your letter in front of the reversed rest just rebuilds the word in its original order. The pieces are all correct; only the order they are joined in is wrong.',
    '0-2':
      'An empty line. The recursive call is returned but this call\'s own letter is never added to it, so every letter falls off one at a time and the empty base case is all that is left.',
    '0-3':
      'A crash: `RecursionError`. `text[0:]` is the whole word again, not a shorter one, so every call asks the same question and the base case is never reached. "Is the argument really smaller?" is the first thing to check.',
    '1-0':
      "A crash: `TypeError`. The base case hands back the number 0, and the call above it tries `0 + 'H'`. Pick the base value to match the operation: `''` when you are joining text, `0` when you are adding numbers, `[]` when you are building a list.",
    '1-2':
      'It prints `0`. Nothing crashes, because the base value is simply passed straight back up, which is a good reminder that a base case of the wrong type can travel a long way before anything complains.',
  },
  takeaway:
    'A recursive call hands you the answer for a **smaller** piece of the problem, and your job in that line is to add your own piece to it. Two things have to be right: the argument really is smaller, or the calls never end, and the base case returns the value that fits the operation you are combining with. Which side you join your piece on decides the order of the result.',
};

const callStack: Experiment = {
  id: 't13-x3',
  title: 'On the way down, or on the way back up',
  intro:
    'The same function, peeling one letter off `PERTH` at a time. Choose what it prints **before** the recursive call and what it prints **after** it, then read the output from top to bottom.',
  template: `def show(word):
    if word == '':
        return
    ⟦before⟧
    show(word[1:])
    ⟦after⟧

show('PERTH')
`,
  knobs: [
    {
      id: 'before',
      label: 'print before the call',
      choices: [
        { value: "print('down:', word)", caption: 'the word this call was given' },
        { value: "print('down:', word[0])", caption: 'just its first letter' },
        { value: 'pass', caption: 'nothing' },
      ],
    },
    {
      id: 'after',
      label: 'print after the call comes back',
      choices: [
        { value: "print('up:', word)", caption: 'the word this call was given' },
        { value: "print('up:', word[0])", caption: 'just its first letter' },
        { value: 'pass', caption: 'nothing' },
      ],
    },
  ],
  notes: {
    '1-2':
      'P, E, R, T, H, in order. A line before the recursive call runs as the calls go **down**, so the letters come out the way you read them.',
    '2-1':
      'H, T, R, E, P: the word backwards, from a function that has no reversing in it anywhere. Lines after the recursive call are left waiting, and they run as the calls return, deepest one first.',
    '0-0':
      'The whole shape of it. Five words on the way down, then the same five on the way back up in the opposite order. Each call kept its own `word` the entire time it was waiting.',
    '2-2':
      'Nothing at all. The calls all happen, exactly as before; recursion on its own produces no output and no answer unless you print or return something.',
    '0-2':
      'PERTH, ERTH, RTH, TH, H. Each call is holding a different word at the same moment, which is why `word` can be five different things at once.',
  },
  takeaway:
    'Every call keeps its own copy of its variables, frozen where it was, until the call it is waiting for comes back. So the lines **above** the recursive call run in order from the outermost call inwards, and the lines **below** it run in the opposite order, innermost first. That is the whole reason a print after the call gives you the word backwards, and it is what a `return` at the end of a recursive function is quietly using.',
};

export const experiments: Experiment[] = [baseCase, combining, callStack];
