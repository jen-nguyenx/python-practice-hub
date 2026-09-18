// Scenario 3: Perth Scorchers match-day scoreboard at Optus Stadium.
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s3',
  title: 'Scorchers scoreboard',
  story:
    'The Perth Scorchers are playing at Optus Stadium, and the big screen shows scores and team names as text. You are writing the small string functions behind the scoreboard: pulling numbers out of a score, counting letters and making short team labels.',
  questions: [
    {
      id: 't05-s3-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Reading a score with find',
      prompt: 'The scoreboard stores the score as one string. Pick the exact output of this program.',
      concepts: ['find', 'slicing', 'str-vs-int'],
      detects: ['off_by_one_range', 'str_int_concat'],
      expectedSec: 110,
      code: "score = 'Scorchers 187/5'\nslash = score.find('/')\nruns = score[slash - 3:slash]\nwickets = score[slash + 1:]\nprint(slash)\nprint(runs + wickets)\nprint(int(runs) + int(wickets))",
      choice: true,
      mutants: [
        {
          code: "score = 'Scorchers 187/5'\nslash = score.find('/')\nruns = score[slash - 3:slash]\nwickets = score[slash + 1:]\nprint(slash + 1)\nprint(runs + wickets)\nprint(int(runs) + int(wickets))",
          mistake: 'off_by_one_range',
        },
        {
          code: "score = 'Scorchers 187/5'\nslash = score.find('/')\nruns = score[slash - 3:slash]\nwickets = score[slash + 1:]\nprint(slash)\nprint(int(runs) + int(wickets))\nprint(int(runs) + int(wickets))",
          mistake: 'str_int_concat',
        },
      ],
      hints: [
        '`find` gives a position counted from 0. The space after "Scorchers" is a character too.',
        'Count: "Scorchers" uses positions 0 to 8 and the space is 9. Then decide whether `runs` and `wickets` are strings or numbers when they meet `+`.',
        "`runs` is `'187'` and `wickets` is `'5'`. The first `+` joins text; the second adds numbers.",
      ],
      solution: {
        explanation:
          "`'Scorchers'` fills positions 0 to 8, the space is 9, and `'1'`, `'8'`, `'7'` are 10, 11 and 12. So `find('/')` returns 13.\n\n`score[10:13]` is `'187'` (13 is not included) and `score[14:]` is `'5'`.\n\n`runs + wickets` joins two strings: `1875`.\n\n`int(runs) + int(wickets)` converts first, then adds: 187 + 5 = `192`.",
      },
      selfExplain: 'What would score.find("x") return here, and what would score[-1] give?',
    },
    {
      id: 't05-s3-q2',
      format: 'twins',
      diff: 'medium',
      core: false,
      title: 'Counting vowels in the ground name',
      prompt:
        'A trivia slide counts the vowels in the name of the ground. The two programs differ in one line. Do they print the same thing? Then predict both outputs.',
      concepts: ['loop-over-string', 'in', 'case'],
      detects: ['case_sensitive_compare'],
      expectedSec: 140,
      left: "ground = 'Optus Stadium'\nvowels = 0\nfor ch in ground:\n    if ch in 'aeiou':\n        vowels += 1\nprint(vowels)",
      right: "ground = 'Optus Stadium'\nvowels = 0\nfor ch in ground.lower():\n    if ch in 'aeiou':\n        vowels += 1\nprint(vowels)",
      mistake: 'case_sensitive_compare',
      hints: [
        'Look at the first letter of the name, and at which letters are inside the quotes.',
        "`ch in 'aeiou'` is an exact match. Is `'O'` one of those five characters?",
        'List the vowels in "Optus Stadium" and mark which ones are capital letters.',
      ],
      solution: {
        explanation:
          "The vowels in `'Optus Stadium'` are O, u, a, i and u.\n\nLeft: the loop sees the original characters. `'O' in 'aeiou'` is False because upper and lower case are different characters, so it counts only u, a, i, u and prints `4`.\n\nRight: `ground.lower()` is `'optus stadium'`, so the loop sees `'o'` as well and prints `5`.\n\nThe outputs differ. Lower-casing once, before the comparison, is the usual fix whenever case should not matter.",
      },
      selfExplain: "Instead of lower(), what could you change in the string 'aeiou' so the left program also prints 5?",
    },
    {
      id: 't05-s3-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Team acronyms for the big screen',
      prompt:
        "`acronym(name)` should return a **string** made of the first letter of each word, in upper case. For example `acronym('Western Australian Cricket Association')` returns `'WACA'` and `acronym('')` returns `''`. At the moment it returns only the first letter of the last word. Fix it.",
      concepts: ['string-building', 'accumulator', 'split'],
      detects: ['accumulator_init'],
      expectedSec: 150,
      buggy:
        "def acronym(name):\n    \"\"\"Return the upper-case first letter of each word, e.g. 'Perth Scorchers' -> 'PS'.\"\"\"\n    for word in name.split():\n        letters = ''\n        letters += word[0].upper()\n    return letters\n",
      bugMistake: 'accumulator_init',
      maxChangedLines: 2,
      fnName: 'acronym',
      tests: [
        {
          id: 'v1',
          call: "acronym('Western Australian Cricket Association')",
          expect: "'WACA'",
          label: 'four words',
          hidden: false,
          tag: 'accumulator_init',
        },
        { id: 'v2', call: "acronym('Perth Scorchers')", expect: "'PS'", label: 'two words', hidden: false, tag: 'accumulator_init' },
        { id: 'h1', call: "acronym('big bash league')", expect: "'BBL'", label: 'lower-case words', hidden: true },
        { id: 'h2', call: "acronym('Scorchers')", expect: "'S'", label: 'one word', hidden: true },
        { id: 'h3', call: "acronym('  Perth   Scorchers ')", expect: "'PS'", label: 'extra spaces', hidden: true },
        { id: 'h4', call: "acronym('')", expect: "''", label: 'empty name', hidden: true },
      ],
      hints: [
        'A one-word name already gives the right answer, but longer names do not. What happens to `letters` at the start of every pass?',
        'An accumulator is created once, before the loop, and only added to inside the loop.',
        "Move `letters = ''` so it sits directly above `for word in name.split():`, at the same indentation as the `for`.",
      ],
      solution: {
        code: "def acronym(name):\n    \"\"\"Return the upper-case first letter of each word, e.g. 'Perth Scorchers' -> 'PS'.\"\"\"\n    letters = ''\n    for word in name.split():\n        letters += word[0].upper()\n    return letters\n",
        explanation:
          "In the buggy version `letters = ''` runs on every pass, so each word wipes out the letters from earlier words and only the last letter is returned.\n\nMoving `letters = ''` above the loop creates the empty string once. Each pass then adds `word[0].upper()` to it: `'W'`, `'WA'`, `'WAC'`, `'WACA'`.\n\nIt also fixes the empty name: `''.split()` gives no words, so the loop never runs. In the buggy version `letters` was never created and `return letters` crashed with UnboundLocalError; now it returns `''`.\n\n`split()` with no argument ignores repeated spaces and never gives an empty word, so `word[0]` always exists.",
      },
      selfExplain: "Why is word[0] safe here even though ''[0] would raise IndexError?",
    },
    {
      id: 't05-s3-q4',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Fit a name on the big screen',
      prompt:
        "The big screen has room for 12 characters. Fill in the blanks so `screen_name(name)` returns a **string**: `name` itself when it is 12 characters or shorter, otherwise the first 11 characters followed by a full stop, which is 12 characters in total.\n\nFor example `screen_name('Aziz')` returns `'Aziz'` and `screen_name('Bartholomew Jones')` returns `'Bartholomew.'`.",
      concepts: ['slicing', 'len', 'boundary'],
      detects: ['off_by_one_range'],
      expectedSec: 110,
      template:
        'def screen_name(name):\n    """Return name, shortened to 12 characters as first 11 + \'.\' when it is too long."""\n    if ⟦1⟧:\n        return name\n    return name[⟦2⟧] + \'.\'\n',
      blanks: [
        { id: '1', accept: ['len(name) <= 12', 'len(name) < 13'] },
        { id: '2', accept: [':11', '0:11'] },
      ],
      fnName: 'screen_name',
      tests: [
        { id: 'v1', call: "screen_name('Aziz')", expect: "'Aziz'", label: 'short name', hidden: false },
        {
          id: 'v2',
          call: "screen_name('Bartholomew Jones')",
          expect: "'Bartholomew.'",
          label: 'long name',
          hidden: false,
        },
        {
          id: 'h1',
          call: "screen_name('Abdurrahman')",
          expect: "'Abdurrahman'",
          label: 'exactly 11 characters',
          hidden: true,
        },
        {
          id: 'h2',
          call: "screen_name('Hemingway JR')",
          expect: "'Hemingway JR'",
          label: 'exactly 12 characters',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h3',
          call: "screen_name('Aleksandrovna')",
          expect: "'Aleksandrov.'",
          label: 'one character too long',
          hidden: true,
          tag: 'off_by_one_range',
        },
        { id: 'h4', call: "screen_name('')", expect: "''", label: 'empty name', hidden: true },
      ],
      hints: [
        'The screen fits 12 characters. A name of exactly 12 characters already fits, so nothing should be cut.',
        'Blank 1 is the test for "it already fits". Blank 2 is a slice that keeps the first 11 characters, because the full stop takes the twelfth place.',
        'A slice from the start needs nothing before the colon: `name[:n]` is the first `n` characters.',
      ],
      solution: {
        code: 'def screen_name(name):\n    """Return name, shortened to 12 characters as first 11 + \'.\' when it is too long."""\n    if len(name) <= 12:\n        return name\n    return name[:11] + \'.\'\n',
        explanation:
          "`len(name) <= 12` is the boundary that matters. With `<` a 12-character name would be cut even though it fits, which is the off-by-one this question is about. `len(name) < 13` says the same thing.\n\nWhen the name fits, it is returned unchanged, so an empty name comes straight back.\n\n`name[:11]` takes positions 0 to 10, which is 11 characters. Adding `'.'` makes 12, exactly the width of the screen. `name[:12]` plus a full stop would be 13 characters and would not fit.\n\nSlices never raise IndexError, so no length check is needed on the second line.",
      },
      selfExplain: "How many characters does screen_name return for a 40-character name?",
    },
  ],
};

export default scenario;
