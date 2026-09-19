// Advanced: why tests exist, what assert is for, and a first look at unittest.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'testing-your-code',
  title: 'Testing your code',
  summary: 'Turning "it looked right" into something the computer checks for you every time',
  track: 'advanced',
  order: 15,
  minutes: 26,
  outcomes: [
    'Say what a test buys you that reading the code does not',
    'Write checks with `assert`, including the message that explains a failure',
    'Write the failing test first, then the fix',
    'List the edge cases worth trying on almost any function',
    'Read and write a small `unittest.TestCase`',
  ],
  sections: [
    {
      id: 'why',
      title: 'Why bother',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is a median function. Read it, decide whether it is correct, and only then check.',
        },
        {
          kind: 'predict',
          ask: 'Which of these four calls prints a wrong answer?',
          code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nprint(median([3, 1, 2]))\nprint(median([10]))\nprint(median([5, 1, 9, 3, 7]))\nprint(median([4, 1, 2, 3]))\n",
          choices: ['2\n10\n5\n2', '2\n10\n5\n2.5', '2\n10\n5\n3', '2\n10\n7\n2.5'],
        },
        {
          kind: 'prose',
          body: 'With an even number of values there is no single middle item, so the median is the mean of the two in the middle — this function picks the upper of them and moves on without complaint. That is the shape of the bugs tests are for: not a crash, but a plausible number, produced confidently, that nobody notices until the marks are published.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Tests are for the second change, not the first',
          body: 'The real payment comes later. Every time you change this function — to handle text, to ignore missing values, to go faster — the tests you wrote today re-check everything it used to get right.',
        },
      ],
    },
    {
      id: 'assert',
      title: '`assert`: a claim the program checks',
      blocks: [
        {
          kind: 'prose',
          body: '`assert something` does nothing at all when `something` is true, and raises when it is false. An optional message after a comma explains what was expected.',
        },
        {
          kind: 'code',
          caption: 'The first three claims hold. The fourth is the bug from the last section.',
          code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nassert median([3, 1, 2]) == 2\nassert median([10]) == 10\nassert median([5, 1, 9, 3, 7]) == 5\nprint('the first three claims passed')\nassert median([4, 1, 2, 3]) == 2.5, 'even-length median is the mean of the middle two'\n",
        },
        {
          kind: 'quiz',
          prompt: '`assert (value == 1, "message")` is written to check that `value` is 1. What actually happens?',
          code: "value = 2\nassert (value == 1, 'value should be 1')\nprint('reached the end')\n",
          options: [
            {
              text: 'It never fails, whatever value holds, because it asserts a non-empty tuple',
              correct: true,
              why: 'The parentheses make a two-item tuple, `(False, "value should be 1")` here, and a non-empty tuple is always truthy — so the assertion passes no matter what `value` is, and the check is silently doing nothing.',
            },
            { text: 'It raises AssertionError with the message, exactly as intended', why: 'It does not raise here: `value` is 2, but the assertion still passes, because what is being tested for truth is the tuple itself, not the comparison inside it.' },
            { text: 'It raises a SyntaxError, because assert cannot take a tuple', why: 'This is valid syntax — assert followed by any expression, including a tuple — so it runs without complaint, which is exactly the danger.' },
            { text: 'It prints the message directly without raising', why: 'Nothing is printed by the assert line itself; the message is only ever shown if the assertion fails, and this one never does.' },
          ],
        },
        {
          kind: 'prose',
          body: 'Python warns about this, and the warning is easy to miss. One more limit: assertions can be switched off in optimised mode, so they are for checking **your own assumptions about your own code**, not for validating what a user typed. For those, check the value and `raise` a real error.',
        },
      ],
    },
    {
      id: 'test-first',
      title: 'Write the failing test first',
      blocks: [
        {
          kind: 'prose',
          body: 'The temptation on finding a bug is to fix it immediately. Resist it for sixty seconds, for one reason: **a test you have never seen fail is not evidence of anything**. Plenty of tests pass because they do not actually reach the code they claim to check.',
        },
        {
          kind: 'order',
          ask: 'Arrange, act, assert: drag these lines into an order that tests `median` correctly.',
          lines: [
            { text: 'def median(values):', indent: 0 },
            { text: 'return sorted(values)[len(values) // 2]', indent: 1 },
            { text: 'values = [5, 1, 9, 3, 7]', indent: 0 },
            { text: 'result = median(values)', indent: 0 },
            { text: 'assert result == 5', indent: 0 },
          ],
        },
        {
          kind: 'compare',
          caption: 'Step two and step four, side by side: the same checks against the broken function and the fixed one.',
          left: {
            label: 'Before the fix: the new check fails',
            bad: true,
            code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\ndef check(label, got, want):\n    print('ok  ' if got == want else 'FAIL', label, '| got', repr(got), 'want', repr(want))\n\ncheck('odd length', median([3, 1, 2]), 2)\ncheck('even length', median([4, 1, 2, 3]), 2.5)\n",
          },
          right: {
            label: 'After the fix: both pass',
            code: "def median(values):\n    ordered = sorted(values)\n    middle = len(ordered) // 2\n    if len(ordered) % 2 == 1:\n        return ordered[middle]\n    return (ordered[middle - 1] + ordered[middle]) / 2\n\ndef check(label, got, want):\n    print('ok  ' if got == want else 'FAIL', label, '| got', repr(got), 'want', repr(want))\n\ncheck('odd length', median([3, 1, 2]), 2)\ncheck('even length', median([4, 1, 2, 3]), 2.5)\n",
          },
        },
        {
          kind: 'checkpoint',
          prompt: 'A colleague fixes a bug and adds a test, and it passes. They say there was no need to see it fail first because the fix is obviously right. Give two ways their test could be passing for the wrong reason.',
          answer: 'First, the test might not reach the code at all: a typo in the function name inside a `try`, a test method whose name does not start with `test_` so the runner skips it, or a check written as `assert (got == want, "msg")`. Second, the expected value might have been copied from what the code now returns rather than from what is correct — the commonest way a test suite ends up certifying a bug. Watching it fail first rules out both, because a test that fails before the fix and passes after it has demonstrated it is connected to the thing it claims to check.',
        },
      ],
    },
    {
      id: 'edge-cases',
      title: 'The cases worth trying every time',
      blocks: [
        {
          kind: 'prose',
          body: 'Most bugs are not in the middle of the range. They are at the ends, where an `if` gets its comparison one notch out, or where a loop has nothing to loop over.',
        },
        {
          kind: 'table',
          caption: 'Run down this list for any function you write.',
          head: ['Case', 'Why it breaks things', 'Example input'],
          rows: [
            ['Empty', 'Loops do not run; `max` and division by a length both fail', '[], "", {}'],
            ['One item', 'Anything that compares neighbours has no neighbour', '[7]'],
            ['Duplicates', 'Counting, sets, "find the position of"', '[3, 3, 3]'],
            ['Boundaries of a condition', 'Off-by-one: is it `>` or `>=`?', 'Exactly 50 when the rule says "50 or more"'],
            ['Zero and negatives', 'Truthiness, absolute values, sums', '0, -1'],
            ['The unexpected type', 'Text where a number was assumed', "'50' instead of 50"],
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'find-the-boundary-bug',
            title: 'Drag across the boundary',
            intro: 'A `grade` function is meant to pass any mark of 50 or more. Drag the mark being tested and watch where "should pass" and "actually passed" stop agreeing.',
            template: "def grade(mark):\n    if mark >= 80:\n        return 'HD'\n    if mark >= 70:\n        return 'D'\n    if mark >= 60:\n        return 'CR'\n    if mark > 50:\n        return 'P'\n    return 'N'\n\nmark = ⟦mark⟧\nresult = grade(mark)\nprint(mark, '->', result)\nprint('should pass:', mark >= 50, '  actually passed:', result != 'N')\n",
            knobs: [
              { id: 'mark', kind: 'range', label: 'the mark to test', min: 45, max: 55, start: 50 },
            ],
            probes: {
              passing: "[m for m in range(45, 56) if grade(m) != 'N']",
              'mark-now': '⟦mark⟧',
            },
            visual: {
              kind: 'numberline',
              min: 45,
              max: 55,
              picked: 'passing',
              at: 'mark-now',
              caption: 'Every mark from 45 to 55 that this `grade` actually treats as a pass. The ringed one is the mark you are testing.',
            },
            notes: {
              '0': 'At 45, both lines agree: it should not pass, and it does not.',
              '5': 'At exactly 50, "should pass" says true — the spec is "50 or more" — but `grade` says `N`. The line reads `mark > 50`, not `mark >= 50`, so the boundary value itself is the one mark this function gets wrong.',
              '10': 'At 55 both lines agree again. The gap in the lit numbers sits at exactly one point: 50.',
            },
            takeaway: 'The bug is invisible from either side of it — 49 and 51 both behave exactly as expected — and only shows up by testing the boundary value itself. Testing 65 and 75 would have found nothing; testing the exact edges finds it on the first run.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'You are testing `top_n(scores, n)`, which returns the n highest scores. Which test below is checking the case a hasty test suite is most likely to miss?',
          options: [
            {
              text: '`top_n([5, 5, 5], 2)` should return two fives, not silently collapse the duplicates to one',
              correct: true,
              why: 'An implementation built on a set, or one that deduplicates before selecting, passes every test with distinct scores and only fails once duplicates are tried — exactly the case people forget to write.',
            },
            { text: '`top_n([9, 3, 7], 2)` should return the two highest of three distinct scores', why: 'This is the ordinary case with no duplicates and no boundary — the case a first, quick test is very likely to already cover.' },
            { text: '`top_n([9, 3, 7], 1)` should return only the single highest score', why: 'Also a straightforward middle case: one clean value of n, no ties, nothing at an edge.' },
            { text: '`top_n([9, 3, 7], 3)` should return all three scores in order', why: 'n equal to the list length is a reasonable case to think of, but it is far more commonly remembered than what happens when the scores themselves repeat.' },
          ],
        },
        {
          kind: 'prose',
          body: 'The empty case is the other one people forget: `average([])` raises `ZeroDivisionError` unless it is handled, and the interesting question is not how to stop it raising but **what the right answer is** — zero, `None`, or a raised error with your own message. All three are defensible; a test is where you write the decision down.',
        },
      ],
    },
    {
      id: 'unittest',
      title: '`unittest`, when the checks outgrow prints',
      blocks: [
        {
          kind: 'prose',
          body: 'Hand-rolled `check` functions stop being enough once there are thirty of them: you want them named, grouped and reported on. `unittest` is in the standard library and does all of that. The shape is a class inheriting from `unittest.TestCase`, with one method per case, each starting with `test_`.',
        },
        {
          kind: 'code',
          caption: 'Four tests against the broken median. The runner reports rather than stopping.',
          code: "import unittest\n\ndef median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nclass TestMedian(unittest.TestCase):\n    def test_odd_length(self):\n        self.assertEqual(median([3, 1, 2]), 2)\n\n    def test_even_length(self):\n        self.assertEqual(median([4, 1, 2, 3]), 2.5)\n\n    def test_single_item(self):\n        self.assertEqual(median([7]), 7)\n\n    def test_empty_raises(self):\n        with self.assertRaises(IndexError):\n            median([])\n\nresult = unittest.TestResult()\nunittest.TestLoader().loadTestsFromTestCase(TestMedian).run(result)\nprint('tests run:', result.testsRun)\nprint('failures:', len(result.failures), 'errors:', len(result.errors))\nfor test, report in result.failures:\n    print(test.id().split('.')[-1], '->', report.strip().splitlines()[-1])\n",
        },
        {
          kind: 'prose',
          body: 'Three passed and one failed, and the run kept going to the end — the main practical difference from a file of bare `assert`s. `assertEqual` is used most; also worth knowing are `assertTrue`, `assertIn`, `assertAlmostEqual` for floats, and `assertRaises` as a `with` block for "this input should be refused".',
        },
        {
          kind: 'annotate',
          ask: 'Click a line to see what each part of a unittest case is doing.',
          code: "import unittest\n\nclass TestMedian(unittest.TestCase):\n    def test_even_length(self):\n        self.assertEqual(median([4, 1, 2, 3]), 2.5)\n\n    def test_empty_refused(self):\n        with self.assertRaises(ValueError):\n            median([])\n",
          notes: {
            '3': 'The method name must start with `test_`, or the runner skips it silently — a common way a "passing" suite is quietly testing less than you think.',
            '4': '`assertEqual` compares two values and reports both of them on failure, unlike a bare `assert`, which only shows the failed expression.',
            '7': 'A `with self.assertRaises(...)` block passes only if the code inside it raises that exact exception type; if nothing is raised, the test fails.',
          },
        },
      ],
    },
    {
      id: 'good-tests',
      title: 'What makes a test worth having',
      blocks: [
        {
          kind: 'steps',
          title: 'Rules of thumb',
          items: [
            'One behaviour per test, named after the behaviour: `test_even_length`, not `test_2`.',
            'Expected values written from the specification, never copied from what the code printed.',
            'No cleverness in the test: a test with a loop and an `if` in it is code that itself needs testing.',
            'Test what the function promises, not how it does it — otherwise every refactor breaks the tests.',
            'Do not test the language. `assert sorted([2, 1]) == [1, 2]` checks Python, not you.',
            'When you fix a bug, add the test that would have caught it, before you fix it.',
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Your marking program has 40 passing tests and produces a report that is subtly wrong for one unit. Give two reasons a full green run can coexist with a wrong answer.',
          answer: 'One: every test may check the pieces in isolation while the bug lives in how they are joined — each function is right, but the order they run in, or the data handed between them, is not, which only an end-to-end test over realistic input catches. Two: the tests may encode the same misunderstanding as the code, because the same person wrote both from the same reading of the specification — a test copied from the code\'s own output is the extreme version of this. A green run means "none of the things I imagined are broken", which is not the same as "the code is correct"; the gap is exactly the cases nobody thought of.',
        },
      ],
    },
  ],
};

export default lesson;
