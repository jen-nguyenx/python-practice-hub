import type { Topic } from '../../schema.ts';

export const cheatsheet = `**Local and global scope**

A variable created inside a function (including every parameter) is **local**: it exists only while that call runs, and code outside cannot see it.

\`\`\`python
fee = 3.2                     # global: created at the top level

def trip_cost(zones):
    cost = fee * zones        # reading a global is allowed
    return cost               # cost disappears when the call ends

total = trip_cost(2)          # keep the result by storing it
print(cost)                   # NameError: cost only existed inside the call
\`\`\`

- Python decides which names are local **before** the function runs: if a name is assigned **anywhere** in the function, it is local **everywhere** in that function.
- So reading it before the assignment fails:

\`\`\`python
taps = 0

def tap_on():
    taps = taps + 1           # calling tap_on() raises UnboundLocalError on this line
\`\`\`

- Reassigning a parameter changes only the local name. The caller's variable is untouched unless the caller stores the return value.
- Calling a list method on a parameter (\`append\`, \`sort\`, \`remove\`) **does** change the caller's list, because both names refer to the same list.

**Pass data in, return data out**

\`\`\`python
def tap_on(taps):
    return taps + 1

taps = 0
taps = tap_on(taps)           # the caller stores the new value
\`\`\`

- Avoid \`global\`. It hides what a function depends on, and a test that calls the function on its own gets different results depending on what ran before.
- Return several values as a tuple and unpack them: \`return (low, high)\`, then \`low, high = min_max(values)\`.
- A bare call like \`tap_on(taps)\` on its own line throws the result away. Typed at the Thonny shell prompt, the value is echoed; as a line in a program, nothing happens to it.

**Default parameters**

\`\`\`python
def stall_takings(sales, fee=30, card_rate=0.0):
    ...

stall_takings([120, 85])                      # fee=30, card_rate=0.0
stall_takings([120, 85], 25)                  # fee=25 (matched by position)
stall_takings([120, 85], card_rate=0.015)     # skip fee, set card_rate by name
\`\`\`

- Parameters with defaults come **after** the ones without: \`def f(fee=30, sales):\` is a SyntaxError.
- In a call, keyword arguments come after positional ones: \`f(sales=[1], 30)\` is a SyntaxError.
- A default is evaluated **once**, when the \`def\` line runs. A list or dict default is shared by every call:

\`\`\`python
def add_sale(amount, sales=[]):       # BAD: one list for all calls
    sales.append(amount)
    return sales

def add_sale(amount, sales=None):     # GOOD
    if sales is None:
        sales = []                    # a new list on every call
    sales.append(amount)
    return sales
\`\`\`

- Flags such as \`normalise=False\` or \`regularise=False\` are safe defaults: \`True\`, \`False\`, numbers, strings and \`None\` never change.

**Return a safe value on every path**

- Check the arguments first and return early: \`if not isinstance(csvfile, str): return None\`. \`type(x) != str\` also works.
- Decide the return shape once. Every path returns that shape or the safe value the task names (\`None\`, \`[]\`, \`{}\`, zeros), never sometimes a list and sometimes a tuple.
- Guard every division: \`if count == 0: return None\`.
- Do not change the lists or dictionaries you were given. Build new ones: \`new_list = list(old)\`, and copy inner lists too when you will append to them.

**The project main() contract**

\`\`\`python
def read_rows(csvfile, name):
    """Helper: read and validate the rows for name."""
    ...

def main(csvfile, name):
    """Copy this line exactly from the specification."""
    if not isinstance(csvfile, str) or not isinstance(name, str):
        return None
    rows = read_rows(csvfile, name)
    if rows is None or len(rows) == 0:
        return None
    ...                                    # calculate at full precision
    return [round(mean, 4), round(sd, 4)]  # round only here
\`\`\`

- **main is required.** Use the exact name and parameters from the specification. If the tester cannot call \`main\`, every test scores zero.
- **No imports** of any module, not even \`csv\` or \`math\`. Use \`strip()\`, \`split(',')\` and \`x ** 0.5\`.
- **Never call \`input()\`.** The tester passes everything as arguments.
- **No \`print()\`**, except a short message while terminating gracefully (for example inside \`except OSError:\`). Results are **returned**, never printed.
- **Round to 4 decimal places only in the returned result.** \`round\` inside a loop, or on a value that is used again later, is rounding during the calculation.
- **Do not add or check \`.csv\`.** Open the name exactly as given.
- **Find columns by header name**, ignore case in headers and data, and skip invalid rows (blank, too few fields, text where a number belongs, out-of-range values).
- **Terminate gracefully**: a missing file or bad arguments return the safe value instead of crashing. A crash the marker has to fix costs marks.
- **Style and efficiency marks**: your name at the top, a docstring or comment per helper, snake_case names, and one pass over the data where possible.

**Test it like the marker**

\`\`\`python
>>> main('rain_jan', 'Perth Airport')
[20.7, 5.175, 3]
>>> main('no_such_file', 'Perth Airport')     # should return None, not crash
>>> main('rain_jan', 42)                      # should return None
\`\`\`

Call it twice in a row as well: the second answer must not depend on the first.

**Gotchas the night before**

- \`UnboundLocalError\` means a name is assigned somewhere in the function, so it is local, but this line reads it before any value has been assigned to it.
- A function without \`return\` gives back \`None\`; printing inside it does not help the caller.
- \`x = my_list.append(5)\` stores \`None\`.
- \`def f(items=[])\` and \`def f(counts={})\` are bugs waiting for the second call.
- \`round(total + x, 4)\` inside a loop breaks the rounding rule even when the answer looks right.
- \`open(csvfile + '.csv')\` and \`if csvfile.endswith('.csv')\` both fail on the hidden test files.
- Leave no test calls, \`input()\` or \`print()\` at the top level of the file you submit.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Rottnest ferry passengers: a project-style main()',
  code: `def read_counts(csvfile, route):
    """Return the valid passenger counts for route, or None if the file cannot be opened."""
    try:
        with open(csvfile) as f:            # the name exactly as given: no .csv
            lines = f.readlines()
    except OSError:
        return None
    if len(lines) == 0:
        return []
    header = lines[0].strip().lower().split(',')
    if 'route' not in header or 'passengers' not in header:
        return []
    route_col = header.index('route')       # columns found by name
    count_col = header.index('passengers')
    wanted = route.strip().lower()
    counts = []
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):      # blank or short row
            continue
        if fields[route_col].strip().lower() != wanted:
            continue
        try:
            count = int(fields[count_col])
        except ValueError:                  # 'n/a' and other text
            continue
        if count >= 0:
            counts.append(count)
    return counts


