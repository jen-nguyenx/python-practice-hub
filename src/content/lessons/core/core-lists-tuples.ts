// Core lesson for topic 06: lists and tuples. Changing a list, sorting, keys and ties, aliasing, unpacking.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-lists-tuples',
  title: 'Lists and tuples',
  summary: 'Collections that change and collections that cannot, sorting with a rule, and the copy that is not a copy',
  track: 'core',
  topicId: 'lists-tuples',
  minutes: 24,
  prereqs: ['core-strings'],
  outcomes: [
    'Build up a list with append and take items back off it',
    'Choose between sort() and sorted() and say what each one gives back',
    'Sort by a rule of your own, including a tie-break',
    'Spot when two names refer to one list and know what to do about it',
    'Return several values from a function as a tuple and unpack them',
  ],
  sections: [
    {
      id: 'one-name-many-values',
      title: 'One name, many values',
      blocks: [
        {
          kind: 'prose',
          body: 'A variable holds one value. That is fine until you have thirty marks, or every stop on a train line, or a reading from every hour of the day. Naming them one at a time stops being possible almost immediately, and a loop cannot visit values that do not live together.\n\nA list is an ordered collection under a single name. It behaves like a string in the ways you already know: positions start at 0, negatives count from the end, slices stop one early, `len` gives the size and `in` asks whether something is present. The difference is the one that matters most in this topic, and it is at the end of the session below.',
        },
        {
          kind: 'shell',
          caption: 'The last line is a mistake made on purpose.',
          lines: [
            "stops = ['Perth', 'Leederville', 'Glendalough']",
            'stops[0]',
            'stops[-1]',
            'len(stops)',
            'stops[1:3]',
            "'Perth' in stops",
            "stops[1] = 'City West'",
            'stops',
            'stops[3]',
          ],
        },
        {
          kind: 'prose',
          body: 'The line that assigns to `stops[1]` is the whole difference between a list and a string. A string refuses that and raises an error; a list accepts it and the change is there on the next line. A list can be altered in place. Everything else in this lesson follows from that.',
        },
        {
          kind: 'prose',
          body: 'A slice of a list works exactly like a slice of a string, and the positions can be counted from either end. Drag both ends below and watch which items a slice actually takes.',
        },
        {
          kind: 'experiment',
          id: 't06-x1',
        },
      ],
    },
    {
      id: 'growing-and-shrinking',
      title: 'Growing and shrinking',
      blocks: [
        {
          kind: 'prose',
          body: 'Most lists in real programs are not written out in full. They start empty and are filled by a loop, one item at a time, exactly the way a total starts at 0 or a string starts empty.\n\n`append` puts one item on the end. `pop` takes one off and, unusually, hands it to you. The session below is worth reading slowly, because what each line *answers* is the point.',
        },
        {
          kind: 'shell',
          lines: [
            "queue = ['Ava', 'Kai']",
            "queue.append('Noor')",
            'queue',
            'queue.pop()',
            'queue',
            'queue.pop(0)',
            'queue',
            'len(queue)',
          ],
        },
        {
          kind: 'prose',
          body: 'The `append` line answered with nothing at all, while `pop` answered with the item it removed. That is not a quirk of the display. A method that changes the list hands back nothing useful, because the change *is* the result. `pop` is the exception: it removes an item and gives it to you, which is what makes it useful for taking the next person off the front of a queue.\n\n`insert`, `remove`, `reverse` and `sort` are all in the first group. None of their results is worth saving, and the next section is about what happens when somebody saves one anyway.',
        },
        {
          kind: 'code',
          caption: 'Filling an empty list from a loop, the pattern almost every list question needs.',
          code: "readings = [4, 0, 7, 0, 2]\nwet = []\nfor r in readings:\n    if r > 0:\n        wet.append(r)\nprint(wet)\nprint(len(wet))\nprint(sum(wet))\n",
        },
      ],
    },
    {
      id: 'sort-or-sorted',
      title: 'sort() or sorted()',
      blocks: [
        {
          kind: 'prose',
          body: 'Python gives you two ways to put a list in order, and they differ in what comes **back** rather than in how they order things. Mixing them up produces one of the strangest-looking errors a beginner meets, so here it is first.',
        },
        {
          kind: 'code',
          caption: 'This raises an error on purpose. Read the type and the word it uses.',
          code: 'times = [31.2, 29.8, 30.5]\ntimes = times.sort()\nprint(times[0])\n',
        },
        {
          kind: 'prose',
          body: 'The error is about `None`, which is Python\'s word for no value at all. The sort itself worked perfectly. The problem is the assignment: `times.sort()` reordered the list and handed back nothing, and that nothing was then stored under the name `times`, throwing the list away. The crash arrives one line later, at the first attempt to use it.\n\nSo the rule is about the two lines, not about sorting. Watch both versions side by side.',
        },
        {
          kind: 'shell',
          lines: [
            'times = [31.2, 29.8, 30.5]',
            'sorted(times)',
            'times',
            'print(times.sort())',
            'times',
            'sorted(times, reverse=True)',
            'times',
          ],
        },
        {
          kind: 'prose',
          body: '`sorted(times)` answered with a new list and left `times` exactly as it was, which the line after it shows. `times.sort()` printed `None` when asked what it returns, and the line after that shows the list itself has been reordered.\n\nTwo ways to remember which you want. If you need the original order later, or the list was handed to you by somebody else, use `sorted()`. If the list is your own and you are finished with the old order, `sort()` on a line of its own is shorter.',
        },
        {
          kind: 'experiment',
          id: 't06-x2',
        },
        {
          kind: 'checkpoint',
          prompt: 'A function is given a list of marks and has to return the three highest. Why is `marks.sort(reverse=True)` inside that function a problem even though it produces the right three?',
          answer: 'Because the list inside the function is the caller\'s own list, not a copy, so sorting it reorders their data as a side effect. They asked a question and their list came back rearranged. `ordered = sorted(marks, reverse=True)` answers the question and leaves the input alone. Hidden tests check the input afterwards.',
        },
      ],
    },
    {
      id: 'sorting-by-a-rule',
      title: 'Sorting by your own rule',
      blocks: [
        {
          kind: 'prose',
          body: 'Sorting numbers or names needs no help. Real data is usually a list of pairs, and then you have to say which part to order by. That is what `key` is for: a function that takes one item and returns the value to sort it by.\n\nPass the function by name, with no brackets after it. Python calls it once per item.',
        },
        {
          kind: 'code',
          caption: 'Rainfall by suburb, wettest first. Two suburbs are tied.',
          code: "rain = [('Subiaco', 12), ('Armadale', 30), ('Joondalup', 12)]\n\ndef millimetres(entry):\n    return entry[1]\n\nprint(sorted(rain, key=millimetres))\nprint(sorted(rain, key=millimetres, reverse=True))\nprint(sorted(rain, key=lambda entry: entry[1], reverse=True))\n",
        },
        {
          kind: 'prose',
          body: 'The last two lines do the same job; `lambda` is a way of writing a one-line function where it is used instead of naming it above. Either is accepted.\n\nNow look at the two tied suburbs in that output. Their order is whatever order they were in when they arrived, which is not a rule at all, and a marker\'s hidden test will have them the other way round. When a task says "wettest first, then alphabetically", the second rule belongs inside the key.',
        },
        {
          kind: 'prose',
          body: 'A key that returns a **tuple** is compared part by part: first parts first, and second parts only where the first parts are equal. That is exactly a tie-break. The only difficulty is that one part wants to go high to low and the other low to high, and `reverse=True` reverses everything at once.',
        },
        {
          kind: 'compare',
          caption: 'Same tie-break, two ways. Look at where Joondalup and Subiaco end up.',
          left: {
            label: 'reverse=True on a tuple key',
            code: "rain = [('Subiaco', 12), ('Armadale', 30), ('Joondalup', 12)]\nprint(sorted(rain, key=lambda e: (e[1], e[0]), reverse=True))\n",
            bad: true,
          },
          right: {
            label: 'A minus sign on the number',
            code: "rain = [('Subiaco', 12), ('Armadale', 30), ('Joondalup', 12)]\nprint(sorted(rain, key=lambda e: (-e[1], e[0])))\n",
          },
        },
        {
          kind: 'prose',
          body: 'Both put the wettest suburb first. Only one of them has the tied names in alphabetical order, because `reverse=True` flipped the names as well as the numbers. Negating the number turns it upside down on its own and leaves the text alone, and it is the standard way of writing "biggest first, then A to Z". It works only on numbers, which is why the minus sign never appears on the name.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'stall-sort-key',
            title: 'What the key decides',
            intro: 'Same four stalls, three different keys. Watch which one moves to the front, and which two stay next to each other for the wrong reason.',
            template: "sales = [('Bread', 40), ('Fruit', 65), ('Coffee', 40), ('Flowers', 20)]\nordered = sorted(sales, key=⟦key⟧)\nprint(ordered)\n",
            knobs: [
              {
                id: 'key',
                label: 'sort by',
                choices: [
                  { value: 'lambda e: e[0]', caption: 'name, A to Z' },
                  { value: 'lambda e: e[1]', caption: 'sales, lowest first' },
                  { value: 'lambda e: (-e[1], e[0])', caption: 'sales, highest first, ties by name' },
                ],
              },
            ],
            probes: {
              values: '[amount for _, amount in ordered]',
              labels: '[name for name, _ in ordered]',
            },
            visual: {
              kind: 'bars',
              values: 'values',
              labels: 'labels',
              caption: 'One bar per stall, in the order this key puts them. Watch Bread and Coffee, tied on 40.',
            },
            notes: {
              '0': 'Alphabetical order ignores the numbers entirely. Bread comes first because B comes before C, F and F, not because it sold the least.',
              '1': 'Lowest sales first puts Flowers at the front. Bread and Coffee are tied on 40, so they land next to each other in whichever order they happened to start in — that is not a rule, it is luck.',
              '2': 'Highest sales first, and the tie between Bread and Coffee is finally broken by name. The minus sign flips only the number; the name still sorts the ordinary way round it.',
            },
            takeaway: 'The key decides the whole order, and a key that is just a number leaves every tie exactly where it happened to start. Writing the key as a tuple, `(-e[1], e[0])`, sorts by the number first and settles a tie with the name, without needing `reverse=True` to touch either part.',
          },
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In the paper',
          body: 'Any question that asks for a ranking has a tie in the test data. Read the specification for the second rule, put it in the key, and write the key as a tuple rather than sorting twice.',
        },
      ],
    },
    {
      id: 'two-names-one-list',
      title: 'Two names, one list',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the part of the topic that feels like a trick until it does not. Assigning a list to a second name does not make a second list. It gives the same list another label, and a change made through either label is visible through both.\n\nIt matters because the natural-looking way to keep a backup before changing something is the one thing that does not work.',
        },
        {
          kind: 'code',
          caption: 'Three names, but not three lists.',
          code: "booked = ['A1', 'A2']\nsaved = booked\ncopy = booked[:]\nbooked.append('A3')\nprint('booked', booked)\nprint('saved ', saved)\nprint('copy  ', copy)\n",
        },
        {
          kind: 'prose',
          body: '`saved` was never a backup. `copy` is a real one, because slicing builds a new list rather than naming an old one. `list(booked)` does the same thing and reads more clearly.\n\nThe same catch reaches inside functions, and there it is easier to miss, because the list has a different name in there and looks like it belongs to the function.',
        },
        {
          kind: 'code',
          caption: 'The function was asked a question. Look at what it did to the caller.',
          code: 'def top_three(marks):\n    marks.sort(reverse=True)\n    return marks[:3]\n\nresults = [55, 91, 72, 68]\nprint(top_three(results))\nprint(results)\n',
        },
        {
          kind: 'prose',
          body: 'The answer is right and the caller\'s list has been rearranged anyway. Nothing warned about it. Inside a function, prefer `sorted(...)` and build new lists rather than changing what you were handed, unless the task asks you to change it.',
        },
        {
          kind: 'experiment',
          id: 't06-x3',
        },
        {
          kind: 'checkpoint',
          prompt: 'Why does `nums = nums + [x]` inside a function leave the caller\'s list alone, while `nums.append(x)` does not?',
          answer: '`nums + [x]` builds a brand new list and the name `nums` inside the function is pointed at it. The caller\'s list is untouched and their name still points at the original. `append` reaches into the list that both names share and changes it. The give-away is that one of them makes something new and the other does not.',
        },
      ],
    },
    {
      id: 'tuples',
      title: 'Tuples, and returning more than one thing',
      blocks: [
        {
          kind: 'prose',
          body: 'A tuple is an ordered collection that cannot be altered. Round brackets instead of square ones. Everything you can *read* from a list you can read from a tuple; everything that would change it is refused.\n\nThat sounds like a downgrade. It is useful for two reasons. It says in the code that this group of values belongs together and is not going to grow, such as a `(suburb, rainfall)` pair. And it is the natural way to hand back several values from a function at once.',
        },
        {
          kind: 'shell',
          caption: 'The last line is refused on purpose.',
          lines: [
            "ferry = ('Rottnest', 90)",
            'ferry[0]',
            'len(ferry)',
            'place, minutes = ferry',
            'minutes',
            'single = (5,)',
            'len(single)',
            'not_a_tuple = (5)',
            'type(not_a_tuple)',
            'ferry[1] = 45',
          ],
        },
        {
          kind: 'prose',
          body: 'Two details from that session. `place, minutes = ferry` is **unpacking**: one name per item, in order, and it saves a great deal of `ferry[0]` and `ferry[1]` further down. And a one-item tuple needs the comma, which the `type` line makes plain: brackets on their own are only brackets.\n\nUnpacking also works in a `for` header, which is how you loop over a list of pairs without indexes.',
        },
        {
          kind: 'code',
          caption: 'Unpacking in the loop header, and a function returning two values.',
          code: "trips = [('Fremantle', 25), ('Midland', 40), ('Joondalup', 28)]\nfor place, minutes in trips:\n    if minutes <= 30:\n        print(place, 'is close')\n\ndef first_and_last(names):\n    if len(names) == 0:\n        return None\n    return (names[0], names[-1])\n\nprint(first_and_last(['Ava', 'Kai', 'Noor']))\nfirst, last = first_and_last(['Ava', 'Kai', 'Noor'])\nprint(first)\nprint(last)\nprint(first_and_last([]))\n",
        },
        {
          kind: 'prose',
          body: 'The empty-list check has to come first, because `names[0]` on an empty list raises an error rather than returning anything. That check is the first thing to write in any function that reads a particular position, and it is the edge case most often left out.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'In the paper',
          body: 'When a specification says "return a tuple", a list with the same values inside it is marked wrong, and it prints almost identically so nothing looks amiss. Check the brackets in your return statement against the wording of the question.',
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'A whole one, worked',
      blocks: [
        {
          kind: 'prose',
          body: 'One function that uses the lot: filter into a new list, sort with a tie-break in the key, unpack each pair in the loop header, and leave the caller\'s data alone. Read the code before the steps.',
        },
        {
          kind: 'workedExample',
        },
        {
          kind: 'prose',
          body: 'The last line of that program is not decoration. Printing an item of the original list afterwards is how you prove the function did not rearrange it, and it is worth doing to your own answers before you submit them.',
        },
      ],
    },
    {
      id: 'traps',
      title: 'What goes wrong',
      blocks: [
        {
          kind: 'prose',
          body: 'Six mistakes cover nearly every lost mark in this topic. Four of them produce no error at all, which is what makes them expensive.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'The swim squad and UWA results scenarios drill sort() against sorted(); the Scorchers stats desk and the Rottnest ferry office are where tie-breaks and exam-style questions live.',
        },
      ],
    },
  ],
};

export default lesson;
