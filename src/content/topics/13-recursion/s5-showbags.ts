import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s5',
  title: 'Royal Show showbags',
  story:
    'At the Perth Royal Show a showbag can hold loose items and smaller showbags, and those can hold smaller bags again. ' +
    'The stall keeps a bag as a nested list, so every job on the stall (add up the value, count the items, swap a line of stock) is one bag plus the rest of the bag.',
  questions: [
    {
      id: 't13-s5-q1',
      format: 'mcq',
      diff: 'medium',
      core: true,
      title: 'Which total_value works?',
      prompt:
        '`total_value(bag)` should return the total price of everything in a showbag. `bag` is a list whose items are prices (ints) or smaller bags (lists), nested to any depth, and any bag may be empty.\n\n' +
        'So `total_value([5, [3, [2]], 4])` returns 14, and `total_value([])` returns 0.\n\n' +
        'Which version is correct?',
      options: [
        {
          id: 'a',
          text: `def total_value(bag):
    if bag == []:
        return 0
    first = bag[0]
    if isinstance(first, list):
        return total_value(first) + total_value(bag[1:])
    return first + total_value(bag[1:])`,
          correct: true,
          why:
            'Correct. The empty bag is the base case. Every other call deals with one item, `bag[0]`, and hands the rest of the bag, `bag[1:]`, to another call. Both calls in the list branch are returned, so the inner bag\'s value is not lost.',
        },
        {
          id: 'b',
          text: `def total_value(bag):
    first = bag[0]
    if isinstance(first, list):
        return total_value(first) + total_value(bag[1:])
    return first + total_value(bag[1:])`,
          mistake: 'missing_base_case',
          why:
            'There is no base case, so the calls never stop. `bag[1:]` of a one-item bag is `[]`, and the next call reaches `bag[0]` on an empty list, which raises `IndexError`.',
        },
        {
          id: 'c',
          text: `def total_value(bag):
    if bag == []:
        return 0
    first = bag[0]
    if isinstance(first, list):
        total_value(first)
    return first + total_value(bag[1:])`,
          mistake: 'recursion_result_ignored',
          why:
            'The inner bag is visited but its value is thrown away, because the call is not returned or stored. Worse, `first` is then still a list, so `first + ...` raises `TypeError`.',
        },
        {
          id: 'd',
          text: `def total_value(bag):
    if len(bag) == 1:
        return bag[0]
    first = bag[0]
    if isinstance(first, list):
        return total_value(first) + total_value(bag[1:])
    return first + total_value(bag[1:])`,
          mistake: 'index_out_of_range',
          why:
            'A base case of one item never catches an empty bag: `total_value([])` skips it and `bag[0]` raises `IndexError`. It is also wrong for a one-item bag holding a bag, because it returns the list itself instead of its value.',
        },
      ],
      concepts: ['base-case', 'nested-list', 'recursive-case'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'index_out_of_range'],
      expectedSec: 150,
      hints: [
        'Check each version against the three-part checklist: a case that stops without calling again, a call on something smaller, and a `return` for every result the function works out.',
        'Try each version on the smallest inputs in your head: `total_value([])`, then `total_value([5])`, then `total_value([[5]])`. Which version gives a number every time?',
        'Two versions choose a base case that an empty bag never reaches, and one visits an inner bag without using what it returns.',
      ],
      solution: {
        explanation:
          'Version a has all three parts.\n\n' +
          '- Base case: an empty bag is worth 0 and makes no further call. Every chain of calls ends there, because `bag[1:]` is one item shorter each time and an inner bag is smaller than the bag holding it.\n' +
          '- Recursive case: deal with `bag[0]` only. If it is a bag, its value comes from a call on it; if it is a price, it is the price.\n' +
          '- Return: both parts are added and returned, so nothing is lost.\n\n' +
          '`total_value([5, [3, [2]], 4])` is 5 + (value of `[[3, [2]], 4]`), which is (3 + 2) + 4, giving 14.\n\n' +
          'Version b has no base case and hits `IndexError` on `[]`. Version c ignores what the inner call returns and then adds a list to a number. Version d stops at one item, which an empty bag never equals.',
      },
      selfExplain: 'Why is an empty bag a better base case here than a bag holding exactly one item?',
    },
    {
      id: 't13-s5-q2',
      format: 'predict',
      diff: 'medium',
      core: true,
      title: 'Which bag finishes first?',
      prompt:
        'The stall prints a line whenever it finishes pricing an inner bag, so the staff can check the nesting. Type exactly what this program prints.',
      code: `def worth(bag, depth):
    if bag == []:
        return 0
    first = bag[0]
    if isinstance(first, list):
        inner = worth(first, depth + 1)
        print('bag at depth', depth + 1, 'holds', inner)
        return inner + worth(bag[1:], depth)
    return first + worth(bag[1:], depth)


print(worth([5, [3, [2]], 4], 0))`,
      mutants: [
        {
          code: `def worth(bag, depth):
    if bag == []:
        return 0
    first = bag[0]
    if isinstance(first, list):
        inner = worth(first, depth + 1)
        print('bag at depth', depth + 1, 'holds', inner)
        return worth(bag[1:], depth)
    return first + worth(bag[1:], depth)


print(worth([5, [3, [2]], 4], 0))`,
          mistake: 'recursion_result_ignored',
        },
        {
          code: `depth = 0


def worth(bag):
    global depth
    if bag == []:
        return 0
    first = bag[0]
    if isinstance(first, list):
        depth = depth + 1
        inner = worth(first)
        print('bag at depth', depth, 'holds', inner)
        return inner + worth(bag[1:])
    return first + worth(bag[1:])


print(worth([5, [3, [2]], 4]))`,
          mistake: 'scope_confusion',
        },
      ],
      concepts: ['call-stack', 'nested-list', 'local-variables'],
      detects: ['recursion_result_ignored', 'scope_confusion'],
      expectedSec: 300,
      hints: [
        'Nothing is printed on line 7 until the call on line 6 has finished. Which inner bag is the first one to finish?',
        'Draw the calls as a tree. The bag `[3, [2]]` cannot print until `[[2]]` inside it has come back, and `[[2]]` cannot print until `[2]` has. Each call keeps its own `depth`, so the number printed is whatever that particular call was given plus one.',
        'The first line is `bag at depth 2 holds 2`. The bag `[3, [2]]` is at depth 1 and its contents come to 5.',
      ],
      solution: {
        explanation:
          'The outer call takes the price 5, then hands `[[3, [2]], 4]` on. That call sees a bag first, so it starts pricing `[3, [2]]` at depth 1.\n\n' +
          '`[3, [2]]` takes the price 3, then hands `[[2]]` on, which starts pricing `[2]` at depth 2. `[2]` is just the price 2, so it comes back first, and the call holding it prints `bag at depth 2 holds 2`.\n\n' +
          'Now `[3, [2]]` is finished: 3 + 2 = 5, so the call holding it prints `bag at depth 1 holds 5`. Only then does the rest of the outer bag, `[4]`, get priced.\n\n' +
          'The total is 5 + 3 + 2 + 4 = 14, so the program prints:\n\n' +
          '```\nbag at depth 2 holds 2\nbag at depth 1 holds 5\n14\n```\n\n' +
          'The deepest bag prints first even though it started last, and each call kept its own `depth` and its own `inner`.',
      },
      selfExplain: 'Why is the depth printed by the second line smaller than the depth printed by the first?',
    },
    {
      id: 't13-s5-q3',
      format: 'fixBug',
      diff: 'medium',
      core: true,
      title: 'The count that never stops',
      prompt:
        '`count_items(bag)` should return, as an int, how many loose items are in a showbag at any depth. Bags themselves are not counted, and any bag may be empty, so `count_items([1, [2, [3, 4]], 5])` returns 5 and `count_items([[], [[]]])` returns 0.\n\n' +
        'Run the tests: every call raises `IndexError`. Fix it by adding at most two lines.',
      buggy: `def count_items(bag):
    """Return how many loose items are in bag, at any depth."""
    if isinstance(bag[0], list):
        return count_items(bag[0]) + count_items(bag[1:])
    return 1 + count_items(bag[1:])`,
      bugMistake: 'missing_base_case',
      maxChangedLines: 2,
      fnName: 'count_items',
      tests: [
        { id: 'v1', call: 'count_items([1, 2, 3])', expect: '3', label: 'no nesting', hidden: false, tag: 'missing_base_case' },
        { id: 'v2', call: 'count_items([1, [2, [3, 4]], 5])', expect: '5', label: 'bags inside bags', hidden: false, tag: 'missing_base_case' },
        { id: 'h1', call: 'count_items([])', expect: '0', label: 'an empty showbag', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: 'count_items([[], [[]]])', expect: '0', label: 'only empty bags', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: "count_items(['showbag', ['ticket', 'ride']])", expect: '3', label: 'items that are text', hidden: true },
        { id: 'h4', call: 'count_items([[1], [2, [3]], []])', expect: '3', label: 'a mix of full and empty bags', hidden: true },
      ],
      concepts: ['base-case', 'nested-list', 'no-loops'],
      detects: ['missing_base_case', 'index_out_of_range'],
      expectedSec: 240,
      hints: [
        'Follow `count_items([1])` line by line. It reaches the last line and calls itself with what?',
        'Both branches make the bag smaller, so sooner or later a call receives the empty bag. Nothing in this function says what an empty bag is worth, so it goes straight to `bag[0]`.',
        'Add the base case above everything else: an empty bag holds 0 items.',
      ],
      solution: {
        code: `def count_items(bag):
    """Return how many loose items are in bag, at any depth."""
    if bag == []:
        return 0
    if isinstance(bag[0], list):
        return count_items(bag[0]) + count_items(bag[1:])
    return 1 + count_items(bag[1:])`,
        explanation:
          '- `if bag == []: return 0` is the missing base case. It has to come **first**, before `bag[0]` is read, or the check never happens.\n' +
          '- `count_items([1])` counts the 1 and then calls itself with `[]`. Without the base case that call runs `bag[0]` on an empty list and raises `IndexError`, which is why even the simplest test failed.\n' +
          '- An inner bag makes the same journey: `[[], [[]]]` reaches `[]` twice and needs an answer both times.\n' +
          '- The two recursive lines were already right: a bag contributes whatever is inside it, a loose item contributes 1, and both are added to the count for the rest of the bag.\n' +
          '- Strings are not lists, so `isinstance(bag[0], list)` is False for `\'ticket\'` and text counts as one item.',
      },
      selfExplain: 'Why must the base case be checked before the isinstance line rather than after it?',
    },
    {
      id: 't13-s5-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 12,
      diff: 'hard',
      core: true,
      title: 'Cheapest and dearest (exam style)',
      prompt:
        '*Exam style, 12 marks. Write it by hand first, then submit once.*\n\n' +
        'The stall wants the price range of a flat list of showbag prices.\n\n' +
        'Write a function `price_range(prices)` that returns the **tuple** `(lowest, highest)` for a list of numbers, and `None` when the list is empty. A one-item list gives that item twice, for example `price_range([9])` returns `(9, 9)`.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions), and neither are `min`, `max` and `sorted`.\n\n' +
        'Example: `price_range([12, 5, 30, 7])` returns `(5, 30)`.',
      fnName: 'price_range',
      starter: `def price_range(prices):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: 'price_range([12, 5, 30, 7])', expect: '(5, 30)', label: 'four prices', hidden: false },
        { id: 'v2', call: 'price_range([])', expect: 'None', label: 'no prices', hidden: false, tag: 'missing_base_case' },
        { id: 'h1', call: 'price_range([9])', expect: '(9, 9)', label: 'one price', hidden: true, tag: 'index_out_of_range' },
        { id: 'h2', call: 'price_range([4, 4, 4])', expect: '(4, 4)', label: 'every price the same', hidden: true },
        { id: 'h3', call: 'price_range([-3, 0, 2])', expect: '(-3, 2)', label: 'a refund and a zero', hidden: true },
        { id: 'h4', call: 'price_range([2.5, 1.25, 8.0])', expect: '(1.25, 8.0)', cmp: 'float', label: 'prices in dollars and cents', hidden: true },
        { id: 'h5', call: 'price_range([3, 1, 4, 1, 5, 9])', expect: '(1, 9)', label: 'the smallest price appears twice', hidden: true },
        {
          id: 'h6',
          setup: 'prices = [12, 5, 30, 7]',
          call: 'price_range(prices)',
          expect: '(5, 30)',
          argsUnchanged: ['prices'],
          label: 'the price list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['base-case', 'tuple-return', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion', 'return_type_wrong', 'index_out_of_range'],
      expectedSec: 660,
      hints: [
        'There are two cases you can answer without any recursion at all. What are they, and what does each return?',
        'Plan: an empty list gives `None`; a list of one price gives that price twice. Otherwise ask the same function for the range of everything after the first price, then compare the first price with the two values that come back and return the better pair.',
        'The recursive step is `rest = price_range(prices[1:])`, which is a tuple. Take `rest[0]` and `rest[1]` apart, compare them with `prices[0]`, and return a new tuple.',
      ],
      solution: {
        code: `def price_range(prices):
    if prices == []:
        return None
    if len(prices) == 1:
        return (prices[0], prices[0])
    rest = price_range(prices[1:])
    first = prices[0]
    low = rest[0]
    high = rest[1]
    if first < low:
        low = first
    if first > high:
        high = first
    return (low, high)`,
        explanation:
          '- `if prices == []: return None` answers the empty list. It must come first, because every other line reads `prices[0]`.\n' +
          '- `if len(prices) == 1: return (prices[0], prices[0])` is the case that stops the recursion for a real list. A single price is both the lowest and the highest, and returning a tuple here keeps the return type the same on every path.\n' +
          '- `rest = price_range(prices[1:])` is the one recursive call. `prices[1:]` is a new, shorter list, so the original list is never changed and the calls always get closer to length 1.\n' +
          '- `rest` is a tuple, so `rest[0]` is the lowest of everything after the first price and `rest[1]` is the highest. Storing the call in a variable is what stops the result being thrown away.\n' +
          '- The two `if` statements compare the first price with those two values, and the new tuple is returned to the call that is waiting for it.\n' +
          '- For `[12, 5, 30, 7]`: `[7]` gives `(7, 7)`, then 30 gives `(7, 30)`, then 5 gives `(5, 30)`, then 12 changes nothing, so `(5, 30)` comes out.\n\n' +
          'Marking guide (12): empty list returns None (2), single-item base case returning a tuple (3), one recursive call on `prices[1:]` (2), result stored and compared rather than ignored (3), tuple returned on every path with no loops and no `min`/`max` (2).',
      },
      selfExplain: 'Why does the single-item case return a tuple rather than just the price?',
    },
    {
      id: 't13-s5-q5',
      format: 'write',
      kind: 'function',
      diff: 'hard',
      core: false,
      title: 'Swapping a line of stock',
      prompt:
        'A supplier has stopped making one item, so the stall wants every copy of it swapped for the replacement, everywhere in a bag, without disturbing the shape of the bag.\n\n' +
        'Write `restock(bag, old, new)` that returns a **new** nested list with the same shape as `bag`, where every item equal to `old` has been replaced by `new`.\n\n' +
        '- `bag` is a list whose items are either items (ints or strings) or smaller bags (lists), nested to any depth. Any bag may be empty.\n' +
        '- `old` and `new` are items, never bags.\n' +
        '- Do **not** change `bag` or any bag inside it.\n' +
        '- **Recursion must be used and loops are not allowed** (no `for`, `while` or comprehensions).\n\n' +
        "Example: `restock([1, [2, 1], 3], 1, 9)` returns `[9, [2, 9], 3]`.",
      fnName: 'restock',
      starter: `def restock(bag, old, new):
    """Return a new bag of the same shape with every old item replaced by new."""
    pass`,
      rules: ['noLoops'],
      tests: [
        {
          id: 'v1',
          call: "restock(['cap', 'mug', 'cap'], 'cap', 'hat')",
          expect: "['hat', 'mug', 'hat']",
          label: 'a flat bag',
          hidden: false,
        },
        { id: 'v2', call: 'restock([1, [2, 1], 3], 1, 9)', expect: '[9, [2, 9], 3]', label: 'a bag inside a bag', hidden: false },
        { id: 'h1', call: 'restock([], 1, 2)', expect: '[]', label: 'an empty bag', hidden: true, tag: 'missing_base_case' },
        {
          id: 'h2',
          call: 'restock([[], [[]]], 1, 2)',
          expect: '[[], [[]]]',
          label: 'only empty bags, so the shape must survive',
          hidden: true,
          tag: 'return_type_wrong',
        },
        { id: 'h3', call: 'restock([1, 2], 5, 9)', expect: '[1, 2]', label: 'nothing to replace', hidden: true },
        {
          id: 'h4',
          call: "restock(['mug', ['mug', ['cap', 'mug']]], 'mug', 'tea towel')",
          expect: "['tea towel', ['tea towel', ['cap', 'tea towel']]]",
          label: 'three levels deep',
          hidden: true,
        },
        {
          id: 'h5',
          setup: 'bag = [1, [1, [1]]]',
          call: 'restock(bag, 1, 0)',
          expect: '[0, [0, [0]]]',
          argsUnchanged: ['bag'],
          label: 'the original bag is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['nested-list', 'isinstance', 'new-not-mutate', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'mutated_input', 'return_type_wrong', 'loop_in_recursion'],
      expectedSec: 540,
      hints: [
        'Same shape as the other bag functions: deal with `bag[0]` yourself and let a recursive call deal with `bag[1:]`. The difference is that this one builds a list instead of adding numbers.',
        'Plan: an empty bag becomes a new empty list. Otherwise look at the first thing: a bag gets its own recursive call (which returns a new bag of the same shape), an item equal to `old` becomes `new`, and anything else stays as it is. Then join that one piece to the restocked rest with `[piece] + restock(bag[1:], old, new)`.',
        '```python\nfirst = bag[0]\nif isinstance(first, list):\n    front = restock(first, old, new)\n```\n\nWhat are the other two possibilities for `front`, and how is it joined to the rest?',
      ],
      solution: {
        code: `def restock(bag, old, new):
    """Return a new bag of the same shape with every old item replaced by new."""
    if bag == []:
        return []
    first = bag[0]
    if isinstance(first, list):
        front = restock(first, old, new)
    elif first == old:
        front = new
    else:
        front = first
    return [front] + restock(bag[1:], old, new)`,
        explanation:
          '- `if bag == []: return []` is the base case, and it returns a **new** empty list, which is what keeps the shape of empty bags in the answer.\n' +
          '- `first = bag[0]` is the only thing this call decides about.\n' +
          '- A bag is handled by a recursive call. That call returns a brand new list, so the inner bag in the answer is a copy, not the caller\'s bag. This is what makes `[[], [[]]]` come back with the same shape rather than flattened.\n' +
          '- `elif first == old: front = new` does the swap, and anything else is kept unchanged. The `elif` matters: the list test has to come first, because comparing a list with `old` would just be False and the bag would be copied across whole.\n' +
          '- `return [front] + restock(bag[1:], old, new)` wraps the one piece in a list and joins it to the restocked rest. `front + ...` without the brackets would raise `TypeError` for an item, and would silently splice an inner bag into the outer one.\n' +
          '- Nothing is ever appended to `bag` or to a list inside it: every list in the answer is built by this function, so the original bag is untouched. `bag[1:]` also makes a new list on the way down.',
      },
      selfExplain: 'Why does the inner bag have to be rebuilt by a recursive call rather than copied across as it is?',
    },
  ],
};

export default scenario;
