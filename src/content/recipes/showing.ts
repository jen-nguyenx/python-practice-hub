// Reference: showing your answer.
import type { Recipe } from '../recipeSchema.ts';

const recipes: Recipe[] = [
  {
    id: 'print-several-values',
    task: 'Print several values on one line',
    group: 'showing',
    also: ['print multiple values', 'sep'],
    code: "name = 'Ada'\nage = 36\nprint(name, age)\nprint(name, age, sep=' - ')\n",
    note: '`print()` joins its arguments with a single space by default and adds a newline at the end; both are changeable with the `sep` and `end` keyword arguments.',
  },
  {
    id: 'fstrings-basics',
    task: 'Build a string with values inside it using an f-string',
    group: 'showing',
    also: ['f-string', 'string formatting', 'interpolation'],
    topicId: 'strings',
    code: "name = 'Ada'\nscore = 91\nprint(f'{name} scored {score}')\nprint(f'{name} scored {score + 9} with bonus')\n",
    note: 'Anything inside the `{}` of an f-string is a real Python expression, evaluated on the spot, so `{score + 9}` works exactly like it would outside the string.',
  },
  {
    id: 'format-to-2dp-in-fstring',
    task: 'Format a number to 2 decimal places inside an f-string',
    group: 'showing',
    also: ['.2f', 'decimal places in fstring'],
    code: "total = 19.5\nprint(f'Total: {total:.2f}')\nprint(f'Total: {total:.0f}')\n",
    note: 'The part after the `:` is a format spec; `.2f` always shows exactly two decimal places, padding with a zero when needed, unlike `round()` which can still print fewer digits.',
  },
  {
    id: 'print-without-a-newline',
    task: 'Print without moving to a new line afterwards',
    group: 'showing',
    also: ['end=', 'same line', 'no newline'],
    code: "for n in [1, 2, 3]:\n    print(n, end=' ')\nprint()\n",
    note: 'The `end` keyword argument replaces the newline `print()` normally adds; a final plain `print()` is a common way to add the newline back at the end of the loop.',
  },
  {
    id: 'print-a-list-one-item-per-line',
    task: 'Print a list with one item per line',
    group: 'showing',
    also: ['print each item', 'list one per line'],
    code: "names = ['Ada', 'Bo', 'Cy']\nfor name in names:\n    print(name)\n",
    note: 'Printing the list itself, `print(names)`, shows it as one line with brackets and commas; looping over it prints each item plainly, which usually reads better as a report.',
  },
  {
    id: 'align-columns-in-output',
    task: 'Align columns when printing a table of results',
    group: 'showing',
    also: ['table', 'columns', 'align output'],
    code: "rows = [('Ada', 91), ('Bo', 7)]\nfor name, mark in rows:\n    print(f'{name:<6}{mark:>4}')\n",
    note: '`{value:<6}` pads with spaces up to width 6 on the right side of the text, and `{value:>4}` pads on the left so the text ends up right-aligned within width 4; together they line columns up regardless of how long each value is.',
  },
  {
    id: 'show-a-percentage',
    task: 'Show a value as a percentage',
    group: 'showing',
    also: ['percent', '%', 'percentage format'],
    code: "correct, total = 17, 20\nrate = correct / total\nprint(f'{rate:.1%}')\n",
    note: 'The `%` format spec multiplies the number by 100 and adds the percent sign for you, so pass the plain fraction like `0.85`, not `85`, or the result comes out one hundred times too large.',
  },
  {
    id: 'print-a-dict-readably',
    task: 'Print a dictionary in a readable way',
    group: 'showing',
    also: ['print dict', 'readable dictionary'],
    topicId: 'dictionaries',
    code: "stock = {'tea': 6, 'cocoa': 10}\nfor name, count in stock.items():\n    print(f'{name}: {count}')\n",
    note: "Printing the dictionary directly, `print(stock)`, shows Python's own `{...}` notation; looping over `.items()` lets you choose wording and layout that make sense to a reader.",
  },
];

export default recipes;
