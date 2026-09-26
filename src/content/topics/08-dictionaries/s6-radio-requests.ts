// Topic 08, scenario 6: counting with get(), tracing a tally, and a tie-break on the winner (RTRFM request line).
import type { Scenario } from '../../schema.ts';

const s6: Scenario = {
  id: 't08-s6',
  title: 'RTRFM request line',
  story:
    'A volunteer on the evening show at RTRFM writes down every song listeners ring in to request. ' +
    'The show keeps one dictionary that maps each song title to the number of people who have asked for it.',
  questions: [
    {
      id: 't08-s6-q1',
      format: 'multi',
      diff: 'easy',
      core: true,
      title: 'What the tally can tell you',
      prompt:
        'This is the tally so far.\n\n' +
        'Select **every** statement that is true.',
      code: `requests = {'Cosmos': 3, 'Marrow': 2, 'Kalka': 3}`,
      options: [
        {
          id: 'a',
          text: "`'Kalka' in requests` is `True`, but `3 in requests` is `False`.",
          correct: true,
          why:
            'True. `in` looks at the keys only, and 3 is a value here, not a key. To ask about the counts you need `3 in requests.values()`.',
        },
        {
          id: 'b',
          text: "`len(requests)` is 3, and it is still 3 after `requests['Cosmos'] = 9`.",
          correct: true,
          why:
            'True. `len` counts keys, and a key can only appear once. Assigning to a key that is already there replaces its value instead of adding a second entry.',
        },
        {
          id: 'c',
          text: "`requests.get('Ochre')` raises `KeyError`, so a missing title has to be checked with `in` first.",
          correct: false,
          mistake: 'dict_keyerror',
          why:
            'False, and the wrong way round. `get` is the safe read: it returns `None` for a missing key, or the default you give it, as in `get(\'Ochre\', 0)`. ' +
            'It is `requests[\'Ochre\']` that raises `KeyError`.',
        },
        {
          id: 'd',
          text: "`requests['Ochre'] = 1` adds a new title, but `requests['Ochre'] += 1` would raise `KeyError`.",
          correct: true,
          why:
            'True. Assigning to a key that is not there creates it. `+=` has to read the old value before it can add to it, and that read is what fails.',
        },
        {
          id: 'e',
          text: '`for song in requests:` gives 3, 2 and 3 — the counts.',
          correct: false,
          mistake: 'return_type_wrong',
          why:
            'False. A plain `for` over a dictionary hands you the keys, so `song` is `\'Cosmos\'`, then `\'Marrow\'`, then `\'Kalka\'`. ' +
            'Use `requests.values()` for the counts, or `requests.items()` for both at once.',
        },
      ],
      concepts: ['dict', 'in-membership', 'dict-get', 'dict-keys'],
      detects: ['dict_keyerror', 'return_type_wrong'],
      expectedSec: 115,
      hints: [
        'Three of these turn on the difference between a key and a value. The other two are about what happens when a title is not in the dictionary yet.',
        'Try each statement on the tally by hand. For the last one, remember what a plain `for` over a dictionary hands you on each pass.',
        '`in`, `len` and a plain `for` all work on keys. `get` reads safely and returns a default; square brackets raise `KeyError` for a missing key, and `+=` reads before it writes.',
      ],
      solution: {
        explanation:
          'The dictionary maps three titles to three counts. Everything a dictionary does by default is about its **keys**.\n\n' +
          '- **a** is true: `in` searches the keys, so a count such as 3 is never found by it.\n' +
          '- **b** is true: `len` counts keys, and assigning to `\'Cosmos\'` overwrites the 3 rather than adding a fourth entry.\n' +
          '- **c** is false: `get` never raises. `requests.get(\'Ochre\')` is `None` and `requests.get(\'Ochre\', 0)` is 0, and neither of them adds the key.\n' +
          '- **d** is true: `requests[\'Ochre\'] = 1` creates the key, but `+=` is short for "read, add, store", and the read comes first.\n' +
          '- **e** is false: the loop variable takes the keys. `.values()` gives 3, 2, 3 and `.items()` gives the pairs.\n\n' +
          'This is why counting is written `counts[song] = counts.get(song, 0) + 1`: the `get` covers the first time a title is seen, and the assignment stores the new count.',
      },
      selfExplain: 'Which single line would you write to ask whether any song has been requested exactly 3 times?',
    },
    {
      id: 't08-s6-q2',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'Building the tally',
      prompt:
        'Five requests come in during the first hour, and the show counts them with the usual `get` pattern.\n\n' +
        'Fill in `song` and `counts` each time **line 4** finishes, one row per request. ' +
        'Write `song` in quotes, for example `\'Kalka\'`, and write `counts` the way Python shows a dictionary, for example `{\'Kalka\': 1}`.',
      code: `requests = ['Cosmos', 'Marrow', 'Cosmos', 'Kalka', 'Marrow']
counts = {}
for song in requests:
    counts[song] = counts.get(song, 0) + 1
print(counts)`,
      watch: ['song', 'counts'],
      anchorLine: 4,
      concepts: ['dict-get', 'counting', 'insertion-order', 'trace'],
      detects: ['dict_keyerror', 'accumulator_init'],
      expectedSec: 240,
      hints: [
        'Each pass deals with exactly one request: read the count so far, add 1, store it back under that title.',
        '`counts.get(song, 0)` is 0 the first time a title appears, so it is stored as 1. After that it is the number already in the dictionary. `counts` is never emptied, so every row builds on the one above it.',
        'Row 1 is `\'Cosmos\'` with `{\'Cosmos\': 1}`. Row 2 adds a second key: `{\'Cosmos\': 1, \'Marrow\': 1}`. A new key goes on the end; a key that is already there keeps its place and changes its value.',
      ],
      solution: {
        explanation:
          '`counts = {}` is set once, before the loop, so the tally survives from one request to the next. ' +
          'Line 4 does the whole job in one statement: `counts.get(song, 0)` is the count so far (0 for a title that has not been requested yet), ' +
          'and the assignment stores the new count under that title.\n\n' +
          '1. `\'Cosmos\'`: not there yet, so 0 + 1. `{\'Cosmos\': 1}`\n' +
          '2. `\'Marrow\'`: not there yet, so 0 + 1, and the new key goes on the end. `{\'Cosmos\': 1, \'Marrow\': 1}`\n' +
          '3. `\'Cosmos\'`: already 1, so 1 + 1. The key stays where it is. `{\'Cosmos\': 2, \'Marrow\': 1}`\n' +
          '4. `\'Kalka\'`: new again. `{\'Cosmos\': 2, \'Marrow\': 1, \'Kalka\': 1}`\n' +
          '5. `\'Marrow\'`: already 1, so 1 + 1. `{\'Cosmos\': 2, \'Marrow\': 2, \'Kalka\': 1}`\n\n' +
          'Keys come out in the order they were **first** added, which is why `\'Kalka\'` stays last even though it ends level with nothing. ' +
          'That order is not alphabetical and not by count, so any "most requested" answer has to work the counts out for itself. ' +
          'Writing `counts = {}` inside the loop would throw the tally away on every request and leave `{\'Marrow\': 1}` at the end.',
      },
      selfExplain: 'Why does a key never move once it has been added, even when its count changes?',
    },
    {
      id: 't08-s6-q3',
      format: 'fixBug',
      diff: 'hard',
      core: false,
      title: 'The tie that picks the wrong song',
      prompt:
        'At the end of the show the presenter reads out the most requested song.\n\n' +
        '`top_request(requests)` takes a list of titles, one entry per request, and must return the title with the **most** requests. ' +
        'When two or more titles are level on the most requests, it must return the one that comes **first alphabetically** (Python\'s `<` on strings). ' +
        'It returns `None` for an empty list.\n\n' +
        'The counting is right, but the function picks the wrong title whenever there is a tie. Fix it by changing one line.',
      buggy: `def top_request(requests):
    if len(requests) == 0:
        return None
    counts = {}
    for song in requests:
        counts[song] = counts.get(song, 0) + 1
    best = requests[0]
    for song in counts:
        if counts[song] > counts[best]:
            best = song
    return best`,
      bugMistake: 'sort_tiebreak',
      maxChangedLines: 1,
      fnName: 'top_request',
      tests: [
        { id: 'v1', call: "top_request(['Cosmos', 'Marrow', 'Cosmos'])", expect: "'Cosmos'", label: 'one clear winner', hidden: false },
        { id: 'v2', call: "top_request(['Zenith', 'Anchor'])", expect: "'Anchor'", label: 'two titles level on one request each', hidden: false, tag: 'sort_tiebreak' },
        { id: 'h1', call: 'top_request([])', expect: 'None', label: 'no requests at all', hidden: true },
        {
          id: 'h2', call: "top_request(['Marrow', 'Marrow', 'Anthem', 'Anthem', 'Cosmos'])", expect: "'Anthem'",
          label: 'two titles level on the most requests', hidden: true, tag: 'sort_tiebreak',
        },
        {
          id: 'h3', call: "top_request(['Cosmos', 'Braid', 'Anthem'])", expect: "'Anthem'",
          label: 'every title requested once', hidden: true, tag: 'sort_tiebreak',
        },
        { id: 'h4', call: "top_request(['Solo'])", expect: "'Solo'", label: 'a single request', hidden: true },
        {
          id: 'h5', call: "top_request(['Kalka', 'kalka', 'Kalka'])", expect: "'Kalka'",
          label: 'capitals make a different title', hidden: true, tag: 'case_sensitive_compare',
        },
        {
          id: 'h6', setup: "line_up = ['Marrow', 'Cosmos', 'Marrow']", call: 'top_request(line_up)', expect: "'Marrow'",
          argsUnchanged: ['line_up'], label: 'the list of requests is not changed', hidden: true, tag: 'mutated_input',
        },
      ],
      concepts: ['dict', 'counting', 'maximum', 'tie-break'],
      detects: ['sort_tiebreak', 'case_sensitive_compare', 'mutated_input'],
      expectedSec: 420,
      hints: [
        'The counting loop is fine. Look at what the second loop does when a title has exactly the same count as the best so far.',
        'The second loop keeps whichever title it met **first** among the ones on the top count, and a dictionary hands back keys in the order they were first added, not in alphabetical order. ' +
          'The `if` has to accept a title on an equal count as well, but only when that title comes earlier alphabetically.',
        'Strings compare with `<` in alphabetical order, so `\'Anchor\' < \'Zenith\'` is `True`. The condition grows into `counts[song] > counts[best] or (counts[song] == counts[best] and ...)`.',
      ],
      solution: {
        code: `def top_request(requests):
    if len(requests) == 0:
        return None
    counts = {}
    for song in requests:
        counts[song] = counts.get(song, 0) + 1
    best = requests[0]
    for song in counts:
        if counts[song] > counts[best] or (counts[song] == counts[best] and song < best):
            best = song
    return best`,
        explanation:
          'Only the `if` line changes.\n\n' +
          '- `counts[song] > counts[best]` still takes over whenever a title has a strictly higher count.\n' +
          '- `or (counts[song] == counts[best] and song < best)` is the tie-break: on an equal count the title only wins if it comes earlier alphabetically. ' +
          'The brackets matter, because `and` binds tighter than `or` but the condition is far easier to read with them.\n' +
          '- `song < best` compares strings the way `sorted` would, so `\'Anchor\' < \'Zenith\'` is `True`. `\'Kalka\'` and `\'kalka\'` are two separate titles because keys are exact strings, so here `\'Kalka\'` wins outright on the higher count (2 requests to 1), with no tie to break.\n\n' +
          'Without the tie-break the answer is whichever tied title was requested first, because a dictionary gives its keys back in the order they were first added. ' +
          'On `[\'Zenith\', \'Anchor\']` both titles have one request, `best` starts as `\'Zenith\'`, no count is ever strictly greater, and `\'Zenith\'` is returned.\n\n' +
          'The same job can be done by sorting instead: `sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))[0][0]`. ' +
          'That is one line, but the loop above is the version to be sure of by hand, and both need the tie-break spelled out.',
      },
      selfExplain: 'Why does the order the titles were first requested in decide the buggy answer?',
    },
  ],
};

export default s6;
