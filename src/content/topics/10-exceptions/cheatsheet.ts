import type { Topic } from '../../schema.ts';

export const cheatsheet = `**Read a traceback from the bottom up**

\`\`\`
Traceback (most recent call last):
  File "report.py", line 11, in <module>
    print(ferry_total(['07:30,212', '08:45,n/a']))
          ~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "report.py", line 6, in ferry_total
    total += int(fields[1])
             ~~~^^^^^^^^^^^
ValueError: invalid literal for int() with base 10: 'n/a'
\`\`\`

1. Last line: the exception type and its message. The message often quotes the bad value, here \`'n/a'\`.
2. The \`File\` line just above it: the line that actually raised (here line 6, inside \`ferry_total\`). The \`~\` and \`^\` marks underline the part of that line that failed.
3. Lines further up: the calls that led there (line 11 called \`ferry_total\`).

**Exceptions you will meet**

- \`ValueError\`: right type, wrong content. \`int('2.5')\`, \`int('')\`, \`float('N/A')\`, \`header.index('rain')\` when there is no such column.
- \`TypeError\`: wrong type. \`'Total: ' + 5\`, \`int(None)\`, \`float(text.strip)\` (method not called), a function given the wrong number of arguments.
- \`IndexError\`: \`fields[2]\` when the line only split into two parts.
- \`KeyError\`: \`counts['latte']\` when that key is not in the dictionary.
- \`ZeroDivisionError\`: \`total / count\` when \`count\` is 0.
- \`FileNotFoundError\`: \`open('rainfall')\` when there is no file with that name. It is a kind of \`OSError\`, so \`except OSError:\` catches it too.
- \`NameError\`: a misspelt or undefined name, such as \`totl\`.

**try and except**

\`\`\`python
try:
    mark = int(text)       # only the line that can fail
except ValueError:
    mark = None            # runs only if int() raised ValueError
print(mark)                # runs either way
\`\`\`

- If a line inside \`try\` raises, the rest of the \`try\` block is skipped and Python jumps to the first matching \`except\`.
- If no \`except\` names that exception, the program still crashes.
- If nothing raises, every \`except\` block is skipped.
- \`return\` inside \`try\` still ends the function straight away.

**More than one exception**

\`\`\`python
try:
    hours = float(parts[1])
except IndexError:              # the row had no second value
    hours = 0
except ValueError:              # the value was not a number
    hours = 0

try:
    hours = float(parts[1])
except (IndexError, ValueError):   # same handling for both
    hours = 0

try:
    hours = float(parts[1])
except ValueError as err:
    print(err)                  # could not convert string to float: 'n/a'
\`\`\`

**Where the try goes decides what survives**

\`\`\`python
for line in lines:                     # try INSIDE the loop:
    fields = line.strip().split(',')   # a bad row is skipped
    try:                               # and the loop keeps going
        value = float(fields[col])
    except (ValueError, IndexError):
        continue
    total += value
\`\`\`

A \`try\` around the whole loop leaves the loop at the first bad row, and every row after it is lost.

**Terminate gracefully**

\`\`\`python
def load_levels(filename):
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return []           # the value the task names: [], {}, None or 0
    ...
\`\`\`

- Return exactly what the task says to return on failure. Do not print the error instead; the CITS1401 project rules only allow \`print\` to explain a graceful termination, and the function still has to return.
- After an \`except\`, either \`return\` or give the variable a value. Otherwise the next line that uses it crashes with \`NameError\` or \`UnboundLocalError\`.

**Check first, or catch?**

\`\`\`python
if not isinstance(filename, str):   # wrong argument type
    return {}
if len(lines) == 0:                 # empty file
    return {}
if 'salinity' not in header:        # avoids header.index() raising ValueError
    return {}
if count == 0:                      # guard before dividing
    return None
\`\`\`

- A simple \`if\` is clearer than catching \`ZeroDivisionError\` or \`IndexError\`.
- For "is this text a number?", \`try\` with \`int()\` or \`float()\` is usually safest. \`text.isdigit()\` is \`False\` for \`'-3'\`, \`'2.5'\` and \`' 4'\`.

**else and finally (you may see them in lectures)**

\`\`\`python
try:
    n = int(text)
except ValueError:
    print('Not a number')
else:
    print('Got', n)        # only if the try block did not raise
finally:
    print('Checked')       # always runs, error or not
\`\`\`

**Gotchas the night before**

- \`int('2.0')\` and \`int('2.5')\` raise ValueError. \`int(2.5)\` is 2, \`float('2')\` is 2.0 and \`int(' 7 ')\` is 7.
- \`except TypeError:\` does not catch a ValueError. Name the exception the failing line really raises.
- Never use a bare \`except:\`. It also catches the NameError from a misspelt name and the TypeError from a method you forgot to call, so the bug turns into a silent wrong answer.
- Keep \`try\` blocks small. Every extra line inside is another place where a real bug can be caught by accident.
- \`continue\` in an \`except\` inside a loop goes to the next pass; \`return\` gives up on the whole function.
- A mean over "valid rows only" can divide by zero when every row is bad. Check the count first.
- Test with a bad row *followed by* a good row. A bad last row does not show whether your loop keeps going.`;

