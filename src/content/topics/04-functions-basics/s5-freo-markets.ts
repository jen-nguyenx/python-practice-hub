import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s5',
  title: 'Fremantle Markets paperwork',
  story: md(
    'Tane runs a stall at the Fremantle Markets on the weekend and keeps the paperwork in a small Python file: the market fee, GST on a sale, the rent for the pitch and the coffee cart loyalty card.',
    'Every helper has to hand its answer back, because another function always uses it.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 predict
    {
      id: 't04-s5-q1',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'The fee that came back as None',
      prompt: 'The market office charges a fee only on the bigger stalls. Type exactly what this program prints, one line per printed line.',
      code: `def stall_fee(sales):
    """Return the market fee: 12% of sales, charged only on sales above $200."""
    if sales > 200:
        return round(sales * 0.12, 2)


fee = stall_fee(400)
print(fee)
print(stall_fee(150))`,
      mutants: [
        {
          // believes a function that reaches the end of its body gives back 0
          code: `def stall_fee(sales):
    """Return the market fee: 12% of sales, charged only on sales above $200."""
    if sales > 200:
        return round(sales * 0.12, 2)
    return 0


fee = stall_fee(400)
print(fee)
print(stall_fee(150))`,
          mistake: 'return_type_wrong',
        },
        {
          // believes showing the fee is the same as handing it back
          code: `def stall_fee(sales):
    """Return the market fee: 12% of sales, charged only on sales above $200."""
    if sales > 200:
        print(round(sales * 0.12, 2))


fee = stall_fee(400)
print(fee)
print(stall_fee(150))`,
          mistake: 'print_vs_return',
        },
      ],
      concepts: ['return', 'none', 'branches'],
      detects: ['return_type_wrong', 'print_vs_return'],
      expectedSec: 150,
      hints: [
        'Follow each call separately. For $150 of sales, which lines of the body actually run?',
        'A `return` inside an `if` only runs when that condition is true. Ask what a call gives back when the body finishes without meeting any `return` at all, and remember that `print` displays whatever it is given, even nothing-in-particular.',
        'The first call takes the `if` branch and gives back `48.0`. The second call runs no `return` at all, so the call is worth ...',
      ],
      solution: {
        explanation: md(
          '1. `stall_fee(400)`: `400 > 200` is true, so the function returns `round(48.0, 2)`, which is `48.0`. Line 7 stores it in `fee` and line 8 prints `48.0`.',
          '2. `stall_fee(150)`: `150 > 200` is false, so the `if` body is skipped. The function runs out of lines without reaching a `return`.',
          '3. A function that ends without a `return` gives back `None`, so line 9 prints `None`.',
          '',
          'Output:',
          '',
          '```',
          '48.0',
          'None',
          '```',
          '',
          'This is why a missing `else` is such an expensive bug: nothing crashes here, but the `None` travels on into the next calculation, where it raises a TypeError far away from the real mistake.',
        ),
      },
      selfExplain: 'What line would you add so that a stall with $150 of sales gets a fee of 0 instead of None?',
    },

    // ---------------------------------------------------------------- q2 fixBug
    {
      id: 't04-s5-q2',
      format: 'fixBug',
      diff: 'easy',
      core: true,
      title: 'The GST that was never worked out',
      prompt: md(
        "Tane's till crashes with `TypeError: unsupported operand type(s) for +: 'float' and 'function'` on every sale.",
        '',
        'Fix the code so that:',
        '- `gst(amount)` returns the GST on an amount: 10% of it, rounded to 2 decimal places',
        '- `total_with_gst(subtotal, delivery)` returns the subtotal plus the delivery plus the GST on that combined amount, rounded to 2 decimal places',
        '',
        'Change one line.',
      ),
      buggy: `def gst(amount):
    """Return the GST on an amount: 10% of it, rounded to 2 decimal places."""
    return round(amount * 0.1, 2)


def total_with_gst(subtotal, delivery):
    """Return subtotal plus delivery plus the GST on that, rounded to 2 decimal places."""
    amount = subtotal + delivery
    return round(amount + gst, 2)`,
      bugMistake: 'forgot_to_call',
      maxChangedLines: 1,
      fnName: 'total_with_gst',
      tests: [
        { id: 'v1', call: 'gst(50)', expect: '5.0', cmp: 'float', label: 'GST on $50', hidden: false },
        { id: 'v2', call: 'total_with_gst(50, 5)', expect: '60.5', cmp: 'float', label: 'a $50 sale with $5 delivery', hidden: false, tag: 'forgot_to_call' },
        { id: 'h1', call: 'total_with_gst(120, 15)', expect: '148.5', cmp: 'float', label: 'a larger sale', hidden: true, tag: 'forgot_to_call' },
        { id: 'h2', call: 'total_with_gst(0, 0)', expect: '0.0', cmp: 'float', label: 'nothing sold', hidden: true, tag: 'forgot_to_call' },
        { id: 'h3', call: 'total_with_gst(19.99, 0)', expect: '21.99', cmp: 'float', label: 'a price with cents', hidden: true },
      ],
      concepts: ['calling-functions', 'return', 'helper-functions'],
      detects: ['forgot_to_call'],
      expectedSec: 110,
      hints: [
        'The message says something of type `function` turned up in a sum. Where in the code is a function named but never run?',
        'A function only runs when its name is followed by brackets and the arguments it needs. `gst` needs to be told which amount to work on.',
        'The last line should add `gst(amount)`, not `gst`.',
      ],
      solution: {
        code: `def gst(amount):
    """Return the GST on an amount: 10% of it, rounded to 2 decimal places."""
    return round(amount * 0.1, 2)


def total_with_gst(subtotal, delivery):
    """Return subtotal plus delivery plus the GST on that, rounded to 2 decimal places."""
    amount = subtotal + delivery
    return round(amount + gst(amount), 2)`,
        explanation: md(
          '1. `gst` was already correct: it works out 10% of the amount and returns it.',
          '2. In the buggy last line, `gst` with no brackets is the function object itself, not a number. Adding a float to a function is meaningless, so Python raises `TypeError: unsupported operand type(s) for +: \'float\' and \'function\'`.',
          '3. `gst(amount)` runs the function with the combined amount and hands back a number, which can be added.',
          '4. For a $50 sale with $5 delivery: `amount` is 55, `gst(55)` is 5.5, and the total is 60.5.',
        ),
      },
      selfExplain: 'Why did the error mention a function rather than saying gst was never called?',
    },

    // ---------------------------------------------------------------- q3 write
    {
      id: 't04-s5-q3',
      format: 'write',
      kind: 'function',
      diff: 'medium',
      core: true,
      title: 'Rent for the pitch',
      prompt: md(
        'The markets charge for a stall by the day. Write two functions.',
        '',
        '1. `day_rate(powered)` returns the rate for one day as an **int**: `48` for an ordinary stall and `63` when `powered` is `True`.',
        '2. `stall_rent(days, powered)` returns the rent for `days` days, **rounded to 2 decimal places**. Work the daily rate out by calling `day_rate`; do not repeat the numbers. A booking of 5 days or more gets 10% off the whole rent.',
        '',
        'Return both results; do not print them. For example, `stall_rent(3, True)` returns `189` and `stall_rent(5, False)` returns `216.0`.',
      ),
      fnName: 'stall_rent',
      starter: `def day_rate(powered):
    """Return the rate for one day: 48, or 63 for a powered stall."""
    pass


def stall_rent(days, powered):
    """Return the rent for days days, rounded to 2 dp, with 10% off from 5 days."""
    pass`,
      tests: [
        { id: 'v1', call: 'day_rate(True)', expect: '63', label: 'powered stall, one day', hidden: false },
        { id: 'v2', call: 'stall_rent(3, True)', expect: '189', label: 'three powered days, no discount', hidden: false },
        { id: 'v3', call: 'stall_rent(5, False)', expect: '216.0', cmp: 'float', label: 'five plain days, discounted', hidden: false },
        { id: 'h1', call: 'day_rate(False)', expect: '48', label: 'plain stall, one day', hidden: true },
        { id: 'h2', call: 'stall_rent(4, False)', expect: '192', label: 'four days is one short of the discount', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'stall_rent(5, True)', expect: '283.5', cmp: 'float', label: 'discount starts at exactly 5 days', hidden: true, tag: 'off_by_one_range' },
        { id: 'h4', call: 'stall_rent(10, False)', expect: '432.0', cmp: 'float', label: 'a ten-day run', hidden: true },
        { id: 'h5', call: 'stall_rent(0, True)', expect: '0', label: 'booking cancelled before it started', hidden: true },
        { id: 'h6', call: 'stall_rent(1, True)', expect: '63', label: 'a single powered day', hidden: true },
      ],
      concepts: ['helper-functions', 'return', 'parameters', 'round'],
      detects: ['forgot_to_call', 'print_vs_return', 'off_by_one_range'],
      expectedSec: 300,
      hints: [
        '`powered` arrives as `True` or `False`, so `day_rate` only has to choose between two numbers and hand one back.',
        'Plan for `stall_rent`: call `day_rate(powered)` once and keep the result in a variable. Multiply it by `days`. If `days` is 5 or more, take 10% off by multiplying by 0.9. Round the answer to 2 decimal places and return it.',
        md(
          '```python',
          'rent = days * day_rate(powered)',
          'if days >= 5:',
          '    rent = rent * 0.9',
          '```',
        ),
      ],
      solution: {
        code: `def day_rate(powered):
    """Return the rate for one day: 48, or 63 for a powered stall."""
    if powered:
        return 63
    return 48


def stall_rent(days, powered):
    """Return the rent for days days, rounded to 2 dp, with 10% off from 5 days."""
    rent = days * day_rate(powered)
    if days >= 5:
        rent = rent * 0.9
    return round(rent, 2)`,
        explanation: md(
          '1. `day_rate` returns one of two numbers. `if powered:` is enough, because `powered` is already `True` or `False`; `if powered == True:` adds nothing.',
          '2. `stall_rent` calls `day_rate(powered)` once and multiplies by `days`. The rate lives in one place, so a price rise is a one-line change.',
          '3. `days >= 5` is the discount rule: 5 days is discounted, 4 days is not. With `days > 5` a five-day booking would be charged full price.',
          '4. `round(rent, 2)` happens once, at the end. For 5 plain days: `5 * 48` is 240, `240 * 0.9` is 216.0.',
          '5. Both functions `return` their answer, so `stall_rent` can use what `day_rate` gives back.',
        ),
      },
      selfExplain: 'Why is the rate worked out by calling day_rate instead of writing 48 and 63 again inside stall_rent?',
    },

    // ---------------------------------------------------------------- q4 write
    {
      id: 't04-s5-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Coffee cart loyalty card',
      prompt: md(
        'The coffee cart next to the stall gives one stamp for every whole $10 spent in a single visit, plus one bonus stamp if that visit comes to $50 or more. Eight stamps buy a free coffee, and eight more buy another.',
        '',
        'Write three functions. `spend` is an amount of dollars that may have cents; `stamps_now` is how many stamps the card already has.',
        '',
        '1. `stamps_earned(spend)` returns the stamps earned by one visit, as an **int**.',
        '2. `free_coffees(spend, stamps_now)` returns how many free coffees the card pays for once the visit is added, as an **int**. Call `stamps_earned`.',
        '3. `stamps_left(spend, stamps_now)` returns the stamps still on the card after those free coffees are taken off, as an **int**.',
        '',
        'For example, `stamps_earned(47.5)` returns `4`, `stamps_earned(50)` returns `6`, `free_coffees(50, 3)` returns `1` and `stamps_left(50, 3)` returns `1`.',
      ),
      fnName: 'free_coffees',
      starter: `def stamps_earned(spend):
    """Return the stamps earned by one visit: one per whole $10, plus one from $50."""
    pass


def free_coffees(spend, stamps_now):
    """Return how many free coffees the card pays for after this visit."""
    pass


def stamps_left(spend, stamps_now):
    """Return the stamps left on the card after the free coffees are taken off."""
    pass`,
      tests: [
        { id: 'v1', call: 'stamps_earned(47.5)', expect: '4', label: '$47.50 in one visit', hidden: false },
        { id: 'v2', call: 'free_coffees(50, 3)', expect: '1', label: '$50 on a card with 3 stamps', hidden: false },
        { id: 'v3', call: 'stamps_left(50, 3)', expect: '1', label: 'stamps left after that visit', hidden: false },
        { id: 'h1', call: 'isinstance(stamps_earned(47.5), int)', expect: 'True', label: 'stamps come back as an int, not a float', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h2', call: 'stamps_earned(49.99)', expect: '4', label: 'one cent short of the bonus', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'stamps_earned(9.99)', expect: '0', label: 'not even one whole $10', hidden: true },
        { id: 'h4', call: 'stamps_earned(0)', expect: '0', label: 'nothing spent', hidden: true },
        { id: 'h5', call: 'free_coffees(200, 0)', expect: '2', label: 'a big order earns two coffees at once', hidden: true },
        { id: 'h6', call: 'stamps_left(200, 0)', expect: '5', label: 'stamps left after two coffees', hidden: true },
        { id: 'h7', call: 'free_coffees(5, 7)', expect: '0', label: 'still one stamp short', hidden: true, tag: 'off_by_one_range' },
        { id: 'h8', call: 'stamps_left(5, 7)', expect: '7', label: 'a small visit leaves the card as it was', hidden: true },
        { id: 'h9', call: 'free_coffees(80, 0)', expect: '1', label: 'exactly one full card', hidden: true },
      ],
      concepts: ['helper-functions', 'floor-division', 'modulo', 'return-int'],
      detects: ['int_vs_float_division', 'forgot_to_call', 'off_by_one_range', 'print_vs_return', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'Write `stamps_earned` first and test it on its own. The other two both start from the same number: the stamps on the card plus the stamps this visit earns.',
        'Plan: `stamps_earned` divides the spend by 10 keeping only whole tens, then adds 1 when the spend is at least 50. `free_coffees` adds `stamps_now` to that and asks how many whole eights are in the result. `stamps_left` asks what is left over from those eights.',
        md(
          '`spend // 10` is a float when `spend` is a float, so wrap it in `int(...)`. Then:',
          '',
          '```python',
          'total = stamps_now + stamps_earned(spend)',
          'return total // 8',
          '```',
        ),
      ],
      solution: {
        code: `def stamps_earned(spend):
    """Return the stamps earned by one visit: one per whole $10, plus one from $50."""
    stamps = int(spend // 10)
    if spend >= 50:
        stamps = stamps + 1
    return stamps


def free_coffees(spend, stamps_now):
    """Return how many free coffees the card pays for after this visit."""
    total = stamps_now + stamps_earned(spend)
    return total // 8


def stamps_left(spend, stamps_now):
    """Return the stamps left on the card after the free coffees are taken off."""
    total = stamps_now + stamps_earned(spend)
    return total % 8`,
        explanation: md(
          '1. `spend // 10` counts the whole tens: `47.5 // 10` is `4.0`. Because the spend can have cents, that result is a float, so `int(...)` turns it into the int the task asks for.',
          '2. `if spend >= 50:` adds the bonus stamp. `>=` matters: $50 exactly earns it, $49.99 does not.',
          '3. `free_coffees` calls `stamps_earned` instead of repeating its rules, adds the stamps already on the card, and `total // 8` counts the whole cards. 21 stamps give 2 coffees.',
          '4. `stamps_left` starts from the same total and uses `%`, the leftover after taking out whole eights: `21 % 8` is 5.',
          '5. Both `//` and `%` on two ints give ints, so all three functions return ints as required.',
        ),
      },
      selfExplain: 'Why does stamps_earned need int() when free_coffees does not?',
    },
  ],
};

export default scenario;
