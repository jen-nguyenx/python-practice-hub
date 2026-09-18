// Scenario t01-s6: the box office at His Majesty's Theatre (conversions that give a whole number,
// turning a ticket number into a row and seat with // and %, and a percentage spoiled by integer division).
import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');
const md = (...lines: string[]): string => lines.join('\n');

const SEAT_SOLUTION = py(
  'def seat_label(ticket_number):',
  '    index = ticket_number - 1',
  '    row = index // 22 + 1',
  '    seat = index % 22 + 1',
  "    return f'Row {row} Seat {seat}'",
);

const HOUSE_BUGGY = py(
  'def house_percent(sold, capacity):',
  '    """Return the percentage of seats sold, rounded to 1 decimal place."""',
  '    share = sold // capacity',
  '    percent = share * 100',
  '    return round(percent)',
);

const HOUSE_FIXED = py(
  'def house_percent(sold, capacity):',
  '    """Return the percentage of seats sold, rounded to 1 decimal place."""',
  '    share = sold / capacity',
  '    percent = share * 100',
  '    return round(percent, 1)',
);

const scenario: Scenario = {
  id: 't01-s6',
  title: "His Majesty's Theatre box office",
  story:
    "The box office at His Majesty's Theatre on Hay Street numbers every ticket in the stalls straight through, 22 seats to a row. " +
    'Its app turns a ticket number into a row and a seat, and reports how full the house was.',
  questions: [
    {
      id: 't01-s6-q1',
      format: 'multi',
      diff: 'medium',
      core: true,
      title: 'Which lines store the int 3?',
      prompt:
        'A row number has to be a whole number: the int `3`, not the float `3.0` and not text.\n\n' +
        'Select **every** line that leaves `row` holding exactly the int `3`.',
      concepts: ['types', 'type-conversion', 'floor-division'],
      detects: ['int_of_float_string', 'int_vs_float_division', 'input_without_int'],
      expectedSec: 150,
      options: [
        {
          id: 'a',
          text: 'row = 7 // 2',
          correct: true,
          why: '`//` between two ints gives an int: `7 // 2` is `3`, with the remainder thrown away.',
        },
        {
          id: 'b',
          text: "row = int('3')",
          correct: true,
          why: "`int()` reads text that holds a whole number and gives the int `3`.",
        },
        {
          id: 'c',
          text: "row = int('3.0')",
          correct: false,
          mistake: 'int_of_float_string',
          why:
            "This raises `ValueError: invalid literal for int() with base 10: '3.0'`. Text given to `int()` must be a whole number, " +
            "so `'3.0'` needs `int(float('3.0'))`, which does give `3`.",
        },
        {
          id: 'd',
          text: 'row = 7 / 2',
          correct: false,
          mistake: 'int_vs_float_division',
          why: '`/` always gives a float, and here it keeps the half as well: `3.5`. Even `6 / 2` would give `3.0`, a float.',
        },
        {
          id: 'e',
          text: 'row = int(3.9)',
          correct: true,
          why: '`int()` on a float cuts off the decimals rather than rounding, so `int(3.9)` is `3`. `round(3.9)` would give `4`.',
        },
      ],
      hints: [
        'Two questions for each line: does it run at all, and is the value it stores an int or a float?',
        'Check each line in turn. `//` between ints gives an int; `/` always gives a float; `int()` on text only accepts whole numbers; `int()` on a float cuts the decimals off.',
        "One line raises a ValueError before it can store anything, and one stores `3.5`.",
      ],
      solution: {
        explanation: md(
          'Three lines store the int `3`: `7 // 2`, `int(\'3\')` and `int(3.9)`.',
          '',
          '- `7 // 2` is floor division between two ints, so the answer is the int `3`.',
          "- `int('3')` converts text that holds a whole number.",
          "- `int('3.0')` raises a ValueError. `int()` is strict about text: it accepts `'3'` but not `'3.0'` or `'3.4'`. Use `float()` first if the text may have a decimal point.",
          '- `7 / 2` is `3.5`. `/` never gives an int, not even for `6 / 2`.',
          '- `int(3.9)` is `3`. Converting a float with `int()` throws the decimals away; it is `round()` that goes to the nearest whole number.',
          '',
          'Seat and row numbers, counts of pages and numbers of boxes should all come from `//` or `int()`, never from `/`.',
        ),
      },
      selfExplain: "Which two of these lines give 4 instead of 3 if you swap int() for round()?",
    },
    {
      id: 't01-s6-q2',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Ticket number to row and seat',
      prompt: md(
        'Tickets in the stalls are numbered from 1 straight through, 22 seats to a row: ticket 1 is Row 1 Seat 1, ticket 22 is Row 1 Seat 22, and ticket 23 is Row 2 Seat 1.',
        '',
        'Arrange the lines to build `seat_label(ticket_number)`, which **returns** a string such as `Row 2 Seat 1`.',
        '',
        '`ticket_number` is a whole number, 1 or more. Indentation matters, and not every line is needed.',
      ),
      concepts: ['floor-division', 'modulo', 'off-by-one', 'f-strings', 'return-value'],
      detects: ['off_by_one_range', 'int_vs_float_division', 'print_vs_return'],
      expectedSec: 240,
      indentMatters: true,
      fnName: 'seat_label',
      lines: [
        { text: 'def seat_label(ticket_number):', indent: 0 },
        { text: 'index = ticket_number - 1', indent: 1 },
        { text: 'row = index // 22 + 1', indent: 1 },
        { text: 'seat = index % 22 + 1', indent: 1 },
        { text: "return f'Row {row} Seat {seat}'", indent: 1 },
      ],
      distractors: [
        { text: 'row = ticket_number // 22 + 1', indent: 1, mistake: 'off_by_one_range' },
        { text: "print(f'Row {row} Seat {seat}')", indent: 1, mistake: 'print_vs_return' },
      ],
      tests: [
        { id: 'v1', call: 'seat_label(1)', expect: "'Row 1 Seat 1'", label: 'the first ticket', hidden: false, tag: 'print_vs_return' },
        { id: 'v2', call: 'seat_label(23)', expect: "'Row 2 Seat 1'", label: 'first seat of row 2', hidden: false },
        { id: 'h1', call: 'seat_label(22)', expect: "'Row 1 Seat 22'", label: 'last seat of row 1', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'seat_label(44)', expect: "'Row 2 Seat 22'", label: 'last seat of row 2', hidden: true },
        { id: 'h3', call: 'seat_label(45)', expect: "'Row 3 Seat 1'", label: 'first seat of row 3', hidden: true },
        { id: 'h4', call: 'seat_label(100)', expect: "'Row 5 Seat 12'", label: 'a ticket deep in the stalls', hidden: true },
      ],
      hints: [
        '`//` and `%` count from 0, but rows and seats are numbered from 1. Work out ticket 22 and ticket 23 by hand and see where the two numbering schemes disagree.',
        md(
          'Plan:',
          '',
          '1. Shift the ticket number so that the first ticket is 0 rather than 1.',
          '2. How many full rows fit into that shifted number? That is one less than the row.',
          '3. What is left over after those full rows? That is one less than the seat.',
          '4. Add 1 back to each and build the text with an f-string.',
        ),
        'The first body line is `index = ticket_number - 1`. Every later line uses `index`, never `ticket_number`.',
      ],
      solution: {
        code: SEAT_SOLUTION,
        explanation: md(
          '- `index = ticket_number - 1` moves to counting from 0, which is what `//` and `%` expect. Ticket 22 becomes index 21, and ticket 23 becomes index 22.',
          '- `row = index // 22 + 1` counts the full rows before this seat and adds 1. For ticket 22: `21 // 22` is `0`, so the row is 1. Using `ticket_number` here instead of `index` gives `22 // 22 + 1`, which is 2, and sends the last person in row 1 to the wrong row.',
          '- `seat = index % 22 + 1` takes what is left after those full rows and adds 1. For ticket 23: `22 % 22` is `0`, so the seat is 1.',
          '- `return f\'Row {row} Seat {seat}\'` builds the label. A `print` here would show the right text on screen but hand back `None`, so the caller would have nothing to put on the ticket.',
          '',
          'The `- 1` at the start and the `+ 1` at the end are the standard pair for converting between "numbered from 1" and the 0-based world of `//` and `%`.',
        ),
      },
      selfExplain: 'Which ticket numbers still come out right if you drop the - 1 on the second line, and which do not?',
    },
    {
      id: 't01-s6-q3',
      format: 'fixBug',
      diff: 'hard',
      core: false,
      title: 'How full was the house?',
      prompt: md(
        '`house_percent(sold, capacity)` should **return** the percentage of seats sold, rounded to 1 decimal place: 1043 of 1200 seats is `86.9`.',
        '',
        '`sold` and `capacity` are whole numbers and `capacity` is at least 1. Every night the report says the house was 0% full.',
        '',
        'Run the tests, then fix the function. More than one line is wrong, but no line needs to be added or removed.',
      ),
      concepts: ['true-division', 'percentage', 'round', 'return-value'],
      detects: ['int_vs_float_division', 'return_type_wrong'],
      expectedSec: 400,
      fnName: 'house_percent',
      buggy: HOUSE_BUGGY,
      bugMistake: 'int_vs_float_division',
      maxChangedLines: 2,
      tests: [
        { id: 'v1', call: 'house_percent(900, 1200)', expect: '75.0', cmp: 'float', label: '900 of 1200 seats', hidden: false, tag: 'int_vs_float_division' },
        { id: 'v2', call: 'house_percent(1043, 1200)', expect: '86.9', cmp: 'float', label: '1043 of 1200 seats', hidden: false, tag: 'return_type_wrong' },
        { id: 'h1', call: 'house_percent(1200, 1200)', expect: '100.0', cmp: 'float', label: 'a sold-out house', hidden: true },
        { id: 'h2', call: 'house_percent(0, 1200)', expect: '0.0', cmp: 'float', label: 'nothing sold', hidden: true },
        { id: 'h3', call: 'house_percent(1, 1200)', expect: '0.1', cmp: 'float', label: 'one ticket sold', hidden: true, tag: 'return_type_wrong' },
        { id: 'h4', call: 'house_percent(599, 1200)', expect: '49.9', cmp: 'float', label: 'just under half', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h5', call: 'house_percent(1199, 1200)', expect: '99.9', cmp: 'float', label: 'one seat empty', hidden: true },
      ],
      hints: [
        'Work line 3 out by hand with the numbers from the first test. What does Python store in `share` when 900 tickets of 1200 are sold?',
        'Two things are wrong. One operator throws away everything after the decimal point before the multiplication ever happens, so the percentage can only ever be 0 or 100. Separately, the spec asks for 1 decimal place, and `round()` needs to be told that.',
        'Line 3 needs the division that keeps the fraction. Line 5 should read `return round(percent, ...)`.',
      ],
      solution: {
        code: HOUSE_FIXED,
        explanation: md(
          '- Line 3 had `sold // capacity`. Floor division rounds down to a whole number, and a fraction of a house is always less than 1, so `900 // 1200` is `0`. Everything after that is `0 * 100`, which is why every night reported 0%. `sold / capacity` keeps the fraction: `0.75`.',
          '- Line 4 is already right: multiplying the fraction by 100 turns `0.75` into `75.0`.',
          '- Line 5 had `round(percent)` with no second argument, which rounds to a whole number and gives an int. `round(percent, 1)` keeps 1 decimal place, so `86.91666...` becomes `86.9` and one ticket sold is `0.1`, not `0`.',
          '- A sold-out house hides both bugs: `1200 // 1200` is `1`, and `round(100)` is `100`. That is why the visible tests use houses that are not full, and it is a good reminder to test more than the tidy case.',
          '',
          '`sold * 100 / capacity` works just as well and is a common way to write it. What never works is `//` anywhere in the chain.',
        ),
      },
      selfExplain: 'Why does a sold-out house give the right answer even with both bugs in place?',
    },
  ],
};

export default scenario;
