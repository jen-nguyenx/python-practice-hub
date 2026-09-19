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
          body: '`\'cat\' in text` asks whether some exact characters appear. A regular expression asks something more general: is there **anything shaped like this** in the text? A run of digits. A word ending in `ing`. Something with an `@` in the middle and a dot after it.\n\nThe pattern is itself written as text, and the `re` module compiles it and hunts with it.',
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
            "re.findall(r'\\d{4}-\\d{2}-\\d{2}', line)",
          ],
        },
        {
          kind: 'prose',
          body: 'A search that finds something gives back a **match object**, and the repr of that object tells you where it matched and what it matched. A search that finds nothing gives back `None`, and showing nothing is exactly what the shell does with `None` — which is why one of those lines looks blank.\n\nThat `None` is the reason almost every use of `re.search` is wrapped in an `if`: reaching for `.group()` on a failed search is the commonest regex error there is.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Always write patterns as raw strings',
          body: 'Patterns are full of backslashes, and a backslash already means something to Python before `re` ever sees the text. The `r` prefix turns that off, so what you typed is what the pattern engine gets. Write `r\'\\d+\'`, never `\'\\d+\'`.',
        },
        {
          kind: 'shell',
          caption: 'What the `r` prefix actually does.',
          lines: [
            "len('\\n'), len(r'\\n')",
            "r'\\d' == '\\\\d'",
            "print(r'C:\\temp\\new')",
            "print('C:\\temp\\new')",
            "import re",
            "re.findall(r'\\\\', r'a\\b')",
          ],
        },
        {
          kind: 'prose',
          body: 'Without the prefix, Python turned two of those characters into a tab and a newline before the pattern engine got a look. With it, the backslashes survive. This is the whole reason for the habit.',
        },
      ],
    },
    {
      id: 'metacharacters',
      title: 'The pieces a pattern is made of',
      blocks: [
        {
          kind: 'table',
          caption: 'The working set. Everything else is a variation on these.',
          head: ['Written', 'Matches', 'Example'],
          rows: [
            ['a', 'That exact character', "'a' in 'cat'"],
            ['.', 'Any one character except a newline', "r'a.c' matches 'abc' and 'a c'"],
            ['\\d \\w \\s', 'A digit, a word character, a space', "r'\\d\\d' matches '42'"],
            ['\\D \\W \\S', 'The opposite of each', "r'\\D' matches 'x' but not '4'"],
            ['[abc]', 'Any one of these characters', "r'[aeiou]' matches one vowel"],
            ['[^abc]', 'Any one character that is not these', "r'[^,]+' matches up to the next comma"],
            ['[a-z] [0-9]', 'A range of characters', "r'[A-Z][a-z]+' matches 'Ada'"],
            ['*  +  ?', 'None or more, one or more, none or one', "r'colou?r' matches both spellings"],
            ['{2} {2,5}', 'Exactly two; between two and five', "r'\\d{4}' matches a year"],
            ['^  $', 'Start and end of the text', "r'^\\d+$' means digits and nothing else"],
            ['\\b', 'A word boundary', "r'\\bcat\\b' does not match 'concatenate'"],
            ['|', 'This or that', "r'cat|dog'"],
            ['( )', 'A group: keep this piece, or repeat it as a unit', "r'(ab)+'"],
            ['\\.', 'A literal dot, escaped', "r'\\.csv$'"],
          ],
        },
        {
          kind: 'shell',
          caption: 'The same pieces, doing work.',
          lines: [
            'import re',
            "re.findall(r'\\d+', 'a1 bb22 ccc333')",
            "re.findall(r'[aeiou]', 'regular expressions')",
            "re.findall(r'\\w+', 'hello, world! 42')",
            "re.findall(r'\\b\\w{4}\\b', 'this is a test of four char words')",
            "re.findall(r'colou?r', 'color colour colouur')",
            "re.findall(r'a.c', 'abc a c axc ac')",
            "re.findall(r'\\bcat\\b', 'the cat in concatenate')",
            "re.findall(r'cat|dog', 'a dog, a cat, a catalogue')",
            "re.findall(r'[^,]+', 'ada,bob,cleo')",
          ],
        },
        {
          kind: 'prose',
          body: 'Two of those repay a second look. The word-boundary pattern refused the `cat` buried inside a longer word, which is the fix for the classic "why does my search for `cat` match `concatenate`" problem. And the alternation found the `cat` inside `catalogue`, because `|` on its own says nothing about boundaries — the two ideas combine, they do not replace each other.',
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
            takeaway: 'A pattern matches exactly the characters it describes, no more and no less — the picture is not an interpretation of the pattern, it is what `re` actually found. Adding `\\b` shrinks what counts as a match; adding `|` widens it; asking for a whole word matches only where the whole word appears.',
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'Write a pattern that matches an Australian-style student number: the letter `u` followed by exactly seven digits, and nothing else. Say what each piece is for, and what goes wrong if you leave off the anchors.',
          answer: '`r\'^u\\d{7}$\'`. The `^` fixes the match to the start, `u` is a literal, `\\d{7}` is exactly seven digits, and `$` fixes the end. Without the anchors the pattern matches a student number **inside** anything else: `search` would accept `xu12345678y`, because it is free to start matching wherever it likes and to stop as soon as it has seven digits — so a validator built from it would pass rubbish. The alternative to anchors is `re.fullmatch`, which requires the whole text to match and lets you write `r\'u\\d{7}\'` with no anchors at all. For validation, prefer `fullmatch`: forgetting an anchor is silent, and forgetting to call `fullmatch` is not.',
        },
      ],
    },
    {
      id: 'the-functions',
      title: '`search`, `match`, `fullmatch`, `findall`',
      blocks: [
        {
          kind: 'prose',
          body: 'Four functions, and the difference between them is *where* the pattern is allowed to match and *what you get back*. The name `match` is the trap: it does not mean "does this match", it means "does this match **at the start**".',
        },
        {
          kind: 'shell',
          caption: 'The same pattern, four ways.',
          lines: [
            'import re',
            "text = 'order 66 shipped'",
            "re.search(r'\\d+', text)",
            "re.match(r'\\d+', text)",
            "re.match(r'order', text)",
            "re.fullmatch(r'\\d+', '66')",
            "re.fullmatch(r'\\d+', '66 shipped')",
            "re.findall(r'\\d+', 'a1 b22 c333')",
            "bool(re.search(r'\\d', 'abc'))",
            "[m.span() for m in re.finditer(r'\\d+', 'a1 b22')]",
          ],
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
          kind: 'code',
          caption: 'What a match object carries, and the guard that belongs around it.',
          code: "import re\n\ndef year_in(text):\n    found = re.search(r'\\d{4}', text)\n    if found is None:\n        return 'no year found'\n    return found.group()\n\nprint(year_in('shipped on 2024-03-01'))\nprint(year_in('shipped yesterday'))\n\nfound = re.search(r'\\d{4}', 'shipped on 2024-03-01')\nprint(found.group(), found.start(), found.end(), found.span())\n\nmissing = re.search(r'\\d{4}', 'shipped yesterday')\nprint(missing)\nprint(missing.group())\n",
        },
        {
          kind: 'prose',
          body: 'The last line is the failure you will meet most often, raised here deliberately: `None` has no `.group`. The two-line guard above it is the entire fix, and it is why `re.search(...)` is so often written on its own line with a name.',
        },
      ],
    },
    {
      id: 'groups',
      title: 'Groups: keeping the pieces',
      blocks: [
        {
          kind: 'prose',
          body: 'Finding a date is half a job. Usually you want the year, the month and the day separately. Brackets around part of a pattern make it a **group**, and each group can be read back on its own.',
        },
        {
          kind: 'code',
          caption: 'Numbered groups, then the same pattern with names.',
          code: "import re\n\nfound = re.search(r'(\\d{4})-(\\d{2})-(\\d{2})', 'shipped on 2024-03-01 ok')\nprint(found.group(0))\nprint(found.group(1), found.group(2), found.group(3))\nprint(found.groups())\nyear, month, day = found.groups()\nprint(int(year) + 1, month, day)\n\nnamed = re.search(r'(?P<year>\\d{4})-(?P<month>\\d{2})-(?P<day>\\d{2})', 'shipped on 2024-03-01 ok')\nprint(named.group('year'), named.group('day'))\nprint(named.groupdict())\n",
        },
        {
          kind: 'prose',
          body: 'Group zero is always the whole match. The numbered groups count from the left, by their opening bracket — which is fine for two or three and becomes a liability at six, when inserting a bracket renumbers everything after it. The named form costs a few characters and never does that.\n\nGroups change what `findall` gives back, and this surprises everyone once.',
        },
        {
          kind: 'code',
          caption: 'The same search, with and without brackets.',
          code: "import re\n\ntext = 'ada@example.com and bob@school.edu'\n\nprint(re.findall(r'\\w+@\\w+\\.\\w+', text))\nprint(re.findall(r'(\\w+)@(\\w+)\\.\\w+', text))\nprint(re.findall(r'(\\w+)@\\w+\\.\\w+', text))\n\nfor found in re.finditer(r'(\\w+)@(\\w+)\\.\\w+', text):\n    print(found.group(0), '->', found.group(1), 'at', found.group(2), found.span())\n",
        },
        {
          kind: 'checkpoint',
          prompt: 'One of those `findall` calls returned tuples, one returned plain strings, and one returned only part of each match. State the rule that explains all three, and say which function you would use when you want both the whole match and its pieces.',
          answer: 'The rule: `findall` returns the whole match when the pattern has no groups, the single group when it has one, and a tuple of the groups when it has more than one — so adding brackets to a working pattern can silently change the type of what you get back. When you want the whole match *and* its pieces, use `finditer` and read `group(0)` alongside the numbered or named groups, as the loop above does. There is also a way to group without capturing, `(?:...)`, for when brackets are there to hold a repetition together rather than to keep a piece — it leaves `findall` behaving as it did before the brackets appeared.',
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
          kind: 'shell',
          caption: 'One pattern, three levels of appetite.',
          lines: [
            'import re',
            "tags = '<b>bold</b> and <i>italic</i>'",
            "re.findall(r'<.+>', tags)",
            "re.findall(r'<.+?>', tags)",
            "re.findall(r'<[^>]+>', tags)",
            `re.search(r'".*"', 'say "one" and "two"').group()`,
            `re.search(r'".*?"', 'say "one" and "two"').group()`,
          ],
        },
        {
          kind: 'prose',
          body: 'The greedy version ran from the first `<` all the way to the **last** `>`, swallowing everything in between, because `.` matches those characters happily and the pattern is satisfied by the furthest possible `>`. Adding `?` after `+` or `*` makes it lazy: take as little as possible.\n\nThe third form is the one professionals reach for. `[^>]+` cannot cross a `>` at all, so it stops for structural reasons rather than by asking politely. When you can express the limit as "not this character", it is clearer and faster than a lazy quantifier.',
        },
        {
          kind: 'code',
          caption: 'The same distinction on a line of data, where it decides whether your fields are right.',
          code: "import re\n\nline = 'name=Ada; unit=CITS1401; year=2024'\n\nprint(re.findall(r'=(.+);', line))\nprint(re.findall(r'=(.+?);', line))\nprint(re.findall(r'=([^;]+)', line))\nprint(dict(re.findall(r'(\\w+)=([^;]+)', line)))\n",
        },
        {
          kind: 'prose',
          body: 'Only the last two recover the actual fields. The first took everything up to the final semicolon; the second stopped at the first, which happens to be right here and would not be if a value could contain one.\n\nA general habit: prefer "everything that is not the separator" over "anything, lazily". It says what you mean.',
        },
      ],
    },
    {
      id: 'sub-and-split',
      title: 'Changing text, not just finding it',
      blocks: [
        {
          kind: 'prose',
          body: 'Two more functions cover most of the remaining work. `re.sub` replaces every match, and `re.split` cuts text wherever a pattern matches — which is `str.split` with a shape instead of an exact separator.',
        },
        {
          kind: 'shell',
          caption: 'Replacing and splitting.',
          lines: [
            'import re',
            "re.sub(r'\\s+', ' ', 'too   many     spaces')",
            "re.sub(r'\\d', '#', 'call 9876 now')",
            "re.sub(r'\\bcat\\b', 'dog', 'the cat in concatenate')",
            "re.split(r'[;,]\\s*', 'ada, bob;cleo , dan')",
            "'ada, bob;cleo , dan'.split(',')",
            "re.subn(r'o', '0', 'foo boo')",
            "re.sub(r'(\\w+)@(\\w+)', r'\\2 at \\1', 'ada@example')",
          ],
        },
        {
          kind: 'prose',
          body: 'Two things there are worth keeping. `\\1` and `\\2` inside the replacement text refer to the groups from the pattern, so a substitution can rearrange what it matched. And `re.subn` returns the new text together with how many replacements it made, which is often the thing you actually wanted to know.\n\nThe `re.split` line also shows the case where a regex genuinely beats `str.split`: more than one possible separator, with optional space around it.',
        },
      ],
    },
    {
      id: 'when-not-to',
      title: 'When a regex is the wrong tool',
      blocks: [
        {
          kind: 'prose',
          body: 'A regular expression is a small program written in a dense notation, inside a string, with no room for a comment. It is the right answer when the **shape** of the text is the problem. It is the wrong answer when you knew the exact characters all along.',
        },
        {
          kind: 'compare',
          caption: 'Does this filename end in `.csv`? Both versions look reasonable.',
          left: {
            label: 'A pattern with an unescaped dot',
            bad: true,
            code: "import re\n\nnames = ['marks.csv', 'notes.txt', 'dataXcsv', 'summary.csv.bak']\nfor n in names:\n    print(n, bool(re.search(r'.csv$', n)))\n",
          },
          right: {
            label: 'The string method',
            code: "names = ['marks.csv', 'notes.txt', 'dataXcsv', 'summary.csv.bak']\nfor n in names:\n    print(n, n.endswith('.csv'))\n",
          },
        },
        {
          kind: 'prose',
          body: 'The unescaped `.` matches any character, so a file with no dot at all was accepted. The pattern needed `r\'\\.csv$\'` — and `endswith` needed nothing, because the question was never about a shape.\n\nThat is the test to apply: if you can say the rule in terms of "starts with", "ends with", "contains", or "split on this exact character", the string method is shorter, faster, and impossible to get subtly wrong.',
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
            ['Split on several separators', "re.split(r'[;,]\\s*', text)", 'A chain of replaces'],
            ['Is this the shape of a date or an id?', 're.fullmatch', 'A pile of ifs over lengths and digits'],
            ['Pull three fields out of messy text', 're.search with named groups', 'Counting characters by hand'],
            ['Understand HTML, or truly validate an email', 'A real parser, or a service that sends a mail', 'A regex — genuinely, do not'],
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'A pattern nobody can read is a bug waiting',
          body: 'If a pattern grows past about thirty characters, write it in pieces with named groups, or do the job in two simple steps instead of one clever one. A `split` followed by a small `fullmatch` on each piece is nearly always easier to fix six months later than one pattern that does everything.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You must pull the marks out of lines like `CITS1401: 72, 65, 80`. One person writes a single pattern for the whole line; another splits on the colon, then splits on commas, then converts. Which would you defend in a code review, and what would change your mind?',
          answer: 'Defend the two-step split. Each step is readable on its own, the failure of any step points at exactly which part of the line was malformed, and converting with `int()` inside a `try` gives you a specific message about the bad field rather than a match that silently returns `None` for the whole line. What would change my mind is the text becoming irregular: marks written as `72%`, separators varying between commas and semicolons, an optional grade in brackets after each mark. Once the *shape* is the problem rather than the positions, a pattern with named groups earns its place — and even then I would keep the line-splitting outside it, so the pattern only has to describe one mark rather than a whole line.',
        },
      ],
    },
  ],
};

export default lesson;
