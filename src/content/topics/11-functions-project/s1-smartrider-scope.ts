import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't11-s1',
  title: 'SmartRider balance helpers',
  story: md(
    'Mei is writing small helper functions for a Transperth SmartRider fare calculator: pay a fare, count tap-ons, and work out a balance after a day of trips.',
    'Each helper keeps surprising her by which variables it can see and which ones it can change.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 predict
    {
      id: 't11-s1-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      choice: true,
      title: 'Paying a fare',
      prompt: "Mei's `pay_fare` helper takes the balance as a parameter. Choose exactly what this program prints.",
      code: `balance = 20.0


def pay_fare(balance, fare):
    balance = balance - fare
    return balance


pay_fare(balance, 4.5)
print(balance)
balance = pay_fare(balance, 4.5)
print(balance)`,
      mutants: [
        {
          code: `balance = 20.0


def pay_fare(fare):
    global balance
    balance = balance - fare
    return balance


pay_fare(4.5)
print(balance)
balance = pay_fare(4.5)
print(balance)`,
          mistake: 'scope_confusion',
        },
        {
          code: `balance = 20.0


def pay_fare(balance, fare):
    balance = balance - fare
    return balance


print(pay_fare(balance, 4.5))
print(balance)
balance = pay_fare(balance, 4.5)
print(balance)`,
          mistake: 'print_vs_return',
        },
      ],
      concepts: ['local-scope', 'parameters', 'return-value'],
      detects: ['scope_confusion', 'print_vs_return'],
      expectedSec: 90,
      hints: [
        'Inside `pay_fare`, `balance` is the parameter. Is that the same variable as the `balance` on line 1?',
        'A parameter is a new local name that starts with the value passed in. Changing it inside the function changes only the local name. The outer variable changes only when a line outside the function assigns to it.',
        'Line 9 calls the function and throws the returned 15.5 away. Line 11 stores the returned value in the outer `balance`.',
      ],
      solution: {
        explanation: md(
          '1. Line 1 sets the outer `balance` to `20.0`.',
          '2. Line 9 calls `pay_fare(20.0, 4.5)`. Inside the call, the parameter `balance` is a separate local variable. It becomes `15.5` and is returned, but line 9 does not store the result, so it is lost.',
          '3. Line 10 prints the outer `balance`, which nothing has changed: `20.0`.',
          '4. Line 11 calls the function again with `20.0` and **assigns** the returned `15.5` to the outer `balance`.',
          '5. Line 12 prints `15.5`.',
          '',
          'A bare call like line 9 shows nothing in a program. Only a call typed at the Thonny shell prompt has its returned value echoed.',
        ),
      },
      selfExplain: 'Why does line 10 print 20.0 even though the function set balance to 15.5?',
    },

    // ---------------------------------------------------------------- q2 errorTranslator
    {
      id: 't11-s1-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'Counting tap-ons',
      prompt: 'Mei wants `tap_on` to add one to the day\'s tap count. The program prints its first line and then crashes. Click the line that raised the error, choose the exception type, then choose the cause and fix.',
      code: `taps = 0


def tap_on():
    taps = taps + 1
    return taps


print('Tap on at Elizabeth Quay Bus Station')
tap_on()
print('Taps today:', taps)`,
      exceptionOptions: ['NameError', 'UnboundLocalError', 'TypeError', 'ValueError'],
      causes: [
        {
          id: 'a',
          correct: true,
          text: 'Because `tap_on` assigns to `taps`, Python treats `taps` as a local variable for the whole function, so `taps + 1` reads a local that has no value yet. Pass the count in and return the new count: `def tap_on(taps): return taps + 1`, then call it as `taps = tap_on(taps)`.',
        },
        {
          id: 'b',
          mistake: 'scope_confusion',
          text: 'The crash is on the last line: `tap_on()` changed a copy of `taps`, so `print` cannot find it. Store the result with `taps = tap_on()` and the program works.',
        },
        {
          id: 'c',
          mistake: 'global_state',
          text: 'A function can never read a variable created outside it, so every outside variable needs `global` before it is used. Add `global taps` as the first line of every function that uses `taps`.',
        },
      ],
      concepts: ['local-scope', 'unbound-local-error', 'pass-in-return-out'],
      detects: ['scope_confusion', 'global_state'],
      expectedSec: 150,
      hints: [
        'The program printed its first line, so lines 1 to 9 were fine. The error happens during the call on line 10. Which line inside the function runs first?',
        'Python decides which names are local before the function runs: any name that is assigned anywhere in the function is local everywhere in it. Reading a local before it has been given a value raises an error. Reading an outer variable you never assign to is allowed.',
        'The error is raised on `taps = taps + 1`. The fix passes the count in as a parameter and stores the returned value outside: `taps = tap_on(taps)`.',
      ],
      solution: {
        explanation: md(
          '1. Line 1 creates the outer `taps`. Lines 4-6 define `tap_on`, and line 9 prints the first message.',
          '2. Line 10 calls `tap_on()`. Because line 5 **assigns** to `taps`, Python has already decided that `taps` is local to `tap_on`. The right-hand side `taps + 1` tries to read that local before it has a value.',
          "3. Python raises `UnboundLocalError: cannot access local variable 'taps' where it is not associated with a value` on line 5. It is a special kind of `NameError`, but the name shown in the traceback is `UnboundLocalError`.",
          '4. The fix that follows the CITS1401 style is to pass data in and return data out:',
          '',
          '```python',
          'def tap_on(taps):',
          '    return taps + 1',
          '',
          'taps = tap_on(taps)',
          '```',
          '',
          'Option (b) blames the wrong line: the crash happens inside the function before anything is returned. Option (c) is wrong about reading: a function **can** read an outer variable it never assigns to. `global taps` would stop the crash, but a function that changes global variables is harder to test and is poor style in project code.',
        ),
      },
      selfExplain: 'If line 5 were print(taps + 1) instead, would the program still crash? Why?',
    },

    // ---------------------------------------------------------------- q3 fixBug
    {
      id: 't11-s1-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'A day of trips',
      prompt: md(
        '`balance_after_trips(balance, fares, concession=False)` should return the SmartRider balance after paying every fare in `fares`, in order, rounded to 2 decimal places. With `concession=True` each fare is halved. The balance may go below zero.',
        '',
        'For example, `balance_after_trips(20.0, [3.2, 4.5])` should return `12.3`, but it returns `20.0`. Fix the bug by changing one line.',
      ),
      buggy: `def apply_fare(balance, fare, concession):
    """Return the balance after paying one fare (half price for a concession)."""
    if concession:
        fare = fare / 2
    return balance - fare


def balance_after_trips(balance, fares, concession=False):
    """Return the balance after paying each fare in fares, rounded to 2 dp."""
    for fare in fares:
        apply_fare(balance, fare, concession)
    return round(balance, 2)`,
      bugMistake: 'scope_confusion',
      maxChangedLines: 1,
      fnName: 'balance_after_trips',
      tests: [
        { id: 'v1', call: 'balance_after_trips(20.0, [3.2, 4.5])', expect: '12.3', cmp: 'float', label: 'two adult fares', hidden: false, tag: 'scope_confusion' },
        { id: 'v2', call: 'balance_after_trips(10.0, [])', expect: '10.0', cmp: 'float', label: 'no trips', hidden: false },
        { id: 'h1', call: 'balance_after_trips(10.0, [3.2, 3.2], True)', expect: '6.8', cmp: 'float', label: 'concession fares', hidden: true, tag: 'scope_confusion' },
        { id: 'h2', call: 'balance_after_trips(5.0, [2.5, 2.5, 2.5])', expect: '-2.5', cmp: 'float', label: 'balance goes negative', hidden: true, tag: 'scope_confusion' },
        { id: 'h3', call: 'balance_after_trips(15.75, [4.9], concession=False)', expect: '10.85', cmp: 'float', label: 'one fare, keyword argument', hidden: true },
      ],
      concepts: ['helper-functions', 'return-value', 'default-parameters', 'local-scope'],
      detects: ['scope_confusion'],
      expectedSec: 180,
      hints: [
        '`apply_fare` works. Look at what happens to the value it returns each time the loop calls it.',
        'Changing `balance` inside `apply_fare` never changes the `balance` in `balance_after_trips`; they are separate local variables. The only way a result gets out of a function is `return`, and the caller has to store it.',
        'The call inside the loop should start with `balance = `.',
      ],
      solution: {
        code: `def apply_fare(balance, fare, concession):
    """Return the balance after paying one fare (half price for a concession)."""
    if concession:
        fare = fare / 2
    return balance - fare


def balance_after_trips(balance, fares, concession=False):
    """Return the balance after paying each fare in fares, rounded to 2 dp."""
    for fare in fares:
        balance = apply_fare(balance, fare, concession)
    return round(balance, 2)`,
        explanation: md(
          '1. `apply_fare` gets the three values in its own parameters, which are local names, and **returns** the new balance.',
          '2. In the buggy loop the returned value is thrown away, so `balance` in `balance_after_trips` never changes and the function returns the starting balance.',
          '3. `balance = apply_fare(balance, fare, concession)` stores each new balance, so the next trip is paid from it.',
          '4. `concession=False` is a default parameter: callers can leave it out for adult fares or pass `True` (by position or as `concession=True`) for concession fares.',
          '5. Rounding happens once, on the final value. Float subtraction can leave tiny errors (two concession fares of 1.6 from 10.0 give `6.800000000000001`), and rounding at the end tidies them without rounding any value that is used again.',
        ),
      },
      selfExplain: 'Why does halving fare inside apply_fare not change the fares list in balance_after_trips?',
    },

    // ---------------------------------------------------------------- q4 cloze
    {
      id: 't11-s1-q4',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Seats on the Rottnest ferry',
      prompt: md(
        'Mei writes the same style of helper for the Rottnest ferry booking desk. Every sailing carries the same number of seats, so the capacity sits at the top of the file as a constant that no function changes.',
        '',
        '- `seats_left(booked)` returns how many seats are still free on a sailing.',
        '- `book(booked, group)` returns the new booked total, or the booked total unchanged when the group does not fit. A group that fills the sailing exactly does fit.',
        '',
        'Fill the three gaps. Nothing is printed, and no name outside the functions changes.',
      ),
      template: `SEATS = 480


def seats_left(booked):
    """Return how many seats are still free on a sailing."""
    return ⟦1⟧ - booked


def book(booked, group):
    """Return the new booked total, or the old total when the group does not fit."""
    if group > ⟦2⟧:
        return booked
    booked = booked + group
    return ⟦3⟧`,
      blanks: [
        { id: '1', accept: ['SEATS'] },
        { id: '2', accept: ['seats_left(booked)', 'SEATS - booked'] },
        { id: '3', accept: ['booked'] },
      ],
      fnName: 'book',
      tests: [
        { id: 'v1', call: 'seats_left(100)', expect: '380', label: '100 seats sold', hidden: false },
        { id: 'v2', call: 'book(470, 5)', expect: '475', label: 'a group that fits', hidden: false },
        { id: 'h1', call: 'book(470, 20)', expect: '470', label: 'a group larger than the space left', hidden: true },
        { id: 'h2', call: 'book(0, 480)', expect: '480', label: 'a group that fills the sailing exactly', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'seats_left(480)', expect: '0', label: 'a full sailing', hidden: true },
        { id: 'h4', call: 'book(480, 1)', expect: '480', label: 'one more passenger on a full sailing', hidden: true },
      ],
      concepts: ['local-scope', 'module-constant', 'helper-functions', 'return-value'],
      detects: ['scope_confusion', 'forgot_to_call', 'off_by_one_range'],
      expectedSec: 180,
      hints: [
        'Each gap needs a value that already exists somewhere: one at the top of the file, one that another function works out, and one that the line above has just produced.',
        'A function may read a name defined at the top of the file as long as it never assigns to that name, so gap 1 is the capacity itself. Gap 2 is the space left on this sailing, which `seats_left` already returns for a given booked total. Gap 3 is the total that the line above has just stored in the local `booked`.',
        md(
          '```python',
          '    if group > seats_left(booked):',
          '```',
        ),
      ],
      solution: {
        code: `SEATS = 480


def seats_left(booked):
    """Return how many seats are still free on a sailing."""
    return SEATS - booked


def book(booked, group):
    """Return the new booked total, or the old total when the group does not fit."""
    if group > seats_left(booked):
        return booked
    booked = booked + group
    return booked`,
        explanation: md(
          '1. `SEATS` is created once at the top of the file. `seats_left` only **reads** it, so no `global` is needed: a function can see a name from the file it lives in as long as it never assigns to that name.',
          '2. `return SEATS - booked` hands the answer back. Writing `print(SEATS - booked)` instead would show the number and return `None`, and `book` could not compare `None` with a group size.',
          '3. In `book`, gap 2 asks how much room this sailing has. `seats_left(booked)` reuses the helper rather than repeating the subtraction. Writing `seats_left` without brackets stores the function itself, and comparing a group size with a function raises `TypeError`.',
          '4. The comparison is `>` and not `>=`: a group of exactly 480 on an empty sailing fills it and is allowed.',
          '5. `booked = booked + group` changes only the local parameter. Gap 3 returns that local total, so the desk can store it. `booked + group` there would add the group a second time, and test v2 would give 480 instead of 475.',
          '',
          '`SEATS - booked` is also accepted in gap 2, but calling the helper means the capacity rule is written once.',
        ),
      },
      selfExplain: 'Line 13 assigns to booked. Why does that not change the variable the caller passed in?',
    },
  ],
};

export default scenario;
