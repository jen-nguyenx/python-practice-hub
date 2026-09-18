import type { Scenario } from '../../schema.ts';

const MON = 'kayak,minutes\nK12,45\nK03,30\nK12,60\n';
const TUE = 'kayak,minutes\nK07,25\nK02,40\n';

const s5: Scenario = {
  id: 't10-s5',
  title: 'Matilda Bay kayak hire',
  story:
    'The kayak shed at Matilda Bay writes down how long each hire lasted, in minutes, typed in by whoever is on the desk. ' +
    'Cancelled hires, dashes and half-written rows all end up in the log, and the end-of-day report has to survive every one of them.',
  questions: [
    {
      id: 't10-s5-q1',
      format: 'twins',
      diff: 'easy',
      core: true,
      title: 'Counting the hires that worked',
      prompt:
        'Two versions of the end-of-day tally. One line sits in a different place. Do they print the same thing? Then predict both outputs.',
      left: `hires = ['45', 'cancelled', '30']
total = 0
counted = 0
for entry in hires:
    try:
        total = total + int(entry)
        counted = counted + 1
    except ValueError:
        print('skipped', entry)
print(total, counted)`,
      right: `hires = ['45', 'cancelled', '30']
total = 0
counted = 0
for entry in hires:
    try:
        total = total + int(entry)
    except ValueError:
        print('skipped', entry)
    counted = counted + 1
print(total, counted)`,
      mistake: 'invalid_row_not_skipped',
      concepts: ['try-except', 'counting', 'skip-invalid-rows'],
      detects: ['invalid_row_not_skipped'],
      expectedSec: 110,
      hints: [
        'Both versions add up the same minutes. The question is how many hires each one believes it counted.',
        'When a line inside `try` raises, Python skips the **rest of the try block** and runs the matching `except` block. Afterwards it carries on with the next statement after the whole try/except.',
        'On the left, `counted = counted + 1` is inside the try, on the line below the one that failed. On the right it is outside the try/except, so nothing can stop it running.',
      ],
      solution: {
        explanation:
          "`int('45')` and `int('30')` work; `int('cancelled')` raises ValueError. Both versions print `skipped cancelled` once, and both end with `total` 75.\n\n" +
          'Left: `counted = counted + 1` is the next line inside the `try`. On the cancelled entry the line above it raised, so the rest of the try block is skipped and `counted` is not touched. It prints `75 2`.\n\n' +
          'Right: `counted = counted + 1` is part of the loop body, not the try block. It runs on every pass, including the one that failed, so a hire that was never counted in `total` is still counted in `counted`. It prints `75 3`.\n\n' +
          'The right-hand version would report an average of 25 minutes per hire instead of 37.5. Anything that must only happen when the conversion succeeded belongs inside the `try`, below the line that can fail.',
      },
      selfExplain: 'Where would you put counted = counted + 1 if the except block ended with continue?',
    },
    {
      id: 't10-s5-q2',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Total the minutes, skip the rest',
      prompt:
        'Put the lines in order to build `hire_minutes(entries)`, which returns the total number of minutes in `entries` as an **int**.\n\n' +
        '- `entries` is a list of strings typed at the desk, such as `[\'45\', \'cancelled\', \'30\']`.\n' +
        '- Skip any entry that `int()` cannot convert, and keep going with the rest.\n' +
        '- An empty list gives `0`.\n' +
        '- Do not change the list you were given.\n\n' +
        'Two of the lines on offer are not part of the answer.',
      lines: [
        { text: 'def hire_minutes(entries):', indent: 0 },
        { text: 'total = 0', indent: 1 },
        { text: 'for entry in entries:', indent: 1 },
        { text: 'try:', indent: 2 },
        { text: 'total = total + int(entry)', indent: 3 },
        { text: 'except ValueError:', indent: 2 },
        { text: 'continue', indent: 3 },
        { text: 'return total', indent: 1 },
      ],
      distractors: [
        { text: 'total = int(entry)', indent: 3, mistake: 'accumulator_init' },
        { text: 'break', indent: 3, mistake: 'invalid_row_not_skipped' },
      ],
      indentMatters: true,
      fnName: 'hire_minutes',
      tests: [
        {
          id: 'v1',
          call: "hire_minutes(['45', '30', '20'])",
          expect: '95',
          label: 'three good entries',
          hidden: false,
          tag: 'accumulator_init',
        },
        {
          id: 'v2',
          call: "hire_minutes(['45', 'cancelled', '30'])",
          expect: '75',
          label: 'a cancelled hire between two good ones',
          hidden: false,
          tag: 'invalid_row_not_skipped',
        },
        { id: 'h1', call: 'hire_minutes([])', expect: '0', label: 'nothing hired all day', hidden: true },
        {
          id: 'h2',
          call: "hire_minutes(['none', '-', ''])",
          expect: '0',
          label: 'every entry unusable, including an empty one',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        { id: 'h3', call: "hire_minutes(['60'])", expect: '60', label: 'a single hire', hidden: true },
        {
          id: 'h4',
          setup: "entries = ['15', 'x', '25']",
          call: 'hire_minutes(entries)',
          expect: '40',
          argsUnchanged: ['entries'],
          label: 'the list passed in is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['try-except', 'accumulator', 'skip-invalid-rows', 'continue'],
      detects: ['accumulator_init', 'invalid_row_not_skipped'],
      expectedSec: 240,
      hints: [
        'The `try` guards one line only: the conversion. Everything the function needs to remember across entries has to be set up before the loop starts.',
        'Plan: define the function, start the total at 0 before the loop, loop over the entries, try the conversion and add it to the total, and in the handler move on to the next entry. Return the total after the loop, not inside it.',
        '`total = total + int(entry)` goes inside the `try`. The handler is `except ValueError:` with `continue` under it, which means "this entry is no good, go to the next one".',
      ],
      solution: {
        code: `def hire_minutes(entries):
    total = 0
    for entry in entries:
        try:
            total = total + int(entry)
        except ValueError:
            continue
    return total`,
        explanation:
          '`total = 0` is above the loop. Inside the loop it would be reset on every entry and the function would only ever report the last hire.\n\n' +
          '`try:` wraps the one line that can raise. `int(entry)` raises ValueError for `cancelled`, `-` and `\'\'`, and when it does, the addition never happens, so a bad entry adds nothing.\n\n' +
          '`except ValueError:` names the exception it expects. A bare `except:` here would also swallow a misspelt variable name and leave you hunting for a bug that Python was ready to point at.\n\n' +
          '`continue` moves to the next entry. Because nothing follows it in the loop body, `pass` would behave the same way here; `continue` says what you mean, and keeps working if you add more lines to the loop later.\n\n' +
          '`break` would be the real mistake: it leaves the loop at the first bad entry, so `[\'45\', \'cancelled\', \'30\']` would give 45 and every hire after a typo would be lost.\n\n' +
          '`return total` is outside the loop, so the function only answers once it has seen every entry. The function reads `entries` and never changes it.',
      },
      selfExplain: 'Why is the function safe to run on a list whose entries are all unusable?',
    },
    {
      id: 't10-s5-q3',
      format: 'refactor',
      diff: 'hard',
      core: false,
      title: 'The except that hid everything',
      prompt:
        '`hire_report(filename)` reads a day of hires and returns a tuple `(count, average)`: how many hires were usable, and their mean length in minutes rounded to 1 decimal place. ' +
        'A day with no usable hire gives `(0, None)`. Each line of the file is a kayak id, a comma and the minutes; the header line and the half-written rows are skipped.\n\n' +
        'It gives the right answers, but it catches everything with a bare `except:` and leans on a second `try` to deal with an empty day.\n\n' +
        'Rewrite it so that:\n\n' +
        '- the `try` block holds only the line that can actually fail;\n' +
        '- the handler names the two exceptions this loop can meet, `IndexError` and `ValueError`;\n' +
        '- the empty day is handled by an `if` before the division instead of by catching `ZeroDivisionError`.\n\n' +
        'The returned values must not change.',
      code: `def hire_report(filename):
    with open(filename) as f:
        lines = f.readlines()
    total = 0
    count = 0
    for line in lines:
        try:
            parts = line.strip().split(',')
            total = total + int(parts[1])
            count = count + 1
        except:
            pass
    try:
        return (count, round(total / count, 1))
    except ZeroDivisionError:
        return (0, None)`,
      fnName: 'hire_report',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'hires_mon', content: MON }],
          call: "hire_report('hires_mon')",
          expect: '(3, 45.0)',
          cmp: 'float',
          label: 'three hires on Monday',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'hires_tue', content: TUE }],
          call: "hire_report('hires_tue')",
          expect: '(2, 32.5)',
          cmp: 'float',
          label: 'an average that is not a whole number',
          hidden: false,
        },
        {
          id: 'h1',
          files: [{ name: 'hires_wed', content: 'kayak,minutes\nK01,cancelled\nK04\n\nK09,50\nK02,10\n' }],
          call: "hire_report('hires_wed')",
          expect: '(2, 30.0)',
          cmp: 'float',
          label: 'a cancelled hire, a row with no minutes and a blank line',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'hires_thu', content: 'kayak,minutes\nK01,cancelled\n' }],
          call: "hire_report('hires_thu')",
          expect: '(0, None)',
          label: 'nobody made it onto the water',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h3',
          files: [{ name: 'hires_fri', content: 'kayak,minutes\nK05,20\nK06,25\nK08,32\n' }],
          call: "hire_report('hires_fri')",
          expect: '(3, 25.7)',
          cmp: 'float',
          label: 'an average that has to be rounded',
          hidden: true,
        },
        {
          id: 'h4',
          files: [{ name: 'hires_sat', content: '' }],
          call: "hire_report('hires_sat')",
          expect: '(0, None)',
          label: 'the shed never opened, so the file is empty',
          hidden: true,
          tag: 'no_graceful_exit',
        },
      ],
      mustRemove: ['bare_except'],
      mustAdd: ['early_return'],
      pattern: 'specific-except',
      concepts: ['specific-except', 'guard-clause', 'try-placement', 'skip-invalid-rows'],
      detects: ['bare_except', 'zero_division', 'invalid_row_not_skipped', 'no_graceful_exit'],
      expectedSec: 420,
      hints: [
        'A bare `except:` catches every exception there is, including the misspelt name you have not noticed yet. Work out which two exceptions the lines inside this try can actually raise, and what raises each one.',
        'Plan: move `parts = line.strip().split(\',\')` out of the try, since splitting a string cannot fail. Put only the conversion inside the try, storing it in a variable such as `minutes`, and let the handler `continue`. Add `total` and `count` below the try, where they run only when the conversion worked. Then replace the outer try with `if count == 0: return (0, None)` before the final return.',
        'The handler for both cases at once is `except (IndexError, ValueError):`. `IndexError` comes from `parts[1]` on a line with no comma, and `ValueError` from `int(\'cancelled\')` and from the header line.',
      ],
      solution: {
        code: `def hire_report(filename):
    with open(filename) as f:
        lines = f.readlines()
    total = 0
    count = 0
    for line in lines:
        parts = line.strip().split(',')
        try:
            minutes = int(parts[1])
        except (IndexError, ValueError):
            continue
        total = total + minutes
        count = count + 1
    if count == 0:
        return (0, None)
    return (count, round(total / count, 1))`,
        explanation:
          '**Only the risky line is guarded.** `line.strip().split(\',\')` always works on a string, so it moves above the `try`. What is left inside is `int(parts[1])`, which can raise `IndexError` (the row `K04` has no second field, and a blank line splits into `[\'\']`) or `ValueError` (the header `minutes`, and `cancelled`).\n\n' +
          '**The handler names both.** `except (IndexError, ValueError):` handles the two things that can really go wrong here and lets everything else through. Under the old bare `except:`, a typo such as `total = total + minuts` would have been swallowed silently and the report would have come out as `(0, None)` with no clue why.\n\n' +
          '**`continue` replaces `pass`.** Because the counting lines now sit below the try, the handler has to skip them; `continue` goes straight to the next line of the file.\n\n' +
          '**The count and total only move on a good row.** They run after the try, so they can only be reached when `int()` returned a value. That is the same behaviour as before, when they were the last lines inside the try.\n\n' +
          '**The empty day is an `if`, not an exception.** `if count == 0: return (0, None)` says what the rule is, right where a reader looks for it. Catching `ZeroDivisionError` around a `return` works, but it hides an ordinary business rule inside error handling and would also swallow a division by zero coming from anywhere else on that line.\n\n' +
          'Every test gives exactly what it gave before, including the empty file, which never enters the loop.',
      },
      selfExplain: 'The header line kayak,minutes is skipped by the same handler as a cancelled hire. What is the risk in relying on that?',
    },
  ],
};

export default s5;
