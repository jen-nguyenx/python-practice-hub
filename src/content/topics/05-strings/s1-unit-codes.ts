// Scenario 1: UWA unit codes in a student timetable planner.
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s1',
  title: 'Unit codes in your timetable',
  story:
    'You are building a small timetable planner for UWA students. Every unit has a code such as `CITS1401`: four letters for the discipline and four digits, where the first digit is the level. Students type codes in all sorts of ways, so the planner has to slice and clean them.',
  questions: [
    {
      id: 't05-s1-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Slicing a unit code',
      prompt: 'The planner splits a unit code into parts. Pick the exact output of this program.',
      concepts: ['indexing', 'slicing', 'methods'],
      detects: ['off_by_one_range', 'str_int_concat'],
      expectedSec: 90,
      code: "unit = 'CITS1401'\nprint(unit[:4].lower(), unit[-4:], unit[4] + unit[-1])",
      choice: true,
      mutants: [
        {
          code: "unit = 'CITS1401'\nprint(unit[:4].lower(), unit[-4:], int(unit[4]) + int(unit[-1]))",
          mistake: 'str_int_concat',
        },
        {
          code: "unit = 'CITS1401'\nprint(unit[:5].lower(), unit[-4:], unit[4] + unit[-1])",
          mistake: 'off_by_one_range',
        },
        {
          code: "unit = 'CITS1401'\nprint(unit[:4].lower(), unit[-4:], unit[3] + unit[-1])",
          mistake: 'off_by_one_range',
        },
      ],
      hints: [
        'Positions start at 0, and a slice `[a:b]` stops *before* position b.',
        'Work out the three values one at a time: the first four characters in lower case, the last four characters, then two single characters joined with `+`. `print` puts one space between values.',
        "`unit[4]` is `'1'` and `unit[-1]` is also `'1'`. They are strings, not numbers.",
      ],
      solution: {
        explanation:
          "`unit[:4]` takes positions 0 to 3, which is `'CITS'`, and `.lower()` gives `'cits'`.\n\n`unit[-4:]` starts four from the end and runs to the end: `'1401'`.\n\n`unit[4]` is position 4, the fifth character, `'1'`. `unit[-1]` is the last character, also `'1'`. Both are strings, so `+` joins them into `'11'` instead of adding to 2.\n\n`print` separates the three values with spaces: `cits 1401 11`.",
      },
      selfExplain: 'How would you change the third value so the program prints 2 instead of 11?',
    },
    {
      id: 't05-s1-q2',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Did strip() change the code?',
      prompt:
        'A student pasted their unit code with extra spaces. The brackets in the output show exactly where the string starts and ends. What does this program print?',
      concepts: ['immutability', 'methods'],
      detects: ['string_immutability', 'none_from_inplace'],
      expectedSec: 75,
      code: "code = '  cits1401 '\ncode.strip()\ncode = code.upper()\nprint('[' + code + ']')",
      options: [
        {
          id: 'a',
          text: '[  CITS1401 ]',
          correct: true,
          why: "Line 2 makes a stripped copy but never saves it, so `code` still has its spaces. Line 3 does save the upper-case copy, so the letters change and the spaces stay.",
        },
        {
          id: 'b',
          text: '[CITS1401]',
          mistake: 'string_immutability',
          why: 'This would need `code = code.strip()` on line 2. A string method returns a new string; the original string is never changed.',
        },
        {
          id: 'c',
          text: 'An error, because strip() returns None and upper() cannot be used on None',
          mistake: 'none_from_inplace',
          why: 'String methods always return a new string. It is list methods such as `sort()` and `append()` that change the list and return None.',
        },
        {
          id: 'd',
          text: 'An error, because a string cannot be changed, so code = code.upper() is not allowed',
          mistake: 'string_immutability',
          why: 'Immutable means the string object itself cannot be edited. The name `code` can still be pointed at a brand new string, which is exactly what line 3 does.',
        },
      ],
      hints: [
        'Ask of each line: is the result of the method stored anywhere?',
        'Line 2 calls a method but has no `=`. Line 3 calls a method and assigns the result back to `code`.',
        'After line 3, `code` is the upper-case version of the string that still has its spaces.',
      ],
      solution: {
        explanation:
          "Line 1 stores `'  cits1401 '` (two spaces before, one after).\n\nLine 2 builds `'cits1401'` but nothing keeps it, so it is thrown away. `code` is unchanged.\n\nLine 3 builds `'  CITS1401 '` and stores it in `code`.\n\nLine 4 prints `[  CITS1401 ]`. To remove the spaces too, write `code = code.strip().upper()`.",
      },
      selfExplain: 'Why is it allowed to write code = code.upper() when strings cannot be changed?',
    },
    {
      id: 't05-s1-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Clean a typed unit code',
      prompt:
        "Write `clean_unit_code(raw)` that takes the text a student typed and returns a cleaned unit code **string**.\n\n1. Remove spaces, tabs and newlines from the start and end, and convert to upper case.\n2. If the result is exactly 8 characters, with 4 letters followed by 4 digits, return it, for example `'CITS1401'`.\n3. Otherwise return the string `'INVALID'`.\n\nSpaces in the middle are not removed, so `'CITS 1401'` is invalid.",
      concepts: ['slicing', 'methods', 'validation'],
      detects: ['string_immutability', 'off_by_one_range', 'forgot_to_call'],
      expectedSec: 300,
      fnName: 'clean_unit_code',
      starter:
        'def clean_unit_code(raw):\n    """Return raw as an upper-case unit code like \'CITS1401\', or \'INVALID\'."""\n    pass\n',
      tests: [
        { id: 'v1', call: "clean_unit_code('cits1401')", expect: "'CITS1401'", label: 'lower case', hidden: false },
        {
          id: 'v2',
          call: "clean_unit_code('  Math1011 ')",
          expect: "'MATH1011'",
          label: 'spaces at both ends',
          hidden: false,
        },
        { id: 'v3', call: "clean_unit_code('CITS140')", expect: "'INVALID'", label: 'only 7 characters', hidden: false },
        {
          id: 'h1',
          call: "clean_unit_code('CIT11401')",
          expect: "'INVALID'",
          label: '3 letters then 5 digits',
          hidden: true,
          tag: 'off_by_one_range',
        },
        { id: 'h2', call: "clean_unit_code('CITS 1401')", expect: "'INVALID'", label: 'space in the middle', hidden: true },
        { id: 'h3', call: "clean_unit_code('1401CITS')", expect: "'INVALID'", label: 'digits before letters', hidden: true },
        {
          id: 'h4',
          call: "clean_unit_code('\\tgeog1104\\n')",
          expect: "'GEOG1104'",
          label: 'tab and newline around the code',
          hidden: true,
        },
        {
          id: 'h5',
          call: "clean_unit_code('PHYS10O1')",
          expect: "'INVALID'",
          label: 'letter O instead of zero',
          hidden: true,
          tag: 'forgot_to_call',
        },
      ],
      hints: [
        'Clean the string first and save the cleaned version in a variable. Then check it.',
        'Plan: `code = ...strip... upper...` → check the length is 8 → check the first four characters are letters and the last four are digits → return `code` or `\'INVALID\'`.',
        "```python\ncode = raw.strip().upper()\nif len(code) == 8 and code[:4].isalpha() and ...:\n```",
      ],
      solution: {
        code: "def clean_unit_code(raw):\n    \"\"\"Return raw as an upper-case unit code like 'CITS1401', or 'INVALID'.\"\"\"\n    code = raw.strip().upper()\n    if len(code) == 8 and code[:4].isalpha() and code[4:].isdigit():\n        return code\n    return 'INVALID'\n",
        explanation:
          "`code = raw.strip().upper()` chains two methods and saves the result. Without the assignment the cleaned string would be lost.\n\n`len(code) == 8` rejects codes that are too short or too long, including `'CITS 1401'`, which is 9 characters.\n\n`code[:4]` is positions 0 to 3 and `code[4:]` is positions 4 to 7. `isalpha()` and `isdigit()` return True only if every character matches, so `'CIT11401'` and `'PHYS10O1'` fail. Note the brackets: `code[4:].isdigit` without them is a method object, which is always truthy.\n\nIf every check passes, return the code; otherwise fall through to `return 'INVALID'`.",
      },
      selfExplain: "Which test catches code[:3].isalpha() and code[5:].isdigit(), and why do the other tests miss that mistake?",
    },
  ],
};

export default scenario;
