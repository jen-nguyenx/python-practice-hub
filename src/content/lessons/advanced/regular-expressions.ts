// Advanced: patterns over text, what they are good at, and the cases where plain string methods win.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'regular-expressions',
  title: 'Regular expressions',
  summary: 'Describing the shape of text instead of the exact characters, and knowing when not to',
  track: 'advanced',
  order: 13,
  minutes: 28,
  outcomes: [
    'Read a pattern made of the common metacharacters and say what it matches',
    'Choose between `search`, `match`, `fullmatch`, `findall` and `finditer`',
    'Pull pieces out of a match with numbered and named groups',
    'Tell greedy from lazy repetition and fix a pattern that swallows too much',
    'Recognise the jobs where `in`, `split` or `startswith` is the better tool',
  ],
  sections: [
    {
      id: 'what-a-pattern-is',
      title: 'A pattern describes a shape',
      blocks: [
        {
          kind: 'prose',
          body: '`\'cat\' in text` asks whether some exact characters appear. A regular expression asks something more general: is there **anything shaped like this** in the text? A run of digits. Something with an `@` in the middle and a dot after it. The pattern is itself written as text, and the `re` module compiles it and hunts with it.',
        },
        {
          kind: 'shell',
          caption: 'Three questions about the same line of text.',
          lines: [
            'import re',
            "line = 'order 66 shipped on 2024-03-01'",
            "'66' in line",
            "re.search(r'\\d+', line)",
            "re.search(r'\\d+', line).group()",
            "re.findall(r'\\d+', line)",
            "re.search(r'\\d+', 'nothing numeric here')",
          ],
        },
        {
          kind: 'prose',
          body: 'A search that finds something gives back a **match object**. A search that finds nothing gives back `None` — which is why reaching for `.group()` on a failed search is the commonest regex error there is, and every serious use of `re.search` is wrapped in an `if`.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Always write patterns as raw strings',
          body: 'Patterns are full of backslashes, and a backslash already means something to Python before `re` ever sees the text. The `r` prefix turns that off. Write `r\'\\d+\'`, never `\'\\d+\'`.',
        },
        {
          kind: 'predict',
          ask: 'Without the `r` prefix, Python converts some backslash sequences before the pattern engine sees them. What does this print?',
          code: "print(len('\\n'), len(r'\\n'))\n",
          choices: ['1 2', '2 2', '1 1', '2 1'],
        },
      ],
    },
    {
      id: 'metacharacters',
      title: 'The pieces a pattern is made of',
      blocks: [
        {
          kind: 'prose',
          body: 'A small set of symbols covers almost everything you will write. See them work before treating the table as reference.',
        },
        {
          kind: 'shell',
          caption: 'The building blocks, doing work.',
          lines: [
            'import re',
            "re.findall(r'\\d+', 'a1 bb22 ccc333')",
            "re.findall(r'[aeiou]', 'regular expressions')",
            "re.findall(r'\\b\\w{4}\\b', 'this is a test of four char words')",
            "re.findall(r'colou?r', 'color colour colouur')",
            "re.findall(r'a.c', 'abc a c axc ac')",
            "re.findall(r'\\bcat\\b', 'the cat in concatenate')",
            "re.findall(r'cat|dog', 'a dog, a cat, a catalogue')",
          ],
        },
        {
          kind: 'prose',
          body: 'Two of those repay a second look. `\\bcat\\b` refused the `cat` buried inside `concatenate` — the fix for "why does my search for `cat` match `concatenate`". And `cat|dog` still found the `cat` inside `catalogue`, because `|` on its own says nothing about boundaries: the two ideas combine, they do not replace each other.',
        },
        {
          kind: 'match',
          ask: 'Match each piece of a pattern to what it matches.',
          pairs: [
            { left: '.', right: 'Any one character except a newline' },
            { left: '\\d', right: 'A single digit' },
            { left: '[aeiou]', right: 'Any one of these characters' },
            { left: '*', right: 'None or more of the previous piece' },
            { left: '^  $', right: 'The start and the end of the text' },
            { left: '\\b', right: 'A word boundary' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'light-up-the-match',
            title: 'See exactly what a pattern claims',
            intro: 'Same text every time: `cat concatenate`. Choose a pattern and watch which characters it actually matches.',
            template: "import re\n\nsubject = 'cat concatenate'\npattern = ⟦pattern⟧\nmatches = list(re.finditer(pattern, subject))\nprint(pattern)\nprint([m.group() for m in matches])\nprint([m.span() for m in matches])\n",
            knobs: [
              {
                id: 'pattern',
                label: 'the pattern',
                choices: [
                  { value: "r'cat'", caption: 'cat' },
                  { value: "r'\\bcat\\b'", caption: 'cat, as a whole word' },
                  { value: "r'cat|nate'", caption: 'cat or nate' },
                  { value: "r'concatenate'", caption: 'the whole word' },
                ],
              },
            ],
            probes: {
              chars: 'list(subject)',
              lit: '[i for m in matches for i in range(m.start(), m.end())]',
            },
            visual: {
              kind: 'sequence',
              items: 'chars',
              picked: 'lit',
              caption: 'One box per character. The lit boxes are exactly what the pattern matched.',
            },
            notes: {
              '0': 'Two matches: the standalone `cat`, and the `cat` hiding inside `concatenate`. `cat` has no idea it is inside a longer word — it only asks whether those three letters appear.',
              '1': 'One match. `\\b` requires a word boundary on each side, and the `cat` inside `concatenate` is surrounded by other letters, so it is refused. Only the standalone word is lit.',
              '2': 'Three matches: both `cat`s from before, plus `nate` at the very end of `concatenate`. `|` does not pick one branch over the other — every place either branch fits gets matched.',
              '3': 'One match, but a long one: the whole word `concatenate` lights up as a single match, because the pattern asked for all eleven characters in that exact order.',
            },
            takeaway: 'A pattern matches exactly the characters it describes, no more and no less. Adding `\\b` shrinks what counts as a match; adding `|` widens it; asking for a whole word matches only where the whole word appears.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'Write a pattern that matches an Australian-style student number: the letter `u` followed by exactly seven digits, and nothing else. What goes wrong if you leave off the anchors?',
          answer: '`r\'^u\\d{7}$\'` — `^` and `$` fix the match to the whole text, `u` is a literal, `\\d{7}` is exactly seven digits. Without the anchors, `search` accepts a student number **inside** anything else — `xu12345678y` passes, because the search is free to start wherever it likes and stop as soon as seven digits are seen — so a validator built from it would pass rubbish. `re.fullmatch` is the alternative: it requires the whole text to match with no anchors needed at all, and forgetting to call `fullmatch` is at least visible, unlike a silently missing anchor.',
        },
      ],
    },
    {
      id: 'the-functions',
      title: '`search`, `match`, `fullmatch`, `findall`',
      blocks: [
        {
          kind: 'prose',
          body: 'Four functions differ in *where* the pattern is allowed to match and *what you get back*. The name `match` is the trap: it does not mean "does this match", it means "does this match **at the start**".',
        },
        {
          kind: 'table',
          caption: 'Choosing between them.',
          head: ['Function', 'Matches where', 'Gives back'],
          rows: [
            ['re.search', 'Anywhere in the text', 'The first match object, or None'],
            ['re.match', 'Only at the start', 'A match object, or None'],
            ['re.fullmatch', 'The whole text, start to end', 'A match object, or None — the one for validating'],
            ['re.findall', 'Every place it fits', 'A list of strings (or of tuples, if the pattern has groups)'],
            ['re.finditer', 'Every place it fits', 'Match objects, one at a time, with positions'],
          ],
        },
        {
          kind: 'quiz',
          prompt: '`re.match(r\'\\d+\', \'order 66 shipped\')` — what does it return?',
          options: [
            {
              text: 'None, because the text does not start with a digit',
              correct: true,
              why: '`match` only tries at position 0. `\'order 66 shipped\'` starts with `o`, not a digit, so it fails there and never looks further into the string — unlike `search`, which would find the `66`.',
            },
            { text: 'A match object for "66"', why: 'That is what `re.search` would return. `re.match` is anchored to the start of the text and never gets as far as the `66`.' },
            { text: 'A match object for the whole string', why: 'Nothing here asks for the whole string to match a pattern of one or more digits — and it plainly does not, since it starts with letters.' },
            { text: 'An empty list', why: '`re.match` returns a single match object or `None`, never a list — `findall` is the one that returns a list.' },
          ],
        },
        {
          kind: 'code',
          caption: 'What a match object carries, and the guard that belongs around it.',
          code: "import re\n\ndef year_in(text):\n    found = re.search(r'\\d{4}', text)\n    if found is None:\n        return 'no year found'\n    return found.group()\n\nprint(year_in('shipped on 2024-03-01'))\nprint(year_in('shipped yesterday'))\n\nfound = re.search(r'\\d{4}', 'shipped on 2024-03-01')\nprint(found.group(), found.start(), found.end())\n",
        },
      ],
    },
    {
      id: 'groups',
      title: 'Groups: keeping the pieces',
      blocks: [
        {
          kind: 'prose',
          body: 'Finding a date is half a job; usually you want the year, month and day separately. Brackets around part of a pattern make it a **group**, readable back on its own.',
        },
        {
          kind: 'code',
          caption: 'Numbered groups, then the same pattern with names.',
          code: "import re\n\nfound = re.search(r'(\\d{4})-(\\d{2})-(\\d{2})', 'shipped on 2024-03-01 ok')\nprint(found.group(0))\nprint(found.groups())\n\nnamed = re.search(r'(?P<year>\\d{4})-(?P<month>\\d{2})-(?P<day>\\d{2})', 'shipped on 2024-03-01 ok')\nprint(named.group('year'), named.group('day'))\n",
        },
        {
          kind: 'prose',
          body: 'Group zero is always the whole match. Numbered groups count from the left by their opening bracket, which becomes a liability once a new bracket renumbers everything after it — the named form never does that. Groups also change what `findall` gives back, which surprises everyone once.',
        },
        {
          kind: 'predict',
          ask: 'What does adding one pair of brackets do to what `findall` returns?',
          code: "import re\n\ntext = 'ada@example.com and bob@school.edu'\n\nprint(re.findall(r'\\w+@\\w+', text))\nprint(re.findall(r'(\\w+)@\\w+', text))\n",
          choices: [
            "['ada@example', 'bob@school']\n['ada', 'bob']",
            "['ada@example', 'bob@school']\n['ada@example', 'bob@school']",
            "['ada', 'bob']\n['ada@example', 'bob@school']",
            "['ada@example', 'bob@school']\n[('ada', 'example'), ('bob', 'school')]",
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'State the rule that governs what `findall` returns for a pattern with no groups, one group, and more than one group.',
          answer: '`findall` returns the whole match when the pattern has no groups, the single group\'s text when it has exactly one, and a tuple of the groups when it has more than one — so adding brackets to a working pattern can silently change the type of what comes back. When both the whole match and its pieces are wanted, `finditer` is the answer: read `group(0)` alongside the numbered or named groups on each match object. `(?:...)` groups without capturing, for when brackets are only there to hold a repetition together.',
        },
      ],
    },
    {
      id: 'greedy',
      title: 'Greedy and lazy',
      blocks: [
        {
          kind: 'prose',
          body: '`+` and `*` are **greedy**: they take as much as they possibly can and only give characters back if the rest of the pattern cannot otherwise fit. That is usually what you want, and occasionally a disaster.',
        },
        {
          kind: 'predict',
          ask: 'One pattern, three levels of appetite, on the same text. What does the greedy version return?',
          code: "import re\n\ntags = '<b>bold</b> and <i>italic</i>'\nprint(re.findall(r'<.+>', tags))\n",
          choices: [
            "['<b>bold</b> and <i>italic</i>']",
            "['<b>', '</b>', '<i>', '</i>']",
            "['<b>bold</b>', '<i>italic</i>']",
            '[]',
          ],
        },
        {
          kind: 'prose',
          body: 'The greedy version ran from the first `<` all the way to the **last** `>`, swallowing everything between, because `.` matches those characters happily and the pattern is satisfied by the furthest possible `>`.',
        },
        {
          kind: 'code',
          caption: 'Two fixes: lazy repetition, and refusing to cross the boundary at all.',
          code: "import re\n\ntags = '<b>bold</b> and <i>italic</i>'\nprint(re.findall(r'<.+?>', tags))\nprint(re.findall(r'<[^>]+>', tags))\n",
        },
        {
          kind: 'prose',
          body: 'Adding `?` after `+` makes it lazy: take as little as possible. `[^>]+` is the version professionals reach for — it cannot cross a `>` at all, so it stops for structural reasons rather than by asking politely. A general habit: prefer "everything that is not the separator" over "anything, lazily".',
        },
      ],
    },
    {
      id: 'sub-and-split',
      title: 'Changing text, not just finding it',
      blocks: [
        {
          kind: 'prose',
          body: 'Two more functions cover most of the remaining work. `re.sub` replaces every match, and `re.split` cuts text wherever a pattern matches — `str.split` with a shape instead of an exact separator.',
        },
        {
          kind: 'shell',
          caption: 'Replacing and splitting.',
          lines: [
            'import re',
            "re.sub(r'\\s+', ' ', 'too   many     spaces')",
            "re.sub(r'\\bcat\\b', 'dog', 'the cat in concatenate')",
            "re.split(r'[;,]\\s*', 'ada, bob;cleo , dan')",
            "re.sub(r'(\\w+)@(\\w+)', r'\\2 at \\1', 'ada@example')",
          ],
        },
        {
          kind: 'prose',
          body: '`\\1` and `\\2` in the replacement text refer to the groups from the pattern, so a substitution can rearrange what it matched. The `split` line shows where a regex genuinely beats `str.split`: more than one possible separator, with optional space around it.',
        },
      ],
    },
    {
      id: 'when-not-to',
      title: 'When a regex is the wrong tool',
      blocks: [
        {
          kind: 'prose',
          body: 'A regular expression is a small program written in a dense notation, inside a string, with no room for a comment. It is the right answer when the **shape** of the text is the problem, and the wrong answer when you knew the exact characters all along.',
        },
        {
          kind: 'compare',
          caption: 'Does this filename end in `.csv`? Both versions look reasonable.',
          left: {
            label: 'A pattern with an unescaped dot',
            bad: true,
            code: "import re\n\nnames = ['marks.csv', 'notes.txt', 'dataXcsv']\nfor n in names:\n    print(n, bool(re.search(r'.csv$', n)))\n",
          },
          right: {
            label: 'The string method',
            code: "names = ['marks.csv', 'notes.txt', 'dataXcsv']\nfor n in names:\n    print(n, n.endswith('.csv'))\n",
          },
        },
        {
          kind: 'quiz',
          prompt: 'The left-hand pattern `r\'.csv$\'` wrongly accepted `dataXcsv`, a file with no dot at all. Why?',
          options: [
            {
              text: 'An unescaped `.` matches any character, so it matched the `X` instead of a literal dot',
              correct: true,
              why: 'The pattern asked for "any character, then csv, at the end" — which `dataXcsv` satisfies with `X` standing in for the dot. `r\'\\.csv$\'` would refuse it correctly.',
            },
            { text: '`$` anchors to the start of the text rather than the end', why: '`$` genuinely anchors to the end here — that part of the pattern is doing its job. The dot is the piece that is too permissive.' },
            { text: 're.search only checks the first character of the string', why: '`search` looks anywhere in the text; the bug is not about where it looks, it is that the pattern accepts a character it should not.' },
            { text: 'CSV filenames cannot be matched by regular expressions', why: 'They can be, precisely: `r\'\\.csv$\'` does it correctly. The problem here is one unescaped character, not a limitation of regex.' },
          ],
        },
        {
          kind: 'table',
          caption: 'The same job, two ways.',
          head: ['The question', 'Reach for', 'Not'],
          rows: [
            ['Does it contain `cat`?', "'cat' in text", "re.search(r'cat', text)"],
            ['Does it start or end with this?', 'startswith, endswith', "r'^this', r'this$'"],
            ['Split on one exact character', "text.split(',')", "re.split(r',', text)"],
            ['Split a proper CSV line', 'The csv module', 'A pattern that tries to understand quotes'],
            ['Is this the shape of a date or an id?', 're.fullmatch', 'A pile of ifs over lengths and digits'],
            ['Understand HTML, or truly validate an email', 'A real parser, or a service that sends a mail', 'A regex — genuinely, do not'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You must pull marks out of lines like `CITS1401: 72, 65, 80`. One person writes a single pattern for the whole line; another splits on the colon, then commas, then converts. Which would you defend in review, and what would change your mind?',
          answer: 'Defend the two-step split. Each step is readable on its own, the failure of any step points at exactly which part of the line was malformed, and converting with `int()` inside a `try` gives a specific message about the bad field rather than a match that silently returns `None` for the whole line. What would change my mind is the text becoming irregular — marks written as `72%`, separators varying, an optional grade in brackets. Once the shape is the problem rather than the positions, a pattern with named groups earns its place, and even then the line-splitting stays outside it.',
        },
      ],
    },
  ],
};

export default lesson;
