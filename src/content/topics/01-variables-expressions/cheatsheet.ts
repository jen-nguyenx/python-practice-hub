// Cheat sheet, worked example and common mistakes for topic 01.
import type { Md, Topic } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');
const fence = (...lines: string[]): string => ['```python', ...lines, '```'].join('\n');

export const cheatsheet: Md = [
  '**The four basic types**',
  fence(
    'count = 12          # int: a whole number',
    'fare = 4.90         # float: has a decimal point',
    "stop = 'Perth'      # str: text in quotes",
    'is_peak = True      # bool: True or False',
    "type(4.90)          # <class 'float'>",
  ),
  '**Arithmetic operators**',
  fence(
    '7 + 2      # 9',
    '7 - 2      # 5',
    '7 * 2      # 14',
    '7 / 2      # 3.5    / ALWAYS gives a float: 6 / 2 is 3.0',
    '7 // 2     # 3      floor division: divide, then round down to a whole number',
    '7 % 2      # 1      remainder',
    '7 ** 2     # 49     power',
    '7.0 // 2   # 3.0    // or % with a float gives a float',
    '-7 // 2    # -4     floor rounds DOWN, towards negative infinity',
    '-7 % 2     # 1      the remainder takes the sign of the right side',
    '3 + 4.0    # 7.0    int mixed with float gives a float',
  ),
  '**Precedence** (first to last). Use brackets whenever you are unsure.',
  '- Brackets `( )`\n' +
    '- `**`, which works right to left: `2 ** 3 ** 2` is `2 ** 9`, which is `512`\n' +
    '- A leading minus: `-3 ** 2` is `-9`, because `**` happens first\n' +
    '- `*`, `/`, `//`, `%`, left to right: `100 // 30 * 2` is `3 * 2`, which is `6`\n' +
    '- `+`, `-`, left to right',
  '**Converting between types**',
  fence(
    "int('42')            # 42",
    "float('3.40')        # 3.4",
    'str(950)             # \'950\'',
    'int(3.99)            # 3      int() cuts off the decimals; it does not round',
    'round(3.7)           # 4      round() with one argument gives an int',
    'round(2.5)           # 2      exact halves round to the even number',
    'round(3.14159, 2)    # 3.14',
    "int('12.0')          # ValueError: text for int() must be a whole number",
    "float('$4.90')       # ValueError: symbols are not part of a number",
    "int(float('12.0'))   # 12",
  ),
  '**input() always gives a str**',
  fence(
    "trips = input('Trips: ')         # user types 7, so trips is '7'",
    "trips * 2                        # '77'  (repeats the text)",
    "trips = int(input('Trips: '))    # convert straight away",
    "fare = float(input('Fare: '))    # use float() when decimals are possible",
  ),
  '**Text and numbers**',
  fence(
    "'Fare: $' + 4.9          # TypeError: can only concatenate str (not \"float\") to str",
    "'Fare: $' + str(4.9)     # 'Fare: $4.9'",
    "'7' + '5'                # '75'  (+ joins text)",
    "'ha' * 3                 # 'hahaha'",
  ),
  '**f-strings for output**',
  fence(
    'fare = 4.9',
    'trips = 7',
    "print(f'{trips} trips cost ${fare * trips:.2f}')   # 7 trips cost $34.30",
    'minutes = 5',
    'seconds = 7',
    "print(f'{minutes}:{seconds:02d}')                 # 5:07  (02d pads to 2 digits)",
  ),
  '`:.2f` shows exactly 2 decimal places but does not change the stored value. `round(x, 2)` gives a new float, and `round(2.5, 2)` prints as `2.5`, not `2.50`.',
  '**print()**',
  fence(
    "print('Bay', 42, 'level', 3)    # Bay 42 level 3  (one space between arguments)",
    "print('10', '45', sep=':')      # 10:45",
    "print('Loading', end='')        # no new line at the end",
  ),
  '**Names**',
  '- Letters, digits and underscores only. A name cannot start with a digit and cannot contain spaces or hyphens: `finish-time` means `finish` minus `time`.\n' +
    '- Case matters: `total`, `Total` and `TOTAL` are three different names.\n' +
    '- Keywords such as `if`, `for`, `def`, `return`, `True` and `None` cannot be names.\n' +
    '- CITS1401 style: lowercase snake_case, at least 3 characters, and say what it holds: `distance_km`, not `d` or `DistanceKm`.\n' +
    '- Never use a built-in function name for a variable: `list`, `str`, `sum`, `max`, `min`, `input`, `round`, `type`.',
  '**Assignment**',
  fence(
    'total = 10',
    'total = total + 5     # the right side is worked out first: total is now 15',
    'total += 5            # same as total = total + 5, so 20',
    "leader = 'Mei'",
    "chaser = 'Tariq'",
    'spare = leader        # to swap two values, save one in a spare variable first',
    'leader = chaser',
    'chaser = spare',
  ),
  'Assignment uses the value the right side has at that moment. After `a = b`, giving `b` a new value (`b = 7`) does not change `a`.',
  '**Whole-number tricks**',
  fence(
    'minutes = 135',
    'hours = minutes // 60         # 2',
    'left_over = minutes % 60      # 15',
    'last_digit = 4096 % 10        # 6',
    'without_last = 4096 // 10     # 409',
  ),
  '**Floats are approximate**',
  fence(
    '0.1 + 0.2             # 0.30000000000000004',
    'round(0.1 + 0.2, 2)   # 0.3',
    '4.35 * 100            # 434.99999999999994',
    'int(4.35 * 100)       # 434  (a cent lost)',
    'round(4.35 * 100)     # 435',
  ),
].join('\n\n');

