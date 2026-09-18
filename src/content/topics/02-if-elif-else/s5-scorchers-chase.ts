// Scenario t02-s5: a Perth Scorchers run chase (short-circuit and, comparing text with numbers,
// the order of a chain, guarding a division, and a multi-rule status function).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const SHORT_CIRCUIT = `balls_left = 0
runs_needed = 12
if balls_left > 0 and runs_needed / balls_left <= 1:
    print('On track')
print('Innings over')`;

const FEED_CRASH = `score_feed = '156'
overs_feed = '18.2'
print('Score:', score_feed)
if score_feed > 150:
    print('Big total')`;

const RATE_BUGGY = `def required_rate(runs_needed, balls_left):
    rate = runs_needed / balls_left * 6
    if balls_left == 0:
        return None
    return round(rate, 2)`;

const RATE_FIXED = `def required_rate(runs_needed, balls_left):
    if balls_left == 0:
        return None
    rate = runs_needed / balls_left * 6
    return round(rate, 2)`;

const STATUS_STARTER = `def chase_status(target, scored, balls_left, wickets_lost):
    """Return 'Won', 'Lost', 'Cruising', 'Under pressure' or 'Needs a miracle'."""
    pass`;

const STATUS_SOLUTION = `def chase_status(target, scored, balls_left, wickets_lost):
    """Return 'Won', 'Lost', 'Cruising', 'Under pressure' or 'Needs a miracle'."""
    if scored >= target:
        return 'Won'
    if wickets_lost >= 10 or balls_left == 0:
        return 'Lost'
    rate = (target - scored) / (balls_left / 6)
    if rate <= 6:
        return 'Cruising'
    elif rate <= 12:
        return 'Under pressure'
    else:
        return 'Needs a miracle'`;

const scenario: Scenario = {
  id: 't02-s5',
  title: 'Scorchers run chase',
  story:
    'The Perth Scorchers are chasing a total at Optus Stadium. The big-screen app reads the score from a live feed and turns it into ' +
    'a required run rate and a one-word status, and it must never crash in front of 50,000 people.',
  questions: [
    {
      id: 't02-s5-q1',
      format: 'mcq',
      diff: 'easy',
      core: false,
      title: 'The last ball has gone',
      prompt: 'The innings is over, so `balls_left` is 0. What does this snippet print?',
      code: SHORT_CIRCUIT,
      concepts: ['boolean', 'short-circuit', 'guard'],
      detects: ['zero_division', 'indent_error'],
      expectedSec: 110,
      options: [
        {
          id: 'a',
          text: 'Innings over',
          correct: true,
          why: 'Python reads `and` from left to right and stops as soon as it knows the answer. `0 > 0` is `False`, so the whole condition is already `False` and the division is never worked out. The `if` body is skipped and line 5 runs.',
        },
        {
          id: 'b',
          text: 'The program stops with ZeroDivisionError and prints nothing',
          mistake: 'zero_division',
          why: 'This is what would happen if Python evaluated both sides of `and` before deciding. It does not: a `False` on the left of `and` means the right side is never touched. Swapping the two halves of the condition would produce exactly this crash.',
        },
        {
          id: 'c',
          text: 'On track\nInnings over',
          why: 'The `if` body only runs when the condition is `True`. That needs at least one ball left and a required rate of 1 or less per ball; with `balls_left` at 0 the first comparison already fails.',
        },
        {
          id: 'd',
          text: 'On track',
          mistake: 'indent_error',
          why: 'Line 5 is not indented, so it is not part of the `if` body. It runs whatever the condition decides, which is why the safe answer is the one that always prints it.',
        },
      ],
      hints: [
        'Work out the left half of the `and` first, and then ask whether Python still needs the right half.',
        '`and` is only `True` when both sides are. Once the left side is `False`, the answer cannot change, so Python stops there. Then check the indentation of line 5 to see whether it belongs to the `if`.',
        '`balls_left > 0` is `0 > 0`, which is `False`. Nothing after the `and` is evaluated.',
      ],
      solution: {
        explanation: md(
          'It prints `Innings over` only.',
          '',
          '1. `balls_left > 0` is `0 > 0`, which is `False`.',
          '2. `and` short-circuits: because the left side is `False`, the whole condition is `False` and `runs_needed / balls_left` is never calculated. No ZeroDivisionError.',
          '3. The `if` body is skipped.',
          '4. Line 5 sits at the left margin, outside the `if`, so it always runs.',
          '',
          'This is the standard way to protect a division: put the safety check on the **left** of the `and`. Written the other way around, `runs_needed / balls_left <= 1 and balls_left > 0` crashes.',
        ),
      },
      selfExplain: 'Why is the order of the two halves of the and condition important here?',
    },
    {
      id: 't02-s5-q2',
      format: 'errorTranslator',
      diff: 'medium',
      core: true,
      title: 'The feed sends text',
      prompt:
        'The live feed hands every value over as a string. This snippet prints one line and then stops. Choose the exception and the reason.',
      concepts: ['comparison', 'types', 'conversion', 'runtime-error'],
      detects: ['input_without_int', 'int_of_float_string', 'type_error_other'],
      expectedSec: 180,
      code: FEED_CRASH,
      exceptionOptions: ['TypeError', 'ValueError', 'NameError', 'SyntaxError'],
      causes: [
        {
          id: 'a',
          text: "`score_feed` holds the text `'156'`, not the number 156. Python has no rule for ordering a str against an int, so `>` refuses. Convert first: `if int(score_feed) > 150:`.",
          correct: true,
        },
        {
          id: 'b',
          text: "`'156'` cannot be turned into a number, so the conversion inside the comparison fails.",
          mistake: 'int_of_float_string',
        },
        {
          id: 'c',
          text: '`print` on line 3 turned `score_feed` into text, so the comparison on line 4 no longer has a number to work with.',
          mistake: 'type_error_other',
        },
      ],
      hints: [
        'Line 3 prints `Score: 156`, so the crash is on line 4. Look at the two things being compared there and ask what type each one is.',
        "Quotes make a value text. `'156'` is three characters; `150` is a number. Python allows `<` and `>` between two numbers, or between two strings, but not between one of each.",
        'The exception is about the **types** of the operands, not about a bad conversion. Nothing in this snippet calls `int()` or `float()` at all.',
      ],
      solution: {
        explanation: md(
          "Line 4 raises `TypeError: '>' not supported between instances of 'str' and 'int'`.",
          '',
          "- `score_feed` was assigned `'156'` with quotes, so it is a str.",
          '- Line 3 prints fine: `print` is happy with any type, and it does not change the variable.',
          "- Line 4 asks Python whether a str is greater than an int. For `==` Python would simply answer `False`, but for `<` and `>` there is no sensible rule, so it raises TypeError.",
          '- It is not a ValueError: a ValueError comes from a conversion such as `int(\'18.2\')`, and no conversion happens here.',
          '',
          "The fix is to convert as soon as the value arrives: `score = int(score_feed)`. Anything read from `input()` or a feed is text until you convert it.",
        ),
      },
      selfExplain: "Why does score_feed == 150 give False instead of raising the same TypeError?",
    },
    {
      id: 't02-s5-q3',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Win, lose or still chasing',
      prompt: md(
        'Complete `chase_message(runs_needed, balls_left)` so it **returns** one of three strings:',
        '',
        "- `'Scorchers win'` as soon as no runs are still needed (`runs_needed` is 0 or less)",
        "- otherwise `'Scorchers lose'` when there are no balls left",
        "- otherwise `'Still chasing'`",
        '',
        'Both gaps are comparison operators. `balls_left` is an int, 0 or more. `runs_needed` is an int that can end up below 0, ' +
          'because a boundary can score more runs than were needed.',
      ),
      concepts: ['elif', 'comparison', 'boundary', 'branch-order'],
      detects: ['elif_vs_if', 'assign_vs_compare'],
      expectedSec: 120,
      fnName: 'chase_message',
      template: `def chase_message(runs_needed, balls_left):
    if runs_needed ⟦1⟧ 0:
        message = 'Scorchers win'
    elif balls_left ⟦2⟧ 0:
        message = 'Scorchers lose'
    else:
        message = 'Still chasing'
    return message`,
      blanks: [
        { id: '1', accept: ['<='] },
        { id: '2', accept: ['==', '<='] },
      ],
      tests: [
        { id: 'v1', call: 'chase_message(0, 3)', expect: "'Scorchers win'", label: 'scores the winning run with 3 balls left', hidden: false },
        { id: 'v2', call: 'chase_message(12, 6)', expect: "'Still chasing'", label: '12 needed off 6', hidden: false },
        { id: 'h1', call: 'chase_message(5, 0)', expect: "'Scorchers lose'", label: 'no balls left, 5 short', hidden: true },
        { id: 'h2', call: 'chase_message(0, 0)', expect: "'Scorchers win'", label: 'winning run off the last ball', hidden: true, tag: 'elif_vs_if' },
        { id: 'h3', call: 'chase_message(1, 1)', expect: "'Still chasing'", label: 'one run off one ball', hidden: true },
        { id: 'h4', call: 'chase_message(-2, 3)', expect: "'Scorchers win'", label: 'a six when only 4 were needed', hidden: true },
      ],
      hints: [
        'A chase is won the moment `runs_needed` reaches 0, not once it goes below 0. Which comparison includes the value 0 itself?',
        'Gap 1 has to be `True` for 0 as well as for anything smaller. Gap 2 asks whether there are no balls left at all.',
        'Gap 1 is `<=`. For gap 2, `balls_left` never goes below 0, so testing it against 0 for equality is enough.',
      ],
      solution: {
        code: `def chase_message(runs_needed, balls_left):
    if runs_needed <= 0:
        message = 'Scorchers win'
    elif balls_left == 0:
        message = 'Scorchers lose'
    else:
        message = 'Still chasing'
    return message`,
        explanation: md(
          '- Gap 1 is `<=`. A boundary on the wrong side is the classic slip here: with `<`, a chase that finishes on exactly 0 runs needed falls through to the next branch and the app reports a loss.',
          '- Gap 2 is `==` (`<=` also works, since `balls_left` is never negative). It is only reached when runs are still needed, because the chain stops at the first true branch.',
          '- The order is what makes the last-ball case work. `chase_message(0, 0)` matches both conditions, and the `if` is tested first, so the win wins.',
          '- `else` covers everything left: runs still needed and balls still to come.',
          '- The three branches all store into `message`, and the single `return message` after the chain sends back whichever one ran.',
        ),
      },
      selfExplain: 'What would chase_message(0, 0) return if the two branches were swapped?',
    },
    {
      id: 't02-s5-q4',
      format: 'fixBug',
      diff: 'medium',
      core: false,
      title: 'Guard the division',
      prompt: md(
        '`required_rate(runs_needed, balls_left)` should **return** the runs per over the Scorchers still need, rounded to 2 decimal places, ' +
        'or `None` when there are no balls left. An over is 6 balls, so 61 runs off 30 balls is `12.2`.',
        '',
        'The `None` case was written, but the app still crashes on the last ball of the innings. Run the tests and fix it.',
      ),
      concepts: ['guard', 'division', 'return-none'],
      detects: ['zero_division', 'return_type_wrong'],
      expectedSec: 210,
      buggy: RATE_BUGGY,
      bugMistake: 'zero_division',
      maxChangedLines: 2,
      fnName: 'required_rate',
      tests: [
        { id: 'v1', call: 'required_rate(61, 30)', expect: '12.2', cmp: 'float', label: '61 runs off 30 balls', hidden: false },
        { id: 'v2', call: 'required_rate(12, 0)', expect: 'None', label: 'no balls left', hidden: false, tag: 'zero_division' },
        { id: 'h1', call: 'required_rate(0, 6)', expect: '0.0', cmp: 'float', label: 'nothing left to get', hidden: true },
        { id: 'h2', call: 'required_rate(5, 1)', expect: '30.0', cmp: 'float', label: '5 off the last ball', hidden: true },
        { id: 'h3', call: 'required_rate(180, 120)', expect: '9.0', cmp: 'float', label: 'a full 20 overs', hidden: true },
        { id: 'h4', call: 'required_rate(0, 0)', expect: 'None', label: 'innings over with the scores level', hidden: true, tag: 'zero_division' },
      ],
      hints: [
        'The `if` that returns `None` is correct. Ask yourself what has already happened by the time Python reaches it.',
        'Python runs a function from the top down. A check that protects a calculation is useless once the calculation has been done. Move the check so nothing risky runs before it.',
        'The body should start with the two lines `if balls_left == 0:` and `return None`.',
      ],
      solution: {
        code: RATE_FIXED,
        explanation: md(
          '- The bug is the order. Line 2 divides by `balls_left` before line 3 ever asks whether `balls_left` is 0, so a call with 0 balls raises `ZeroDivisionError` and the `return None` is never reached.',
          '- Moving the check to the top makes it a **guard clause**: it deals with the impossible case and leaves the function, so the rest of the body can assume the divisor is safe.',
          '- Nothing else changes. `runs_needed / balls_left * 6` is still the rate per over, and `round(..., 2)` still trims it to 2 decimal places at the end.',
          '- Returning `None` (not the string `\'None\'` and not 0) is what the spec asks for, so the caller can tell "no rate" apart from a rate of zero.',
        ),
      },
      selfExplain: 'Why is a guard clause at the top of a function usually safer than a check further down?',
    },
    {
      id: 't02-s5-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: true,
      title: 'Write chase_status',
      prompt: md(
        'Complete `chase_status(target, scored, balls_left, wickets_lost)` so it **returns** one of five strings. ' +
        'All four arguments are ints.',
        '',
        "1. `'Won'` if `scored` has reached `target` (or passed it). This wins over every other rule.",
        "2. Otherwise `'Lost'` if 10 wickets have gone, or there are no balls left.",
        '3. Otherwise work out the required run rate: the runs still needed, divided by the overs still left (an over is 6 balls, so 30 balls is 5.0 overs).',
        "4. Return `'Cruising'` when that rate is 6 or less, `'Under pressure'` when it is more than 6 but 12 or less, and `'Needs a miracle'` when it is more than 12.",
        '',
        'Do not round the rate. Make sure the function never divides by zero.',
      ),
      concepts: ['guard', 'elif', 'branch-order', 'boundary', 'return'],
      detects: ['elif_vs_if', 'zero_division', 'print_vs_return', 'return_type_wrong'],
      expectedSec: 600,
      fnName: 'chase_status',
      starter: STATUS_STARTER,
      tests: [
        { id: 'v1', call: 'chase_status(180, 150, 30, 5)', expect: "'Cruising'", label: '30 needed off 5 overs', hidden: false },
        { id: 'v2', call: 'chase_status(180, 119, 30, 6)', expect: "'Needs a miracle'", label: '61 needed off 5 overs', hidden: false },
        { id: 'v3', call: 'chase_status(180, 182, 12, 4)', expect: "'Won'", label: 'target passed', hidden: false },
        { id: 'h1', call: 'chase_status(200, 100, 0, 3)', expect: "'Lost'", label: 'no balls left', hidden: true, tag: 'zero_division' },
        { id: 'h2', call: 'chase_status(150, 150, 0, 10)', expect: "'Won'", label: 'winning run off the last ball, all out', hidden: true, tag: 'elif_vs_if' },
        { id: 'h3', call: 'chase_status(200, 100, 24, 10)', expect: "'Lost'", label: 'all ten wickets gone', hidden: true },
        { id: 'h4', call: 'chase_status(180, 120, 30, 6)', expect: "'Under pressure'", label: 'rate of exactly 12', hidden: true },
        { id: 'h5', call: 'chase_status(200, 170, 30, 9)', expect: "'Cruising'", label: 'rate of exactly 6', hidden: true },
        { id: 'h6', call: 'chase_status(160, 100, 60, 2)', expect: "'Cruising'", label: '60 needed off 10 overs', hidden: true },
        { id: 'h7', call: 'chase_status(200, 166, 35, 4)', expect: "'Cruising'", label: 'balls left are not a whole number of overs', hidden: true, tag: 'int_vs_float_division' },
      ],
      hints: [
        'Two of the five answers can be decided without any arithmetic. Deal with those first, and notice that doing so also makes the division safe.',
        md(
          'Plan:',
          '',
          '1. `if scored >= target:` return the win. It comes first because the spec says it beats everything.',
          '2. Then the lost case: 10 or more wickets **or** no balls left. Returning here means the code below never sees `balls_left` equal to 0.',
          '3. Work out `overs_left = balls_left / 6` and the rate from the runs still needed.',
          '4. One `if`/`elif`/`else` chain on the rate, from the smallest band up.',
        ),
        md(
          '```python',
          '    if scored >= target:',
          "        return 'Won'",
          '    if wickets_lost >= 10 or balls_left == 0:',
          "        return 'Lost'",
          '    rate = (target - scored) / (balls_left / 6)',
          '```',
        ),
      ],
      solution: {
        code: STATUS_SOLUTION,
        explanation: md(
          "- `if scored >= target: return 'Won'` is first, so a side that passes the target on the last ball with all ten wickets down is still a win. Put this check later and `chase_status(150, 150, 0, 10)` wrongly returns `'Lost'`.",
          '- The second guard uses `or`, because either reason ends the innings. Each side repeats its own variable: `wickets_lost >= 10 or balls_left == 0`, never `wickets_lost >= 10 or == 0`.',
          '- Because that guard returns, the division below can never divide by zero. This is the ordinary way to make a division safe: rule out the bad case and leave the function.',
          '- `(target - scored) / (balls_left / 6)` is runs needed over overs left. `balls_left / 6` must use `/`: with `//`, 30 balls would be 5 overs but 25 balls would collapse to 4 overs and the rate would be wrong.',
          "- The rate chain reads from the smallest band up, so each `elif` needs only one comparison: reaching `elif rate <= 12` already means the rate is more than 6.",
          '- `<=` on both boundaries puts a rate of exactly 6 in `Cruising` and exactly 12 in `Under pressure`, as the spec says.',
          '- Every branch uses `return`. Printing the answer instead would give the caller `None`.',
        ),
      },
      selfExplain: 'Which test fails if the Lost check comes before the Won check, and why?',
    },
  ],
};

export default scenario;
