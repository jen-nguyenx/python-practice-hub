import type { Topic } from '../../schema.ts';

export const cheatsheet = `**The three parts of every recursive function**

\`\`\`python
def factorial(n):
    if n == 0:                           # 1. base case: answer straight away, no call
        return 1
    return n * factorial(n - 1)          # 2. smaller input  3. return the combined result
\`\`\`

- **Base case**: the smallest input you can answer without calling the function again. Write it first.
- **Recursive case**: call the function on a **smaller** input that is guaranteed to reach the base case.
- **Return**: \`return\` the recursive result (usually combined with the part you handled). A bare call like \`factorial(n - 1)\` on its own line throws the answer away.
- Every path through the function must end in a \`return\` with the right type.

**How to make the input smaller**

\`\`\`python
# numbers
n % 10          # last digit of 4096 -> 6
n // 10         # the rest -> 409   (// keeps an int; / gives 409.6)
n - 1           # counting down

# strings (work the same way on lists and tuples)
text[0]         # first character
text[1:]        # everything after the first -> '' when text has 1 character
text[-1]        # last character
text[1:-1]      # the middle, without the first and last

# lists: handle the first item, recurse on the rest
first = items[0]
rest = items[1:]
\`\`\`

A slice never crashes: \`''[1:]\` is \`''\` and \`[][1:]\` is \`[]\`. Indexing does crash: \`''[0]\` raises IndexError. So the base case must catch the empty string or list **before** you index it.

**Standard shapes**

\`\`\`python
def sum_to(n):                       # number -> number
    if n <= 0:
        return 0
    return n + sum_to(n - 1)

def double_up(text):                 # string -> string: 'ab' -> 'aabb'
    if text == '':
        return ''
    return text[0] * 2 + double_up(text[1:])

def total(nums):                     # list -> number
    if nums == []:
        return 0
    return nums[0] + total(nums[1:])

def evens(nums):                     # list -> new list
    if nums == []:
        return []
    if nums[0] % 2 == 0:
        return [nums[0]] + evens(nums[1:])
    return evens(nums[1:])
\`\`\`

Pick the base value to match the operation: \`0\` for adding, \`1\` for multiplying, \`''\` for joining strings, \`[]\` for building a list.

**Nested lists (any depth)**

\`\`\`python
def total(data):
    if len(data) == 0:                        # works for [] and ()
        return 0
    first = data[0]
    if isinstance(first, (list, tuple)):      # go deeper
        here = total(first)
    else:
        here = first
    return here + total(data[1:])

total([4, [1, [6]], [], 2])                   # 13
\`\`\`

- \`isinstance(x, list)\` is True for lists; \`isinstance(x, (list, tuple))\` accepts either. \`type(x) == list\` also works for plain lists.
- To collect items into a list, wrap a single item: \`[first] + collect(data[1:])\`. Adding a list to a tuple raises TypeError, so build lists.
- Do not \`pop\` or \`remove\` from the list you were given. Slicing makes a new list and leaves the original alone.

**The call stack**

\`\`\`python
def letters_back(word):
    if word == '':
        return
    letters_back(word[1:])     # goes all the way down first
    print(word[0])             # runs on the way back up

letters_back('ecu')            # prints u, c, e on separate lines
\`\`\`

- Each call has its **own** local variables. \`word\` is \`'ecu'\` in the first call and \`'u'\` in the third, at the same time.
- Code before the recursive call runs as the calls go down. Code after it runs as they return, deepest call first.
- A trace of the returns: \`sum_to(3)\` waits for \`sum_to(2)\`, which waits for \`sum_to(1)\`, which waits for \`sum_to(0)\` = 0. Then 1 + 0 = 1, 2 + 1 = 3, 3 + 3 = 6.

**RecursionError: maximum recursion depth exceeded**

The calls never reached a base case. Check:

1. Is there a base case at all, and is it checked **before** the recursive call?
2. Does every input reach it? \`if n == 1\` is skipped when \`n // 10\` jumps from 3 to 0. \`if len(text) == 1\` is skipped for \`''\`. Use \`n < 10\`, \`len(text) <= 1\`, \`text == ''\`.
3. Is the argument really smaller? \`n % 10\` keeps a digit instead of removing it, and \`text[:]\` is the same length.

**Loop to recursion**

\`\`\`python
def total_loop(nums):
    result = 0                 # starting value  -> the base case's return value
    for x in nums:             # one item per pass -> nums[0] now, nums[1:] in the call
        result += x            # combine          -> nums[0] + total(nums[1:])
    return result

def total(nums):
    if nums == []:
        return 0
    return nums[0] + total(nums[1:])
\`\`\`

For digits, \`while n > 0: ... n = n // 10\` becomes \`return n % 10 + f(n // 10)\` with a base case for a single digit.

**Exam rules (CITS1401 final)**

- Every recent final has a recursion question that says *recursion must be used, looping is not allowed*. A \`for\`, a \`while\` or a comprehension (\`[x for x in ...]\`) anywhere in the answer breaks that rule, and an answer that uses one can score zero even if it works.
- Helper functions are fine, and each helper must also be loop-free.
- \`sum()\`, \`max()\`, \`[::-1]\` or \`reversed()\` may do the work for you but miss the point of the question; if the question asks for recursion, write it yourself.
- No \`import\`. Sketch the calls for a small input before writing.

**Gotchas the night before**

- \`return f(n - 1)\`, not just \`f(n - 1)\`.
- \`n / 10\` gives a float and the digits come out wrong; use \`n // 10\`.
- Negative numbers: \`-365 // 10\` is \`-37\` and \`-365 % 10\` is \`5\`, so deal with the sign first (\`if n < 0: return f(-n)\`).
- \`print\` inside the function is not a return value; the auto-marker checks what is returned.
- A tuple slice is a tuple: \`(1, 2, 3)[1:]\` is \`(2, 3)\`, and \`() == []\` is \`False\`. Use \`len(data) == 0\` when either can arrive.`;

