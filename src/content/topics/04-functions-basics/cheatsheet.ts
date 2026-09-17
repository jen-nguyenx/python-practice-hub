import type { Md, Topic } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

export const cheatsheet: Md = md(
  '**Define, then call**',
  '',
  '```python',
  'def fare(zones):',
  '    """Return the fare for a trip through the given number of zones."""',
  '    cost = zones * 2.5',
  '    return cost',
  '',
  'price = fare(2)    # runs the body; price is 5.0',
  '```',
  '',
  '- `def name(parameters):` then an indented body. The colon and the 4-space indent are required.',
  '- The docstring (the first line of the body, in triple quotes) says what the function returns. Give every function one.',
  '- A `def` runs nothing by itself. The body runs each time you call the function with brackets: `fare(2)`.',
  '- The `def` must have run before a line that calls the function, so put your functions at the top of the file.',
  '',
  '**Parameters and arguments**',
  '',
  '- Parameters are the names in the `def` line (`zones`). Arguments are the values in the call (`2`).',
  '- Arguments are matched to parameters by position. With `def strike_rate(runs, balls):`, the call `strike_rate(45, 30)` sets `runs = 45` and `balls = 30`.',
  "- Too few arguments raises `TypeError: fare() missing 1 required positional argument: 'zones'`. Too many raises `TypeError: fare() takes 1 positional argument but 2 were given`.",
  '',
  '**return versus print**',
  '',
  '```python',
  'def area_shown(w, h):',
  '    print(w * h)       # shows 12, gives back None',
  '',
  'def area(w, h):',
  '    return w * h       # gives back 12, shows nothing',
  '',
  'x = area_shown(3, 4)  # shows 12; x is None',
  'y = area(3, 4)        # shows nothing; y is 12',
  'print(y + 1)          # 13',
  '```',
  '',
  '- `return` hands a value back to the line that called the function, and ends the function immediately.',
  '- A function with no `return` gives back `None`.',
  '- When a lab or exam question says "return", the marker checks the returned value, not what is on the screen.',
  '- The Thonny shell echoes a returned value; a script does not. Use `print(area(3, 4))` to see it.',
  '',
  '**Local variables**',
  '',
  '- Parameters and names assigned inside a function are local: they exist only while that call runs.',
  "- Using one outside raises `NameError: name 'cost' is not defined`. Keep the returned value instead: `price = fare(2)`.",
  "- Assigning to a parameter inside a function does not change the caller's variable.",
  '',
  '**Using returned values and helpers**',
  '',
  '```python',
  'def c_to_f(celsius):',
  '    """Return celsius converted to Fahrenheit."""',
  '    return celsius * 9 / 5 + 32',
  '',
  'def is_century_heat(celsius):',
  '    """Return True if the temperature is at least 100 F."""',
  '    return c_to_f(celsius) >= 100',
  '```',
  '',
  '- A call can go anywhere a value fits: in a sum, a condition, an f-string, or as an argument to another function.',
  '- Return a condition directly: `return n % 2 == 1`, not an `if` that returns `True` or `False`.',
  '- Test a yes/no function directly: `if is_century_heat(t):`, never `== True`.',
  '',
  '**return inside a loop**',
  '',
  '```python',
  'def first_multiple(start, end, k):',
  '    """Return the first number from start to end that k divides, or -1."""',
  '    for n in range(start, end + 1):',
  '        if n % k == 0:',
  '            return n    # found: the function stops here',
  '    return -1           # runs only after every n was checked',
  '```',
  '',
  '- A `return` inside the loop ends the whole function on that pass.',
  '- The "not found" answer goes after the loop, never in an `else` inside it.',
  '',
  '**Messages to recognise**',
  '',
  "- `TypeError: unsupported operand type(s) for +: 'NoneType' and 'int'`: a function printed instead of returning.",
  '- `<function fare at 0x...>` on the screen: brackets are missing, as in `print(fare)`.',
  "- `NameError: name 'total' is not defined`: a local name used outside its function.",
  "- `TypeError: 'float' object is not callable`: a variable called `round`, `max` or `sum` has hidden the built-in.",
);

