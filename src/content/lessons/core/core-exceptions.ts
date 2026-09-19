// Core: what an exception is, and how to handle exactly the one you expect.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-exceptions',
  title: 'Exceptions and try / except',
  summary: 'Handle the one thing that can really go wrong, and let your own bugs stay visible',
  track: 'core',
  topicId: 'exceptions',
  minutes: 22,
  prereqs: ['reading-an-error', 'core-files-csv'],
  outcomes: [
    'Say what an exception is and read the message Python gives you',
    'Catch a specific exception with try / except and carry on',
    'Explain what a bare except hides, and why that is worse than a crash',
    'Choose between checking first with an if and catching afterwards',
    'Return the empty result a task asks for instead of crashing',
  ],
  sections: [
    {
      id: 'what-an-exception-is',
      title: 'What an exception is',
      blocks: [
        {
          kind: 'prose',
          body: 'A program is a chain of instructions, each one assuming the one before it worked. When an instruction cannot do what it was asked, Python has two choices: carry on with a made-up answer, or stop. It stops. It **raises an exception**, which means it abandons the current line, abandons the function that line was in, abandons the function that called it, and keeps going up until either somebody has said they will deal with it or the program ends.\n\nThat sounds dramatic, and it is the kindest thing it could do. A made-up answer would spread quietly through everything that followed.',
        },
        {
          kind: 'code',
          caption: 'Four passenger counts, one of which was never recorded. Read what Python reports.',
          code: `def to_number(text):
    return int(text)


def total(rows):
    running = 0
    for row in rows:
        running = running + to_number(row)
    return running


print(total(['212', '148', 'n/a', '356']))
`,
        },
        {
          kind: 'prose',
          body: 'Three pieces of information came out of that, and all three are useful.\n\nThe **type** is the first word: a name that says what kind of thing went wrong. The **message** after it explains the problem and, in this case, quotes the exact value that caused it. The **line** is where Python gave up — inside `to_number`, on the conversion itself, not on the line that called it.\n\nNotice what did not happen: `356` was never counted, and `total` never returned anything. Once an exception is raised, everything below it is abandoned.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What you see in Thonny',
          body: 'Run that program in Thonny and you get the same last line plus a **traceback**: one `File ... line ...` entry per call that was still waiting, oldest first. Here that would be the `print` line, then `total`, then `to_number`. The app shows you the final line and the line number, which is the part you read first anyway.',
        },
      ],
    },
    {
      id: 'reading-the-message',
      title: 'Reading the message',
      blocks: [
        {
          kind: 'steps',
          title: 'When your program stops',
          items: [
            'Read the **last** line. It is the type and the explanation, and it is almost always enough.',
            'Look at the value the message quotes. It usually names the exact piece of data that broke the program.',
            'Go to the line number given. That is where it happened, which may be inside a helper rather than where you were looking.',
            'If there is a traceback, read the `File` entries from the bottom up: the bottom one is where it raised, the ones above it are the calls that led there.',
            'Ask what the names on that line were holding. A wrong value nearly always arrived from a file, from `input()`, or from a function that returned `None`.',
          ],
        },
        {
          kind: 'prose',
          body: 'The type is the part worth learning, because it tells you which question to ask. Each line below fails on purpose, and the message is Python\'s own.',
        },
        {
          kind: 'shell',
          caption: 'Seven of the exceptions you will meet this semester, each raised deliberately.',
          lines: [
            "int('2.5')",
            'int(None)',
            "['Mon', 'Tue'][2]",
            "{'perth': 3}['broome']",
            '7 / 0',
            "open('no_such_file')",
            'totl',
          ],
        },
        {
          kind: 'table',
          caption: 'The same list as a question you can ask yourself.',
          head: ['Type', 'What Python is telling you', 'Where it usually comes from'],
          rows: [
            ['ValueError', 'Right kind of thing, wrong content', 'Converting a field out of a file'],
            ['TypeError', 'Wrong kind of thing altogether', 'A function that returned `None`, or text added to a number'],
            ['IndexError', 'There is no item at that position', 'A short row, or a blank line, after `split`'],
            ['KeyError', 'That key is not in the dictionary', 'Counting into a dictionary without starting the key first'],
            ['ZeroDivisionError', 'You divided by nothing', 'An average when every row was skipped'],
            ['FileNotFoundError', 'No file by that name', 'A file name the marker chose, not the one you tested with'],
            ['NameError', 'I have never been given that name', 'A typo, or using a name before it exists'],
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Your program stops with `TypeError: unsupported operand type(s) for +: \'int\' and \'NoneType\'`. What has almost certainly happened?',
          answer: 'A function you wrote has returned `None`, and you added the result to a number. A function returns `None` when it reaches the end without a `return`, or when it prints its answer instead of returning it. Look at whatever produced the value on the right of the `+`, and check that every path out of it returns something.',
        },
      ],
    },
    {
      id: 'try-except',
      title: 'Catching the one you expect',
      blocks: [
        {
          kind: 'prose',
          body: 'Sometimes a failure is not a bug. A sensor was down, a person left a cell empty, a file has not been created yet: the data is genuinely unusable, and your program is supposed to cope rather than stop.\n\nThat is what `try` is for. Put the line that might fail inside `try`, and say in the `except` which exception you are prepared for and what to do about it.',
        },
        {
          kind: 'code',
          caption: 'The same four counts, with the one unusable value handled.',
          code: `def total(rows):
    running = 0
    used = 0
    for row in rows:
        try:
            value = int(row)
        except ValueError:
            continue
        running = running + value
        used = used + 1
    return running, used


print(total(['212', '148', 'n/a', '356']))
`,
        },
        {
          kind: 'prose',
          body: 'Two rules are hiding in that shape, and both matter more than they look.\n\n**Keep the `try` small.** Only the conversion is inside it. Every extra line you put in a `try` is another place where a real bug in your code can be caught by accident and disguised as bad data.\n\n**Name the exception.** `except ValueError:` catches the failure the data can cause and nothing else. Anything else still stops the program, loudly, where you can see it.',
        },
        { kind: 'experiment', id: 't10-x1' },
        { kind: 'mistakes', only: ['type_error_other'] },
      ],
    },
    {
      id: 'bare-except',
      title: 'Why a bare except is worse',
      blocks: [
        {
          kind: 'prose',
          body: 'Writing `except:` with nothing after it catches **everything**. It looks like the safe option. It is the opposite, because the things it catches include all of your own mistakes: a misspelt name, a method you forgot to call, a variable you never set.\n\nThe symptom is not an error. The symptom is a total of 0, or an empty list, from a program that reported nothing at all — and no clue where to start looking.',
        },
        { kind: 'experiment', id: 't10-x3' },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Say why, not only what',
          body: 'A question that asks what is wrong with a bare `except:` wants the reason. "It also catches errors you did not intend, such as a `NameError` from a typo, so a bug is silently skipped instead of reported" scores where "it is bad style" does not.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You widen a handler from `except ValueError:` to `except (ValueError, TypeError):` because a test crashed with a `TypeError`. What should you check before you leave it there?',
          answer: 'Which real input causes each exception in the list. A `ValueError` from `float(\'N/A\')` is data you can name. A `TypeError` on the same line usually means a bug in your own code — a method called without brackets, or a value that arrived as `None` — and catching it turns your bug into a silently skipped row. Widen a handler only when you can say which input causes each error in it.',
        },
        { kind: 'mistakes', only: ['bare_except'] },
      ],
    },
    {
      id: 'where-the-try-goes',
      title: 'Where the try goes',
      blocks: [
        {
          kind: 'prose',
          body: 'A handler decides what happens next, and where you put it decides how much of your program survives. Wrapping a whole loop in one `try` means the first bad row ends the loop, and every row after it is lost. Wrapping the one line that can fail, inside the loop, means a bad row costs you that row and nothing else.',
        },
        {
          kind: 'compare',
          caption: 'The same readings, the same handler, in two places.',
          left: {
            label: '`try` around the whole loop',
            bad: true,
            code: `readings = ['3.2', '1.5', 'N/A', '4.0', '2.1']
values = []
try:
    for text in readings:
        values.append(float(text))
except ValueError:
    pass
print(values)
`,
          },
          right: {
            label: '`try` inside the loop',
            code: `readings = ['3.2', '1.5', 'N/A', '4.0', '2.1']
values = []
for text in readings:
    try:
        values.append(float(text))
    except ValueError:
        continue
print(values)
`,
          },
        },
        {
          kind: 'prose',
          body: 'Compare the two lists. The bad reading is third out of five, and the left-hand version threw away the two good readings that came after it without a word.\n\nThis is why a test file needs a bad row in the **middle**. A bad row at the end would give both versions the same answer.',
        },
        { kind: 'experiment', id: 't10-x2' },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Finish every handler deliberately',
          body: 'After an `except` block, the lines below it still run. So end the handler on purpose: `continue` to abandon this row, `return` to abandon the function, or give the variable a real value. Falling through on `pass` leaves the variable holding whatever the previous pass left in it, or nothing at all.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'handler-finishes-how',
            title: 'What the handler does next',
            intro: 'The same five values, the same ValueError, three different ways of finishing the handler. Watch how many bars there are, not just what is in them.',
            template:
              "values = ['42', '4.5', '', 'N/A', '007']\nkept = []\nlabels = []\nfor v in values:\n    try:\n        kept.append(int(v))\n        labels.append(repr(v))\n    except ValueError:\n        ⟦handle⟧\nprint(kept)\n",
            knobs: [
              {
                id: 'handle',
                label: 'when a value fails to convert',
                choices: [
                  { value: 'kept.append(0); labels.append(repr(v))', caption: 'count it as 0' },
                  { value: 'continue', caption: 'skip it entirely' },
                  { value: 'raise', caption: 'let it stop the program' },
                ],
              },
            ],
            probes: {
              values: 'kept',
              labels: 'labels',
            },
            visual: {
              kind: 'bars',
              values: 'values',
              labels: 'labels',
              caption: 'Each bar is a number that made it into `kept`.',
            },
            notes: {
              '0': "Every one of 4.5, the empty text and N/A becomes a 0, in the same spot it would have held if it had converted. The bars are five wide, because nothing was left out, only replaced.",
              '1': '`continue` removes the bad value instead of replacing it, so only the two real numbers, 42 and 7, ever reach `kept`. The bars are two wide, and neither one is a stand-in for something else.',
              '2': "`raise` sends the ValueError straight back out, on the very first bad value, 4.5. The loop stops there and the program stops with it: 007 is never even looked at, even though it was a perfectly good number. There is nothing to draw, because there is no output — the crash is the lesson.",
            },
            takeaway: 'An `except` block does not decide by itself what "handled" means; the line you write inside it does. Replacing a bad value keeps every position filled; skipping it shortens the result; `raise` hands the same exception on to whoever called this code, which is a deliberate choice, not a bug. Decide which one the task actually wants before you write the line.',
          },
        },
        { kind: 'mistakes', only: ['invalid_row_not_skipped'] },
      ],
    },
    {
      id: 'else-finally',
      title: 'else and finally',
      blocks: [
        {
          kind: 'prose',
          body: 'A `try` statement has two more parts you will see in lectures. `else` holds what should happen **only when nothing raised**, which keeps it out of the `try` where it might be caught by mistake. `finally` holds what must happen **either way**, such as closing something or recording that an attempt was made.',
        },
        {
          kind: 'code',
          caption: 'One function, called twice: once with a value that converts and once with a value that does not.',
          code: `def read_mark(text):
    try:
        mark = int(text)
    except ValueError:
        print('  could not use', repr(text))
        return None
    else:
        print('  converted', repr(text))
        return mark
    finally:
        print('  finished with', repr(text))


print('first call:')
print('result:', read_mark('72'))
print('second call:')
print('result:', read_mark('n/a'))
`,
        },
        {
          kind: 'prose',
          body: 'Read the order of those printed lines carefully, particularly where `finally` appears relative to the `return`. That is `finally` doing exactly what its name says: it runs on the way out, whichever way out was taken.\n\nIn practice `with open(...)` already does the cleanup job that `finally` was invented for, which is why most of your file code will not need it.',
        },
      ],
    },
    {
      id: 'graceful',
      title: 'Return an empty result, do not crash',
      blocks: [
        {
          kind: 'prose',
          body: 'In a marked project, a crash is not one lost mark. The tester calls your function, your function raises, and that test scores nothing — and the next one, and the one after that. A task will tell you what to hand back when it cannot answer: `None`, an empty list, an empty dictionary, a zero. Handing that back is called terminating gracefully, and it is worth more than any clever calculation.',
        },
        {
          kind: 'code',
          caption: 'A missing file, handled. The function returns rather than stopping.',
          code: `def load_lines(filename):
    try:
        with open(filename) as f:
            return f.readlines()
    except FileNotFoundError:
        return []


with open('present', 'w') as f:
    f.write('a\\nb\\n')

print(load_lines('present'))
print(load_lines('not_here'))
print('the program reached the end')
`,
        },
        {
          kind: 'prose',
          body: 'There is a decision under that, and it is worth making on purpose: **check first, or catch afterwards?**\n\nCatch when the only honest way to find out is to try: whether a piece of text is a number, whether a file exists. Check with an `if` when the question is cheap to ask: `if count == 0:` before a division, `if len(lines) == 0:` before reading `lines[0]`, `if \'rain\' not in header:` before `header.index(\'rain\')`. An `if` says what you expect; a `try` says what you are prepared to survive.',
        },
        { kind: 'workedExample' },
        {
          kind: 'checkpoint',
          prompt: 'Your function skips every unusable row and then returns `total / count`. The tester hands it a file where every row is unusable. What happens, and what should happen?',
          answer: 'Every row is skipped, so `count` is still 0 and the division raises `ZeroDivisionError` — outside the `try`, where nothing is catching it. The fix is an `if count == 0:` before the division, returning whatever the task names for "no valid data". Skipping bad rows quietly creates the possibility that you skipped all of them.',
        },
        { kind: 'mistakes', only: ['no_graceful_exit', 'print_in_main', 'zero_division'] },
        {
          kind: 'practice',
          body: 'Work through the questions for this topic with one habit in mind: for each one, write down what can really go wrong before you write any `try`. The list is usually shorter than you fear, and each item on it turns into one small handler.',
        },
      ],
    },
  ],
};

export default lesson;
