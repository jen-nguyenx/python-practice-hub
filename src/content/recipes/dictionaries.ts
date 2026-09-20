// Reference: dictionaries.
import type { Recipe } from '../recipeSchema.ts';

const recipes: Recipe[] = [
  {
    id: 'sort-a-dict-by-value',
    task: 'Sort a dictionary by its values',
    group: 'dictionaries',
    also: ['rank', 'top', 'most common', 'highest', 'order a dict'],
    topicId: 'dictionaries',
    code: "sales = {'tea': 6, 'cocoa': 10, 'milk': 4}\nranked = sorted(sales.items(), key=lambda kv: kv[1], reverse=True)\nprint(ranked)\nprint(ranked[0][0])\n",
    note: '`items()` gives `(key, value)` pairs, and sorting those gives a list of tuples rather than a dictionary. A dictionary has no order of its own, so ranking always ends in a list.',
  },
  {
    id: 'count-things',
    task: 'Count how many times each thing appears',
    group: 'dictionaries',
    also: ['tally', 'frequency', 'how many', 'occurrences'],
    topicId: 'dictionaries',
    code: "words = ['tea', 'cocoa', 'tea', 'tea']\ncounts = {}\nfor w in words:\n    counts[w] = counts.get(w, 0) + 1\nprint(counts)\n",
    note: '`get(w, 0)` is the whole trick: it hands back 0 for a word not seen yet, so the first `+ 1` works without a special case.',
  },
  {
    id: 'missing-key',
    task: 'Look something up without crashing when it is missing',
    group: 'dictionaries',
    also: ['keyerror', 'default', 'get', 'safe lookup'],
    topicId: 'dictionaries',
    code: "stock = {'tea': 6}\nprint(stock.get('cocoa'))\nprint(stock.get('cocoa', 0))\nprint('cocoa' in stock)\n",
    note: '`stock["cocoa"]` raises `KeyError`. `.get()` returns `None` instead, and `.get(key, 0)` returns something you can do arithmetic with.',
  },
  {
    id: 'group-rows',
    task: 'Group things by a shared value',
    group: 'dictionaries',
    also: ['bucket', 'collect by', 'group by', 'setdefault'],
    topicId: 'dictionaries',
    code: "rows = [('Perth', 'Ada'), ('Perth', 'Bo'), ('Broome', 'Cy')]\nby_city = {}\nfor city, name in rows:\n    by_city.setdefault(city, []).append(name)\nprint(by_city)\n",
    note: '`setdefault(city, [])` returns the existing list, or puts an empty one there first. One pass to build an index like this beats searching the rows over and over.',
  },
  {
    id: 'loop-a-dict',
    task: 'Loop over a dictionary',
    group: 'dictionaries',
    also: ['iterate', 'keys', 'values', 'items'],
    topicId: 'dictionaries',
    code: "stock = {'tea': 6, 'cocoa': 10}\nfor name in stock:\n    print(name)\nfor name, n in stock.items():\n    print(name, n)\n",
    note: 'Looping over a dictionary gives you its **keys**, not its values and not its pairs. Use `.items()` when you want both.',
  },
];

export default recipes;