def mean_and_busiest(counts):
    """Return (mean, busiest) for a non-empty list of counts, not rounded."""
    total = 0
    busiest = counts[0]
    for count in counts:
        total = total + count
        if count > busiest:
            busiest = count
    return (total / len(counts), busiest)


def main(csvfile, route):
    """Return [mean passengers per sailing (4 dp), busiest sailing] for route, or None."""
    if not isinstance(csvfile, str) or not isinstance(route, str):
        return None
    counts = read_counts(csvfile, route)
    if counts is None or len(counts) == 0:
        return None
    mean, busiest = mean_and_busiest(counts)
    return [round(mean, 4), busiest]


# In the Thonny shell, with a file named ferry_week:
# Date,Route,Departure,Passengers
# 2026-09-12,Fremantle,07:30,212
# 2026-09-12,Barrack Street,08:45,148
# 2026-09-12,fremantle,11:00,356
# 2026-09-12,Fremantle,15:30,n/a
#
# 2026-09-13,FREMANTLE ,09:30,397
#
# >>> main('ferry_week', 'Fremantle')
# [321.6667, 397]
# >>> main('ferry_week', 'Hillarys')
# (nothing shown: the result is None)`,
  steps: [
    "**Copy the contract first.** The specification says `main(csvfile, route)` returns `[mean passengers per sailing rounded to 4 dp, busiest sailing]`, or `None` when it cannot answer. Write that `def` line and docstring before any other code, so the name, the parameters and the return shape are fixed.",
    '**Guard the arguments.** The first lines of `main` check that both arguments are strings and return `None` straight away if not. Everything below can now assume sensible input, and every path out of `main` returns either the 2-item list or `None`.',
    '**Give file reading its own helper.** `read_counts` opens the name exactly as given inside `try`/`except OSError`, so a missing file returns `None` instead of crashing. It reads the header once, lower-cases it and finds the `route` and `passengers` columns by name, so a shuffled or extra column does not matter.',
    "**Skip bad rows where they are read.** A row is used only if it has as many fields as the header, its route matches after `strip().lower()` (so `'FREMANTLE '` counts), its passenger count converts with `int` (the `n/a` row is skipped) and it is not negative. The helper returns a plain list, so the calculation never sees bad data.",
    '**Calculate at full precision, round once.** `mean_and_busiest` returns an unrounded mean and the busiest sailing as a tuple, which `main` unpacks. `round(mean, 4)` appears only in the returned list, so no rounding error can build up. For the sample file the counts are 212, 356 and 397: the mean is 965 / 3 = 321.6667.',
    '**Test it the way the marker will.** Call `main` from the shell with a normal route, a route with no sailings, a missing file and a non-string argument, and call it twice in a row. There is no `import`, `input()` or `print()` anywhere, and no test calls are left at the top level of the file.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'scope_confusion',
    bad: `taps = 0

def tap_on():
    taps = taps + 1

tap_on()`,
    good: `def tap_on(taps):
    return taps + 1

taps = 0
taps = tap_on(taps)`,
    note: 'Assigning to `taps` inside the function makes it local for the whole function, so reading it on the right-hand side raises `UnboundLocalError`. Pass the value in as a parameter, return the new value, and store it where the function is called.',
  },
  {
    mistake: 'mutable_default_arg',
    bad: `def add_sale(amount, sales=[]):
    sales.append(amount)
    return sales`,
    good: `def add_sale(amount, sales=None):
    if sales is None:
        sales = []
    sales.append(amount)
    return sales`,
    note: 'A default list is created once, when the `def` line runs, and every call without a list shares it, so the second call still contains the first sale. Use `None` as the default and create the list inside the function.',
  },
  {
    mistake: 'global_state',
    bad: `total_runs = 0

def add_innings(runs):
    global total_runs
    total_runs = total_runs + runs`,
    good: `def add_innings(total_runs, runs):
    return total_runs + runs`,
    note: 'A function that changes globals gives answers that depend on what ran before it, so a tester calling it on its own, or twice, gets the wrong result. Take the running total as a parameter and return the new total.',
  },
  {
    mistake: 'print_in_main',
    bad: `def main(csvfile):
    ...
    print([total, mean])`,
    good: `def main(csvfile):
    ...
    return [round(total, 4), round(mean, 4)]`,
    note: 'The project tester only looks at what `main` returns. A printed result is not marked, `main` returns `None`, and extra output breaks the no-print rule. The only print allowed is a short message while terminating gracefully.',
  },
  {
    mistake: 'round_mid_calc',
    bad: `for rain in readings:
    total = round(total + rain, 4)
mean = round(total / n, 4)
spread = mean - smallest`,
    good: `for rain in readings:
    total = total + rain
mean = total / n
spread = mean - smallest
return [round(mean, 4), round(spread, 4)]`,
    note: 'Rounding a value that is used again throws away precision, and the errors add up until the 4th decimal place of a later result is wrong. Keep full precision throughout and round only as values go into the returned result.',
  },
  {
    mistake: 'csv_ext_assumed',
    bad: `def main(csvfile, station):
    if not csvfile.endswith('.csv'):
        return None
    with open(csvfile + '.csv') as f:
        ...`,
    good: `def main(csvfile, station):
    try:
        with open(csvfile) as f:
            ...
    except OSError:
        return None`,
    note: 'Project test files may be called `rain_jan` or `data.txt`. Checking for `.csv` rejects valid files and adding it opens a file that does not exist. Open the name exactly as given, and handle a missing file with `except OSError`.',
  },
];
