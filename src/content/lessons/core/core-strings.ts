// Core lesson for topic 05: strings. Positions, slices, immutability, methods, building and comparing.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-strings',
  title: 'Strings',
  summary: 'Positions, slices that stop one early, and why a string method never changes the string',
  track: 'core',
  topicId: 'strings',
  minutes: 22,
  prereqs: ['reading-an-error'],
  outcomes: [
    'Pick out one character or a run of characters by position',
    'Say how many characters a slice takes without counting them',
    'Explain why a string method has to have its result saved',
    'Build a new string one character at a time inside a loop',
    'Compare what somebody typed with what you expected, whatever case they used',
  ],
  sections: [
    {
      id: 'text-has-positions',
      title: 'Text has positions',
      blocks: [
        {
          kind: 'prose',
          body: 'Almost everything a program receives from the outside world arrives as text. A line read from a file, an answer typed at the keyboard, a unit code, a card number, a name on a booking form. Before you can do anything useful with it you have to be able to reach inside it, and that means talking about **positions**.\n\nA string is a sequence of characters, and each one has a number. The first character is at position 0, not 1. That single fact is behind more first-year errors than any other, so it is worth seeing rather than being told.',
        },
        {
          kind: 'shell',
          caption: 'A shell session. The lines beginning >>> are typed; what Python answers is underneath. The last line is a mistake made on purpose.',
          lines: [
            "plate = '1ABC234'",
            'plate[0]',
            'plate[3]',
            'plate[-1]',
            'len(plate)',
            'plate[6]',
            'plate[7]',
          ],
        },
        {
          kind: 'prose',
          body: 'Three things to take from that session. `plate[0]` came back as a **string** of one character, not as a number, even though the character is a digit. A negative position counts back from the end, so `-1` is the last character and you never have to work out what the last position is. And the largest position that works is one less than the length, which is why the last line failed while the line before it did not.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Counting from the end',
          body: 'Any time you find yourself writing `s[len(s) - 1]`, `s[-1]` says the same thing with less to go wrong.',
        },
      ],
    },
    {
      id: 'slicing',
      title: 'Taking a piece out',
      blocks: [
        {
          kind: 'prose',
          body: 'Reaching one character at a time is rarely enough. You want the year out of a unit code, the last four digits of a card, the surname out of a name. That is a **slice**: `s[start:stop]`.\n\nThe rule that catches everybody is that a slice starts at `start` and stops **before** `stop`. The character at the stop position is not included. Read the session below with that in mind and check it against what Python answers.',
        },
        {
          kind: 'shell',
          lines: [
            "word = 'FREMANTLE'",
            'word[0:4]',
            'len(word[0:4])',
            'word[4:9]',
            'word[0:4] + word[4:9]',
            'word[:4]',
            'word[4:]',
            'word[-3:]',
            'word[5:100]',
            'word[::-1]',
          ],
        },
        {
          kind: 'predict',
          ask: 'Predict what this prints, including how many characters come out the other end.',
          code: "word = 'FREMANTLE'\nprint(word[2:7])\nprint(len(word[2:7]))\n",
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Count without counting',
          body: 'The number of characters a slice takes is the stop minus the start — a subtraction you can do in your head, faster than counting letters on the screen.',
        },
        {
          kind: 'experiment',
          id: 't05-x1',
        },
        {
          kind: 'checkpoint',
          prompt: 'A card number is stored as a string of 16 digits. You want the middle four, at positions 6, 7, 8 and 9. Which slice, and how do you check it without counting?',
          answer: '`card[6:10]`. The check is the subtraction: 10 minus 6 is 4 characters, and the first of them is at position 6. Writing `card[6:9]` is the commonest version of this mistake, and it gives three characters rather than four.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'string-step-slice',
            title: 'The third number in a slice',
            intro: 'Drag the step and watch which letters light up. `word[::step]` visits every `step`-th position instead of a run of neighbours.',
            template: "word = 'FREMANTLE'\npiece = word[::⟦step⟧]\nprint(piece)\nprint(len(piece))\n",
            knobs: [
              { id: 'step', kind: 'range', label: 'step', min: -9, max: 9, start: 2 },
            ],
            probes: {
              letters: 'list(word)',
              picked: 'list(range(len(word)))[::⟦step⟧]',
            },
            visual: {
              kind: 'sequence',
              items: 'letters',
              picked: 'picked',
              caption: 'Each box is one letter, with its position underneath. The lit boxes are the ones this step keeps.',
            },
            notes: {
              '10': 'Every letter, in order. Leaving the step out entirely is the same as writing 1.',
              '8': 'The step is negative, so Python reads from the other end. This is what `word[::-1]` really is: not a special trick, just a step of -1.',
              '9': 'A step of zero means never move, and Python does not sit there waiting forever. It refuses on the spot: `ValueError: slice step cannot be zero`.',
              '18': 'The step is as big as the whole word, so only the very first letter is ever visited. The word does not need to divide evenly by the step for the slice to work; it just stops the moment it runs out of positions.',
            },
            takeaway: 'The step is not a third boundary like start and stop are. It says how many positions to jump between picks: 1 visits every letter, 2 visits every other one, and a negative step walks backwards from the end instead of forwards from the start. A step of 0 asks for a jump that goes nowhere, and Python refuses rather than loop forever.',
          },
        },
      ],
    },
    {
      id: 'cannot-be-changed',
      title: 'A string cannot be changed',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the fact that makes strings behave unlike anything else you have met: once a string exists, it can never be altered. Not by you, not by a method, not by anything.\n\nThat sounds like a restriction, and the consequence is the single most common piece of dead code in first-year Python. A method like `strip()` cannot clean up the string you gave it, because nothing can. What it does instead is hand you back a **new** string. If you do not save that new string, the work is thrown away and the program carries on with the old value as though nothing happened.',
        },
        {
          kind: 'code',
          caption: 'The first cleanup is discarded. The second is saved. Nothing else differs.',
          code: "suburb = '  nedlands '\nsuburb.strip()\nsuburb.capitalize()\nprint('[' + suburb + ']')\n\nsuburb = suburb.strip().capitalize()\nprint('[' + suburb + ']')\n",
        },
        {
          kind: 'prose',
          body: 'The square brackets are there so the spaces are visible. The first `print` shows a string that two method calls were supposed to have tidied, and it is untouched. No error was raised, which is what makes this so hard to spot: the program runs perfectly and gives the wrong answer.\n\nThe same fact rules out changing one character in place. Trying it does raise an error, and the error names the reason.',
        },
        {
          kind: 'compare',
          caption: 'Capitalising the first letter. One of these is not allowed at all.',
          left: {
            label: 'Changing a character in place',
            code: "name = 'perth'\nname[0] = 'P'\nprint(name)\n",
            bad: true,
          },
          right: {
            label: 'Building a new string',
            code: "name = 'perth'\nname = 'P' + name[1:]\nprint(name)\n",
          },
        },
        {
          kind: 'prose',
          body: 'The right-hand version never alters anything. It makes a brand new string out of a piece of the old one and puts the result back under the same name. That pattern, take a slice and glue something on, is how every change to a string is really done.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'The test to apply',
          body: 'Whenever you write a line that is nothing but a method call on a string, ask what happened to the result. If it went nowhere, the line does nothing.',
        },
      ],
    },
    {
      id: 'the-methods',
      title: 'The methods worth knowing',
      blocks: [
        {
          kind: 'prose',
          body: 'You do not need many. These are the ones that come up again and again, and every one of them returns something rather than changing the string it was called on.',
        },
        {
          kind: 'table',
          head: ['Method', 'What comes back', 'Worth remembering'],
          rows: [
            ['s.upper(), s.lower()', 'A new string in that case', 'Used for comparing, not for storing'],
            ['s.strip()', 'A new string with the ends trimmed', 'Ends only, never the middle'],
            ['s.replace(old, new)', 'A new string with every copy swapped', 'Every copy, not the first one'],
            ['s.find(sub)', 'The first position, or -1', 'The -1 is a real position, so check for it'],
            ['s.count(sub)', 'How many non-overlapping copies', 'A number, so no result to save'],
            ['s.split() or s.split(char)', 'A list of pieces', 'No argument means split on runs of spaces'],
            ['sep.join(pieces)', 'One string with sep between the pieces', 'Called on the separator, not on the list'],
            ['s.isdigit(), s.isalpha()', 'True or False', 'Needs the brackets, or you get the method itself'],
          ],
        },
        {
          kind: 'shell',
          caption: 'Each of these on a real label from a market stall.',
          lines: [
            "label = 'Fresh Mangoes  $4.50 a kilo'",
            "label.find('$')",
            "label.find('@')",
            "label.count('e')",
            'label.split()',
            "label.split('$')",
            "'-'.join(['CITS', '1401'])",
            "'4.50'.isdigit()",
            "'450'.isdigit()",
            "label.replace(' ', '')",
          ],
        },
        {
          kind: 'prose',
          body: 'Look hard at the two `find` lines. When the character is there you get a position; when it is not, you get a number that is also a perfectly valid position from the end. So `label[label.find(char):]` is never an error, and when the character is missing it hands you the tail of the string instead of telling you anything went wrong.\n\nNotice too how differently the two `split` lines behaved. With nothing in the brackets it broke on runs of whitespace and the double space caused no trouble. Given a particular character it broke only there, leaving the spaces sitting inside the pieces, which is why a `split` on a comma is usually followed by a `strip` on each piece.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You want the part of a label after the dollar sign, but some labels have no dollar sign at all. What has to happen before the slice?',
          answer: 'Check the result of `find` against -1 first, and decide what a label with no price should give. Something like `pos = label.find(char)`, then `if pos == -1:` handle the missing case, `else:` take `label[pos + 1:]`. Slicing straight from an unchecked `find` is the bug, because -1 slices from the end rather than failing.',
        },
      ],
    },
    {
      id: 'building-a-string',
      title: 'Building a string in a loop',
      blocks: [
        {
          kind: 'prose',
          body: 'Since nothing can be changed, a string that you assemble has to be assembled the way a running total is: start with an empty one before the loop, and on each pass replace it with itself plus a bit more.\n\nThe empty string `\'\'` is two quote marks with nothing between them. It is to text what 0 is to addition: the thing you start from.',
        },
        {
          kind: 'annotate',
          ask: 'Pulling the digits out of a seat label. Click any line to find out what it does.',
          code: "digits = ''\nfor ch in 'Gate 7, Row 12':\n    if ch.isdigit():\n        digits = digits + ch\nprint(digits)\nprint(digits + digits)\nprint(int(digits) + int(digits))\n",
          notes: {
            '1': 'Starts the string empty, exactly like a running total starts at 0. This is the value before anything has been added.',
            '2': 'Visits one character at a time from the sentence, including the spaces, the comma and the digits.',
            '3': 'Only characters that are digits pass this test; letters, spaces and the comma are skipped.',
            '4': 'Builds a new string: the digits collected so far, plus this one more character, replacing the old value under the same name.',
            '6': 'Two copies of the same text glued end to end — `+` here means join, not add, because both sides are still text.',
            '7': 'Converts each side to a number first, so this line really does add. Compare its answer with the line above.',
          },
        },
        {
          kind: 'prose',
          body: 'Two things break this pattern. Putting `digits = \'\'` **inside** the loop resets it on every pass, so only the last character survives. And adding a separator after each item leaves one on the end that should not be there.',
        },
        {
          kind: 'code',
          caption: 'Three ways to join words with spaces. Watch the closing bracket in each line.',
          code: "words = ['Kings', 'Park', 'Lookout']\n\nout = ''\nfor w in words:\n    out = out + w + ' '\nprint('[' + out + ']')\nprint('[' + out.strip() + ']')\nprint('[' + ' '.join(words) + ']')\n",
        },
        {
          kind: 'prose',
          body: 'The trailing space in the first line of output is invisible in ordinary output and will fail a test that compares strings exactly. Either strip it afterwards, or let `join` do the whole job, which is what it exists for.',
        },
        {
          kind: 'experiment',
          id: 't05-x3',
        },
        {
          kind: 'checkpoint',
          prompt: 'In that experiment, swapping `out = out + ch` for `out = ch + out` reversed the word. Why does the order matter here when it does not for `total = total + n`?',
          answer: 'Because joining text is not addition. Adding numbers gives the same answer either way round, but joining strings puts one in front of the other, so the order is the whole meaning. It is also the shortest way to reverse text by hand when you are not allowed to use a slice.',
        },
      ],
    },
    {
      id: 'comparing-text',
      title: 'Comparing what somebody typed',
      blocks: [
        {
          kind: 'prose',
          body: 'People type with capitals where you did not expect them and spaces you cannot see. Python compares text exactly, character for character, and it has no opinion about what the person meant. So a comparison that looks perfectly correct turns away answers that are right.\n\nThe fix is not to write a cleverer comparison. It is to clean both sides first, so that by the time they meet they are in the same shape.',
        },
        {
          kind: 'shell',
          lines: [
            "'Perth' == 'perth'",
            "'perth ' == 'perth'",
            "'Perth'.lower() == 'perth'",
            "'  Perth '.lower() == 'perth'",
            "'  Perth '.strip().lower() == 'perth'",
            "word = 'Madam'",
            'word == word[::-1]',
            'word.lower() == word.lower()[::-1]',
          ],
        },
        {
          kind: 'prose',
          body: 'Each method does its own job and no more, which the middle three lines show clearly: lowering the case does nothing about the spaces. `strip()` then `lower()` is the usual pair, and here the order does not matter because neither undoes the other.\n\nThe last two lines are a palindrome check, and they disagree for the same reason. A word read backwards has its capital in a different place, so the test has to be done on text that has already been flattened.',
        },
        {
          kind: 'experiment',
          id: 't05-x2',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In the paper',
          body: 'Short string questions usually hide one of these. A function that has to match a name, count a letter, or check a palindrome will be tested with mixed case and with stray spaces. Normalise once at the top of the function, then work with the clean value throughout.',
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'A whole one, worked',
      blocks: [
        {
          kind: 'prose',
          body: 'Everything above appears in one short function: clean the input, find a position, cut two slices around it, build a string in a loop, and tidy the end. Read the code first and try to say what each line is for before you open the steps.',
        },
        {
          kind: 'workedExample',
        },
        {
          kind: 'prose',
          body: 'The `+ 1` in `name[last_space + 1:]` is the whole reason the surname comes out without a space in front of it, and the `strip()` on the last line is there because the loop leaves a separator on the end. Those are the two details from this lesson that the function could not do without.',
        },
      ],
    },
    {
      id: 'traps',
      title: 'What goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'These are the mistakes that actually cost marks in this topic. Each one is shown as the code somebody wrote and the code that works.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'Start with the unit code and SmartRider scenarios, which are slicing and cleaning. The Kings Park hunt and the Reid Library catalogue are where the loops and the exam-style questions live.',
        },
      ],
    },
  ],
};

export default lesson;
