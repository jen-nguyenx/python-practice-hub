import type { Topic } from '../../schema.ts';

export const cheatsheet = `**The project contract: what the marker checks**

- \`def main(...)\` with exactly the parameters in the task. A missing or renamed \`main\` scores zero.
- Return the results. No \`print()\` (except a message when terminating gracefully), no \`input()\`, no \`import\` of any kind, not even \`math\` or \`csv\`.
- Open the file name exactly as given. It may not end in \`.csv\`, so never add or check an extension.
- Keep full precision while calculating. Round to 4 decimal places only as values go into the result.
- Bad input (missing file, no valid rows) returns what the task says, often \`None\`. It must never crash.

**Skeleton: read once, find columns by name**

\`\`\`python
def main(csvfile, club):
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:              # FileNotFoundError is a kind of OSError
        return None
    header = lines[0].strip().lower().split(',')
    club_col = header.index('club')          # look up lower-case names
    value_col = header.index('members')
    for line in lines[1:]:
        fields = line.strip().split(',')
        ...
\`\`\`

**Check every row before using it**

\`\`\`python
seen = {}                                # before the loop
for line in lines[1:]:
    fields = line.strip().split(',')
    if len(fields) != len(header):       # blank line or a missing column
        continue
    name = fields[club_col].strip().lower()
    try:
        value = float(fields[value_col]) # int(...) when whole numbers are required
    except ValueError:                   # '', 'NA', 'n/a', and '12.5' for int()
        continue
    if name == '' or value < 0:
        continue
    if name in seen:                     # duplicate: keep the first valid row
        continue
    seen[name] = True
\`\`\`

- A blank line strips to \`''\`, and \`''.split(',')\` is \`['']\`: one field, so the length check skips it.
- \`int(' 42 ')\` and \`float(' 7.5')\` are fine with spaces; \`int('12.5')\` and \`float('')\` raise ValueError.
- Clean the argument the same way as the data: \`target = club.strip().lower()\`.
- Mark a key as seen only after the row has passed every other check.

**Statistics by hand**

\`\`\`python
n = len(values)                    # check n first: mean needs 1, sample std needs 2
mean = sum(values) / n
total = 0
for x in values:
    total += (x - mean) ** 2
std = (total / (n - 1)) ** 0.5     # sample std; divide by n if the task's formula does
se = std / n ** 0.5                # standard error
\`\`\`

- A square root is \`x ** 0.5\`. \`x ** 1/2\` means \`(x ** 1) / 2\`.
- \`** 0.5\` of a number 0 or more always gives a float: \`9 ** 0.5\` is \`3.0\`. A negative number gives a complex result, so check the sign first.
- Read the formula in the task: \`n - 1\` (sample) or \`n\` (population).

**Cosine similarity, distance and correlation**

\`\`\`python
dot = 0
sq_a = 0
sq_b = 0
for i in range(len(a)):
    dot += a[i] * b[i]
    sq_a += a[i] ** 2
    sq_b += b[i] ** 2
if sq_a == 0 or sq_b == 0:
    sim = None                                   # size 0: cannot divide
else:
    sim = dot / (sq_a ** 0.5 * sq_b ** 0.5)      # between -1.0 and 1.0

dist = 0
for i in range(len(a)):
    dist += (a[i] - b[i]) ** 2
dist = dist ** 0.5                               # Euclidean distance
\`\`\`

- Cosine similarity compares the shape of two lists, not their size: \`[1, 2]\` and \`[10, 20]\` point the same way, so their similarity rounds to 1.0 (before rounding it is 0.9999999999999999).
- Pearson correlation is the cosine similarity of the two lists after subtracting each list's mean from its values.

**Group, rank and nest**

\`\`\`python
groups = {}
for ...:
    if team not in groups:
        groups[team] = []                    # a NEW list for each new key
    groups[team].append((player, goals, accuracy))

result = {}
for team, rows in groups.items():
    rows.sort(key=lambda row: (-row[1], -row[2], row[0]))
    result[team] = {}                        # a NEW inner dictionary
    rank = 1
    for player, goals, accuracy in rows:
        result[team][player] = [goals, round(accuracy, 4), rank]
        rank += 1
\`\`\`

- The key sorts by goals high to low, then accuracy high to low, then name A to Z. Negate numbers to sort them high to low; \`reverse=True\` would also flip the names to Z to A.
- Best item with a tie-break, without sorting:

\`\`\`python
if best is None or score > best_score or (score == best_score and name < best):
    best = name
    best_score = score
\`\`\`

**Rounding**

- Never feed a rounded value into another calculation. That includes a helper that returns \`round(std, 4)\` which another function then divides.
- Compare and sort at full precision; round after ranking.
- \`round(1.25, 4)\` is \`1.25\`, not \`1.2500\`. Return the float; the marker compares numbers, not text.

**Efficiency marks**

- Open and read the file once. Loop over the rows once and store what you need in lists or dictionaries.
- Call \`header.index(...)\` once, before the row loop, not for every row.
- Never re-open the file or re-scan every row inside a loop over groups.

**Gotchas the night before**

- \`header.index('Members')\` raises ValueError after you lower-cased the header. Look up \`'members'\`.
- Forgetting \`strip()\` leaves \`'\\n'\` on the last field, so \`'perth glory\\n' != 'perth glory'\`.
- Return the type the task names: a list is not a tuple, and a count should be an int, not \`3.0\`.
- Check for 0 and 1 valid values before dividing by \`n\` or \`n - 1\`.
- Test your own files: shuffled columns, an extra column, mixed case, blank and invalid rows, a duplicate, a missing file.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Fremantle Markets: takings by stall type',
  code: `def mean_and_std(values):
    """Full-precision mean and sample standard deviation of 2 or more values."""
    n = len(values)
    mean = sum(values) / n
    total = 0
    for x in values:
        total += (x - mean) ** 2
    return mean, (total / (n - 1)) ** 0.5


