// Cheat sheet, worked example and common mistakes for topic 05 (strings).
import type { Md, Topic } from '../../schema.ts';

export const cheatsheet: Md = `**Indexing: one character.** Positions start at 0. Negative positions count from the end, so -1 is the last character. An index past the end raises IndexError.

\`\`\`python
plate = '1ABC234'
plate[0]      # '1'  (a string, not the number 1)
plate[3]      # 'C'
plate[-1]     # '4'  (last character)
len(plate)    # 7, so the last index is 6
plate[7]      # IndexError: string index out of range
\`\`\`

**Slicing: a piece of the string.** \`s[start:stop:step]\` includes start and stops *before* stop. Leave a number out to mean "from the beginning" or "to the end". Slices never raise IndexError.

\`\`\`python
plate[1:4]    # 'ABC'   positions 1, 2, 3
plate[:4]     # '1ABC'
plate[4:]     # '234'
plate[-3:]    # '234'   last three
plate[::2]    # '1B24'  every second character
plate[::-1]   # '432CBA1' reversed
plate[5:100]  # '34'    no error
\`\`\`

**Strings cannot be changed.** Every method returns a *new* string. Save the result or it is lost.

\`\`\`python
name = ' perth '
name.strip()                  # does nothing useful: result thrown away
name = name.strip().upper()   # 'PERTH'
name[0] = 'B'                 # TypeError: 'str' object does not support item assignment
name = 'B' + name[1:]         # build a new string instead
\`\`\`

**Methods you need for the test.**

- \`s.upper()\`, \`s.lower()\`, \`s.capitalize()\` change case.
- \`s.strip()\` removes spaces, tabs and newlines from both ends (not the middle).
- \`s.replace(old, new)\` replaces every copy of old.
- \`s.find(sub)\` gives the first position of sub, or -1 if it is not there.
- \`s.rfind(sub)\` is the same but searches from the right.
- \`s.count(sub)\` counts non-overlapping copies.
- \`s.split()\` breaks on any run of spaces; \`s.split(',')\` breaks on each comma.
- \`' '.join(words)\` glues strings together with a space between them.
- \`s.isdigit()\`, \`s.isalpha()\`, \`s.isupper()\` return True or False. Remember the brackets.
- \`sub in s\` is True or False. Use it when you do not need the position.

**Loop over characters.** Use \`for ch in s\` when you only need the characters. Use \`for i in range(len(s))\` when you need positions, and check the largest index you touch.

\`\`\`python
word = 'Mullaloo'
doubles = 0
for i in range(len(word) - 1):   # stop one early
    if word[i] == word[i + 1]:     # i + 1 is at most len(word) - 1
        doubles += 1
print(doubles)   # 2  (ll and oo)
\`\`\`

**Build a new string with an accumulator.** Start with \`''\` before the loop and add to it inside.

\`\`\`python
digits = ''
for ch in 'Gate 7, Row 12':
    if ch.isdigit():
        digits += ch
print(digits)   # 712
\`\`\`

**Compare text without caring about case.** Normalise both sides once, before comparing.

\`\`\`python
if answer.strip().lower() == 'kings park':
    print('Correct')

def is_palindrome(word):
    word = word.lower()
    return word == word[::-1]
\`\`\`

**ord and chr.** \`ord('a')\` is 97 and \`chr(97)\` is \`'a'\`. Letters are in order, so \`ord(ch) - ord('a')\` is the position of a lower-case letter in the alphabet (0 to 25). Use \`% 26\` to wrap around.

**Joining text and numbers.** \`+\` needs strings on both sides: \`'Gate ' + str(7)\` or \`f'Gate {7}'\`. \`'3' + '4'\` is \`'34'\`, not 7.

**Gotchas the night before.**

- \`'Perth' == 'perth'\` is False, and so is \`'perth ' == 'perth'\`.
- \`s.find('x')\` returns -1 when not found, and \`s[-1]\` is a valid index, so check for -1 before slicing.
- \`s.upper\` without brackets is the method itself, which is always truthy.
- Building with \`+ ' '\` inside a loop leaves a trailing space; strip it or add the space before every item except the first.
- Resetting \`result = ''\` inside the loop throws away everything built so far.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Reid Library booking tags: "mei ling  tan" becomes "Tan, M. L."',
  code: `def library_tag(full_name):
    """Return 'Surname, I. I.' for a booking name, e.g. 'mei ling tan' -> 'Tan, M. L.'."""
    name = full_name.strip()
    last_space = name.rfind(' ')
    if last_space == -1:
        return name.capitalize()
    surname = name[last_space + 1:]
    given = name[:last_space]
    initials = ''
    for word in given.split():
        initials += word[0].upper() + '. '
    return surname.capitalize() + ', ' + initials.strip()`,
  steps: [
    "**Clean the input.** Names typed into a booking form often have spaces at the ends. `name = full_name.strip()` makes a new, clean string and saves it. Calling `full_name.strip()` on its own would change nothing.",
    "**Find where the surname starts.** The surname is everything after the *last* space, so `rfind(' ')` searches from the right. For `'mei ling  tan'` it returns 9.",
    "**Handle the edge case first.** If there is no space at all, `rfind` returns -1. A one-word name has no initials, so return it capitalised straight away: `'TAN'` becomes `'Tan'`.",
    "**Cut the string into two slices.** `name[last_space + 1:]` starts one past the space, giving `'tan'`. `name[:last_space]` stops before the space, giving `'mei ling '`. The `+ 1` is what keeps the space out of the surname.",
    "**Build the initials with an accumulator.** Start with `initials = ''` before the loop. `given.split()` ignores repeated spaces, so the loop sees `'mei'` then `'ling'`, and adds `'M. '` then `'L. '`.",
    "**Join the parts and tidy the end.** The loop leaves a trailing space (`'M. L. '`), so `strip()` it. Return `'Tan' + ', ' + 'M. L.'`. Check it by hand with a one-word name and a name with extra spaces.",
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'string_immutability',
    bad: "suburb = '  nedlands '\nsuburb.strip()\nsuburb.capitalize()\nprint('[' + suburb + ']')   # [  nedlands ]",
    good: "suburb = '  nedlands '\nsuburb = suburb.strip().capitalize()\nprint('[' + suburb + ']')   # [Nedlands]",
    note: 'String methods never change the string they are called on. They return a new string, so assign it. For the same reason `suburb[0] = \'N\'` raises TypeError; build a new string such as `\'N\' + suburb[1:]`.',
  },
  {
    mistake: 'off_by_one_range',
    bad: "plate = '1ABC234'\nletters = plate[1:3]   # 'AB'",
    good: "plate = '1ABC234'\nletters = plate[1:4]   # 'ABC'",
    note: 'A slice stops *before* its second number. `s[a:b]` has `b - a` characters, so the three characters at positions 1, 2 and 3 are `s[1:4]`.',
  },
  {
    mistake: 'index_out_of_range',
    bad: "for i in range(len(word)):\n    if word[i] == word[i + 1]:\n        doubles += 1",
    good: "for i in range(len(word) - 1):\n    if word[i] == word[i + 1]:\n        doubles += 1",
    note: 'The last valid index is `len(s) - 1`. When the loop body reads `s[i + 1]`, the loop must stop one position earlier. Use `s[-1]` for the last character.',
  },
  {
    mistake: 'case_sensitive_compare',
    bad: "if answer == 'kings park':\n    score += 1",
    good: "if answer.strip().lower() == 'kings park':\n    score += 1",
    note: "`'Kings Park' == 'kings park'` is False. Normalise case (and spaces) on both sides before comparing, counting, or checking a palindrome.",
  },
  {
    mistake: 'accumulator_init',
    bad: "for ch in plate:\n    cleaned = ''\n    if ch != '-':\n        cleaned += ch",
    good: "cleaned = ''\nfor ch in plate:\n    if ch != '-':\n        cleaned += ch",
    note: "Start the new string once, before the loop. Setting `cleaned = ''` inside the loop wipes out everything built on earlier passes.",
  },
  {
    mistake: 'str_int_concat',
    bad: "runs = 187\nprint('Scorchers ' + runs)",
    good: "runs = 187\nprint('Scorchers ' + str(runs))",
    note: "`+` joins two strings or adds two numbers, never one of each. Convert with `str()` or use an f-string. Also remember that `'1' + '1'` is `'11'`, not 2.",
  },
];
