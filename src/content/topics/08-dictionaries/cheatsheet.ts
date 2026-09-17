import type { Topic } from '../../schema.ts';

export const cheatsheet = `**Create and read**

A dictionary maps keys to values. Keys are unique; looking up by key is how you read a value.

\`\`\`python
stock = {'flat white': 12, 'muffin': 3}
empty = {}                    # an empty dictionary

stock['muffin']               # 3
stock['latte']                # KeyError: 'latte'
stock.get('latte')            # None, no error
stock.get('latte', 0)         # 0, and 'latte' is still NOT added
'muffin' in stock             # True: in checks keys, not values
len(stock)                    # 2 (number of keys)
\`\`\`

**Add, change and remove**

\`\`\`python
stock['chai'] = 8             # adds a new key, or replaces the old value
stock['muffin'] += 10         # only works because 'muffin' already exists
del stock['chai']             # KeyError if the key is missing
left = stock.pop('muffin')    # removes the key and returns its value
\`\`\`

**Loop over a dictionary**

\`\`\`python
for item in stock:                    # keys
    print(item)
for count in stock.values():          # values
    print(count)
for item, count in stock.items():     # (key, value) pairs, unpacked
    print(item, count)
\`\`\`

- Keys come out in the order they were first added.
- Do not add or delete keys while looping over the same dictionary: Python raises \`RuntimeError: dictionary changed size during iteration\`. Build a new dictionary instead, or loop over \`list(stock)\`.
- Changing the value of a key that already exists inside the loop is fine.

**Count things**

\`\`\`python
counts = {}                               # once, before the loop
for word in words:
    counts[word] = counts.get(word, 0) + 1
\`\`\`

If case or spaces should not matter, clean the key first and use the cleaned key for every read and write: \`key = word.strip().lower()\`.

**Total or group by key**

\`\`\`python
totals = {}
for card, fare in trips:
    totals[card] = totals.get(card, 0) + fare

groups = {}
for name, day in records:
    if day not in groups:
        groups[day] = []                  # a NEW list for each new key
    groups[day].append(name)
\`\`\`

**Nested dictionaries and tuple keys**

\`\`\`python
best = {}
best['23310001'] = {}                     # inner dictionary for one student
best['23310001']['Lab01'] = 8
best['23310001'].get('Lab02', 0)          # 0

seats = {}
seats[('Row A', 12)] = 'Aisha'            # a tuple can be a key
\`\`\`

Keys must be values that cannot change: \`str\`, \`int\`, \`float\`, \`bool\`, or a \`tuple\` of these. A list as a key raises \`TypeError\` because a list is unhashable.

**Dictionary to a sorted list of tuples**

\`\`\`python
runs = {'Tane': 312, 'Mei': 405, 'Grace': 312}
ranked = sorted(runs.items(), key=lambda pair: (-pair[1], pair[0]))
# [('Mei', 405), ('Grace', 312), ('Tane', 312)]
top_two = ranked[:2]
\`\`\`

- A dictionary has no \`sort()\`. Sort \`d.items()\` with \`sorted\`, or make \`pairs = list(d.items())\` and call \`pairs.sort(key=...)\`.
- \`sorted(d)\` gives the keys only. \`sorted(d.items())\` sorts the pairs by key.
- The key \`(-pair[1], pair[0])\` means: number high to low, then name A to Z. The minus sign only works on numbers.
- \`reverse=True\` reverses every part of the key, so the names would come out Z to A.
- Without lambda: \`def by_value_then_key(pair): return (-pair[1], pair[0])\`, then \`key=by_value_then_key\` (no brackets after the name).

**Copies**

\`backup = stock\` gives the same dictionary a second name, so changes through either name show in both. \`dict(stock)\` makes a new dictionary, but lists stored inside it are still shared.

**Gotchas the night before**

- \`get(k, 0)\` only reads. It never stores the key.
- \`d[k] += 1\` crashes with KeyError the first time \`k\` is seen.
- \`'Perth'\`, \`'perth'\` and \`'Perth '\` are three different keys.
- \`312 in runs\` is \`False\` when 312 is only a value.
- \`d.items()\` is not a list. When the task says "return a list of tuples", return \`list(...)\` or \`sorted(...)\` of it.
- Do not name a variable \`dict\`; it hides the built-in \`dict()\`.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Rottnest quokka survey: the top sites',
  code: `def top_sites(sightings, n):
    """Return the n sites with the most quokkas as (site, total) tuples,
    most quokkas first, and sites on equal totals A to Z."""
    # Steps 2 and 3: one running total per cleaned site name
    totals = {}
    for site, count in sightings:
        site = site.strip().title()
        totals[site] = totals.get(site, 0) + count

    # Step 4: dictionary -> sorted list of (site, total) tuples
    ranked = list(totals.items())
    ranked.sort(key=lambda pair: (-pair[1], pair[0]))

    # Step 5: keep the top n
    return ranked[:n]


