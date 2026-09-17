import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s3',
  title: 'Guild puzzle night',
  story:
    'The UWA Guild runs a word-puzzle night in the Tavern: palindromes, words spelt backwards and scrambled email addresses for the prize draw. ' +
    'The puzzle setter has one rule for the code behind the games: recursion only, no loops.',
  questions: [
    {
      id: 't13-s3-q1',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Spelling on the way back',
      prompt: 'The warm-up game spells a word backwards. Type exactly what this program prints.',
      code: `def spell_back(word):
    if word == '':
        print('go')
        return 0
    letter = word[0]
    length = spell_back(word[1:]) + 1
    print(letter, length)
    return length

n = spell_back('uwa')
print(n)`,
      mutants: [
        {
          code: `letter = ''
def spell_back(word):
    global letter
    if word == '':
        print('go')
        return 0
    letter = word[0]
    length = spell_back(word[1:]) + 1
    print(letter, length)
    return length

n = spell_back('uwa')
print(n)`,
          mistake: 'scope_confusion',
        },
        {
          code: `def spell_back(word):
    if word == '':
        print('go')
        return 0
    letter = word[0]
    length = spell_back(word[1:]) + 1
    print(letter, length)
    return length

n = spell_back('uwa')
print(0)`,
          mistake: 'recursion_result_ignored',
        },
      ],
      concepts: ['call-stack', 'local-variables', 'slicing'],
      detects: ['scope_confusion', 'recursion_result_ignored'],
      expectedSec: 180,
      hints: [
        'Nothing is printed on line 7 until the call on line 6 has come back. Which call is the first to print anything?',
        'List the calls: `spell_back(\'uwa\')`, `spell_back(\'wa\')`, `spell_back(\'a\')`, `spell_back(\'\')`. Each one has its own `letter` and its own `length`. They finish in the opposite order to how they started.',
        'The first two lines are `go` and `a 1`. The call on `\'wa\'` has `letter` equal to `\'w\'`.',
      ],
      solution: {
        explanation:
          'Going down, each call stores its own first letter and then waits on line 6:\n\n' +
          '- `spell_back(\'uwa\')`: `letter` is `\'u\'`\n' +
          '- `spell_back(\'wa\')`: `letter` is `\'w\'`\n' +
          '- `spell_back(\'a\')`: `letter` is `\'a\'`\n' +
          '- `spell_back(\'\')`: the base case prints `go` and returns 0.\n\n' +
          'Coming back up, the deepest waiting call finishes first:\n\n' +
          '- the call on `\'a\'` gets 0, so `length` is 1 and it prints `a 1`\n' +
          '- the call on `\'wa\'` gets 1, so it prints `w 2`\n' +
          '- the call on `\'uwa\'` gets 2, so it prints `u 3` and returns 3.\n\n' +
          'Each call kept its own `letter`, so the letters come out as a, w, u. Line 11 prints the value returned by the first call, 3:\n\n' +
          '```\ngo\na 1\nw 2\nu 3\n3\n```',
      },
      selfExplain: 'If each call printed its letter before the recursive call on line 6, in what order would the letters come out, and why?',
    },
    {
      id: 't13-s3-q2',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Palindrome checker',
      prompt:
        'Build `is_palindrome(word)`, which returns `True` if `word` reads the same forwards and backwards, and `False` otherwise. ' +
        'The puzzle words are all lower case, so compare letters exactly.\n\n' +
        'Use recursion: compare the outside letters, then check the part in between. Not every line is needed.',
      lines: [
        { text: 'def is_palindrome(word):', indent: 0 },
        { text: 'if len(word) <= 1:', indent: 1 },
        { text: 'return True', indent: 2 },
        { text: 'if word[0] != word[-1]:', indent: 1 },
        { text: 'return False', indent: 2 },
        { text: 'return is_palindrome(word[1:-1])', indent: 1 },
      ],
      distractors: [
        { text: 'if len(word) == 1:', indent: 1, mistake: 'index_out_of_range' },
        { text: 'is_palindrome(word[1:-1])', indent: 1, mistake: 'recursion_result_ignored' },
      ],
      indentMatters: true,
      fnName: 'is_palindrome',
      tests: [
        { id: 'v1', call: "is_palindrome('level')", expect: 'True', label: 'odd-length palindrome', hidden: false, tag: 'recursion_result_ignored' },
        { id: 'v2', call: "is_palindrome('guild')", expect: 'False', label: 'not a palindrome', hidden: false },
        { id: 'h1', call: "is_palindrome('noon')", expect: 'True', label: 'even-length palindrome', hidden: true, tag: 'index_out_of_range' },
        { id: 'h2', call: "is_palindrome('')", expect: 'True', label: 'empty string', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: "is_palindrome('a')", expect: 'True', label: 'one letter', hidden: true },
        { id: 'h4', call: "is_palindrome('reader')", expect: 'False', label: 'outside letters match but the middle does not', hidden: true, tag: 'recursion_result_ignored' },
      ],
      concepts: ['base-case', 'slicing', 'palindrome'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'index_out_of_range'],
      expectedSec: 200,
      hints: [
        'Which words are palindromes without checking anything at all? Start with those.',
        'Plan: a word with 0 or 1 letters is a palindrome. If the first and last letters differ, it is not. Otherwise the answer is the answer for the middle part, and that answer must be handed back.',
        'The middle part is `word[1:-1]`, and the last line is `return is_palindrome(word[1:-1])`.',
      ],
      solution: {
        code: `def is_palindrome(word):
    if len(word) <= 1:
        return True
    if word[0] != word[-1]:
        return False
    return is_palindrome(word[1:-1])`,
        explanation:
          '- `if len(word) <= 1: return True` is the base case. It must include length 0: even-length words shrink to the empty string (`noon`, `oo`, `\'\'`). With `== 1` the empty string skips the base case and `word[0]` raises IndexError.\n' +
          '- `if word[0] != word[-1]: return False` stops as soon as the outside letters differ.\n' +
          '- `return is_palindrome(word[1:-1])` checks the middle part, which is 2 letters shorter, and returns its answer. Without `return`, the function gives back `None` for every palindrome longer than one letter.\n\n' +
          'For `reader`: r = r, so check `eade`; e = e, so check `ad`; a is not d, so `False` comes back up through every call.',
      },
      selfExplain: 'Why does the base case need <= 1 rather than == 1 for a word like noon?',
    },
    {
      id: 't13-s3-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Scrambled email addresses',
      prompt:
        'For the prize draw, each player\'s email address is hidden by reversing the part before the `@` and the part after the `@` separately, keeping the `@` between them.\n\n' +
        'Write two functions:\n\n' +
        '- `reverse(text)` returns the string `text` backwards.\n' +
        '- `reverse_email(email)` returns the scrambled address as a string. It must use `reverse`. `email` contains exactly one `@`, and either part may be empty.\n\n' +
        '**Recursion must be used and loops are not allowed.** Do not use `[::-1]` or `reversed()`.\n\n' +
        "Example: `reverse_email('mia.chen@uwa.edu.au')` returns `'nehc.aim@ua.ude.awu'`.",
      fnName: 'reverse_email',
      starter: `def reverse(text):
    pass


def reverse_email(email):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: "reverse_email('mia.chen@uwa.edu.au')", expect: "'nehc.aim@ua.ude.awu'", label: 'student address', hidden: false },
        { id: 'v2', call: "reverse('swan')", expect: "'naws'", label: 'reverse on its own', hidden: false },
        { id: 'v3', call: "reverse_email('raj@guild.net')", expect: "'jar@ten.dliug'", label: 'short address', hidden: false },
        { id: 'h1', call: "reverse('')", expect: "''", label: 'reverse an empty string', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: "reverse_email('@uwa')", expect: "'@awu'", label: 'nothing before the @', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: "reverse_email('tom.o@')", expect: "'o.mot@'", label: 'nothing after the @', hidden: true, tag: 'missing_base_case' },
        { id: 'h4', call: "reverse_email('a@b')", expect: "'a@b'", label: 'one character each side', hidden: true },
        {
          id: 'h5',
          call: "reverse_email('Kofi.Mensah2@student.uwa.edu.au')",
          expect: "'2hasneM.ifoK@ua.ude.awu.tneduts'",
          label: 'capitals and digits are kept',
          hidden: true,
        },
      ],
      concepts: ['string-recursion', 'slicing', 'helper-function', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion', 'index_out_of_range'],
      expectedSec: 480,
      hints: [
        'Split the job in two. `reverse` only has to reverse one string. `reverse_email` cuts the address at the `@` and calls `reverse` on each part.',
        'Plan for `reverse`: an empty string reversed is itself. Otherwise, the reversed text is the reverse of everything after the first character, followed by the first character. Plan for `reverse_email`: find the position of `@`, slice out the part before and the part after, and join reverse(before) + \'@\' + reverse(after).',
        'In `reverse`: `return reverse(text[1:]) + text[0]`. In `reverse_email`: `at = email.index(\'@\')`, then `email[:at]` and `email[at + 1:]` are the two parts.',
      ],
      solution: {
        code: `def reverse(text):
    if text == '':
        return ''
    return reverse(text[1:]) + text[0]


def reverse_email(email):
    at = email.index('@')
    user = email[:at]
    domain = email[at + 1:]
    return reverse(user) + '@' + reverse(domain)`,
        explanation:
          '`reverse`:\n\n' +
          '- `if text == \'\': return \'\'` is the base case. It covers the empty parts in `\'@uwa\'` and `\'tom.o@\'`. A base case of `len(text) == 1` would never stop for an empty string, because `\'\'[1:]` is still `\'\'`.\n' +
          '- `return reverse(text[1:]) + text[0]` reverses the rest, then puts the first character on the end. For `\'swan\'`: reverse(\'wan\') + \'s\' = \'naw\' + \'s\' = \'naws\'.\n\n' +
          '`reverse_email`:\n\n' +
          '- `email.index(\'@\')` finds the position of the `@`. `email.split(\'@\')` would also work.\n' +
          '- `email[:at]` is everything before it and `email[at + 1:]` everything after it.\n' +
          '- Both parts go through `reverse`, and the `@` is put back in the middle. No loop is needed anywhere: the repetition comes from `reverse` calling itself.\n\n' +
          'This is the shape of a 13-mark CITS1401 exam question.',
      },
      selfExplain: 'Why is the empty string a better base case for reverse than a string of length 1?',
    },
  ],
};

export default scenario;