export const workedExample: Topic['workedExample'] = {
  title: 'Perth Scorchers scorecard: counting ducks without loops',
  code: `def count_ducks(scores):
    """Return how many scores in the nested list are exactly 0 (a duck).
    Looping is not allowed."""
    # Step 2: base case - an empty list has no ducks
    if scores == []:
        return 0

    # Step 3: deal with the first item only
    first = scores[0]
    if isinstance(first, list):
        first_ducks = count_ducks(first)     # a sub-list: recurse into it
    elif first == 0:
        first_ducks = 1
    else:
        first_ducks = 0

    # Step 4: let recursion handle the rest, combine, and RETURN
    return first_ducks + count_ducks(scores[1:])


innings = [12, [0, 45], [[0], 7], []]
print(count_ducks(innings))   # 2`,
  steps: [
    '**Understand the input and output.** A Scorchers scorecard is a list of batters\' scores, but some entries are lists of scores for a partnership, nested to any depth, and some lists are empty. `count_ducks` returns an int: how many scores are exactly 0. Work the example by hand first: the ducks in `[12, [0, 45], [[0], 7], []]` are the 0 inside `[0, 45]` and the 0 inside `[[0], 7]`, so the answer is 2.',
    '**Write the base case first.** What is the smallest scorecard you can answer without thinking? An empty list, which has 0 ducks. Check it on its own: `count_ducks([])` must return `0`, not `None`. Every call eventually gets here, because each call passes on a shorter list.',
    '**Handle only the first item.** Take `first = scores[0]`. There are three cases: it is itself a list (so count the ducks inside it with a recursive call), it is 0 (one duck), or it is any other score (no ducks). The list case needs its own check: a list such as `[0, 45]` is never equal to 0, so without `isinstance(first, list)` it would count as "no ducks" and the ducks inside it would be missed.',
    '**Let recursion do the rest, then return.** `scores[1:]` is the scorecard without its first item, so it is one shorter and heads towards `[]`. Add the ducks found in `first` to the ducks in the rest, and `return` that sum. Writing `count_ducks(scores[1:])` on a line by itself would work it out and throw it away.',
    '**Trace a small case and check the rules.** `count_ducks([0, [0]])` returns 1 + `count_ducks([[0]])`, which returns `count_ducks([0])` + `count_ducks([])` = 1 + 0 = 1, so the total is 2. Test the edge cases: `[]` gives 0, `[[[]]]` gives 0, and the list passed in is never changed because slicing makes a new list. There is no `for`, `while` or comprehension anywhere, so the answer meets the exam rule.',
  ],
};

