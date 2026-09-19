// Core: scope, defaults, helpers, and the main() contract the project is marked on.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-scope-and-main',
  title: 'Scope, helpers and main()',
  summary: 'Where a variable lives, what a function can change, and the contract a project is marked on',
  track: 'core',
  topicId: 'functions-project',
  minutes: 24,
  prereqs: ['core-exceptions'],
  outcomes: [
    'Say which names a function can see and which disappear when it ends',
    'Explain why assigning inside a function cannot change the caller\'s variable',
    'Tell the difference between reassigning a list and changing the list itself',
    'Use default parameters safely, including the shared-mutable-default trap',
    'Split a task into helpers called from main(), and follow the project rules',
  ],
  sections: [
    {
      id: 'two-worlds',
      title: 'Two worlds, one name',
      blocks: [
        {
          kind: 'prose',
          body: 'A function is meant to be a sealed box. You hand things in, it hands something back, and nothing else passes between it and the rest of the program. That seal is what lets you write a helper without reading the whole file first, and it is what **scope** means.\n\nEvery name created inside a function — its parameters included — is **local**. It is made when the call starts and destroyed when the call ends. Code outside has never heard of it.',
        },
        {
          kind: 'code',
          caption: 'The function works. The line after it does not, on purpose.',
          code: `fee = 3.2


def trip_cost(zones):
    cost = fee * zones
    return cost


print(trip_cost(2))
print(cost)
`,
        },
        {
          kind: 'prose',
          body: 'The call produced a value, and then the name `cost` was gone. Reading a global such as `fee` from inside a function is allowed and is how you would read a constant. Keeping a result, though, is the caller\'s job: store what `return` hands back.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'One name, two different variables',
          body: 'A local name and a global name can be spelled the same and still be unrelated. Inside the function, the local one is the only one that exists. This is a feature: it means a helper cannot break the rest of your program by accident.',
        },
      ],
    },
    {
      id: 'assigning-reaches-nothing',
      title: 'Assigning cannot reach outside',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is the rule that surprises people. Python decides which names are local **before the function runs**, by looking at the code. If a name is assigned anywhere in the function, it is local everywhere in that function — including on lines above the assignment.\n\nSo a function cannot change a caller\'s variable by assigning to it. It cannot even read the outer one once it has assigned to that name.',
        },
        {
          kind: 'code',
          caption: 'One assignment inside the function, and the name is local for the whole function.',
          code: `visitors = 0


def count_visitor():
    visitors = visitors + 1


count_visitor()
`,
        },
        {
          kind: 'prose',
          body: 'That error name is worth memorising, because it only ever means one thing: this name is local, and this line read it before anything had been put in it. Delete the assignment and the function would read the global happily; add the assignment and the global becomes invisible.\n\nThe shape that works is the one you have been using since functions began: **pass the value in, return the new value, store it where the call happens.**',
        },
        { kind: 'experiment', id: 't11-x1' },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Avoid `global`',
          body: 'Python has a `global` keyword that lets a function reassign a global name. Resist it. A function that depends on a global gives a different answer depending on what ran before it, so a tester that calls it on its own, or calls it twice, gets the wrong result. Take the running value as a parameter and return the new one.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A function ends with `print(total)` instead of `return total`, and the caller writes `answer = work_out(rows)`. What is in `answer`?',
          answer: '`None`. A function with no `return` hands back `None`, and printing puts a number on the screen without handing anything to the caller. The number looks right, which is what makes this so hard to spot — until the next line tries `round(answer, 4)` and raises a `TypeError`.',
        },
        { kind: 'mistakes', only: ['scope_confusion', 'global_state'] },
      ],
    },
    {
      id: 'lists-are-different',
      title: 'Lists are the exception',
      blocks: [
        {
          kind: 'prose',
          body: 'There is one case where a function really does change something the caller can see, and it is not a hole in the rule above — it is the same rule looked at from a different angle.\n\nWhen you pass a list to a function, the parameter and the caller\'s variable are two names for **one** list. Assigning to the parameter points that name somewhere else and leaves the original alone. Calling a method such as `append`, `sort` or `remove` changes the one list that both names refer to.',
        },
        {
          kind: 'compare',
          caption: 'Both functions look like they add a stop. Watch what `stops` holds afterwards.',
          left: {
            label: 'Building a new list',
            code: `def add_stop(items):
    items = items + ['Cottesloe']
    return items


stops = ['Perth', 'Claremont']
add_stop(stops)
print(stops)
`,
          },
          right: {
            label: 'Changing the list in place',
            code: `def add_stop(items):
    items.append('Cottesloe')
    return items


stops = ['Perth', 'Claremont']
add_stop(stops)
print(stops)
`,
          },
        },
        {
          kind: 'prose',
          body: 'Neither result is wrong; they answer different questions. What you must not do is guess which one you wrote.\n\nIn project code, prefer the left-hand style: do not change the lists or dictionaries you were given, build new ones and return them. A tester that calls your function twice with the same list expects the same answer both times, and a function that quietly edited its argument the first time will not give it.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'helper-changes-callers-list',
            title: 'Does the caller see it, or not',
            intro: 'One helper, one list of lap times. Change what the helper does to its parameter, and watch what the caller’s own variable holds afterwards.',
            template: "times = [31.2, 29.8, 30.5]\n\ndef tidy(values):\n    ⟦action⟧\n    return values\n\ntidy(times)\nprint(times)\n",
            knobs: [
              {
                id: 'action',
                label: 'inside the helper',
                choices: [
                  { value: 'values.sort()', caption: 'sort it in place' },
                  { value: "values.append(0.0)", caption: 'append a zero on the end' },
                  { value: 'values = sorted(values)', caption: 'point values at a new sorted list' },
                  { value: 'values = values + [0.0]', caption: 'build a new list with something added' },
                ],
              },
            ],
            probes: {
              after: 'times',
            },
            visual: {
              kind: 'bars',
              values: 'after',
              caption: 'The caller’s own list, `times`, read after the helper has returned.',
            },
            notes: {
              '0': '`sort()` rearranges the one list that `times` and `values` both name, so the caller sees it reordered even though `times` was never mentioned inside the helper.',
              '1': '`append()` adds directly to the shared list, so the caller’s list grows by an item it never asked to add itself, whether or not anything is done with what the helper returns.',
              '2': '`sorted()` builds a brand new list and points the local name `values` at it. `times` outside still points at the original three-item list, untouched.',
              '3': '`+` also builds a new list rather than changing the old one. `values` means something different from this line on, but `times` never moved.',
            },
            takeaway: 'Whether a helper can change what its caller sees depends entirely on what happens to the parameter, not on what the helper is named or what it returns. A method that changes the list in place — `append`, `sort`, `remove`, `insert` — is visible outside, because there is only one list with two names on it. Assigning the parameter to something new, sorted or rebuilt with `+`, only relabels the local name and leaves the caller’s list exactly as it was.',
          },
        },
      ],
    },
    {
      id: 'defaults',
      title: 'Default parameters, and the trap',
      blocks: [
        {
          kind: 'prose',
          body: 'A default lets a parameter be optional: give it a value on the `def` line and the caller can leave it out. It is how one function serves the common case and the unusual one without two copies of the code.',
        },
        {
          kind: 'code',
          caption: 'One function, called three ways: everything defaulted, one default replaced by position, and one named.',
          code: `def stall_takings(sales, fee=30, card_rate=0.0):
    return sum(sales) - fee - sum(sales) * card_rate


print(stall_takings([120, 85]))
print(stall_takings([120, 85], 25))
print(stall_takings([120, 85], card_rate=0.015))
`,
        },
        {
          kind: 'prose',
          body: 'The third call skipped `fee` and named `card_rate`, which is the point of a keyword argument: it lets you set a later parameter without repeating the ones before it. Two ordering rules follow, and both are `SyntaxError`s if you break them: on the `def` line, parameters with defaults come after those without; in a call, keyword arguments come after positional ones.\n\nNow the trap. **A default is worked out once, when the `def` line runs** — not on each call. For a number, a string, `True`, `False` or `None` that changes nothing, because none of those can be modified. For a list or a dictionary it means every call that leaves the argument out shares one object.',
        },
        {
          kind: 'compare',
          caption: 'Two playlists, built by two separate calls. They should have nothing to do with each other.',
          left: {
            label: 'Default is an empty list',
            bad: true,
            code: `def add_song(song, playlist=[]):
    playlist.append(song)
    return playlist


print(add_song('Down Under'))
print(add_song('Solid Rock'))
`,
          },
          right: {
            label: 'Default is None, list made inside',
            code: `def add_song(song, playlist=None):
    if playlist is None:
        playlist = []
    playlist.append(song)
    return playlist


print(add_song('Down Under'))
print(add_song('Solid Rock'))
`,
          },
        },
        {
          kind: 'prose',
          body: 'The second call on the left came back with a song nobody put there. The list on the `def` line was created once and has been accumulating ever since, and it will keep accumulating for as long as the program runs.\n\nThe cure is on the right and it is always the same: default to `None`, and build the real list on the first line inside the function.',
        },
        { kind: 'experiment', id: 't11-x2' },
        { kind: 'mistakes', only: ['mutable_default_arg'] },
      ],
    },
    {
      id: 'helpers-and-main',
      title: 'Helpers, called from main()',
      blocks: [
        {
          kind: 'prose',
          body: 'A project specification asks for one function, usually `main(csvfile)` or `main(csvfile, something)`. That does not mean writing one function. It means writing several and having `main` call them.\n\nThe reason is not tidiness. A 90-line `main` can only be tested by running the whole thing, so when the answer is wrong you have no idea which part is wrong. Four helpers of fifteen lines can each be called on their own with a value you chose, and the one that is broken announces itself in about a minute.',
        },
        {
          kind: 'steps',
          title: 'Building main from the outside in',
          items: [
            'Copy the `def main(...)` line out of the specification exactly, parameter names and all, and write its docstring saying what it returns.',
            'Guard the arguments first: `if not isinstance(csvfile, str): return None`. Every path out of `main` now returns either the shape the task asked for or the safe value.',
            'Write the body of `main` as calls to helpers that do not exist yet: read the rows, calculate, assemble the answer. Read it back as a sentence — it should say what the task said.',
            'Write each helper, smallest first, and test it on its own with a value you typed by hand before it ever sees a file.',
            'Round only in the line that builds the returned result, never inside a helper whose value is used again.',
          ],
        },
        {
          kind: 'prose',
          body: 'Each helper needs one job and one returned value. A helper that reads and validates rows returns rows. A helper that calculates a mean returns a mean, at full precision. `main` is the only place that knows what the final answer is shaped like.',
        },
        { kind: 'experiment', id: 't11-x3' },
        { kind: 'workedExample' },
      ],
    },
    {
      id: 'project-rules',
      title: 'The rules you are marked against',
      blocks: [
        {
          kind: 'prose',
          body: 'The project rules look like bureaucracy and are not. Each one exists because an automated tester calls your file, from a program, with no person watching — and every rule below describes a way that call can fail even though your logic is right.',
        },
        {
          kind: 'table',
          caption: 'The contract, and what breaks when it is ignored.',
          head: ['The rule', 'What happens if you ignore it'],
          rows: [
            ['`main` named and spelled exactly as the spec says', 'The tester cannot call anything: every test scores zero'],
            ['No `import` at all, not even `math` or `csv`', 'Marked down regardless of the answer; use `x ** 0.5` and `split`'],
            ['Never call `input()`', 'The tester supplies no input, so the program hangs or raises `EOFError`'],
            ['Return results, do not `print` them', 'The tester compares the returned value; a printed answer returns `None`'],
            ['Round only as values go into the returned result', 'Rounding error carries into later calculations and moves the 4th decimal'],
            ['Open the file name exactly as given', 'Adding or checking `.csv` fails on files the marker names differently'],
            ['Find columns by header name, ignoring case', 'A shuffled or extra column reads the wrong field, or raises'],
            ['Return the safe value on bad input instead of crashing', 'One crash ends that test and costs the marker time'],
          ],
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'The one print you are allowed',
          body: 'A short message while terminating gracefully — inside `except OSError:`, say — is permitted. It does not replace the `return`. The function still has to hand back the value the task names, because that is the only thing the tester looks at.',
        },
        {
          kind: 'prose',
          body: 'The rounding rule is the one that costs marks from people whose logic is perfect. Rounding is not tidying up: the digits you drop are gone, and anything you do to the value afterwards makes the gap bigger.',
        },
        {
          kind: 'code',
          caption: 'One share of a total, turned into a percentage two ways.',
          code: `count = 1
total = 3
share = count / total

print('rounded once, at the end:', round(share * 100, 4))
print('rounded on the way past:', round(round(share, 4) * 100, 4))
`,
        },
        {
          kind: 'prose',
          body: 'Both lines round to four decimal places, and they do not agree. Nothing in the second line rounds to fewer places than the first; the error came entirely from rounding a value that was then multiplied.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Why does a tester call `main` twice with the same arguments, and what would make the second answer differ from the first?',
          answer: 'To check that your function has no memory. The second answer differs if you kept state outside the function — a global that a `global` statement updates, a mutable default argument that accumulates, or a caller\'s list that a helper edited in place. All three are fixed the same way: pass what you need in, build new values, and return them.',
        },
        { kind: 'mistakes', only: ['print_in_main', 'round_mid_calc', 'csv_ext_assumed'] },
        {
          kind: 'practice',
          body: 'The questions for this topic are deliberately project-shaped. For each one, write the `def main(...)` line and its docstring before anything else, and only then start filling in helpers.',
        },
      ],
    },
  ],
};

export default lesson;
