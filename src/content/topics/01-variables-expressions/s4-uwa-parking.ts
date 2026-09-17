import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't01-s4',
  title: 'UWA visitor parking',
  story:
    'Visitor parking on the UWA Crawley campus is paid at a machine near the Hackett Drive entrance. ' +
    'Its software is mostly whole-number maths, and small slips in that maths overcharge or undercharge drivers.',
  questions: [
    {
      id: 't01-s4-q1',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'Charging for full hours',
      prompt:
        'An old parking machine charged $2.50 for each **full** hour only. A car stayed 150 minutes.\n\n' +
        'True or false: `150 // 60 * 2.5` evaluates to `6.25`.',
      concepts: ['floor-division', 'precedence', 'types'],
      detects: ['int_vs_float_division'],
      expectedSec: 60,
      options: [
        {
          id: 'true',
          text: 'True',
          mistake: 'int_vs_float_division',
          why: '`6.25` is what `150 / 60 * 2.5` gives. `//` throws away the fraction first, so `150 // 60` is `2`, not `2.5`.',
        },
        {
          id: 'false',
          text: 'False',
          correct: true,
          why: '`//` and `*` have the same precedence and run left to right. `150 // 60` is `2`, then `2 * 2.5` is `5.0`, a float because `2.5` is a float.',
        },
      ],
      hints: [
        'Which runs first here, the `//` or the `*`? Then ask what `//` does to the fraction.',
        'Operators with the same precedence run left to right. Work out `150 // 60` on its own first, then multiply the result by `2.5`.',
        '`150 / 60` is `2.5`, but `150 // 60` is a whole number.',
      ],
      solution: {
        explanation:
          'False. The expression evaluates to `5.0`.\n\n' +
          '- `//` and `*` are on the same precedence level, so Python works left to right.\n' +
          '- `150 // 60` is `2`: two full hours, with the extra 30 minutes thrown away.\n' +
          '- `2 * 2.5` is `5.0`. An int times a float gives a float.\n\n' +
          '`6.25` would come from `150 / 60 * 2.5`, which charges for the half hour too.',
      },
      selfExplain: 'How much would the old machine charge for a 179-minute stay, and how many of those minutes would be free?',
    },
    {
      id: 't01-s4-q2',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Receipt rounding',
      prompt:
        'The machine works out the hours for a 165-minute stay, then adds up a 10c coin and a 20c coin. Type exactly what this program prints.',
      concepts: ['true-division', 'round', 'float-precision', 'f-strings'],
      detects: ['int_vs_float_division', 'float_equality'],
      expectedSec: 180,
      code: py(
        'minutes = 165',
        'hours = minutes / 60',
        'print(hours, int(hours), round(hours))',
        'coins = 0.10 + 0.20',
        'print(coins, round(coins, 2))',
        "print(f'Paid: ${coins:.2f}')",
      ),
      mutants: [
        {
          code: py(
            'minutes = 165',
            'hours = minutes // 60',
            'print(hours, int(hours), round(hours))',
            'coins = 0.10 + 0.20',
            'print(coins, round(coins, 2))',
            "print(f'Paid: ${coins:.2f}')",
          ),
          mistake: 'int_vs_float_division',
        },
        {
          code: py(
            'minutes = 165',
            'hours = minutes / 60',
            'print(hours, int(hours), round(hours))',
            'coins = 0.30',
            'print(coins, round(coins, 2))',
            "print(f'Paid: ${coins:.2f}')",
          ),
          mistake: 'float_equality',
        },
      ],
      hints: [
        '`int()` and `round()` treat `2.75` differently. Also, a float cannot store 0.1 or 0.2 exactly.',
        'Line 3: `int()` cuts off the decimals, while `round()` goes to the nearest whole number. Line 5: the stored sum is very slightly more than 0.3, and `print` shows enough digits to tell it apart from 0.3; `round(coins, 2)` and `:.2f` tidy it up.',
        'The first line printed is `2.75 2 3`. The second line starts with `0.3000000000000000`.',
      ],
      solution: {
        explanation:
          '- Line 2: `165 / 60` is `2.75`.\n' +
          '- Line 3: `int(2.75)` cuts off the decimals to give `2`; `round(2.75)` gives the nearest whole number, `3`. Output `2.75 2 3`.\n' +
          '- Line 4: 0.1 and 0.2 are stored as binary approximations, so their sum is `0.30000000000000004`.\n' +
          '- Line 5: prints `coins` with enough digits to show it is not exactly 0.3, then `round(coins, 2)`, which is `0.3`.\n' +
          '- Line 6: `:.2f` shows exactly two decimal places: `Paid: $0.30`.\n\n' +
          'Output:\n\n```python\n2.75 2 3\n0.30000000000000004 0.3\nPaid: $0.30\n```',
      },
      selfExplain: 'Why is it better to show money with :.2f than to print the float directly?',
    },
    {
      id: 't01-s4-q3',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Pay per started hour',
      prompt:
        'Visitor parking costs **$2.50 for every started hour**. A stay of 1 to 60 minutes costs `2.5`, 61 to 120 minutes costs `5.0`, 121 to 180 minutes costs `7.5`, and a stay of 0 minutes costs `0.0`.\n\n' +
        'Complete `parking_cost(minutes)` so it **returns** the cost as a float. `minutes` is a whole number, 0 or more.\n\n' +
        'You do not need `if`: whole-number division can do the rounding up. Do not import anything (so no `math.ceil`).',
      concepts: ['floor-division', 'ceiling-division', 'return-value'],
      detects: ['int_vs_float_division', 'print_vs_return', 'import_used'],
      expectedSec: 420,
      fnName: 'parking_cost',
      rules: ['noImport'],
      starter: py(
        'def parking_cost(minutes):',
        '    """Return the cost in dollars of parking for minutes (a whole number, 0 or more)."""',
        '    pass',
      ),
      tests: [
        { id: 'v1', call: 'parking_cost(90)', expect: '5.0', cmp: 'float', label: '90 minutes', hidden: false, tag: 'int_vs_float_division' },
        { id: 'v2', call: 'parking_cost(30)', expect: '2.5', cmp: 'float', label: '30 minutes', hidden: false },
        { id: 'h1', call: 'parking_cost(60)', expect: '2.5', cmp: 'float', label: 'exactly one hour', hidden: true },
        { id: 'h2', call: 'parking_cost(0)', expect: '0.0', cmp: 'float', label: 'zero minutes', hidden: true },
        { id: 'h3', call: 'parking_cost(61)', expect: '5.0', cmp: 'float', label: 'one minute into the second hour', hidden: true, tag: 'int_vs_float_division' },
        { id: 'h4', call: 'parking_cost(601)', expect: '27.5', cmp: 'float', label: 'long stay of 601 minutes', hidden: true },
      ],
      hints: [
        'First work out how many hours have been started, then multiply by the price. Try some stays by hand: 0, 1, 60, 61 and 120 minutes. How many started hours is each?',
        '`minutes // 60` rounds down, but you need to round up whenever there is a part hour. Add a fixed number to `minutes` before dividing, so that any part hour tips over to the next whole number but an exact hour does not.',
        '`started_hours = (minutes + ...) // 60`, then return `started_hours * 2.5`. Which number makes 60 stay at 1 hour but 61 become 2?',
      ],
      solution: {
        code: py(
          'def parking_cost(minutes):',
          '    """Return the cost in dollars of parking for minutes (a whole number, 0 or more)."""',
          '    started_hours = (minutes + 59) // 60',
          '    return started_hours * 2.5',
        ),
        explanation:
          '- `minutes // 60` counts only full hours: 61 minutes gives `1`, but the driver has started a second hour.\n' +
          '- Adding 59 first rounds up: `(60 + 59) // 60` is `119 // 60`, which is `1`; `(61 + 59) // 60` is `120 // 60`, which is `2`; `(0 + 59) // 60` is `0`.\n' +
          '- Adding 60 instead would charge an extra hour for exact hours: `(60 + 60) // 60` is `2`.\n' +
          '- `started_hours * 2.5` is a float because `2.5` is a float, so `0` minutes returns `0.0`.\n' +
          '- `minutes / 60 * 2.5` fails because it charges for part hours exactly (90 minutes would cost `3.75`), and `round(minutes / 60)` rounds 61 minutes down to 1 hour.\n\n' +
          'The general trick is `(n + d - 1) // d`, which divides n by d and rounds up.',
      },
      selfExplain: 'Why does adding 59, and not 60, give the right cost for a stay of exactly 60 minutes?',
    },
  ],
};

export default scenario;