export const commonMistakes: Topic['commonMistakes'] = [
  {
    mistake: 'recursion_result_ignored',
    bad: `def total(nums):
    if nums == []:
        return 0
    nums[0] + total(nums[1:])`,
    good: `def total(nums):
    if nums == []:
        return 0
    return nums[0] + total(nums[1:])`,
    note: 'The recursive call works out the answer for the rest of the list, but without `return` that answer is thrown away and the call gives back `None`. One level up, `nums[0] + None` then raises TypeError.',
  },
  {
    mistake: 'missing_base_case',
    bad: `def step_total(n):
    """Return n + (n - 2) + (n - 4) + ... for the terms above 0."""
    if n == 1:
        return 1
    return n + step_total(n - 2)`,
    good: `def step_total(n):
    """Return n + (n - 2) + (n - 4) + ... for the terms above 0."""
    if n <= 0:
        return 0
    return n + step_total(n - 2)`,
    note: 'A base case that only matches one exact value can be jumped over. `step_total(6)` goes 6, 4, 2, 0, -2 ... and never equals 1, so Python raises RecursionError. Make the base case cover every smallest input (`n <= 0`, `n < 10`, `len(text) <= 1`).',
  },
  {
    mistake: 'loop_in_recursion',
    bad: `def count_char(text, ch):
    count = 0
    for letter in text:
        if letter == ch:
            count += 1
    return count`,
    good: `def count_char(text, ch):
    if text == '':
        return 0
    if text[0] == ch:
        return 1 + count_char(text[1:], ch)
    return count_char(text[1:], ch)`,
    note: 'When the question says looping is not allowed, a working loop still scores zero. The repetition has to come from the function calling itself on a smaller piece.',
  },
  {
    mistake: 'index_out_of_range',
    bad: `def every_second(text):
    if len(text) == 1:
        return text
    return text[0] + every_second(text[2:])`,
    good: `def every_second(text):
    if len(text) <= 1:
        return text
    return text[0] + every_second(text[2:])`,
    note: 'Even-length text shrinks to the empty string: `\'abcd\'`, `\'cd\'`, `\'\'`. With `== 1` the empty string skips the base case and `text[0]` raises IndexError. Catch the empty case before indexing.',
  },
  {
    mistake: 'print_vs_return',
    bad: `def digit_product(n):
    if n < 10:
        print(n)
    else:
        print(n % 10 * digit_product(n // 10))`,
    good: `def digit_product(n):
    if n < 10:
        return n
    return n % 10 * digit_product(n // 10)`,
    note: 'Printing shows a number but gives `None` back to the call above, so `n % 10 * None` crashes. Each call must `return` its answer so the call that is waiting can use it.',
  },
  {
    mistake: 'mutated_input',
    bad: `def total(nums):
    if nums == []:
        return 0
    first = nums.pop(0)
    return first + total(nums)`,
    good: `def total(nums):
    if nums == []:
        return 0
    return nums[0] + total(nums[1:])`,
    note: '`pop` removes items from the caller\'s list, so after `total(scores)` the list `scores` is empty. `nums[1:]` makes a new, shorter list and leaves the original alone.',
  },
];
