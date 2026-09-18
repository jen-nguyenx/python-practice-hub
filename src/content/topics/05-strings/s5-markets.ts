// Scenario 5: sign and label printing for a stall at the Fremantle markets.
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s5',
  title: 'Signs for a Fremantle markets stall',
  story:
    'A stallholder at the Fremantle markets prints her own price labels and signs. The software behind the label printer is all string work: cutting the price out of a label, checking a barcode, sizing the font to the widest word, and putting a sign into title case.',
  questions: [
    {
      id: 't05-s5-q1',
      format: 'multi',
      diff: 'easy',
      core: false,
      title: 'Cut the price out of a label',
      prompt:
        "Every price label is written the same way: a dollar sign, the price, then the unit. Select **every** expression that gives exactly the string `'12.50'`.",
      code: "label = '$12.50/kg'",
      concepts: ['slicing', 'indexing', 'negative-index'],
      detects: ['off_by_one_range'],
      expectedSec: 110,
      options: [
        {
          id: 'a',
          text: 'label[1:6]',
          correct: true,
          why: "Positions 1 to 5 are `'1'`, `'2'`, `'.'`, `'5'`, `'0'`. The stop, 6, is not included, so this is `'12.50'`.",
        },
        {
          id: 'b',
          text: 'label[1:5]',
          correct: false,
          mistake: 'off_by_one_range',
          why: "This stops before position 5, so the final `'0'` is missing: `'12.5'`. A slice `[a:b]` has `b - a` characters, and 5 characters starting at 1 need a stop of 6.",
        },
        {
          id: 'c',
          text: 'label[1:-3]',
          correct: true,
          why: "A negative stop counts from the end: -3 is the `'/'` at position 6, and the slice stops before it. Same five characters, `'12.50'`.",
        },
        {
          id: 'd',
          text: 'label[-8:-3]',
          correct: true,
          why: "The label is 9 characters, so -8 is position 1 and -3 is position 6. Mixing negative numbers on both sides is fine as long as the start comes before the stop.",
        },
        {
          id: 'e',
          text: 'label[0:6]',
          correct: false,
          mistake: 'off_by_one_range',
          why: "Position 0 is the `'$'`, so this gives `'$12.50'`. The first character of a string is at 0, not 1, so the price starts at position 1.",
        },
      ],
      hints: [
        'Write the label out with a position number under each character, from 0, and then the negative numbers from -1 at the right-hand end.',
        'A slice keeps the start position and stops *before* the stop position. Work out which position holds the last `0` of the price, then add one to get the stop.',
        "The `'$'` is at 0 and `'1'` is at 1. The price uses positions 1 to 5, and the `'/'` sits at position 6.",
      ],
      solution: {
        explanation:
          "Number the label: `$`0 `1`1 `2`2 `.`3 `5`4 `0`5 `/`6 `k`7 `g`8. The string is 9 characters long, so -1 is the `'g'` at 8 and -8 is the `'1'` at 1.\n\n`label[1:6]` keeps positions 1, 2, 3, 4 and 5 and stops before 6: `'12.50'`.\n\n`label[1:-3]` is the same slice written from the other end, because -3 is position 6.\n\n`label[-8:-3]` starts at position 1 and stops before position 6, so again `'12.50'`.\n\n`label[1:5]` stops one character too early and gives `'12.5'`; `label[0:6]` starts one character too early and keeps the `'$'`.",
      },
      selfExplain: "Which slice would give the unit 'kg' from this label, using negative numbers?",
    },
    {
      id: 't05-s5-q2',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'Barcode check digit',
      prompt:
        'The stall scanner works out a check digit by adding each digit of the barcode multiplied by its position in the queue: the first digit counts once, the second twice, and so on. Fill in `ch`, `total` and `weight` each time line 6 finishes running.',
      code: "barcode = '20791'\ntotal = 0\nweight = 1\nfor ch in barcode:\n    total += int(ch) * weight\n    weight += 1\nprint(total % 9)",
      watch: ['ch', 'total', 'weight'],
      anchorLine: 6,
      concepts: ['loop-over-string', 'accumulator', 'str-vs-int'],
      detects: ['str_int_concat', 'accumulator_init'],
      expectedSec: 220,
      hints: [
        '`ch` is a one-character string, so `int(ch)` is needed before it can be multiplied. Both `total` and `weight` keep their values from the previous pass.',
        'Each pass does two things in order: add `int(ch) * weight` to `total`, then add 1 to `weight`. Record the row only after both lines have run.',
        'Pass 1: `ch` is `\'2\'`, `total` is 2 and `weight` is already 2 by the time line 6 has finished.',
      ],
      solution: {
        explanation:
          "`total` starts at 0 and `weight` at 1, both before the loop, so they carry over from pass to pass.\n\nPass 1: `ch` is `'2'`. `int('2') * 1` is 2, so `total` is 2, then `weight` becomes 2.\n\nPass 2: `ch` is `'0'`. `0 * 2` adds nothing, `total` stays 2, and `weight` becomes 3.\n\nPass 3: `ch` is `'7'`. `7 * 3` is 21, so `total` is 23, and `weight` becomes 4.\n\nPass 4: `ch` is `'9'`. `9 * 4` is 36, so `total` is 59, and `weight` becomes 5.\n\nPass 5: `ch` is `'1'`. `1 * 5` is 5, so `total` is 64, and `weight` becomes 6.\n\nThe last line prints `64 % 9`, which is 1. Without `int(ch)`, line 5 would raise a TypeError, because a string can only be multiplied by a whole number, never added to one.",
      },
      selfExplain: "What would total be if weight += 1 were the first line of the loop body instead of the last?",
    },
    {
      id: 't05-s5-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Widest word on the sign',
      prompt:
        "The printer sizes the font from the longest word on a sign. Build `longest_word(sentence)`, which returns the **longest word** as a string, or `''` when there are no words. If two words are equally long, return the one that comes first. Put the lines in order with the right indentation. Not every line is needed.",
      lines: [
        { text: 'def longest_word(sentence):', indent: 0 },
        { text: "best = ''", indent: 1 },
        { text: 'for word in sentence.split():', indent: 1 },
        { text: 'if len(word) > len(best):', indent: 2 },
        { text: 'best = word', indent: 3 },
        { text: 'return best', indent: 1 },
      ],
      distractors: [
        { text: 'if len(word) >= len(best):', indent: 2, mistake: 'sort_tiebreak' },
        { text: 'best = 0', indent: 1, mistake: 'accumulator_init' },
      ],
      indentMatters: true,
      fnName: 'longest_word',
      tests: [
        {
          id: 'v1',
          call: "longest_word('fresh fruit and vegetables')",
          expect: "'vegetables'",
          label: 'longest word comes last',
          hidden: false,
        },
        {
          id: 'v2',
          call: "longest_word('quokka is a cheeky animal')",
          expect: "'quokka'",
          label: 'three words of length 6',
          hidden: false,
          tag: 'sort_tiebreak',
        },
        {
          id: 'h1',
          call: "longest_word('')",
          expect: "''",
          label: 'empty sign',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h2',
          call: "longest_word('bread rolls')",
          expect: "'bread'",
          label: 'two words of the same length',
          hidden: true,
          tag: 'sort_tiebreak',
        },
        { id: 'h3', call: "longest_word('   honey   ')", expect: "'honey'", label: 'one word with extra spaces', hidden: true },
        { id: 'h4', call: "longest_word('a')", expect: "'a'", label: 'a single letter', hidden: true },
      ],
      concepts: ['split', 'accumulator', 'len', 'tie-break'],
      detects: ['accumulator_init', 'sort_tiebreak'],
      expectedSec: 210,
      hints: [
        'Keep the best word found so far in a variable, and replace it only when a word beats it. What should that variable hold before any word has been seen?',
        "Plan: start `best` at the empty string, before the loop; loop over `sentence.split()`; compare the length of the current word with the length of `best`; replace `best` when the word is longer; return `best` after the loop.",
        'The comparison decides the tie rule. `>` keeps the word that was found first; `>=` lets a later word of the same length take over.',
      ],
      solution: {
        code: "def longest_word(sentence):\n    best = ''\n    for word in sentence.split():\n        if len(word) > len(best):\n            best = word\n    return best\n",
        explanation:
          "`best = ''` sits before the loop, so it is created once. The empty string has length 0, which every real word beats, and it is also the right answer when the sentence has no words at all.\n\n`sentence.split()` breaks the sign on any run of spaces and never produces an empty word, so extra spaces are handled for free.\n\n`if len(word) > len(best):` compares lengths, not the words themselves. With `>`, a word only wins if it is strictly longer, so the first of three 6-letter words stays. `>=` would keep replacing the leader and return the last one.\n\n`return best` is outside the loop, at the same level as `for`, so every word is checked before the answer goes back.\n\nStarting with `best = 0` looks tempting if you are thinking of a maximum, but `len(0)` raises a TypeError, and an empty sign would return the number 0 instead of a string.",
      },
      selfExplain: "Why does the empty-sign test pass without any extra if statement?",
    },
    {
      id: 't05-s5-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Put a sign into title case',
      prompt:
        "Signs are printed in title case. Write `stall_sign(text)` that returns the sign as a **string**.\n\n1. Split `text` into words on spaces. Runs of spaces and spaces at the ends disappear, and the words in the answer are separated by exactly one space.\n2. Each word is lower case except for its first letter, which is a capital: `'HONEY'` becomes `'Honey'`.\n3. The small words `a`, `and`, `of`, `the` and `in` stay completely lower case, unless the word is the first word of the sign.\n4. Return `''` when there are no words.\n\nFor example, `stall_sign('jam AND honey of the hills')` returns `'Jam and Honey of the Hills'`.",
      concepts: ['split', 'string-building', 'case', 'methods'],
      detects: ['case_sensitive_compare', 'accumulator_init', 'string_immutability', 'index_out_of_range'],
      expectedSec: 540,
      fnName: 'stall_sign',
      starter:
        'def stall_sign(text):\n    """Return text as a title-case sign, e.g. \'jam and honey\' -> \'Jam and Honey\'."""\n    pass\n',
      tests: [
        {
          id: 'v1',
          call: "stall_sign('jam AND honey of the hills')",
          expect: "'Jam and Honey of the Hills'",
          label: 'example from the question',
          hidden: false,
        },
        { id: 'v2', call: "stall_sign('THE OLD BAKERY')", expect: "'The Old Bakery'", label: 'sign typed in capitals', hidden: false },
        { id: 'v3', call: "stall_sign('olives')", expect: "'Olives'", label: 'one word', hidden: false },
        {
          id: 'h1',
          call: "stall_sign('of')",
          expect: "'Of'",
          label: 'a small word on its own',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          call: "stall_sign('  fresh   fish  ')",
          expect: "'Fresh Fish'",
          label: 'extra spaces around and between words',
          hidden: true,
        },
        { id: 'h3', call: "stall_sign('')", expect: "''", label: 'empty sign', hidden: true, tag: 'index_out_of_range' },
        { id: 'h4', call: "stall_sign('a')", expect: "'A'", label: 'a single letter', hidden: true },
        {
          id: 'h5',
          call: "stall_sign('coffee and doughnuts in the park')",
          expect: "'Coffee and Doughnuts in the Park'",
          label: 'three small words in the middle',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
      ],
      hints: [
        'Build the answer one word at a time in a new string. For each word you have to decide two things: does it get a capital, and does it need a space in front of it?',
        "Plan: start `result = ''` before the loop and loop over `text.split()`. Lower-case the word first, so that `'AND'` and `'and'` are treated the same. The word is the first word exactly when `result` is still empty. Capitalise it unless it is a small word that is not first, then add a space before it unless it is the first word, and add the word to `result`.",
        "A word is capitalised by rebuilding it: `word = word[0].upper() + word[1:]`. A helper such as `def is_small(word): return word == 'a' or word == 'and' or ...` keeps the condition readable.",
      ],
      solution: {
        code: "def is_small(word):\n    \"\"\"Return True for the words that stay lower case inside a sign.\"\"\"\n    return word == 'a' or word == 'and' or word == 'of' or word == 'the' or word == 'in'\n\n\ndef stall_sign(text):\n    \"\"\"Return text as a title-case sign, e.g. 'jam and honey' -> 'Jam and Honey'.\"\"\"\n    result = ''\n    for word in text.split():\n        word = word.lower()\n        first = (result == '')\n        if first or not is_small(word):\n            word = word[0].upper() + word[1:]\n        if not first:\n            result += ' '\n        result += word\n    return result\n",
        explanation:
          "`result = ''` is created once, before the loop, and every word is added to it. Strings cannot be edited in place, so `result += word` builds a new string each time.\n\n`text.split()` drops the spaces at the ends and collapses runs of spaces, so `'  fresh   fish  '` gives two words. If there are no words the loop never runs and the empty `result` is returned.\n\n`word = word.lower()` normalises the case once. Without it, `'AND'` would not match `'and'` and would be left shouting.\n\n`first = (result == '')` is True only while nothing has been added yet, which is exactly the first word. This is why `stall_sign('of')` returns `'Of'`.\n\nThe word is capitalised when it is first or when it is not a small word. `word[0].upper() + word[1:]` builds a new string from the capital and the rest; `word[0] = ...` would raise a TypeError. `word[1:]` is safe for a one-letter word: it is the empty string.\n\nThe space goes in *before* every word except the first, so the sign never ends with a stray space. Adding `' '` after each word and calling `strip()` at the end works just as well.",
      },
      selfExplain: "Why is the lower-case step done before the small-word check rather than after it?",
    },
  ],
};

export default scenario;
