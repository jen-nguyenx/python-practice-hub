// Best-practice pattern cards. Recommended from mistake counts, shown as "already using" from AST idiom flags.
import type { AstFlag, MistakeId, PatternId, TopicId } from './ids.ts';
import { PATTERN_IDS } from './ids.ts';
import type { Md } from './schema.ts';

export interface PatternCard {
  id: PatternId;
  title: string;
  why: Md;
  bad: string;
  good: string;
  /** e.g. "PEP 8: Naming Conventions" or "CITS1401 project rules". */
  reference: string;
  /** Mistakes that make this card recommended. */
  triggers: MistakeId[];
  /** AST flags in passing code that show the student already uses this idiom. */
  idiomFlags: AstFlag[];
  /** The card is shown as "Later" until this topic is unlocked. */
  topicId: TopicId;
}

type Card = Omit<PatternCard, 'id'>;

const CARDS: Record<PatternId, Card> = {
  'snake-case-names': {
    title: 'Name things in snake_case',
    why:
      'Python style (PEP 8) writes variable and function names in lowercase words joined by underscores, like `total_marks`. ' +
      'A name that says what the value holds makes code easier to read and debug, and CITS1401 projects give marks for style.',
    bad: 'def CalcAvg(L):\n    t = 0\n    for x in L:\n        t += x\n    return t / len(L)',
    good: 'def average_mark(marks):\n    total = 0\n    for mark in marks:\n        total += mark\n    return total / len(marks)',
    reference: 'PEP 8: Naming Conventions',
    triggers: ['style_naming'],
    idiomFlags: [],
    topicId: 'variables-expressions',
  },
  'no-shadow-builtins': {
    title: "Don't reuse built-in names",
    why:
      '`list`, `sum`, `max`, `min`, `str`, `len` and `input` are functions Python already gives you. ' +
      'Using one as a variable name hides that function for the rest of the program, which leads to confusing "object is not callable" errors.',
    bad: 'list = [3, 9, 4]\nmax = 0\nfor n in list:\n    if n > max:\n        max = n',
    good: 'nums = [3, 9, 4]\nlargest = nums[0]\nfor n in nums:\n    if n > largest:\n        largest = n',
    reference: 'Python docs: Built-in Functions',
    triggers: ['shadow_builtin'],
    idiomFlags: [],
    topicId: 'variables-expressions',
  },
  'for-each-loop': {
    title: 'Loop over items, not positions',
    why:
      '`for mark in marks:` hands you each item directly, so there is no index to get wrong. ' +
      'Use `range(len(...))` only when you really need the position, for example to compare an item with the next one.',
    bad: 'total = 0\nfor i in range(len(marks)):\n    total += marks[i]',
    good: 'total = 0\nfor mark in marks:\n    total += mark',
    reference: 'Python tutorial: for Statements',
    triggers: ['off_by_one_range', 'index_out_of_range', 'modify_loop_var'],
    idiomFlags: ['for_each'],
    topicId: 'for-loops-range',
  },
  'enumerate-index': {
    title: 'Use enumerate when you need the position too',
    why:
      '`enumerate(items)` gives you the position and the item together, so you do not have to index back into the list. ' +
      'It reads clearly and avoids off-by-one mistakes with `range(len(...))`.',
    bad: 'for i in range(len(names)):\n    print(i + 1, names[i])',
    good: 'for i, name in enumerate(names):\n    print(i + 1, name)',
    reference: 'Python docs: Built-in Functions (enumerate)',
    triggers: ['off_by_one_range', 'index_out_of_range'],
    idiomFlags: ['enumerate_used'],
    topicId: 'lists-tuples',
  },
  'in-membership': {
    title: 'Use in to check against several values',
    why:
      '`day in ("Sat", "Sun")` checks a value against a group in one step and avoids the `day == "Sat" or "Sun"` trap, which is always true. ' +
      '`in` also works for a character in a string and a key in a dictionary.',
    bad: 'if day == "Sat" or "Sun":\n    print("Weekend")',
    good: 'if day in ("Sat", "Sun"):\n    print("Weekend")',
    reference: 'Python docs: Membership test operations',
    triggers: ['or_with_literal'],
    idiomFlags: [],
    topicId: 'if-elif-else',
  },
  'dict-get-default': {
    title: 'Use get() with a default when counting',
    why:
      '`counts.get(word, 0)` gives 0 when the key is not there yet instead of raising KeyError. ' +
      'It turns "check if the key exists, then add" into one clear line.',
    bad: 'counts = {}\nfor word in words:\n    counts[word] += 1',
    good: 'counts = {}\nfor word in words:\n    counts[word] = counts.get(word, 0) + 1',
    reference: 'Python docs: Mapping Types (dict.get)',
    triggers: ['dict_keyerror'],
    idiomFlags: ['dict_get_used'],
    topicId: 'dictionaries',
  },
  'sort-key-tiebreak': {
    title: 'Break ties inside the sort key',
    why:
      'When two items have the same value, the task usually says how to order them, and hidden tests check it. ' +
      'A key that returns a tuple sorts by the first part, then the second; making a number negative sorts it high to low while names stay A to Z.',
    bad: 'def by_score(pair):\n    return pair[1]\n\nranking = sorted(scores.items(), key=by_score, reverse=True)',
    good: 'def by_score_then_name(pair):\n    return (-pair[1], pair[0])\n\nranking = sorted(scores.items(), key=by_score_then_name)',
    reference: 'Python docs: Sorting Techniques',
    triggers: ['sort_tiebreak'],
    idiomFlags: [],
    topicId: 'lists-tuples',
  },
  'with-open-strip-split': {
    title: 'Read files with with, strip() and split()',
    why:
      '`with open(...) as f:` closes the file for you, even if an error happens part way through. ' +
      'Every line ends with a newline, so `strip()` before `split(",")` keeps the last field clean.',
    bad: 'f = open(filename)\nfor line in f:\n    fields = line.split(",")',
    good: 'with open(filename) as f:\n    for line in f:\n        fields = line.strip().split(",")',
    reference: 'Python tutorial: Reading and Writing Files',
    triggers: ['file_not_closed', 'file_newline'],
    idiomFlags: ['with_open'],
    topicId: 'files-csv',
  },
  'header-lookup': {
    title: 'Find columns by their header name',
    why:
      'Project files can list their columns in any order and include extra ones. ' +
      'Looking up each column position in the header once keeps your code correct whatever order the hidden test file uses.',
    bad: 'for line in lines[1:]:\n    fields = line.strip().split(",")\n    age = int(fields[2])',
    good: 'header = lines[0].strip().lower().split(",")\nage_col = header.index("age")\nfor line in lines[1:]:\n    fields = line.strip().split(",")\n    age = int(fields[age_col])',
    reference: 'CITS1401 project rules',
    triggers: ['header_order_assumed'],
    idiomFlags: ['header_index_lookup'],
    topicId: 'files-csv',
  },
  'guard-clause': {
    title: 'Handle the bad cases first and return early',
    why:
      'Checking for empty input, a zero count or invalid arguments at the top of a function, and returning straight away, stops crashes such as dividing by zero. ' +
      'The main calculation then sits below without extra nesting.',
    bad: 'def mean(nums):\n    return sum(nums) / len(nums)',
    good: 'def mean(nums):\n    if len(nums) == 0:\n        return 0\n    return sum(nums) / len(nums)',
    reference: 'CITS1401 project rules',
    triggers: ['no_graceful_exit', 'zero_division'],
    idiomFlags: ['early_return'],
    topicId: 'functions-basics',
  },
  'if-flag-directly': {
    title: 'Test a True/False value directly',
    why:
      'A boolean is already `True` or `False`, so `if is_member:` says the same as `if is_member == True:` with less to read. ' +
      'PEP 8 recommends not comparing booleans to `True` or `False` with `==`.',
    bad: 'if is_member == True:\n    price = price * 0.9',
    good: 'if is_member:\n    price = price * 0.9',
    reference: 'PEP 8: Programming Recommendations',
    triggers: ['compare_to_true'],
    idiomFlags: [],
    topicId: 'if-elif-else',
  },
  'return-boolean-directly': {
    title: 'Return the condition itself',
    why:
      'A comparison such as `mark >= 50` already gives `True` or `False`. ' +
      'An `if` that returns `True` in one branch and `False` in the other can be a single `return`, with no branch to get backwards.',
    bad: 'def is_pass(mark):\n    if mark >= 50:\n        return True\n    else:\n        return False',
    good: 'def is_pass(mark):\n    return mark >= 50',
    reference: 'Python tutorial: More on Conditions',
    triggers: ['compare_to_true'],
    idiomFlags: [],
    topicId: 'if-elif-else',
  },
  'is-for-none-only': {
    title: 'Use is only for None',
    why:
      '`is` asks whether two names refer to the very same object, which is only the right question for `None`. ' +
      'Compare numbers and strings with `==`, and write `if result is None:` for None, as PEP 8 recommends.',
    bad: 'if count is 0:\n    print("empty")\nif result == None:\n    print("no result")',
    good: 'if count == 0:\n    print("empty")\nif result is None:\n    print("no result")',
    reference: 'PEP 8: Programming Recommendations',
    triggers: ['is_vs_equals'],
    idiomFlags: [],
    topicId: 'if-elif-else',
  },
  'none-default-arg': {
    title: 'Use None as the default for a list parameter',
    why:
      'A default list is created once and shared by every call, so items from one call are still there in the next. ' +
      'Defaulting to `None` and creating the list inside the function gives each call a fresh list.',
    bad: 'def add_mark(mark, marks=[]):\n    marks.append(mark)\n    return marks',
    good: 'def add_mark(mark, marks=None):\n    if marks is None:\n        marks = []\n    marks.append(mark)\n    return marks',
    reference: 'Python tutorial: Default Argument Values',
    triggers: ['mutable_default_arg'],
    idiomFlags: [],
    topicId: 'functions-project',
  },
  'init-accumulator': {
    title: 'Set up the total before the loop',
    why:
      'An accumulator gets its starting value once, before the loop: 0 for a sum or count, 1 for a product, `[]` for a list of results. ' +
      'Setting it inside the loop resets it on every pass, so only the last item counts.',
    bad: 'for price in prices:\n    total = 0\n    total += price',
    good: 'total = 0\nfor price in prices:\n    total += price',
    reference: 'Python tutorial: for Statements',
    triggers: ['accumulator_init'],
    idiomFlags: [],
    topicId: 'for-loops-range',
  },
  'new-list-not-mutate': {
    title: 'Build a new list instead of changing the one you have',
    why:
      'Removing items from a list while looping over it skips items, and changing a list you were given also changes the caller\'s data. ' +
      'Collecting the items you want into a new list avoids both problems.',
    bad: 'def remove_fails(marks):\n    for m in marks:\n        if m < 50:\n            marks.remove(m)\n    return marks',
    good: 'def remove_fails(marks):\n    passed = []\n    for m in marks:\n        if m >= 50:\n            passed.append(m)\n    return passed',
    reference: 'Python tutorial: for Statements',
    triggers: ['mutate_while_iterating', 'mutated_input', 'aliasing_copy'],
    idiomFlags: [],
    topicId: 'lists-tuples',
  },
  'return-not-print': {
    title: 'Return results instead of printing them',
    why:
      'A returned value can be stored, tested and used in more calculations; a printed one only appears on the screen. ' +
      'CITS1401 auto-markers check what your function returns, and projects do not allow `print` except for graceful termination.',
    bad: 'def total_cost(prices):\n    total = 0\n    for p in prices:\n        total += p\n    print(total)',
    good: 'def total_cost(prices):\n    total = 0\n    for p in prices:\n        total += p\n    return total',
    reference: 'CITS1401 project rules',
    triggers: ['print_vs_return', 'print_in_main'],
    idiomFlags: [],
    topicId: 'functions-basics',
  },
  'round-at-output': {
    title: 'Round only when you return the result',
    why:
      'Each rounding step throws away a little precision, and the error grows through later calculations until the 4th decimal place is wrong. ' +
      'Keep full values while calculating and round once, as you put numbers into the result.',
    bad: 'total = 0\nfor x in values:\n    total += round(x / n, 4)\nresult = total',
    good: 'total = 0\nfor x in values:\n    total += x / n\nresult = round(total, 4)',
    reference: 'CITS1401 project rules',
    triggers: ['round_mid_calc'],
    idiomFlags: [],
    topicId: 'functions-project',
  },
  'specific-except': {
    title: 'Catch the specific error you expect',
    why:
      '`except ValueError:` handles the bad conversion you planned for and still lets real bugs show up. ' +
      'A bare `except:` also hides typos and logic errors, so the program can quietly return a wrong answer.',
    bad: 'try:\n    mark = float(fields[1])\nexcept:\n    mark = 0',
    good: 'try:\n    mark = float(fields[1])\nexcept ValueError:\n    mark = None',
    reference: 'PEP 8: Programming Recommendations',
    triggers: ['bare_except', 'no_graceful_exit'],
    idiomFlags: [],
    topicId: 'exceptions',
  },
  'function-per-task': {
    title: 'One function per task, with parameters and return',
    why:
      'Small functions that take what they need as parameters and return their result can be tested one at a time and reused from `main`. ' +
      'Global variables and loose code at the top of the file make results depend on what ran before.',
    bad: 'total = 0\n\ndef add_all(marks):\n    global total\n    for m in marks:\n        total += m',
    good: 'def total_of(marks):\n    total = 0\n    for m in marks:\n        total += m\n    return total\n\ndef average(marks):\n    return total_of(marks) / len(marks)',
    reference: 'Python tutorial: Defining Functions',
    triggers: ['global_state', 'top_level_code', 'missing_main', 'scope_confusion'],
    idiomFlags: [],
    topicId: 'functions-project',
  },
  'test-edge-cases': {
    title: 'Test empty, one, many and odd inputs',
    why:
      'Hidden tests nearly always include an empty list, a single item, ties, zero, negative numbers and mixed-case text. ' +
      'Trying those yourself before you submit catches crashes such as dividing by zero or indexing an empty list.',
    bad: 'print(largest([3, 8, 5]))',
    good: 'print(largest([3, 8, 5]))   # many\nprint(largest([7]))         # one\nprint(largest([-4, -2]))    # all negative\nprint(largest([]))          # empty',
    reference: 'CITS1401 project rules',
    triggers: ['zero_division', 'invalid_row_not_skipped', 'case_sensitive_compare', 'float_equality', 'index_out_of_range'],
    idiomFlags: [],
    topicId: 'functions-basics',
  },
  'recursion-checklist': {
    title: 'Recursion checklist: base case, smaller step, return',
    why:
      'A recursive function needs a base case that returns without recursing, a recursive call on a smaller input, and a `return` that passes that result back. ' +
      'CITS1401 exam recursion questions do not allow loops, so all the repetition must come from the calls.',
    bad: 'def sum_digits(n):\n    sum_digits(n // 10)\n    return n % 10',
    good: 'def sum_digits(n):\n    if n < 10:\n        return n\n    return n % 10 + sum_digits(n // 10)',
    reference: 'CITS1401 exam rules',
    triggers: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion'],
    idiomFlags: ['recursion_present'],
    topicId: 'recursion',
  },
  'floor-division-intent': {
    title: 'Choose / or // on purpose',
    why:
      '`/` always gives a float and `//` gives the whole-number part. ' +
      'Use `//` for counts, indexes and digit tricks (`n // 10`), and `/` for averages and rates, so the result has the type the value needs.',
    bad: 'middle = nums[len(nums) / 2]\naverage = total // count',
    good: 'middle = nums[len(nums) // 2]\naverage = total / count',
    reference: 'Python tutorial: Using Python as a Calculator',
    triggers: ['int_vs_float_division'],
    idiomFlags: [],
    topicId: 'variables-expressions',
  },
  'fstrings-for-output': {
    title: 'Use f-strings to build output text',
    why:
      'An f-string puts values straight into text, converts numbers for you, and can format decimals with `:.2f`. ' +
      'It avoids joining strings and numbers with `+`, and the TypeError that comes with it.',
    bad: 'print("Average: " + str(round(average, 2)) + " from " + str(count) + " students")',
    good: 'print(f"Average: {average:.2f} from {count} students")',
    reference: 'Python tutorial: Fancier Output Formatting',
    triggers: ['str_int_concat'],
    idiomFlags: ['fstring_used'],
    topicId: 'variables-expressions',
  },
};

/** One card per PatternId, in PATTERN_IDS order. */
export const PATTERNS: PatternCard[] = PATTERN_IDS.map((id) => ({ id, ...CARDS[id] }));

export const PATTERN_BY_ID: Record<PatternId, PatternCard> = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<PatternId, PatternCard>;