export const workedExample: Topic['workedExample'] = {
  title: 'Leap years since UWA was founded in 1911',
  code: `def is_leap(year):
    """Return True if year is a leap year."""
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)


def count_leap_years(start, end):
    """Return how many leap years there are from start to end, including both."""
    count = 0
    for year in range(start, end + 1):
        if is_leap(year):
            count = count + 1
    return count


print(is_leap(2024), is_leap(1900), is_leap(2000))   # True False True
print(count_leap_years(1911, 2026))                  # 29`,
  steps: [
    '**Split the task into functions.** There are two jobs: decide whether one year is a leap year, and count leap years over a range of years. Write the two headers first and decide what each returns: `is_leap(year)` returns a bool, and `count_leap_years(start, end)` returns an int that includes both end years.',
    '**Return the condition directly.** A year is a leap year when 4 divides it, except for century years, which 400 must also divide. That rule is one Boolean expression, so `is_leap` is a single `return` line with no `if` or `else`.',
    '**Test the helper on its own.** Before building on it, call it on the tricky years: `is_leap(2024)` is `True`, `is_leap(1900)` is `False` and `is_leap(2000)` is `True`. If a helper is wrong, every function that calls it is wrong too.',
    '**Build the counter with an accumulator.** Set `count = 0` before the loop. Loop with `range(start, end + 1)` so `end` is included, and add 1 whenever `is_leap(year)` is true. Test the call directly with `if is_leap(year):`.',
    '**Return once, after the loop.** `return count` lines up with the `for`. One level deeper, inside the loop, it would return after checking only the first year.',
    '**Check the answer and the edge cases.** `count_leap_years(1911, 2026)` is 29: every fourth year from 1912 to 2024, including 2000. Also try `count_leap_years(2024, 2024)`, which is 1, and a start after the end, which is 0 because the range is empty.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'print_vs_return',
    bad: `def area(width, height):
    print(width * height)

total = area(3, 4) + area(2, 5)   # shows 12 and 10, then TypeError (None + None)`,
    good: `def area(width, height):
    return width * height

total = area(3, 4) + area(2, 5)   # 22`,
    note: '`print` only shows a value; the caller gets `None`. If the question says "return", or another line needs the answer, use `return`.',
  },
  {
    mistake: 'forgot_to_call',
    bad: `def welcome():
    return 'Kaya, welcome to UWA'

print(welcome)    # <function welcome at 0x...>`,
    good: `def welcome():
    return 'Kaya, welcome to UWA'

print(welcome())  # Kaya, welcome to UWA`,
    note: 'A function name without brackets is the function itself, not its result. Brackets run it, even when there are no arguments.',
  },
  {
    mistake: 'scope_confusion',
    bad: `def c_to_f(celsius):
    fahrenheit = celsius * 9 / 5 + 32
    return fahrenheit

c_to_f(38.5)
print(fahrenheit)   # NameError`,
    good: `def c_to_f(celsius):
    fahrenheit = celsius * 9 / 5 + 32
    return fahrenheit

today = c_to_f(38.5)
print(today)        # 101.3`,
    note: 'Names created inside a function vanish when the call ends. Store the returned value in a variable at the call site.',
  },
  {
    mistake: 'early_return_in_loop',
    bad: `def has_multiple_of_7(start, end):
    for n in range(start, end + 1):
        if n % 7 == 0:
            return True
        else:
            return False`,
    good: `def has_multiple_of_7(start, end):
    for n in range(start, end + 1):
        if n % 7 == 0:
            return True
    return False`,
    note: 'The bad version gives up after checking only `start`. Return `True` as soon as you find a match, but return `False` only after the loop has checked every number.',
  },
  {
    mistake: 'compare_to_true',
    bad: `def is_odd(number):
    if number % 2 == 1:
        return True
    else:
        return False

if is_odd(7) == True:
    print('odd')`,
    good: `def is_odd(number):
    return number % 2 == 1

if is_odd(7):
    print('odd')`,
    note: 'A comparison already gives `True` or `False`, so return it directly, and test a yes/no function without `== True`.',
  },
  {
    mistake: 'shadow_builtin',
    bad: `def total_price(price, qty):
    round = price * qty
    return round(round, 2)   # TypeError`,
    good: `def total_price(price, qty):
    cost = price * qty
    return round(cost, 2)`,
    note: 'Naming a variable `round`, `max`, `sum`, `len` or `input` hides the built-in function, so the next call to it fails with `TypeError: ... object is not callable`. Choose a descriptive name instead.',
  },
];
