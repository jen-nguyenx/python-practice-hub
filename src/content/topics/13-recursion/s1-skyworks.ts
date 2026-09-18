import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s1',
  title: 'Skyworks countdown',
  story:
    'Every Australia Day the Skyworks show lights up the Swan River. The launch crew\'s scripts use small recursive functions ' +
    'to count down, add up rockets and work out how many stars each burst makes.',
  questions: [
    {
      id: 't13-s1-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Which rockets function works?',
      prompt:
        'The rockets on each barge are stacked in a triangle: 1 rocket in the top row, 2 in the next, and so on down to `rows` rockets in the bottom row.\n\n' +
        '`rockets(rows)` should **return** the total number of rockets, so `rockets(4)` returns 10 and `rockets(0)` returns 0.\n\n' +
        'Which version is correct?',
      options: [
        {
          id: 'a',
          text: `def rockets(rows):
    if rows == 0:
        return 0
    return rows + rockets(rows - 1)`,
          correct: true,
          why:
            'Correct. `rows == 0` is the base case and returns 0 without another call. Every other call works on `rows - 1`, which gets closer to 0, and returns its own row plus the total for the smaller triangle: 4 + 3 + 2 + 1 + 0 = 10.',
        },
        {
          id: 'b',
          text: `def rockets(rows):
    return rows + rockets(rows - 1)`,
          mistake: 'missing_base_case',
          why:
            'There is no base case, so nothing ever stops the calls. `rockets(0)` calls `rockets(-1)`, then `rockets(-2)`, and so on until Python raises RecursionError.',
        },
        {
          id: 'c',
          text: `def rockets(rows):
    if rows == 0:
        return 0
    rows + rockets(rows - 1)`,
          mistake: 'recursion_result_ignored',
          why:
            'The last line works out `rows + rockets(rows - 1)` and then throws the value away, because there is no `return`. `rockets(1)` gives back `None`, so `rockets(2)` crashes with TypeError when it tries `2 + None`.',
        },
        {
          id: 'd',
          text: `def rockets(rows):
    if rows == 0:
        return 0
    print(rows + rockets(rows - 1))`,
          mistake: 'print_vs_return',
          why:
            '`print` shows the number but does not hand it back. `rockets(1)` prints 1 and returns `None`, so the call `rockets(2)` crashes with TypeError on `2 + None`.',
        },
      ],
      concepts: ['base-case', 'recursive-case', 'return'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'print_vs_return'],
      expectedSec: 90,
      hints: [
        'A recursive function needs three things: a case that stops, a call on a smaller input, and a `return` that hands the answer back. Check each version for all three.',
        'Run each version in your head for the smallest inputs: `rockets(0)`, then `rockets(1)`, then `rockets(2)`. Which ones give back a number every time?',
        'One version never stops calling itself, and two versions work out `rows + rockets(rows - 1)` without returning it.',
      ],
      solution: {
        explanation:
          'Version A is the only one with all three parts.\n\n' +
          '- Base case: `if rows == 0: return 0` stops the calls.\n' +
          '- Smaller input: `rockets(rows - 1)` moves one row closer to 0 each time.\n' +
          '- Return: `return rows + ...` passes the total back to the call that is waiting for it.\n\n' +
          '`rockets(4)` waits for `rockets(3)`, which waits for `rockets(2)`, then `rockets(1)`, then `rockets(0)`, which returns 0. The waiting calls then finish in reverse: 1 + 0 = 1, 2 + 1 = 3, 3 + 3 = 6, 4 + 6 = 10.\n\n' +
          'Version B has no base case (RecursionError). Versions C and D do not return the result, so a call gives back `None` and the call above it crashes adding a number to `None`.',
      },
      selfExplain: 'In version A, which call is the first one to return, and what value does it return?',
    },
    {
      id: 't13-s1-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Countdown to the show',
      prompt: 'The countdown script prints each number and then the name of the show. Choose exactly what this program prints.',
      code: `def countdown(n):
    if n == 0:
        print('Skyworks')
        return 'done'
    print(n)
    countdown(n - 1)

result = countdown(3)
print(result)`,
      choice: true,
      mutants: [
        {
          code: `def countdown(n):
    if n == 0:
        print('Skyworks')
        return 'done'
    print(n)
    return countdown(n - 1)

result = countdown(3)
print(result)`,
          mistake: 'recursion_result_ignored',
        },
        {
          code: `def countdown(n):
    if n == 0:
        print('Skyworks')
        return 'done'
    print(n)
    countdown(n - 1)

result = countdown(3)
if result is not None:
    print(result)`,
          mistake: 'print_vs_return',
        },
      ],
      concepts: ['call-stack', 'return', 'base-case'],
      detects: ['recursion_result_ignored', 'print_vs_return'],
      expectedSec: 90,
      hints: [
        'Follow the calls in order. `countdown(3)` prints before it calls `countdown(2)`. Then ask separately: what does the very first call, `countdown(3)`, give back?',
        'Only the call with `n == 0` reaches `return \'done\'`, and it hands `\'done\'` back to the call `countdown(1)`. Look at line 6: what does `countdown(1)` do with that value? And what does a function return when it reaches the end without a `return`?',
        'The first four lines are `3`, `2`, `1` and `Skyworks`. Line 6 calls `countdown(n - 1)` but does not return what it gets back.',
      ],
      solution: {
        explanation:
          '`countdown(3)` prints `3` and calls `countdown(2)`, which prints `2` and calls `countdown(1)`, which prints `1` and calls `countdown(0)`.\n\n' +
          '`countdown(0)` is the base case: it prints `Skyworks` and returns `\'done\'` to `countdown(1)`.\n\n' +
          'Line 6 in `countdown(1)` ignores that value. `countdown(1)` then reaches the end of the function without a `return`, so it returns `None`. The same happens in `countdown(2)` and `countdown(3)`.\n\n' +
          'So `result` is `None`, and the program prints:\n\n```\n3\n2\n1\nSkyworks\nNone\n```',
      },
      selfExplain: 'What one-word change to line 6 would make the last line print done?',
    },
    {
      id: 't13-s1-q3',
      format: 'trace',
      diff: 'easy',
      core: true,
      title: 'Stars in the finale',
      prompt:
        'The finale fires bursts of stars. Burst number k lights up k × k stars, and `stars(bursts)` adds up the stars for bursts 1 to `bursts`.\n\n' +
        'Fill in `bursts` and `this_burst` each time line 4 finishes running. Each call has its own copy of both variables.',
      code: `def stars(bursts):
    if bursts == 0:
        return 0
    this_burst = bursts * bursts
    return this_burst + stars(bursts - 1)

print(stars(4))`,
      watch: ['bursts', 'this_burst'],
      anchorLine: 4,
      concepts: ['call-stack', 'base-case', 'trace'],
      detects: ['off_by_one_range', 'scope_confusion'],
      expectedSec: 110,
      hints: [
        'A new row starts each time a new call reaches line 4. The first call is `stars(4)`.',
        'Each call reaches line 4, then line 5 calls `stars` with one less. Which call returns at line 3 and so never reaches line 4?',
        'Row 1 is `4` and `16`. Row 2 belongs to the call `stars(3)`.',
      ],
      solution: {
        explanation:
          'Line 4 runs once in each call that is not the base case, in the order the calls start:\n\n' +
          '1. `stars(4)`: `bursts` 4, `this_burst` 16\n' +
          '2. `stars(3)`: `bursts` 3, `this_burst` 9\n' +
          '3. `stars(2)`: `bursts` 2, `this_burst` 4\n' +
          '4. `stars(1)`: `bursts` 1, `this_burst` 1\n\n' +
          '`stars(0)` returns 0 at line 3, so there is no fifth row.\n\n' +
          'The additions on line 5 happen as the calls return, deepest first: 1 + 0 = 1, 4 + 1 = 5, 9 + 5 = 14, 16 + 14 = 30. The program prints `30`.',
      },
      selfExplain: 'Why is there no row for the call stars(0)?',
    },
    {
      id: 't13-s1-q4',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Sparks that split again',
      prompt:
        'A shell bursts into `splits` sparks. Each of those sparks bursts into `splits` sparks again, and so on, for `rounds` rounds of splitting. ' +
        'A shell with 0 rounds is still one spark, so `sparks(3, 0)` returns 1 and `sparks(3, 2)` returns 9.\n\n' +
        '`total_sparks(shells)` adds up the sparks for a list of `(splits, rounds)` tuples, and returns 0 for an empty list.\n\n' +
        'Fill the three gaps. Both functions must use recursion; no loops are allowed.',
      template: `def sparks(splits, rounds):
    """Return how many sparks one shell makes after rounds rounds of splitting."""
    if rounds == 0:
        return ⟦1⟧
    return splits * ⟦2⟧


def total_sparks(shells):
    """Return the total sparks for a list of (splits, rounds) shells."""
    if shells == []:
        return 0
    first = shells[0]
    return sparks(first[0], first[1]) + ⟦3⟧`,
      blanks: [
        { id: '1', accept: ['1'] },
        { id: '2', accept: ['sparks(splits, rounds - 1)'] },
        { id: '3', accept: ['total_sparks(shells[1:])'] },
      ],
      fnName: 'total_sparks',
      tests: [
        { id: 'v1', call: 'sparks(3, 2)', expect: '9', label: 'three sparks, split twice', hidden: false },
        { id: 'v2', call: 'total_sparks([(3, 2), (2, 3)])', expect: '17', label: 'two shells', hidden: false },
        { id: 'h1', call: 'sparks(4, 0)', expect: '1', label: 'a shell that never splits', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: 'total_sparks([])', expect: '0', label: 'no shells at all', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: 'sparks(2, 10)', expect: '1024', label: 'ten rounds of splitting', hidden: true },
        { id: 'h4', call: 'total_sparks([(5, 1)])', expect: '5', label: 'one shell in the list', hidden: true },
        { id: 'h5', call: 'total_sparks([(1, 4), (10, 2)])', expect: '101', label: 'a shell that splits into one spark', hidden: true },
      ],
      concepts: ['base-case', 'recursive-case', 'list-recursion', 'slicing'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'off_by_one_range'],
      expectedSec: 210,
      hints: [
        'Each gap is the answer to a smaller version of the same question. For `sparks`, what is the smallest number of rounds you can answer without thinking? For `total_sparks`, what is left after you have dealt with the first shell?',
        'Plan: a shell with 0 rounds is a single spark, so gap 1 is that count. One more round multiplies the count for one fewer round by `splits`, so gap 2 is the same function asked for `rounds - 1`. In `total_sparks`, the first shell has already been counted, so gap 3 is the total for every shell after it, which is the list from position 1 onwards.',
        '`shells[1:]` is the list without its first item, and it gets one item shorter on every call until it is `[]`.',
      ],
      solution: {
        code: `def sparks(splits, rounds):
    """Return how many sparks one shell makes after rounds rounds of splitting."""
    if rounds == 0:
        return 1
    return splits * sparks(splits, rounds - 1)


def total_sparks(shells):
    """Return the total sparks for a list of (splits, rounds) shells."""
    if shells == []:
        return 0
    first = shells[0]
    return sparks(first[0], first[1]) + total_sparks(shells[1:])`,
        explanation:
          '`sparks` is repeated multiplication written as recursion.\n\n' +
          '- Gap 1 is the base case: after 0 rounds the shell is still one spark, so the answer is `1`, not `0`. Returning 0 would make every multiplication above it 0 as well.\n' +
          '- Gap 2 makes the problem smaller in the only way available: `rounds - 1`. Each round multiplies the previous answer by `splits`, so `sparks(3, 2)` is 3 × 3 × 1 = 9. ' +
          'Calling `sparks(splits - 1, rounds)` instead would shrink the wrong number and never reach the base case for `rounds`.\n\n' +
          '`total_sparks` is the same shape, but over a list.\n\n' +
          '- The base case is the empty list, which contributes 0.\n' +
          '- `shells[0]` is the first `(splits, rounds)` tuple, and `first[0]` and `first[1]` unpack it.\n' +
          '- Gap 3 is the total for the rest of the list, `shells[1:]`. The `+` in front of it means the returned value is used, not thrown away: without the `return` and the `+`, the function would give back `None`.\n\n' +
          'For `[(3, 2), (2, 3)]`: 9 + (8 + 0) = 17.',
      },
      selfExplain: 'What would sparks(3, 2) return if gap 1 were 0 instead of 1?',
    },
  ],
};

export default scenario;
