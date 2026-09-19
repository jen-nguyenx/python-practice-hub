// "What if" experiments for dictionaries. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const lookup: Experiment = {
  id: 't08-x1',
  title: 'Asking for something the dictionary might not have',
  intro:
    'The cafe knows about flat whites and muffins, and nothing else. Pick what to ask for and how to ask for it, and watch what comes back — and what happens when you then try to use it as a number.',
  template:
    "stock = {'flat white': 12, 'muffin': 3}\nitem = ⟦key⟧\nfound = ⟦lookup⟧\nprint(found)\nprint(found + 1)\n",
  knobs: [
    {
      id: 'key',
      label: 'ask about',
      choices: [
        { value: "'muffin'", caption: 'muffin (the cafe has it)' },
        { value: "'latte'", caption: 'latte (the cafe has never heard of it)' },
      ],
    },
    {
      id: 'lookup',
      label: 'look it up with',
      choices: [
        { value: 'stock[item]', caption: 'square brackets' },
        { value: 'stock.get(item)', caption: 'get, with no spare answer' },
        { value: 'stock.get(item, 0)', caption: 'get, with 0 as the spare answer' },
      ],
    },
  ],
  notes: {
    '0-0':
      'The everyday case. The key is there, so square brackets hand back its value, 3, and adding 1 works.',
    '0-1':
      '`get` is not only for missing keys. When the key is there it hands back exactly the same value the brackets would, 3.',
    '1-0':
      'A **KeyError**. Square brackets have no way of saying "not here", so they stop the program, and the message is the key you asked for.',
    '1-1':
      "No crash on the lookup, but `get` with nothing to fall back on hands you `None`, which means \"no answer\". The crash arrives one line later, when you try to add 1 to nothing: **TypeError**. This is the one that wastes an afternoon, because the error appears nowhere near the lookup that caused it.",
    '1-2':
      'The safe version. The second thing you pass `get` is the answer to use when the key is missing, so a cafe that has never sold a latte counts as 0 and the arithmetic still works.',
  },
  takeaway:
    'Three lookups, three different behaviours when the key is missing: brackets stop the program on the spot, `get(key)` hands back `None` and lets the crash happen later somewhere confusing, and `get(key, 0)` hands back a real number you can keep working with. Use brackets when the key must be there and you want to hear about it if it is not; use `get(key, 0)` whenever a missing key just means "none yet". And `get` never adds the key to the dictionary — it only reads.',
};

const looping: Experiment = {
  id: 't08-x2',
  title: 'What a for loop over a dictionary actually hands you',
  intro:
    'The same loop, over three different things. Watch what gets printed each time round, then watch what happens when you try to add it up.',
  template:
    "stock = {'flat white': 12, 'muffin': 3}\ntotal = 0\nfor thing in ⟦over⟧:\n    print(thing)\n    total = total + ⟦add⟧\nprint('total', total)\n",
  knobs: [
    {
      id: 'over',
      label: 'loop over',
      choices: [
        { value: 'stock', caption: 'the dictionary itself' },
        { value: 'stock.values()', caption: 'its values' },
        { value: 'stock.items()', caption: 'its pairs' },
      ],
    },
    {
      id: 'add',
      label: 'add on',
      choices: [
        { value: 'thing', caption: 'whatever the loop handed me' },
        { value: 'stock[thing]', caption: 'the value stored under it' },
      ],
    },
  ],
  notes: {
    '0-0':
      'Looping over a dictionary hands you the **keys**, not the counts, so this tries to add the words to a number: **TypeError**. Almost everyone writes this loop first.',
    '0-1':
      'The usual, correct shape: loop over the dictionary to get each key, then use `stock[key]` when you need the value. Total 15.',
    '1-0':
      '`.values()` hands over the numbers themselves, so adding them up needs no lookup at all. Also 15, by a shorter route.',
    '1-1':
      'A **KeyError** saying 12. The loop already gave you the value, and 12 is not a key, so looking it up asks the dictionary for something that was never in it.',
    '2-0':
      '`.items()` hands over a whole pair at a time, printed as `(\'flat white\', 12)`. A pair is not a number, so adding it up is a **TypeError**. This is why pairs are normally unpacked: `for name, count in stock.items():`.',
    '2-1':
      'A **KeyError** showing the whole pair. You looked the pair up as if it were a key; the key is only the first half of it.',
  },
  takeaway:
    'A dictionary is not a list of values. Looping over it plainly gives you the **keys**; `.values()` gives the values; `.items()` gives both as a pair. Most `TypeError` and `KeyError` messages in a dictionary loop are this one mistake: you have the key and treated it as a value, or you have the value and looked it up as a key. Read the loop line first and ask "what is in this variable?".',
};

const counting: Experiment = {
  id: 't08-x3',
  title: 'Counting things, and why the same word can count three times',
  intro:
    'Three orders came in for tea, typed slightly differently each time. Change how the name is tidied up and how the count is updated, and watch the table build as the loop goes round.',
  template:
    "words = ['tea', 'Tea', 'tea ']\ncounts = {}\nfor word in words:\n    key = ⟦clean⟧\n    ⟦update⟧\nprint(counts)\n",
  knobs: [
    {
      id: 'clean',
      label: 'tidy the name first',
      choices: [
        { value: 'word', caption: 'no, use it exactly as typed' },
        { value: 'word.strip().lower()', caption: 'yes, drop the spaces and the capitals' },
      ],
    },
    {
      id: 'update',
      label: 'each time round the loop',
      choices: [
        { value: 'counts[key] = counts.get(key, 0) + 1', caption: 'one more than the count so far' },
        { value: 'counts[key] += 1', caption: 'add one to the count' },
        { value: 'counts[key] = 1', caption: 'set the count to 1' },
      ],
    },
  ],
  watch: ['key', 'counts'],
  anchorLine: 5,
  notes: {
    '1-0':
      'The right answer: one entry, `tea`, counted 3. `get(key, 0)` says "the count so far, or 0 if this is the first time", and the assignment stores the new count.',
    '0-0':
      'Three separate entries, each counted once. `\'tea\'`, `\'Tea\'` and `\'tea \'` are three different keys, because a capital letter and a trailing space make a different piece of text. The counting code is perfect; the keys are not.',
    '1-1':
      'A **KeyError** on the very first order. `+=` has to read the old count before it can add to it, and on the first tea there is no old count to read. This is the single most common dictionary crash.',
    '0-1': 'Still a **KeyError**, and tidying the name does not help: the first time any key is seen, there is nothing there to add one to.',
    '1-2':
      'One entry, counted 1. Every order overwrites the last, so the dictionary ends up remembering only that tea was ordered at all, not how often.',
    '0-2':
      'The same wrong result as counting properly with untidy keys — three entries of 1. When every key is different you cannot tell a working counter from a broken one, which is exactly why this bug survives testing.',
  },
  takeaway:
    'Counting takes two things, and both have to be right. The update has to read the old value and put a new one back: `counts[key] = counts.get(key, 0) + 1`, never `counts[key] += 1` on a key that may be new. And the key has to be tidied **before** it is used, once, with the tidied name used for every read and write — otherwise `Perth`, `perth` and `Perth ` quietly become three different entries.',
};

export const experiments: Experiment[] = [lookup, looping, counting];
