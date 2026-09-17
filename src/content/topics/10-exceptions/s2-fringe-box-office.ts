import type { Scenario } from '../../schema.ts';

const s2: Scenario = {
  id: 't10-s2',
  title: 'Fringe World box office',
  story:
    'Volunteers at the Fringe World box office in Northbridge type how many tickets each customer buys. ' +
    'They are quick, not careful: `two`, `2.0`, blank entries and the odd `0` all end up in the system, and the takings still have to add up.',
  questions: [
    {
      id: 't10-s2-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Pick the right handler',
      prompt:
        "`ticket_count(typed)` turns what a volunteer typed into a number. When someone types `2.0`, the `int()` line crashes. " +
        'You want the function to return `0` for text like that, but you still want to *see* a crash if the code itself has a bug, such as a misspelt name. ' +
        'Which line should fill the gap?',
      code: `def ticket_count(typed):
    try:
        return int(typed)
    ______________
        return 0`,
      options: [
        {
          id: 'a',
          text: 'except ValueError:',
          correct: true,
          why:
            "`int('2.0')` raises `ValueError: invalid literal for int() with base 10: '2.0'`. " +
            'Naming ValueError catches exactly that problem, while a typo such as `imt(typed)` still raises NameError and shows up.',
        },
        {
          id: 'b',
          text: 'except:',
          mistake: 'bare_except',
          why:
            'A bare `except:` does return 0 for `2.0`, but it catches every error. ' +
            'If the code had a typo, every call would quietly return 0 and you would never find out why the takings were wrong.',
        },
        {
          id: 'c',
          text: 'except TypeError:',
          mistake: 'type_error_other',
          why:
            "TypeError means a value of the wrong *type*, such as `int(None)` or `'2' + 1`. " +
            "`'2.0'` is a string, which `int()` accepts; it is the *content* that is wrong, so Python raises ValueError and this handler does not catch it.",
        },
        {
          id: 'd',
          text: "No handler is needed, because int('2.0') returns 2",
          mistake: 'int_of_float_string',
          why:
            '`int(2.0)` with a float gives 2, but a string passed to `int()` must look like a whole number. ' +
            "`int('2.0')` raises ValueError. You could write `int(float(typed))` if decimals were allowed.",
        },
      ],
      concepts: ['specific-except', 'value-error', 'int-conversion'],
      detects: ['bare_except', 'type_error_other', 'int_of_float_string'],
      expectedSec: 60,
      hints: [
        'Work out the exact exception `int(\'2.0\')` raises first. Then ask which handler catches *only* that.',
        'ValueError: the type is right but the content is wrong. TypeError: the type itself is wrong. A bare except catches both, and every other error too.',
        "`int('2.0')` gives `ValueError: invalid literal for int() with base 10: '2.0'`.",
      ],
      solution: {
        explanation:
          "`int('2.0')` raises ValueError, because text given to `int()` must look like a whole number.\n\n" +
          '`except ValueError:` catches that one problem and returns 0.\n\n' +
          '`except:` would also return 0, but it hides every other error, including bugs in your own code.\n\n' +
          '`except TypeError:` names the wrong exception, so the crash still happens.',
      },
      selfExplain: 'Name one mistake in your own code that a bare except would hide.',
    },
    {
      id: 't10-s2-q2',
      format: 'multi',
      diff: 'medium',
      core: false,
      title: 'Keep counting after a bad entry',
      prompt:
        "`sales` holds what the volunteers typed for each sale: `['3', 'two', '5', '']`. " +
        'Select **every** version that, for this list, adds the valid counts into `total` (giving 8), skips the bad entries and keeps going to the end of the list without crashing.',
      options: [
        {
          id: 'a',
          text: `total = 0
for s in sales:
    try:
        total += int(s)
    except ValueError:
        pass`,
          correct: true,
          why:
            "The try is inside the loop. `int('two')` raises ValueError, the handler does nothing, and the loop moves on to `'5'`. Total 8.",
        },
        {
          id: 'b',
          text: `total = 0
try:
    for s in sales:
        total += int(s)
except ValueError:
    pass`,
          correct: false,
          mistake: 'invalid_row_not_skipped',
          why:
            "The try wraps the whole loop. When `'two'` fails, Python jumps out of the loop to the except block and never comes back, so `'5'` is never added. Total 3.",
        },
        {
          id: 'c',
          text: `total = 0
for s in sales:
    if s.isdigit():
        total += int(s)`,
          correct: true,
          why:
            "Checking first also works for this list. `'two'.isdigit()` and `''.isdigit()` are both False, so only 3 and 5 are added. Total 8. Be careful with it in general: `isdigit()` is also False for `' 4'` and `'-3'`, which `int()` accepts, so `try` with `int()` is often the safer check.",
        },
        {
          id: 'd',
          text: `total = 0
for s in sales:
    try:
        total += int(s)
    except TypeError:
        pass`,
          correct: false,
          mistake: 'type_error_other',
          why:
            "`int('two')` raises ValueError, not TypeError. No handler matches, so the program crashes on the second entry.",
        },
        {
          id: 'e',
          text: `total = 0
for s in sales:
    try:
        count = int(s)
    except ValueError:
        count = 0
    total += count`,
          correct: true,
          why:
            'A bad entry is given the value 0, so it adds nothing, and the loop carries on. Total 8. Setting `count` in the except block also means the last line never uses an old or undefined value.',
        },
      ],
      concepts: ['try-placement', 'specific-except', 'validation'],
      detects: ['invalid_row_not_skipped', 'type_error_other'],
      expectedSec: 180,
      hints: [
        "Trace each version with `['3', 'two', '5', '']`. Where does Python go when `int('two')` fails, and does it ever come back to the loop?",
        'A try around the whole loop leaves the loop on the first error. An except that names a different exception does not catch anything. Checking before converting can work as well as catching.',
        'Three versions reach a total of 8.',
      ],
      solution: {
        explanation:
          '**(a) correct.** Try inside the loop: each bad entry is handled on its own pass.\n\n' +
          '**(b) wrong.** Try around the loop: the first error ends the loop, so the total is 3.\n\n' +
          '**(c) correct.** `isdigit()` filters out the bad entries before `int()` runs.\n\n' +
          '**(d) wrong.** `int(\'two\')` raises ValueError, which `except TypeError` does not catch, so it crashes.\n\n' +
          '**(e) correct.** A bad entry counts as 0 and the loop continues.',
      },
      selfExplain: 'Which version would you change if valid entries could be negative, like a refund of -2 tickets, and why?',
    },
    {
      id: 't10-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Validate a ticket entry',
      prompt:
        'Write `parse_tickets(typed)`. A customer can buy from 1 to 10 tickets.\n\n' +
        '- If `typed` is a whole number from 1 to 10, return it as an **int**. Spaces around the number are fine (`\' 7 \'` gives `7`).\n' +
        "- Otherwise return `None`. That includes words, blank text, decimals such as `'2.5'` or `'2.0'`, zero, negatives and anything over 10.\n\n" +
        'The function must never crash on a string, and must not print anything.',
      fnName: 'parse_tickets',
      starter: `def parse_tickets(typed):
    """Return typed as an int from 1 to 10, or None if it is not valid."""
    pass
`,
      tests: [
        { id: 'v1', call: "parse_tickets('4')", expect: '4', label: "'4'", hidden: false },
        { id: 'v2', call: "parse_tickets('two')", expect: 'None', label: "'two'", hidden: false, tag: 'no_graceful_exit' },
        { id: 'v3', call: "parse_tickets(' 10 ')", expect: '10', label: "' 10 ' with spaces", hidden: false },
        { id: 'h1', call: "parse_tickets('2.5')", expect: 'None', label: 'a decimal', hidden: true, tag: 'int_of_float_string' },
        { id: 'h2', call: "parse_tickets('')", expect: 'None', label: 'blank entry', hidden: true, tag: 'no_graceful_exit' },
        { id: 'h3', call: "parse_tickets('0')", expect: 'None', label: 'zero', hidden: true },
        { id: 'h4', call: "parse_tickets('11')", expect: 'None', label: 'just over the limit', hidden: true },
        { id: 'h5', call: "parse_tickets('-3')", expect: 'None', label: 'negative', hidden: true },
        { id: 'h6', call: "parse_tickets('1')", expect: '1', label: 'smallest valid', hidden: true },
        { id: 'h7', call: "parse_tickets('2.0')", expect: 'None', label: "'2.0'", hidden: true, tag: 'int_of_float_string' },
      ],
      solution: {
        code: `def parse_tickets(typed):
    """Return typed as an int from 1 to 10, or None if it is not valid."""
    try:
        count = int(typed)
    except ValueError:
        return None
    if count < 1 or count > 10:
        return None
    return count
`,
        explanation:
          '`int(typed)` is the only line that can fail, so it is the only line inside `try`. `int()` already ignores spaces around the number.\n\n' +
          "For words, blank text and decimals (`'2.5'`, `'2.0'`), `int()` raises ValueError, and the handler returns `None` straight away.\n\n" +
          'If the conversion worked, `count` is an int. The range check handles 0, negatives and numbers over 10, which convert without any error but are still not valid.\n\n' +
          "Only then does the function return the number. Using `int(float(typed))` would wrongly accept `'2.5'` as 2.",
      },
      hints: [
        'There are two different ways an entry can be invalid: it does not convert to an int at all, or it converts but is out of range. Handle them separately.',
        'Plan: try to convert with `int()`; if that raises ValueError, return None. After the try/except, check the range and return None if it is outside 1 to 10. Otherwise return the number.',
        '```python\ntry:\n    count = int(typed)\nexcept ValueError:\n    return None\n```',
      ],
      concepts: ['try-except', 'validation', 'int-conversion', 'return-none'],
      detects: ['no_graceful_exit', 'int_of_float_string', 'bare_except', 'print_vs_return'],
      expectedSec: 240,
      selfExplain: "Why does '0' need the range check when 'two' is already handled by the except block?",
    },
    {
      id: 't10-s2-q4',
      format: 'write',
      kind: 'program',
      diff: 'hard',
      core: false,
      title: 'End-of-shift tally',
      prompt:
        'Write a **program** (no function needed) that a volunteer runs at the end of a shift.\n\n' +
        "1. Read one entry at a time with `input('Tickets: ')` until the volunteer types `done`.\n" +
        '2. A valid entry is a whole number of at least 1 (spaces around it are fine, as `int()` allows). Count it and add it to the total.\n' +
        '3. For any other entry, print `Skipped:` and the entry, for example `Skipped: two`, then keep reading.\n' +
        '4. After `done`, print `Sales:` and the number of valid entries, then `Average:` and the mean tickets per sale rounded to 1 decimal place.\n' +
        '5. If there were no valid entries, print only `No valid sales` instead of those two lines. The program must not crash.\n\n' +
        'Example run (the tests show each typed entry after its prompt):\n\n' +
        '```\nTickets: 3\nTickets: two\nSkipped: two\nTickets: 5\nTickets: 0\nSkipped: 0\nTickets: done\nSales: 2\nAverage: 4.0\n```',
      starter: `# Read ticket counts until the volunteer types done.
`,
      tests: [
        {
          id: 'v1',
          stdin: ['3', 'two', '5', '0', 'done'],
          expectStdout: 'Tickets: 3\nTickets: two\nSkipped: two\nTickets: 5\nTickets: 0\nSkipped: 0\nTickets: done\nSales: 2\nAverage: 4.0\n',
          label: 'the example run',
          hidden: false,
        },
        {
          id: 'v2',
          stdin: ['done'],
          expectStdout: 'Tickets: done\nNo valid sales\n',
          label: 'done straight away',
          hidden: false,
          tag: 'zero_division',
        },
        {
          id: 'h1',
          stdin: ['2.5', '1', '2', 'done'],
          expectStdout: 'Tickets: 2.5\nSkipped: 2.5\nTickets: 1\nTickets: 2\nTickets: done\nSales: 2\nAverage: 1.5\n',
          label: 'a decimal entry',
          hidden: true,
          tag: 'int_of_float_string',
        },
        {
          id: 'h2',
          stdin: ['x', '-1', 'n/a', 'done'],
          expectStdout: 'Tickets: x\nSkipped: x\nTickets: -1\nSkipped: -1\nTickets: n/a\nSkipped: n/a\nTickets: done\nNo valid sales\n',
          label: 'every entry is bad',
          hidden: true,
          tag: 'zero_division',
        },
        {
          id: 'h3',
          stdin: ['1', '2', '2', 'done'],
          expectStdout: 'Tickets: 1\nTickets: 2\nTickets: 2\nTickets: done\nSales: 3\nAverage: 1.7\n',
          label: 'average needs rounding',
          hidden: true,
        },
        {
          id: 'h4',
          stdin: [' 6 ', '10', 'done'],
          expectStdout: 'Tickets:  6 \nTickets: 10\nTickets: done\nSales: 2\nAverage: 8.0\n',
          label: 'spaces around a number',
          hidden: true,
        },
      ],
      solution: {
        code: `count = 0
total = 0
entry = input('Tickets: ')
while entry != 'done':
    try:
        tickets = int(entry)
    except ValueError:
        tickets = 0
    if tickets >= 1:
        count += 1
        total += tickets
    else:
        print('Skipped:', entry)
    entry = input('Tickets: ')

if count == 0:
    print('No valid sales')
else:
    print('Sales:', count)
    print('Average:', round(total / count, 1))
`,
        explanation:
          '**Sentinel loop.** Read the first entry before the loop and read the next one as the last line of the loop body, so `done` is checked before it is ever converted.\n\n' +
          "**Convert safely.** `int(entry)` is the only line in `try`. For `two`, `2.5` or `n/a` it raises ValueError, and the handler sets `tickets = 0` so the next check treats the entry as invalid.\n\n" +
          '**One check for every invalid case.** `tickets >= 1` is False for 0, negatives and the failed conversions, so they all print `Skipped:` with the original text.\n\n' +
          '**Guard the division.** If nothing valid was entered, `count` is 0 and `total / count` would raise ZeroDivisionError, so that case prints `No valid sales` instead.\n\n' +
          '**Round only when printing.** `round(total / count, 1)` gives `4.0`, and `print` puts one space after `Average:`.',
      },
      hints: [
        'Three separate jobs: a loop that stops at `done`, a safe conversion for each entry, and a final report that cannot divide by zero.',
        'Plan: set count and total to 0. Read an entry. While it is not `done`: try `int()`, and in the except block mark the entry as invalid; if it is a valid count of at least 1, update count and total, otherwise print Skipped. Read the next entry at the bottom of the loop. After the loop, check count before dividing.',
        "```python\nentry = input('Tickets: ')\nwhile entry != 'done':\n    try:\n        tickets = int(entry)\n    except ValueError:\n        tickets = 0\n    ...\n    entry = input('Tickets: ')\n```",
      ],
      concepts: ['try-except', 'sentinel-loop', 'zero-division-guard', 'validation'],
      detects: ['zero_division', 'int_of_float_string', 'infinite_while', 'input_without_int', 'invalid_row_not_skipped'],
      expectedSec: 540,
      selfExplain: 'Why does the program read the next entry at the bottom of the loop instead of at the top?',
    },
  ],
};

export default s2;
