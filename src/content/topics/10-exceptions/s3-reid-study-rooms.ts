import type { Scenario } from '../../schema.ts';

const s3: Scenario = {
  id: 't10-s3',
  title: 'Reid Library study rooms',
  story:
    'Students book group study rooms in Reid Library at a kiosk that stores every booking as text. ' +
    'Cancelled bookings, typos and half-finished rows are all in there, and the weekly usage report has to cope with them.',
  questions: [
    {
      id: 't10-s3-q1',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'The first real room number',
      prompt:
        'The kiosk takes the first thing a student typed that is a room number. Type exactly what this program prints.',
      code: `def first_room(entries):
    for entry in entries:
        try:
            return int(entry)
        except ValueError:
            print('bad', entry)
    return None

print(first_room(['G12', '3.5', '204', '118']))
print(first_room(['none']))`,
      mutants: [
        {
          code: `def first_room(entries):
    for entry in entries:
        try:
            return int(float(entry))
        except ValueError:
            print('bad', entry)
    return None

print(first_room(['G12', '3.5', '204', '118']))
print(first_room(['none']))`,
          mistake: 'int_of_float_string',
        },
        {
          code: `def first_room(entries):
    for entry in entries:
        try:
            return int(entry)
        except ValueError:
            print('bad', entry)
            return None
    return None

print(first_room(['G12', '3.5', '204', '118']))
print(first_room(['none']))`,
          mistake: 'early_return_in_loop',
        },
      ],
      concepts: ['try-except', 'return-in-try', 'loop-flow'],
      detects: ['int_of_float_string', 'early_return_in_loop'],
      expectedSec: 150,
      hints: [
        'Follow the first call one entry at a time. After an except block finishes, where does Python go next?',
        '`return` inside `try` ends the whole function as soon as `int()` succeeds. When `int()` fails, the except block runs and the loop moves on to the next entry.',
        "`'G12'` and `'3.5'` both fail, so the first two lines are `bad G12` and `bad 3.5`.",
      ],
      solution: {
        explanation:
          "First call: `int('G12')` raises ValueError, so `bad G12` is printed and the loop continues. " +
          "`int('3.5')` also raises ValueError (text given to `int()` must be a whole number), so `bad 3.5`. " +
          "`int('204')` works, and `return` ends the function straight away with 204, so `'118'` is never looked at. Line 9 prints `204`.\n\n" +
          "Second call: `int('none')` fails, so `bad none` is printed. The loop has no more entries, so the function reaches `return None` and line 10 prints `None`.\n\n" +
          'Output:\n\n```\nbad G12\nbad 3.5\n204\nbad none\nNone\n```',
      },
      selfExplain: 'What would the first call return if the except block ended with return None?',
    },
    {
      id: 't10-s3-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'A week of cancellations',
      prompt:
        'The usage report works out the average hours per booking. The first report is fine, but the second one crashes after printing two lines. ' +
        'Click the line that raised the error, pick the exception, then pick the cause and the fix.',
      code: `def average_hours(bookings):
    total = 0
    count = 0
    for hours in bookings:
        try:
            total += float(hours)
            count += 1
        except ValueError:
            print('skipped', hours)
    return total / count

print(average_hours(['2', '1.5']))
print(average_hours(['cancelled', 'n/a']))`,
      exceptionOptions: ['ZeroDivisionError', 'ValueError', 'TypeError', 'IndexError'],
      causes: [
        {
          id: 'a',
          text:
            'Both bookings were skipped, so `count` is still 0 when the function divides. ' +
            'Fix: before the division, add `if count == 0:` and `return None` (or whatever the report should show for no bookings).',
          correct: true,
        },
        {
          id: 'b',
          text:
            '`except ValueError` does not catch this kind of error. ' +
            'Fix: change it to a bare `except:` so that every error is handled.',
          mistake: 'bare_except',
        },
        {
          id: 'c',
          text:
            '`count` starts at 0, which is the problem. ' +
            'Fix: start it at `count = 1` so there is always something to divide by.',
          mistake: 'accumulator_init',
        },
      ],
      concepts: ['traceback', 'zero-division-guard', 'try-placement'],
      detects: ['zero_division', 'bare_except', 'accumulator_init'],
      expectedSec: 150,
      hints: [
        'The error is not raised inside the try block. Look at which line runs after the loop has skipped every booking.',
        'In the second call both conversions fail, so neither `total` nor `count` changes. What is `0 / 0` in Python?',
        'The error is raised inside the function, on the line that divides, not on line 13 where the function was called. Which exception does Python raise when you divide by 0?',
      ],
      solution: {
        explanation:
          'First call: both values convert, total is 3.5 and count is 2, so it prints `1.75`.\n\n' +
          "Second call: `float('cancelled')` and `float('n/a')` both raise ValueError, so the handler prints `skipped cancelled` and `skipped n/a`. " +
          '`count += 1` is skipped each time because the line above it failed.\n\n' +
          'After the loop, line 10 runs `total / count`, which is `0 / 0`, and Python raises `ZeroDivisionError: division by zero`. ' +
          'The traceback points at line 10 inside `average_hours`, below line 13, the line that called it.\n\n' +
          'The try/except only protects the lines inside it, so a bare except would not help. Starting `count` at 1 would stop the crash but make every average wrong (the first call would give about 1.17 instead of 1.75). ' +
          'The right fix is a guard before dividing:\n\n' +
          '```python\nif count == 0:\n    return None\nreturn total / count\n```',
      },
      selfExplain: 'The crash begins with the call on line 13. Why is line 10, not line 13, the line that raised the error?',
    },
    {
      id: 't10-s3-q3',
      format: 'testWriter',
      diff: 'hard',
      core: false,
      title: 'Break the hours counter',
      prompt:
        'Two versions of `total_hours` were submitted for the weekly report. One is correct and one is secretly buggy. ' +
        'Enter an argument tuple that makes the two versions give different results (or makes one crash). You cannot see the code, only the spec.',
      fnName: 'total_hours',
      spec:
        "`total_hours(rows)` takes a list of booking rows such as `'Aroha,2.5'` (student name, a comma, then hours booked) and returns the total hours as a float.\n\n" +
        "- A row with no hours part (for example `'Aroha'`) is skipped.\n" +
        "- A row whose hours are not a number (for example `'Aroha,cancelled'`) is skipped.\n" +
        '- Every other row still counts, wherever it appears in the list.\n' +
        '- An empty list gives `0.0`.',
      reference: `def total_hours(rows):
    total = 0.0
    for row in rows:
        parts = row.split(',')
        try:
            total += float(parts[1])
        except (IndexError, ValueError):
            pass
    return total`,
      buggy: `def total_hours(rows):
    total = 0.0
    try:
        for row in rows:
            parts = row.split(',')
            total += float(parts[1])
    except (IndexError, ValueError):
        pass
    return total`,
      bugMistake: 'invalid_row_not_skipped',
      argsExample: "(['Aroha,2.5', 'Ben,1'],)",
      concepts: ['try-placement', 'edge-cases', 'skip-invalid-rows'],
      detects: ['invalid_row_not_skipped'],
      expectedSec: 360,
      hints: [
        'Go through the spec one bullet at a time and write an input that checks each bullet. Which bullet is the easiest to get wrong?',
        'A bad row on its own, or a bad row at the end, only tests that bad rows are skipped. The spec also says the other rows still count *wherever they appear*. What sits after the bad row matters.',
        "Try a list where a bad row comes first and a good row comes after it, such as `(['Aroha,cancelled', ...],)`.",
      ],
      solution: {
        code: "(['Aroha,cancelled', 'Ben,2'],)",
        explanation:
          "`(['Aroha,cancelled', 'Ben,2'],)` exposes the bug. The correct version skips the cancelled row and still adds Ben's 2 hours, giving `2.0`. " +
          'The buggy version has its try/except around the whole loop, so the ValueError from `cancelled` jumps out of the loop and Ben is never counted: it returns `0.0`.\n\n' +
          "`(['Aroha', 'Ben,2'],)` works too, because the IndexError also ends the buggy loop early.\n\n" +
          "Inputs such as `([],)`, `(['Aroha,cancelled'],)` or `(['Ben,2', 'Aroha'],)` give the same answer from both versions, because nothing valid comes after the bad row. " +
          'When you test code that skips bad rows, always put a good row after a bad one.',
      },
      selfExplain: 'What change to the buggy version would make it match the reference?',
    },
  ],
};

export default s3;
