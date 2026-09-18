// Topic 07, scenario 4: while loops with an index, sentinels and merging (rain gauge logger).
import type { Scenario } from '../../schema.ts';

const LOGS_A = "a = [1.2, 4.0, 9.5]\nb = [0.4, 4.0, 6.1]";

const scenario: Scenario = {
  id: 't07-s4',
  title: 'Kalamunda rain gauge logger',
  story:
    'A volunteer rainfall observer in Kalamunda has a small data logger that sends daily readings in millimetres. ' +
    'The logger marks the end of a batch with the sentinel value `-1`, so these loops walk through lists with `while` and an index instead of `for`.',
  questions: [
    {
      id: 't07-s4-q1',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The logger freezes',
      prompt:
        '`dry_days(readings)` should count the readings of `0.0` that come before the sentinel `-1`. Every batch ends with `-1`.\n\n' +
        'It works on a batch where every day is dry, but it freezes on real batches. Find the bug and fix it by changing one line.',
      buggy: `def dry_days(readings):
    """Count the 0.0 readings before the -1 sentinel."""
    count = 0
    i = 0
    while readings[i] != -1:
        if readings[i] == 0.0:
            count = count + 1
            i = i + 1
    return count`,
      bugMistake: 'infinite_while',
      maxChangedLines: 1,
      fnName: 'dry_days',
      tests: [
        { id: 'v1', call: 'dry_days([0.0, 0.0, -1])', expect: '2', label: 'two dry days', hidden: false },
        { id: 'v2', call: 'dry_days([0.0, 4.2, 0.0, -1])', expect: '2', label: 'a wet day in the middle', hidden: false, tag: 'infinite_while' },
        { id: 'h1', call: 'dry_days([-1])', expect: '0', label: 'sentinel straight away', hidden: true },
        { id: 'h2', call: 'dry_days([3.5, 12.0, -1])', expect: '0', label: 'no dry days', hidden: true, tag: 'infinite_while' },
        { id: 'h3', call: 'dry_days([1.5, 0.0, -1, 0.0, 0.0])', expect: '1', label: 'readings after the sentinel are ignored', hidden: true },
      ],
      concepts: ['while', 'sentinel', 'index', 'loop-update'],
      detects: ['infinite_while'],
      expectedSec: 180,
      hints: [
        'Follow the loop on `[0.0, 4.2, 0.0, -1]`. What is `i` after the first pass, and what happens on the second pass?',
        'On the second pass `readings[i]` is 4.2, so the `if` body is skipped. Nothing else in the loop changes `i`, so the condition stays True forever.',
        'The line `i = i + 1` must run on every pass, not only for dry days. It belongs at the same indent as the `if`.',
      ],
      solution: {
        code: `def dry_days(readings):
    """Count the 0.0 readings before the -1 sentinel."""
    count = 0
    i = 0
    while readings[i] != -1:
        if readings[i] == 0.0:
            count = count + 1
        i = i + 1
    return count`,
        explanation:
          '- The loop condition reads `readings[i]`, so `i` is the only thing that can make it become False.\n' +
          '- In the buggy code `i = i + 1` is indented inside the `if`, so `i` only moves forward on dry days. The first wet day leaves `i` stuck and the loop repeats forever.\n' +
          '- Moving `i = i + 1` out one level puts it in the loop body itself, so it runs on every pass: count if dry, then always step to the next reading.\n' +
          '- The loop stops at the first `-1`, so readings after the sentinel are never looked at.',
      },
      selfExplain: 'Why did the all-dry batch [0.0, 0.0, -1] work even with the bug?',
    },
    {
      id: 't07-s4-q2',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Batch summary up to the sentinel',
      prompt:
        'Write `batch_summary(readings)` that summarises one batch of daily rainfall readings (floats, in mm).\n\n' +
        '- The value `-1` is the sentinel: stop there, and ignore it and everything after it.\n' +
        '- Some batches were cut off and have **no** `-1`: then use every reading.\n' +
        '- The value `-999` means the gauge was faulty that day: skip it (do not count it) and keep going.\n\n' +
        'Return a **tuple** `(days, total, wettest)`: the number of valid readings, their total **rounded to 1 decimal place**, ' +
        'and the largest valid reading. If there are no valid readings, return `(0, 0.0, None)`.\n\n' +
        'Use a `while` loop with an index. For example `batch_summary([2.4, 0.0, 11.6, -1, 5.0])` returns `(3, 14.0, 11.6)`.',
      fnName: 'batch_summary',
      starter: `def batch_summary(readings):
    """Return (days, total, wettest) for the readings before the -1 sentinel."""
    pass`,
      tests: [
        { id: 'v1', call: 'batch_summary([2.4, 0.0, 11.6, -1, 5.0])', expect: '(3, 14.0, 11.6)', cmp: 'float', label: 'stops at the sentinel', hidden: false },
        { id: 'v2', call: 'batch_summary([3.0, -999, 4.5, -1])', expect: '(2, 7.5, 4.5)', cmp: 'float', label: 'a faulty day is skipped', hidden: false },
        { id: 'h1', call: 'batch_summary([0.2, 0.4, 1.0])', expect: '(3, 1.6, 1.0)', cmp: 'float', label: 'no sentinel (batch cut off)', hidden: true, tag: 'index_out_of_range' },
        { id: 'h2', call: 'batch_summary([-1, 7.0])', expect: '(0, 0.0, None)', cmp: 'float', label: 'sentinel first', hidden: true, tag: 'accumulator_init' },
        { id: 'h3', call: 'batch_summary([])', expect: '(0, 0.0, None)', cmp: 'float', label: 'empty batch', hidden: true },
        { id: 'h4', call: 'batch_summary([-999, -999, 0.0, -1])', expect: '(1, 0.0, 0.0)', cmp: 'float', label: 'faulty days first, then one dry day', hidden: true, tag: 'invalid_row_not_skipped' },
        { id: 'h5', call: 'batch_summary([0.05, 0.05, -1])', expect: '(2, 0.1, 0.05)', cmp: 'float', label: 'round only the final total', hidden: true, tag: 'round_mid_calc' },
        { id: 'h6', call: 'batch_summary([0.12, 0.25, -1])', expect: '(2, 0.4, 0.25)', cmp: 'float', label: 'total rounded to 1 decimal place', hidden: true },
      ],
      concepts: ['while', 'sentinel', 'index', 'tuple', 'max', 'round'],
      detects: ['index_out_of_range', 'infinite_while', 'invalid_row_not_skipped', 'accumulator_init', 'round_mid_calc', 'return_type_wrong'],
      expectedSec: 540,
      hints: [
        'The loop has two reasons to stop: the index reaches the end of the list, or the reading is `-1`. Both belong in the `while` condition, and the order of the two checks matters.',
        'Plan: before the loop set `days` and `total` to 0, `wettest` to `None` and `i` to 0. Loop while `i` is in range **and** the reading is not `-1`. Inside, if the reading is not `-999`, count it, add it and update `wettest`. Always add 1 to `i`. After the loop, return the tuple with the total rounded.',
        'The header is `while i < len(readings) and readings[i] != -1:`. To update the wettest day: `if wettest is None or rain > wettest:`.',
      ],
      solution: {
        code: `def batch_summary(readings):
    days = 0
    total = 0
    wettest = None
    i = 0
    while i < len(readings) and readings[i] != -1:
        rain = readings[i]
        if rain != -999:
            days = days + 1
            total = total + rain
            if wettest is None or rain > wettest:
                wettest = rain
        i = i + 1
    return (days, round(total, 1), wettest)`,
        explanation:
          '- `days`, `total`, `wettest` and `i` are set once, before the loop. `wettest` starts as `None` so a batch with no valid days returns `None`, and a batch of all 0.0 days still reports 0.0.\n' +
          '- `while i < len(readings) and readings[i] != -1:` checks the index **first**. When a batch has no sentinel, `i` reaches `len(readings)` and `and` stops before reading `readings[i]`, which would raise IndexError. An empty list stops straight away.\n' +
          '- `if rain != -999:` skips a faulty day without stopping the loop.\n' +
          '- `if wettest is None or rain > wettest:` takes the first valid reading, then any larger one.\n' +
          '- `i = i + 1` is outside the `if`, so it runs on every pass, including faulty days. Otherwise the loop would never end.\n' +
          '- `round(total, 1)` happens once in the `return`: 0.12 + 0.25 is 0.37, which rounds to 0.4. Rounding the running total on every pass instead turns 0.05 + 0.05 into 0.2 rather than 0.1.',
      },
      selfExplain: 'What happens on a batch with no sentinel if the two parts of the while condition are swapped?',
    },
    {
      id: 't07-s4-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Merge two sorted logs',
      prompt:
        'A second gauge up the road sends its own readings. Both lists are already sorted from smallest to largest.\n\n' +
        'Write `merge_sorted(a, b)` that returns **one new sorted list** containing every value from both lists, duplicates included.\n\n' +
        '- Do not call `sort()` or `sorted()`. Use a `while` loop that walks through both lists with two indexes, always taking the smaller front value.\n' +
        '- Do not change `a` or `b`.\n\n' +
        'For example `merge_sorted([2, 5], [1, 3, 4, 8])` returns `[1, 2, 3, 4, 5, 8]`.',
      fnName: 'merge_sorted',
      starter: `def merge_sorted(a, b):
    """Return a new sorted list with every value from sorted lists a and b."""
    pass`,
      tests: [
        { id: 'v1', call: 'merge_sorted([2, 5], [1, 3, 4, 8])', expect: '[1, 2, 3, 4, 5, 8]', label: 'example from the question', hidden: false },
        {
          id: 'v2', setup: LOGS_A, call: 'merge_sorted(a, b)', expect: '[0.4, 1.2, 4.0, 4.0, 6.1, 9.5]', cmp: 'float',
          label: 'readings with a duplicate', hidden: false,
        },
        { id: 'h1', call: 'merge_sorted([], [3, 7])', expect: '[3, 7]', label: 'first list empty', hidden: true, tag: 'index_out_of_range' },
        { id: 'h2', call: 'merge_sorted([1, 2, 3], [])', expect: '[1, 2, 3]', label: 'second list empty', hidden: true, tag: 'index_out_of_range' },
        { id: 'h3', call: 'merge_sorted([10, 20], [1, 2, 3])', expect: '[1, 2, 3, 10, 20]', label: 'one list runs out first', hidden: true },
        { id: 'h4', call: 'merge_sorted([5, 5], [5])', expect: '[5, 5, 5]', label: 'every value the same', hidden: true },
        {
          id: 'h5', setup: 'a = [1, 4, 6]\nb = [2, 3]', call: 'merge_sorted(a, b)', expect: '[1, 2, 3, 4, 6]', argsUnchanged: ['a', 'b'],
          label: 'the two input lists are not changed', hidden: true,
        },
      ],
      concepts: ['while', 'index', 'merge', 'list'],
      detects: ['index_out_of_range', 'off_by_one_range', 'mutated_input', 'infinite_while'],
      expectedSec: 600,
      hints: [
        'Keep one index for each list. Compare the two front values, take the smaller one, and move forward only in the list you took it from.',
        'Plan: `result` is empty and both indexes start at 0. While **both** indexes are still inside their lists, append the smaller front value and add 1 to that index. When that loop ends, one list may still have values left: copy the rest of `a`, then the rest of `b`.',
        'The first loop is `while i < len(a) and j < len(b):` with `if a[i] <= b[j]:` inside. After it, `while i < len(a):` appends `a[i]` and adds 1 to `i`; do the same for `b` with `j`.',
      ],
      solution: {
        code: `def merge_sorted(a, b):
    result = []
    i = 0
    j = 0
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            result.append(a[i])
            i = i + 1
        else:
            result.append(b[j])
            j = j + 1
    while i < len(a):
        result.append(a[i])
        i = i + 1
    while j < len(b):
        result.append(b[j])
        j = j + 1
    return result`,
        explanation:
          '- `result = []` is a new list, and `a` and `b` are only read, never changed (`pop` would change them).\n' +
          '- `while i < len(a) and j < len(b):` runs only while both lists have a front value, so `a[i]` and `b[j]` are always valid indexes. An empty list skips this loop.\n' +
          '- `if a[i] <= b[j]:` takes the smaller front value and moves only that index forward. Every pass moves exactly one index, so the loop must end.\n' +
          '- When the first loop ends, at most one list has values left, and they are already sorted and all at least as big as everything in `result`. ' +
          'The two short loops copy them. `result + a[i:] + b[j:]` does the same job.\n' +
          '- Each value is appended exactly once, so duplicates are kept.',
      },
      selfExplain: 'Why can at most one of the two copy-the-rest loops actually add anything?',
    },
    {
      id: 't07-s4-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 12,
      diff: 'hard',
      core: true,
      title: 'Longest dry spell (exam style)',
      prompt:
        '*Exam style, 12 marks. Write it by hand first, then submit once.*\n\n' +
        'The observer wants the longest run of dry days in a batch. A reading of `0.0` is a dry day.\n\n' +
        'Write `longest_dry_spell(readings)` that returns an **int**: the length of the longest run of consecutive `0.0` readings in the batch.\n\n' +
        '- The value `-1` is the sentinel: stop there, and ignore it and everything after it.\n' +
        '- Some batches were cut off and have **no** `-1`: then use every reading.\n' +
        '- Return `0` when there are no dry days at all, and for an empty list.\n' +
        '- Use a `while` loop with an index. Do not use `import`.\n\n' +
        'Example: `longest_dry_spell([0.0, 0.0, 3.2, 0.0, -1])` returns `2`.',
      fnName: 'longest_dry_spell',
      starter: `def longest_dry_spell(readings):
    """Return the length of the longest run of 0.0 readings before the -1 sentinel."""
    pass`,
      rules: ['noImport'],
      tests: [
        { id: 'v1', call: 'longest_dry_spell([0.0, 0.0, 3.2, 0.0, -1])', expect: '2', label: 'a run of two, then a run of one', hidden: false },
        { id: 'v2', call: 'longest_dry_spell([1.0, 2.0, -1])', expect: '0', label: 'no dry days', hidden: false },
        { id: 'h1', call: 'longest_dry_spell([])', expect: '0', label: 'empty batch', hidden: true, tag: 'index_out_of_range' },
        { id: 'h2', call: 'longest_dry_spell([0.0, 0.0, 0.0])', expect: '3', label: 'no sentinel (batch cut off)', hidden: true, tag: 'index_out_of_range' },
        { id: 'h3', call: 'longest_dry_spell([0.0, -1, 0.0, 0.0, 0.0])', expect: '1', label: 'readings after the sentinel are ignored', hidden: true },
        { id: 'h4', call: 'longest_dry_spell([3.0, 0.0])', expect: '1', label: 'the batch ends in the middle of a dry run', hidden: true, tag: 'off_by_one_range' },
        { id: 'h5', call: 'longest_dry_spell([0.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1])', expect: '3', label: 'the longest run is not the last one', hidden: true, tag: 'accumulator_init' },
        { id: 'h6', call: 'longest_dry_spell([-1, 0.0, 0.0])', expect: '0', label: 'sentinel first', hidden: true },
      ],
      concepts: ['while', 'sentinel', 'index', 'run-length', 'accumulator'],
      detects: ['index_out_of_range', 'off_by_one_range', 'accumulator_init', 'infinite_while', 'return_type_wrong'],
      expectedSec: 600,
      hints: [
        'You need two counters, not one: how long the run you are in is now, and the best run seen so far. A wet day ends the current run but must not touch the best.',
        'Plan: set `longest` and `run` to 0 and `i` to 0. Loop while `i` is still inside the list **and** the reading is not `-1`. If the reading is `0.0`, add 1 to `run` and update `longest` when `run` beats it; otherwise set `run` back to 0. Always add 1 to `i`. Return `longest`.',
        'The header is `while i < len(readings) and readings[i] != -1:`. Update the best straight after you lengthen the run: `if run > longest:` then `longest = run`.',
      ],
      solution: {
        code: `def longest_dry_spell(readings):
    longest = 0
    run = 0
    i = 0
    while i < len(readings) and readings[i] != -1:
        if readings[i] == 0.0:
            run = run + 1
            if run > longest:
                longest = run
        else:
            run = 0
        i = i + 1
    return longest`,
        explanation:
          'A marker would look for these steps (12 marks):\n\n' +
          '1. `longest`, `run` and `i` all set to 0 before the loop (2 marks). A batch with no dry days never touches `longest`, so it must already hold 0.\n' +
          '2. `while i < len(readings) and readings[i] != -1:` — the index check comes **first**, so a batch with no sentinel stops at the end of the list instead of raising IndexError, and an empty list runs zero passes (3 marks).\n' +
          '3. A dry day lengthens the run, any other reading resets it to 0 (3 marks). Resetting `longest` instead of `run` would throw away everything seen so far.\n' +
          '4. `if run > longest: longest = run` inside the dry branch, so the best is updated while the run is still going (2 marks). Updating only when a run **ends** misses a run that reaches the end of the batch, which is what `[3.0, 0.0]` checks.\n' +
          '5. `i = i + 1` outside the `if`, so it runs on wet days too, and `return longest` after the loop (2 marks).\n\n' +
          'On `[0.0, 0.0, 0.0, 1.0, 0.0, 0.0, -1]` the run reaches 3, drops to 0 at the wet day, climbs back to 2, and `longest` stays 3.',
      },
      selfExplain: 'Why must longest be updated inside the loop rather than after it?',
    },
  ],
};

export default scenario;
