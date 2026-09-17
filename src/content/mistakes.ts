// Mistake catalogue: labels, explanations, runtime matchers and error explanations.
// Runtime matcher regexes were written against real Python 3.14.2 messages captured from Pyodide 314.0.7
// (see the fixture in src/content/__tests__/catalogues.test.ts).
import type { AstFlag, MistakeCategory, MistakeId, PatternId } from './ids.ts';
import { MISTAKE_IDS } from './ids.ts';
import type { Md } from './schema.ts';

export interface MistakeDef {
  id: MistakeId;
  /** Short plain-language name, e.g. "Printing instead of returning". */
  label: string;
  category: MistakeCategory;
  /** What it means, for a beginner. */
  explain: Md;
  /** The usual fix. */
  fix: Md;
  example: { bad: string; good: string };
  pattern?: PatternId;
  /** Runtime errors that indicate this mistake: exception type plus optional message regex (source string). */
  runtime?: { type: string; message?: string }[];
  astFlags?: AstFlag[];
}

type Def = Omit<MistakeDef, 'id'>;

// Shared regex sources (kept here so the NoneType and str/number families stay consistent).
const R_NONE_OPERAND = String.raw`unsupported operand type\(s\) for .+: ('NoneType' and|'\w+' and 'NoneType')`;
const R_NONE_COMPARE = String.raw`not supported between instances of ('NoneType' and|'\w+' and 'NoneType')`;
const R_STR_NUM_COMPARE = String.raw`not supported between instances of ('str' and '(int|float)'|'(int|float)' and 'str')`;
const R_STR_NUM_OPERAND = String.raw`unsupported operand type\(s\) for .+: ('str' and '(int|float)'|'(int|float)' and 'str')`;
const LIST_METHODS = 'append|extend|insert|remove|pop|sort|reverse|clear|add';

