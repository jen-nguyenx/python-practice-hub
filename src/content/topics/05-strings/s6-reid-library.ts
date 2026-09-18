// Scenario 6: the Reid Library catalogue - searching text, cleaning ISBNs and pulling a field out of a line.
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't05-s6',
  title: 'The Reid Library catalogue',
  story:
    'Every book in the Reid Library catalogue is one line of text: a call number, a title, and an ISBN as it was typed off the back cover. The search box has to ignore capital letters, the label printer wants only the digits of the ISBN and the initials of the author, and the year has to be pulled out from between two brackets.',
  questions: [
    {
      id: 't05-s6-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Searching the catalogue in lower case',
      prompt:
        'A student types `python` into the catalogue search box. The title is stored exactly as shown below. Exactly one of these expressions is True. Which one?',
      code: "title = 'Python Crash Course'",
      concepts: ['in', 'find', 'case', 'startswith'],
      detects: ['case_sensitive_compare', 'off_by_one_range'],
      expectedSec: 90,
      options: [
        {
          id: 'a',
          text: "'python' in title",
          mistake: 'case_sensitive_compare',
          why: "`in` compares characters exactly, and `'p'` and `'P'` are different characters. The title holds `'Python'`, so this is False.",
        },
        {
          id: 'b',
          text: "title.find('Python') > 0",
          mistake: 'off_by_one_range',
          why: "`find` returns the position of the match, and the title *starts* with `'Python'`, so it returns 0. `0 > 0` is False. A found-or-not test has to be `>= 0`, or `!= -1`.",
        },
        {
          id: 'c',
          text: "title.lower().startswith('python')",
          correct: true,
          why: "`title.lower()` is `'python crash course'`, which does start with `'python'`. Lower-casing one side and writing the other side in lower case is the usual way to compare text without caring about capitals.",
        },
        {
          id: 'd',
          text: "title[0:6] == 'python'",
          mistake: 'case_sensitive_compare',
          why: "The slice is the right length: positions 0 to 5 are `'Python'`. But `'Python' == 'python'` is False, because `==` on strings is also case sensitive.",
        },
      ],
      hints: [
        'Python compares text character by character, and a capital letter is a different character from its lower-case twin.',
        'Work out each expression on its own. For the `find` option, count the position where the word `Python` starts before you compare it with 0.',
        "Only one option changes the case of the title before comparing. `title.find('Python')` is 0, because the title begins with it.",
      ],
      solution: {
        explanation:
          "(a) `'python' in title` searches for those exact six characters. The title stores a capital `P`, so there is no match and the answer is False.\n\n" +
          "(b) `title.find('Python')` finds the word at position 0 and returns 0. Comparing with `> 0` throws away a match at the very start of the string, which is the most likely place for it. Use `>= 0` or `!= -1` instead.\n\n" +
          "(c) `title.lower()` builds the new string `'python crash course'`, and `startswith('python')` is True for it. This is the correct answer.\n\n" +
          "(d) `title[0:6]` is `'Python'`, six characters starting at 0. The slice is right, the comparison is not: `==` on strings is case sensitive, so it is False.\n\n" +
          'Clean the case once, then compare. Lower-casing the search text as well (`title.lower().startswith(typed.lower())`) is what a real search box does.',
      },
      selfExplain: "Why is title.find('Python') >= 0 a safer test than title.find('Python') > 0?",
    },
    {
      id: 't05-s6-q2',
      format: 'refactor',
      diff: 'medium',
      core: true,
      title: 'Pull the digits out of an ISBN',
      prompt:
        "`isbn_digits(raw)` takes an ISBN as it was typed off the back cover and returns a **string** of just its digits, in order. Spaces, hyphens and letters are dropped. For example `isbn_digits('978-1-59327-928-8')` returns `'9781593279288'`.\n\n" +
        'It works, but it walks the string by position and reaches back in with `raw[i]` twice on every pass. Rewrite the loop so it goes straight through the characters with `for ch in raw:`. The behaviour must not change.',
      code: `def isbn_digits(raw):
    """Return the digits of raw as a string, in order."""
    result = ''
    for i in range(len(raw)):
        if raw[i].isdigit():
            result = result + raw[i]
    return result`,
      fnName: 'isbn_digits',
      tests: [
        {
          id: 'v1',
          call: "isbn_digits('978-1-59327-928-8')",
          expect: "'9781593279288'",
          label: 'hyphens between the groups',
          hidden: false,
        },
        {
          id: 'v2',
          call: "isbn_digits('0 596 00797 3')",
          expect: "'0596007973'",
          label: 'spaces between the groups',
          hidden: false,
        },
        {
          id: 'h1',
          call: "isbn_digits('')",
          expect: "''",
          label: 'nothing typed',
          hidden: true,
          tag: 'accumulator_init',
        },
        {
          id: 'h2',
          call: "isbn_digits('none listed')",
          expect: "''",
          label: 'no digits at all',
          hidden: true,
        },
        {
          id: 'h3',
          call: "isbn_digits('QA76.73.P98 2023')",
          expect: "'7673982023'",
          label: 'a call number, with letters and full stops',
          hidden: true,
        },
        {
          id: 'h4',
          call: "isbn_digits('4')",
          expect: "'4'",
          label: 'one digit',
          hidden: true,
        },
      ],
      mustRemove: ['range_len_index'],
      mustAdd: ['for_each'],
      pattern: 'for-each-loop',
      concepts: ['for-each', 'loop-over-string', 'string-building', 'methods'],
      detects: ['accumulator_init', 'off_by_one_range'],
      expectedSec: 210,
      hints: [
        'The loop never uses `i` for anything except `raw[i]`. If the position is not needed, the loop does not have to count.',
        'Plan: keep `result` where it is, above the loop; change the loop header so the loop variable is the character itself; replace both `raw[i]` with that character. The `if` and the `return` stay as they are.',
        "```python\nfor ch in raw:\n    if ch.isdigit():\n        ...\n```",
      ],
      solution: {
        code: `def isbn_digits(raw):
    """Return the digits of raw as a string, in order."""
    result = ''
    for ch in raw:
        if ch.isdigit():
            result += ch
    return result`,
        explanation:
          '`for ch in raw:` hands you one character per pass, so there is no counter to set up and no chance of an off-by-one in `range(len(raw))`.\n\n' +
          'Both `raw[i]` become `ch`. The `if ch.isdigit():` test is unchanged, and `result += ch` says the same thing as `result = result + ch` in fewer characters.\n\n' +
          '`result` still has to be created before the loop. Moving it inside would wipe the digits collected so far on every pass, and an empty ISBN would leave `result` undefined.\n\n' +
          '`range(len(...))` is not wrong, it is just noise when the position is never used. Keep it for the jobs that genuinely need a position: reporting where something was found, or comparing `raw[i]` with `raw[i + 1]`.',
      },
      selfExplain: 'Which jobs still need range(len(raw)) rather than a for-each loop over the characters?',
    },
    {
      id: 't05-s6-q3',
      format: 'testWriter',
      diff: 'hard',
      core: false,
      title: 'Break the field reader',
      prompt:
        'Two versions of `between` were written for the catalogue importer. One is correct and one is secretly buggy. Enter an argument tuple that makes the two versions give different answers (or makes one crash). You cannot see either version, only the spec.',
      fnName: 'between',
      spec:
        '`between(text, start, end)` takes a string and two one-character markers, and returns a **string**.\n\n' +
        '- It returns the part of `text` that comes after the **first** `start`, and before the **first** `end` that appears after that `start`.\n' +
        '- The two markers themselves are not included.\n' +
        "- It returns `''` if `start` is not in `text`, or if no `end` appears after it.\n\n" +
        "For example, `between('Dune (1965)', '(', ')')` returns `'1965'` and `between('no year here', '(', ')')` returns `''`.",
      reference: `def between(text, start, end):
    """Return the text after the first start and before the next end."""
    a = text.find(start)
    if a == -1:
        return ''
    b = text.find(end, a + 1)
    if b == -1:
        return ''
    return text[a + 1:b]`,
      buggy: `def between(text, start, end):
    """Return the text after the first start and before the next end."""
    a = text.find(start)
    if a == -1:
        return ''
    b = text.find(end)
    if b == -1:
        return ''
    return text[a + 1:b]`,
      bugMistake: 'off_by_one_range',
      argsExample: "('Dune (1965)', '(', ')')",
      concepts: ['find', 'slicing', 'search', 'edge-cases'],
      detects: ['off_by_one_range', 'index_out_of_range'],
      expectedSec: 420,
      hints: [
        'Read the spec one phrase at a time. The phrase that is easiest to get wrong is "the first `end` that appears **after** that `start`". What would a version that ignored the word "after" do?',
        'A version that searches for `end` from the very beginning of the string still gets the right answer whenever the first `end` in the whole string happens to sit after the `start`. So you need a text where an `end` character turns up earlier than that.',
        "Two shapes of input do it. Put a stray closing marker before the opening one, as in `'4) Dune ...'`; or use the same character for both markers, the way quotation marks work.",
      ],
      solution: {
        code: "('He said \"stop\" twice', '\"', '\"')",
        explanation:
          '`(\'He said "stop" twice\', \'"\', \'"\')` exposes the bug. The first quotation mark is at position 8. The correct version searches for the closing quotation mark *from position 9*, finds it at 13, and returns `\'stop\'`. The buggy version searches from the beginning, finds the same quotation mark it already used at position 8, and slices `text[9:8]`, which is `\'\'`.\n\n' +
          'Using one character for both markers is the sharpest case, because the opening marker is always found first. Quoting, `**bold**` and CSV quoting all work this way.\n\n' +
          "A stray closing marker also does it: `('4) Dune (1965)', '(', ')')` gives `'1965'` from the correct version and `''` from the buggy one, because the buggy search finds the `')'` at position 1, long before the bracket that matters.\n\n" +
          "Inputs such as `('Dune (1965)', '(', ')')` or `('no year here', '(', ')')` agree in both versions, because there the first `end` in the whole string is also the first one after `start`. That is the trap: the obvious test cases pass.\n\n" +
          'When a function searches for something *after* a position, always test a string that has an earlier copy of what you are searching for.',
      },
      selfExplain: 'What one change to the buggy version would make it match the reference?',
    },
    {
      id: 't05-s6-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 5,
      examSlot: 'short-string',
      diff: 'hard',
      core: true,
      title: 'Initials for a spine label (exam style)',
      prompt:
        "Exam-style question, 5 marks. No imports, and there is no Run button: write your answer as you would on paper, then submit it once.\n\n" +
        "A spine label has room for the author's initials but not the whole name. Write `author_initials(name)` that returns a **string**: the first character of every word in `name`, in upper case, each one followed by a full stop.\n\n" +
        "- `author_initials('ursula kroeber le guin')` returns `'U.K.L.G.'`.\n" +
        "- Words are separated by one or more spaces, and `name` may also start or end with spaces: `author_initials('  Sally   Morgan ')` returns `'S.M.'`.\n" +
        "- Return `''` when `name` holds no words at all.\n\n" +
        'Use a loop over the characters. No lists, no `split` and no `join`.',
      concepts: ['string-building', 'loop-over-string', 'case', 'word-boundary'],
      detects: ['accumulator_init', 'case_sensitive_compare', 'index_out_of_range', 'off_by_one_range', 'print_vs_return'],
      expectedSec: 360,
      fnName: 'author_initials',
      rules: ['noImport'],
      starter: `def author_initials(name):
    """Return the initial of every word in name, upper case, each followed by a full stop."""
    pass
`,
      tests: [
        {
          id: 'v1',
          call: "author_initials('ursula kroeber le guin')",
          expect: "'U.K.L.G.'",
          label: 'four words',
          hidden: false,
        },
        { id: 'v2', call: "author_initials('Tim Winton')", expect: "'T.W.'", label: 'two words', hidden: false },
        { id: 'h1', call: "author_initials('')", expect: "''", label: 'nothing typed', hidden: true, tag: 'accumulator_init' },
        {
          id: 'h2',
          call: "author_initials('   ')",
          expect: "''",
          label: 'spaces but no words',
          hidden: true,
          tag: 'off_by_one_range',
        },
        {
          id: 'h3',
          call: "author_initials('  Sally   Morgan ')",
          expect: "'S.M.'",
          label: 'extra spaces at the start, middle and end',
          hidden: true,
          tag: 'index_out_of_range',
        },
        {
          id: 'h4',
          call: "author_initials('MARGARET river')",
          expect: "'M.R.'",
          label: 'one name in capitals, one in lower case',
          hidden: true,
          tag: 'case_sensitive_compare',
        },
        { id: 'h5', call: "author_initials('x')", expect: "'X.'", label: 'a one-letter name', hidden: true },
      ],
      hints: [
        'A word starts at a character that is not a space and either opens the name or follows a space. Walk through the characters and keep track of whether the next character you meet will start a word.',
        "Plan: start `result` at `''` and a True/False flag at True, because the very first character starts a word. For each character: if it is a space, set the flag back to True; otherwise, if the flag is True, add the upper-case character and a full stop to `result`, and turn the flag off. Return `result` after the loop.",
        "Two branches do the whole job:\n\n```python\nif ch == ' ':\n    new_word = True\nelif new_word:\n    result = result + ch.upper() + '.'\n```\n\nThe `elif` branch also has to turn the flag off, or every letter of the word is treated as an initial.",
      ],
      solution: {
        code: `def author_initials(name):
    """Return the initial of every word in name, upper case, each followed by a full stop."""
    result = ''
    new_word = True
    for ch in name:
        if ch == ' ':
            new_word = True
        elif new_word:
            result = result + ch.upper() + '.'
            new_word = False
    return result
`,
        explanation:
          "`result` starts as `''` before the loop, so a name with no words returns `''` rather than crashing or returning None.\n\n" +
          '`new_word` remembers one thing: whether the next character to arrive begins a word. It starts as True because the first character of the name, if there is one, does begin a word. That single flag is what removes the need to count spaces or to look at the character before or after the current one.\n\n' +
          "Every space sets `new_word` back to True. A run of spaces sets it True several times over, which is harmless, and that is why `'  Sally   Morgan '` gives `'S.M.'` and not `'S..M..'`. Counting spaces instead would report five words in that name.\n\n" +
          "The `elif` branch runs only for the first character of a word. It appends `ch.upper()` so `'ursula'` gives `'U.'` and `'MARGARET'` still gives `'M.'`, then a `'.'`, then turns the flag off so the rest of the word is skipped.\n\n" +
          "A common attempt is to look for spaces and then take `name[i + 1]`. That crashes with an IndexError on a name ending in a space, and misses the first word, which has no space in front of it.\n\n" +
          '`return result` sits after the loop, lined up with `for`, and returns the string rather than printing it.\n\n' +
          'Marking guide (5): result started as an empty string before the loop (1), a flag that marks the start of a word and starts as True (1), the flag reset at every space (1), the upper-case initial and full stop appended once per word (1), the string returned rather than printed (1).',
      },
      selfExplain: "What does the function return for 'Sally Morgan' if new_word starts as False instead of True?",
    },
  ],
};

export default scenario;