export const workedExample: Topic['workedExample'] = {
  title: 'BOM rainfall file: a mean that never crashes',
  code: `def mean_rainfall(filename):
    """Return the mean daily rainfall in mm, rounded to 1 dp, or None if the
    file is missing, has no rain_mm column, or has no valid rows."""
    # Step 2: opening the file is the first thing that can fail
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return None

    # Step 3: find the column by its header name, not its position
    if len(lines) == 0:
        return None
    header = lines[0].strip().split(',')
    if 'rain_mm' not in header:
        return None
    rain_col = header.index('rain_mm')

    # Step 4: a bad row is skipped and the loop keeps going
    total = 0
    count = 0
    for line in lines[1:]:
        fields = line.strip().split(',')
        try:
            rain = float(fields[rain_col])
        except (ValueError, IndexError):
            continue
        total += rain
        count += 1

    # Step 5: no valid rows means there is nothing to divide by
    if count == 0:
        return None
    return round(total / count, 1)


# File bom_march:
# date,station,rain_mm
# 2026-03-01,Perth Airport,0.0
# 2026-03-02,Perth Airport,12.4
# 2026-03-03,Perth Airport,
# 2026-03-04
# 2026-03-05,Perth Airport,3.2
print(mean_rainfall('bom_march'))   # 5.2
print(mean_rainfall('bom_april'))   # None (no such file)`,
  steps: [
    '**List everything that can go wrong before writing the loop.** The Bureau of Meteorology file might not exist, might be empty, might not have a `rain_mm` column, and might contain rows with a blank reading or missing values. The task says to return `None` in every one of those cases, so write that list down first. Each item becomes a small check or a small `try`.',
    '**Protect the file opening.** Only `open` and `readlines` go inside the first `try`. `except FileNotFoundError:` returns `None` straight away, so the rest of the function can assume `lines` exists. Returning here, rather than printing a message, also means no later line tries to use a variable that was never set.',
    '**Find the column by name.** An empty file gives `lines == []`, so check that before reading `lines[0]`. `header.index(\'rain_mm\')` raises ValueError if the column is missing, so check `\'rain_mm\' not in header` first. The column is found by its name, so a file with the columns in a different order still works.',
    '**Skip bad rows without stopping.** The second `try` sits *inside* the loop and holds only the line that can fail. The row for 3 March has a blank reading, so `float(\'\')` raises ValueError; the row for 4 March has one value, so `fields[2]` raises IndexError. `continue` moves to the next row, and `total` and `count` only change after a successful conversion.',
    '**Guard the division, round at the end, then test the edge cases.** If every row was bad, `count` is 0, so return `None` before dividing. The valid readings are 0.0, 12.4 and 3.2, so the mean is 15.6 / 3 = 5.2. Now test the failure cases on purpose: a missing file, an empty file, a file without `rain_mm`, and a bad row followed by a good one.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'bare_except',
    bad: `total = 0
for price in prices:
    try:
        total += flaot(price)
    except:
        pass`,
    good: `total = 0
for price in prices:
    try:
        total += float(price)
    except ValueError:
        pass`,
    note: 'A bare `except:` also swallows the NameError from the misspelt `flaot`, so every price is skipped, the total stays 0 and no error ever appears. Name the exception you expect; any other bug then crashes loudly where you can see it.',
  },
  {
    mistake: 'invalid_row_not_skipped',
    bad: `postcodes = []
try:
    for entry in entries:
        postcodes.append(int(entry))
except ValueError:
    pass`,
    good: `postcodes = []
for entry in entries:
    try:
        postcodes.append(int(entry))
    except ValueError:
        pass`,
    note: 'When the `try` wraps the whole loop, the first bad entry jumps out of the loop and every entry after it is lost. Put the `try` inside the loop around the one line that converts, so each bad entry is handled on its own pass.',
  },
  {
    mistake: 'no_graceful_exit',
    bad: `def load_levels(filename):
    with open(filename) as f:
        lines = f.readlines()
    ...`,
    good: `def load_levels(filename):
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return []
    ...`,
    note: 'Project and exam tests usually include a file that does not exist. Without a handler the function crashes with FileNotFoundError, so that test fails, and a crash the marker has to fix costs extra marks. Return the empty value the task names.',
  },
  {
    mistake: 'print_in_main',
    bad: `def load_bookings(filename):
    try:
        f = open(filename)
    except FileNotFoundError:
        print('File not found')
    lines = f.readlines()
    return lines`,
    good: `def load_bookings(filename):
    try:
        with open(filename) as f:
            lines = f.readlines()
    except FileNotFoundError:
        return None
    return lines`,
    note: 'Printing a message does not stop the function. The next line uses `f`, which was never set, so it crashes with UnboundLocalError anyway. Return the value the task asks for; results are marked on what is returned, not printed.',
  },
  {
    mistake: 'zero_division',
    bad: `def mean_rating(ratings):
    total = 0
    count = 0
    for stars in ratings:
        try:
            total += int(stars)
            count += 1
        except ValueError:
            pass
    return total / count`,
    good: `def mean_rating(ratings):
    total = 0
    count = 0
    for stars in ratings:
        try:
            total += int(stars)
            count += 1
        except ValueError:
            pass
    if count == 0:
        return None
    return total / count`,
    note: 'Skipping bad entries means `count` can end at 0 (for example when every rating is blank), and the division sits outside the `try`. Check the count before dividing and return the value the task names for "no valid data".',
  },
  {
    mistake: 'type_error_other',
    bad: `try:
    age = int(answer)
except TypeError:
    age = None`,
    good: `try:
    age = int(answer)
except ValueError:
    age = None`,
    note: "`int('nineteen')` raises ValueError: the value is a string, which is the right type, but its content is not a whole number. TypeError is for the wrong type, such as `'Total: ' + 5`. A handler only catches the exception it names.",
  },
];
