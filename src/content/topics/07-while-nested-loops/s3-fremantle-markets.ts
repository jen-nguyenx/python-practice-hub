// Topic 07, scenario 3: nested loops and combinations (Fremantle Markets).
import type { Scenario } from '../../schema.ts';

const FREO_MENU = "mains = [('Laksa', 14), ('Fish and chips', 16)]\ndrinks = [('Lemonade', 4), ('Coffee', 5)]\ndesserts = [('Gelato', 6)]";

const scenario: Scenario = {
  id: 't07-s3',
  title: 'Fremantle Markets weekend planner',
  story:
    'The stallholders at the Fremantle Markets are planning the weekend: stall labels, site fees, shared tents and meal deals. ' +
    'Every task puts one loop inside another. For each pass of the outer loop, the inner loop runs all the way through.',
  questions: [
    {
      id: 't07-s3-q1',
      format: 'predict',
      diff: 'medium',
      core: false,
      title: 'Stall labels by row',
      prompt:
        'Row A of the market hall has 1 stall, row B has 2 and row C has 3. This program prints the labels, one row per line. ' +
        'What does it print? (Spaces at the end of a line do not matter.)',
      code: `letters = 'ABC'
for i in range(len(letters)):
    labels = ''
    for n in range(i + 1):
        labels = labels + letters[i] + str(n + 1) + ' '
    print(labels)`,
      mutants: [
        {
          mistake: 'accumulator_init',
          code: `letters = 'ABC'
labels = ''
for i in range(len(letters)):
    for n in range(i + 1):
        labels = labels + letters[i] + str(n + 1) + ' '
    print(labels)`,
        },
        {
          mistake: 'off_by_one_range',
          code: `letters = 'ABC'
for i in range(len(letters)):
    labels = ''
    for n in range(i):
        labels = labels + letters[i] + str(n + 1) + ' '
    print(labels)`,
        },
      ],
      concepts: ['nested-loop', 'range', 'string-building'],
      detects: ['accumulator_init', 'off_by_one_range'],
      expectedSec: 150,
      hints: [
        'Work out how many times the inner loop runs for each value of `i`, and notice where `labels` is reset.',
        '`i` takes 0, 1, 2. The inner loop is `range(i + 1)`, so it runs 1, 2, then 3 times. `labels` goes back to an empty string at the start of every row.',
        'When `i` is 1, `n` takes 0 and 1, so the second line is `B1 B2`.',
      ],
      solution: {
        explanation:
          '- The outer loop runs with `i` = 0, 1, 2, and `letters[i]` is A, B, C.\n' +
          '- `labels = \'\'` is inside the outer loop, so each row starts with an empty string.\n' +
          '- The inner loop `range(i + 1)` runs `i + 1` times, with `n` from 0, so the stall numbers are `n + 1`: 1 for row A, 1-2 for row B, 1-3 for row C.\n' +
          '- `print(labels)` is inside the outer loop but after the inner loop, so it prints once per row.\n\n' +
          'Output:\n\n' +
          '```\nA1\nB1 B2\nC1 C2 C3\n```\n\n' +
          'If `labels = \'\'` were above the outer loop, the rows would pile up: `A1`, then `A1 B1 B2`, and so on.',
      },
      selfExplain: 'What would the program print if print(labels) were moved one level in, inside the inner loop?',
    },
    {
      id: 't07-s3-q2',
      format: 'trace',
      diff: 'medium',
      core: false,
      title: 'Site fees for every size',
      prompt:
        'A stall site that is `width` metres wide and `depth` metres deep costs `width * depth` dollars a day. ' +
        'The manager adds up the fee for every site size where the depth is at least the width.\n\n' +
        'Fill in `width`, `depth` and `fees` each time **line 4** finishes.',
      code: `fees = 0
for width in range(1, 4):
    for depth in range(width, 4):
        fees = fees + width * depth
print(fees)`,
      watch: ['width', 'depth', 'fees'],
      anchorLine: 4,
      concepts: ['nested-loop', 'range', 'accumulator', 'trace'],
      detects: ['off_by_one_range', 'accumulator_init'],
      expectedSec: 240,
      hints: [
        'Line 4 runs once per pass of the **inner** loop. The inner range starts at the current `width`, so it gets shorter each time.',
        'For `width` 1 the depths are 1, 2, 3. For `width` 2 they are 2, 3. For `width` 3 there is only 3. `fees` is never reset, so it keeps growing across all rows.',
        'The first three rows are (1, 1, 1), (1, 2, 3), (1, 3, 6). The next row starts with `width` 2 and `depth` 2.',
      ],
      solution: {
        explanation:
          '`range(1, 4)` gives widths 1, 2, 3 (4 is left out). For each width, `range(width, 4)` starts at that width.\n\n' +
          '1. width 1, depth 1: fees 0 + 1 = 1\n' +
          '2. width 1, depth 2: fees 1 + 2 = 3\n' +
          '3. width 1, depth 3: fees 3 + 3 = 6\n' +
          '4. width 2, depth 2: fees 6 + 4 = 10\n' +
          '5. width 2, depth 3: fees 10 + 6 = 16\n' +
          '6. width 3, depth 3: fees 16 + 9 = 25\n\n' +
          'That is 3 + 2 + 1 = 6 rows, and the program prints 25. `fees = 0` is before both loops, so it adds up every row.',
      },
      selfExplain: 'How many rows would the table have if the inner loop were range(1, 4) instead?',
    },
    {
      id: 't07-s3-q3',
      format: 'parsons',
      diff: 'medium',
      core: true,
      title: 'Every pair of stalls once',
      prompt:
        'Any two stalls can share a tent. Build `stall_pairs(stalls)`, which returns a **list of tuples** `(first, second)` for every pair of ' +
        'different stalls, each pair once, with `first` earlier in the list than `second`, in loop order.\n\n' +
        'For `[\'Ali\', \'Bea\', \'Cam\']` it returns `[(\'Ali\', \'Bea\'), (\'Ali\', \'Cam\'), (\'Bea\', \'Cam\')]`. ' +
        'Fewer than two stalls gives `[]`. Not every line is needed.',
      lines: [
        { text: 'def stall_pairs(stalls):', indent: 0 },
        { text: 'pairs = []', indent: 1 },
        { text: 'for i in range(len(stalls)):', indent: 1 },
        { text: 'for j in range(i + 1, len(stalls)):', indent: 2 },
        { text: 'pairs.append((stalls[i], stalls[j]))', indent: 3 },
        { text: 'return pairs', indent: 1 },
      ],
      distractors: [
        { text: 'for j in range(len(stalls)):', indent: 2, mistake: 'off_by_one_range' },
        { text: 'pairs.append(stalls[i], stalls[j])', indent: 3, mistake: 'type_error_other' },
      ],
      indentMatters: true,
      fnName: 'stall_pairs',
      tests: [
        {
          id: 'v1', call: "stall_pairs(['Ali', 'Bea', 'Cam'])", expect: "[('Ali', 'Bea'), ('Ali', 'Cam'), ('Bea', 'Cam')]",
          label: 'three stalls', hidden: false,
        },
        { id: 'v2', call: "stall_pairs(['Kai', 'Lu'])", expect: "[('Kai', 'Lu')]", label: 'two stalls', hidden: false, tag: 'type_error_other' },
        { id: 'h1', call: "stall_pairs(['Mo'])", expect: '[]', label: 'one stall (no pairing with itself)', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'stall_pairs([])', expect: '[]', label: 'no stalls', hidden: true },
        {
          id: 'h3', call: "stall_pairs(['W', 'X', 'Y', 'Z'])",
          expect: "[('W', 'X'), ('W', 'Y'), ('W', 'Z'), ('X', 'Y'), ('X', 'Z'), ('Y', 'Z')]",
          label: 'four stalls make six pairs', hidden: true,
        },
      ],
      concepts: ['nested-loop', 'combinations', 'range', 'tuple', 'list'],
      detects: ['off_by_one_range', 'type_error_other', 'accumulator_init'],
      expectedSec: 240,
      hints: [
        'A stall must not be paired with itself, and (Bea, Ali) must not appear after (Ali, Bea). Where should the inner loop start so it only looks at later stalls?',
        'Plan: start an empty list, loop `i` over every position, loop `j` over the positions **after** `i`, add the tuple of the two stalls, and return the list after both loops finish.',
        'The inner loop is `for j in range(i + 1, len(stalls)):`. `append` takes one value, so the pair needs its own brackets: `append((a, b))`.',
      ],
      solution: {
        code: `def stall_pairs(stalls):
    pairs = []
    for i in range(len(stalls)):
        for j in range(i + 1, len(stalls)):
            pairs.append((stalls[i], stalls[j]))
    return pairs`,
        explanation:
          '- `pairs = []` is set once, before both loops, so pairs from every row are kept.\n' +
          '- `for i in range(len(stalls)):` picks the first stall of the pair by position.\n' +
          '- `for j in range(i + 1, len(stalls)):` only looks at stalls after position `i`, so a stall is never paired with itself and each pair appears once. ' +
          '`range(len(stalls))` would also give (Ali, Ali) and (Bea, Ali).\n' +
          '- `pairs.append((stalls[i], stalls[j]))` adds one tuple. Without the inner brackets, `append` gets two arguments and raises TypeError.\n' +
          '- `return pairs` is at the function level, after both loops. With 0 or 1 stalls the inner loop never runs, so `[]` is returned.',
      },
      selfExplain: 'How many pairs does a list of n stalls give, and how can you see that from the two ranges?',
    },
    {
      id: 't07-s3-q4',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 15,
      diff: 'hard',
      core: true,
      title: 'Meal deals under budget (exam style)',
      prompt:
        '*Exam style, 15 marks. Write it by hand first, then submit once.*\n\n' +
        'A food stall makes meal deals of one main, one drink and one dessert. Each menu is a list of `(name, price)` tuples, with whole-dollar prices.\n\n' +
        'Write `meal_deals(mains, drinks, desserts, budget)` that returns a **list of strings** of the form `\'main + drink + dessert\'` ' +
        'for every combination whose total price is **at most** `budget`.\n\n' +
        '- List the deals in loop order: mains in the outer loop, then drinks, then desserts, each in the order given.\n' +
        '- Return an empty list if no deal fits the budget or any menu is empty.\n' +
        '- Do not print anything.\n\n' +
        'Example:\n\n' +
        '```python\n' +
        "mains = [('Laksa', 14), ('Fish and chips', 16)]\n" +
        "drinks = [('Lemonade', 4), ('Coffee', 5)]\n" +
        "desserts = [('Gelato', 6)]\n" +
        'meal_deals(mains, drinks, desserts, 24)\n' +
        "# ['Laksa + Lemonade + Gelato']\n" +
        '```',
      fnName: 'meal_deals',
      starter: `def meal_deals(mains, drinks, desserts, budget):
    pass`,
      tests: [
        {
          id: 'v1',
          setup: FREO_MENU,
          call: 'meal_deals(mains, drinks, desserts, 24)',
          expect: "['Laksa + Lemonade + Gelato']",
          label: 'budget 24', hidden: false,
        },
        {
          id: 'v2',
          setup: FREO_MENU,
          call: 'meal_deals(mains, drinks, desserts, 30)',
          expect: "['Laksa + Lemonade + Gelato', 'Laksa + Coffee + Gelato', 'Fish and chips + Lemonade + Gelato', 'Fish and chips + Coffee + Gelato']",
          label: 'budget 30: every deal fits', hidden: false,
        },
        {
          id: 'h1',
          setup: "mains = [('Laksa', 14)]\ndrinks = [('Coffee', 5), ('Smoothie', 8)]\ndesserts = [('Gelato', 6)]",
          call: 'meal_deals(mains, drinks, desserts, 25)',
          expect: "['Laksa + Coffee + Gelato']",
          label: 'a deal that costs exactly the budget', hidden: true, tag: 'off_by_one_range',
        },
        {
          id: 'h2',
          setup: "mains = [('Dumplings', 9), ('Pad thai', 13), ('Burger', 15)]\ndrinks = [('Water', 0), ('Juice', 6)]\ndesserts = [('Churros', 5), ('Crepe', 7)]",
          call: 'meal_deals(mains, drinks, desserts, 21)',
          expect: "['Dumplings + Water + Churros', 'Dumplings + Water + Crepe', 'Dumplings + Juice + Churros', 'Pad thai + Water + Churros', 'Pad thai + Water + Crepe', 'Burger + Water + Churros']",
          label: 'deals from several mains', hidden: true, tag: 'accumulator_init',
        },
        {
          id: 'h3',
          setup: "mains = [('Laksa', 14)]\ndrinks = [('Lemonade', 4), ('Coffee', 5)]\ndesserts = [('Gelato', 6), ('Brownie', 7)]",
          call: 'meal_deals(mains, drinks, desserts, 30)',
          expect: "['Laksa + Lemonade + Gelato', 'Laksa + Lemonade + Brownie', 'Laksa + Coffee + Gelato', 'Laksa + Coffee + Brownie']",
          label: 'several deals for one main', hidden: true, tag: 'early_return_in_loop',
        },
        {
          id: 'h4',
          setup: "mains = [('Laksa', 14)]\ndrinks = [('Lemonade', 4)]\ndesserts = []",
          call: 'meal_deals(mains, drinks, desserts, 50)',
          expect: '[]',
          label: 'no desserts on the menu', hidden: true,
        },
        {
          id: 'h5',
          setup: FREO_MENU,
          call: 'meal_deals(mains, drinks, desserts, 10)',
          expect: '[]',
          label: 'nothing fits the budget', hidden: true, tag: 'return_type_wrong',
        },
      ],
      concepts: ['nested-loop', 'combinations', 'tuple', 'list', 'accumulator'],
      detects: ['accumulator_init', 'early_return_in_loop', 'off_by_one_range', 'return_type_wrong', 'print_vs_return'],
      expectedSec: 600,
      hints: [
        'One loop per menu, one inside the other. The price check and the append go in the innermost loop.',
        'Plan: make an empty result list before any loop. Loop over mains, inside that over drinks, inside that over desserts. Add the three prices; if the total is at most the budget, build the string and append it. Return the list after all three loops.',
        'Unpack each tuple in the loop header: `for main, main_price in mains:`. The check is `if main_price + drink_price + dessert_price <= budget:`.',
      ],
      solution: {
        code: `def meal_deals(mains, drinks, desserts, budget):
    deals = []
    for main, main_price in mains:
        for drink, drink_price in drinks:
            for dessert, dessert_price in desserts:
                if main_price + drink_price + dessert_price <= budget:
                    deals.append(main + ' + ' + drink + ' + ' + dessert)
    return deals`,
        explanation:
          '- `deals = []` is set once, before the outer loop. Inside the mains loop it would restart for every main and only the last main\'s deals would survive.\n' +
          '- `for main, main_price in mains:` unpacks each `(name, price)` tuple. `m[0]` and `m[1]` work too.\n' +
          '- The three loops are nested in the order the spec gives, so the deals come out mains first, then drinks, then desserts.\n' +
          '- `<= budget` includes a deal that costs exactly the budget ("at most").\n' +
          '- The append is inside the `if` in the innermost loop, and `return deals` is after all the loops. A `return` inside a loop would stop after the first deal.\n' +
          '- If any menu is empty, the loop over it runs 0 times, so nothing is appended and `[]` is returned.\n\n' +
          'Marking guide (15): result list set up once (2), three correctly nested loops (4), total price and `<=` test (3), string in the exact format (3), return after the loops (3).',
      },
      selfExplain: 'Why does an empty desserts list give [] without any special if statement?',
    },
  ],
};

export default scenario;
