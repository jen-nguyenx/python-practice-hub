import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s3',
  title: 'Rottnest quokka survey',
  story: md(
    'Researchers on Rottnest Island (Wadjemup) count the quokkas every year.',
    'Their scripts use small functions for density, the change between seasons and a simple growth model.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 mcq
    {
      id: 't04-s3-q1',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'Calling the density function',
      prompt: "The latest survey counted 11200 quokkas on Rottnest's 1900 hectares. The program already contains the function below. Which line, added underneath it, displays `5.9`?",
      code: `def quokka_density(count, area):
    """Return quokkas per hectare, rounded to 1 decimal place."""
    return round(count / area, 1)`,
      options: [
        {
          id: 'a',
          text: 'print(quokka_density(11200, 1900))',
          correct: true,
          why: 'The call passes 11200 as `count` and 1900 as `area`, and `print` shows the value the call returns: `5.9`.',
        },
        {
          id: 'b',
          text: 'print(quokka_density(count, area))',
          mistake: 'scope_confusion',
          why: "`count` and `area` are parameter names. They exist only inside the function while a call is running, so this line raises `NameError: name 'count' is not defined`.",
        },
        {
          id: 'c',
          text: 'quokka_density(11200, 1900)',
          mistake: 'print_vs_return',
          why: 'This works out 5.9 and returns it, but nothing prints it. In a script a returned value is not displayed on its own. Only the Thonny shell echoes it.',
        },
        {
          id: 'd',
          text: 'print(quokka_density)',
          mistake: 'forgot_to_call',
          why: 'Without brackets this names the function instead of calling it, so it shows something like `<function quokka_density at 0x...>`.',
        },
      ],
      concepts: ['arguments', 'calling-functions', 'return'],
      detects: ['scope_confusion', 'print_vs_return', 'forgot_to_call'],
      expectedSec: 60,
      hints: [
        'A line displays something only if it calls `print`. A function only runs if its name is followed by brackets.',
        'Check each line for three things: is there a `print`, is the function actually called, and are the arguments values that exist at that point in the program?',
        'The arguments must be the survey numbers themselves, in the same order as the parameters `count, area`.',
      ],
      solution: {
        explanation: md(
          '- (a) is correct: it calls the function with real values and prints the returned `5.9`.',
          '- (b) uses the parameter names outside the function, where they do not exist, so it raises `NameError`.',
          '- (c) calls the function but throws the returned value away, so nothing appears.',
          '- (d) forgets the brackets, so it prints the function object instead of calling it.',
        ),
      },
      selfExplain: 'Why does the Thonny shell show 5.9 for quokka_density(11200, 1900) even without print?',
    },

    // ---------------------------------------------------------------- q2 errorTranslator
    {
      id: 't04-s3-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'Where did total go?',
      prompt: 'This season-change script crashes before it prints anything. Click the line that raised the error, choose the exception type, then choose the cause and fix.',
      code: `def adults_next_season(adults, joeys, survival_rate):
    """Return next season's adults: this season's adults plus the joeys that survive."""
    survivors = int(joeys * survival_rate)
    total = adults + survivors
    return total


adults_next_season(850, 400, 0.45)
print('Adults next season:', total)`,
      exceptionOptions: ['NameError', 'TypeError', 'ValueError', 'AttributeError'],
      causes: [
        {
          id: 'a',
          correct: true,
          text: '`total` only exists inside `adults_next_season` while the call runs, and line 8 throws the returned value away. Store it, for example `adults = adults_next_season(850, 400, 0.45)`, and print `adults`.',
        },
        {
          id: 'b',
          mistake: 'scope_confusion',
          text: '`total` has to exist before the function is defined. Add `total = 0` at the top of the program so the function can fill it in.',
        },
        {
          id: 'c',
          mistake: 'print_vs_return',
          text: '`return` cannot send a value out of a function. Change `return total` to `print(total)` and delete line 9.',
        },
      ],
      concepts: ['local-variables', 'return', 'name-error'],
      detects: ['scope_confusion', 'print_vs_return'],
      expectedSec: 150,
      hints: [
        'The error message names a variable. Where in the program is that variable created?',
        'Names created inside a function, including its parameters, disappear when the call ends. Only the returned value survives, and only if the line that called the function stores it or uses it.',
        'Line 8 should start with a new variable name and `=` so the returned value is kept.',
      ],
      solution: {
        explanation: md(
          '1. Lines 1-5 define the function. Nothing runs yet.',
          "2. Line 8 calls it. Inside the call `survivors` is `int(400 * 0.45)`, which is 180, and `total` is 1030. The call returns 1030, but line 8 does not store it, so the value is lost.",
          "3. When the call ends, its local names (`adults`, `joeys`, `survival_rate`, `survivors`, `total`) are gone. Line 9 asks for `total`, so Python raises `NameError: name 'total' is not defined` on line 9.",
          '4. Fix: `adults = adults_next_season(850, 400, 0.45)` then `print(\'Adults next season:\', adults)`.',
          '',
          'Adding `total = 0` at the top would stop the crash but print 0, because the `total` inside the function is a separate local variable.',
        ),
      },
      selfExplain: 'If you added total = 0 at the top of the program, what would line 9 print, and why?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't04-s3-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Years until the colony recovers',
      prompt: md(
        'A simple model of one quokka colony: each year the count grows by 8% (whole quokkas only, so the growth is `count * 8 // 100`), then 25 quokkas are lost over the dry summer. The count can never go below 0.',
        '',
        'Write two functions:',
        '',
        "1. `next_count(count)` returns next year's count using the model above.",
        '2. `years_to_reach(count, target, max_years)` returns how many years it takes for the count to reach **at least** `target`. Move forward one year at a time by calling `next_count`. Return `0` if `count` is already at least `target`, and `-1` if the target is still not reached after `max_years` years.',
        '',
        'Both functions return an int. For example, `next_count(1000)` returns `1055` and `years_to_reach(1000, 1100, 10)` returns `2`.',
      ),
      fnName: 'years_to_reach',
      starter: `def next_count(count):
    """Return next year's quokka count: 8% growth in whole quokkas, minus 25, never below 0."""
    pass


def years_to_reach(count, target, max_years):
    """Return the years until count reaches target: 0 if already there, -1 if not within max_years."""
    pass`,
      tests: [
        { id: 'v1', call: 'next_count(1000)', expect: '1055', label: 'next year from 1000', hidden: false },
        { id: 'v2', call: 'years_to_reach(1000, 1100, 10)', expect: '2', label: 'reaches the target in year 2', hidden: false },
        { id: 'h1', call: 'next_count(20)', expect: '0', label: 'tiny colony cannot go below 0', hidden: true },
        { id: 'h2', call: 'years_to_reach(1200, 1100, 5)', expect: '0', label: 'already at the target', hidden: true },
        { id: 'h3', call: 'years_to_reach(1000, 1055, 1)', expect: '1', label: 'reached in the last allowed year', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'years_to_reach(300, 400, 20)', expect: '-1', label: 'shrinking colony never reaches the target', hidden: true },
        { id: 'h5', call: 'years_to_reach(1000, 1500, 20)', expect: '8', label: 'takes 8 years', hidden: true, tag: 'early_return_in_loop' },
        { id: 'h6', call: 'years_to_reach(1000, 1500, 7)', expect: '-1', label: 'runs out of years just before the target', hidden: true },
      ],
      concepts: ['helper-functions', 'return-in-loop', 'for-range', 'edge-cases'],
      detects: ['early_return_in_loop', 'off_by_one_range', 'print_vs_return', 'forgot_to_call'],
      expectedSec: 600,
      hints: [
        'Write and test `next_count` on its own first. For `years_to_reach`, ask yourself: at what point do you know for certain that the answer is -1?',
        'Plan for `years_to_reach`: if the count already reaches the target, return 0. Loop over the years 1 to `max_years`. In each pass replace `count` with `next_count(count)`, then return the year if the target has been reached. Only after the loop has finished, return -1.',
        md(
          '```python',
          'for year in range(1, max_years + 1):',
          '    count = next_count(count)',
          '    if count >= target:',
          '        return year',
          '```',
        ),
      ],
      solution: {
        code: `def next_count(count):
    """Return next year's quokka count: 8% growth in whole quokkas, minus 25, never below 0."""
    new_count = count + count * 8 // 100 - 25
    if new_count < 0:
        return 0
    return new_count


def years_to_reach(count, target, max_years):
    """Return the years until count reaches target: 0 if already there, -1 if not within max_years."""
    if count >= target:
        return 0
    for year in range(1, max_years + 1):
        count = next_count(count)
        if count >= target:
            return year
    return -1`,
        explanation: md(
          '1. `next_count` works out `count + count * 8 // 100 - 25`. `//` keeps the growth a whole number. If the result is negative it returns 0 instead.',
          '2. `years_to_reach` handles the already-there case first and returns 0 before any year passes.',
          '3. `range(1, max_years + 1)` numbers the years 1, 2, ..., `max_years`. The `+ 1` matters: with `range(1, max_years)` the last allowed year is never checked.',
          '4. Each pass calls `next_count(count)` and stores the returned value back in `count`. As soon as the count reaches the target, `return year` ends the function.',
          '5. `return -1` sits after the loop, so it runs only when every year has been checked. An `else: return -1` inside the loop would give up after year 1.',
        ),
      },
      selfExplain: 'Why would putting else: return -1 inside the loop break years_to_reach(1000, 1100, 10)?',
    },
  ],
};

export default scenario;
