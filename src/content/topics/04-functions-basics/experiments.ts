// "What if" experiments for functions. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const returnOrPrint: Experiment = {
  id: 't04-x1',
  title: 'What the caller actually gets back',
  intro:
    'The function works out the right answer in all three versions. Change the last line of the function and watch what the *caller* ends up holding.',
  template:
    "def double(n):\n    ⟦body⟧\n\nresult = double(5)\nprint('the caller got:', result)\nprint(⟦use⟧)\n",
  knobs: [
    {
      id: 'body',
      label: 'inside the function',
      choices: [
        { value: 'return n * 2', caption: 'hand the answer back' },
        { value: 'print(n * 2)', caption: 'show the answer on screen' },
        { value: 'n * 2', caption: 'just work it out' },
      ],
    },
    {
      id: 'use',
      label: 'then the caller prints',
      choices: [{ value: 'result' }, { value: 'result + 1' }],
    },
  ],
  notes: {
    '0-0': 'The working version. `return` hands 10 back to the line that called the function, so `result` really is 10 and the caller can use it.',
    '1-0': 'Look closely: 10 appears on the screen **first**, before the caller has anything. That 10 came from inside the function, and the caller still got `None`. Seeing the right number on screen is not proof that the function returned it.',
    '1-1': 'Stopped. `None` plus 1 is a TypeError, and this exact message is how a printing function usually announces itself. The number on screen was never handed back, so there was nothing to add to.',
    '2-0': 'Nothing on screen from inside the function, and the caller still got `None`. Working a value out and not returning it throws it away just as surely as printing it does: the last line of a function is not automatically its answer.',
    '2-1': 'Stopped the same way as the printing version, and for the same reason. The only difference between these two wrong versions is whether you got a number on screen to reassure you.',
    '0-1': '11, because the caller has a real number to add to. Once a function returns, its answer can go anywhere a value fits: into a sum, a condition, or another function call.',
  },
  takeaway:
    '`print` shows a value to a human; `return` hands it to the rest of the program. They look the same when you run a snippet and glance at the screen, and they are completely different to every other line of code, because a function without `return` gives back `None` no matter what it printed or worked out. `TypeError: unsupported operand type(s) for +: \'NoneType\' and \'int\'` almost always means a function printed when it should have returned. When a question says "return", the marker never looks at the screen.',
};

const whereTheReturnGoes: Experiment = {
  id: 't04-x2',
  title: 'Where the second return belongs',
  intro:
    'The function should answer `big` or `small`. Only the indentation of one line changes here. Drag the number across 10 and see which versions still answer.',
  template:
    "def size(n):\n    if n > 10:\n        return 'big'\n⟦rest⟧\n\nprint(size(⟦n⟧))\n",
  knobs: [
    {
      id: 'rest',
      label: 'the line after the if',
      choices: [
        { value: "    return 'small'", caption: "return 'small' lined up with the if" },
        { value: "        return 'small'", caption: "return 'small' tucked inside the if" },
        { value: "    print('small')", caption: "print 'small' instead of returning it" },
      ],
    },
    { id: 'n', kind: 'range', label: 'the number you pass in', min: 0, max: 20, start: 5 },
  ],
  notes: {
    '0-5': 'The working version. The second `return` sits at the same indentation as the `if`, so it runs whenever the `if` did not already end the function.',
    '1-5': 'The function answers `None`. The second `return` is indented inside the `if`, so it can only run on a pass that already returned, which means it never runs at all. A small number falls off the end of the function, and falling off the end is always `None`.',
    '2-5': "Two lines: `small` from inside the function, then `None` from the caller's print. The word went to the screen and the answer never came back.",
    '0-15': 'Above 10, the first `return` fires and the function stops there. The line below it is not skipped because of any rule about `if`: `return` simply ends the function on the spot.',
    '1-15': "For a big number all three versions agree, which is exactly why this bug survives a quick test. Only the numbers that reach the *second* return tell the versions apart.",
    '0-10': "Exactly 10 is `small`, because the test is `n > 10`. Once the first branch has been checked, the line below it does not need a condition of its own: anything still running is automatically 'not big'.",
  },
  takeaway:
    'Indentation decides *when* a line runs, and inside a function that decides whether it runs at all. A `return` tucked inside the `if` can only be reached on a pass that already returned, so the other cases fall off the end of the function and the caller gets `None`. The "everything else" answer goes at the same indentation as the `if`, one level in from `def`, and it needs no condition, because `return` already ended every other case.',
};

const argumentOrder: Experiment = {
  id: 't04-x3',
  title: 'Which value lands in which parameter',
  intro:
    'A ferry trip costs $5 per adult and $2 per child. Change the values in the call and watch the table: it shows what each parameter is holding when the function does its sum.',
  template:
    'def trip_cost(adults, children):\n    """Return the cost of the trip in dollars."""\n    return adults * 5 + children * 2\n\nprint(trip_cost(⟦call⟧))\n',
  knobs: [
    {
      id: 'call',
      label: 'call the function with',
      choices: [
        { value: '2, 3', caption: '2, 3' },
        { value: '3, 2', caption: '3, 2' },
        { value: '2', caption: 'just 2' },
        { value: '2, 3, 1', caption: '2, 3, 1' },
      ],
    },
  ],
  watch: ['adults', 'children'],
  anchorLine: 3,
  notes: {
    '0': 'Two adults and three children: $16. The table shows why. The first value went to the first parameter and the second value to the second, purely because of where they sat in the brackets.',
    '1': 'The same two numbers, swapped, and a different price: $19. Nothing about the numbers says which is which, so writing them in the wrong order gives a wrong answer with no error message at all. This is the dangerous one.',
    '2': 'Stopped, and the message names the parameter it never got: `children`. Python will not fill a missing parameter with 0 or with nothing; it refuses to run the function at all, so the table stays empty.',
    '3': 'Stopped again, counting for you: two wanted, three given. Nothing runs, so again there is no row in the table. An argument-count message points at the call line, not at the `def`.',
  },
  takeaway:
    'Arguments are matched to parameters by **position**, not by name or meaning. Too few or too many and Python stops before the function body runs, and the message tells you which parameter is missing or how many were expected. The wrong *order*, though, is not an error: the function runs perfectly and returns a confidently wrong number. That is why the parameter names in the `def` line matter, and why the docstring should say what each one is.',
};

export const experiments: Experiment[] = [returnOrPrint, whereTheReturnGoes, argumentOrder];