const DEFS: Record<MistakeId, Def> = {
  // ---------------------------------------------------------------- syntax
  missing_colon: {
    label: 'Missing colon',
    category: 'syntax',
    explain:
      'Lines that start a block (`if`, `elif`, `else`, `for`, `while`, `def`, `try`, `except`, `with`) must end with a colon. ' +
      'Without it Python cannot tell where the block begins, so none of the program runs.',
    fix: 'Add `:` at the end of the line Python points to. If that line says `else if`, write `elif` instead.',
    example: {
      bad: 'if mark >= 50\n    print("Pass")',
      good: 'if mark >= 50:\n    print("Pass")',
    },
    runtime: [{ type: 'SyntaxError', message: "expected ':'" }],
  },
  indent_error: {
    label: 'Wrong indentation',
    category: 'syntax',
    explain:
      'Python uses indentation to decide which lines belong inside an `if`, loop or function. ' +
      'Every line in a block must be indented by the same amount (4 spaces), and a line that is not in a block must not be indented.',
    fix: 'Indent the lines inside the block by 4 spaces, line up lines in the same block exactly, and use spaces rather than tabs.',
    example: {
      bad: 'def greet(name):\nreturn "Hi " + name',
      good: 'def greet(name):\n    return "Hi " + name',
    },
    runtime: [{ type: 'IndentationError' }, { type: 'TabError' }],
  },
  unclosed_bracket: {
    label: 'Unclosed bracket or quote',
    category: 'syntax',
    explain:
      'Every `(`, `[`, `{` and quote needs a matching closing one. ' +
      'When one is missing, Python keeps reading the next lines as part of the same expression, so the error can point at the line where the bracket opened.',
    fix: 'Count the opening and closing brackets and quotes on the line Python points to, and add the missing one.',
    example: {
      bad: 'total = (price + tax\nprint(total)',
      good: 'total = (price + tax)\nprint(total)',
    },
    runtime: [
      { type: 'SyntaxError', message: 'was never closed' },
      { type: 'SyntaxError', message: String.raw`unterminated (triple-quoted )?(f-)?string literal` },
      { type: 'SyntaxError', message: 'does not match opening parenthesis' },
      { type: 'SyntaxError', message: String.raw`unmatched '[)\]}]'` },
      { type: 'SyntaxError', message: String.raw`f-string: expecting '\}'` },
    ],
  },
  name_typo: {
    label: 'Misspelt name',
    category: 'syntax',
    explain:
      'Python only knows names exactly as they were written: `total`, `Total` and `totl` are three different names. ' +
      'A misspelt variable, function or method name, or a name used before it was given a value, stops the program.',
    fix: 'Check the spelling and capital letters against the line where the name was created. Python often suggests the right name ("Did you mean ...?").',
    example: {
      bad: 'total = 5\nprint(totl)',
      good: 'total = 5\nprint(total)',
    },
    runtime: [
      { type: 'NameError', message: 'Did you mean' },
      { type: 'NameError' },
      { type: 'AttributeError', message: String.raw`has no attribute '\w+'\. Did you mean` },
    ],
  },
  syntax_other: {
    label: 'Other syntax error',
    category: 'syntax',
    explain:
      'Python could not read the code, so none of it ran. ' +
      'Common causes are `print "hi"` without brackets, a missing comma in a list, a keyword used as a name, or curly quotes pasted from a document.',
    fix: 'Look at the line Python points to and the line just before it. Compare the line with a working example of the same statement.',
    example: {
      bad: 'print "Hello"\nnums = [1, 2 3]',
      good: 'print("Hello")\nnums = [1, 2, 3]',
    },
    runtime: [{ type: 'SyntaxError' }],
  },

  // ---------------------------------------------------------------- conceptual
  int_vs_float_division: {
    label: 'Mixing up / and //',
    category: 'conceptual',
    explain:
      '`/` always gives a float, even when it divides evenly: `10 / 2` is `5.0`. `//` gives the whole-number part: `7 // 2` is `3`. ' +
      'Using `/` for an index or `range()` crashes, and using `//` for an average quietly loses the decimals.',
    fix: 'Use `//` when you need a whole number (an index, a count, a digit). Use `/` when you need the exact value, such as an average.',
    example: {
      bad: 'nums = [4, 8, 15, 16]\nmiddle = nums[len(nums) / 2]',
      good: 'nums = [4, 8, 15, 16]\nmiddle = nums[len(nums) // 2]',
    },
    pattern: 'floor-division-intent',
    runtime: [
      { type: 'TypeError', message: String.raw`indices must be integers.*not '?float'?` },
      { type: 'TypeError', message: String.raw`'float' object cannot be interpreted as an integer` },
      { type: 'TypeError', message: 'slice indices must be integers' },
    ],
  },
  str_int_concat: {
    label: 'Joining text and numbers with +',
    category: 'conceptual',
    explain:
      '`+` joins two strings or adds two numbers, but it cannot mix them. ' +
      '`"Total: " + 5` fails because Python will not guess whether you want text or maths.',
    fix: 'Use an f-string such as `f"Total: {total}"`, or convert the number with `str(total)` before joining.',
    example: {
      bad: 'total = 42\nprint("Total: " + total)',
      good: 'total = 42\nprint(f"Total: {total}")',
    },
    pattern: 'fstrings-for-output',
    runtime: [{ type: 'TypeError', message: String.raw`can only concatenate str \(not "(int|float|bool)"\) to str` }],
  },
  input_without_int: {
    label: 'Doing maths on text',
    category: 'conceptual',
    explain:
      '`input()` and `line.split(",")` always give strings, even when the text looks like a number. ' +
      'Comparing or calculating with `"19"` fails with a TypeError, or silently gives the wrong answer: `"3" + "4"` is `"34"`.',
    fix: 'Convert as soon as you read the value: `age = int(input("Age: "))` or `mark = float(fields[2])`.',
    example: {
      bad: 'age = input("Age: ")\nif age >= 18:\n    print("Adult")',
      good: 'age = int(input("Age: "))\nif age >= 18:\n    print("Adult")',
    },
    runtime: [
      { type: 'TypeError', message: R_STR_NUM_COMPARE },
      { type: 'TypeError', message: R_STR_NUM_OPERAND },
      { type: 'TypeError', message: String.raw`can't multiply sequence by non-int of type '(float|str)'` },
      { type: 'TypeError', message: String.raw`'str' object cannot be interpreted as an integer` },
      { type: 'TypeError', message: String.raw`type str doesn't define __round__ method` },
      { type: 'TypeError', message: String.raw`bad operand type for .+: 'str'` },
      { type: 'ValueError', message: String.raw`Unknown format code '.' for object of type 'str'` },
    ],
  },
  int_of_float_string: {
    label: "Converting text that isn't a valid number",
    category: 'conceptual',
    explain:
      '`int()` only accepts text that is a whole number, so `int("12.0")` and `int("N/A")` both fail. ' +
      '`float()` accepts decimals but still fails on empty text or words. File data often has blank or `N/A` fields.',
    fix:
      '- For decimal text use `float()`, or `int(float(text))` if you need a whole number.\n' +
      '- For values that might not be numbers, check first or use `try` / `except ValueError` and skip that value.',
    example: {
      bad: 'mark = int("72.5")',
      good: 'mark = float("72.5")',
    },
    runtime: [
      { type: 'ValueError', message: String.raw`invalid literal for int\(\) with base 10` },
      { type: 'ValueError', message: 'could not convert string to float' },
    ],
  },
  assign_vs_compare: {
    label: 'Using = instead of ==',
    category: 'conceptual',
    explain:
      'A single `=` stores a value in a variable. `==` asks whether two values are equal and gives `True` or `False`. ' +
      'A condition such as `if x = 5:` is not valid Python.',
    fix: 'Use `==` in conditions (`if x == 5:`) and `=` only when you want to store a value.',
    example: {
      bad: 'if answer = "yes":\n    print("Great")',
      good: 'if answer == "yes":\n    print("Great")',
    },
    runtime: [{ type: 'SyntaxError', message: String.raw`Maybe you meant '=='` }],
  },
  is_vs_equals: {
    label: 'Using is to compare values',
    category: 'conceptual',
    explain:
      '`is` checks whether two names refer to the very same object, not whether the values are equal. ' +
      '`x is 5` or `name is "Ana"` can be `False` even when the values match, and Python warns about it.',
    fix: 'Use `==` to compare numbers and strings. Keep `is` for `None` only: `if result is None:`.',
    example: {
      bad: 'if name is "Ana":\n    print("Hi Ana")',
      good: 'if name == "Ana":\n    print("Hi Ana")',
    },
    pattern: 'is-for-none-only',
    runtime: [{ type: 'SyntaxWarning', message: String.raw`"is( not)?" with .*literal` }],
    astFlags: ['is_literal'],
  },
  or_with_literal: {
    label: 'x == 1 or 2 style condition',
    category: 'conceptual',
    explain:
      '`if day == "Sat" or "Sun":` reads like English but Python treats it as `(day == "Sat") or "Sun"`. ' +
      'A non-empty string counts as true, so the condition is always true.',
    fix: 'Repeat the comparison on both sides (`day == "Sat" or day == "Sun"`), or use `in`: `day in ("Sat", "Sun")`.',
    example: {
      bad: 'if day == "Sat" or "Sun":\n    print("Weekend")',
      good: 'if day in ("Sat", "Sun"):\n    print("Weekend")',
    },
    pattern: 'in-membership',
    astFlags: ['or_with_literal'],
  },
  elif_vs_if: {
    label: 'Separate ifs instead of elif',
    category: 'conceptual',
    explain:
      'In an `if` / `elif` chain only the first true branch runs. Separate `if` statements are all checked, so a value can match more than one. ' +
      'A mark of 85 would get both "HD" and "D" from two separate ifs.',
    fix: 'Use `elif` when the choices are exclusive (only one should happen), and order the conditions from most to least specific.',
    example: {
      bad: 'if mark >= 80:\n    grade = "HD"\nif mark >= 70:\n    grade = "D"',
      good: 'if mark >= 80:\n    grade = "HD"\nelif mark >= 70:\n    grade = "D"',
    },
  },
  off_by_one_range: {
    label: 'Off-by-one range',
    category: 'conceptual',
    explain:
      '`range(start, stop)` includes `start` but stops before `stop`, so `range(1, 5)` gives 1, 2, 3, 4. ' +
      'A loop that should cover 1 to n needs `range(1, n + 1)`, and indexes of a list go from 0 to `len(nums) - 1`.',
    fix: 'Check the first and last values the loop produces. Loop over the items directly (`for n in nums:`) when you do not need the position.',
    example: {
      bad: 'total = 0\nfor k in range(1, n):\n    total += k',
      good: 'total = 0\nfor k in range(1, n + 1):\n    total += k',
    },
    pattern: 'for-each-loop',
  },
  accumulator_init: {
    label: 'Total not set up before the loop',
    category: 'conceptual',
    explain:
      'A running total or count must be given its starting value once, before the loop. ' +
      'If it is never set, `total += n` crashes; if it is set inside the loop, it restarts on every pass and only the last item counts.',
    fix: 'Put `total = 0` (or `count = 0`, `result = []`) on the line before the loop. A product starts at 1, and a maximum starts at the first item.',
    example: {
      bad: 'for n in nums:\n    total = 0\n    total += n',
      good: 'total = 0\nfor n in nums:\n    total += n',
    },
    pattern: 'init-accumulator',
    runtime: [{ type: 'UnboundLocalError', message: 'cannot access local variable' }],
    astFlags: ['acc_reset_in_loop'],
  },
  modify_loop_var: {
    label: 'Changing the for loop variable',
    category: 'conceptual',
    explain:
      'In `for i in range(10):`, Python gives `i` its next value at the start of every pass. ' +
      'Changing `i` inside the loop does not skip ahead; the change is thrown away on the next pass.',
    fix: 'Use `range(start, stop, step)` to count in steps, or use a `while` loop when you need to control the counter yourself.',
    example: {
      bad: 'for i in range(10):\n    print(i)\n    i += 2',
      good: 'for i in range(0, 10, 3):\n    print(i)',
    },
  },
  early_return_in_loop: {
    label: 'Returning inside the loop too early',
    category: 'conceptual',
    explain:
      '`return` ends the whole function straight away, even in the middle of a loop. ' +
      'A `return` in the `else` branch inside the loop gives up after checking only the first item.',
    fix: 'Return inside the loop only when you have found the answer. Put the "not found" `return` after the loop, once every item has been checked.',
    example: {
      bad: 'def has_fail(marks):\n    for m in marks:\n        if m < 50:\n            return True\n        else:\n            return False',
      good: 'def has_fail(marks):\n    for m in marks:\n        if m < 50:\n            return True\n    return False',
    },
  },
  infinite_while: {
    label: 'Loop that never ends',
    category: 'conceptual',
    explain:
      'A `while` loop repeats until its condition becomes `False`. ' +
      'If nothing inside the loop changes the variables in the condition, or a `while True` loop has no reachable `break`, it runs forever.',
    fix: 'Make sure the loop body moves towards the stop condition, for example `n = n // 10` or `i += 1`, and that the update is not inside an `if` that stops running.',
    example: {
      bad: 'n = 1234\ncount = 0\nwhile n > 0:\n    count += 1',
      good: 'n = 1234\ncount = 0\nwhile n > 0:\n    count += 1\n    n = n // 10',
    },
    runtime: [{ type: 'TimeoutError' }, { type: 'OutputLimit' }],
    astFlags: ['while_no_update', 'while_true_no_break'],
  },
  float_equality: {
    label: 'Comparing decimals with ==',
    category: 'conceptual',
    explain:
      'Floats are stored approximately, so `0.1 + 0.2 == 0.3` is `False`. ' +
      'A loop that waits for a float to equal an exact value may never stop, and a series should stop when the change is smaller than a tolerance.',
    fix: 'Compare with a tolerance: `abs(a - b) < 1e-9`, or stop a series with `while abs(term) >= tol:`.',
    example: {
      bad: 'x = 0.1 + 0.2\nif x == 0.3:\n    print("equal")',
      good: 'x = 0.1 + 0.2\nif abs(x - 0.3) < 1e-9:\n    print("equal")',
    },
  },
  print_vs_return: {
    label: 'Printing instead of returning',
    category: 'conceptual',
    explain:
      '`print` only shows a value on the screen; `return` hands the value back to the code that called the function. ' +
      'A function with no `return` gives back `None`, so `x = f()` stores `None` and later maths or comparisons with it fail.',
    fix: 'Replace `print(result)` with `return result` inside the function. Print the returned value outside the function if you want to see it.',
    example: {
      bad: 'def double(x):\n    print(x * 2)\n\nanswer = double(4) + 1',
      good: 'def double(x):\n    return x * 2\n\nanswer = double(4) + 1',
    },
    pattern: 'return-not-print',
    runtime: [
      { type: 'TypeError', message: R_NONE_OPERAND },
      { type: 'TypeError', message: R_NONE_COMPARE },
      { type: 'TypeError', message: String.raw`can only concatenate str \(not "NoneType"\) to str` },
      { type: 'TypeError', message: String.raw`NoneType doesn't define __round__` },
      { type: 'TypeError', message: String.raw`NoneType\.__format__` },
      { type: 'TypeError', message: String.raw`argument must be .*not 'NoneType'` },
    ],
    astFlags: ['missing_return', 'return_print'],
  },
  forgot_to_call: {
    label: 'Forgot the brackets to call a function',
    category: 'conceptual',
    explain:
      'A function name on its own, like `get_score` or `line.split`, is the function itself, not its result. ' +
      'Only adding brackets, `get_score()`, runs it. Comparing, adding or indexing the function object fails.',
    fix: 'Add the brackets and any arguments: `get_score()`, `line.split(",")[0]`, `name.upper()`.',
    example: {
      bad: 'if get_score > 50:\n    print("Pass")',
      good: 'if get_score() > 50:\n    print("Pass")',
    },
    runtime: [
      { type: 'TypeError', message: String.raw`'(function|builtin_function_or_method|method)'` },
      { type: 'AttributeError', message: String.raw`'(function|builtin_function_or_method|method)' object has no attribute` },
    ],
    astFlags: ['bare_function_name'],
  },
  scope_confusion: {
    label: 'Mixing up local and outer variables',
    category: 'conceptual',
    explain:
      'Variables created inside a function are local: they disappear when the function returns and cannot be seen outside it. ' +
      'If a function assigns to a name, Python treats that name as local for the whole function, so it cannot also read the outer variable of the same name.',
    fix: 'Pass values in as parameters and send results back with `return`, then store the returned value outside: `count = add_one(count)`.',
    example: {
      bad: 'count = 0\ndef add_one():\n    count += 1\nadd_one()',
      good: 'count = 0\ndef add_one(count):\n    return count + 1\ncount = add_one(count)',
    },
    pattern: 'function-per-task',
    runtime: [{ type: 'UnboundLocalError', message: 'cannot access local variable' }],
  },
  mutable_default_arg: {
    label: 'List or dict as a default value',
    category: 'conceptual',
    explain:
      'A default value such as `items=[]` is created once, when the function is defined, and shared by every call. ' +
      'Items added in one call are still there in the next call.',
    fix: 'Use `None` as the default and create the list inside the function: `if items is None: items = []`.',
    example: {
      bad: 'def add_mark(mark, marks=[]):\n    marks.append(mark)\n    return marks',
      good: 'def add_mark(mark, marks=None):\n    if marks is None:\n        marks = []\n    marks.append(mark)\n    return marks',
    },
    pattern: 'none-default-arg',
    astFlags: ['mutable_default'],
  },
  string_immutability: {
    label: 'Trying to change a string in place',
    category: 'conceptual',
    explain:
      'Strings cannot be changed after they are made. `word[0] = "B"` fails, and methods like `upper()`, `strip()` and `replace()` return a new string instead of changing the old one. ' +
      'Calling `name.upper()` on its own line does nothing useful.',
    fix: 'Store the new string: `name = name.upper()`, or build a new string with slicing: `word = "B" + word[1:]`.',
    example: {
      bad: 'name = "perth"\nname.upper()\nprint(name)',
      good: 'name = "perth"\nname = name.upper()\nprint(name)',
    },
    runtime: [
      { type: 'TypeError', message: String.raw`'str' object (does not|doesn't) support item` },
      { type: 'AttributeError', message: String.raw`'str' object has no attribute '(${LIST_METHODS})'` },
    ],
    astFlags: ['discarded_str_method'],
  },
  case_sensitive_compare: {
    label: 'Case or spaces not ignored when comparing text',
    category: 'conceptual',
    explain:
      'String comparison is exact: `"Perth" == "perth"` is `False`, and so is `"perth " == "perth"`. ' +
      'CITS1401 tasks often say text should match regardless of case, and file data often has extra spaces.',
    fix: 'Normalise both sides before comparing: `city.strip().lower() == target.strip().lower()`.',
    example: {
      bad: 'if city == "perth":\n    count += 1',
      good: 'if city.strip().lower() == "perth":\n    count += 1',
    },
    pattern: 'test-edge-cases',
  },
  index_out_of_range: {
    label: 'Index past the end',
    category: 'conceptual',
    explain:
      'A list with 3 items has positions 0, 1 and 2, so `nums[3]` does not exist. ' +
      'This often comes from `range(len(nums) + 1)`, `nums[i + 1]` on the last pass, or an empty list.',
    fix: 'Check the largest index your code can use. Loop over the items directly, and handle an empty list before indexing it.',
    example: {
      bad: 'nums = [3, 1, 2]\nlast = nums[len(nums)]',
      good: 'nums = [3, 1, 2]\nlast = nums[len(nums) - 1]',
    },
    pattern: 'for-each-loop',
    runtime: [{ type: 'IndexError' }],
  },
  none_from_inplace: {
    label: 'Saving the None from sort() or append()',
    category: 'conceptual',
    explain:
      'List methods such as `sort()`, `append()`, `reverse()` and `insert()` change the list itself and return `None`. ' +
      '`nums = nums.sort()` replaces your list with `None`, so the next line that uses it fails.',
    fix: 'Call the method on its own line (`nums.sort()`) and keep using `nums`, or use `sorted(nums)` when you want a new sorted list.',
    example: {
      bad: 'nums = [3, 1, 2]\nnums = nums.sort()\nprint(nums[0])',
      good: 'nums = [3, 1, 2]\nnums.sort()\nprint(nums[0])',
    },
    runtime: [
      { type: 'TypeError', message: String.raw`'NoneType' object is not (subscriptable|iterable)` },
      { type: 'TypeError', message: String.raw`object of type 'NoneType' has no len\(\)` },
      { type: 'TypeError', message: String.raw`'NoneType' object (does not|doesn't) support item` },
      { type: 'TypeError', message: String.raw`argument of type 'NoneType' is not` },
      { type: 'AttributeError', message: String.raw`'NoneType' object has no attribute` },
    ],
    astFlags: ['none_from_inplace'],
  },
  aliasing_copy: {
    label: 'Thinking b = a copies a list',
    category: 'conceptual',
    explain:
      '`b = a` does not copy a list; both names now refer to the same list. ' +
      'Appending to `b` also changes what you see through `a`.',
    fix: 'Make a real copy when you need one: `b = a[:]` or `b = list(a)`.',
    example: {
      bad: 'backup = marks\nmarks.append(90)\nprint(backup)',
      good: 'backup = marks[:]\nmarks.append(90)\nprint(backup)',
    },
    pattern: 'new-list-not-mutate',
  },
  tuple_immutability: {
    label: 'Trying to change a tuple',
    category: 'conceptual',
    explain:
      'A tuple, such as `(3, 4)`, cannot be changed after it is made: no item assignment and no `append`. ' +
      'Tuples are for fixed groups of values, like a pair returned from a function.',
    fix: 'Build a new tuple (`point = (5, point[1])`), or use a list if the values need to change.',
    example: {
      bad: 'point = (3, 4)\npoint[0] = 5',
      good: 'point = (3, 4)\npoint = (5, point[1])',
    },
    runtime: [
      { type: 'TypeError', message: String.raw`'tuple' object (does not|doesn't) support item` },
      { type: 'AttributeError', message: String.raw`'tuple' object has no attribute '(${LIST_METHODS})'` },
    ],
  },
  mutate_while_iterating: {
    label: 'Changing a list while looping over it',
    category: 'conceptual',
    explain:
      'Removing items from a list while a `for` loop walks through it shifts the remaining items, so the loop skips some. ' +
      'For dictionaries Python stops with "dictionary changed size during iteration".',
    fix: 'Build a new list (or dictionary) with the items you want to keep, or loop over a copy: `for n in nums[:]:`.',
    example: {
      bad: 'for n in nums:\n    if n < 0:\n        nums.remove(n)',
      good: 'kept = []\nfor n in nums:\n    if n >= 0:\n        kept.append(n)',
    },
    pattern: 'new-list-not-mutate',
    runtime: [{ type: 'RuntimeError', message: 'changed size during iteration' }],
    astFlags: ['mutate_while_iterating'],
  },
  dict_keyerror: {
    label: "Using a key that isn't in the dictionary",
    category: 'conceptual',
    explain:
      'Reading `d[key]` fails when the key is not in the dictionary, and so does `counts[word] += 1` the first time a word is seen. ' +
      'Keys must match exactly, including capital letters and spaces.',
    fix: 'Check with `if key in d:` first, or read with a default: `counts[word] = counts.get(word, 0) + 1`.',
    example: {
      bad: 'counts = {}\nfor w in words:\n    counts[w] += 1',
      good: 'counts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1',
    },
    pattern: 'dict-get-default',
    runtime: [{ type: 'KeyError' }],
  },
  file_newline: {
    label: 'Forgetting to strip newlines from file lines',
    category: 'conceptual',
    explain:
      'Each line read from a file ends with `"\\n"`, so the last field of `line.split(",")` is `"Perth\\n"`, not `"Perth"`. ' +
      'Comparisons with that field quietly fail.',
    fix: 'Strip each line before splitting: `fields = line.strip().split(",")`.',
    example: {
      bad: 'for line in f:\n    fields = line.split(",")',
      good: 'for line in f:\n    fields = line.strip().split(",")',
    },
    pattern: 'with-open-strip-split',
  },
  zero_division: {
    label: 'Dividing by something that can be zero',
    category: 'conceptual',
    explain:
      'Dividing by zero is an error in Python (`/`, `//` and `%`). ' +
      'It usually happens when the count or length is 0, for example the average of an empty list or of a file with no valid rows.',
    fix: 'Check before dividing: `if len(nums) == 0: return 0` (or whatever the task says to return), then divide.',
    example: {
      bad: 'def mean(nums):\n    return sum(nums) / len(nums)',
      good: 'def mean(nums):\n    if len(nums) == 0:\n        return 0\n    return sum(nums) / len(nums)',
    },
    pattern: 'guard-clause',
    runtime: [{ type: 'ZeroDivisionError' }],
  },
  missing_base_case: {
    label: 'No base case reached in recursion',
    category: 'conceptual',
    explain:
      'A recursive function needs a base case that returns without calling itself, and every recursive call must move closer to it. ' +
      'Otherwise the calls never stop and Python raises RecursionError.',
    fix: 'Write the base case first (`if n == 0: return 1`), and check the recursive call uses a smaller input that will reach it (`n - 1`, `word[1:]`).',
    example: {
      bad: 'def count_down(n):\n    print(n)\n    count_down(n - 1)',
      good: 'def count_down(n):\n    if n < 0:\n        return\n    print(n)\n    count_down(n - 1)',
    },
    pattern: 'recursion-checklist',
    runtime: [{ type: 'RecursionError' }],
  },
  recursion_result_ignored: {
    label: 'Recursive result not returned',
    category: 'conceptual',
    explain:
      'Calling the function recursively does not automatically pass its answer back up. ' +
      'If the recursive call is not returned (or combined and returned), the outer call ends without `return` and gives `None`.',
    fix: 'Return the recursive result, for example `return nums[0] + total(nums[1:])`.',
    example: {
      bad: 'def total(nums):\n    if not nums:\n        return 0\n    nums[0] + total(nums[1:])',
      good: 'def total(nums):\n    if not nums:\n        return 0\n    return nums[0] + total(nums[1:])',
    },
    pattern: 'recursion-checklist',
  },
  type_error_other: {
    label: 'Using the wrong type of value',
    category: 'conceptual',
    explain:
      'An operation was given a value of a type it cannot work with, or a function was called with the wrong number of arguments. ' +
      'The message names the types involved, such as `int` or `list`.',
    fix: 'Print the values on that line (or their `type()`) to see what they hold, then convert the value or change how the function is called.',
    example: {
      bad: 'def area(w, h):\n    return w * h\nprint(area(3))',
      good: 'def area(w, h):\n    return w * h\nprint(area(3, 4))',
    },
    runtime: [{ type: 'TypeError' }],
  },
  mutated_input: {
    label: 'Changing the list you were given',
    category: 'conceptual',
    explain:
      'A list passed to a function is the caller\'s own list, not a copy. ' +
      'Sorting it, removing items or appending to it inside the function changes the caller\'s data, which the task usually does not allow.',
    fix: 'Work on a new list: use `sorted(nums)` instead of `nums.sort()`, or build a result list and return it.',
    example: {
      bad: 'def top_three(marks):\n    marks.sort(reverse=True)\n    return marks[:3]',
      good: 'def top_three(marks):\n    ordered = sorted(marks, reverse=True)\n    return ordered[:3]',
    },
    pattern: 'new-list-not-mutate',
  },

  // ---------------------------------------------------------------- strategic
  sort_tiebreak: {
    label: 'Missing tie-break when sorting',
    category: 'strategic',
    explain:
      'When two items have the same value, the order between them is whatever they happened to be in. ' +
      'Tasks that say "then by name" need the second rule in the sort key, or hidden tests with ties fail.',
    fix: 'Sort with a key that returns a tuple: `key=lambda p: (-p[1], p[0])` sorts by score high to low, then name A to Z.',
    example: {
      bad: 'pairs.sort(key=lambda p: p[1], reverse=True)',
      good: 'pairs.sort(key=lambda p: (-p[1], p[0]))',
    },
    pattern: 'sort-key-tiebreak',
  },
  return_type_wrong: {
    label: 'Returning the wrong type or shape',
    category: 'strategic',
    explain:
      'The auto-marker compares the exact value returned, so a list instead of a tuple, a string instead of a number, or an unrounded float counts as wrong. ' +
      'The printed output may look right while the returned value is not.',
    fix: 'Re-read what the task says to return (type, order, rounding) and check it with `print(repr(result))` or `type(result)`.',
    example: {
      bad: 'def min_max(nums):\n    return [min(nums), max(nums)]',
      good: 'def min_max(nums):\n    return (min(nums), max(nums))',
    },
  },
  missing_function: {
    label: 'Function missing or named differently',
    category: 'strategic',
    explain:
      'The tests call the function by the exact name the task gives. ' +
      'A different spelling, different capital letters, or code that is not inside a `def` means the tests cannot find it.',
    fix: 'Copy the function name and parameters exactly from the task, and put your code inside that function.',
    example: {
      bad: 'def Average(nums):\n    return sum(nums) / len(nums)',
      good: 'def average(nums):\n    return sum(nums) / len(nums)',
    },
  },
  top_level_code: {
    label: 'Code outside functions crashed',
    category: 'strategic',
    explain:
      'Lines that are not inside a function run as soon as the file is loaded, before any test calls your function. ' +
      'If one of them crashes or asks for `input()`, no tests can run.',
    fix: 'Keep test calls and `input()` out of the file, or put your own quick checks in a separate place. Only definitions should be at the top level.',
    example: {
      bad: 'def double(x):\n    return x * 2\n\nn = int(input())\nprint(double(n))',
      good: 'def double(x):\n    return x * 2',
    },
    pattern: 'function-per-task',
  },

  // ---------------------------------------------------------------- exam and project rules
  loop_in_recursion: {
    label: 'Using a loop when loops are not allowed',
    category: 'project',
    explain:
      'CITS1401 exam recursion questions say loops are not allowed, and an answer with `for` or `while` scores zero even if it works. ' +
      'The repetition must come from the function calling itself.',
    fix: 'Handle one item (or the first character) yourself, and let the recursive call handle the rest: `word[1:]`, `nums[1:]`, `n - 1`.',
    example: {
      bad: 'def total(nums):\n    result = 0\n    for n in nums:\n        result += n\n    return result',
      good: 'def total(nums):\n    if not nums:\n        return 0\n    return nums[0] + total(nums[1:])',
    },
    pattern: 'recursion-checklist',
    astFlags: ['loop_present'],
  },
  header_order_assumed: {
    label: 'Assuming column positions',
    category: 'project',
    explain:
      'Project CSV files can have their columns in a different order, or extra columns, in the hidden test files. ' +
      'Code that uses `fields[2]` for "age" breaks when the column moves.',
    fix: 'Read the header line, find each column by name once (`age_col = header.index("age")`), then use `fields[age_col]`.',
    example: {
      bad: 'for line in f:\n    age = int(line.strip().split(",")[2])',
      good: 'header = f.readline().strip().lower().split(",")\nage_col = header.index("age")\nfor line in f:\n    age = int(line.strip().split(",")[age_col])',
    },
    pattern: 'header-lookup',
  },
  csv_ext_assumed: {
    label: 'Adding or checking .csv',
    category: 'project',
    explain:
      'CITS1401 projects pass the file name exactly as it should be opened, and it may not end in `.csv`. ' +
      'Adding `".csv"` gives a name like `data.csv.csv`, and rejecting names without `.csv` fails valid tests.',
    fix: 'Open the name you were given as it is: `open(csvfile)`. Do not add or check an extension.',
    example: {
      bad: 'def main(csvfile):\n    f = open(csvfile + ".csv")',
      good: 'def main(csvfile):\n    f = open(csvfile)',
    },
    runtime: [{ type: 'FileNotFoundError', message: String.raw`\.csv\.csv'` }],
    astFlags: ['csv_ext_literal'],
  },
  invalid_row_not_skipped: {
    label: 'Bad rows not skipped',
    category: 'project',
    explain:
      'Project data files include blank lines, missing values, words like `N/A`, negative or zero values and duplicates. ' +
      'Code that trusts every row crashes or includes bad data in its results.',
    fix: 'Check each row before using it (right number of fields, values convert, values in range) and `continue` past rows that fail.',
    example: {
      bad: 'for line in f:\n    name, mark = line.strip().split(",")\n    marks[name] = float(mark)',
      good: 'for line in f:\n    fields = line.strip().split(",")\n    if len(fields) != 2 or fields[1] == "":\n        continue\n    marks[fields[0]] = float(fields[1])',
    },
    pattern: 'test-edge-cases',
  },
  no_graceful_exit: {
    label: 'Crashing instead of returning a safe value',
    category: 'project',
    explain:
      'The project rules say the program must terminate gracefully: a missing file, wrong argument type or empty data should not crash. ' +
      'The task names what to return instead, such as `None` or empty lists.',
    fix: 'Check inputs at the start of `main` and return early, and wrap the file opening in `try` / `except` for the specific error.',
    example: {
      bad: 'def main(csvfile):\n    f = open(csvfile)\n    lines = f.readlines()',
      good: 'def main(csvfile):\n    try:\n        f = open(csvfile)\n    except OSError:\n        return None\n    lines = f.readlines()',
    },
    pattern: 'guard-clause',
  },
  efficiency_repeat_pass: {
    label: 'Reading the same data over and over',
    category: 'project',
    explain:
      'Opening the file again for every question, or looping over all rows inside another loop over all rows, makes the program slow. ' +
      'CITS1401 projects award marks for efficiency.',
    fix: 'Read the file once into a list or dictionary, then answer each part from that data.',
    example: {
      bad: 'for name in names:\n    with open(csvfile) as f:\n        rows = f.readlines()\n    totals[name] = total_for(rows, name)',
      good: 'with open(csvfile) as f:\n    rows = f.readlines()\nfor name in names:\n    totals[name] = total_for(rows, name)',
    },
  },
  import_used: {
    label: 'Importing a module',
    category: 'project',
    explain:
      'CITS1401 projects and exams do not allow any imports, not even `csv` or `math`. ' +
      'A submission with an import is not accepted, so everything is done with plain Python.',
    fix: 'Remove the import. Split lines with `strip()` and `split(",")`, and write maths yourself, for example `x ** 0.5` for a square root.',
    example: {
      bad: 'import math\nroot = math.sqrt(total)',
      good: 'root = total ** 0.5',
    },
    runtime: [{ type: 'ImportError' }, { type: 'ModuleNotFoundError' }],
    astFlags: ['import_used'],
  },
  input_called: {
    label: 'Calling input() in a function or project',
    category: 'project',
    explain:
      'In function and project questions the values arrive as parameters, and the auto-marker never types anything. ' +
      'A call to `input()` makes the tests hang or fail.',
    fix: 'Use the function\'s parameters instead of asking for input.',
    example: {
      bad: 'def total_price(prices):\n    tax = float(input("Tax rate: "))\n    return sum(prices) * (1 + tax)',
      good: 'def total_price(prices, tax):\n    return sum(prices) * (1 + tax)',
    },
    astFlags: ['input_call'],
  },
  print_in_main: {
    label: 'Printing in project code',
    category: 'project',
    explain:
      'CITS1401 project rules say not to call `print()` except to explain a graceful termination. ' +
      'Results must be returned; printed results are not marked.',
    fix: 'Remove debugging prints before submitting, and `return` the results the task asks for.',
    example: {
      bad: 'def main(csvfile):\n    result = [1.5, 2.25]\n    print(result)',
      good: 'def main(csvfile):\n    result = [1.5, 2.25]\n    return result',
    },
    pattern: 'return-not-print',
    astFlags: ['print_call'],
  },
  round_mid_calc: {
    label: 'Rounding too early',
    category: 'project',
    explain:
      'Rounding a value that is used in later calculations adds small errors that can change the final 4th decimal place. ' +
      'The project rules say to round only when putting values into the returned result.',
    fix: 'Keep full precision during calculations and call `round(value, 4)` only on the final values you return.',
    example: {
      bad: 'mean = round(total / n, 4)\nvariance = (square_sum / n) - mean ** 2',
      good: 'mean = total / n\nvariance = (square_sum / n) - mean ** 2\nresult = round(variance, 4)',
    },
    pattern: 'round-at-output',
    astFlags: ['round_in_loop'],
  },
  missing_main: {
    label: 'main() missing or wrong parameters',
    category: 'project',
    explain:
      'The project auto-marker calls `main` with the exact parameters in the task, such as `main(csvfile)`. ' +
      'If `main` is missing, misspelt or has different parameters, every test fails.',
    fix: 'Copy the `def main(...)` line exactly from the task and call your helper functions from inside it.',
    example: {
      bad: 'def Main(filename, country):\n    return None',
      good: 'def main(csvfile):\n    return None',
    },
    pattern: 'function-per-task',
  },

  // ---------------------------------------------------------------- style
  compare_to_true: {
    label: 'Comparing to True or False',
    category: 'style',
    explain:
      'A condition like `is_valid` is already `True` or `False`, so `if is_valid == True:` repeats itself. ' +
      'Likewise `if x > 0: return True else: return False` can simply be `return x > 0`.',
    fix: 'Write `if is_valid:` or `if not is_valid:`, and return a condition directly.',
    example: {
      bad: 'if is_valid == True:\n    count += 1',
      good: 'if is_valid:\n    count += 1',
    },
    pattern: 'if-flag-directly',
    astFlags: ['compare_to_true', 'if_return_bool_literal'],
  },
  shadow_builtin: {
    label: 'Naming a variable after a built-in',
    category: 'style',
    explain:
      'Names like `list`, `sum`, `max`, `str` and `input` already belong to Python functions. ' +
      'Using one as a variable name hides the function, so a later `sum(nums)` fails with "object is not callable".',
    fix: 'Choose a descriptive name instead: `total`, `names`, `largest`, `text`.',
    example: {
      bad: 'sum = 0\nfor n in nums:\n    sum += n',
      good: 'total = 0\nfor n in nums:\n    total += n',
    },
    pattern: 'no-shadow-builtins',
    runtime: [{ type: 'TypeError', message: String.raw`'(int|float|str|list|dict|tuple|set|bool)' object is not callable` }],
    astFlags: ['shadow_builtin'],
  },
  style_naming: {
    label: 'Unclear or non-snake_case names',
    category: 'style',
    explain:
      'Python style (PEP 8) uses lowercase words joined by underscores for variables and functions, like `total_marks`. ' +
      'Names like `x2`, `TM` or `totalMarks` make code harder to read, and CITS1401 projects award marks for style.',
    fix: 'Use descriptive snake_case names, and add a short docstring to each function.',
    example: {
      bad: 'def CalcAvg(L):\n    return sum(L) / len(L)',
      good: 'def average_mark(marks):\n    """Return the mean of marks."""\n    return sum(marks) / len(marks)',
    },
    pattern: 'snake-case-names',
  },
  global_state: {
    label: 'Relying on global variables',
    category: 'style',
    explain:
      'A function that reads or changes variables outside itself (with `global`) is hard to test and gives different results depending on what ran before. ' +
      'Tests call your function on its own, so outside variables may not be set.',
    fix: 'Pass what the function needs as parameters and `return` what it produces.',
    example: {
      bad: 'total = 0\ndef add(n):\n    global total\n    total += n',
      good: 'def add(total, n):\n    return total + n',
    },
    pattern: 'function-per-task',
    astFlags: ['global_stmt'],
  },
  bare_except: {
    label: 'Catching every error with bare except',
    category: 'style',
    explain:
      'A bare `except:` catches every error, including typos and bugs in your own code, so problems are hidden instead of fixed. ' +
      'It can also make a program return a "safe" value when the real cause was a mistake.',
    fix: 'Name the error you expect: `except ValueError:` for conversions, `except OSError:` or `except FileNotFoundError:` for files.',
    example: {
      bad: 'try:\n    mark = float(text)\nexcept:\n    mark = 0',
      good: 'try:\n    mark = float(text)\nexcept ValueError:\n    mark = 0',
    },
    pattern: 'specific-except',
    astFlags: ['bare_except'],
  },
  file_not_closed: {
    label: 'Opening a file without with',
    category: 'style',
    explain:
      'A file opened with `open()` should be closed when you are done. ' +
      'With `with open(...) as f:` Python closes it automatically, even if an error happens part way through.',
    fix: 'Use `with open(filename) as f:` and indent the reading code inside it.',
    example: {
      bad: 'f = open(csvfile)\nlines = f.readlines()',
      good: 'with open(csvfile) as f:\n    lines = f.readlines()',
    },
    pattern: 'with-open-strip-split',
    astFlags: ['open_without_with'],
  },
};

