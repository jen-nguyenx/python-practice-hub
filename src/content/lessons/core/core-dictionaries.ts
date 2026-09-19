// Core lesson for topic 08: dictionaries. Lookup, missing keys, counting, grouping, looping, ranking.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-dictionaries',
  title: 'Dictionaries',
  summary: 'Looking things up by name instead of by position, counting, grouping and ranking',
  track: 'core',
  topicId: 'dictionaries',
  minutes: 24,
  prereqs: ['core-lists-tuples'],
  outcomes: [
    'Store and look up values by a key of your own choosing',
    'Handle a key that might not be there without crashing',
    'Count and total things with a dictionary built inside a loop',
    'Group items into lists under a shared key',
    'Turn a dictionary into a ranked list of tuples with a tie-break',
  ],
  sections: [
    {
      id: 'lookup-by-name',
      title: 'Looking things up by name',
      blocks: [
        {
          kind: 'prose',
          body: 'A list answers "what is at position 3?". A dictionary answers by **key** instead: you choose the keys, they are usually words, and "how many flat whites are left?" or "which names are in Monday\'s lab?" stops needing a search from the start every time.',
        },
        {
          kind: 'shell',
          caption: 'A café stocktake.',
          lines: [
            "stock = {'flat white': 12, 'muffin': 3}",
            "stock['muffin']",
            'len(stock)',
            "'muffin' in stock",
            '12 in stock',
            "stock['chai'] = 8",
            "stock['muffin'] = stock['muffin'] + 10",
            'stock',
            "del stock['chai']",
            'stock',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'In the session above, `12 in stock` and `\'muffin\' in stock` were asked. Twelve is a value in that dictionary, not a key. What does `12 in stock` return?',
          options: [
            { text: 'False', correct: true, why: '`in` on a dictionary only ever looks at the keys. 12 sits on the right of a colon, as a value, so it is never found.' },
            { text: 'True', why: '12 is a value in `stock`, but `in` does not search values, only keys.' },
            { text: 'KeyError', why: '`in` never raises. It always answers with True or False, which is the whole point of asking before you read.' },
            { text: 'It depends on how many keys are in the dictionary', why: 'Whether a key exists does not depend on the size of the dictionary.' },
          ],
        },
        {
          kind: 'prose',
          body: 'The stocktake also shows one square-bracket assignment doing two jobs: on a new key it adds the entry, on an existing one it replaces the value. There is no separate "add" method, and no error either way.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What can be a key',
          body: 'Anything that cannot change: a string, a number, a boolean, or a tuple of those. A list cannot be a key, and trying raises an error about it being unhashable. A tuple key is how you index something by two things at once, such as a row and a seat number.',
        },
      ],
    },
    {
      id: 'missing-keys',
      title: 'When the key is not there',
      blocks: [
        {
          kind: 'prose',
          body: 'Reading a key that does not exist is an error, not an empty answer. That is deliberate: quietly getting nothing back for a key you believe is there would hide a real bug. But it means every lookup of a key you are not certain about needs handling, with `in` or with `get`.',
        },
        {
          kind: 'quiz',
          prompt: '`stock` has no `\'latte\'` key. What happens on each of these two lines, run one after the other?',
          code: "stock = {'flat white': 12, 'muffin': 3}\nprint(stock['latte'])\nprint(stock.get('latte'))\n",
          options: [
            { text: 'The first line raises KeyError; the second prints None', correct: true, why: 'Square brackets demand the key exist. `get` asks and supplies a fallback instead of raising — `None` when none is given.' },
            { text: 'Both lines raise KeyError', why: '`get` is built exactly to avoid that: a missing key becomes `None`, or whatever fallback you gave it, instead of an error.' },
            { text: 'Both lines print None', why: 'Square-bracket access on a missing key does not print anything — it raises before the program can print at all.' },
            { text: 'The first line prints None; the second raises', why: 'It is the other way around: square brackets are the strict one, `get` is the forgiving one.' },
          ],
        },
        {
          kind: 'code',
          caption: '`get` with a fallback, and proof that asking about a key never creates it.',
          code: "stock = {'flat white': 12, 'muffin': 3}\nprint(stock.get('latte', 0))\nprint(stock)\n",
        },
        {
          kind: 'experiment',
          id: 't08-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'A dictionary maps a card number to its balance. You want to add 5 to a card that might be new. Why is `balances[card] = balances[card] + 5` wrong, and why is `get` enough to fix it?',
          answer: 'The right-hand side reads the key before anything has been stored under it, so a new card raises the error you saw above. `balances[card] = balances.get(card, 0) + 5` reads with a fallback of 0 for a card that has never been seen, then stores the result. The assignment is what creates the key; the `get` never does.',
        },
      ],
    },
    {
      id: 'counting',
      title: 'Counting things',
      blocks: [
        {
          kind: 'prose',
          body: 'Counting how many times each thing appears is the most common use of a dictionary in this unit: an empty dictionary before the loop, then one line inside it that reads the count so far and writes back one more.',
        },
        {
          kind: 'compare',
          caption: 'Counting song requests. One of these never gets past the first word.',
          left: {
            label: 'Adding to a count that is not there yet',
            code: "requests = ['Cosmic', 'Bluff', 'Cosmic']\ncounts = {}\nfor song in requests:\n    counts[song] += 1\nprint(counts)\n",
            bad: true,
          },
          right: {
            label: 'Reading with a fallback first',
            code: "requests = ['Cosmic', 'Bluff', 'Cosmic']\ncounts = {}\nfor song in requests:\n    counts[song] = counts.get(song, 0) + 1\nprint(counts)\n",
          },
        },
        {
          kind: 'prose',
          body: '`+=` has to read the old value before it can add to it, so the first sighting of any key fails the same way a missing-key lookup always does. `get(song, 0)` handles the first sighting and every one after it with the same line — and swapping the 1 for an amount turns a tally into a running total.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'tally-grows',
            title: 'Watching a tally fill up',
            intro: 'Drag how many requests have come in so far. The counting line never changes; only how much data it has seen does.',
            template: "requests = ['Solid Rock', 'Down Under', 'Solid Rock', 'Flame Trees', 'Down Under', 'Solid Rock', 'Khe Sanh', 'Down Under', 'Flame Trees', 'Solid Rock']\ncounts = {}\nfor song in requests[:⟦n⟧]:\n    counts[song] = counts.get(song, 0) + 1\nprint(counts)\n",
            knobs: [
              { id: 'n', kind: 'range', label: 'requests counted so far', min: 1, max: 10, start: 5 },
            ],
            probes: {
              values: '[c for _, c in counts.items()]',
              labels: '[k for k, _ in counts.items()]',
            },
            visual: {
              kind: 'bars',
              values: 'values',
              labels: 'labels',
              caption: 'One bar per song counted so far, in the order it was first requested.',
            },
            notes: {
              '0': 'Only the first request has come in, so there is exactly one bar, and it is 1 tall. A tally starts the same way a running total does: from nothing.',
              '2': 'By the third request, Solid Rock has already been asked for twice. Its bar is the tallest here even though only two different songs have been heard from at all.',
              '9': 'All ten requests counted: four songs, each bar in the order it was first requested, tallest to the one asked for most. Nothing here needed sorting, because the dictionary already remembers the order the keys first appeared in.',
            },
            takeaway: 'A tally is a running total kept in more than one place at once. The line that updates it, `counts[key] = counts.get(key, 0) + 1`, does not change as more data arrives or as new keys turn up — it is the same line whether this is the first request or the last, which is exactly why it belongs inside the loop rather than needing a special case for the first sighting of anything.',
          },
        },
        {
          kind: 'code',
          caption: 'Counting, then totalling, over the same trips.',
          code: "trips = [('SR001', 3.2), ('SR002', 4.8), ('SR001', 2.1)]\n\ncounts = {}\ntotals = {}\nfor card, fare in trips:\n    counts[card] = counts.get(card, 0) + 1\n    totals[card] = totals.get(card, 0) + fare\nprint(counts)\nprint(totals)\n",
        },
        {
          kind: 'prose',
          body: 'One fare total above did not come out as tidily as the other — ordinary decimal arithmetic, nothing to do with dictionaries. Round money at the moment you print or return it, not as you accumulate it.',
        },
        {
          kind: 'experiment',
          id: 't08-x3',
        },
        {
          kind: 'code',
          caption: 'Keys are compared exactly, so a capital letter or a stray space makes a different key. The same four station names, counted two ways.',
          code: "stops = ['Perth', 'perth', 'Perth ', 'Joondalup']\nraw = {}\nclean = {}\nfor s in stops:\n    raw[s] = raw.get(s, 0) + 1\n    key = s.strip().lower()\n    clean[key] = clean.get(key, 0) + 1\nprint(raw)\nprint(len(raw))\nprint(clean)\nprint(len(clean))\n",
        },
        {
          kind: 'prose',
          body: 'Clean the key once, on the way in, and then use the cleaned version for every read and every write. Cleaning it in some places and not others gives you both spellings in the same dictionary, which is worse than not cleaning it at all.',
        },
      ],
    },
    {
      id: 'grouping',
      title: 'Grouping into lists',
      blocks: [
        {
          kind: 'prose',
          body: 'Sometimes what sits under a key is not a number but a list: every name in Monday\'s lab, every species found in one survey area. Before appending, check whether the key exists yet, and if it does not, start it off with an empty list.',
        },
        {
          kind: 'compare',
          caption: 'Both versions create the key first. Only one of them creates a new list for it.',
          left: {
            label: 'One list, handed to every key',
            code: "records = [('Ava', 'Mon'), ('Kai', 'Tue'), ('Noor', 'Mon')]\ngroups = {}\nnames = []\nfor name, day in records:\n    if day not in groups:\n        groups[day] = names\n    groups[day].append(name)\nprint(groups)\n",
            bad: true,
          },
          right: {
            label: 'A new list for each key',
            code: "records = [('Ava', 'Mon'), ('Kai', 'Tue'), ('Noor', 'Mon')]\ngroups = {}\nfor name, day in records:\n    if day not in groups:\n        groups[day] = []\n    groups[day].append(name)\nprint(groups)\n",
          },
        },
        {
          kind: 'prose',
          body: 'This is aliasing again, wearing a different hat. `groups[day] = names` puts a second label on the one list that already exists, so every key points at the same list and every append is seen by all of them. `groups[day] = []` makes a fresh empty list each time a new key appears — the same rule applies to a dictionary of dictionaries: the inner `{}` has to be created inside the loop.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Could the check be written `groups[day] = groups.get(day, [])` instead of the two lines with `if`?',
          answer: 'Yes, and it behaves correctly, because `get` builds a fresh empty list each time it needs the fallback. The `if` version is easier to read and is what most worked solutions use, but neither shares a list between keys. What you cannot do is create a single empty list once, above the loop, and hand that one out.',
        },
      ],
    },
    {
      id: 'looping',
      title: 'What a loop over a dictionary hands you',
      blocks: [
        {
          kind: 'predict',
          ask: 'This loops over a dictionary directly. Does it print the keys, the values, or the pairs?',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\nfor name in marks:\n    print(name)\n",
          choices: ['Ava\nKai\nNoor', '72\n41\n63', "Ava 72\nKai 41\nNoor 63"],
        },
        {
          kind: 'code',
          caption: 'Looping over a dictionary directly hands you the keys. `.values()` and `.items()` give the other two.',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\n\nfor mark in marks.values():\n    print('value:', mark)\n\nfor name, mark in marks.items():\n    print('pair:', name, mark)\n",
        },
        {
          kind: 'prose',
          body: 'Use `items()` whenever the body needs both halves, unpacked in the header the way you would a list of tuples. Keys come out in the order they were first added, which is not the same as sorted order.',
        },
        {
          kind: 'experiment',
          id: 't08-x2',
        },
        {
          kind: 'code',
          caption: 'Adding or removing keys while looping over the same dictionary is not allowed. This raises on purpose.',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\nfor name in marks:\n    if marks[name] < 50:\n        del marks[name]\nprint(marks)\n",
        },
        {
          kind: 'code',
          caption: 'The fix: build a new dictionary of the entries to keep, and leave the original alone.',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\npassed = {}\nfor name, mark in marks.items():\n    if mark >= 50:\n        passed[name] = mark\nprint(passed)\nprint(marks)\n",
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Changing a value is fine',
          body: 'The rule is about adding and removing **keys**. Setting a new value on a key that already exists while you loop is allowed, because the set of keys never changes.',
        },
      ],
    },
    {
      id: 'ranking',
      title: 'From a dictionary to a ranking',
      blocks: [
        {
          kind: 'prose',
          body: 'A dictionary has no order you can rely on for output, and no `sort` of its own. Most dictionary questions do not stop at the tally — they want the top three, or the ladder — so the last step is turning it into a list of tuples and sorting that.',
        },
        {
          kind: 'code',
          caption: 'Asking a dictionary to sort itself. This raises on purpose.',
          code: "runs = {'Tane': 312, 'Mei': 405}\nruns.sort()\nprint(runs)\n",
        },
        {
          kind: 'prose',
          body: '`items()` is the bridge. It gives the pairs, and `sorted` turns any of these into a real list, which is what a specification asking for "a list of tuples" means.',
        },
        {
          kind: 'code',
          caption: 'Four ways to order the same three batters. Two names are tied on runs.',
          code: "runs = {'Tane': 312, 'Mei': 405, 'Grace': 312}\nprint(runs.items())\nprint(sorted(runs))\nprint(sorted(runs.items()))\nprint(sorted(runs.items(), key=lambda pair: pair[1], reverse=True))\nprint(sorted(runs.items(), key=lambda pair: (-pair[1], pair[0])))\n",
        },
        {
          kind: 'prose',
          body: '`items()` on its own is not a list, so returning it where a list was asked for loses the mark. `sorted(runs)` gives the keys only. `sorted(runs.items())` sorts by key alphabetically. The last two both rank by runs, highest first, and disagree about the tied batters: sorting by value alone leaves ties in whatever order the dictionary happened to have, while putting the name second in the key settles them — and negating the number lets runs go high to low while names still go A to Z.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In the paper',
          body: 'One question is reliably "build a dictionary from this data, then return it as a sorted list of tuples", and the marks split between the counting and the ordering. The test data always contains a tie, so write the key as a tuple with the tie-break in it from the start.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You need the top three by total, ties broken alphabetically. Sketch the last two lines of the function.',
          answer: '`ranked = sorted(totals.items(), key=lambda pair: (-pair[1], pair[0]))`, then `return ranked[:3]`. The slice is safe on a dictionary with fewer than three entries, because a slice never complains about running past the end; it hands back what there is. If the task says "a list of names", loop over `ranked[:3]` and append `pair[0]`, or unpack each pair in the header.',
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'A whole one, worked',
      blocks: [
        {
          kind: 'prose',
          body: 'Every part of this lesson appears in one function: clean the key, total with a fallback, turn the dictionary into a list of pairs, sort with a tie-break, and cut it to size. Read the code and try to name the five steps before you open them.',
        },
        {
          kind: 'workedExample',
        },
        {
          kind: 'checkpoint',
          prompt: 'Skip the site-name cleaning step in the worked example above. The totals still print, the ranking still runs without complaint — so what is actually wrong with the answer?',
          answer: 'Two spellings of the same site now land under two different keys, so their readings are split into two smaller totals instead of one correct one. Nothing raises, because a dictionary is perfectly happy holding both keys — the ranking is silently built from the wrong groups.',
        },
      ],
    },
    {
      id: 'traps',
      title: 'What goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'Three of these stop the program and three of them hand you a wrong answer in silence. The silent ones are the expensive ones.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'The café stock and wildflower survey scenarios cover missing keys and counting; the Scorchers rankings and the RTRFM request line are where the sorting and the tie-breaks are.',
        },
      ],
    },
  ],
};

export default lesson;