def main(csvfile):
    """Return [[stall_type, mean, std], ...] for stall types with 2 or more valid rows,
    highest mean first, then type A to Z. None if the file cannot be opened."""
    # Step 2: read the whole file once
    try:
        with open(csvfile) as f:
            lines = f.readlines()
    except OSError:
        return None

    # Step 3: find the columns by name
    header = lines[0].strip().lower().split(',')
    type_col = header.index('type')
    takings_col = header.index('takings')

    # Step 4: check each row and group the takings by stall type
    groups = {}
    for line in lines[1:]:
        fields = line.strip().split(',')
        if len(fields) != len(header):
            continue
        stall_type = fields[type_col].strip().lower()
        try:
            takings = float(fields[takings_col])
        except ValueError:
            continue
        if stall_type == '' or takings < 0:
            continue
        if stall_type not in groups:
            groups[stall_type] = []
        groups[stall_type].append(takings)

    # Step 5: statistics per group at full precision
    rows = []
    for stall_type, values in groups.items():
        if len(values) >= 2:
            mean, std = mean_and_std(values)
            rows.append([stall_type, mean, std])

    # Step 6: rank with a key tuple, then round as the result is built
    rows.sort(key=lambda row: (-row[1], row[0]))
    result = []
    for stall_type, mean, std in rows:
        result.append([stall_type, round(mean, 4), round(std, 4)])
    return result


