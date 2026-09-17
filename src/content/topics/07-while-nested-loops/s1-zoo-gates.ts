// Topic 07, scenario 1: digit loops with % and // (Perth Zoo ticket gates).
import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't07-s1',
  title: 'Perth Zoo ticket gate checks',
  story:
    'The ticket gates and ticket booth at Perth Zoo in South Perth check numbers before they let anyone in or take any money. ' +
    'Every check here pulls a whole number apart one digit at a time, using `%` and `//` inside a `while` loop.',
  questions: [
    {
      id: 't07-s1-q1',
      format: 'trace',
      diff: 'medium',
      core: true,
      title: 'A gate number in binary',
      prompt:
        'The gate scanner sends numbers to the turnstile in binary. This loop converts 13 to a binary string.\n\n' +
        'Fill in `n` and `bits` each time **line 5** finishes, one row per pass of the loop. ' +
        '`bits` is a string, so write its values in quotes, for example `\'10\'`.',
      code: `n = 13
bits = ''
while n > 0:
    bits = str(n % 2) + bits
    n = n // 2
print(bits)`,
      watch: ['n', 'bits'],
      anchorLine: 5,
      concepts: ['while', 'digits', 'binary', 'floor-division', 'modulo'],
      detects: ['int_vs_float_division', 'off_by_one_range', 'accumulator_init'],
      expectedSec: 210,
      hints: [
        'Each pass does two things in order: take the remainder when `n` is divided by 2, then shrink `n` with whole-number division.',
        'Row 1: `13 % 2` is 1, so `bits` becomes `\'1\'`, then `13 // 2` is 6. Keep going. The pass that makes `n` equal 0 still gets a row, because the condition is only checked at the top of the loop.',
        'The first two rows are `n = 6, bits = \'1\'` and `n = 3, bits = \'01\'`. Each new bit goes on the front of the string.',
      ],
      solution: {
        explanation:
          'The condition `n > 0` is checked before every pass.\n\n' +
          '1. Pass 1: `13 % 2` is 1, so `bits` is `\'1\'`; `13 // 2` is 6.\n' +
          '2. Pass 2: `6 % 2` is 0, so `bits` is `\'01\'`; `6 // 2` is 3.\n' +
          '3. Pass 3: `3 % 2` is 1, so `bits` is `\'101\'`; `3 // 2` is 1.\n' +
          '4. Pass 4: `1 % 2` is 1, so `bits` is `\'1101\'`; `1 // 2` is 0.\n\n' +
          'Now `n > 0` is False, so the loop stops after 4 rows and the program prints `1101` (8 + 4 + 0 + 1 = 13). ' +
          'With `/` instead of `//`, `n` would become 6.5, 3.25 and so on. Halving a float takes more than a thousand passes to reach 0, and the bits would turn into decimals such as `\'0.5\'`.',
      },
      selfExplain: 'Why does the new bit go in front of bits instead of after it?',
    },
    {
      id: 't07-s1-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Digit sum',
      prompt:
        'As a quick typo check, the gate adds up the digits of a membership number. ' +
        'Fill in the blanks so `digit_sum(n)` returns the sum of the digits of a non-negative whole number `n`.\n\n' +
        'For example `digit_sum(4096)` returns `19` and `digit_sum(0)` returns `0`.',
      template: `def digit_sum(n):
    total = 0
    while n ⟦1⟧ 0:
        total = total + n ⟦2⟧ 10
        n = n ⟦3⟧ 10
    return total`,
      blanks: [
        { id: '1', accept: ['>', '!='] },
        { id: '2', accept: ['%'] },
        { id: '3', accept: ['//'] },
      ],
      fnName: 'digit_sum',
      tests: [
        { id: 'v1', call: 'digit_sum(4096)', expect: '19', label: '4096', hidden: false },
        { id: 'v2', call: 'digit_sum(123)', expect: '6', label: '123', hidden: false },
        { id: 'h1', call: 'digit_sum(0)', expect: '0', label: 'zero', hidden: true },
        { id: 'h2', call: 'digit_sum(7)', expect: '7', label: 'one digit', hidden: true },
        { id: 'h3', call: 'digit_sum(1000000)', expect: '1', label: 'zeros inside the number', hidden: true, tag: 'int_vs_float_division' },
      ],
      concepts: ['while', 'digits', 'modulo', 'floor-division', 'accumulator'],
      detects: ['int_vs_float_division', 'infinite_while'],
      expectedSec: 100,
      hints: [
        'The loop should keep going while there are digits left in `n`, and each pass should deal with one digit.',
        'Plan: stop when `n` has shrunk to 0. In the body, add the last digit to `total`, then remove that digit from `n`.',
        'The last digit of `n` is `n % 10`. To drop the last digit and keep `n` a whole number, use whole-number division by 10.',
      ],
      solution: {
        code: `def digit_sum(n):
    total = 0
    while n > 0:
        total = total + n % 10
        n = n // 10
    return total`,
        explanation:
          '- `while n > 0:` keeps looping while digits remain. `!= 0` works too for non-negative `n`.\n' +
          '- `n % 10` is the last digit: `4096 % 10` is 6.\n' +
          '- `n = n // 10` drops the last digit: `4096 // 10` is 409. The loop visits 6, 9, 0, 4 and `total` ends at 19.\n' +
          '- For `n = 0` the condition is False at the start, so the body never runs and 0 is returned.\n\n' +
          'Using `/` would make `n` a float (409.6) that only reaches 0 after hundreds of passes, giving a wrong decimal total.',
      },
      selfExplain: 'What goes wrong if blank 1 is >= instead of >?',
    },
    {
      id: 't07-s1-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Luhn check for bank cards',
      prompt:
        'Before the ticket booth charges a bank card, it checks the card number with the **Luhn check**. ' +
        'Write `luhn_valid(number)` that takes a positive whole number and returns `True` if it passes the check, otherwise `False`.\n\n' +
        'Work through the digits from the **right**:\n\n' +
        '1. The 1st, 3rd, 5th ... digit from the right is used as it is.\n' +
        '2. The 2nd, 4th, 6th ... digit from the right is doubled. If the doubled value is more than 9, subtract 9.\n' +
        '3. Add up all the values. The number passes when the total is divisible by 10.\n\n' +
        'Example: for `4539` the digits from the right are 9, 3, 5, 4, giving 9 + 6 + 5 + 8 = 28, so the answer is `False`.\n\n' +
        'Practise the digit loop: use `%` and `//` in a `while` loop rather than converting the number to a string. Return a bool, not a number.',
      fnName: 'luhn_valid',
      starter: `def luhn_valid(number):
    """Return True if number passes the Luhn check, otherwise False."""
    pass`,
      tests: [
        { id: 'v1', call: 'luhn_valid(79927398713)', expect: 'True', label: '79927398713 is valid', hidden: false },
        { id: 'v2', call: 'luhn_valid(4539)', expect: 'False', label: '4539 is not valid', hidden: false },
        { id: 'h1', call: 'luhn_valid(59)', expect: 'True', label: 'two digits, and a doubled digit over 9', hidden: true },
        { id: 'h2', call: 'luhn_valid(123)', expect: 'False', label: 'the rightmost digit is not doubled', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'luhn_valid(79927398710)', expect: 'False', label: 'last digit changed', hidden: true },
        { id: 'h4', call: 'luhn_valid(4556737586899855)', expect: 'True', label: '16-digit card number', hidden: true },
        { id: 'h5', call: 'luhn_valid(224444)', expect: 'True', label: 'valid number with small digits', hidden: true, tag: 'int_vs_float_division' },
      ],
      concepts: ['while', 'digits', 'modulo', 'floor-division', 'accumulator', 'boolean'],
      detects: ['int_vs_float_division', 'off_by_one_range', 'infinite_while', 'return_type_wrong'],
      expectedSec: 540,
      hints: [
        'You need to know which position each digit is in, counting from the right. The digit loop already visits digits from the right, so keep a counter alongside it.',
        'Plan: set `total = 0` and `position = 1` before the loop. Each pass: take the last digit, double it (and subtract 9 if over 9) when the position is even, add it to the total, drop the digit, and add 1 to the position. After the loop, return whether the total is divisible by 10.',
        'Inside `while number > 0:` start with `digit = number % 10` and `if position % 2 == 0:`. The last line of the function is `return total % 10 == 0`.',
      ],
      solution: {
        code: `def luhn_valid(number):
    total = 0
    position = 1
    while number > 0:
        digit = number % 10
        if position % 2 == 0:
            digit = digit * 2
            if digit > 9:
                digit = digit - 9
        total = total + digit
        number = number // 10
        position = position + 1
    return total % 10 == 0`,
        explanation:
          '- `total` and `position` are set once, before the loop. `position` counts digits from the right, starting at 1.\n' +
          '- `digit = number % 10` takes the rightmost digit still in `number`.\n' +
          '- `if position % 2 == 0:` picks the 2nd, 4th, 6th ... digits. They are doubled, and 9 is subtracted when the result is over 9 (for example 5 doubles to 10, which becomes 1).\n' +
          '- `number = number // 10` drops the digit so the next pass sees the next one, and the loop ends when no digits are left.\n' +
          '- `return total % 10 == 0` returns a bool directly instead of `if ...: return True else: return False`.\n\n' +
          'For 79927398713 the values from the right are 3, 2, 7, 7, 9, 6, 7, 4, 9, 9, 7, which add to 70, so it is valid.\n\n' +
          'Two slips the hidden tests catch: starting `position` at 0 doubles the wrong digits (so 123 would wrongly count as valid), and counting positions from the **left** only agrees with counting from the right when the number has an odd count of digits, so 59 and the 16-digit card number would fail.',
      },
      selfExplain: 'Why is it easier to count positions from the right with % and // than from the left?',
    },
  ],
};

export default scenario;