export const MISTAKES: Record<MistakeId, MistakeDef> = Object.fromEntries(
  MISTAKE_IDS.map((id) => [id, { id, ...DEFS[id] }]),
) as Record<MistakeId, MistakeDef>;

export interface ErrorExplanation {
  /** Heading, e.g. "KeyError: that key isn't in the dictionary". */
  title: string;
  meaning: Md;
  fix: Md;
  mistakes: MistakeId[];
}

// ---------------------------------------------------------------- matching

/** Broad fallbacks: only returned when nothing more specific matched. */
const CATCH_ALL: ReadonlySet<MistakeId> = new Set<MistakeId>(['syntax_other', 'type_error_other']);

const COMPILED: { id: MistakeId; type: string; re: RegExp | null }[] = MISTAKE_IDS.flatMap((id) =>
  (MISTAKES[id].runtime ?? []).map((m) => ({ id, type: m.type, re: m.message ? new RegExp(m.message) : null })),
);

/**
 * Map a Python error (type + message) to likely mistakes, most specific first.
 * Order: ids matched by a message regex, then ids matched by exception type alone (catalogue order within each group).
 * The broad fallbacks (syntax_other, type_error_other) are returned only when nothing else matched.
 * Works with both `str(exc)` messages and messages that include Python's "Did you mean" suggestion.
 */