# File markets_week1 (no .csv extension):
#   Stall,Takings,Type,Day
#   Bao Bar,1840.50,Food,Sat
#   Salt & Tide,620.00,Crafts,Sat
#   Bao Bar,2105.25,food,Sun
#   Kombucha Co,n/a,Drinks,Sat
#   Sunny Soaps,745.80,CRAFTS,Sun
#   Juice Shack,980.00,Drinks,Sun
#   Crepe Cart,2105.25,Food,Sat
#
# main('markets_week1') returns [['food', 2017.0, 152.8535], ['crafts', 682.9, 88.954]]`,
  steps: [
    '**Pin down the output before writing code.** The task wants a list of `[stall_type, mean, std]` lists: types in lower case, only types with at least 2 valid rows, highest mean first and equal means A to Z, values to 4 decimal places, and `None` for a missing file. Work the sample by hand: Food has 1840.50, 2105.25 and 2105.25 (mean 2017.0); Crafts has 620.00 and 745.80; Drinks has only one valid row because `n/a` is not a number, so it is left out.',
    '**Read the file once, safely.** `with open(csvfile)` inside `try` reads every line and closes the file. If the file is missing, the `except OSError` branch returns `None` instead of crashing. The name is used exactly as given, with no `.csv` added.',
    '**Find the columns by name.** The header is lower-cased and split, and `header.index` finds `type` and `takings` wherever they are. In this file Type is the third column; in a hidden test file it could be the first. Both positions are found once, before the loop.',
    '**Check each row, then group it.** Skip a row whose field count does not match the header (blank or short lines). Clean the type with `strip().lower()`, so `Food`, `food` and `FOOD` become one group. `float()` sits inside `try`, so `n/a` is skipped. Blank types and negative takings are skipped too. A new list is created the first time a type appears, then each valid amount is appended.',
    '**Compute statistics at full precision.** The helper returns the mean and sample standard deviation without rounding. Groups with fewer than 2 values are skipped before calling it, because `n - 1` would be 0.',
    '**Rank, then round as the result is built.** The key `(-row[1], row[0])` sorts by mean high to low and then by type A to Z, using the unrounded means. Only the final loop rounds, while building the list that is returned, so no rounded value is ever used in another calculation.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'round_mid_calc',
    bad: `def share(count, total):
    return round(count / total, 4)

def percent(count, total):
    return round(share(count, total) * 100, 4)`,
    good: `def share(count, total):
    return count / total

def percent(count, total):
    return round(share(count, total) * 100, 4)`,
    note: 'A rounded value used in a later calculation carries its rounding error forward, and multiplying makes it bigger: the bad version gives `percent(1, 3)` as 33.33 instead of 33.3333. Even a division can move the 4th decimal place. Helpers return full precision; round once, as the value goes into the result.',
  },
  {
    mistake: 'header_order_assumed',
    bad: `for line in lines[1:]:
    fields = line.strip().split(',')
    members = int(fields[2])`,
    good: `header = lines[0].strip().lower().split(',')
members_col = header.index('members')
for line in lines[1:]:
    fields = line.strip().split(',')
    members = int(fields[members_col])`,
    note: 'Hidden test files shuffle the columns and add extra ones. Find every column from the header by name, once, before the loop.',
  },
  {
    mistake: 'invalid_row_not_skipped',
    bad: `for line in lines[1:]:
    fields = line.strip().split(',')
    name = fields[name_col]
    values[name] = int(fields[count_col])`,
    good: `for line in lines[1:]:
    fields = line.strip().split(',')
    if len(fields) != len(header):
        continue
    name = fields[name_col].strip().lower()
    try:
        count = int(fields[count_col])
    except ValueError:
        continue
    if name == '' or count < 0 or name in values:
        continue
    values[name] = count`,
    note: 'Project files contain blank lines, missing values, words like `n/a`, negative numbers and repeated names. Check the length, convert inside `try`, reject out-of-range values and duplicates, and only then store the row.',
  },
  {
    mistake: 'sort_tiebreak',
    bad: `rows.sort(key=lambda row: row[1], reverse=True)`,
    good: `rows.sort(key=lambda row: (-row[1], -row[2], row[0]))`,
    note: 'Hidden tests usually include ties. Put every tie-break in the key tuple in the order the task lists them. Negate numbers that go high to low, so names can still go A to Z.',
  },
  {
    mistake: 'zero_division',
    bad: `def cosine_sim(a, b):
    ...
    return round(dot / (sq_a ** 0.5 * sq_b ** 0.5), 4)`,
    good: `def cosine_sim(a, b):
    ...
    if sq_a == 0 or sq_b == 0:
        return None
    return round(dot / (sq_a ** 0.5 * sq_b ** 0.5), 4)`,
    note: 'An empty list, a list of zeros, a group with one value (for `n - 1`) and a filter that matches nothing all lead to dividing by zero. Check the denominator first and return the value the task names.',
  },
  {
    mistake: 'efficiency_repeat_pass',
    bad: `for club in clubs:
    with open(csvfile) as f:
        lines = f.readlines()
    totals[club] = total_for(lines, club)`,
    good: `with open(csvfile) as f:
    lines = f.readlines()
for line in lines[1:]:
    ...   # add each row to its group once`,
    note: 'Reading the file again for every group, or scanning every row inside a loop over groups, costs efficiency marks. Read once, loop over the rows once, and build a dictionary you can answer every part from.',
  },
];
