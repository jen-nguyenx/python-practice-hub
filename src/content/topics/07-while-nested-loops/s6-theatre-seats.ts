// Topic 07, scenario 6: searching a seat map with nested loops, break and an index (His Majesty's Theatre).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't07-s6',
  title: 'His Majesty\'s Theatre seat map',
  story:
    'The box office at His Majesty\'s Theatre in Perth keeps the stalls as a list of rows, and each row is a list of seats: ' +
    '`0` is free and `1` is sold. Every search here puts one loop inside another and stops as soon as it has what it needs.',
  questions: [
    {
      id: 't07-s6-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Where does break stop?',
      prompt:
        'Before it opens a new row, the box office counts how many rows still have at least one free seat.\n\n' +
        'What does this program print?',
      code: `rows = [[1, 0, 1], [0, 0, 0], [1, 1, 1]]
rows_with_space = 0
for row in rows:
    for seat in row:
        if seat == 0:
            rows_with_space = rows_with_space + 1
            break
print(rows_with_space)`,
      options: [
        {
          id: 'a',
          text: '1',
          mistake: 'early_return_in_loop',
          why:
            '1 is what you would get if `break` left both loops. It ends only the loop it is written inside, which is the inner one, ' +
            'so the outer loop still moves on to row 2 and row 3.',
        },
        {
          id: 'b',
          text: '2',
          correct: true,
          why:
            'Rows 1 and 2 each add 1 and then leave the inner loop straight away. Row 3 is `[1, 1, 1]`, so the `if` never runs for it and nothing is added.',
        },
        {
          id: 'c',
          text: '3',
          why:
            '3 is the number of rows. The count only goes up inside `if seat == 0:`, and row 3 has no free seat, so a row with nothing free adds nothing.',
        },
        {
          id: 'd',
          text: '4',
          why:
            '4 is the number of free seats in the whole map: one in row 1 and three in row 2. That would be the answer with no `break`, ' +
            'because the inner loop would carry on and count every free seat in the row.',
        },
      ],
      concepts: ['nested-loop', 'break', 'counting', 'for-each'],
      detects: ['early_return_in_loop'],
      expectedSec: 90,
      hints: [
        'One question decides this: does `break` end the whole search, or only the loop it is written inside?',
        'Go row by row. For each row, work out how many times `rows_with_space` can go up before the inner loop is left, and whether the outer loop keeps going afterwards.',
        'Row 1 has one free seat, row 2 has three and row 3 has none. `break` runs as soon as the first free seat in a row is found, so a row can add at most 1.',
      ],
      solution: {
        explanation:
          'The outer loop takes one row at a time; the inner loop walks the seats of that row.\n\n' +
          '1. Row `[1, 0, 1]`: seat 1 is sold, seat 0 is free, so the count becomes 1 and `break` leaves the inner loop. Seat 3 is never looked at.\n' +
          '2. Row `[0, 0, 0]`: the very first seat is free, so the count becomes 2 and the inner loop is left again. The other two free seats are never counted.\n' +
          '3. Row `[1, 1, 1]`: every seat is sold, the `if` is never True, and the inner loop simply runs out.\n\n' +
          'The program prints `2`.\n\n' +
          '`break` only ever leaves the innermost loop it sits in, which is exactly what makes this pattern useful: ' +
          '"stop searching this row, then carry on with the next row". To leave the outer loop as well, a `while` loop would need a flag variable, ' +
          'or the search would be written as a function that uses `return`.',
      },
      selfExplain: 'How would you change the program so it counted every free seat instead of every row with a free seat?',
    },
    {
      id: 't07-s6-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'The seat next door',
      prompt:
        'This program counts how many places in one row have two free seats side by side. It prints one line, then crashes. ' +
        'Click the line that raised the error, pick the exception, then pick the cause and the fix.',
      code: `row = [0, 1, 0, 0, 0]
print('seats in this row:', len(row))
pairs = 0
s = 0
while s < len(row):
    if row[s] == 0 and row[s + 1] == 0:
        pairs = pairs + 1
    s = s + 1
print(pairs)`,
      exceptionOptions: ['IndexError', 'KeyError', 'TypeError', 'ValueError'],
      causes: [
        {
          id: 'a',
          text:
            'The loop lets `s` reach 4, the last position, but the body also reads `row[s + 1]`, which is position 5. ' +
            'A body that looks at the **next** item has to stop one place early. Fix: `while s < len(row) - 1:`',
          correct: true,
        },
        {
          id: 'b',
          text:
            'A list of 5 seats has positions 1 to 5, so `s` starts one too low and the last seat is never checked. ' +
            'Fix: start with `s = 1` and loop `while s <= len(row):`',
          mistake: 'off_by_one_range',
        },
        {
          id: 'c',
          text:
            '`and` always works out both sides, so `row[s + 1]` is read even when `row[s]` is 1. ' +
            'Fix: split the condition into two nested `if` statements so the second seat is only read when the first one is free',
          mistake: 'index_out_of_range',
        },
      ],
      concepts: ['while', 'index', 'bounds', 'nested-loop'],
      detects: ['index_out_of_range', 'off_by_one_range'],
      expectedSec: 180,
      hints: [
        'Python stopped on the line that reads two seats at once. Only one of those two reads can go past the end of the list.',
        'The row has 5 seats, at positions 0 to 4. Write down the largest value `s` can have when the body runs, then work out `s + 1` for that pass.',
        'On the last pass `s` is 4, so `row[s + 1]` is `row[5]`, and there is no seat 5. A loop whose body looks at the next seat has to stop one seat earlier than usual.',
      ],
      solution: {
        explanation:
          'Line 2 prints `seats in this row: 5`, so the list has positions 0, 1, 2, 3 and 4.\n\n' +
          'The loop runs while `s < 5`, so `s` takes 0, 1, 2, 3 and 4:\n\n' +
          '1. `s = 0`: `row[0]` is 0 but `row[1]` is 1, so no pair.\n' +
          '2. `s = 1`: `row[1]` is 1. `and` stops at the first False part, so `row[2]` is never read.\n' +
          '3. `s = 2`: `row[2]` and `row[3]` are both 0, so `pairs` becomes 1.\n' +
          '4. `s = 3`: `row[3]` and `row[4]` are both 0, so `pairs` becomes 2.\n' +
          '5. `s = 4`: `row[4]` is 0, so Python goes on to read `row[5]` and raises `IndexError: list index out of range` on line 6.\n\n' +
          'The last `print` never runs.\n\n' +
          'The fix is the loop bound: `while s < len(row) - 1:` stops after `s = 3`, so `row[s + 1]` is never past the end, and the program prints `2`. ' +
          'Cause b has it backwards: positions start at 0, and starting at 1 would miss the pair at the front. ' +
          'Cause c is wrong about `and` (it does skip the right-hand side, which is why pass 2 survived), and nested `if` statements would not help here anyway, ' +
          'because `row[4]` is free on the pass that crashes.',
      },
      selfExplain: 'Which passes would a body that reads row[s - 1] have trouble with, and what bound would fix that?',
    },
    {
      id: 't07-s6-q3',
      format: 'parsons',
      diff: 'hard',
      core: true,
      title: 'The first two seats together',
      prompt:
        'Two friends want seats side by side. `rows` is a list of rows, and each row is a list of seats where `0` is free and `1` is sold.\n\n' +
        'Build `find_pair(rows)`, which returns a **tuple** `(row_index, seat_index)` for the first row, top to bottom, that has two free seats next to each other. ' +
        '`seat_index` is the position of the **left** seat of the pair, and within a row the search goes left to right. ' +
        'Return `None` when no row has such a pair, and never read past the end of a row.\n\n' +
        'For `[[1, 0, 1], [0, 0, 0]]` it returns `(1, 0)`. Not every line is needed.',
      lines: [
        { text: 'def find_pair(rows):', indent: 0 },
        { text: 'for r in range(len(rows)):', indent: 1 },
        { text: 's = 0', indent: 2 },
        { text: 'while s < len(rows[r]) - 1:', indent: 2 },
        { text: 'if rows[r][s] == 0 and rows[r][s + 1] == 0:', indent: 3 },
        { text: 'return (r, s)', indent: 4 },
        { text: 's = s + 1', indent: 3 },
        { text: 'return None', indent: 1 },
      ],
      distractors: [
        { text: 'while s < len(rows[r]):', indent: 2, mistake: 'index_out_of_range' },
        { text: 'return (r, s + 1)', indent: 4, mistake: 'off_by_one_range' },
      ],
      indentMatters: true,
      fnName: 'find_pair',
      tests: [
        { id: 'v1', call: 'find_pair([[1, 0, 1], [0, 0, 0], [1, 1, 1]])', expect: '(1, 0)', label: 'the pair is in the second row', hidden: false },
        { id: 'v2', call: 'find_pair([[1, 0, 0, 1]])', expect: '(0, 1)', label: 'the left seat of the pair', hidden: false, tag: 'off_by_one_range' },
        { id: 'h1', call: 'find_pair([])', expect: 'None', label: 'no rows at all', hidden: true },
        { id: 'h2', call: 'find_pair([[1, 0]])', expect: 'None', label: 'a free seat at the very end of the row', hidden: true, tag: 'index_out_of_range' },
        { id: 'h3', call: 'find_pair([[0], [0], [0, 0]])', expect: '(2, 0)', label: 'rows with a single seat', hidden: true, tag: 'index_out_of_range' },
        { id: 'h4', call: 'find_pair([[1, 1, 1], [1, 1]])', expect: 'None', label: 'no pair anywhere', hidden: true, tag: 'return_type_wrong' },
        { id: 'h5', call: 'find_pair([[0, 1, 0, 0], [0, 0]])', expect: '(0, 2)', label: 'the pair is in the middle of the first row', hidden: true },
      ],
      concepts: ['nested-loop', 'while', 'index', 'early-return', 'bounds'],
      detects: ['index_out_of_range', 'off_by_one_range', 'early_return_in_loop', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'Two loops: one moves down the rows, the other walks along a row. A pair needs a seat and the seat to its right, so the walk along a row has to stop before the very last seat.',
        'Plan: for each row position `r`, start a seat position at 0 **inside** that row. While there is still a seat to the right of `s`, check whether `rows[r][s]` and `rows[r][s + 1]` are both free; hand the pair back as soon as they are, otherwise step `s` on by one. If every row runs out, hand back nothing.',
        'The inner header is `while s < len(rows[r]) - 1:`. `s = 0` belongs inside the outer loop so each row starts at its first seat, and `return None` sits at the function level, after both loops.',
      ],
      solution: {
        code: `def find_pair(rows):
    for r in range(len(rows)):
        s = 0
        while s < len(rows[r]) - 1:
            if rows[r][s] == 0 and rows[r][s + 1] == 0:
                return (r, s)
            s = s + 1
    return None`,
        explanation:
          '- `for r in range(len(rows)):` walks the rows by position, because the answer has to name the row as a number.\n' +
          '- `s = 0` is **inside** the outer loop, so every row starts its own search at its first seat. Above the outer loop it would keep the position left over from the row before, and later rows would be searched from the wrong place or skipped entirely.\n' +
          '- `while s < len(rows[r]) - 1:` is the bound that keeps `rows[r][s + 1]` inside the row. With plain `len(rows[r])` the last pass would read one seat past the end and raise `IndexError`, and a row of one seat runs the loop 0 times, which is right.\n' +
          '- `if rows[r][s] == 0 and rows[r][s + 1] == 0:` needs both seats free. `and` skips the second read when the first seat is sold.\n' +
          '- `return (r, s)` hands back the **left** seat of the pair and ends the whole function on the spot, which is what "the first pair" means. `(r, s + 1)` would name the right-hand seat.\n' +
          '- `s = s + 1` is the step that moves the search along, and it must be outside the `if` so it runs on every pass.\n' +
          '- `return None` is at the function level, after both loops. One indent further in it would give up after the first row that had no pair.\n\n' +
          'On `[[1, 0, 1], [0, 0, 0], [1, 1, 1]]` row 0 is searched at `s = 0` and `s = 1` with no pair, then row 1 matches straight away and the function returns `(1, 0)`.',
      },
      selfExplain: 'What would the function return for [[1, 1], [0, 0]] if return None were indented to sit inside the for loop?',
    },
    {
      id: 't07-s6-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 15,
      examSlot: 'combinations',
      diff: 'hard',
      core: true,
      title: 'Ticket lines on sale (exam style)',
      prompt:
        '*Exam style, 15 marks. Write it by hand first, then submit once.*\n\n' +
        'The box office sells one ticket line for each show, seating zone and ticket type. A few zones are closed for a particular show, ' +
        'because a set blocks the view or the seats are held back; those pairs are listed in `unavailable` as `(show, zone)` tuples.\n\n' +
        'Write `ticket_options(shows, zones, ticket_types, unavailable)` that returns a **list of tuples** `(show, zone, ticket_type)`, one for every line that is on sale.\n\n' +
        '- Build the list in loop order: shows in the outer loop, then zones, then ticket types, each list in the order given.\n' +
        '- Leave out a line when its `(show, zone)` pair appears in `unavailable`.\n' +
        '- Return an empty list when nothing is on sale, or when `shows`, `zones` or `ticket_types` is empty.\n' +
        '- Return the list of tuples. Do not print anything.\n\n' +
        'Example:\n\n' +
        '```python\n' +
        "ticket_options(['Macbeth', 'Cats'], ['Stalls', 'Balcony'], ['Adult', 'Concession'], [('Cats', 'Balcony')])\n" +
        "# [('Macbeth', 'Stalls', 'Adult'), ('Macbeth', 'Stalls', 'Concession'),\n" +
        "#  ('Macbeth', 'Balcony', 'Adult'), ('Macbeth', 'Balcony', 'Concession'),\n" +
        "#  ('Cats', 'Stalls', 'Adult'), ('Cats', 'Stalls', 'Concession')]\n" +
        '```',
      fnName: 'ticket_options',
      starter: `def ticket_options(shows, zones, ticket_types, unavailable):
    pass`,
      tests: [
        {
          id: 'v1',
          call: "ticket_options(['Macbeth', 'Cats'], ['Stalls', 'Balcony'], ['Adult', 'Concession'], [('Cats', 'Balcony')])",
          expect: "[('Macbeth', 'Stalls', 'Adult'), ('Macbeth', 'Stalls', 'Concession'), ('Macbeth', 'Balcony', 'Adult'), ('Macbeth', 'Balcony', 'Concession'), ('Cats', 'Stalls', 'Adult'), ('Cats', 'Stalls', 'Concession')]",
          label: 'the example from the question', hidden: false,
        },
        {
          id: 'v2',
          call: "ticket_options(['Macbeth'], ['Stalls'], ['Adult', 'Child'], [])",
          expect: "[('Macbeth', 'Stalls', 'Adult'), ('Macbeth', 'Stalls', 'Child')]",
          label: 'nothing unavailable', hidden: false,
        },
        {
          id: 'h1',
          call: "ticket_options(['Hamlet'], ['Stalls'], ['Adult'], [])",
          expect: "[('Hamlet', 'Stalls', 'Adult')]",
          label: 'one show, one zone, one ticket type', hidden: true,
        },
        {
          id: 'h2',
          call: "ticket_options(['Macbeth'], ['Stalls', 'Balcony'], ['Adult'], [('Macbeth', 'Stalls'), ('Macbeth', 'Balcony')])",
          expect: '[]',
          label: 'every zone closed for the only show', hidden: true, tag: 'return_type_wrong',
        },
        {
          id: 'h3',
          call: "ticket_options(['Macbeth'], [], ['Adult'], [])",
          expect: '[]',
          label: 'no zones at all', hidden: true,
        },
        {
          id: 'h4',
          call: "ticket_options([], ['Stalls'], ['Adult'], [])",
          expect: '[]',
          label: 'no shows at all', hidden: true,
        },
        {
          id: 'h5',
          call: "ticket_options(['Macbeth', 'Cats', 'Hamlet'], ['Stalls', 'Circle'], ['Adult'], [('Cats', 'Stalls')])",
          expect: "[('Macbeth', 'Stalls', 'Adult'), ('Macbeth', 'Circle', 'Adult'), ('Cats', 'Circle', 'Adult'), ('Hamlet', 'Stalls', 'Adult'), ('Hamlet', 'Circle', 'Adult')]",
          label: 'one closed zone in the middle of the list', hidden: true, tag: 'early_return_in_loop',
        },
        {
          id: 'h6',
          call: "ticket_options(['Swan Lake', 'Cats'], ['Stalls', 'Dress Circle'], ['Adult', 'Concession', 'Child'], [('Swan Lake', 'Dress Circle')])",
          expect: "[('Swan Lake', 'Stalls', 'Adult'), ('Swan Lake', 'Stalls', 'Concession'), ('Swan Lake', 'Stalls', 'Child'), ('Cats', 'Stalls', 'Adult'), ('Cats', 'Stalls', 'Concession'), ('Cats', 'Stalls', 'Child'), ('Cats', 'Dress Circle', 'Adult'), ('Cats', 'Dress Circle', 'Concession'), ('Cats', 'Dress Circle', 'Child')]",
          label: 'three ticket types, in loop order', hidden: true, tag: 'accumulator_init',
        },
      ],
      concepts: ['nested-loop', 'combinations', 'tuple', 'list', 'membership'],
      detects: ['accumulator_init', 'early_return_in_loop', 'return_type_wrong', 'print_vs_return', 'type_error_other'],
      expectedSec: 660,
      hints: [
        'Three lists means three loops, one inside the other. The only extra work is asking whether this show and this zone are on sale.',
        'Plan: make an empty result list before any loop. Loop over the shows, inside that the zones, inside that the ticket types. Check that the `(show, zone)` pair is not in `unavailable`, and if it is not, append the three-part tuple. Return the list after all three loops.',
        'The check is `if (show, zone) not in unavailable:`, and the line that records a sale is `options.append((show, zone, ticket))`. The inner brackets matter: `append` takes one value.',
      ],
      solution: {
        code: `def ticket_options(shows, zones, ticket_types, unavailable):
    options = []
    for show in shows:
        for zone in zones:
            for ticket in ticket_types:
                if (show, zone) not in unavailable:
                    options.append((show, zone, ticket))
    return options`,
        explanation:
          '- `options = []` is set once, before the outer loop, so the lines found under every show are kept.\n' +
          '- The three loops sit in the order the spec gives, so the tuples come out shows first, then zones, then ticket types. That order is what the example shows: both Stalls lines for Macbeth, then both Balcony lines, then Cats.\n' +
          '- `(show, zone)` builds a tuple on the spot, and `not in unavailable` compares it against each pair in the list. Two tuples are equal when both of their parts are equal, so no loop of your own is needed.\n' +
          '- The check only involves the show and the zone, so it can also go one level out, above the ticket-type loop; the result is the same list.\n' +
          '- `options.append((show, zone, ticket))` appends one tuple. Without the inner brackets `append` is given three arguments and raises `TypeError`.\n' +
          '- `return options` comes after all three loops. A `return` inside them would hand back only the first line, and printing instead of returning gives the caller `None`.\n' +
          '- An empty `shows`, `zones` or `ticket_types` makes that loop run zero times, so `[]` comes back with no special case.\n\n' +
          'Marking guide (15): result list set up once (2), three correctly nested loops in the right order (4), the `(show, zone)` pair tested against `unavailable` (4), the three-part tuple appended (2), return the list after the loops and print nothing (3).',
      },
      selfExplain: 'Why does moving the unavailable check out of the innermost loop give the same list?',
    },
  ],
};

export default scenario;
