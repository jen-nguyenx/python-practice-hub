import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't04-s1',
  title: 'SmartRider fares',
  story: md(
    "Transperth's journey planner is built from small functions: one works out a fare, another tops up a SmartRider card.",
    'Each function only helps the rest of the program if it hands its answer back with `return`.',
  ),
  questions: [
    // ---------------------------------------------------------------- q1 mcq
    {
      id: 't04-s1-q1',
      format: 'mcq',
      diff: 'easy',
      core: true,
      title: 'Printed, but not returned',
      prompt: 'A first draft of the fare function is below. What does this program display when it runs?',
      code: `def fare(zones):
    print(zones * 2.5)

x = fare(2)
print(x)`,
      options: [
        {
          id: 'a',
          text: '5.0\nNone',
          correct: true,
          why: 'Calling `fare(2)` runs the body, so `print` shows `5.0`. The function has no `return`, so the call gives back `None`, which is stored in `x` and printed on line 5.',
        },
        {
          id: 'b',
          text: '5.0\n5.0',
          mistake: 'print_vs_return',
          why: '`print` only shows a value on the screen. It does not hand the value back, so `x` does not receive `5.0`. It receives `None`.',
        },
        {
          id: 'c',
          text: 'None',
          mistake: 'print_vs_return',
          why: 'Line 4 still runs the body of `fare`, even though the result is being stored. That `print` shows `5.0` before line 5 runs.',
        },
        {
          id: 'd',
          text: '5.0',
          mistake: 'print_vs_return',
          why: 'Two lines show output. The `print` inside `fare` shows `5.0` when line 4 calls it, and line 5 then prints what the call gave back, which is `None`. `print(None)` still shows `None`.',
        },
      ],
      concepts: ['return', 'print-vs-return', 'none'],
      detects: ['print_vs_return'],
      expectedSec: 60,
      hints: [
        'A function can do two separate things: show something on the screen, and hand a value back to the line that called it. Which of these does `fare` do?',
        'Go line by line. Line 4 calls `fare(2)`, which runs the body. Then ask what value that call gives back to be stored in `x`. Line 5 prints whatever `x` holds.',
        'Line 4 shows `5.0` while the body runs. `fare` has no `return` line, so `x = fare(2)` stores ...',
      ],
      solution: {
        explanation: md(
          '1. Lines 1-2 only define `fare`. Nothing is shown yet.',
          '2. Line 4 calls `fare(2)`. Inside, `zones` is 2, so `print(zones * 2.5)` shows `5.0`.',
          '3. The body ends without a `return`, so the call gives back `None`. Line 4 stores `None` in `x`.',
          '4. Line 5 prints `x`, which shows `None`.',
          '',
          'The output is `5.0` then `None` on the next line.',
        ),
      },
      selfExplain: 'What one-word change inside fare would make x hold 5.0?',
    },

    // ---------------------------------------------------------------- q2 predict
    {
      id: 't04-s1-q2',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Topping up a card',
      prompt: 'Aisha has $10 on her SmartRider and tops up $20. Choose exactly what this program prints.',
      code: `def top_up(balance, amount):
    balance = balance + amount
    return balance

balance = 10
new_balance = top_up(balance, 20)
print(balance)
print(new_balance)`,
      choice: true,
      mutants: [
        {
          // believes the function changes the caller's balance variable
          code: `balance = 10
balance = balance + 20
new_balance = balance
print(balance)
print(new_balance)`,
          mistake: 'scope_confusion',
        },
        {
          // believes return balance sends back the outside balance (10)
          code: `balance = 10
new_balance = balance
print(balance)
print(new_balance)`,
          mistake: 'scope_confusion',
        },
      ],
      concepts: ['parameters', 'local-variables', 'return'],
      detects: ['scope_confusion'],
      expectedSec: 90,
      hints: [
        'Inside `top_up`, `balance` is a parameter. A parameter is a local name that belongs to one call of the function.',
        'Keep two separate boxes named balance: the one outside the function (10), and the one inside the call, which starts with the value 10. Which box does line 2 change? Which box does line 7 print?',
        'Inside the call, the local `balance` becomes 30 and is returned into `new_balance`. The outside `balance` is still ...',
      ],
      solution: {
        explanation: md(
          '1. Line 5 sets the outside `balance` to 10.',
          '2. Line 6 calls `top_up(10, 20)`. Inside the call, the parameter `balance` starts at 10 and `amount` is 20.',
          '3. Line 2 changes only the local `balance`, to 30. Line 3 returns 30, which line 6 stores in `new_balance`.',
          '4. The call has ended, so the local names are gone. The outside `balance` was never assigned again, so line 7 prints `10`.',
          '5. Line 8 prints `30`.',
        ),
      },
      selfExplain: 'How would you change line 6 so that the outside balance becomes 30?',
    },

    // ---------------------------------------------------------------- q3 fixBug
    {
      id: 't04-s1-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The fare that crashes the planner',
      prompt: md(
        "Kwame's journey planner crashes with `TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'` whenever it asks for a SmartRider fare, even though the right cash fare appears on the screen first.",
        '',
        'Fix the code so that:',
        '- `cash_fare(zones)` returns `3.2` for 1 or 2 zones and `4.9` for 3 or more zones',
        '- `smartrider_fare(zones)` returns the cash fare less 10%, rounded to 2 decimal places',
        '',
        'Change at most 2 lines.',
      ),
      buggy: `def cash_fare(zones):
    """Return the cash fare for a trip through the given number of zones."""
    if zones <= 2:
        print(3.2)
    else:
        print(4.9)


def smartrider_fare(zones):
    """Return the SmartRider fare: 10% off the cash fare, rounded to 2 decimal places."""
    return round(cash_fare(zones) * 0.9, 2)`,
      bugMistake: 'print_vs_return',
      maxChangedLines: 2,
      fnName: 'smartrider_fare',
      tests: [
        { id: 'v1', call: 'cash_fare(1)', expect: '3.2', cmp: 'float', label: 'cash fare, 1 zone', hidden: false, tag: 'print_vs_return' },
        { id: 'v2', call: 'smartrider_fare(2)', expect: '2.88', cmp: 'float', label: 'SmartRider fare, 2 zones', hidden: false },
        { id: 'h1', call: 'cash_fare(3)', expect: '4.9', cmp: 'float', label: 'cash fare, 3 zones', hidden: true, tag: 'print_vs_return' },
        { id: 'h2', call: 'smartrider_fare(3)', expect: '4.41', cmp: 'float', label: 'first trip on the higher fare', hidden: true },
        { id: 'h3', call: 'smartrider_fare(8)', expect: '4.41', cmp: 'float', label: 'long trip, 8 zones', hidden: true },
      ],
      concepts: ['return', 'print-vs-return', 'helper-functions'],
      detects: ['print_vs_return'],
      expectedSec: 180,
      hints: [
        'The error says one side of `*` is `None`. Which function call on that line could be giving back `None`?',
        '`cash_fare` shows each fare on the screen but never hands it back. In both branches, swap the showing for handing back. `smartrider_fare` is already correct.',
        'The first branch of `cash_fare` should read `return 3.2`.',
      ],
      solution: {
        code: `def cash_fare(zones):
    """Return the cash fare for a trip through the given number of zones."""
    if zones <= 2:
        return 3.2
    else:
        return 4.9


def smartrider_fare(zones):
    """Return the SmartRider fare: 10% off the cash fare, rounded to 2 decimal places."""
    return round(cash_fare(zones) * 0.9, 2)`,
        explanation: md(
          '1. `smartrider_fare` calls `cash_fare(zones)` and multiplies the result by 0.9.',
          '2. In the buggy version `cash_fare` prints the fare and then reaches the end of its body, so it gives back `None`. That is why the correct fare appeared on the screen just before the crash: `None * 0.9` raises the `TypeError`.',
          '3. Changing both `print(...)` lines to `return ...` hands the fare back. For 2 zones, `cash_fare` returns 3.2, and `round(3.2 * 0.9, 2)` is 2.88.',
          '4. For 3 or more zones the `else` branch returns 4.9, and the SmartRider fare is 4.41.',
        ),
      },
      selfExplain: 'Why did the correct cash fare still appear on the screen just before the crash?',
    },

    // ---------------------------------------------------------------- q4 multi
    {
      id: 't04-s1-q4',
      format: 'multi',
      diff: 'easy',
      core: true,
      title: 'Which arguments go where',
      prompt: md(
        'The planner also works out the cost of a batch of journeys. `concession` is a percentage off, so 50 means half price.',
        '',
        'Select **every** statement that is true.',
      ),
      code: `def journey_cost(trips, fare, concession):
    """Return the cost of trips journeys at fare dollars each, less a concession discount."""
    return round(trips * fare * (100 - concession) / 100, 2)`,
      options: [
        {
          id: 'a',
          text: 'journey_cost(10, 3.2, 50) gives back 16.0',
          correct: true,
          why: '`trips` is 10, `fare` is 3.2 and `concession` is 50, so the full cost is 32.0 and half of that is 16.0.',
        },
        {
          id: 'b',
          text: 'journey_cost(50, 3.2, 10) gives back the same value, because the same three numbers are passed in',
          correct: false,
          why: 'Arguments are matched to parameters by position, not by size. This call means 50 trips at $3.20 with 10% off, which is 144.0.',
        },
        {
          id: 'c',
          text: 'journey_cost(10, 3.2) stops the program with a TypeError about a missing required positional argument',
          correct: true,
          why: 'The function has three parameters and no defaults, so every call must supply three arguments. Python names the missing one, `concession`, in the message.',
        },
        {
          id: 'd',
          text: 'total = journey_cost is a shorter way of calling the function and puts the cost in total',
          correct: false,
          mistake: 'forgot_to_call',
          why: 'Without brackets there is no call. This stores the function itself in `total`, so a later `total * 2` raises a TypeError instead of doubling a cost.',
        },
        {
          id: 'e',
          text: 'journey_cost(10, 3.2, 0) gives back 32.0',
          correct: true,
          why: 'A concession of 0 takes nothing off: `(100 - 0) / 100` is 1.0, so the answer is the full 32.0.',
        },
      ],
      concepts: ['arguments', 'parameters', 'calling-functions'],
      detects: ['forgot_to_call'],
      expectedSec: 110,
      hints: [
        'The first argument lands in the first parameter, the second in the second, and so on. Nothing is matched by name or by size.',
        'For each statement, write the call out with the values in place of `trips`, `fare` and `concession`, then work the formula through. For the statements about crashes, count the parameters and count the arguments.',
        'For (a): `10 * 3.2` is 32.0, and `(100 - 50) / 100` is 0.5.',
      ],
      solution: {
        explanation: md(
          '- (a) True. 10 trips at $3.20 is 32.0, and 50% off leaves 16.0.',
          '- (b) False. `journey_cost(50, 3.2, 10)` means 50 trips at $3.20 with 10% off, which is 144.0. Position decides which value each parameter gets.',
          '- (c) True. Three parameters, two arguments, so Python refuses the call before the body runs.',
          '- (d) False. `journey_cost` without brackets is the function itself. A call needs brackets and the right number of arguments.',
          '- (e) True. A 0% concession leaves the full 32.0.',
        ),
      },
      selfExplain: 'How would you change journey_cost(50, 3.2, 10) so that it does return 16.0?',
    },
  ],
};

export default scenario;
