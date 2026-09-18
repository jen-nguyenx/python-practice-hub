// Scenario 4: Kings Park treasure hunt word puzzles (exam-style string processing).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s4',
  title: 'Kings Park treasure hunt',
  story:
    'A student club is running a treasure hunt through Kings Park. The clues are word puzzles: palindromes, messages with shifted letters, checkpoint names printed with the spaces taken out, and an anagram lock on the final box. String puzzles like these are typical of the early 5 to 10 mark questions in CITS1401 final exams.',
  questions: [
    {
      id: 't05-s4-q1',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Is the clue a palindrome?',
      prompt: 'The first clue checks whether a phrase reads the same backwards. Type exactly what this program prints.',
      concepts: ['palindrome', 'slicing', 'methods'],
      detects: ['case_sensitive_compare', 'string_immutability', 'off_by_one_range'],
      expectedSec: 200,
      code: "clue = 'Never odd or even'\ncleaned = clue.replace(' ', '').lower()\nprint(cleaned)\nprint(cleaned == cleaned[::-1])\nprint(clue == clue[::-1])\nprint(clue[-4:-1], clue[:5][::-1])",
      mutants: [
        {
          code: "clue = 'Never odd or even'\ncleaned = clue.replace(' ', '').lower()\nprint(cleaned)\nprint(cleaned == cleaned[::-1])\nprint(cleaned == cleaned[::-1])\nprint(clue[-4:-1], clue[:5][::-1])",
          mistake: 'case_sensitive_compare',
        },
        {
          code: "clue = 'Never odd or even'\nclue = clue.replace(' ', '').lower()\ncleaned = clue\nprint(cleaned)\nprint(cleaned == cleaned[::-1])\nprint(clue == clue[::-1])\nprint(clue[-4:-1], clue[:5][::-1])",
          mistake: 'string_immutability',
        },
        {
          code: "clue = 'Never odd or even'\ncleaned = clue.replace(' ', '').lower()\nprint(cleaned)\nprint(cleaned == cleaned[::-1])\nprint(clue == clue[::-1])\nprint(clue[-4:], clue[:5][::-1])",
          mistake: 'off_by_one_range',
        },
      ],
      hints: [
        'Line 2 makes a new string. Does it change `clue`?',
        "Compare character by character. `'N'` and `'n'` are different characters, and so are a space and a letter. For the last line, work out `clue[-4:-1]` and `clue[:5]` first, then reverse the second one.",
        "`clue[:5]` is `'Never'`. The last four characters of `clue` are `'even'`, and `[-4:-1]` stops before the final one.",
      ],
      solution: {
        explanation:
          "Line 2 builds a new string with the spaces removed and in lower case, and stores it in `cleaned`. `clue` itself is unchanged.\n\nLine 3 prints `neveroddoreven`.\n\nLine 4: reversing `cleaned` gives the same letters in the same order, so it prints `True`.\n\nLine 5: `clue[::-1]` is `'neve ro ddo reveN'`. It starts with a lower-case `n` while `clue` starts with `N`, and the spaces are in different places, so it prints `False`. This is why you clean the text before checking a palindrome.\n\nLine 6: `clue[-4:-1]` starts four from the end and stops before the last character: `'eve'`. `clue[:5]` is `'Never'`, and `[::-1]` reverses it to `'reveN'`. Output: `eve reveN`.",
      },
      selfExplain: 'Line 4 and line 5 both compare a phrase with its reverse. Why does only line 4 print True?',
    },
    {
      id: 't05-s4-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Count a pattern in a plaque',
      prompt:
        "The second clue points at a plaque and asks how many times a short pattern appears in its text.\n\nWrite `count_pattern(text, pattern)` that returns an **int**: the number of places in `text` where `pattern` appears.\n\n- Upper and lower case do not matter: `'Swan'` and `'swan'` are the same pattern.\n- Copies may overlap. `count_pattern('banana', 'ana')` is 2, because `'ana'` starts at position 1 and again at position 3.\n- Return 0 if `pattern` is empty, or if it is longer than `text`.\n\nDo not use `count()`: it skips overlapping copies.",
      concepts: ['slicing', 'loop-over-string', 'case', 'search'],
      detects: ['off_by_one_range', 'case_sensitive_compare', 'index_out_of_range'],
      expectedSec: 540,
      fnName: 'count_pattern',
      starter:
        'def count_pattern(text, pattern):\n    """Return how many times pattern appears in text, ignoring case and counting overlaps."""\n    pass\n',
      tests: [
        { id: 'v1', call: "count_pattern('banana', 'ana')", expect: '2', label: 'overlapping copies', hidden: false, tag: 'off_by_one_range' },
        { id: 'v2', call: "count_pattern('Kings Park, Perth', 'r')", expect: '2', label: 'a single letter', hidden: false },
        { id: 'v3', call: "count_pattern('Quokka', 'QU')", expect: '1', label: 'pattern typed in capitals', hidden: false },
        {
          id: 'h1',
          call: "count_pattern('aaaa', 'aa')",
          expect: '3',
          label: 'every position overlaps',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h2',
          call: "count_pattern('Swan River', 'swan')",
          expect: '1',
          label: 'pattern in the other case',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        { id: 'h3', call: "count_pattern('', 'a')", expect: '0', label: 'empty plaque', hidden: true, tag: 'index_out_of_range' },
        { id: 'h4', call: "count_pattern('abc', 'abcd')", expect: '0', label: 'pattern longer than the text', hidden: true, tag: 'index_out_of_range' },
        { id: 'h5', call: "count_pattern('Boab', '')", expect: '0', label: 'empty pattern', hidden: true },
        { id: 'h6', call: "count_pattern('Boab tree', 'z')", expect: '0', label: 'pattern is not there', hidden: true },
      ],
      hints: [
        'Check every starting position in turn. At each position, take a slice as long as the pattern and compare it with the pattern.',
        "Plan: return 0 straight away for an empty pattern; make lower-case copies of both strings and save them; count from 0; loop over the starting positions with `range`, comparing `text[i:i + len(pattern)]` with the pattern; return the count.",
        "The last starting position is `len(text) - len(pattern)`, so the loop header is `for i in range(len(text) - len(pattern) + 1):`. When the pattern is longer than the text, that range is empty and the count stays 0.",
      ],
      solution: {
        code: "def count_pattern(text, pattern):\n    \"\"\"Return how many times pattern appears in text, ignoring case and counting overlaps.\"\"\"\n    if pattern == '':\n        return 0\n    haystack = text.lower()\n    needle = pattern.lower()\n    count = 0\n    for i in range(len(haystack) - len(needle) + 1):\n        if haystack[i:i + len(needle)] == needle:\n            count += 1\n    return count\n",
        explanation:
          "The empty pattern is handled first, because an empty slice would match at every position and the answer would be the length of the text plus one.\n\n`text.lower()` and `pattern.lower()` are saved into new names. Lower-casing once, before the loop, is what makes `'Swan'` match `'swan'`; comparing the originals would miss it.\n\n`range(len(haystack) - len(needle) + 1)` lists every position where the pattern still fits. For `'banana'` and `'ana'` that is 0, 1, 2, 3. The `+ 1` matters: without it the last position is never tried, and `count_pattern('aaaa', 'aa')` would give 2 instead of 3. If the pattern is longer than the text, the range is empty, so the loop never runs and 0 comes back.\n\n`haystack[i:i + len(needle)]` takes exactly as many characters as the pattern, starting at `i`. Comparing whole slices, rather than one character at a time, keeps the loop simple.\n\nBecause `i` moves one position at a time, overlapping copies are all counted. `haystack.count(needle)` would jump past each match and return 1 for `'banana'` and `'ana'`.",
      },
      selfExplain: "Why does the loop stop at len(text) - len(pattern) rather than at len(text)?",
    },
    {
      id: 't05-s4-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Shift the letters of a clue',
      prompt:
        "The final clue is written in a shift code. Write `shift_clue(message, shift)` that returns a new **string** in which every letter is moved `shift` places along the alphabet.\n\n- Letters wrap around: with a shift of 3, `'x'` becomes `'a'`.\n- Upper-case letters stay upper case and lower-case letters stay lower case.\n- Every other character (spaces, digits, punctuation) is copied unchanged.\n- `shift` can be any int, including negative numbers and numbers bigger than 26.\n\nFor example `shift_clue('Kings Park', 2)` returns `'Mkpiu Rctm'`. Use `ord` and `chr`; do not type out the alphabet.",
      concepts: ['ord-chr', 'loop-over-string', 'string-building', 'modulo'],
      detects: ['case_sensitive_compare', 'str_int_concat', 'accumulator_init'],
      expectedSec: 600,
      fnName: 'shift_clue',
      starter:
        'def shift_clue(message, shift):\n    """Return message with every letter shifted along the alphabet by shift places."""\n    pass\n',
      tests: [
        { id: 'v1', call: "shift_clue('abc', 1)", expect: "'bcd'", label: 'shift by 1', hidden: false },
        { id: 'v2', call: "shift_clue('Kings Park', 2)", expect: "'Mkpiu Rctm'", label: 'two words with capitals', hidden: false },
        { id: 'v3', call: "shift_clue('xyz', 3)", expect: "'abc'", label: 'wraps past z', hidden: false },
        {
          id: 'h1',
          call: "shift_clue('QUOKKA', 1)",
          expect: "'RVPLLB'",
          label: 'all upper case',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        {
          id: 'h2',
          call: "shift_clue('Meet at 10:30, Kings Park!', 5)",
          expect: "'Rjjy fy 10:30, Pnslx Ufwp!'",
          label: 'digits and punctuation unchanged',
          hidden: true,
        },
        { id: 'h3', call: "shift_clue('Bcd', -1)", expect: "'Abc'", label: 'negative shift', hidden: true },
        { id: 'h4', call: "shift_clue('Zoo', 27)", expect: "'App'", label: 'shift bigger than 26', hidden: true },
        { id: 'h5', call: "shift_clue('', 4)", expect: "''", label: 'empty message', hidden: true, tag: 'accumulator_init' },
      ],
      hints: [
        'Handle one character at a time, and build the answer in a new string. Lower-case letters, upper-case letters and everything else each need their own branch.',
        "Plan for a lower-case letter: turn it into its position 0-25 with `ord(ch) - ord('a')` → add `shift` → wrap with `% 26` → turn it back into a letter with `chr(... + ord('a'))`. Do the same with `'A'` for capitals.",
        "```python\nresult = ''\nfor ch in message:\n    if 'a' <= ch <= 'z':\n        result += chr((ord(ch) - ord('a') + shift) % 26 + ord('a'))\n    elif ...\n```",
      ],
      solution: {
        code: "def shift_clue(message, shift):\n    \"\"\"Return message with every letter shifted along the alphabet by shift places.\"\"\"\n    result = ''\n    for ch in message:\n        if 'a' <= ch <= 'z':\n            result += chr((ord(ch) - ord('a') + shift) % 26 + ord('a'))\n        elif 'A' <= ch <= 'Z':\n            result += chr((ord(ch) - ord('A') + shift) % 26 + ord('A'))\n        else:\n            result += ch\n    return result\n",
        explanation:
          "`result = ''` is created once, before the loop, and each character is added to it. Strings cannot be changed, so building a new one is the only option.\n\n`'a' <= ch <= 'z'` is True only for lower-case letters, because letters are stored in alphabetical order. The second branch does the same for capitals, so case is kept.\n\n`ord(ch) - ord('a')` turns `'a'`..`'z'` into 0..25. Adding `shift` and taking `% 26` keeps the result in 0..25 even for big or negative shifts: `(0 - 1) % 26` is 25, which is `'z'`.\n\n`chr(position + ord('a'))` turns the number back into a letter. `chr` is needed because `+=` on a string only accepts another string, never an int.\n\nAnything else, such as a space, digit or `'!'`, goes to the `else` branch and is copied unchanged.",
      },
      selfExplain: 'What would shift_clue(shift_clue(text, 5), -5) return, and why?',
    },
    {
      id: 't05-s4-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-string',
      diff: 'hard',
      core: true,
      title: 'Anagram lock (exam style)',
      prompt:
        "Exam-style question, 5 marks. No imports.\n\nThe box at the end of the hunt opens only if you type an anagram of the clue: the same letters in a different order. Write `is_anagram(clue, answer)` that returns `True` if `answer` is an anagram of `clue`, and `False` otherwise.\n\n- Only letters count. Ignore spaces, punctuation and digits, and ignore case.\n- Every letter must appear the same number of times in both.\n- If `clue` contains no letters at all, return `False`.\n- Use loops and string methods only: no lists and no `sorted`.\n\nFor example, `is_anagram('Dormitory', 'dirty room')` returns `True` and `is_anagram('Kings Park', 'Parking')` returns `False`.",
      concepts: ['string-building', 'loop-over-string', 'methods', 'case', 'return-in-loop'],
      detects: ['case_sensitive_compare', 'early_return_in_loop', 'string_immutability', 'accumulator_init'],
      expectedSec: 420,
      fnName: 'is_anagram',
      rules: ['noImport'],
      starter:
        'def is_anagram(clue, answer):\n    """Return True if answer uses exactly the letters of clue, ignoring case and non-letters."""\n    pass\n',
      tests: [
        {
          id: 'v1',
          call: "is_anagram('Dormitory', 'dirty room')",
          expect: 'True',
          label: 'capital letter and a space',
          hidden: false,
          tag: 'case_sensitive_compare',
        },
        { id: 'v2', call: "is_anagram('Kings Park', 'Parking')", expect: 'False', label: 'answer is missing letters', hidden: false },
        { id: 'h1', call: "is_anagram('Rottnest!', 'Tent, sort.')", expect: 'True', label: 'punctuation is ignored', hidden: true },
        {
          id: 'h2',
          call: "is_anagram('boab tree', 'bare boat')",
          expect: 'False',
          label: 'same letters and length, different counts',
          hidden: true,
          tag: 'early_return_in_loop',
        },
        {
          id: 'h3',
          call: "is_anagram('Quokka', 'KAQUOK')",
          expect: 'True',
          label: 'answer typed in capitals',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        { id: 'h4', call: "is_anagram('Swan', 'Swan River')", expect: 'False', label: 'answer has extra letters', hidden: true },
        { id: 'h5', call: "is_anagram('', '')", expect: 'False', label: 'both empty', hidden: true },
        { id: 'h6', call: "is_anagram('1234', '4321')", expect: 'False', label: 'digits but no letters', hidden: true },
      ],
      hints: [
        'Two phrases are anagrams when every letter appears the same number of times in both. Before comparing anything, turn each phrase into a string that holds only its letters, all in the same case.',
        "Plan: build a lower-case, letters-only copy of `clue` with a loop that keeps a character only when `isalpha()` is True, and do the same for `answer`. If the first copy is empty or the lengths differ, return `False`. Then, for each letter of the first copy, use `count` to compare how often it appears in each copy. Return `False` as soon as two counts differ, and `True` only after the loop.",
        "```python\na = ''\nfor ch in clue.lower():\n    if ch.isalpha():\n        a += ch\n...\nfor ch in a:\n    if a.count(ch) != ...\n```",
      ],
      solution: {
        code: "def letters_only(text):\n    \"\"\"Return the letters of text in lower case, with everything else removed.\"\"\"\n    result = ''\n    for ch in text.lower():\n        if ch.isalpha():\n            result += ch\n    return result\n\n\ndef is_anagram(clue, answer):\n    \"\"\"Return True if answer uses exactly the letters of clue, ignoring case and non-letters.\"\"\"\n    a = letters_only(clue)\n    b = letters_only(answer)\n    if a == '' or len(a) != len(b):\n        return False\n    for ch in a:\n        if a.count(ch) != b.count(ch):\n            return False\n    return True\n",
        explanation:
          "`letters_only` builds a new string. It starts with `''` before the loop, walks through a lower-case copy of the text, and adds a character only when `isalpha()` is True. Strings cannot be changed, so removing characters always means building a new string. As a helper, the cleaning is written once and used for both phrases.\n\n`a == ''` handles a clue with no letters, such as `''` or `'1234'`. `len(a) != len(b)` catches an answer with extra letters: every letter of `'swan'` appears once in `'swanriver'`, so the count loop on its own would wrongly say True for `'Swan'` and `'Swan River'`.\n\nThe loop takes each letter of `a` and compares how many times it appears in `a` and in `b`. One difference is enough to know the answer, so the function returns `False` straight away. Checking only `ch in b` is not enough: `'boab tree'` and `'bare boat'` use the same six letters but not the same number of each.\n\n`return True` sits after the loop, so it runs only when every letter has passed. An `else: return True` inside the loop would decide after the first letter.\n\nMarking guide (5): lower-case, letters-only copies of both phrases (2), no-letters case and length check (1), loop comparing the count of every letter in both copies (1), `False` returned as soon as a count differs and `True` only after the loop (1).",
      },
      selfExplain: 'The loop already compares the count of every letter. Why is the length check still needed?',
    },
    {
      id: 't05-s4-q5',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-string',
      diff: 'hard',
      core: false,
      title: 'Space out a checkpoint name (exam style)',
      prompt:
        "Exam-style question, 5 marks. No imports, and there is no Run button: write your answer as you would on paper, then submit it once.\n\n" +
        "The clue cards print each checkpoint as one run-together word, with a capital at the start of every part: `'BotanicGarden'`, `'StateWarMemorial'`. Write `space_capitals(name)` that returns a **new string** in which a single space is put in front of every upper-case letter, except an upper-case letter that is the first character of `name`.\n\n" +
        "- Every character of `name` is kept, in order. Nothing else is added or removed.\n" +
        "- Capitals next to each other each get their own space: `space_capitals('DNATower')` returns `'D N A Tower'`.\n" +
        "- `name` never contains a space, and may hold digits and lower-case letters, which are copied unchanged.\n" +
        "- Return `''` when `name` is empty.\n\n" +
        "For example, `space_capitals('BotanicGarden')` returns `'Botanic Garden'`. Use a loop and string methods only: no lists and no `split`.",
      concepts: ['string-building', 'loop-over-string', 'case', 'methods'],
      detects: ['off_by_one_range', 'case_sensitive_compare', 'accumulator_init', 'string_immutability', 'print_vs_return'],
      expectedSec: 360,
      fnName: 'space_capitals',
      rules: ['noImport'],
      starter:
        'def space_capitals(name):\n    """Return name with a space in front of every capital except the first character."""\n    pass\n',
      tests: [
        { id: 'v1', call: "space_capitals('BotanicGarden')", expect: "'Botanic Garden'", label: 'two parts', hidden: false },
        { id: 'v2', call: "space_capitals('StateWarMemorial')", expect: "'State War Memorial'", label: 'three parts', hidden: false },
        {
          id: 'v3',
          call: "space_capitals('DNATower')",
          expect: "'D N A Tower'",
          label: 'capitals next to each other',
          hidden: false,
        },
        { id: 'h1', call: "space_capitals('')", expect: "''", label: 'empty name', hidden: true, tag: 'accumulator_init' },
        {
          id: 'h2',
          call: "space_capitals('W')",
          expect: "'W'",
          label: 'one capital letter and nothing else',
          hidden: true,
          tag: 'off_by_one_range',
        },
        { id: 'h3', call: "space_capitals('Boab')", expect: "'Boab'", label: 'a single part', hidden: true },
        {
          id: 'h4',
          call: "space_capitals('lotterywestWalkway')",
          expect: "'lotterywest Walkway'",
          label: 'starts in lower case',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h5',
          call: "space_capitals('Level2Lookout')",
          expect: "'Level2 Lookout'",
          label: 'a digit in the middle',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
      ],
      hints: [
        'Build a new string one character at a time. Before you copy a character across, ask whether it needs a space in front of it.',
        "Plan: start `result` at `''`. Loop over the characters of `name`. If the character is upper case, and something has already been written into `result`, add a space to `result` first. Either way, add the character itself. Return `result` after the loop.",
        "You do not need a counter: the answer so far tells you whether you are at the start.\n\n```python\nif ch.isupper() and result != '':\n    result = result + ' '\n```\n\nUse `ch.isupper()`, which is True only for A-Z. `ch == ch.upper()` is also True for digits, so it would break `'Level2Lookout'`.",
      ],
      solution: {
        code:
          'def space_capitals(name):\n' +
          '    """Return name with a space in front of every capital except the first character."""\n' +
          "    result = ''\n" +
          '    for ch in name:\n' +
          "        if ch.isupper() and result != '':\n" +
          "            result = result + ' '\n" +
          '        result = result + ch\n' +
          '    return result\n',
        explanation:
          "`result = ''` is created once, before the loop. Strings cannot be changed in place, so the answer has to be built up as a new string, and starting it at `''` is what makes an empty `name` return `''` instead of crashing.\n\n" +
          "`for ch in name:` hands over one character per pass. The position is never needed, so there is no `range(len(name))` and no chance of an off-by-one.\n\n" +
          "`ch.isupper()` is True only for A-Z, which is why `'2'` in `'Level2Lookout'` is copied without a space. The common wrong test is `ch == ch.upper()`, which is True for digits and punctuation as well.\n\n" +
          "`result != ''` is the \"not at the start\" test. Nothing has been written yet only while the first character is being handled, so `'BotanicGarden'` does not come back as `' Botanic Garden'`, and `space_capitals('W')` returns `'W'`. Writing `for i in range(len(name))` and testing `i > 0` does the same job with more moving parts.\n\n" +
          "The space is added **before** the character, and `result = result + ch` then runs on every pass, inside and outside the `if`. That is what gives each of the three capitals in `'DNATower'` its own space.\n\n" +
          "Marking guide (5): a new string started before the loop (1), a loop over the characters of `name` (1), upper-case letters detected with `isupper` (1), no space in front of the first character (1), the result returned rather than printed (1).",
      },
      selfExplain: "What would space_capitals('BotanicGarden') return if the space were added after the capital instead of before it?",
    },
  ],
};

export default scenario;
