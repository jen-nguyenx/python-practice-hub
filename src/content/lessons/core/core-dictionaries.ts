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
          body: 'A list answers the question "what is at position 3?". Very little real data is organised that way. The questions you actually have are "how many flat whites are left?", "what did this card spend?", "which names are in Monday\'s lab?". None of those is about a position, and answering them with a list means searching it from the start every time and hoping nothing moved.\n\nA dictionary answers by **key**. You choose the keys, they are usually words, and looking one up takes the same time whether there are ten entries or ten thousand.',
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
          kind: 'prose',
          body: 'Note what `in` asked about. It looked for a key, not a value, which is why the line testing a number that appears on the right-hand side of the colon answered the way it did. That trips people up in exactly the questions where it matters.\n\nNote too that one square-bracket assignment does two different jobs. Used on a key that is not there it adds the entry; used on one that is there it replaces the value. There is no separate "add" method, and no error either way.',
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
          body: 'Reading a key that does not exist is an error, not an empty answer. That is the right behaviour, because asking for a key you believe is there and quietly getting nothing back would hide a real bug. But it means every lookup of a key you are not certain about needs handling.\n\nThere are two tools. `in` asks first. `get` asks and supplies a fallback in one step.',
        },
        {
          kind: 'code',
          caption: 'The first three lines work. The last one raises on purpose.',
          code: "stock = {'flat white': 12, 'muffin': 3}\nprint(stock.get('latte'))\nprint(stock.get('latte', 0))\nprint(stock)\nprint(stock['latte'])\n",
        },
        {
          kind: 'prose',
          body: 'Two things to take from that. `get` with nothing to fall back on still answers rather than failing, and what it answers with is Python\'s word for no value at all. `get` with a second argument answers with that instead, which is usually what you want when the value is about to be used in a sum.\n\nAnd look at the third line of output, printed after both `get` calls. Asking about a key does not create it. `get` only ever reads.',
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
          body: 'Counting how many times each thing appears is the most common use of a dictionary in this unit, and the pattern is three lines long. An empty dictionary before the loop, then one line inside it that reads the count so far and writes back one more.\n\nThe short version of that line is the one that breaks.',
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
          body: '`+=` has to read the old value before it can add to it, so on the very first sighting of any key it fails for the reason the previous section showed. The fix is not a special case for the first time; `get(song, 0)` handles the first time and every time after it with the same line.\n\nThe same pattern totals rather than counts. Swap the 1 for the amount, and the dictionary holds a running total per key instead of a tally.',
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
          body: 'One fare total above did not come out as tidily as the other. That is ordinary decimal arithmetic, which stores most fractions approximately, and it has nothing to do with dictionaries. It is a reason to round money at the moment you print or return it rather than as you accumulate it.',
        },
        {
          kind: 'experiment',
          id: 't08-x3',
        },
        {
          kind: 'prose',
          body: 'Because keys are compared exactly, a capital letter or a stray space makes a different key. Data typed by people is full of both, and the tally splits itself without any sign that anything is wrong.',
        },
        {
          kind: 'code',
          caption: 'The same four station names, counted two ways.',
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
          body: 'Sometimes the answer to "what is under this key" is not a number but a collection: every name in Monday\'s lab, every species found in one survey area. The value stored against the key is then a list, and it grows as the loop goes on.\n\nThe pattern needs one extra line. Before appending, check whether the key exists yet, and if it does not, start it off with an empty list.',
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
          body: 'This is aliasing again, wearing a different hat. `groups[day] = names` does not put a list into the dictionary; it puts a second label on the one list that already exists, so every key ends up pointing at the same one and every append is seen by all of them.\n\n`groups[day] = []` writes the two characters that mean "make a new empty list right here", and it runs afresh each time a new key appears. The same applies to a dictionary of dictionaries: the inner `{}` has to be created inside the loop.',
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
          kind: 'prose',
          body: 'Looping over a dictionary directly gives you the **keys**, one at a time, not the pairs and not the values. That catches people out because it looks as though it ought to give you everything.\n\nThere are three ways to loop, and picking the right one removes a whole line of lookups from the body.',
        },
        {
          kind: 'code',
          caption: 'The same dictionary, three loops.',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\n\nfor name in marks:\n    print('key:', name)\n\nfor mark in marks.values():\n    print('value:', mark)\n\nfor name, mark in marks.items():\n    print('pair:', name, mark)\n",
        },
        {
          kind: 'prose',
          body: 'Use `items()` whenever the body needs both halves, and unpack them in the header the way you would with a list of tuples. The keys come out in the order they were first added, which is worth knowing and is not the same as sorted order.',
        },
        {
          kind: 'experiment',
          id: 't08-x2',
        },
        {
          kind: 'prose',
          body: 'One thing is not allowed: adding or removing keys while looping over the same dictionary. Python notices and stops rather than producing half an answer.',
        },
        {
          kind: 'code',
          caption: 'Deleting while looping. This raises on purpose.',
          code: "marks = {'Ava': 72, 'Kai': 41, 'Noor': 63}\nfor name in marks:\n    if marks[name] < 50:\n        del marks[name]\nprint(marks)\n",
        },
        {
          kind: 'prose',
          body: 'The error names the reason. Build a new dictionary containing the entries you want to keep, which is clearer anyway and leaves the original available if you need it.',
        },
        {
          kind: 'code',
          caption: 'Keeping the passes, without touching the original.',
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
          body: 'A dictionary has no order you can rely on for output, and it has no `sort` of its own. Questions almost never stop at the tally: they want the top three, or the ladder, or everything in order. So the last step of most dictionary questions is turning it into a list of tuples and sorting that.',
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
          body: 'Take those in order. `items()` on its own is not a list and does not print like one, so returning it where a list was asked for loses the mark. `sorted(runs)` gives the keys only, with the values gone entirely. `sorted(runs.items())` sorts by key, alphabetically, because the first part of each tuple is compared first.\n\nThe last two both rank by runs, highest first, and they disagree about the two tied batters. Sorting by the value alone leaves ties in whatever order the dictionary happened to have. Putting the name in the key as a second part settles them, and negating the number is what lets the runs go high to low while the names still go A to Z.',
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
          kind: 'prose',
          body: 'The cleaning of the site name in step 2 is what makes the two spellings land on one key, and everything downstream depends on it. Skip it and the totals look plausible, the ranking runs without complaint, and the answer is wrong.',
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
