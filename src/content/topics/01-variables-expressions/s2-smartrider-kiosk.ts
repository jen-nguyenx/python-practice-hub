import type { Scenario } from '../../schema.ts';

const py = (...lines: string[]): string => lines.join('\n');

const scenario: Scenario = {
  id: 't01-s2',
  title: 'SmartRider top-up kiosk',
  story:
    'The SmartRider top-up kiosk at Elizabeth Quay station reads everything a customer types as text. ' +
    'Before the kiosk can do any maths with a top-up amount, that text has to become a number.',
  questions: [
    {
      id: 't01-s2-q1',
      format: 'predict',
      diff: 'easy',
      core: true,
      title: 'Text that looks like a number',
      prompt:
        'The kiosk stored what the customer typed in `top_up`. What does this program print?',
      concepts: ['types', 'type-conversion', 'string-operators'],
      detects: ['input_without_int', 'str_int_concat'],
      expectedSec: 90,
      choice: true,
      code: py(
        "top_up = '20'",
        'trips = 3',
        'print(top_up * 2)',
        'print(int(top_up) * 2)',
        'print(str(trips) + top_up)',
      ),
      mutants: [
        {
          code: py(
            "top_up = '20'",
            'trips = 3',
            'print(int(top_up) * 2)',
            'print(int(top_up) * 2)',
            'print(str(trips) + top_up)',
          ),
          mistake: 'input_without_int',
        },
        {
          code: py(
            "top_up = '20'",
            'trips = 3',
            'print(top_up * 2)',
            'print(int(top_up) * 2)',
            'print(trips + int(top_up))',
          ),
          mistake: 'str_int_concat',
        },
      ],
      hints: [
        "`'20'` has quotes around it, so it is a str, not an int. What do `*` and `+` do when one side is text?",
        'Go line by line. A str times an int repeats the text. `int()` turns the text into a number before the maths. `str()` turns a number into text, and `+` between two strings joins them.',
        "Line 3 does not print `40`. Line 4 does.",
      ],
      solution: {
        explanation:
          "- Line 3: `top_up` is the text `'20'`. A string times 2 repeats it, so this prints `2020`.\n" +
          "- Line 4: `int(top_up)` is the number `20`, and `20 * 2` is `40`.\n" +
          "- Line 5: `str(trips)` is the text `'3'`. `+` between two strings joins them end to end, so this prints `320`, not `23`.\n\n" +
          'Output:\n\n```python\n2020\n40\n320\n```\n\n' +
          'This is why every value from `input()` must be converted before you calculate with it.',
      },
      selfExplain: "Why does '20' * 2 not raise an error, even though it gives the wrong answer for a top-up?",
    },
    {
      id: 't01-s2-q2',
      format: 'multi',
      diff: 'medium',
      core: true,
      title: 'Which conversions crash?',
      prompt:
        'The kiosk code evaluates these expressions. Select **every** expression that raises an error.',
      concepts: ['type-conversion', 'string-concat'],
      detects: ['int_of_float_string', 'str_int_concat'],
      expectedSec: 150,
      options: [
        {
          id: 'a',
          text: "int('3.40')",
          correct: true,
          why: "ValueError. `int()` only accepts text of a whole number, such as `'3'`. Use `float('3.40')`, or `int(float('3.40'))` if you need a whole number.",
        },
        {
          id: 'b',
          text: "float('3.40')",
          correct: false,
          mistake: 'int_of_float_string',
          why: "No error. `float()` reads decimal text and gives `3.4`.",
        },
        {
          id: 'c',
          text: 'int(3.99)',
          correct: false,
          mistake: 'int_of_float_string',
          why: 'No error. The argument is already a float, not text, and `int()` cuts off the decimal part to give `3`. It does not round.',
        },
        {
          id: 'd',
          text: "'Balance: $' + 12.5",
          correct: true,
          why: "TypeError: can only concatenate str (not \"float\") to str. Write `'Balance: $' + str(12.5)` or use an f-string.",
        },
        {
          id: 'e',
          text: "float('$12.50')",
          correct: true,
          why: "ValueError: could not convert string to float. The dollar sign is not part of a number, so it must be removed before converting.",
        },
      ],
      hints: [
        'Two kinds of error are hiding here: text that is not a valid number, and `+` used on two different types.',
        'For each conversion, ask: is the argument text or already a number? If it is text, is it written exactly the way that conversion expects? For the `+`, check whether both sides are the same type.',
        "`int()` on text accepts only whole numbers like `'12'`. `float()` accepts `'3.40'`, but not extra symbols.",
      ],
      solution: {
        explanation:
          'Three expressions raise an error.\n\n' +
          "- `int('3.40')` raises ValueError, because text given to `int()` must be a whole number.\n" +
          "- `float('3.40')` is fine and gives `3.4`.\n" +
          '- `int(3.99)` is fine and gives `3`. Converting a float (not a string) with `int()` just drops the decimals.\n' +
          "- `'Balance: $' + 12.5` raises TypeError, because `+` cannot join a str and a float.\n" +
          "- `float('$12.50')` raises ValueError, because `$` is not part of a number.",
      },
      selfExplain: "Why does int(3.99) work when int('3.99') does not?",
    },
    {
      id: 't01-s2-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'Top-ups with cents',
      prompt:
        "`top_up_message(balance, top_up_text)` adds a top-up to a SmartRider balance and returns a message such as `'New balance: $23.20'`. " +
        "`balance` is a float. `top_up_text` is the amount exactly as the customer typed it, such as `'20'` or `'12.50'`.\n\n" +
        'It worked for Priya, who typed `20`, but crashed for Josh, who typed `12.50`. Run the tests, then fix the bug.',
      concepts: ['type-conversion', 'f-strings'],
      detects: ['int_of_float_string'],
      expectedSec: 150,
      fnName: 'top_up_message',
      buggy: py(
        'def top_up_message(balance, top_up_text):',
        '    new_balance = balance + int(top_up_text)',
        "    return f'New balance: ${new_balance:.2f}'",
      ),
      bugMistake: 'int_of_float_string',
      maxChangedLines: 1,
      tests: [
        { id: 'v1', call: "top_up_message(3.2, '20')", expect: "'New balance: $23.20'", label: 'whole-dollar top-up', hidden: false },
        { id: 'v2', call: "top_up_message(0.0, '12.50')", expect: "'New balance: $12.50'", label: 'top-up with cents', hidden: false, tag: 'int_of_float_string' },
        { id: 'h1', call: "top_up_message(7.35, '5.5')", expect: "'New balance: $12.85'", label: 'one decimal place typed', hidden: true, tag: 'int_of_float_string' },
        { id: 'h2', call: "top_up_message(10.0, '0')", expect: "'New balance: $10.00'", label: 'zero top-up', hidden: true },
        { id: 'h3', call: "top_up_message(4.9, '45.25')", expect: "'New balance: $50.15'", label: 'both amounts have cents', hidden: true, tag: 'int_of_float_string' },
      ],
      hints: [
        'Run the tests. Which input crashes, and what does the error message say about the text it was given?',
        'Line 2 uses a conversion that only understands whole numbers. Swap it for the conversion that understands decimals. The f-string on line 3 is already correct.',
        'Line 2 should read `new_balance = balance + ...(top_up_text)` with a different conversion function.',
      ],
      solution: {
        code: py(
          'def top_up_message(balance, top_up_text):',
          '    new_balance = balance + float(top_up_text)',
          "    return f'New balance: ${new_balance:.2f}'",
        ),
        explanation:
          "- Line 2 had `int(top_up_text)`. `int('20')` works, which is why the first test passed, but `int('12.50')` raises `ValueError: invalid literal for int() with base 10`.\n" +
          "- `float(top_up_text)` accepts both `'20'` (giving `20.0`) and `'12.50'` (giving `12.5`), so it is the right conversion for money.\n" +
          '- Line 3 is unchanged: `:.2f` shows the balance with exactly two decimal places, so `12.5` appears as `$12.50`.',
      },
      selfExplain: "Why did the test with '20' pass even though the bug was there?",
    },
  ],
};

export default scenario;
