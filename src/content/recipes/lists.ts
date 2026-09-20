// Reference: lists and tuples.
import type { Recipe } from '../recipeSchema.ts';

const recipes: Recipe[] = [
  {
    id: 'sort-a-list',
    task: 'Sort a list',
    group: 'lists',
    also: ['order', 'ascending', 'descending', 'smallest', 'largest'],
    topicId: 'lists-tuples',
    code: "marks = [72, 45, 91, 68]\nprint(sorted(marks))\nprint(sorted(marks, reverse=True))\nprint(marks)\n",
    note: '`sorted()` hands back a new list and leaves the original alone. `marks.sort()` reorders the list itself and returns `None`, which is why `x = marks.sort()` is almost always a mistake.',
  },
  {
    id: 'sort-by-a-key',
    task: 'Sort by something other than the value itself',
    group: 'lists',
    also: ['key', 'by length', 'by second item', 'custom order'],
    topicId: 'lists-tuples',
    code: "words = ['fig', 'apple', 'kiwi']\nprint(sorted(words, key=len))\npairs = [('Ada', 72), ('Bo', 91)]\nprint(sorted(pairs, key=lambda p: p[1], reverse=True))\n",
    note: '`key` takes a function that turns each item into the thing you want to sort on. It is called once per item, not once per comparison.',
  },
  {
    id: 'sort-with-a-tie-break',
    task: 'Sort by one thing, then another when they tie',
    group: 'lists',
    also: ['tie break', 'two keys', 'secondary sort'],
    topicId: 'lists-tuples',
    code: "rows = [('Bo', 72), ('Ada', 72), ('Cy', 91)]\nprint(sorted(rows, key=lambda r: (-r[1], r[0])))\n",
    note: 'Return a tuple from `key` and Python compares the first element, then the second only where the first ties. Negating a number sorts it downwards while everything else stays ascending.',
  },
  {
    id: 'add-and-remove',
    task: 'Add to or remove from a list',
    group: 'lists',
    also: ['append', 'pop', 'insert', 'delete', 'push'],
    topicId: 'lists-tuples',
    code: "q = ['a', 'b']\nq.append('c')\nq.insert(0, 'start')\nprint(q)\nprint(q.pop())\nprint(q.pop(0))\nprint(q)\n",
    note: '`append` adds at the end, `pop()` takes from the end, and `pop(0)` takes from the front. All of them change the list in place.',
  },
  {
    id: 'copy-a-list',
    task: 'Copy a list so changing one does not change the other',
    group: 'lists',
    also: ['duplicate', 'clone', 'aliasing', 'same list'],
    topicId: 'lists-tuples',
    code: "a = [1, 2, 3]\nsame = a\ncopy = list(a)\nsame.append(4)\nprint(a, same, copy)\n",
    note: '`same = a` gives the same list a second name, so changing either changes both. `list(a)` or `a[:]` makes a real copy, one level deep.',
  },
  {
    id: 'biggest-and-total',
    task: 'Find the largest, smallest, total or average',
    group: 'lists',
    also: ['max', 'min', 'sum', 'mean', 'average'],
    topicId: 'lists-tuples',
    code: "marks = [72, 45, 91, 68]\nprint(max(marks), min(marks), sum(marks))\nprint(sum(marks) / len(marks))\nprint(round(sum(marks) / len(marks), 2))\n",
    note: 'All of these raise `ValueError` on an empty list, and the average also divides by zero, so guard with `if marks:` when the data might be empty.',
  },
];

export default recipes;
