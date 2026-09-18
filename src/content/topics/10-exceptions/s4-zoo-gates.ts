import type { Scenario } from '../../schema.ts';

const s4: Scenario = {
  id: 't10-s4',
  title: 'Perth Zoo gate counts',
  story:
    'Staff on each Perth Zoo gate write down how many visitors came through in the last hour, and a tablet saves one line per hour to a text file. ' +
    'Some hours are typed as `n/a`, some lines are half finished, and on a quiet Sunday the file for a gate is never made at all.',
  questions: [
    {
      id: 't10-s4-q1',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'The handler that did not help',
      prompt:
        'This script reads the counts for one gate. It prints one line and then stops. ' +
        'Click the line that raised the error, pick the exception, then pick the cause and the fix.',
      code: `def read_counts(filename):
    """Return a list of the visitor counts in the file."""
    counts = []
    try:
        f = open(filename)
    except ValueError:
        return counts
    for line in f:
        counts.append(int(line))
    f.close()
    return counts


print('Reading the gate log')
print(read_counts('gate_log_sunday'))`,
      exceptionOptions: ['FileNotFoundError', 'ValueError', 'PermissionError', 'NameError'],
      causes: [
        {
          id: 'a',
          text:
            'There is no file called `gate_log_sunday`, so `open` fails. The handler names a different exception, so nothing catches this one and the program stops. ' +
            'Fix: `except FileNotFoundError:` and return the empty list.',
          correct: true,
        },
        {
          id: 'b',
          text:
            'A line of the file is not a whole number, so `int(line)` fails. ' +
            'Fix: move the `try` inside the `for` loop so that a bad line is skipped.',
          mistake: 'invalid_row_not_skipped',
        },
        {
          id: 'c',
          text:
            '`f.close()` is never reached when the file is empty, so Python refuses to open it again. ' +
            'Fix: open the file with `with open(filename) as f:` instead.',
          mistake: 'file_not_closed',
        },
      ],
      concepts: ['file-not-found', 'specific-except', 'graceful-exit'],
      detects: ['no_graceful_exit', 'invalid_row_not_skipped', 'file_not_closed'],
      expectedSec: 140,
      hints: [
        'The script never printed a list, so the loop never ran. What is the very first thing this function tries to do with the outside world?',
        'Two separate questions. First: which exception does `open` raise when there is no such file? Second: does the handler that is written there catch that exception, or only the one it names?',
        'A handler only catches the exception it names. `except ValueError:` is deaf to everything else, so the error travels out of the function and stops the program.',
      ],
      solution: {
        explanation:
          "Line 14 prints `Reading the gate log`. Line 15 then calls `read_counts('gate_log_sunday')`.\n\n" +
          'Inside the function, line 5 runs `open(filename)`. There is no file with that name, so Python raises ' +
          "`FileNotFoundError: [Errno 44] No such file or directory: 'gate_log_sunday'` on line 5.\n\n" +
          'The `try` was set up to catch `ValueError`, which is a different exception, so the handler on line 6 is skipped. ' +
          'Nothing else catches it, the function never returns, and the program stops before line 15 can print anything.\n\n' +
          'The other causes do not fit: the loop on line 8 never ran, so `int(line)` cannot be to blame, and an unclosed file does not stop a later `open`.\n\n' +
          'The fix names the exception that is actually raised:\n\n' +
          '```python\ntry:\n    f = open(filename)\nexcept FileNotFoundError:\n    return counts\n```\n\n' +
          'Now a missing gate log gives back an empty list and the report carries on.',
      },
      selfExplain: 'Why would a bare except: hide a misspelt file name rather than help with it?',
    },
    {
      id: 't10-s4-q2',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Where the error surfaces',
      prompt:
        'The queue times at two gates are added together. Type exactly what this program prints.',
      code: `def minutes(text):
    """Return a queue time in whole minutes."""
    return int(text)


def gate_wait(first, second):
    """Return the total wait across two gates."""
    return minutes(first) + minutes(second)


try:
    print(gate_wait('15', '20'))
    print(gate_wait('15', 'closed'))
    print('both gates measured')
except ValueError:
    print('a gate time was not a number')
print('report finished')`,
      mutants: [
        {
          // believes the try block carries on at the next line after the handler runs
          code: `def minutes(text):
    """Return a queue time in whole minutes."""
    return int(text)


def gate_wait(first, second):
    """Return the total wait across two gates."""
    return minutes(first) + minutes(second)


try:
    print(gate_wait('15', '20'))
except ValueError:
    print('a gate time was not a number')
try:
    print(gate_wait('15', 'closed'))
except ValueError:
    print('a gate time was not a number')
print('both gates measured')
print('report finished')`,
          mistake: 'invalid_row_not_skipped',
        },
        {
          // believes a handled exception still ends the program
          code: `def minutes(text):
    """Return a queue time in whole minutes."""
    return int(text)


def gate_wait(first, second):
    """Return the total wait across two gates."""
    return minutes(first) + minutes(second)


try:
    print(gate_wait('15', '20'))
    print(gate_wait('15', 'closed'))
    print('both gates measured')
except ValueError:
    print('a gate time was not a number')`,
          mistake: 'no_graceful_exit',
        },
      ],
      concepts: ['exception-propagation', 'try-except', 'call-stack'],
      detects: ['invalid_row_not_skipped', 'no_graceful_exit'],
      expectedSec: 150,
      hints: [
        "`int('closed')` raises inside `minutes`, which has no handler of its own. Where does the exception go next?",
        'An exception travels back along the calls until something catches it: `minutes`, then `gate_wait`, then the `try` block. Once a handler has run, the lines it skipped over inside the `try` do not get a second chance, but the program does carry on below the whole try/except.',
        'The first call prints `35`. The second one never prints anything, and neither does the line below it.',
      ],
      solution: {
        explanation:
          "`gate_wait('15', '20')` converts both times and returns 35, so the first line printed is `35`.\n\n" +
          "`gate_wait('15', 'closed')` calls `minutes('closed')`, and `int('closed')` raises ValueError. " +
          'Neither `minutes` nor `gate_wait` catches it, so it travels out of both calls to the `try` block that was running at the time.\n\n' +
          "The rest of the `try` block is abandoned: the `print` of that call never happens, and `print('both gates measured')` is skipped too. " +
          'The handler prints `a gate time was not a number`.\n\n' +
          'After the handler, the program carries on below the try/except and prints `report finished`.\n\n' +
          'Output:\n\n```\n35\na gate time was not a number\nreport finished\n```\n\n' +
          'The place that decides what survives is the `try`, not the line that raised. A `try` around each call separately would have kept `both gates measured`.',
      },
      selfExplain: 'Why does an exception raised in minutes get caught by a try that is two calls away?',
    },
    {
      id: 't10-s4-q3',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Two handlers, two jobs',
      prompt:
        'Complete `gate_total(filename)`, which returns the total number of visitors in a gate file as an int.\n\n' +
        'The file has one count per line. Return `0` if there is no such file, and skip any line that is not a whole number, such as `n/a` or a blank line.\n\n' +
        'Each blank is one whole `except` line, including the colon.',
      template: `def gate_total(filename):
    """Return the total visitors in filename, or 0 if there is no such file."""
    total = 0
    try:
        with open(filename) as f:
            lines = f.readlines()
    ⟦1⟧
        return 0
    for line in lines:
        try:
            total += int(line)
        ⟦2⟧
            continue
    return total`,
      blanks: [
        { id: '1', accept: ['except FileNotFoundError:', 'except OSError:'] },
        { id: '2', accept: ['except ValueError:'] },
      ],
      fnName: 'gate_total',
      tests: [
        {
          id: 'v1',
          files: [{ name: 'gate_sunday', content: '128\n96\n' }],
          call: "gate_total('gate_sunday')",
          expect: '224',
          label: 'two good hours',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'gate_sunday', content: '128\n96\n' }],
          call: "gate_total('gate_monday')",
          expect: '0',
          label: 'no file for that gate',
          hidden: false,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h1',
          files: [{ name: 'gate_tuesday', content: '40\nn/a\n\n 12 \n' }],
          call: "gate_total('gate_tuesday')",
          expect: '52',
          label: 'n/a, a blank line and a count with spaces',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'gate_wednesday', content: '' }],
          call: "gate_total('gate_wednesday')",
          expect: '0',
          label: 'the file exists but is empty',
          hidden: true,
        },
        {
          id: 'h3',
          files: [{ name: 'gate_thursday', content: '12.0\n8\n' }],
          call: "gate_total('gate_thursday')",
          expect: '8',
          label: 'a count typed with a decimal point',
          hidden: true,
          tag: 'int_of_float_string',
        },
      ],
      concepts: ['specific-except', 'graceful-exit', 'skip-invalid-rows'],
      detects: ['no_graceful_exit', 'invalid_row_not_skipped', 'bare_except', 'int_of_float_string'],
      expectedSec: 210,
      hints: [
        'Two things can go wrong here, and they are nothing like each other: the file might not be there at all, and one line of a file that is there might be nonsense.',
        'Blank 1 guards the opening, so it names the exception `open` raises when there is no such file, and the program then returns 0. Blank 2 sits inside the loop and names the exception `int()` raises for text that is not a whole number, so that line is skipped and the loop carries on.',
        'Blank 1 is `except FileNotFoundError:`. Blank 2 names the exception raised by `int(\'n/a\')`.',
      ],
      solution: {
        code: `def gate_total(filename):
    """Return the total visitors in filename, or 0 if there is no such file."""
    total = 0
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return 0
    for line in lines:
        try:
            total += int(line)
        except ValueError:
            continue
    return total`,
        explanation:
          'The first `try` holds only the opening and reading of the file. `except FileNotFoundError:` returns 0 straight away, so the rest of the function can rely on `lines` existing. ' +
          '`except OSError:` would also work, because `FileNotFoundError` is a kind of `OSError`, but naming the exact one says more about what you expect.\n\n' +
          '`for line in lines:` then works through the counts. The second `try` is **inside** the loop and holds one line, so a bad count is dealt with on its own pass and the loop keeps going. ' +
          'Around the whole loop instead, the first `n/a` would end the count for that gate.\n\n' +
          "`int('n/a')`, `int('')` from a blank line, and `int('12.0')` all raise ValueError, so `continue` skips those lines. `int(' 12 ')` and `int('12\\n')` are fine: `int()` ignores spaces and newlines around a whole number.\n\n" +
          'A bare `except:` in either place would also make the tests pass today, and would hide a misspelt name or a forgotten pair of brackets tomorrow.',
      },
      selfExplain: 'Why is the second try inside the loop while the first one is not?',
    },
    {
      id: 't10-s4-q4',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'First gate over the line',
      prompt:
        'Write `first_busy_gate(filename, limit)` that returns the name of the **first** gate in the file that counted **more than** `limit` visitors in an hour, as a string.\n\n' +
        '- Each line of the file is `gate,hour,visitors`, for example `North Gate,11,340`. There is no header.\n' +
        '- Skip a line that does not have three values or whose visitors value is not a whole number. A bad line must not stop the search.\n' +
        '- Return `None` if there is no such file, or if no line is over the limit.\n' +
        '- Do not print anything.\n\n' +
        "Example: for a file whose lines are `North Gate,10,180` then `South Gate,10,420`, `first_busy_gate(name, 300)` returns `'South Gate'`.",
      fnName: 'first_busy_gate',
      starter: `def first_busy_gate(filename, limit):
    """Return the first gate over the limit, or None."""
    pass
`,
      tests: [
        {
          id: 'v1',
          files: [{ name: 'gates_sat', content: 'North Gate,10,180\nSouth Gate,10,420\nNorth Gate,11,340\n' }],
          call: "first_busy_gate('gates_sat', 300)",
          expect: "'South Gate'",
          label: 'the second hour is over the limit',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'gates_sat', content: 'North Gate,10,180\n' }],
          call: "first_busy_gate('gates_sun', 300)",
          expect: 'None',
          label: 'no file for that day',
          hidden: false,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h1',
          files: [{ name: 'gates_mon', content: 'North Gate,10,n/a\n\nSouth Gate\nEast Gate,11,500\n' }],
          call: "first_busy_gate('gates_mon', 300)",
          expect: "'East Gate'",
          label: 'bad lines before the answer',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'gates_tue', content: 'North Gate,10,300\nSouth Gate,10,301\n' }],
          call: "first_busy_gate('gates_tue', 300)",
          expect: "'South Gate'",
          label: 'exactly the limit is not over it',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h3',
          files: [{ name: 'gates_wed', content: 'North Gate,10,120\nSouth Gate,11,90\n' }],
          call: "first_busy_gate('gates_wed', 300)",
          expect: 'None',
          label: 'a quiet day',
          hidden: true,
        },
        {
          id: 'h4',
          files: [{ name: 'gates_thu', content: 'North Gate,10,n/a\nSouth Gate,11\n' }],
          call: "first_busy_gate('gates_thu', 100)",
          expect: 'None',
          label: 'every line is unusable',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h5',
          files: [{ name: 'gates_fri', content: '' }],
          call: "first_busy_gate('gates_fri', 100)",
          expect: 'None',
          label: 'the file is empty',
          hidden: true,
        },
      ],
      concepts: ['try-except', 'file-not-found', 'skip-invalid-rows', 'return-none'],
      detects: ['no_graceful_exit', 'invalid_row_not_skipped', 'bare_except', 'index_out_of_range', 'print_vs_return'],
      expectedSec: 330,
      hints: [
        'Write down the three ways this can fail before you write the happy path: no file, a line with missing values, a count that is not a number. Each one needs its own small handler.',
        'Plan: open and read the file inside a `try` with `except FileNotFoundError:` that returns `None`. Loop over the lines; strip and split each one; put only the conversion inside a second `try` that catches IndexError and ValueError and uses `continue`. If the count is over the limit, return the gate name straight away. After the loop, return `None`.',
        '```python\ntry:\n    visitors = int(fields[2])\nexcept (IndexError, ValueError):\n    continue\n```',
      ],
      solution: {
        code: `def first_busy_gate(filename, limit):
    """Return the first gate over the limit, or None."""
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return None
    for line in lines:
        fields = line.strip().split(',')
        try:
            visitors = int(fields[2])
        except (IndexError, ValueError):
            continue
        if visitors > limit:
            return fields[0]
    return None
`,
        explanation:
          'Only `open` and `readlines` go inside the first `try`. A missing file raises FileNotFoundError, and the function returns `None` as the task asks, rather than crashing.\n\n' +
          'Each line is stripped and split. The second `try` holds only `int(fields[2])`, the one expression that can fail: a blank line or `South Gate` on its own makes `fields[2]` raise IndexError, and `n/a` makes `int()` raise ValueError. ' +
          '`except (IndexError, ValueError):` handles both the same way, and `continue` moves to the next line so a bad line never stops the search.\n\n' +
          '`visitors > limit` is strictly greater, so a gate that counted exactly 300 with a limit of 300 is not reported.\n\n' +
          '`return fields[0]` inside the loop ends the function at the first gate over the limit, which is what "first" means; the lines after it are never looked at.\n\n' +
          '`return None` at the end, lined up with the `for`, runs only when no line qualified. Printing the gate name instead of returning it would leave the caller with `None`.',
      },
      selfExplain: 'Why is int(fields[2]) inside the try rather than the whole line fields = line.strip().split(\',\')?',
    },
    {
      id: 't10-s4-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Totals and rejects',
      prompt:
        'The zoo wants to know how much of a gate file it could actually use. Write `gate_totals(filename)` that returns a **tuple** `(total, skipped)` of two ints.\n\n' +
        '- Each line of the file should be `gate,hour,visitors`, for example `North Gate,11,340`. There is no header.\n' +
        '- `total` is the sum of the visitor counts that could be used.\n' +
        '- A line is **rejected** if it does not have three values, or its visitors value is not a whole number, or that number is below 0. `skipped` counts the rejected lines.\n' +
        '- A completely blank line is ignored: it adds nothing to `total` and is **not** counted in `skipped`.\n' +
        '- Return `(0, 0)` if there is no such file. Do not print anything.\n\n' +
        "Example: a file whose lines are `North Gate,10,180`, `South Gate,10,n/a` and `East Gate,11,20` gives `(200, 1)`.",
      fnName: 'gate_totals',
      starter: `def gate_totals(filename):
    """Return (total visitors, lines rejected), or (0, 0) if there is no such file."""
    pass
`,
      tests: [
        {
          id: 'v1',
          files: [{ name: 'zoo_sat', content: 'North Gate,10,180\nSouth Gate,10,420\n' }],
          call: "gate_totals('zoo_sat')",
          expect: '(600, 0)',
          label: 'every line usable',
          hidden: false,
        },
        {
          id: 'v2',
          files: [{ name: 'zoo_sat', content: 'North Gate,10,180\n' }],
          call: "gate_totals('zoo_sun')",
          expect: '(0, 0)',
          label: 'no file for that day',
          hidden: false,
          tag: 'no_graceful_exit',
        },
        {
          id: 'h1',
          files: [{ name: 'zoo_mon', content: 'North Gate,10,180\nSouth Gate,10,n/a\n\nEast Gate,11\nWest Gate,11,-5\nNorth Gate,12,20\n' }],
          call: "gate_totals('zoo_mon')",
          expect: '(200, 3)',
          label: 'n/a, a short line, a negative count and a blank line',
          hidden: true,
          tag: 'invalid_row_not_skipped',
        },
        {
          id: 'h2',
          files: [{ name: 'zoo_tue', content: 'North Gate,10,0\nSouth Gate,10,12\n' }],
          call: "gate_totals('zoo_tue')",
          expect: '(12, 0)',
          label: 'a count of 0 is still usable',
          hidden: true,
        },
        {
          id: 'h3',
          files: [{ name: 'zoo_wed', content: 'North Gate,10,12.0\nSouth Gate,10,8\n' }],
          call: "gate_totals('zoo_wed')",
          expect: '(8, 1)',
          label: 'a count typed with a decimal point',
          hidden: true,
          tag: 'int_of_float_string',
        },
        {
          id: 'h4',
          files: [{ name: 'zoo_thu', content: '\n\n' }],
          call: "gate_totals('zoo_thu')",
          expect: '(0, 0)',
          label: 'nothing but blank lines',
          hidden: true,
        },
        {
          id: 'h5',
          files: [{ name: 'zoo_fri', content: 'North Gate,10,n/a\nSouth Gate,11\n' }],
          call: "gate_totals('zoo_fri')",
          expect: '(0, 2)',
          label: 'every line rejected',
          hidden: true,
        },
        {
          id: 'h6',
          files: [{ name: 'zoo_empty', content: '' }],
          call: "gate_totals('zoo_empty')",
          expect: '(0, 0)',
          label: 'the file exists but is empty',
          hidden: true,
        },
      ],
      concepts: ['try-except', 'graceful-exit', 'validation', 'tuple-return'],
      detects: ['no_graceful_exit', 'invalid_row_not_skipped', 'int_of_float_string', 'bare_except', 'index_out_of_range', 'print_vs_return'],
      expectedSec: 600,
      hints: [
        'Three kinds of line have to be told apart, not two: usable, rejected, and blank. Decide what happens to each one before you write any code.',
        'Plan: read the file inside a `try` that returns `(0, 0)` for a missing file. Start `total` and `skipped` at 0. For each line: if the stripped line is empty, `continue` without counting anything. Otherwise split it, and inside a small `try` convert the third value, adding 1 to `skipped` and continuing when IndexError or ValueError is raised. Then check for a negative count, which is another rejection. Only what is left is added to `total`.',
        "The blank-line test comes first: `if line.strip() == '': continue`. A rejection then looks like `skipped += 1` followed by `continue`, both in the except block and after the negative check.",
      ],
      solution: {
        code: `def gate_totals(filename):
    """Return (total visitors, lines rejected), or (0, 0) if there is no such file."""
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return (0, 0)
    total = 0
    skipped = 0
    for line in lines:
        if line.strip() == '':
            continue
        fields = line.strip().split(',')
        try:
            visitors = int(fields[2])
        except (IndexError, ValueError):
            skipped += 1
            continue
        if visitors < 0:
            skipped += 1
            continue
        total += visitors
    return (total, skipped)
`,
        explanation:
          '**A missing file is not a rejected line.** The first `try` covers only the opening and reading, and returns the empty answer `(0, 0)` the task names. Nothing after it has to wonder whether `lines` exists.\n\n' +
          "**Blank lines are dealt with first.** `line.strip() == ''` catches the blank line in the middle of the file and the one a file ending in `\\n\\n` leaves behind. `continue` here changes neither counter, which is exactly what the task asks.\n\n" +
          "**The conversion is the only risky part.** `fields[2]` raises IndexError for `East Gate,11`, and `int()` raises ValueError for `n/a` and for `12.0`. Both mean a rejected line, so `except (IndexError, ValueError):` adds 1 to `skipped` and moves on.\n\n" +
          '**A negative count converts fine but is still wrong.** `-5` passes `int()` without complaint, so it needs its own check after the conversion, with the same two lines of handling. A count of 0 is a real reading and is kept.\n\n' +
          '**Only good lines reach the last line of the loop,** so `total += visitors` needs no condition of its own. The function returns the two counters as a tuple, in the order the task gives them.\n\n' +
          'Test it with a bad line *followed by* a good one. A file whose only problem is on the last line cannot show whether the loop keeps going.',
      },
      selfExplain: 'Which test would fail if the negative check were left out, and which would fail if blank lines counted as skipped?',
    },
  ],
};

export default s4;
