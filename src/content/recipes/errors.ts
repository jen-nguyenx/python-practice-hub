// Reference: when it goes wrong.
import type { Recipe } from '../recipeSchema.ts';

const recipes: Recipe[] = [
  {
    id: 'catch-a-specific-exception',
    task: 'Catch a specific exception instead of crashing',
    group: 'errors',
    also: ['try except', 'valueerror', 'zerodivisionerror'],
    topicId: 'exceptions',
    code: "def safe_divide(a, b):\n    try:\n        return a / b\n    except ZeroDivisionError:\n        return None\n\nprint(safe_divide(10, 2))\nprint(safe_divide(10, 0))\n",
    note: 'Naming the exact exception, `ZeroDivisionError` here, means an unrelated bug still crashes loudly instead of being silently swallowed.',
  },
  {
    id: 'catch-two-kinds-of-exception',
    task: 'Catch two different kinds of exception in one try block',
    group: 'errors',
    also: ['multiple except', 'tuple of exceptions'],
    topicId: 'exceptions',
    code: "for text in ['abc', '0']:\n    try:\n        print(10 / int(text))\n    except (ValueError, ZeroDivisionError) as e:\n        print('failed:', type(e).__name__)\n",
    note: 'A tuple of exception types in one `except` catches any of them; separate `except` blocks are only needed when each kind should be handled differently.',
  },
  {
    id: 'try-except-else-finally',
    task: 'Use try, except, else and finally together',
    group: 'errors',
    also: ['else', 'finally', 'cleanup'],
    topicId: 'exceptions',
    code: "try:\n    n = int('42')\nexcept ValueError:\n    print('bad input')\nelse:\n    print('parsed:', n)\nfinally:\n    print('done')\n",
    note: '`else` runs only when the `try` block raised nothing, and `finally` runs no matter what happened, even if an exception was raised and not caught; it is the right place for cleanup like closing a resource.',
  },
  {
    id: 'raise-your-own-error',
    task: 'Raise your own error with a message',
    group: 'errors',
    also: ['raise', 'custom message', 'valueerror'],
    topicId: 'exceptions',
    code: "def set_age(age):\n    if age < 0:\n        raise ValueError(f'age cannot be negative: {age}')\n    return age\n\ntry:\n    set_age(-5)\nexcept ValueError as e:\n    print('rejected:', e)\n",
    note: 'Raising a built-in type like `ValueError` with a clear message is usually enough; a custom exception class is only worth it when callers need to catch your error specifically, separately from other `ValueError`s.',
  },
  {
    id: 'check-is-a-number-before-using-it',
    task: 'Check something is a number before doing arithmetic with it',
    group: 'errors',
    also: ['type check', 'isinstance', 'validate input'],
    topicId: 'exceptions',
    code: "def double(x):\n    if not isinstance(x, (int, float)):\n        raise TypeError(f'expected a number, got {type(x).__name__}')\n    return x * 2\n\ntry:\n    double('5')\nexcept TypeError as e:\n    print(e)\n",
    note: '`isinstance(x, (int, float))` checks against a tuple of types at once; checking `type(x) == int` instead would wrongly reject a `bool`, which counts as an `int` in Python, or a valid `float`.',
  },
  {
    id: 'why-bare-except-is-bad',
    task: 'Understand why a bare except is a bad idea',
    group: 'errors',
    also: ['bare except', 'except:', 'catch everything'],
    topicId: 'exceptions',
    code: "try:\n    result = 10 / 0\nexcept Exception as e:\n    print('caught:', type(e).__name__, e)\n",
    note: 'A bare `except:` catches everything, including typos like a misspelled variable name and even `Ctrl+C`, which hides real bugs instead of surfacing them; naming `Exception`, or better, the specific type, keeps the safety net without the blindfold.',
  },
  {
    id: 'return-empty-result-instead-of-crashing',
    task: 'Return an empty result instead of letting a function crash',
    group: 'errors',
    also: ['graceful failure', 'empty list on error'],
    topicId: 'exceptions',
    code: "def parse_all(values):\n    result = []\n    for v in values:\n        try:\n            result.append(int(v))\n        except ValueError:\n            pass\n    return result\nprint(parse_all(['1', 'x', '3']))\n",
    note: 'Skipping a bad item with `except ValueError: pass` lets the rest of the batch succeed; this only makes sense when losing the odd bad item is acceptable, not when every item matters.',
  },
  {
    id: 'read-a-traceback',
    task: 'Read what a traceback is telling you',
    group: 'errors',
    also: ['traceback', 'stack trace', 'error message'],
    topicId: 'exceptions',
    code: "try:\n    nums = [1, 2, 3]\n    print(nums[5])\nexcept IndexError as e:\n    print('IndexError:', e)\n    print('the last line names the exception type and the reason')\n",
    note: 'A traceback reads bottom to top: the last line names the exception type and the message, and the lines above it show the chain of calls that led there, starting from where the program began.',
  },
];

export default recipes;
