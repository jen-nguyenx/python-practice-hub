// Scenario 2: SmartRider card numbers and PINs (Transperth).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s2',
  title: 'SmartRider card numbers',
  story:
    'A practice version of the Transperth SmartRider top-up page stores card numbers and PINs as strings, not ints, so that leading zeros survive. Your job is to check PINs, hide card numbers on receipts and tidy up what customers type.',
  questions: [
    {
      id: 't05-s2-q1',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'Checking a PIN for repeated digits',
      prompt:
        'A PIN is weak if two neighbouring digits are the same. This checker crashed before printing anything. Click the line that raised, pick the exception, then pick the cause and fix.',
      concepts: ['indexing', 'range-len', 'index-error'],
      detects: ['index_out_of_range', 'off_by_one_range', 'string_immutability'],
      expectedSec: 150,
      code: "pin = '7334'\nrepeats = 0\nfor i in range(len(pin)):\n    if pin[i] == pin[i + 1]:\n        repeats += 1\nprint('Repeated pairs:', repeats)",
      exceptionOptions: ['IndexError', 'TypeError', 'ValueError', 'NameError'],
      causes: [
        {
          id: 'a',
          text: 'On the last pass `i` is 3, so `pin[i + 1]` asks for position 4, which does not exist. Loop over `range(len(pin) - 1)` instead.',
          correct: true,
        },
        {
          id: 'b',
          text: '`range(len(pin))` goes up to 4, so `pin[i]` itself is past the end. Use `range(1, len(pin))` instead.',
          mistake: 'off_by_one_range',
        },
        {
          id: 'c',
          text: 'Strings cannot be changed, so the loop is not allowed to read `pin[i + 1]` while it is looping over `pin`. Copy the PIN into a new string first.',
          mistake: 'string_immutability',
        },
      ],
      hints: [
        'The first three passes work. What is different about the last one?',
        '`len(pin)` is 4, so `range(len(pin))` gives 0, 1, 2, 3. Work out the largest index line 4 asks for.',
        "When `i` is 3, line 4 compares `pin[3]` with `pin[4]`. A 4-character string has positions 0 to 3.",
      ],
      solution: {
        explanation:
          "`range(len(pin))` gives `i` = 0, 1, 2, 3. Line 4 reads both `pin[i]` and `pin[i + 1]`.\n\nPasses 0, 1 and 2 compare positions (0, 1), (1, 2) and (2, 3). Pass 1 finds `'3' == '3'`, so `repeats` becomes 1.\n\nOn pass 3, `pin[i + 1]` is `pin[4]`. The string only has positions 0 to 3, so Python raises `IndexError: string index out of range` on line 4, before line 6 prints anything.\n\nWhen a loop body looks one position ahead, the loop has to stop one position early: `for i in range(len(pin) - 1):`. Reading a string is always allowed; immutability only stops you from assigning to `pin[i]`.",
      },
      selfExplain: 'Why does range(1, len(pin)) with pin[i - 1] == pin[i] also work?',
    },
    {
      id: 't05-s2-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Hide the card number on a receipt',
      prompt:
        "Receipts show only the last 4 characters of a card number. Fill in the blanks so `mask_card(number)` returns a **string** where every character except the last 4 is replaced by `'*'`. For example `mask_card('98765432')` returns `'****5432'`.",
      concepts: ['slicing', 'string-repetition', 'len'],
      detects: ['off_by_one_range'],
      expectedSec: 100,
      template: "def mask_card(number):\n    \"\"\"Return number with all but the last 4 characters replaced by '*'.\"\"\"\n    return '*' * (len(number) ⟦1⟧) + number⟦2⟧\n",
      blanks: [
        { id: '1', accept: ['- 4', '-4'] },
        { id: '2', accept: ['[-4:]', '[len(number) - 4:]', '[len(number)-4:]'] },
      ],
      fnName: 'mask_card',
      tests: [
        { id: 'v1', call: "mask_card('98765432')", expect: "'****5432'", label: '8 digits', hidden: false },
        {
          id: 'v2',
          call: "mask_card('0123456789012345')",
          expect: "'************2345'",
          label: '16 digits',
          hidden: false,
        },
        { id: 'h1', call: "mask_card('1234')", expect: "'1234'", label: 'exactly 4 digits', hidden: true },
        {
          id: 'h2',
          call: "mask_card('12345')",
          expect: "'*2345'",
          label: '5 digits',
          hidden: true,
          tag: 'off_by_one_range',
        },
      ],
      hints: [
        'Two pieces are joined: a run of stars, then the end of the number.',
        "`'*' * 3` is `'***'`. How many stars are needed if 4 characters stay visible? Then take a slice that keeps the last 4 characters.",
        'Blank 2 is a slice that starts four from the end and has nothing after the colon.',
      ],
      solution: {
        code: "def mask_card(number):\n    \"\"\"Return number with all but the last 4 characters replaced by '*'.\"\"\"\n    return '*' * (len(number) - 4) + number[-4:]\n",
        explanation:
          "`len(number) - 4` is how many characters get hidden, and `'*' * n` repeats the star that many times.\n\n`number[-4:]` starts at the fourth character from the end and runs to the end. `number[len(number) - 4:]` is the same slice written with a positive start.\n\n`number[-4]` (no colon) would be one character, not four. When the number is exactly 4 characters, `'*' * 0` is `''`, so the whole number is shown.",
      },
      selfExplain: "What does '*' * -2 give, and what would mask_card('12') return?",
    },
    {
      id: 't05-s2-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Format a typed card number',
      prompt:
        "Customers type 16-digit card numbers in many ways: `'0123456789012345'`, `'0123-4567-8901-2345'` or `' 0123 4567 8901 2345 '`.\n\nWrite `format_card(raw)` that returns a **string**:\n\n1. Ignore every space and hyphen, wherever it appears.\n2. If what is left is exactly 16 digits, return it as four groups of 4 digits separated by single spaces, for example `'0123 4567 8901 2345'`, with no space at the start or end.\n3. Otherwise return `'INVALID'`.",
      concepts: ['methods', 'slicing', 'string-building', 'validation'],
      detects: ['string_immutability', 'off_by_one_range', 'forgot_to_call'],
      expectedSec: 480,
      fnName: 'format_card',
      starter:
        'def format_card(raw):\n    """Return raw as \'dddd dddd dddd dddd\', or \'INVALID\' if it is not 16 digits."""\n    pass\n',
      tests: [
        {
          id: 'v1',
          call: "format_card('0123456789012345')",
          expect: "'0123 4567 8901 2345'",
          label: 'digits only',
          hidden: false,
          tag: 'off_by_one_range',
        },
        {
          id: 'v2',
          call: "format_card('0123-4567-8901-2345')",
          expect: "'0123 4567 8901 2345'",
          label: 'hyphens between groups',
          hidden: false,
        },
        {
          id: 'v3',
          call: "format_card('0123 4567 8901 234')",
          expect: "'INVALID'",
          label: 'only 15 digits',
          hidden: false,
        },
        {
          id: 'h1',
          call: "format_card(' 9999 0000 1111 2222 ')",
          expect: "'9999 0000 1111 2222'",
          label: 'spaces at both ends',
          hidden: true,
        },
        {
          id: 'h2',
          call: "format_card('0123 4567 89O1 2345')",
          expect: "'INVALID'",
          label: 'letter O among the digits',
          hidden: true,
          tag: 'forgot_to_call',
        },
        { id: 'h3', call: "format_card('')", expect: "'INVALID'", label: 'empty string', hidden: true },
        {
          id: 'h4',
          call: "format_card('0123--4567  8901-2345')",
          expect: "'0123 4567 8901 2345'",
          label: 'doubled and mixed separators',
          hidden: true,
        },
        {
          id: 'h5',
          call: "format_card('01234567890123456')",
          expect: "'INVALID'",
          label: '17 digits',
          hidden: true,
        },
      ],
      hints: [
        'Split the job in two: first make a clean string of digits, then decide what to return.',
        'Plan: remove spaces and hyphens with `replace` (and save the result) → if the length is not 16 or it is not all digits, return `\'INVALID\'` → build the answer from four slices of 4 → make sure there is no trailing space.',
        "```python\ndigits = raw.replace(' ', '').replace('-', '')\nif len(digits) != 16 or not digits.isdigit():\n    return 'INVALID'\nresult = ''\nfor i in range(0, 16, 4):\n    ...\n```",
      ],
      solution: {
        code: "def format_card(raw):\n    \"\"\"Return raw as 'dddd dddd dddd dddd', or 'INVALID' if it is not 16 digits.\"\"\"\n    digits = raw.replace(' ', '').replace('-', '')\n    if len(digits) != 16 or not digits.isdigit():\n        return 'INVALID'\n    result = ''\n    for i in range(0, 16, 4):\n        result += digits[i:i + 4] + ' '\n    return result.strip()\n",
        explanation:
          "`raw.replace(' ', '')` returns a new string with every space removed, and the second `replace` removes hyphens. The result is saved in `digits`; calling `replace` without saving would change nothing.\n\nThe guard returns `'INVALID'` unless there are exactly 16 characters and `isdigit()` is True for all of them. The brackets after `isdigit` matter: without them the method object is always truthy.\n\n`range(0, 16, 4)` gives 0, 4, 8, 12, so `digits[i:i + 4]` takes each group of four. Each group is added with a space after it.\n\nThat leaves one extra space at the end (the fencepost problem: 4 groups need only 3 gaps), so `result.strip()` removes it. Writing `digits[:4] + ' ' + digits[4:8] + ' ' + digits[8:12] + ' ' + digits[12:]` is also a correct answer.",
      },
      selfExplain: 'Why is the card number stored as a string and not an int?',
    },
  ],
};

export default scenario;
