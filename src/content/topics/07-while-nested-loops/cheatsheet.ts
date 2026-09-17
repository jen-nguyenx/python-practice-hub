// Topic 07 reference material: cheat sheet, worked example and common mistakes.
import type { Md, Topic } from '../../schema.ts';

const FENCE = '```';
const py = (...lines: string[]): string => [`${FENCE}python`, ...lines, FENCE].join('\n');

export const cheatsheet: Md = [
  '**while: repeat while a condition is True**',
  '',
  py(
    'n = 4096',
    'count = 0',
    'while n > 0:          # checked before every pass',
    '    count = count + 1',
    '    n = n // 10       # the update moves n towards 0',
    'print(count)          # 4',
  ),
  '',
  '- The condition is checked at the **top** of each pass, never halfway through the body. If it is False the first time, the body never runs.',
  '- Something in the body must change a variable in the condition on **every** pass, or the loop never ends. An update hidden inside an `if` is the usual culprit.',
  '- Use `for` when you know how many passes you need (each item, `range(n)`). Use `while` when you stop on a condition: digits running out, a sentinel value, a tolerance.',
  '- `break` leaves only the loop it is written in (the innermost one).',
  '',
  '**Digits with % and //**',
  '',
  py(
    'n % 10     # last digit:        4096 % 10  -> 6',
    'n // 10    # drop last digit:   4096 // 10 -> 409',
    'n % 2      # last binary digit: 13 % 2     -> 1',
    'n // 2     # drop a binary digit: 13 // 2  -> 6',
  ),
  '',
  '- For digits use `//`, never `/`. `4096 / 10` is `409.6`, and a `while n > 0` loop then runs hundreds of times on decimals.',
  '- `while n > 0` does not run at all when `n` is 0. Decide what 0 should give (digit sum 0, but binary `\'0\'`).',
  '- Building a string of digits: put the new digit in front, `bits = str(n % 2) + bits`, because the loop finds digits right to left.',
  '',
  '**Sentinel loops: stop at a special value**',
  '',
  py(
    'total = 0',
    'i = 0',
    'while i < len(readings) and readings[i] != -1:',
    '    total = total + readings[i]',
    '    i = i + 1',
  ),
  '',
  '- Put the bounds check **first**. `and` stops at the first False part, so `readings[i]` is never read past the end of the list.',
  '- With `input()`, read once before the loop and again as the last line of the body:',
  '',
  py(
    "line = input('Mark: ')",
    "while line != 'done':",
    '    total = total + int(line)',
    "    line = input('Mark: ')",
  ),
  '',
  '**Series summed to a tolerance**',
  '',
  py(
    'total = 0',
    'term = 1.0',
    'k = 0',
    'while abs(term) >= tol:   # keep terms that are still big enough',
    '    total = total + term  # use the current term first',
    '    k = k + 1',
    '    term = term / k       # next term built from the previous one',
    'result = round(total, 6)  # round once, at the very end',
  ),
  '',
  '- Never stop a float loop with `==` or `!=` (`while term != 0`). Floats are approximate, so compare against a tolerance.',
  '- `abs(term)` keeps an alternating series (+, -, +, ...) going when a term is negative.',
  '- Read the stop rule carefully: "while the term is at least tol" is `>=`. "Stop when a term is below tol" is the same loop, and that small term is not added.',
  '- Build each term from the previous one (a running factorial or power) instead of recomputing it. No `import math`.',
  '- Rounding inside the loop adds a small error on every pass. Round only the value you return.',
  '',
  '**Nested loops: every combination**',
  '',
  py(
    'for main in mains:            # outer loop: once per main',
    '    for drink in drinks:      # inner loop: runs in full for every main',
    "        print(main, '+', drink)",
  ),
  '',
  '- The inner body runs `len(mains) * len(drinks)` times. If any list is empty, it runs 0 times.',
  '- Each pair once, never an item with itself: `for i in range(len(xs)):` then `for j in range(i + 1, len(xs)):`.',
  '- A result for the whole job (`deals = []`, `total = 0`) goes **before the outer loop**. A value that restarts for each row goes inside the outer loop, before the inner loop.',
  '- Name loop variables after what they hold (`for stall in stalls`), so `i` and `j` do not get mixed up.',
  '',
  '**Merging two sorted lists without sort()**',
  '',
  '- Keep one index per list. While **both** indexes are in range, append the smaller front value and move only that index forward.',
  '- When one list runs out, copy the rest of the other list.',
  '',
  '**Tracing a while loop**',
  '',
  '- Write one row each time the last line of the body finishes. Check the condition before starting the next row.',
  '- The last row is the pass that makes the condition False; the loop then stops without another row.',
].join('\n');

