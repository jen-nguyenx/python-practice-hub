import type { Scenario } from '../../schema.ts';

const s1: Scenario = {
  id: 't08-s1',
  title: 'Reid Library café stock',
  story:
    'The café in Reid Library keeps its shelf count in a dictionary that maps each item to how many are left. ' +
    'Sales take items off the shelf, deliveries put them back, and the till lists every sale at closing time.',
  questions: [
    {
      id: 't08-s1-q1',
      format: 'errorTranslator',
      diff: 'easy',
      core: true,
      title: 'The latte that was not there',
      prompt:
        'A barista runs this before opening. It prints one line, then crashes. ' +
        'Click the line that raised the error, pick the exception, then pick the cause and the fix.',
      code: `stock = {'flat white': 12, 'banana bread': 4}
stock['banana bread'] -= 1
print(stock['banana bread'], stock.get('latte', 0))
stock['latte'] += 5
print(stock)`,
      exceptionOptions: ['KeyError', 'IndexError', 'NameError', 'TypeError'],
      causes: [
        {
          id: 'a',
          text: "`'latte'` is not a key yet, and `+=` has to read the old value before adding to it. Fix: `stock['latte'] = stock.get('latte', 0) + 5`",
          correct: true,
        },
        {
          id: 'b',
          text: "`get('latte', 0)` on line 3 stored `'latte': 0`, so the key exists. Fix: write it out in full as `stock['latte'] = stock['latte'] + 5`",
          mistake: 'dict_keyerror',
        },
        {
          id: 'c',
          text: 'A dictionary can only hold the keys it was created with. Fix: add `\'latte\': 0` to the braces on line 1 and never add keys later',
          mistake: 'dict_keyerror',
        },
      ],
      concepts: ['dict-get', 'keyerror', 'dict-update'],
      detects: ['dict_keyerror'],
      expectedSec: 90,
      hints: [
        'Line 3 printed `0` for the latte. Did `get` change the dictionary, or only read from it?',
        "`stock['latte'] += 5` means `stock['latte'] = stock['latte'] + 5`. The right-hand side runs first. Does that key exist at that moment?",
        "`get` returns a default without storing anything. The fixed line starts `stock['latte'] = stock.get('latte', ...`",
      ],
      solution: {
        explanation:
          "Line 1 creates a dictionary with two keys. Line 2 changes a key that already exists, so `'banana bread'` goes from 4 to 3.\n\n" +
          "Line 3 prints `3 0`. `stock.get('latte', 0)` returns the default 0 because `'latte'` is missing, but `get` never adds a key.\n\n" +
          "Line 4 is shorthand for `stock['latte'] = stock['latte'] + 5`. Reading `stock['latte']` fails, so Python raises `KeyError: 'latte'` and line 5 never runs.\n\n" +
          "The fix reads with a default and then stores: `stock['latte'] = stock.get('latte', 0) + 5` gives `'latte': 5`. Dictionaries can gain new keys at any time; only *reading* a missing key is an error.",
      },
      selfExplain: "Why did stock['banana bread'] -= 1 on line 2 work when line 4 crashed?",
    },
    {
      id: 't08-s1-q2',
      format: 'cloze',
      diff: 'easy',
      core: true,
      title: 'Restock from a delivery',
      prompt:
        'A delivery arrives as its own dictionary, for example `{\'muffin\': 10, \'chai\': 8}`. ' +
        'Complete `restock(stock, delivery)` so it adds each delivered amount to `stock` and returns `stock`. ' +
        'Items that are not on the shelf yet must become new keys.',
      template: `def restock(stock, delivery):
    for item, amount in delivery.⟦1⟧:
        stock[item] = ⟦2⟧ + amount
    return stock`,
      blanks: [
        { id: '1', accept: ['items()'] },
        { id: '2', accept: ['stock.get(item, 0)', 'stock.get(item,0)'] },
      ],
      fnName: 'restock',
      tests: [
        { id: 'v1', call: "restock({'flat white': 12, 'muffin': 3}, {'muffin': 10})", expect: "{'flat white': 12, 'muffin': 13}", label: 'more muffins', hidden: false },
        { id: 'v2', call: "restock({'muffin': 3}, {'chai': 8})", expect: "{'muffin': 3, 'chai': 8}", label: 'a new item', hidden: false, tag: 'dict_keyerror' },
        { id: 'h1', call: "restock({'scone': 2}, {})", expect: "{'scone': 2}", label: 'empty delivery', hidden: true },
        { id: 'h2', call: "restock({}, {'latte cup': 50, 'scone': 6})", expect: "{'latte cup': 50, 'scone': 6}", label: 'empty shelf', hidden: true, tag: 'dict_keyerror' },
        { id: 'h3', call: "restock({'bagel': 0, 'wrap': 1}, {'bagel': 4, 'wrap': 2, 'sushi': 5})", expect: "{'bagel': 4, 'wrap': 3, 'sushi': 5}", label: 'a mix of old and new items', hidden: true },
      ],
      concepts: ['dict-items', 'dict-get', 'dict-update'],
      detects: ['dict_keyerror', 'forgot_to_call'],
      expectedSec: 120,
      hints: [
        'The loop needs each key and its value together, and the shelf may not have the item yet.',
        'Blank 1: the dictionary method that gives (key, value) pairs. Blank 2: the current shelf count, or 0 if the item is missing.',
        "Blank 1 is a method call, so it needs brackets. Blank 2 uses `stock.get(...)` with two arguments.",
      ],
      solution: {
        code: `def restock(stock, delivery):
    for item, amount in delivery.items():
        stock[item] = stock.get(item, 0) + amount
    return stock`,
        explanation:
          '`delivery.items()` gives each (item, amount) pair, and `for item, amount in ...` unpacks the pair into two names.\n\n' +
          '`stock.get(item, 0)` is the number already on the shelf, or 0 when the item is new. Adding `amount` and assigning to `stock[item]` either updates the old key or creates a new one.\n\n' +
          "Writing `stock[item] + amount` instead crashes with `KeyError` the first time a new item such as `'chai'` arrives.",
      },
      selfExplain: 'What would the loop give you if blank 1 were keys() instead?',
    },
    {
      id: 't08-s1-q3',
      format: 'refactor',
      diff: 'medium',
      core: false,
      title: 'Count sales without the index',
      prompt:
        'At closing time the till gives a list with one entry per sale. `count_orders(orders)` returns a dictionary mapping each item to how many were sold. ' +
        'It works, but it indexes with `range(len(orders))` and needs an if/else to count.\n\n' +
        'Rewrite it so the loop goes over the orders directly and each count is updated in one line with `get()`. ' +
        'The returned dictionary must not change, and `orders` must not be changed.',
      code: `def count_orders(orders):
    counts = {}
    for i in range(len(orders)):
        if orders[i] in counts:
            counts[orders[i]] = counts[orders[i]] + 1
        else:
            counts[orders[i]] = 1
    return counts`,
      fnName: 'count_orders',
      tests: [
        { id: 'v1', call: "count_orders(['flat white', 'scone', 'flat white'])", expect: "{'flat white': 2, 'scone': 1}", label: 'two items', hidden: false },
        { id: 'v2', call: "count_orders(['chai'])", expect: "{'chai': 1}", label: 'one sale', hidden: false },
        { id: 'h1', call: 'count_orders([])', expect: '{}', label: 'no sales', hidden: true },
        {
          id: 'h2',
          setup: "orders = ['muffin', 'latte', 'muffin', 'muffin', 'latte']",
          call: 'count_orders(orders)',
          expect: "{'muffin': 3, 'latte': 2}",
          argsUnchanged: ['orders'],
          label: 'orders list is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
        { id: 'h3', call: "count_orders(['Latte', 'latte', 'Latte'])", expect: "{'Latte': 2, 'latte': 1}", label: 'capitals still count separately (unchanged behaviour)', hidden: true },
      ],
      mustRemove: ['range_len_index'],
      mustAdd: ['dict_get_used'],
      pattern: 'dict-get-default',
      concepts: ['dict-get', 'counting', 'for-each'],
      detects: ['dict_keyerror', 'accumulator_init', 'mutated_input'],
      expectedSec: 180,
      hints: [
        'The index `i` is only ever used to fetch `orders[i]`. What does `for order in orders:` give you on each pass?',
        'Plan: keep `counts = {}` before the loop. Loop over each order. In one statement, read the current count with a default of 0, add 1, and store it back. Return after the loop.',
        'The whole loop body becomes `counts[order] = counts.get(order, 0) + 1`',
      ],
      solution: {
        code: `def count_orders(orders):
    counts = {}
    for order in orders:
        counts[order] = counts.get(order, 0) + 1
    return counts`,
        explanation:
          '`counts = {}` stays before the loop so the counts build up across every sale.\n\n' +
          '`for order in orders:` hands you each item name directly, so `orders[i]` and `range(len(orders))` are no longer needed.\n\n' +
          '`counts.get(order, 0)` is the count so far, or 0 the first time an item appears. Adding 1 and storing the result does the job of the whole if/else.\n\n' +
          'The function only reads `orders`, so the caller\'s list is unchanged, and an empty list still gives `{}`.',
      },
      selfExplain: 'Why does counts.get(order, 0) + 1 never raise KeyError, while counts[order] += 1 can?',
    },
  ],
};

export default s1;