sightings = [('Thomson Bay', 14), ('Geordie Bay', 9), ('thomson bay ', 3),
             ('Longreach Bay', 9), ('Geordie Bay', 8)]
print(top_sites(sightings, 2))   # [('Geordie Bay', 17), ('Thomson Bay', 17)]`,
  steps: [
    '**Understand the input and output.** Volunteers log quokka sightings on Rottnest as `(site, count)` tuples, and the same site can appear many times with different capitals or spaces. The task returns a list of `(site, total)` tuples, at most `n` long. Work the example by hand first: Thomson Bay 14 + 3 = 17, Geordie Bay 9 + 8 = 17, Longreach Bay 9.',
    '**Choose the data structure.** "How many per site?" is a key-to-value question, so use a dictionary mapping each site to its running total. Clean the key before using it (`strip()` removes the spaces at both ends, then `title()` gives each word a capital first letter), so `\'thomson bay \'` adds to `\'Thomson Bay\'` instead of becoming a separate key.',
    '**Accumulate with get.** `totals = {}` goes before the loop, once. `totals[site] = totals.get(site, 0) + count` adds to the total so far, or starts from 0 for a new site, so there is no KeyError.',
    '**Turn the dictionary into a ranked list.** A dictionary cannot be sorted, so `list(totals.items())` makes a list of tuples. The key `(-pair[1], pair[0])` sorts totals high to low, then site names A to Z. Geordie Bay and Thomson Bay are level on 17, so Geordie Bay comes first.',
    '**Cut to size and check edge cases.** `ranked[:n]` gives the top `n`, or every site when there are fewer. An empty list of sightings gives `[]`. The function returns the list; the `print` at the bottom is only there to test it.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'dict_keyerror',
    bad: `counts = {}
for word in words:
    counts[word] += 1`,
    good: `counts = {}
for word in words:
    counts[word] = counts.get(word, 0) + 1`,
    note: 'Reading a key that is not there raises KeyError, and `+=` has to read the old value first. `get(word, 0)` reads safely with a default; the assignment then stores the new count.',
  },
  {
    mistake: 'mutate_while_iterating',
    bad: `for name in marks:
    if marks[name] < 50:
        del marks[name]`,
    good: `passed = {}
for name, mark in marks.items():
    if mark >= 50:
        passed[name] = mark`,
    note: 'Adding or deleting keys while looping over the same dictionary stops with `RuntimeError: dictionary changed size during iteration`. Build a new dictionary with the entries you want to keep. Changing the value of an existing key is allowed.',
  },
  {
    mistake: 'sort_tiebreak',
    bad: `ranked = sorted(runs.items(), key=lambda pair: pair[1], reverse=True)`,
    good: `ranked = sorted(runs.items(), key=lambda pair: (-pair[1], pair[0]))`,
    note: 'Entries with equal values keep whatever order the dictionary had, and hidden tests always include ties. Put the tie-break inside the key and negate the number; `reverse=True` would also flip the names to Z to A.',
  },
  {
    mistake: 'case_sensitive_compare',
    bad: `counts[stop] = counts.get(stop, 0) + 1`,
    good: `name = stop.strip().lower()
counts[name] = counts.get(name, 0) + 1`,
    note: "`'Perth'`, `'perth'` and `'Perth '` are three different keys. Clean the key once, then use the cleaned name for every check, read and write.",
  },
  {
    mistake: 'return_type_wrong',
    bad: `def ranking(totals):
    return sorted(totals)`,
    good: `def ranking(totals):
    return sorted(totals.items())`,
    note: 'Sorting or looping over a dictionary gives only its keys, and `totals.items()` on its own is not a list. When the task says "a list of (name, total) tuples", return `sorted(...)` or `list(...)` of `items()`.',
  },
  {
    mistake: 'aliasing_copy',
    bad: `groups = {}
names = []
for name, day in records:
    if day not in groups:
        groups[day] = names
    groups[day].append(name)`,
    good: `groups = {}
for name, day in records:
    if day not in groups:
        groups[day] = []
    groups[day].append(name)`,
    note: 'Assigning a list does not copy it. If every key is given the same list object, every day shares it and every name appears under every day. Create a new `[]` (or `{}` for a nested dictionary) inside the loop for each new key.',
  },
];