export const workedExample: Topic['workedExample'] = {
  title: 'Approximating pi to a tolerance',
  code: `def approx_pi(tol):
    """Return 4 * (1 - 1/3 + 1/5 - 1/7 + ...), using every term
    whose size is at least tol, rounded to 4 decimal places."""
    total = 0
    k = 0
    term = 1.0
    while abs(term) >= tol:
        total = total + term
        k = k + 1
        term = (-1) ** k / (2 * k + 1)
    return round(4 * total, 4)`,
  steps: [
    '**Pick the loop.** The task says "keep adding while the term is big enough", which is a condition, not a known count, so this is a `while` loop. ' +
      'Work a small case by hand first: with `tol = 0.1` the terms 1, -1/3, 1/5, -1/7 and 1/9 are all at least 0.1 in size, and -1/11 (about 0.09) is not.',
    '**Set up before the loop.** `total = 0` because nothing has been added yet, `k = 0` counts which term we are on, and `term = 1.0` is the first term. ' +
      'The condition on the next line reads `term`, so it must exist before the loop starts.',
    '**Write the stop condition.** `abs(term) >= tol`: `abs` because every second term is negative, and `>=` because the spec says "at least". ' +
      'Never use `term != 0`; the terms get close to 0 but never equal it exactly.',
    '**Loop body: use the term, then move on.** Add the current term to `total` first, then add 1 to `k` and work out the next term, `(-1) ** k / (2 * k + 1)`. ' +
      'The size of the term shrinks on every pass, so the condition must eventually become False.',
    '**Round once, at the end.** Multiply by 4 and round in the `return` line. Rounding `total` inside the loop would add a little error on every pass.',
    '**Test the edges.** `approx_pi(0.1)` adds 5 terms and returns `3.3397`. `approx_pi(0.001)` returns `3.1396`. ' +
      '`approx_pi(2)` returns `0` because the first term is already smaller than `tol`, so the body never runs.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'infinite_while',
    bad: `i = 0
while readings[i] != -1:
    if readings[i] == 0:
        dry = dry + 1
        i = i + 1`,
    good: `i = 0
while readings[i] != -1:
    if readings[i] == 0:
        dry = dry + 1
    i = i + 1`,
    note: 'The update `i = i + 1` sits inside the `if`, so the first reading that is not 0 freezes the loop. The step that moves a `while` loop forward must run on **every** pass.',
  },
  {
    mistake: 'int_vs_float_division',
    bad: `while n > 0:
    total = total + n % 10
    n = n / 10`,
    good: `while n > 0:
    total = total + n % 10
    n = n // 10`,
    note: '`/` always gives a float, so 4096 becomes 409.6, 40.96 and so on, and the loop runs hundreds of times before `n` is 0. Use `//` to drop the last digit.',
  },
  {
    mistake: 'float_equality',
    bad: `while term != 0:
    total = total + term
    k = k + 1
    term = 1 / (2 * k + 1)`,
    good: `while abs(term) >= tol:
    total = total + term
    k = k + 1
    term = 1 / (2 * k + 1)`,
    note: 'The term 1/(2k + 1) gets closer and closer to 0 but never equals it, so the loop never stops. Floats are approximate: stop when the term is smaller than a tolerance.',
  },
  {
    mistake: 'round_mid_calc',
    bad: `while term >= tol:
    total = round(total + term, 6)
    k = k + 1
    term = round(term / k, 6)
result = total`,
    good: `while term >= tol:
    total = total + term
    k = k + 1
    term = term / k
result = round(total, 6)`,
    note: 'Every rounding inside the loop throws away a little precision, and the errors add up, so the last decimal place can come out wrong. Keep full precision and round once, at the end.',
  },
  {
    mistake: 'index_out_of_range',
    bad: `while readings[i] != -1 and i < len(readings):
    i = i + 1`,
    good: `while i < len(readings) and readings[i] != -1:
    i = i + 1`,
    note: '`and` checks its parts from left to right. If the list has no sentinel, the bad version reads `readings[i]` one past the end before it checks `i`, and crashes with IndexError.',
  },
  {
    mistake: 'accumulator_init',
    bad: `for main in mains:
    deals = []
    for drink in drinks:
        deals.append(main + ' + ' + drink)
print(deals)`,
    good: `deals = []
for main in mains:
    for drink in drinks:
        deals.append(main + ' + ' + drink)
print(deals)`,
    note: 'In nested loops, a list or total for the whole job must start before the **outer** loop. Here it restarts for every main, so only the last main\'s deals are left at the end.',
  },
];
