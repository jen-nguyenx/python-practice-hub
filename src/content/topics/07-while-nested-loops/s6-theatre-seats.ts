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
  ],
};

export default scenario;