export function matchError(err: { type: string; message: string }): MistakeId[] {
  return matchTiers(err).map(([id]) => id);
}

/** Matching ids with their tier: 0 message regex, 1 type only, 2 broad fallback. Same order as matchError. */
function matchTiers(err: { type: string; message: string }): [MistakeId, number][] {
  const message = typeof err.message === 'string' ? err.message : '';
  const best = new Map<MistakeId, number>();
  for (const m of COMPILED) {
    if (m.type !== err.type) continue;
    if (m.re && !m.re.test(message)) continue;
    const tier = CATCH_ALL.has(m.id) ? 2 : m.re ? 0 : 1;
    const prev = best.get(m.id);
    if (prev === undefined || tier < prev) best.set(m.id, tier);
  }
  const entries = [...best.entries()];
  const specific = entries.filter(([, tier]) => tier < 2).sort((a, b) => a[1] - b[1]);
  return specific.length > 0 ? specific : entries;
}

// ---------------------------------------------------------------- explanations

type Match = RegExpExecArray;
interface Explainer {
  types: readonly string[];
  re?: RegExp;
  title: string | ((m: Match | null) => string);
  meaning: Md | ((m: Match | null, message: string) => Md);
  fix: Md | ((m: Match | null) => Md);
}

/** Make text from an error message safe inside `inline code`. */
function code(s: string | undefined): string {
  return '`' + (s ?? '').replace(/`/g, "'").slice(0, 80) + '`';
}

/** "an `int`", "a `str`". */
function aType(t: string | undefined): string {
  return (/^[aeiou]/i.test(t ?? '') ? 'an ' : 'a ') + code(t);
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function plural(n: string | undefined, word: string): string {
  return `${n ?? 'some'} ${word}${n === '1' ? '' : 's'}`;
}

const TYPE_ERROR = ['TypeError'] as const;
const LIST_METHOD_RE = new RegExp(String.raw`'(str|tuple)' object has no attribute '(${LIST_METHODS})'`);

/** Message-level explanations, checked in order; the first match wins. */
const EXPLAINERS: Explainer[] = [
  // ----- syntax
  {
    types: ['SyntaxError'], re: /expected ':'/,
    title: 'a colon is missing',
    meaning: 'Lines that start a block (`if`, `elif`, `else`, `for`, `while`, `def`, `try`, `except`, `with`) must end with a colon `:`.',
    fix: 'Add `:` at the end of that line. If the line says `else if`, write `elif` instead.',
  },
  {
    types: ['SyntaxError'], re: /Maybe you meant '=='/,
    title: '= used where == was meant',
    meaning: 'A single `=` stores a value in a variable. To check whether two values are equal, for example in an `if` or `while` condition, Python needs `==`.',
    fix: 'Change `=` to `==` in the condition, for example `if x == 5:`.',
  },
  {
    types: ['SyntaxError'], re: /'([([{])' was never closed/,
    title: 'a bracket was never closed',
    meaning: (m) => `An opening ${code(m?.[1])} has no matching closing bracket. Python reports the line where the bracket opens; the missing bracket is usually at the end of that statement.`,
    fix: 'Count the opening and closing brackets in that statement and add the missing one.',
  },
  {
    types: ['SyntaxError'], re: /unterminated (triple-quoted )?(f-)?string literal/,
    title: 'a string is missing its closing quote',
    meaning: (m) =>
      m?.[1]
        ? 'A triple-quoted string (often a docstring) was opened with three quotes but never closed, so Python read the rest of the file as text.'
        : 'A string was started with a quote but not closed on the same line, so Python read the rest of the line as text.',
    fix: (m) =>
      m?.[1]
        ? 'Add the closing three quotes at the end of the docstring.'
        : 'Add the matching closing quote. Use the same kind of quote at both ends: `"Perth"` or `\'Perth\'`.',
  },
  {
    types: ['SyntaxError'], re: /closing parenthesis '(.)' does not match opening parenthesis '(.)'/,
    title: "brackets don't match",
    meaning: (m) => `A bracket opened with ${code(m?.[2])} is closed with ${code(m?.[1])}. Each kind of bracket must close with its own partner: \`()\`, \`[]\`, \`{}\`.`,
    fix: 'Change the closing bracket so it matches the opening one, or add the bracket that is missing in between.',
  },
  {
    types: ['SyntaxError'], re: /unmatched '(.)'/,
    title: 'an extra closing bracket',
    meaning: (m) => `There is a closing ${code(m?.[1])} with no opening bracket before it.`,
    fix: 'Remove the extra bracket, or add the opening bracket that should come before it.',
  },
  {
    types: ['SyntaxError'], re: /f-string: expecting '\}'/,
    title: 'an f-string is missing a }',
    meaning: 'Inside an f-string, every `{` that starts a value needs a matching `}`, as in `f"Total: {total}"`.',
    fix: 'Add the missing `}` after the value.',
  },
  {
    types: ['SyntaxError'], re: /Missing parentheses in call to 'print'/,
    title: 'print needs brackets',
    meaning: 'In Python 3, `print` is a function, so what you print goes inside brackets. `print "hi"` is old Python 2 style.',
    fix: 'Write `print("hi")`.',
  },
  {
    types: ['SyntaxError'], re: /Perhaps you forgot a comma/,
    title: 'a comma may be missing',
    meaning: 'Two values are next to each other with nothing between them, for example `[1, 2 3]` or `print("Total" total)`.',
    fix: 'Add a comma between the values.',
  },
  {
    types: ['SyntaxError'], re: /'(return|yield)' outside function/,
    title: 'return outside a function',
    meaning: '`return` can only be used inside a `def`. This line is not indented inside a function.',
    fix: 'Indent the line so it is inside the function, or use `print` if you are writing a plain script.',
  },
  {
    types: ['SyntaxError'], re: /'(break|continue)' (not properly in|outside) loop/,
    title: 'break or continue outside a loop',
    meaning: (m) => `${code(m?.[1])} only works inside a \`for\` or \`while\` loop, and this line is not indented inside one.`,
    fix: 'Indent the line inside the loop, or use `return` if you want to leave a function.',
  },
  {
    types: ['SyntaxError'], re: /invalid character '(.)' \(U\+([0-9A-F]+)\)/,
    title: "a character Python can't read",
    meaning: (m) => `The code contains ${code(m?.[1])}, which is not valid Python. Curly quotes and long dashes often appear when code is copied from a document or slides.`,
    fix: 'Retype the character using plain quotes `"` or `\'` and a normal minus sign `-`.',
  },
  {
    types: ['SyntaxError'], re: /invalid decimal literal/,
    title: "a name can't start with a digit",
    meaning: 'A number is directly followed by letters, as in `2nd_place` or `3x`. Names cannot start with a digit, and multiplication always needs `*`.',
    fix: 'Rename the variable (`second_place`) or add the operator (`3 * x`).',
  },
  {
    types: ['SyntaxError'], re: /expected 'except' or 'finally' block/,
    title: 'try without except',
    meaning: 'A `try:` block must be followed by an `except` (or `finally`) block at the same indentation.',
    fix: 'Add `except ValueError:` (or the error you expect) straight after the `try` block, lined up with `try`.',
  },
  {
    types: ['SyntaxError'], re: /'elif' block follows an 'else' block/,
    title: 'elif after else',
    meaning: '`else` must be the last branch of an `if` chain. An `elif` after it can never run.',
    fix: 'Move the `elif` above the `else`.',
  },
  {
    types: ['IndentationError'], re: /expected an indented block after (.+?) on line (\d+)/,
    title: 'the block is empty',
    meaning: (m) => `The ${m?.[1] ?? 'statement'} on line ${m?.[2] ?? '?'} ends with a colon, so the next line must be indented to go inside it.`,
    fix: 'Indent the lines that belong inside the block by 4 spaces. If the block should do nothing yet, write `pass`.',
  },
  {
    types: ['IndentationError'], re: /unexpected indent/,
    title: "a line is indented when it shouldn't be",
    meaning: 'This line is indented further than the line before it, but the line before does not start a block (it does not end with `:`).',
    fix: 'Remove the extra spaces so the line lines up with the lines around it.',
  },
  {
    types: ['IndentationError'], re: /unindent does not match any outer indentation level/,
    title: "a line doesn't line up",
    meaning: 'This line is indented by an amount that does not match any block above it, for example 2 spaces when the blocks use 0 and 4.',
    fix: 'Line it up exactly with the block it belongs to. Use 4 spaces per level.',
  },
  {
    types: ['TabError'],
    title: 'tabs and spaces are mixed',
    meaning: 'Some lines in this block are indented with tabs and others with spaces. They can look the same but Python counts them differently.',
    fix: 'Re-indent the block using spaces only (4 per level).',
  },
  {
    types: ['SyntaxWarning'], re: /"is( not)?" with '?(\w+)'? literal/,
    title: 'is used to compare values',
    meaning: '`is` checks whether two things are the same object, not whether they are equal, so it can give `False` even when the values match.',
    fix: 'Use `==` (or `!=`) to compare numbers and strings. Keep `is` for `None`.',
  },
  {
    types: ['SyntaxWarning'], re: /object is not callable; perhaps you missed a comma/,
    title: 'a value is followed by brackets',
    meaning: 'A value such as a number is written directly before brackets, like `2(x + 1)`. Python reads that as calling `2` like a function.',
    fix: 'Write the multiplication sign: `2 * (x + 1)`, or add the missing comma in a list.',
  },

  // ----- names and scope
  {
    types: ['NameError'], re: /name '(\w+)' is not defined(?:\. Did you mean: '(\w+)'\?)?/,
    title: (m) => (m?.[1] ? `Python doesn't know the name '${m[1]}'` : "Python doesn't know that name"),
    meaning: (m) =>
      `There is no variable or function called ${code(m?.[1])} at this point. ` +
      'The name may be misspelt (capital letters matter), used before it is given a value, or only created inside a function.' +
      (m?.[2] ? ` Python suggests ${code(m[2])}, but check it is the name you meant.` : ''),
    fix:
      '- Check the spelling against the line where the name is created.\n' +
      '- If it is a total or count, give it a starting value before the loop.\n' +
      '- If it was created inside a function, `return` it and store the result.',
  },
  {
    types: ['UnboundLocalError'], re: /cannot access local variable '(\w+)'/,
    title: 'a variable is used before it has a value',
    meaning: (m) =>
      `Inside this function ${code(m?.[1])} is assigned somewhere (for example with \`+=\`), so Python treats it as a local variable. ` +
      'It is read before this function has given it a first value.',
    fix: (m) =>
      `- If it is a running total or count, set it at the start of the function, before the loop: \`${m?.[1] ?? 'total'} = 0\`.\n` +
      '- If you meant a variable from outside the function, pass it in as a parameter and return the new value.',
  },

  // ----- TypeError: None values
  {
    types: TYPE_ERROR, re: /can only concatenate str \(not "NoneType"\) to str/,
    title: 'joining text to None',
    meaning: 'One side of `+` is `None`. A function that prints its answer instead of returning it gives back `None`.',
    fix: 'Make the function `return` its result instead of printing it.',
  },
  {
    types: TYPE_ERROR,
    re: /(unsupported operand type\(s\) for .+: .*'NoneType'|not supported between instances of .*'NoneType'|NoneType doesn't define __round__|NoneType\.__format__|not 'NoneType')/,
    title: 'a value is None',
    meaning:
      'One of the values here is `None`, which usually means a function did not return anything: it printed its answer, or one path through it has no `return`. ' +
      '`None` cannot be used in maths, comparisons or rounding.',
    fix: 'Make the function `return` its result instead of printing it, and check that every branch (including base cases) reaches a `return`.',
  },
  {
    types: [...TYPE_ERROR, 'AttributeError'],
    re: /('NoneType' object is not (subscriptable|iterable)|object of type 'NoneType' has no len|'NoneType' object (does not|doesn't) support item|argument of type 'NoneType'|'NoneType' object has no attribute)/,
    title: 'the variable holds None, not a list',
    meaning:
      'List methods like `sort()`, `append()` and `reverse()` change the list in place and return `None`, so `x = nums.sort()` stores `None`. ' +
      'A function with no `return` also gives `None`.',
    fix: 'Call the method on its own line (`nums.sort()`) and keep using `nums`, or use `sorted(nums)` for a new list. If the value came from your own function, make it `return` the list.',
  },

  // ----- TypeError: text and numbers
  {
    types: TYPE_ERROR, re: /can only concatenate str \(not "(\w+)"\) to str/,
    title: "can't join text and a number with +",
    meaning: (m) => `\`+\` can join two strings or add two numbers, but here it was given a string and ${aType(m?.[1])}.`,
    fix: 'Use an f-string, for example `f"Total: {total}"`, or convert with `str(total)`. If the text holds a number you want to calculate with, convert it with `int()` or `float()` instead.',
  },
  {
    types: TYPE_ERROR, re: new RegExp(R_STR_NUM_COMPARE),
    title: 'comparing text with a number',
    meaning: 'A string is being compared with a number. The text probably came from `input()` or a file and was never converted, or a list mixes strings and numbers.',
    fix: 'Convert the text when you read it: `age = int(input("Age: "))` or `mark = float(fields[2])`.',
  },
  {
    types: TYPE_ERROR,
    re: new RegExp(`${R_STR_NUM_OPERAND}|type str doesn't define __round__|bad operand type for .+: 'str'|'str' object cannot be interpreted as an integer`),
    title: 'doing maths on text',
    meaning: 'A string is being used where a number is needed. Values from `input()` and from splitting file lines are always strings, even when they look like numbers.',
    fix: 'Convert with `int()` or `float()` before calculating, for example `total += float(fields[1])`.',
  },
  {
    types: TYPE_ERROR, re: /can't multiply sequence by non-int of type '(float|str)'/,
    title: 'repeating text by a value that is not a whole number',
    meaning: (m) =>
      `\`"ab" * 3\` repeats text, and that number must be an \`int\`. Here it is ${aType(m?.[1])}. ` +
      'Either the text should have been converted to a number first, or the count came from `/`, which always gives a float.',
    fix: 'Convert the text first (`float(hours) * 1.5`), or use `//` to get a whole-number count.',
  },
  {
    types: TYPE_ERROR, re: /(indices must be integers.*not '?float'?|'float' object cannot be interpreted as an integer|slice indices must be integers)/,
    title: 'a whole number is needed, got a float',
    meaning: 'Indexes, slices and `range()` need whole numbers (`int`). `/` always gives a float, so even `len(nums) / 2` is a float like `2.0`.',
    fix: 'Use `//` for whole-number division (`len(nums) // 2`), or convert with `int()`.',
  },
  {
    types: TYPE_ERROR, re: /indices must be integers.*not '?str'?/,
    title: 'using text as a position',
    meaning: 'A string was used as an index. In `for name in names:` the variable `name` is already the item, not its position, so `names[name]` fails. It also happens when a position read from input was never converted.',
    fix: 'Use the item directly (`print(name)`), use `for i in range(len(names)):` when you need positions, or convert the index with `int()`.',
  },
  {
    types: TYPE_ERROR, re: /'str' object (does not|doesn't) support item/,
    title: "strings can't be changed",
    meaning: 'A string cannot be changed after it is made, so `word[0] = "B"` is not allowed.',
    fix: 'Build a new string and store it: `word = "B" + word[1:]`, or `word = word.replace("a", "b")`.',
  },
  {
    types: TYPE_ERROR, re: /'tuple' object (does not|doesn't) support item/,
    title: "tuples can't be changed",
    meaning: 'A tuple cannot be changed after it is made, so item assignment is not allowed.',
    fix: 'Build a new tuple (`point = (5, point[1])`), or use a list if the values need to change.',
  },
  {
    types: TYPE_ERROR, re: /'(int|float|str|list|dict|tuple|set|bool)' object is not callable/,
    title: 'a value is being called like a function',
    meaning: (m) =>
      `The value before the brackets is ${aType(m?.[1])}, not a function. ` +
      'This usually happens when a variable is named after a built-in function: `sum = 0` hides `sum()`, `list = [...]` hides `list()`. It also happens with maths written without `*`, like `2(x + 1)`.',
    fix: 'Rename the variable (`total` instead of `sum`, `names` instead of `list`) and run again. Write multiplication with `*`.',
  },
  {
    types: [...TYPE_ERROR, 'AttributeError'], re: /'(function|builtin_function_or_method|method)'/,
    title: 'a function is used without calling it',
    meaning: 'A function name without brackets, like `get_score` or `line.split`, is the function itself. Here it is being compared, added, measured or indexed, but it was never run.',
    fix: 'Add brackets to call it: `get_score()`, `line.split(",")[0]`, `name.upper()`.',
  },
  {
    types: TYPE_ERROR, re: /(\w+)\(\) missing (\d+) required positional arguments?: (.+)/,
    title: 'a function was called with too few values',
    meaning: (m) => `\`${m?.[1] ?? 'The function'}()\` needs more arguments than it was given. Missing: ${m?.[3] ?? 'some arguments'}.`,
    fix: 'Pass one value for each parameter in the `def` line, in the same order.',
  },
  {
    types: TYPE_ERROR, re: /(\w+)\(\) takes (\d+) positional arguments? but (\d+) (?:was|were) given/,
    title: 'a function was called with too many values',
    meaning: (m) => `\`${m?.[1] ?? 'The function'}()\` accepts ${plural(m?.[2], 'argument')} but was given ${m?.[3] ?? 'more'}.`,
    fix: 'Match the call to the `def` line, or add the missing parameter to the `def` line if the function really needs it.',
  },
  {
    types: TYPE_ERROR, re: /('(int|float)' object is not iterable|argument of type '(int|float)' is not)/,
    title: 'looping over a number',
    meaning: '`for` and `in` need a collection such as a list, string or `range()`. A single number such as `len(nums)` cannot be looped over.',
    fix: 'Use `for i in range(len(nums)):`, or loop over the items directly: `for n in nums:`.',
  },
  {
    types: TYPE_ERROR, re: /object of type '(int|float)' has no len\(\)/,
    title: "a number doesn't have a length",
    meaning: '`len()` works on strings, lists, tuples and dictionaries, not on numbers.',
    fix: 'To count the digits, convert first: `len(str(n))`.',
  },
  {
    types: TYPE_ERROR, re: /'(int|float|bool)' object is not subscriptable/,
    title: "a number can't be indexed",
    meaning: 'Square brackets were used on a number, as if it were a list or string.',
    fix: 'Check the variable holds the list you expect. To get digits, use `str(n)[0]`, or `n % 10` and `n // 10`.',
  },
  {
    types: TYPE_ERROR, re: /unhashable type/,
    title: "a list can't be a dictionary key",
    meaning: 'Dictionary keys (and set items) must be values that cannot change, such as strings, numbers or tuples. A list is not allowed.',
    fix: 'Use a tuple as the key instead: `d[(row, col)] = value`.',
  },
  {
    types: TYPE_ERROR, re: /sequence item (\d+): expected str instance, (\w+) found/,
    title: 'join() needs strings',
    meaning: (m) => `\`join()\` can only join strings, but item ${m?.[1] ?? ''} is ${aType(m?.[2])}.`,
    fix: 'Convert each item with `str()` first, for example by building a list of strings in a loop, then join that list.',
  },
  {
    types: TYPE_ERROR, re: /'in <string>' requires string as left operand, not (\w+)/,
    title: 'looking for a number inside text',
    meaning: (m) => `\`x in text\` needs \`x\` to be a string too, but it is ${aType(m?.[1])}.`,
    fix: 'Convert it first: `str(3) in digits`.',
  },
  {
    types: TYPE_ERROR, re: /cannot unpack non-iterable (\w+) object/,
    title: 'unpacking a single value',
    meaning: (m) => `\`a, b = ...\` needs a group of values, but it got a single ${code(m?.[1])}. A function that should return two values may be returning one value or \`None\`.`,
    fix: 'Return a tuple from the function (`return low, high`), or assign to a single variable.',
  },
  {
    types: TYPE_ERROR, re: /can only concatenate list \(not "(\w+)"\) to list/,
    title: 'adding a single value to a list with +',
    meaning: '`+` joins two lists. It cannot add a single value to a list.',
    fix: 'Use `nums.append(value)`, or join lists: `nums + [value]`.',
  },

  // ----- ValueError
  {
    types: ['ValueError'], re: /invalid literal for int\(\) with base 10: (.*)/,
    title: "this text isn't a whole number",
    meaning: (m) =>
      `\`int()\` can only convert text that is a whole number, like \`"42"\`. It was given ${code(m?.[1])}.` +
      (m?.[1] === "''" ? ' Empty text often comes from a blank line or a missing value in a file.' : ''),
    fix:
      '- For decimal text use `float()`, or `int(float(text))` for a whole number.\n' +
      '- For values that may be missing or words like `N/A`, check first or use `try` / `except ValueError` and skip them.',
  },
  {
    types: ['ValueError'], re: /could not convert string to float: (.*)/,
    title: "this text isn't a number",
    meaning: (m) =>
      `\`float()\` was given ${code(m?.[1])}, which is not a number.` +
      (m?.[1] === "''" ? ' Empty text often comes from a blank line or a missing value in a file.' : ''),
    fix: 'Check the value before converting, or use `try` / `except ValueError` and skip values that are not numbers.',
  },
  {
    types: ['ValueError'], re: /Unknown format code '(.)' for object of type 'str'/,
    title: 'number formatting used on text',
    meaning: (m) => `The format \`:${m?.[1] ?? 'f'}\` is for numbers, but the value is a string. It probably came from \`input()\` or a file and was not converted.`,
    fix: 'Convert with `float()` or `int()` before formatting.',
  },
  {
    types: ['ValueError'], re: /not enough values to unpack \(expected (\d+), got (\d+)\)/,
    title: 'fewer values than variables',
    meaning: (m) =>
      `The left side has ${plural(m?.[1], 'name')} but only ${plural(m?.[2], 'value')} arrived. ` +
      'With files this is usually a blank line or a row with missing fields. With dictionaries it can be `for k, v in d:` instead of `d.items()`.',
    fix: 'Skip rows that do not have enough fields (`if len(fields) != 2: continue`), or loop with `for k, v in d.items():`.',
  },
  {
    types: ['ValueError'], re: /too many values to unpack \(expected (\d+)/,
    title: 'more values than variables',
    meaning: (m) =>
      `The left side has ${plural(m?.[1], 'name')} but more values arrived. ` +
      'With files this is often a row with extra fields; with dictionaries it can be `for k, v in d:` instead of `d.items()`.',
    fix: 'Split into a list first and pick the fields you need (`fields = line.split(",")`), or loop with `for k, v in d.items():`.',
  },
  {
    types: ['ValueError'], re: /list\.(index|remove)\(x\): x not in list/,
    title: "that item isn't in the list",
    meaning: (m) => `\`${m?.[1] ?? 'index'}()\` was asked for a value that is not in the list.`,
    fix: 'Check first with `if value in items:`.',
  },
  {
    types: ['ValueError'], re: /(expected a (nonnegative|positive) input|math domain error)/,
    title: "a maths function got a value it can't handle",
    meaning: 'A maths function was given a value outside the range it accepts, for example the square root of a negative number or the log of zero.',
    fix: 'Check the value before calling the function. For a square root without imports use `x ** 0.5` after checking `x >= 0`.',
  },
  {
    types: ['ValueError'], re: /(max|min)\(\) (iterable argument|arg) is empty/,
    title: 'max() or min() of an empty list',
    meaning: 'There is no largest or smallest value in an empty list.',
    fix: 'Check that the list is not empty first, and return what the task says for empty input.',
  },

  // ----- IndexError, KeyError, AttributeError, RuntimeError
  {
    types: ['IndexError'], re: /pop from empty list/,
    title: 'pop() from an empty list',
    meaning: 'There is nothing left in the list to remove.',
    fix: 'Check `if items:` before calling `pop()`.',
  },
  {
    types: ['IndexError'], re: /assignment index out of range/,
    title: "that position doesn't exist yet",
    meaning: 'Assigning to `nums[i]` only works for positions that already exist. It cannot add a new item to the end.',
    fix: 'Use `nums.append(value)` to add items.',
  },
  {
    types: ['IndexError'], re: /(list|string|tuple) index out of range/,
    title: "that position doesn't exist",
    meaning: (m) =>
      `The ${m?.[1] ?? 'list'} has nothing at that index. A ${m?.[1] ?? 'list'} with 3 ${m?.[1] === 'string' ? 'characters' : 'items'} has positions 0, 1 and 2, so index 3 is past the end. ` +
      'This often comes from `range(len(x) + 1)`, `x[i + 1]` on the last pass, or an empty list.',
    fix: 'Check the largest index your code uses, handle empty input first, or loop over the items directly.',
  },
  {
    types: ['KeyError'],
    title: "that key isn't in the dictionary",
    meaning: (_m, message) =>
      (message ? `The dictionary has no key ${code(message)}. ` : 'The dictionary does not have that key. ') +
      'Keys must match exactly, including capital letters and spaces. Counting with `d[k] += 1` fails the first time a key is seen.',
    fix:
      '- Check first: `if key in d:`\n' +
      '- Or read with a default: `d.get(key, 0)`\n' +
      '- When counting: `counts[w] = counts.get(w, 0) + 1`',
  },
  {
    types: ['AttributeError'], re: /'(\w+)' object has no attribute '(\w+)'\. Did you mean: '(\w+)'\?/,
    title: 'a misspelt method name',
    meaning: (m) => `${cap(aType(m?.[1]))} has no method called ${code(m?.[2])}. Python suggests ${code(m?.[3])}.`,
    fix: 'Fix the spelling of the method name.',
  },
  {
    types: ['AttributeError'], re: LIST_METHOD_RE,
    title: "that method doesn't exist here",
    meaning: (m) =>
      m?.[1] === 'str'
        ? `Strings cannot be changed in place, so they have no ${code(m?.[2])} method.`
        : `Tuples cannot be changed after they are made, so they have no ${code(m?.[2])} method.`,
    fix: (m) =>
      m?.[1] === 'str'
        ? 'Build a new string with `+` and store it (`word = word + "s"`), or use a list if you need to add items.'
        : 'Build a new tuple, or use a list if the values need to change.',
  },
  {
    types: ['AttributeError'], re: /'(\w+)' object has no attribute '(\w+)'/,
    title: "that type doesn't have this method",
    meaning: (m) => `${cap(aType(m?.[1]))} has no method or attribute called ${code(m?.[2])}.`,
    fix: (m) =>
      m?.[1] === 'list' && m?.[2] === 'add' ? 'Lists use `append()` to add an item.'
        : m?.[1] === 'dict' && m?.[2] === 'append' ? 'Dictionaries add items by key: `d[key] = value`.'
          : m?.[1] === 'int' || m?.[1] === 'float' ? 'The variable holds a number here. Check whether it was reassigned, or whether you meant a different variable.'
            : 'Check the spelling of the method name, and check the variable holds the type you expect.',
  },
  {
    types: ['RuntimeError'], re: /changed size during iteration/,
    title: 'a collection changed while looping over it',
    meaning: 'Items were added to or removed from a dictionary or set while a `for` loop was going through it.',
    fix: 'Loop over a copy (`for k in list(d):`) or collect the changes in a new dictionary and apply them after the loop.',
  },
  {
    types: ['AssertionError'],
    title: 'an assert check failed',
    meaning: (_m, message) =>
      'An `assert` line checks that something is true, and it was false.' + (message.trim() ? ` Its message was ${code(message.trim())}.` : ''),
    fix: 'Print the values in the `assert` line to see which one is different from what you expected.',
  },
  {
    types: ['FileNotFoundError'], re: /\.csv\.csv'/,
    title: '.csv was added twice',
    meaning: 'The file name already ends in `.csv`, and the code added another `.csv`.',
    fix: 'Open the file name exactly as it was given: `open(csvfile)`.',
  },
  {
    types: ['FileNotFoundError'], re: /No such file or directory: (.*)/,
    title: "that file doesn't exist here",
    meaning: (m) => `Python could not find a file named ${code(m?.[1])}.`,
    fix: 'Check the spelling, and open the file name passed to your function rather than a fixed name. In projects, catch the error (`except OSError:`) and return what the task says.',
  },
  {
    types: ['ZeroDivisionError'], re: /zero to a negative power/,
    title: 'zero to a negative power',
    meaning: '`0 ** -1` means `1 / 0`, which is a division by zero.',
    fix: 'Check that the base is not zero before using a negative power.',
  },
];

/** Generic explanation per exception type, used when no message-level explainer matches. */
const GENERIC: Record<string, { title: string; meaning: Md; fix: Md }> = {
  SyntaxError: {
    title: "Python couldn't read the code",
    meaning: 'Something on this line does not follow the rules for writing Python. Common causes are a missing operator or comma, a keyword such as `class` or `in` used as a variable name, or `=` inside a condition where `==` was meant.',
    fix: 'Look at the line Python points to and the line before it for a missing bracket, quote, colon or comma.',
  },
  IndentationError: {
    title: 'the indentation is wrong',
    meaning: 'Python uses indentation to decide which lines belong inside an `if`, loop or function.',
    fix: 'Indent lines inside a block by 4 spaces and line up lines in the same block exactly.',
  },
  TabError: {
    title: 'tabs and spaces are mixed',
    meaning: 'The block mixes tabs and spaces for indentation.',
    fix: 'Re-indent using spaces only (4 per level).',
  },
  NameError: {
    title: "Python doesn't know that name",
    meaning: 'A variable or function is used that does not exist at this point. It may be misspelt or not created yet.',
    fix: 'Check the spelling and make sure the name is given a value before this line.',
  },
  UnboundLocalError: {
    title: 'a variable is used before it has a value',
    meaning: 'A variable that is assigned inside this function is read before it gets its first value.',
    fix: 'Give it a starting value at the top of the function, or pass it in as a parameter.',
  },
  TypeError: {
    title: 'a value of the wrong type',
    meaning: 'An operation or function was given a value of a type it cannot work with, or a function was called with the wrong number of arguments.',
    fix: 'Print the values on that line with `print(type(x), x)` to see what they hold, then convert the value or change the call.',
  },
  ValueError: {
    title: 'the right type but an unusable value',
    meaning: 'A function received the right kind of value, but not one it can handle, such as text that is not a number.',
    fix: 'Check the value before using it, or use `try` / `except ValueError` to skip values that are not valid.',
  },
  IndexError: {
    title: "that position doesn't exist",
    meaning: 'An index is past the end of the list, string or tuple. Positions go from 0 to `len(x) - 1`.',
    fix: 'Check the largest index your code uses, and handle empty input first.',
  },
  KeyError: {
    title: "that key isn't in the dictionary",
    meaning: 'The dictionary does not contain that key.',
    fix: 'Check with `if key in d:` first, or use `d.get(key, default)`.',
  },
  AttributeError: {
    title: "that value doesn't have this method",
    meaning: 'A method or attribute was used on a value that does not have it, often because the variable holds a different type than expected.',
    fix: 'Check the spelling of the method and the type of the value.',
  },
  ZeroDivisionError: {
    title: 'dividing by zero',
    meaning: 'The number on the right of `/`, `//` or `%` is 0. This usually means a count or length was 0, for example an empty list.',
    fix: 'Check the divisor before dividing, and return what the task says for empty input.',
  },
  RecursionError: {
    title: 'the function kept calling itself',
    meaning: 'Each call started another call and none of them stopped, so Python gave up. Either there is no base case, or the recursive call does not move towards it (for example `n - 2` skipping past `n == 0`).',
    fix: 'Write the base case first, and make sure every recursive call uses a smaller input that will reach it.',
  },
  FileNotFoundError: {
    title: "that file doesn't exist here",
    meaning: 'Python could not find a file with that name.',
    fix: 'Check the file name, and open the name passed to your function. In projects, catch the error and return what the task says.',
  },
  EOFError: {
    title: 'input() ran out of input',
    meaning: 'The program called `input()` more times than there were lines of input to read.',
    fix: 'Check how many times your program asks for input. In function and project questions the values come in as parameters, so do not call `input()` at all.',
  },
  ImportError: {
    title: "that module isn't available",
    meaning: 'Imports of that module are not available here, and CITS1401 projects do not allow imports.',
    fix: 'Remove the import and write the code with plain Python: loops, lists, dictionaries and `strip()` / `split(",")`. For a square root use `x ** 0.5`.',
  },
  ModuleNotFoundError: {
    title: "that module isn't available",
    meaning: 'Imports of that module are not available here, and CITS1401 projects do not allow imports.',
    fix: 'Remove the import and write the code with plain Python: loops, lists, dictionaries and `strip()` / `split(",")`. For a square root use `x ** 0.5`.',
  },
  TimeoutError: {
    title: 'your code ran too long',
    meaning: 'Your code ran too long, often a while loop whose condition never becomes False.',
    fix: 'Check that something inside the loop changes the variable in the condition (for example `i += 1` or `n = n // 10`), and that a `while True` loop reaches its `break`.',
  },
  OutputLimit: {
    title: 'too much output',
    meaning: 'Your program printed too much output, often an infinite loop with print.',
    fix: 'Check the loop around the `print` stops: the variable in the `while` condition must change each time round.',
  },
  AssertionError: {
    title: 'an assert check failed',
    meaning: 'An `assert` line checks that something is true, and it was false.',
    fix: 'Print the values in the `assert` line to see which one is different from what you expected.',
  },
  RuntimeError: {
    title: 'something went wrong while running',
    meaning: 'Python stopped because of a problem that does not fit a more specific error type.',
    fix: 'Read the message, then check the values used on that line.',
  },
  OverflowError: {
    title: 'the number got too big',
    meaning: 'A calculation produced a float too large to store, often from a series or power that grows without limit.',
    fix: 'Check the loop stops when it should, and that the formula divides where it should.',
  },
  KeyboardInterrupt: {
    title: 'your code was stopped',
    meaning: 'Your code was stopped before it finished, often because a loop never ends.',
    fix: 'Check that every loop moves towards its stop condition, and that a `while True` loop reaches its `break`.',
  },
  MemoryError: {
    title: 'the program used too much memory',
    meaning: 'The program built something too large, often a list or string that keeps growing inside a loop that never ends.',
    fix: 'Check that the loop stops, and that you are not adding to the same list you are looping over.',
  },
  OSError: {
    title: "a file couldn't be opened",
    meaning: 'Python could not open or read the file, for example because the name is wrong or it is a folder.',
    fix: 'Check the file name you pass to `open`. In projects, catch the error (`except OSError:`) and return what the task says.',
  },
  SyntaxWarning: {
    title: 'Python warns about this line',
    meaning: 'The code runs, but Python thinks this line probably does not do what you meant.',
    fix: 'Read the warning and change the line so its meaning is clear.',
  },
};

const HEADINGS: Record<string, string> = {
  TimeoutError: 'Timed out',
  OutputLimit: 'Output limit',
};

function lineSentence(type: string, line: number | undefined): string {
  if (typeof line !== 'number' || !Number.isFinite(line) || line < 1) return '';
  if (type === 'SyntaxError' || type === 'IndentationError' || type === 'TabError') return `Python couldn't read line ${line}, so none of the program ran. `;
  if (type === 'SyntaxWarning') return `Warning on line ${line} (the program still runs). `;
  if (type === 'TimeoutError' || type === 'OutputLimit') return `It was running line ${line} when it was stopped. `;
  return `Python stopped at line ${line}. `;
}

function resolve<T extends string>(v: T | ((m: Match | null, message: string) => T), m: Match | null, message: string): T {
  return typeof v === 'function' ? v(m, message) : v;
}

/** Plain-English explanation for any Python error, with a generic fallback. */
export function explainError(err: { type: string; message: string; line?: number }): ErrorExplanation {
  const type = err.type || 'Error';
  const message = err.message ?? '';
  const tiers = matchTiers({ type, message });
  const mistakes = tiers.map(([id]) => id);
  const heading = HEADINGS[type] ?? type;
  const prefix = lineSentence(type, err.line);

  for (const ex of EXPLAINERS) {
    if (!ex.types.includes(type)) continue;
    let m: Match | null = null;
    if (ex.re) {
      m = ex.re.exec(message);
      if (!m) continue;
    }
    return {
      title: `${heading}: ${resolve(ex.title, m, message)}`,
      meaning: prefix + resolve(ex.meaning, m, message),
      fix: resolve(ex.fix, m, message),
      mistakes,
    };
  }

  const fromMistake = (maxTier: number): ErrorExplanation | undefined => {
    const hit = tiers.find(([id, tier]) => tier <= maxTier && !CATCH_ALL.has(id));
    if (!hit) return undefined;
    const def = MISTAKES[hit[0]];
    return { title: `${heading}: ${def.label}`, meaning: prefix + def.explain, fix: def.fix, mistakes };
  };

  // A mistake matched on its message beats the generic text for the exception type.
  const byMessage = fromMistake(0);
  if (byMessage) return byMessage;

  const generic = Object.hasOwn(GENERIC, type) ? GENERIC[type] : undefined;
  if (generic) return { title: `${heading}: ${generic.title}`, meaning: prefix + generic.meaning, fix: generic.fix, mistakes };

  const byType = fromMistake(1);
  if (byType) return byType;

  return {
    title: `${heading}: Python stopped with an error`,
    meaning: prefix + `Python raised ${code(type)}` + (message ? ` with the message ${code(message)}.` : '.') + ' The message and line number are the best clues.',
    fix: 'Look at the line Python points to and print the values used there to see what they hold just before it runs.',
    mistakes,
  };
}