export const workedExample: Topic['workedExample'] = {
  title: 'Reid Library print credit',
  code: py(
    "credit_text = input('Print credit ($): ')",
    'credit_cents = round(float(credit_text) * 100)',
    'pages = credit_cents // 12',
    'left_cents = credit_cents % 12',
    'left_dollars = left_cents / 100',
    "print(f'Pages: {pages}, left over: ${left_dollars:.2f}')",
  ),
  steps: [
    '**Understand the task.** Printing at Reid Library costs 12 cents a page. ' +
      'A student types their print credit in dollars, such as `4.35`. Print how many whole pages they can afford and what is left, exactly like `Pages: 36, left over: $0.03`.',
    '**Read and convert the input (lines 1-2).** `input()` gives the text `\'4.35\'`. It has a decimal point, so convert it with `float()`. ' +
      '`int(\'4.35\')` would stop the program with a ValueError.',
    '**Switch to whole cents (line 2).** `4.35 * 100` is stored as `434.99999999999994`. `int()` would cut that down to `434` and lose a cent, ' +
      'so `round()` it to `435` instead. Whole numbers of cents have no rounding errors, which makes the next step exact.',
    '**Split with // and % (lines 3-4).** `435 // 12` is `36` whole pages and `435 % 12` is `3` cents left over. ' +
      'Use the pair together: `//` answers "how many fit" and `%` answers "what is left".',
    '**Convert back and format (lines 5-6).** `3 / 100` is `0.03`. The f-string puts each value into the text, and `:.2f` always shows two decimal places, so 3 cents shows as `$0.03` and 10 cents as `$0.10`, not `$0.1`.',
    '**Check edge cases.** Credit `0` gives `Pages: 0, left over: $0.00`. Credit `0.12` gives exactly one page with nothing left. ' +
      'Credit `4.35` catches the `int()` versus `round()` trap from step 3.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'int_vs_float_division',
    bad: py('minutes = 105', 'hours = minutes / 60        # 1.75', "print(hours, 'h')"),
    good: py('minutes = 105', 'hours = minutes // 60       # 1', "print(hours, 'h')"),
    note:
      '`/` always gives a float, even for `6 / 2` (which is `3.0`). Use `//` when you want a whole number of hours, pages or boxes, ' +
      'and remember `//` rounds down: `-7 // 2` is `-4`.',
  },
  {
    mistake: 'input_without_int',
    bad: py("trips = input('Trips: ')", 'cost = trips * 4.90'),
    good: py("trips = int(input('Trips: '))", 'cost = trips * 4.90'),
    note:
      '`input()` always returns a str. `\'7\' * 4.90` raises a TypeError, and `\'7\' * 2` quietly gives `\'77\'`. Convert on the same line you read the value.',
  },
  {
    mistake: 'int_of_float_string',
    bad: py("top_up = int('12.50')"),
    good: py("top_up = float('12.50')"),
    note:
      '`int()` accepts text only when it is a whole number, so `int(\'12.50\')` raises a ValueError. ' +
      'Use `float()` for any value that might have decimals, or `int(float(text))` if you really need a whole number.',
  },
  {
    mistake: 'str_int_concat',
    bad: py('balance = 23.2', "print('New balance: $' + balance)"),
    good: py('balance = 23.2', "print(f'New balance: ${balance:.2f}')"),
    note: '`+` cannot join text to a number. An f-string converts the number for you and can format it to 2 decimal places.',
  },
  {
    mistake: 'shadow_builtin',
    bad: py('max = 38.2', 'hottest = max(35.1, 41.0)'),
    good: py('max_temp = 38.2', 'hottest = max(35.1, 41.0)'),
    note:
      'After `max = 38.2`, the name `max` means the number, so calling `max(...)` fails with `TypeError: \'float\' object is not callable`. ' +
      'Avoid `list`, `str`, `sum`, `max`, `min`, `input`, `round` and `type` as variable names.',
  },
  {
    mistake: 'style_naming',
    bad: py('D = 5', 'T = 27', 'PaceSecs = T * 60 / D'),
    good: py('distance_km = 5', 'time_min = 27', 'pace_seconds = time_min * 60 / distance_km'),
    note:
      'CITS1401 marks style: use lowercase snake_case names of at least 3 characters that say what the value is, including its unit when it has one.',
  },
];
