// Scenario t02-s2: BOM heat warnings (syntax of if/elif/else, separate ifs versus elif, building a chain).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const OPT_COLON = `temp = 38
if temp > 35
    print('Heat warning')`;

const OPT_ASSIGN = `temp = 38
if temp = 38:
    print('Heat warning')`;

const OPT_ELSE_IF = `temp = 38
if temp > 40:
    print('Extreme heat')
else if temp > 35:
    print('Heat warning')`;

const OPT_CHAINED = `temp = 38
if 35 < temp <= 40:
    print('Heat warning')
else:
    print('No warning')`;

const OPT_FLAG = `temp = 38
hot = temp > 35
if hot:
    print('Heat warning')`;

const TWIN_LEFT = `max_temp = 42
if max_temp >= 35:
    print('Heat warning')
if max_temp >= 40:
    print('Extreme heat warning')
print('Forecast done')`;

const TWIN_RIGHT = `max_temp = 42
if max_temp >= 35:
    print('Heat warning')
elif max_temp >= 40:
    print('Extreme heat warning')
print('Forecast done')`;

const PARSONS_SOLUTION = `def heat_alert(max_temp, humidity):
    alert = 'No alert'
    if max_temp >= 40:
        alert = 'Extreme heat'
    elif max_temp >= 35 or (max_temp >= 32 and humidity >= 70):
        alert = 'Heat warning'
    return alert`;

const BAN_STARTER = `def total_fire_ban(temp, wind_kmh, humidity, rain_mm):
    """Return True when a total fire ban applies, otherwise False."""
    pass`;

const BAN_SOLUTION = `def total_fire_ban(temp, wind_kmh, humidity, rain_mm):
    """Return True when a total fire ban applies, otherwise False."""
    if rain_mm >= 5:
        return False
    return (temp >= 35 and wind_kmh >= 25 and humidity <= 25) or temp >= 42`;

const scenario: Scenario = {
  id: 't02-s2',
  title: 'Perth heat warnings',
  story:
    'The Bureau of Meteorology forecast for Perth gives a maximum temperature and the humidity. ' +
    'A small script turns the forecast into the warning shown on a community noticeboard, and you are checking it before summer.',
  questions: [
    {
      id: 't02-s2-q1',
      format: 'multi',
      diff: 'easy',
      core: false,
      title: 'Which snippets will not run?',
      prompt:
        'Select **every** snippet that Python refuses to run at all (it stops with a `SyntaxError` before printing anything).',
      concepts: ['if-syntax', 'comparison'],
      detects: ['missing_colon', 'assign_vs_compare', 'compare_to_true'],
      expectedSec: 100,
      options: [
        {
          id: 'a',
          text: OPT_COLON,
          correct: true,
          why: "SyntaxError: expected ':'. Every `if`, `elif` and `else` line must end with a colon.",
        },
        {
          id: 'b',
          text: OPT_ASSIGN,
          correct: true,
          why: "SyntaxError: a single `=` stores a value and cannot be used as a condition. Python's error message suggests the fix: `Maybe you meant '==' ...`",
        },
        {
          id: 'c',
          text: OPT_ELSE_IF,
          correct: true,
          why: "SyntaxError: Python has no `else if`. After `else` it expects a colon straight away. Write `elif temp > 35:`.",
        },
        {
          id: 'd',
          text: OPT_CHAINED,
          correct: false,
          why: 'This is valid. `35 < temp <= 40` is a chained comparison, meaning `35 < temp and temp <= 40`. It prints `Heat warning`.',
        },
        {
          id: 'e',
          text: OPT_FLAG,
          correct: false,
          mistake: 'compare_to_true',
          why: 'This is valid. `temp > 35` gives `True`, which is stored in `hot`. `if hot:` tests it directly; there is no need for `if hot == True:`. It prints `Heat warning`.',
        },
      ],
      hints: [
        'Three of the five are broken. Look at the first line of each block and at what comes after `if`.',
        'Check each block-opening line for three things: a colon at the end, `==` (not `=`) inside the condition, and a real keyword (`if`, `elif`, `else`).',
        'Chaining `35 < temp <= 40` is allowed in Python, and a condition can be any value that is True or False, including a variable.',
      ],
      solution: {
        explanation: md(
          'Three snippets are syntax errors; the other two run and print `Heat warning`.',
          '',
          "- `if temp > 35` has no colon at the end: SyntaxError.",
          '- `if temp = 38:` uses `=`, which is assignment. A comparison needs `==`: SyntaxError.',
          '- `else if temp > 35:` is not Python. Use `elif`: SyntaxError.',
          '- `if 35 < temp <= 40:` runs. Chained comparisons are valid Python and read like maths.',
          '- `hot = temp > 35` then `if hot:` runs. A comparison is a value (`True` or `False`), so it can be stored in a variable and tested on its own.',
        ),
      },
      selfExplain: 'Rewrite the snippet that uses else if so it runs and prints Heat warning.',
    },
    {
      id: 't02-s2-q2',
      format: 'twins',
      diff: 'medium',
      core: true,
      title: 'Two ifs or if and elif?',
      prompt:
        'The forecast is 42 degrees. These two versions differ by one word on line 4. Do they print the same thing? Then predict what each one prints.',
      concepts: ['elif', 'separate-ifs'],
      detects: ['elif_vs_if'],
      expectedSec: 150,
      left: TWIN_LEFT,
      right: TWIN_RIGHT,
      mistake: 'elif_vs_if',
      hints: [
        'Only line 4 differs. Is that line part of the same decision as line 2 in both versions?',
        'On the left there are two separate decisions, and Python checks both. On the right there is one chain, and it stops after the first true branch.',
        '`42 >= 35` is True, so both versions print `Heat warning` first. What happens to line 4 in each?',
      ],
      solution: {
        explanation: md(
          'They differ.',
          '',
          '- **Left** has two independent `if` statements. `42 >= 35` is True, so it prints `Heat warning`. The second `if` is checked as well: `42 >= 40` is True, so it prints `Extreme heat warning`. Then `Forecast done`.',
          '- **Right** has one chain. `42 >= 35` is True, so it prints `Heat warning` and skips the `elif` without testing it. Then `Forecast done`.',
          '',
          'Use separate `if`s when several things can all apply. Use `elif` when exactly one should happen, and put the most specific test (here `>= 40`) first.',
        ),
      },
      selfExplain: 'How would you change the right-hand version so a 42 degree day prints only Extreme heat warning?',
    },
    {
      id: 't02-s2-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Build heat_alert',
      prompt: md(
        'Arrange the lines to build `heat_alert(max_temp, humidity)`, which **returns** one string:',
        '',
        "- `'Extreme heat'` when `max_temp` is 40 or more",
        "- otherwise `'Heat warning'` when `max_temp` is 35 or more, **or** when `max_temp` is at least 32 **and** `humidity` is at least 70",
        "- otherwise `'No alert'`",
        '',
        'Indentation matters. Not every line is needed.',
      ),
      concepts: ['elif', 'boolean', 'indentation'],
      detects: ['elif_vs_if', 'assign_vs_compare', 'indent_error'],
      expectedSec: 180,
      indentMatters: true,
      fnName: 'heat_alert',
      lines: [
        { text: 'def heat_alert(max_temp, humidity):', indent: 0 },
        { text: "alert = 'No alert'", indent: 1 },
        { text: 'if max_temp >= 40:', indent: 1 },
        { text: "alert = 'Extreme heat'", indent: 2 },
        { text: 'elif max_temp >= 35 or (max_temp >= 32 and humidity >= 70):', indent: 1 },
        { text: "alert = 'Heat warning'", indent: 2 },
        { text: 'return alert', indent: 1 },
      ],
      distractors: [
        { text: 'if max_temp >= 35 or (max_temp >= 32 and humidity >= 70):', indent: 1, mistake: 'elif_vs_if' },
        { text: "alert == 'Extreme heat'", indent: 2, mistake: 'assign_vs_compare' },
      ],
      tests: [
        { id: 'v1', call: 'heat_alert(42, 20)', expect: "'Extreme heat'", label: '42 degrees, dry', hidden: false, tag: 'elif_vs_if' },
        { id: 'v2', call: 'heat_alert(33, 80)', expect: "'Heat warning'", label: '33 degrees, 80% humidity', hidden: false },
        { id: 'h1', call: 'heat_alert(40, 10)', expect: "'Extreme heat'", label: 'exactly 40', hidden: true, tag: 'assign_vs_compare' },
        { id: 'h2', call: 'heat_alert(44, 90)', expect: "'Extreme heat'", label: 'hot and humid', hidden: true, tag: 'elif_vs_if' },
        { id: 'h3', call: 'heat_alert(35, 20)', expect: "'Heat warning'", label: 'exactly 35, dry', hidden: true },
        { id: 'h4', call: 'heat_alert(33, 69)', expect: "'No alert'", label: 'humidity just under 70', hidden: true },
        { id: 'h5', call: 'heat_alert(31, 95)', expect: "'No alert'", label: 'very humid but only 31 degrees', hidden: true },
      ],
      hints: [
        "The answer starts as `'No alert'` and should be replaced at most once. Follow a 42 degree day through your lines: is it tested again after it has matched 40?",
        md(
          'Plan:',
          '',
          "1. Set `alert` to `'No alert'`.",
          '2. One chain: test 40 or more first, then the heat warning condition.',
          '3. Each branch stores a new value with `=`.',
          '4. After the chain, back at one indent level, return `alert`.',
        ),
        md(
          '```python',
          'def heat_alert(max_temp, humidity):',
          "    alert = 'No alert'",
          '    if max_temp >= 40:',
          "        alert = 'Extreme heat'",
          '    elif ...',
          '```',
        ),
      ],
      solution: {
        code: PARSONS_SOLUTION,
        explanation: md(
          "- `alert = 'No alert'` sets the answer used when no branch runs.",
          '- `if max_temp >= 40:` comes first because it is the most specific band. A 42 degree day stops here.',
          "- The `elif` is only tested when the day is below 40. A separate `if` here would also match 42 degrees and overwrite `'Extreme heat'` with `'Heat warning'`.",
          '- `max_temp >= 35 or (max_temp >= 32 and humidity >= 70)`: either reason is enough, so the two reasons are joined with `or`; the humid-day reason needs both parts, so it uses `and`. The brackets are not required (`and` is done before `or`) but make the meaning clear.',
          "- Each branch uses `=` to store a value. `alert == 'Extreme heat'` only compares and throws the result away, so `alert` stays `'No alert'`.",
          '- `return alert` is indented once, so it runs after the chain whichever branch was taken.',
        ),
      },
      selfExplain: 'What would heat_alert(42, 20) return if the elif were a separate if?',
    },
    {
      id: 't02-s2-q4',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Write total_fire_ban',
      prompt: md(
        'The same noticeboard also shows whether a total fire ban is in force. Complete `total_fire_ban(temp, wind_kmh, humidity, rain_mm)` ' +
        'so it **returns** the boolean `True` or `False` (not a string, and not a message).',
        '',
        'The simplified rule for the district:',
        '',
        '- If 5 mm or more of rain has fallen (`rain_mm`), there is **never** a ban, whatever the other numbers say.',
        '- Otherwise there is a ban when the maximum temperature is at least 35, **and** the wind is at least 25 km/h, **and** the humidity is 25% or below.',
        '- There is also a ban whenever the temperature reaches 42, whatever the wind and humidity are.',
        '',
        '`temp`, `wind_kmh`, `humidity` and `rain_mm` may be ints or floats. Write the answer without `== True`, and without an `if` that returns `True` in one branch and `False` in the other.',
      ),
      concepts: ['boolean', 'return-boolean', 'guard', 'boundary'],
      detects: ['compare_to_true', 'or_with_literal', 'elif_vs_if', 'return_type_wrong'],
      expectedSec: 480,
      fnName: 'total_fire_ban',
      starter: BAN_STARTER,
      tests: [
        { id: 'v1', call: 'total_fire_ban(38, 30, 20, 0)', expect: 'True', label: 'hot, windy and dry', hidden: false },
        { id: 'v2', call: 'total_fire_ban(38, 30, 40, 0)', expect: 'False', label: 'hot and windy but humid', hidden: false },
        { id: 'v3', call: 'total_fire_ban(45, 5, 80, 0)', expect: 'True', label: '45 degrees, still and humid', hidden: false },
        { id: 'h1', call: 'total_fire_ban(45, 5, 80, 6.2)', expect: 'False', label: 'extreme heat after heavy rain', hidden: true, tag: 'elif_vs_if' },
        { id: 'h2', call: 'total_fire_ban(35, 25, 25, 0)', expect: 'True', label: 'every number exactly on its limit', hidden: true },
        { id: 'h3', call: 'total_fire_ban(34.9, 25, 25, 0)', expect: 'False', label: 'temperature just under 35', hidden: true },
        { id: 'h4', call: 'total_fire_ban(38, 24, 20, 0)', expect: 'False', label: 'wind just under 25', hidden: true },
        { id: 'h5', call: 'total_fire_ban(38, 30, 20, 4.9)', expect: 'True', label: 'rain just under 5 mm', hidden: true },
        { id: 'h6', call: 'total_fire_ban(42, 0, 95, 0)', expect: 'True', label: 'exactly 42, no wind', hidden: true },
        { id: 'h7', call: 'total_fire_ban(41.9, 0, 95, 0)', expect: 'False', label: 'just under 42, no wind', hidden: true },
        { id: 'h8', call: 'total_fire_ban(38, 30, 20, 5)', expect: 'False', label: 'rain of exactly 5 mm', hidden: true },
      ],
      hints: [
        'The rain rule cancels everything else, so deal with it on its own before you think about the other three numbers. What is left is a single yes/no question.',
        md(
          'Plan:',
          '',
          '1. Guard: if there has been 5 mm of rain or more, leave the function with `False` straight away.',
          '2. Write the hot-windy-dry rule as one condition joined by `and`. All three parts must hold, and each part names its own variable.',
          '3. The 42 degree rule is a second, independent reason, so join it to the first with `or`.',
          '4. `return` that whole expression. A comparison is already `True` or `False`, so it needs no `if` around it.',
        ),
        md(
          '```python',
          '    if rain_mm >= 5:',
          '        return False',
          '    return (temp >= 35 and ... and ...) or ...',
          '```',
        ),
      ],
      solution: {
        code: BAN_SOLUTION,
        explanation: md(
          '- The guard comes first because the rain rule beats both of the others. Written as part of the big expression it is easy to get wrong; as a guard clause it is one line and obviously final.',
          '- `temp >= 35 and wind_kmh >= 25 and humidity <= 25` needs all three, so the parts are joined with `and`. Each part repeats its variable: `wind_kmh >= 25 and humidity <= 25`, never `wind_kmh >= 25 and <= 25`.',
          '- The humidity limit points the other way (`<=`), because dry air, not humid air, is the dangerous case.',
          '- `... or temp >= 42` adds a second, independent reason for a ban. The brackets around the `and` group are not strictly needed, since `and` binds tighter than `or`, but they show the reader that there are two reasons.',
          '- The comparison expression is already a boolean, so `return` it directly. `if condition: return True else: return False` does the same job in four lines and is what markers call out; `if condition == True:` is the same mistake once more.',
          '- `total_fire_ban(35, 25, 25, 0)` returning `True` is what pins down the three `>=`/`<=` boundaries, and `41.9` versus `42` pins down the extreme-heat rule.',
        ),
      },
      selfExplain: 'Why does the rain check have to happen before the other two rules rather than being joined to them with and?',
    },
  ],
};

export default scenario;
