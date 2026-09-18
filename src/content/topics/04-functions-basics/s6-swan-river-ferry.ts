import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s6',
  title: 'Swan River ferry',
  story: md(
    'The ferry between Elizabeth Quay and Mends Street crosses the Swan River once an hour all day, and costs more at peak times.',
    'The operations office keeps a few small functions for fares, daily takings and how many crossings a group booking needs.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 twins
    {
      id: 't04-s6-q1',
      format: 'twins',
      diff: 'easy',
      core: true,
      title: 'Where the return goes',
      prompt: md(
        'A school group buys 4 crossings at $7.50 each, so the total should be 30.0.',
        '',
        'The two versions differ only in the indentation of the `return`. Work out what each one prints and say which one is right.',
      ),
      left: `def total_fare(crossings, fare):
    total = 0
    for trip in range(crossings):
        total = total + fare
        return total


print(total_fare(4, 7.5))`,
      right: `def total_fare(crossings, fare):
    total = 0
    for trip in range(crossings):
        total = total + fare
    return total


print(total_fare(4, 7.5))`,
      mistake: 'early_return_in_loop',
      concepts: ['return', 'loop-in-function', 'accumulator'],
      detects: ['early_return_in_loop'],
      expectedSec: 110,
      hints: [
        '`return` does not just hand a value back: it ends the function there and then, whatever is left to do.',
        'For each version, ask how many times the loop body runs before the function ends, and what `total` holds at that moment.',
        'In the left version the `return` is inside the loop body, so it runs on the first pass.',
      ],
      solution: {
        explanation: md(
          '- **Left**: the `return` is indented inside the loop, so the first pass adds one fare and then leaves the function immediately. Trips 2, 3 and 4 never happen and it prints `7.5`.',
          '- **Right**: the `return` lines up with the `for`, so it runs only after all four passes. It prints `30.0`.',
          '',
          'The rule of thumb: a `return` inside a loop is right only when you want to stop early, such as returning the first match you find. For a running total, the `return` belongs after the loop.',
        ),
      },
      selfExplain: 'When is a return inside a for loop the right thing to write?',
    },

    // ---------------------------------------------------------------- q2 cloze
    {
      id: 't04-s6-q2',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'A day of crossings',
      prompt: md(
        'Complete the two functions. Hours are whole numbers on a 24-hour clock.',
        '',
        '- `crossing_fare(hour)` returns the fare for the crossing leaving at `hour`: 6.50 at peak times, which are before 9 and after 16, and 4.20 at any other hour.',
        '- `day_takings(first, last, riders)` returns the takings for one crossing every hour from `first` up to **and including** `last`, with `riders` passengers on every crossing, rounded to 2 decimal places. It must get each fare by calling `crossing_fare`.',
        '',
        'For example `day_takings(8, 10, 2)` returns 29.8: the 8 o\'clock crossing is peak and the other two are not.',
      ),
      template: `def crossing_fare(hour):
    """Return 6.50 for a peak crossing (before 9 or after 16), otherwise 4.20."""
    if ⟦1⟧:
        return 6.50
    return 4.20


def day_takings(first, last, riders):
    """Return the takings for one crossing an hour from first to last, rounded to 2 decimal places."""
    total = 0
    for hour in range(first, ⟦2⟧):
        total = total + ⟦3⟧
    return round(total, 2)`,
      blanks: [
        { id: '1', accept: ['hour < 9 or hour > 16', 'hour > 16 or hour < 9'] },
        { id: '2', accept: ['last + 1', 'last+1', '1 + last'] },
        { id: '3', accept: ['crossing_fare(hour) * riders', 'riders * crossing_fare(hour)'] },
      ],
      fnName: 'day_takings',
      tests: [
        { id: 'v1', call: 'day_takings(8, 10, 2)', expect: '29.8', cmp: 'float', label: 'three crossings, two riders', hidden: false },
        { id: 'v2', call: 'crossing_fare(17)', expect: '6.5', cmp: 'float', label: 'after the evening peak starts', hidden: false },
        { id: 'h1', call: 'day_takings(9, 9, 1)', expect: '4.2', cmp: 'float', label: 'first and last are the same hour', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'crossing_fare(16)', expect: '4.2', cmp: 'float', label: '16 is not after 16', hidden: true },
        { id: 'h3', call: 'crossing_fare(6)', expect: '6.5', cmp: 'float', label: 'early morning peak', hidden: true },
        { id: 'h4', call: 'day_takings(7, 18, 3)', expect: '178.8', cmp: 'float', label: 'a full service day', hidden: true },
        { id: 'h5', call: 'day_takings(10, 9, 5)', expect: '0', label: 'no crossings at all', hidden: true, tag: 'accumulator_init' },
      ],
      concepts: ['helper-functions', 'return', 'range', 'accumulator'],
      detects: ['off_by_one_range', 'forgot_to_call', 'print_vs_return', 'accumulator_init'],
      expectedSec: 220,
      hints: [
        'Blank 1 is the peak test, written as one condition. Blanks 2 and 3 decide which hours the loop visits and what each crossing is worth.',
        'Blank 1: peak means the hour is before 9 **or** after 16, so two comparisons joined with `or`. Blank 2: the stop value of a range is never produced, so `last` itself has to be included another way. Blank 3: one crossing takes the fare for that hour, once for each rider.',
        'Blank 3 has the shape `crossing_fare(hour) * ...`. Calling `crossing_fare` without the brackets and the hour would give the function itself, not a fare.',
      ],
      solution: {
        code: `def crossing_fare(hour):
    """Return 6.50 for a peak crossing (before 9 or after 16), otherwise 4.20."""
    if hour < 9 or hour > 16:
        return 6.50
    return 4.20


def day_takings(first, last, riders):
    """Return the takings for one crossing an hour from first to last, rounded to 2 decimal places."""
    total = 0
    for hour in range(first, last + 1):
        total = total + crossing_fare(hour) * riders
    return round(total, 2)`,
        explanation: md(
          '1. `if hour < 9 or hour > 16:` is the peak test. Both halves need the `hour` in them: `hour < 9 or > 16` is not valid Python, and `hour > 16` on its own would charge the 7 am crossing off-peak. Hour 16 itself is not after 16, so it stays at 4.20.',
          '2. `return 6.50` ends the function straight away when the test is true, so the `return 4.20` below acts as the "otherwise" case without needing an `else`.',
          '3. `range(first, last + 1)` visits every hour from `first` to `last`. Without the `+ 1`, `day_takings(9, 9, 1)` would visit no hours at all and return 0.',
          '4. `total = total + crossing_fare(hour) * riders` calls the helper for this hour and adds what that crossing takes. `crossing_fare` hands its answer back, so the value can be used in the sum.',
          '5. `return round(total, 2)` is lined up with the `for`, so the rounding happens once, after every hour has been added. For hours 8, 9 and 10 with 2 riders the total is 13.0 + 8.4 + 8.4 = 29.8.',
        ),
      },
      selfExplain: 'Why does day_takings still work when first is later than last?',
    },

    // ---------------------------------------------------------------- q3 parsons
    {
      id: 't04-s6-q3',
      format: 'parsons',
      diff: 'hard',
      core: false,
      title: 'How many crossings for the group',
      prompt: md(
        'A group of `riders` people is waiting and the ferry carries `capacity` people per crossing. Any leftover people need one more crossing of their own.',
        '',
        'Arrange the lines to build two functions.',
        '',
        '- `crossings_needed(riders, capacity)` returns the number of crossings as an **int**. `crossings_needed(120, 45)` returns 3, because two full crossings leave 30 people behind.',
        '- `day_cost(riders, capacity, cost_each)` returns what those crossings cost, where `cost_each` is the cost of running one crossing. It must call `crossings_needed` rather than repeat the arithmetic.',
        '',
        'Assume `riders` is 0 or more and `capacity` is at least 1. Not every line is needed, and indentation matters.',
      ),
      lines: [
        { text: 'def crossings_needed(riders, capacity):', indent: 0 },
        { text: 'trips = riders // capacity', indent: 1 },
        { text: 'if riders % capacity != 0:', indent: 1 },
        { text: 'trips = trips + 1', indent: 2 },
        { text: 'return trips', indent: 1 },
        { text: 'def day_cost(riders, capacity, cost_each):', indent: 0 },
        { text: 'return crossings_needed(riders, capacity) * cost_each', indent: 1 },
      ],
      distractors: [
        { text: 'trips = riders / capacity', indent: 1, mistake: 'int_vs_float_division' },
        { text: 'return crossings_needed * cost_each', indent: 1, mistake: 'forgot_to_call' },
      ],
      indentMatters: true,
      fnName: 'day_cost',
      tests: [
        { id: 'v1', call: 'crossings_needed(120, 45)', expect: '3', label: '120 people, 45 per crossing', hidden: false },
        { id: 'v2', call: 'day_cost(120, 45, 850)', expect: '2550', label: 'cost of those crossings', hidden: false, tag: 'forgot_to_call' },
        { id: 'h1', call: 'crossings_needed(7, 3)', expect: '3', label: 'one person left over', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h2', call: 'isinstance(crossings_needed(100, 30), int)', expect: 'True', label: 'the answer is an int, not a float', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h3', call: 'crossings_needed(90, 45)', expect: '2', label: 'an exact fit needs no extra crossing', hidden: true },
        { id: 'h4', call: 'crossings_needed(0, 45)', expect: '0', label: 'nobody waiting', hidden: true },
        { id: 'h5', call: 'day_cost(1, 200, 640)', expect: '640', label: 'one person still fills a crossing', hidden: true, tag: 'forgot_to_call' },
      ],
      concepts: ['helper-functions', 'floor-division', 'modulo', 'return'],
      detects: ['int_vs_float_division', 'forgot_to_call', 'print_vs_return'],
      expectedSec: 420,
      hints: [
        'Two questions to answer: how many full crossings the group fills, and whether anyone is left over afterwards.',
        'Plan for `crossings_needed`: work out the full crossings with a division that keeps whole numbers, check for a remainder, add one crossing if there is one, and return the count. `day_cost` is a single `return` that calls `crossings_needed` and multiplies by the cost of a crossing.',
        'The remainder test is `if riders % capacity != 0:`, and the line inside it adds one crossing.',
      ],
      solution: {
        code: `def crossings_needed(riders, capacity):
    trips = riders // capacity
    if riders % capacity != 0:
        trips = trips + 1
    return trips


def day_cost(riders, capacity, cost_each):
    return crossings_needed(riders, capacity) * cost_each`,
        explanation: md(
          '1. `trips = riders // capacity` counts the full crossings. `//` keeps the answer an int: with `/`, 120 people would give `2.6666...`, and the function would hand back a float such as `3.6666...` instead of 3.',
          '2. `if riders % capacity != 0:` asks whether anyone is left over. `120 % 45` is 30, so one more crossing is added. When the fit is exact, as with 90 people, the remainder is 0 and the count stays as it is.',
          '3. `trips = trips + 1` is indented under the `if`, so it runs only when there is a remainder.',
          '4. `return trips` lines up with the `if`, so it runs either way.',
          '5. `day_cost` calls `crossings_needed(riders, capacity)` and multiplies the count by `cost_each`. The brackets and arguments are what make the call happen: `crossings_needed * cost_each` tries to multiply the function itself and raises `TypeError`.',
        ),
      },
      selfExplain: 'Why is crossings_needed(90, 45) 2 while crossings_needed(91, 45) is 3?',
    },
  ],
};

export default scenario;
