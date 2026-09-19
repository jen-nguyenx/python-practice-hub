// Core: recursion. What a recursive call really does, and what stops it.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-recursion',
  title: 'Recursion',
  summary: 'A function that calls itself, the base case that stops it, and what the answer is built from',
  track: 'core',
  topicId: 'recursion',
  minutes: 24,
  prereqs: ['core-scope-and-main'],
  outcomes: [
    'Say what happens when a function calls itself, and why each call has its own variables',
    'Write a base case that every input reaches',
    'Combine the result of a recursive call with the part this call handled',
    'Make an input smaller with slices, and with remainder and integer division',
    'Say when recursion is a better fit than a loop, and when it is not',
    'Diagnose a RecursionError in one of three places',
  ],
  sections: [
    {
      id: 'a-call-is-a-call',
      title: 'A call is a call',
      blocks: [
        {
          kind: 'prose',
          body: 'Recursion has a reputation for being hard, and almost all of it comes from trying to picture the whole thing at once. You do not have to. There is no special rule to learn: a function calling itself is an ordinary function call, and an ordinary function call starts a **new** call with its own copy of everything.\n\nThe name being the same is a coincidence as far as Python is concerned. What matters is that the new call is given a **smaller** problem than the one that made it.',
        },
        {
          kind: 'code',
          caption: 'The function reports what it was given before it does anything else.',
          code: `def countdown(n):
    print('  a call begins, with n =', n)
    if n == 0:
        return 'lift off'
    return countdown(n - 1)


print(countdown(3))
`,
        },
        {
          kind: 'prose',
          body: 'Four calls happened there, each one holding a different `n` at the same moment. The first call has not finished: it is waiting, part-way through its last line, for the answer to `countdown(2)`. When the innermost call finally returns something, that value is handed back out through every call that was waiting.\n\nSo every recursive function has three parts, and it is worth naming them before you write one:\n\n- a **base case**: the smallest input you can answer with no further call;\n- a **recursive case**: a call on a smaller input;\n- a **combination**: what this call does with the value that comes back, and `return`s.',
        },
      ],
    },
    {
      id: 'base-case',
      title: 'The base case is the only brake',
      blocks: [
        {
          kind: 'prose',
          body: 'Nothing in Python notices that a function is calling itself, and nothing stops it. The calls stop because one of them finally matches the base case and returns without calling again. That is the whole braking system, so write the base case first.',
        },
        {
          kind: 'code',
          caption: 'A sum with no base case at all. This one stops for a different reason.',
          code: `def count_down(n):
    return n + count_down(n - 1)


print(count_down(5))
`,
        },
        {
          kind: 'prose',
          body: '`RecursionError` is not a mysterious failure. It is Python noticing that the calls have stacked up past a safe depth and stopping before it runs out of memory, and it always means one of three things:\n\n1. there is no base case, as above;\n2. there is one, but this input steps straight past it;\n3. the argument is not actually getting smaller.\n\nThe second is the sneaky one, because the code works for the input you tested with and fails for the next one.',
        },
        { kind: 'experiment', id: 't13-x1' },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Write `<=`, not `==`',
          body: 'A base case that tests one exact value can be jumped over. Prefer `if n <= 0:` to `if n == 0:`, and `if len(text) <= 1:` to `if len(text) == 1:`. It costs nothing when the input lands exactly, and it saves you when the input steps past.',
        },
        { kind: 'mistakes', only: ['missing_base_case'] },
      ],
    },
    {
      id: 'down-and-up',
      title: 'Down, then back up',
      blocks: [
        {
          kind: 'prose',
          body: 'A recursive function runs in two halves that are easy to confuse. Everything **above** the recursive call runs on the way down, as the problem gets smaller. Everything **below** it is left waiting, and runs on the way back up, innermost call first.',
        },
        {
          kind: 'code',
          caption: 'The same line printed before the call and after it.',
          code: `def show(word):
    if word == '':
        return
    print('down:', word)
    show(word[1:])
    print('up:  ', word)


show('PERTH')
`,
        },
        {
          kind: 'prose',
          body: 'Read the output as a V. The `down` lines go from the longest word to the shortest; then the base case returns; then the `up` lines come back out in the opposite order, and each one is holding the word that its own call was given — frozen exactly where it was left.\n\nThat is why each call having its own variables matters. Five calls are alive at once, each with a different `word`, and none of them can see any of the others.',
        },
        { kind: 'experiment', id: 't13-x3' },
        {
          kind: 'checkpoint',
          prompt: 'Nothing in that function reverses anything, and yet the `up` lines came out in the opposite order to the `down` lines. Where did the reversing come from?',
          answer: 'From the order in which the waiting calls resume. Every line below the recursive call is left waiting until the call it made comes back, and the innermost call is the first one that can come back. So the `down` lines run outermost first and the `up` lines run innermost first. Change that `print` to show only `word[0]` — the experiment below lets you — and the same mechanism spells the word backwards, one letter per waiting call.',
        },
      ],
    },
    {
      id: 'combining',
      title: 'What you do with the answer',
      blocks: [
        {
          kind: 'prose',
          body: 'The hardest habit to build is trusting the recursive call. When you write `total(nums[1:])`, do not try to follow it: assume it returns the correct total of the rest of the list, and ask one question — *what do I do to that to include my own item?*\n\nFor adding, you add yours. For multiplying, you multiply. For building text you join, and for building a list you put yours in a list and add. The base case has to return a value that fits the same operation: `0` for adding, `1` for multiplying, `\'\'` for joining, `[]` for building a list.',
        },
        {
          kind: 'code',
          caption: 'The same shape four times, with the operation and the base value changed to match.',
          code: `def total(nums):
    if nums == []:
        return 0
    return nums[0] + total(nums[1:])


def product(nums):
    if nums == []:
        return 1
    return nums[0] * product(nums[1:])


def shout(text):
    if text == '':
        return ''
    return text[0].upper() + shout(text[1:])


def evens(nums):
    if nums == []:
        return []
    if nums[0] % 2 == 0:
        return [nums[0]] + evens(nums[1:])
    return evens(nums[1:])


print(total([4, 5, 9]))
print(product([4, 5, 9]))
print(shout('perth'))
print(evens([4, 5, 9, 12]))
`,
        },
        {
          kind: 'prose',
          body: 'One word in every one of those functions is doing more work than it looks: `return`. The recursive call works out the answer for the rest of the problem, and without `return` that answer is calculated and thrown away — and the call hands back `None` instead, which the call above it then tries to add to a number.',
        },
        { kind: 'experiment', id: 't13-x2' },
        { kind: 'mistakes', only: ['recursion_result_ignored', 'print_vs_return'] },
      ],
    },
    {
      id: 'making-it-smaller',
      title: 'Making the input smaller',
      blocks: [
        {
          kind: 'prose',
          body: 'Every recursive call needs a strictly smaller argument, and there are only a few ways you will ever need to make one. Slicing takes a piece off a string, a list or a tuple; `%` and `//` take a digit off a number.\n\nThe difference between the two matters: a **slice** never fails, and an **index** does.',
        },
        {
          kind: 'shell',
          caption: 'Two ways to shrink an input, and the one line that raises.',
          lines: [
            "text = 'PERTH'",
            'text[0]',
            'text[1:]',
            "'H'[1:]",
            "''[1:]",
            "''[0]",
            'n = 4096',
            'n % 10',
            'n // 10',
            'n / 10',
          ],
        },
        {
          kind: 'prose',
          body: 'Two lines there decide how your base case has to be written. Slicing an empty string gives an empty string back rather than raising, so the calls will happily keep going; indexing an empty string raises, so the base case must catch the empty case **before** any indexing happens.\n\nThe last line is the digit trap. Dividing with `/` gives a float, so the digits after it come out as nonsense. Use `//` to keep a whole number.',
        },
        {
          kind: 'code',
          caption: 'Adding up the digits of a number, one digit per call.',
          code: `def digit_sum(n):
    if n < 10:
        return n
    return n % 10 + digit_sum(n // 10)


print(digit_sum(4096))
print(digit_sum(7))
`,
        },
        {
          kind: 'prose',
          body: 'The base case is `n < 10` rather than `n == 0`, so it catches every single-digit number including the one you started with. That is the same `<=` habit from earlier, wearing different clothes.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Do not edit the list you were given',
          body: 'It is tempting to write `first = nums.pop(0)` and recurse on `nums`. It works once, and it empties the caller\'s list while doing it, so the second call with the same list gives a different answer. `nums[1:]` makes a new, shorter list and leaves the original alone.',
        },
        { kind: 'mistakes', only: ['index_out_of_range', 'mutated_input'] },
      ],
    },
    {
      id: 'loop-or-recursion',
      title: 'When recursion is the right tool',
      blocks: [
        {
          kind: 'prose',
          body: 'Recursion and loops are not rivals. Anything a `for` loop does over a flat list, recursion can do, and the loop is usually easier to read and always cheaper to run. Every recursive call costs memory that a loop does not, and Python has a hard limit on how deep they can go.',
        },
        {
          kind: 'compare',
          caption: 'The same total, over two thousand numbers.',
          left: {
            label: 'A loop',
            code: `nums = list(range(2000))

total = 0
for x in nums:
    total = total + x
print(total)
`,
          },
          right: {
            label: 'The same job by recursion',
            code: `nums = list(range(2000))


def total(items):
    if items == []:
        return 0
    return items[0] + total(items[1:])


print(total(nums))
`,
          },
        },
        {
          kind: 'prose',
          body: 'One number per call, two thousand numbers, and the calls run out of room long before the data does. Nothing is wrong with that recursive function: it is the right code for the wrong job.\n\nDepth is not the only way a recursive function can cost more than the loop it replaced. A function that makes **more than one** recursive call per call can need far more calls than its input is big, and no depth limit warns you about it, because the calls never stack very deep at all.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'branching-calls',
            title: 'One call becomes two',
            intro: 'This counts every call made while working out the nth Fibonacci number the naive way, with no memory of what it has already computed. Drag **n** and watch how fast the count climbs.',
            template: 'def fib_calls(k):\n    if k <= 1:\n        return 1\n    return fib_calls(k - 1) + fib_calls(k - 2) + 1\n\nn = ⟦n⟧\nprint("calls made for n =", n, ":", fib_calls(n))\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'n', min: 1, max: 18, start: 8 },
            ],
            probes: {
              growth: '[[k, fib_calls(k)] for k in range(0, ⟦n⟧ + 1)]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'n',
              yLabel: 'calls made',
              caption: 'Calls needed for each size up to the one you picked, so you can watch the curve extend as you drag.',
              series: [{ probe: 'growth', label: 'calls made' }],
            },
            notes: {
              '0': 'At n = 1 there is exactly one call: the base case, answering straight away.',
              '7': 'By n = 8 the curve has barely lifted off the axis. This is the range where a slow function still feels fast, which is exactly what makes it easy to ship.',
              '17': 'At n = 18 the line has shot upward while the input only grew one at a time. Every call here still does almost nothing on its own — one comparison, one addition — the cost is entirely in how many of them there are.',
            },
            takeaway: 'A recursive function that makes two calls to move one step forward does not cost "one call per item": each call spawns two more before it reaches a base case, so the number of calls compounds the way the Fibonacci numbers themselves do. Depth stayed small the whole time — this function never got close to a `RecursionError` — the cost showed up as sheer call count instead. Counting how many recursive calls a function makes per call is as important as checking that it has a base case at all.',
          },
        },
        {
          kind: 'code',
          caption: 'A total over a list that contains lists, nested as deep as it likes.',
          code: `def total(data):
    if len(data) == 0:
        return 0
    first = data[0]
    if isinstance(first, (list, tuple)):
        here = total(first)
    else:
        here = first
    return here + total(data[1:])


print(total([4, [1, [6, [2]]], [], 5]))
print(total([]))
print(total([[[]]]))
`,
        },
        {
          kind: 'prose',
          body: 'There are two recursive calls in that function and they do different jobs: one goes **into** a nested list, the other moves **along** to the rest of the current one. Writing that with a loop means keeping your own stack of unfinished lists, which is the work the calls are already doing for you.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Recursion means no loops at all',
          body: 'Every recent final paper has a question that says recursion must be used and looping is not allowed. A `for`, a `while` or a list comprehension anywhere in the answer breaks that rule, and a working answer that uses one can score zero. Helper functions are fine, and each helper must be loop-free too.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your recursive function works on `[1, 2, 3]` and raises `RecursionError` on a list of a thousand items. Is the base case wrong?',
          answer: 'Probably not. A base case that is genuinely missed usually fails on the small input too. A function that is correct on three items and dies on a thousand is hitting the depth limit, which is a sign that the problem is flat and a loop is the better tool — unless the question forbids loops, in which case the input it will be tested on is small by design.',
        },
        { kind: 'mistakes', only: ['loop_in_recursion'] },
      ],
    },
    {
      id: 'all-together',
      title: 'All of it at once',
      blocks: [
        {
          kind: 'prose',
          body: 'The worked example below has every piece in it: a base case written first, one call that goes deeper into a nested list, one that moves along to the rest, and a `return` that combines the two. Before you read the code, try saying out loud what its base case should be.',
        },
        { kind: 'workedExample' },
        {
          kind: 'prose',
          body: 'One last habit, and it is the one that makes recursion feel easy rather than clever: **trace the smallest case on paper before you run anything.** Two items is usually enough. If you can write down what each call receives and what it hands back, the code almost writes itself, and if you cannot, no amount of running it will help.',
        },
        {
          kind: 'practice',
          body: 'The questions for this topic move from numbers to strings to nested lists. For each one, write the base case on its own line first and check it answers correctly on the smallest possible input, before writing the recursive call.',
        },
      ],
    },
  ],
};

export default lesson;
