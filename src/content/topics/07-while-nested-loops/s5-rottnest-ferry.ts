// Topic 07, scenario 5: while loops that shrink a queue (Rottnest ferry boarding).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't07-s5',
  title: 'Rottnest ferry boarding',
  story:
    'On a summer morning the ferry desk at B Shed in Fremantle has to move a queue of passengers across to Rottnest Island. ' +
    'Each ferry holds a fixed number of people, so the queue shrinks one ferry at a time until nobody is left waiting.',
  questions: [
    {
      id: 't07-s5-q1',
      format: 'twins',
      diff: 'medium',
      core: false,
      title: 'One ferry too many',
      prompt:
        'Both programs count the ferries needed for a queue of 300 passengers when each ferry holds 100. ' +
        'They differ by one character. Work out what each one prints, and say which one the ferry desk should use.',
      left: `waiting = 300
capacity = 100
trips = 0
while waiting > 0:
    waiting = waiting - capacity
    trips = trips + 1
print(trips, waiting)`,
      right: `waiting = 300
capacity = 100
trips = 0
while waiting >= 0:
    waiting = waiting - capacity
    trips = trips + 1
print(trips, waiting)`,
      mistake: 'off_by_one_range',
      concepts: ['while', 'loop-bound', 'accumulator', 'boundary'],
      detects: ['off_by_one_range', 'infinite_while'],
      expectedSec: 150,
      hints: [
        'Write down `waiting` after each pass for both programs. The two runs only come apart at one particular value of `waiting`.',
        'After three ferries `waiting` is 0. Ask each condition the same question at that moment: does the loop run again?',
        '`0 > 0` is False, but `0 >= 0` is True, so one program sends a fourth ferry to collect nobody.',
      ],
      solution: {
        explanation:
          'Both programs take 100 off `waiting` and add 1 to `trips` on every pass, and after three passes `waiting` is exactly 0.\n\n' +
          '- The left version asks `0 > 0`, which is False, so it stops and prints `3 0`. Three ferries carry 300 people, which is right.\n' +
          '- The right version asks `0 >= 0`, which is True, so it runs a fourth time and prints `4 -100`. The negative value of `waiting` is the giveaway: it says 100 seats were filled by people who do not exist.\n\n' +
          'The left version is the one to use. `> 0` means "there is still somebody waiting"; `>= 0` means "the queue is not in debt", which is not the same thing. ' +
          'Note that the difference only shows up when the queue divides exactly by the capacity: with 250 passengers both versions print `3 -50`, which is how this bug survives testing.',
      },
      selfExplain: 'Why do both versions agree on a queue of 250 passengers but disagree on 300?',
    },
    {
      id: 't07-s5-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'How many ferries?',
      prompt:
        'Fill in the blanks so `trips_needed(passengers, capacity)` returns the **number of ferries** needed to move `passengers` people ' +
        'when each ferry holds `capacity` people. `passengers` is 0 or more, `capacity` is 1 or more, and a part-full last ferry still counts.\n\n' +
        'For example `trips_needed(250, 100)` returns `3` and `trips_needed(0, 100)` returns `0`.',
      template: `def trips_needed(passengers, capacity):
    waiting = passengers
    trips = 0
    while waiting ⟦1⟧ 0:
        waiting = waiting ⟦2⟧ capacity
        trips = trips + 1
    return trips`,
      blanks: [
        { id: '1', accept: ['>'] },
        { id: '2', accept: ['-'] },
      ],
      fnName: 'trips_needed',
      tests: [
        { id: 'v1', call: 'trips_needed(250, 100)', expect: '3', label: 'a part-full last ferry', hidden: false },
        { id: 'v2', call: 'trips_needed(300, 100)', expect: '3', label: 'three full ferries', hidden: false, tag: 'off_by_one_range' },
        { id: 'h1', call: 'trips_needed(0, 100)', expect: '0', label: 'nobody waiting', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'trips_needed(1, 100)', expect: '1', label: 'one passenger still needs a ferry', hidden: true },
        { id: 'h3', call: 'trips_needed(100, 100)', expect: '1', label: 'exactly one full ferry', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'trips_needed(7, 2)', expect: '4', label: 'a small ferry', hidden: true },
      ],
      concepts: ['while', 'loop-bound', 'accumulator', 'loop-update'],
      detects: ['off_by_one_range', 'infinite_while'],
      expectedSec: 110,
      hints: [
        'The loop should keep going while somebody is still on the jetty, and each pass must take one ferry-load off the queue.',
        'Blank 1 is the test for "there is still at least one person waiting". Blank 2 must make `waiting` smaller by a whole ferry-load, or the loop never ends.',
        'Blank 1 is a single comparison sign. Blank 2 is the operator that turns `waiting` into `waiting` minus `capacity`.',
      ],
      solution: {
        code: `def trips_needed(passengers, capacity):
    waiting = passengers
    trips = 0
    while waiting > 0:
        waiting = waiting - capacity
        trips = trips + 1
    return trips`,
        explanation:
          '- `waiting = passengers` copies the queue size into a variable the loop is allowed to change, and `trips = 0` is the count before any ferry has left.\n' +
          '- `while waiting > 0:` keeps going only while somebody is still waiting. `>= 0` would send one extra empty ferry whenever the queue divides exactly by the capacity, and `!= 0` would never stop for 250 passengers, because `waiting` jumps straight from 50 to -50.\n' +
          '- `waiting = waiting - capacity` is the line that makes the condition eventually False. Without it the loop runs forever.\n' +
          '- `trips = trips + 1` counts the ferry that just left, including the part-full last one: 250 passengers leave 50 waiting after two ferries, so a third is still counted.\n' +
          '- With 0 passengers the condition is False at the start, the body never runs, and `trips` is still 0.',
      },
      selfExplain: 'Why does waiting go negative for 250 passengers, and why does that not matter?',
    },
    {
      id: 't07-s5-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Boarding whole groups',
      prompt:
        'Families and tour parties will not be split up. The queue is a list of ints: the size of each group, in queue order.\n\n' +
        'Write `boarding_plan(groups, capacity)` that returns a **list of ints**, the number of people on each ferry, in order.\n\n' +
        '- A ferry takes groups from the front of the queue, in order, for as long as the next group fits **completely** in the seats left. ' +
        'It leaves as soon as the next group would not fit.\n' +
        '- A group bigger than `capacity` can never travel: skip it and carry on with the rest of the queue. It never gets a ferry of its own.\n' +
        '- Return `[]` when nobody can travel and for an empty queue.\n\n' +
        'Use a `while` loop with an index into the queue. For example `boarding_plan([40, 30, 50, 20], 100)` returns `[70, 70]`: ' +
        'the first ferry takes 40 and 30 (50 would not fit), the second takes 50 and 20.',
      fnName: 'boarding_plan',
      starter: `def boarding_plan(groups, capacity):
    """Return the load of each ferry, taking whole groups from the front of the queue."""
    pass`,
      tests: [
        { id: 'v1', call: 'boarding_plan([40, 30, 50, 20], 100)', expect: '[70, 70]', label: 'example from the question', hidden: false },
        { id: 'v2', call: 'boarding_plan([60, 60, 60], 100)', expect: '[60, 60, 60]', label: 'no two groups fit together', hidden: false },
        { id: 'h1', call: 'boarding_plan([], 100)', expect: '[]', label: 'empty queue', hidden: true },
        { id: 'h2', call: 'boarding_plan([150, 20], 100)', expect: '[20]', label: 'a group too big to ever travel', hidden: true, tag: 'infinite_while' },
        { id: 'h3', call: 'boarding_plan([150], 100)', expect: '[]', label: 'nobody can travel', hidden: true, tag: 'infinite_while' },
        { id: 'h4', call: 'boarding_plan([100, 100], 100)', expect: '[100, 100]', label: 'groups that fill a ferry exactly', hidden: true, tag: 'off_by_one_range' },
        { id: 'h5', call: 'boarding_plan([10, 10, 10], 100)', expect: '[30]', label: 'the whole queue fits on one ferry', hidden: true },
        {
          id: 'h6', setup: 'queue = [45, 45, 45, 5]', call: 'boarding_plan(queue, 90)', expect: '[90, 50]', argsUnchanged: ['queue'],
          label: 'the queue list is not changed', hidden: true, tag: 'mutated_input',
        },
      ],
      concepts: ['while', 'nested-loop', 'index', 'accumulator', 'list'],
      detects: ['infinite_while', 'off_by_one_range', 'mutated_input', 'index_out_of_range', 'accumulator_init'],
      expectedSec: 660,
      hints: [
        'One index walks through the queue from start to finish. An outer loop starts a new ferry, an inner loop fills the ferry it started.',
        'Plan: `loads = []` and `i = 0` before everything. While `i` is still inside the queue: set `load` to 0, then while `i` is inside the queue **and** the next group still fits in `capacity - load`, add the group to `load` and move `i` on. After the inner loop, record the load if anybody boarded; if nobody did, the group at `i` is too big, so step past it.',
        'The inner header is `while i < len(groups) and load + groups[i] <= capacity:`. After it, `if load > 0:` appends the load, and the `else` branch does `i = i + 1` so the oversized group cannot trap the loop.',
      ],
      solution: {
        code: `def boarding_plan(groups, capacity):
    loads = []
    i = 0
    while i < len(groups):
        load = 0
        while i < len(groups) and load + groups[i] <= capacity:
            load = load + groups[i]
            i = i + 1
        if load > 0:
            loads.append(load)
        else:
            i = i + 1
    return loads`,
        explanation:
          '- `loads = []` and `i = 0` are set once, before both loops. `i` is the position of the first group still waiting, and it only ever moves forward, which is what makes the whole thing stop.\n' +
          '- `while i < len(groups):` starts a new ferry while somebody is still in the queue.\n' +
          '- `load = 0` is **inside** the outer loop, so each ferry starts empty. Setting it before the outer loop would add every group to one running total.\n' +
          '- `while i < len(groups) and load + groups[i] <= capacity:` fills the ferry. The index check comes first, so `groups[i]` is never read past the end of the list. `<=` lets a group fill the last seats exactly.\n' +
          '- `if load > 0:` records the ferry. If the inner loop took nobody, the group at `i` is bigger than the whole ferry, so the `else` steps past it. Without that `else`, the outer loop would start an empty ferry for the same group forever.\n' +
          '- The function only reads `groups`, so the caller\'s queue is unchanged, and an empty queue skips both loops and returns `[]`.\n\n' +
          'On `[45, 45, 45, 5]` with capacity 90: the first ferry takes 45 + 45 = 90 and stops because the third 45 would make 135; the second takes 45 + 5 = 50.',
      },
      selfExplain: 'Which line guarantees the outer loop cannot run forever when a group is bigger than the ferry?',
    },
    {
      id: 't07-s5-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 15,
      examSlot: 'combinations',
      diff: 'hard',
      core: true,
      title: 'Crews for a sailing (exam style)',
      prompt:
        '*Exam style, 15 marks. Write it by hand first, then submit once.*\n\n' +
        'Every sailing needs a crew of three: one skipper, one deckhand and one guide. The desk keeps three lists of first names. ' +
        'Some staff are trained for more than one job, so the same name can appear in more than one list, but nobody can hold two jobs on the same sailing.\n\n' +
        'Write `crew_options(skippers, deckhands, guides)` that returns a **list of strings**. Each string is one possible crew: the three names in the order ' +
        'skipper, deckhand, guide, separated by single spaces.\n\n' +
        '- Build the crews in loop order: skippers in the outer loop, then deckhands, then guides, each list in the order given.\n' +
        '- Leave out any crew in which one name would fill two of the three jobs.\n' +
        '- Return an empty list if no crew is possible, or if any of the three lists is empty.\n' +
        '- Return the list. Do not print anything.\n\n' +
        'Example:\n\n' +
        '```python\n' +
        "crew_options(['Ana', 'Dev'], ['Ben', 'Ana'], ['Cleo'])\n" +
        "# ['Ana Ben Cleo', 'Dev Ben Cleo', 'Dev Ana Cleo']\n" +
        '```\n\n' +
        '`Ana Ana Cleo` is missing because Ana cannot be both skipper and deckhand.',
      fnName: 'crew_options',
      starter: `def crew_options(skippers, deckhands, guides):
    pass`,
      tests: [
        {
          id: 'v1', call: "crew_options(['Ana', 'Dev'], ['Ben', 'Ana'], ['Cleo'])",
          expect: "['Ana Ben Cleo', 'Dev Ben Cleo', 'Dev Ana Cleo']",
          label: 'the example from the question', hidden: false,
        },
        {
          id: 'v2', call: "crew_options(['Sione', 'Ana'], ['Priya', 'Sione'], ['Marco', 'Ana'])",
          expect: "['Sione Priya Marco', 'Sione Priya Ana', 'Ana Priya Marco', 'Ana Sione Marco']",
          label: 'two names in the list of skippers', hidden: false, tag: 'accumulator_init',
        },
        {
          id: 'h1', call: "crew_options(['Ana'], ['Ben'], ['Cleo'])", expect: "['Ana Ben Cleo']",
          label: 'one name in each list', hidden: true,
        },
        {
          id: 'h2', call: "crew_options(['Ana', 'Ben'], ['Cleo'], [])", expect: '[]',
          label: 'no guides on shift', hidden: true, tag: 'return_type_wrong',
        },
        {
          id: 'h3', call: "crew_options([], ['Ben'], ['Cleo'])", expect: '[]',
          label: 'no skippers on shift', hidden: true,
        },
        {
          id: 'h4', call: "crew_options(['Ana'], ['Ana'], ['Ana'])", expect: '[]',
          label: 'only one person available, so no crew is possible', hidden: true, tag: 'off_by_one_range',
        },
        {
          id: 'h5', call: "crew_options(['Ana', 'Ben', 'Cleo'], ['Ana', 'Ben'], ['Ana', 'Cleo'])",
          expect: "['Ana Ben Cleo', 'Ben Ana Cleo', 'Cleo Ben Ana']",
          label: 'every list shares names with the others', hidden: true, tag: 'early_return_in_loop',
        },
      ],
      concepts: ['nested-loop', 'combinations', 'string-building', 'list', 'accumulator'],
      detects: ['accumulator_init', 'early_return_in_loop', 'return_type_wrong', 'print_vs_return', 'off_by_one_range'],
      expectedSec: 660,
      hints: [
        'One loop per list, one inside the other, and the check that nobody doubles up belongs in the innermost loop where all three names are known.',
        'Plan: make an empty result list before any loop. Loop over the skippers, inside that the deckhands, inside that the guides. With all three names in hand, check that no two of them are equal, and if so add the joined string. Return the list after all three loops.',
        'The check needs all three pairs: `if skipper != deckhand and skipper != guide and deckhand != guide:`. The string is `skipper + \' \' + deckhand + \' \' + guide`.',
      ],
      solution: {
        code: `def crew_options(skippers, deckhands, guides):
    crews = []
    for skipper in skippers:
        for deckhand in deckhands:
            for guide in guides:
                if skipper != deckhand and skipper != guide and deckhand != guide:
                    crews.append(skipper + ' ' + deckhand + ' ' + guide)
    return crews`,
        explanation:
          '- `crews = []` is set once, before the outer loop. Inside the skippers loop it would start again for every skipper, and only the last skipper\'s crews would survive.\n' +
          '- The three loops are nested in the order the spec gives, so the crews come out skippers first, then deckhands, then guides. That is why `Sione Priya Marco` comes before `Sione Priya Ana`.\n' +
          '- All three comparisons are needed. Checking only `skipper != deckhand` would let `Dev Ana Ana` through, and checking only the ends would let `Ana Ana Cleo` through.\n' +
          '- `crews.append(skipper + \' \' + deckhand + \' \' + guide)` builds one string with single spaces. `\' \'.join([skipper, deckhand, guide])` gives the same string.\n' +
          '- The append sits inside the `if` in the innermost loop, and `return crews` comes after all three loops. A `return` inside the loops would hand back only the first crew.\n' +
          '- An empty list anywhere means that loop runs zero times, so nothing is appended and `[]` comes back without a special case. The same happens when every combination doubles up, as with one name in all three lists.\n\n' +
          'Marking guide (15): result list set up once (2), three correctly nested loops in the right order (4), all three "not the same person" checks (4), the string joined with single spaces (2), return the list after the loops and print nothing (3).',
      },
      selfExplain: 'Why does an empty list of guides give [] without any if statement of its own?',
    },
  ],
};

export default scenario;
