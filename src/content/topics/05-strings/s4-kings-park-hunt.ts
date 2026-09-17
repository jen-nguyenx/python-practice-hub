// Scenario 4: Kings Park treasure hunt word puzzles (exam-style string processing).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s4',
  title: 'Kings Park treasure hunt',
  story:
    'A student club is running a treasure hunt through Kings Park. The clues are word puzzles: palindromes, messages with shifted letters, and an anagram lock on the final box. String puzzles like these are typical of the early 5 to 10 mark questions in CITS1401 final exams.',
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
      marks: 10,
      diff: 'hard',
      core: true,
      title: 'Anagram lock (exam style)',
      prompt:
        "Exam-style question, 10 marks. No imports.\n\nThe box at the end of the hunt opens only if you type an anagram of the clue: the same letters in a different order. Write `is_anagram(clue, answer)` that returns `True` if `answer` is an anagram of `clue`, and `False` otherwise.\n\n- Only letters count. Ignore spaces, punctuation and digits, and ignore case.\n- Every letter must appear the same number of times in both.\n- If `clue` contains no letters at all, return `False`.\n- Use loops and string methods only: no lists and no `sorted`.\n\nFor example, `is_anagram('Dormitory', 'dirty room')` returns `True` and `is_anagram('Kings Park', 'Parking')` returns `False`.",
      concepts: ['string-building', 'loop-over-string', 'methods', 'case', 'return-in-loop'],
      detects: ['case_sensitive_compare', 'early_return_in_loop', 'string_immutability', 'accumulator_init'],
      expectedSec: 660,
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
          "`letters_only` builds a new string. It starts with `''` before the loop, walks through a lower-case copy of the text, and adds a character only when `isalpha()` is True. Strings cannot be changed, so removing characters always means building a new string. As a helper, the cleaning is written once and used for both phrases.\n\n`a == ''` handles a clue with no letters, such as `''` or `'1234'`. `len(a) != len(b)` catches an answer with extra letters: every letter of `'swan'` appears once in `'swanriver'`, so the count loop on its own would wrongly say True for `'Swan'` and `'Swan River'`.\n\nThe loop takes each letter of `a` and compares how many times it appears in `a` and in `b`. One difference is enough to know the answer, so the function returns `False` straight away. Checking only `ch in b` is not enough: `'boab tree'` and `'bare boat'` use the same six letters but not the same number of each.\n\n`return True` sits after the loop, so it runs only when every letter has passed. An `else: return True` inside the loop would decide after the first letter.\n\nMarking guide (10): lower-case, letters-only copies of both phrases (3), no-letters case (1), length check (1), loop over the letters (1), counts compared between the two phrases (2), `False` returned as soon as a count differs (1), `True` returned only after the loop (1).",
      },
      selfExplain: 'The loop already compares the count of every letter. Why is the length check still needed?',
    },
  ],
};

export default scenario;
