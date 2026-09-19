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
          body: 'Here is a median function. Read it, decide whether it is correct, and only then run your eye over the output below it.',
        },
        {
          kind: 'code',
          caption: 'Four calls. One of the answers is wrong.',
          code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nprint(median([3, 1, 2]))\nprint(median([10]))\nprint(median([5, 1, 9, 3, 7]))\nprint(median([4, 1, 2, 3]))\n",
        },
        {
          kind: 'prose',
          body: 'The last one is the wrong one. With an even number of values there is no single middle item, so the median is the mean of the two in the middle — and this function picks the upper of them and moves on without complaint.\n\nThat is the shape of the bugs tests are for. It is not a crash. It is a plausible number, produced confidently, that nobody notices until the marks are published. Reading the code did not catch it; the code reads perfectly well. What catches it is writing down what the answer should be and letting the computer compare.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Tests are for the second change, not the first',
          body: 'The real payment comes later. Every time you change this function — to handle text, to ignore missing values, to go faster — the tests you wrote today re-check everything it used to get right. Without them, each change is a fresh gamble on code you no longer remember.',
        },
      ],
    },
    {
      id: 'assert',
      title: '`assert`: a claim the program checks',
      blocks: [
        {
          kind: 'prose',
          body: '`assert something` does nothing at all when `something` is true, and raises when it is false. That is the whole feature. An optional message after a comma explains what was expected.',
        },
        {
          kind: 'code',
          caption: 'The first three claims hold. The fourth is the bug from the last section.',
          code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nassert median([3, 1, 2]) == 2\nassert median([10]) == 10\nassert median([5, 1, 9, 3, 7]) == 5\nprint('the first three claims passed')\nassert median([4, 1, 2, 3]) == 2.5, 'even-length median is the mean of the middle two'\nprint('this line is never reached')\n",
        },
        {
          kind: 'prose',
          body: 'Notice how much the failure tells you: the type, the line, and the sentence you wrote about what should have been true. A bare `assert x == y` with no message is worth writing anyway, but the message is what you will want at 11pm three weeks from now.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Never put brackets around an assert',
          body: '`assert (value == 1, "message")` looks like a function call and is not one. It asserts a two-item tuple, and a non-empty tuple is always true, so the check silently never fails. Python warns about this, and the warning is easy to miss.',
        },
        {
          kind: 'code',
          caption: 'The bracketed version, checking nothing at all.',
          code: "value = 2\nassert (value == 1, 'value should be 1')\nprint('the assert above passed, and it checked nothing')\nprint(bool((False, 'value should be 1')))\nassert value == 1, 'value should be 1'\n",
        },
        {
          kind: 'prose',
          body: 'The same file shows both: the bracketed form waved a false claim through, and the correct form two lines later stopped the program.\n\nOne more limit worth knowing. Assertions can be switched off when Python is run in optimised mode, so they are for checking **your own assumptions about your own code**, not for validating what a user typed or what a file contained. For those, check the value and `raise` a real error.',
        },
      ],
    },
    {
      id: 'test-first',
      title: 'Write the failing test first',
      blocks: [
        {
          kind: 'prose',
          body: 'The temptation on finding a bug is to fix it immediately. Resist it for sixty seconds and write the test first, for one reason: **a test you have never seen fail is not evidence of anything**. Plenty of tests pass because they do not actually reach the code they claim to check.',
        },
        {
          kind: 'steps',
          title: 'The loop',
          items: [
            'Write a check that states what the right answer is for the case that is broken.',
            'Run it and watch it fail. If it passes, your check is wrong, not the code.',
            'Fix the code, changing as little as possible.',
            'Run every check again, not just the new one — the fix may have broken something that worked.',
            'Keep the check. It is now a permanent guard against that bug coming back.',
          ],
        },
        {
          kind: 'compare',
          caption: 'Step two and step four, side by side: the same checks against the broken function and the fixed one.',
          left: {
            label: 'Before the fix: the new check fails',
            bad: true,
            code: "def median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\ndef check(label, got, want):\n    print('ok  ' if got == want else 'FAIL', label, '| got', repr(got), 'want', repr(want))\n\ncheck('odd length', median([3, 1, 2]), 2)\ncheck('single item', median([10]), 10)\ncheck('even length', median([4, 1, 2, 3]), 2.5)\n",
          },
          right: {
            label: 'After the fix: all three pass',
            code: "def median(values):\n    ordered = sorted(values)\n    middle = len(ordered) // 2\n    if len(ordered) % 2 == 1:\n        return ordered[middle]\n    return (ordered[middle - 1] + ordered[middle]) / 2\n\ndef check(label, got, want):\n    print('ok  ' if got == want else 'FAIL', label, '| got', repr(got), 'want', repr(want))\n\ncheck('odd length', median([3, 1, 2]), 2)\ncheck('single item', median([10]), 10)\ncheck('even length', median([4, 1, 2, 3]), 2.5)\n",
          },
        },
        {
          kind: 'prose',
          body: 'That six-line `check` function is worth having. Unlike `assert`, it does not stop at the first failure, so one run tells you about every broken case instead of the first one — which matters when a change breaks three things and you only learn about them one run at a time.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A colleague fixes a bug and adds a test. The test passes. You ask whether they saw it fail first, and they say there was no need because the fix is obviously right. Give two concrete ways their test could be passing for the wrong reason.',
          answer: 'First, the test might not reach the code at all: a typo in the function name inside a `try`, a test method whose name does not start with `test_` so the runner skips it, a check written as `assert (got == want, "msg")`, or a case whose input does not actually exercise the branch they changed. Second, the expected value might have been copied from what the code returns rather than from what is correct — the commonest way a test suite ends up certifying a bug. Watching it fail first rules out both, because a test that fails before the fix and passes after it has demonstrated that it is connected to the thing it claims to check.',
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
            ['Two items', 'The smallest input where order matters', '[2, 1]'],
            ['Even against odd length', 'Middles, pairing up, halving', '[1, 2] against [1, 2, 3]'],
            ['Duplicates', 'Counting, sets, "find the position of"', '[3, 3, 3]'],
            ['All identical, or already sorted', 'Hides bugs, and reveals others', '[5, 5, 5]'],
            ['Boundaries of a condition', 'Off-by-one: is it `>` or `>=`?', 'Exactly 50 when the rule says "50 or more"'],
            ['Zero and negatives', 'Truthiness, absolute values, sums', '0, -1'],
            ['The unexpected type', 'Text where a number was assumed', "'50' instead of 50"],
          ],
        },
        {
          kind: 'code',
          caption: 'A grading function tried at each boundary. One of them is off by one.',
          code: "def grade(mark):\n    if mark >= 80:\n        return 'HD'\n    if mark >= 70:\n        return 'D'\n    if mark >= 60:\n        return 'CR'\n    if mark > 50:\n        return 'P'\n    return 'N'\n\ndef check(label, got, want):\n    print('ok  ' if got == want else 'FAIL', label, '| got', repr(got), 'want', repr(want))\n\ncheck('80 is HD', grade(80), 'HD')\ncheck('79 is D', grade(79), 'D')\ncheck('70 is D', grade(70), 'D')\ncheck('60 is CR', grade(60), 'CR')\ncheck('50 is P', grade(50), 'P')\ncheck('49 is N', grade(49), 'N')\ncheck('0 is N', grade(0), 'N')\n",
        },
        {
          kind: 'prose',
          body: 'Every mark in the middle of every band is handled correctly, and one of the boundaries is not. Testing `65` and `75` would have found nothing; testing the exact edges found it on the first run.\n\nThe habit worth taking from this: for every condition in your code, test the value **at** the threshold, not just values either side of it.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'find-the-boundary-bug',
            title: 'Drag across the boundary',
            intro: 'This is the same `grade` function, with the same bug. Drag the mark being tested and watch where "should pass" and "actually passed" stop agreeing.',
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
            takeaway: 'The bug is invisible from either side of it — 49 and 51 both behave exactly as expected — and only shows up by testing the boundary value itself. That is the whole argument for the edge-case habit: an off-by-one error occupies exactly one input, and a test suite that never tries that input will never find it.',
          },
        },
        {
          kind: 'code',
          caption: 'The empty case, which is the one people forget.',
          code: "def average(values):\n    return sum(values) / len(values)\n\nprint(average([2, 4]))\nprint(average([]))\n",
        },
        {
          kind: 'prose',
          body: 'This raises, and the interesting question is not how to stop it raising but **what the right answer is**. Zero? `None`? A raised error with a message of your own? All three are defensible, and the decision belongs to whoever is calling. A test is where you write that decision down.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are testing a function `top_n(scores, n)` that returns the n highest scores. Name four cases from the table above that apply to it, and for each say what the right answer is — including one where you would have to go and ask.',
          answer: 'Empty scores: `top_n([], 3)` should give an empty list, not raise. One item with n larger than the list: `top_n([5], 3)` — returning everything is the sensible answer, though "fewer than n available" could also be an error, and this is the one to go and ask about, because callers will build on whichever you choose. Duplicates: `top_n([5, 5, 5], 2)` must not silently collapse them, which it will if the implementation uses a set. Boundary on n: `n` of 0 should give an empty list, and a negative `n` is a decision — refuse it, or treat it as zero. A fifth worth adding: ties at the cut-off, where a well-behaved function is at least consistent about which of the tied scores it keeps.',
        },
      ],
    },
    {
      id: 'unittest',
      title: '`unittest`, when the checks outgrow prints',
      blocks: [
        {
          kind: 'prose',
          body: 'Hand-rolled `check` functions stop being enough once there are thirty of them: you want them named, grouped, run individually, and reported on. `unittest` is in the standard library and does all of that.\n\nThe shape is a class inheriting from `unittest.TestCase`, with one method per case, each starting with `test_`.',
        },
        {
          kind: 'code',
          caption: 'Four tests against the broken median. The runner reports rather than stopping.',
          code: "import unittest\n\ndef median(values):\n    ordered = sorted(values)\n    return ordered[len(ordered) // 2]\n\nclass TestMedian(unittest.TestCase):\n    def test_odd_length(self):\n        self.assertEqual(median([3, 1, 2]), 2)\n\n    def test_even_length(self):\n        self.assertEqual(median([4, 1, 2, 3]), 2.5)\n\n    def test_single_item(self):\n        self.assertEqual(median([7]), 7)\n\n    def test_empty_raises(self):\n        with self.assertRaises(IndexError):\n            median([])\n\nresult = unittest.TestResult()\nunittest.TestLoader().loadTestsFromTestCase(TestMedian).run(result)\nprint('tests run:', result.testsRun)\nprint('failures:', len(result.failures), 'errors:', len(result.errors))\nfor test, report in result.failures:\n    print(test.id().split('.')[-1], '->', report.strip().splitlines()[-1])\n",
        },
        {
          kind: 'prose',
          body: 'Three passed and one failed, and the run kept going to the end — which is the main practical difference from a file of bare `assert`s. The report names the method, so you know which case broke without reading any code.\n\n`assertEqual` is the one you will use most. The others worth knowing are `assertTrue`, `assertIn`, `assertAlmostEqual` for floats, and `assertRaises` as a `with` block for "this input should be refused".',
        },
        {
          kind: 'code',
          caption: 'The same four tests against the fixed function.',
          code: "import unittest\n\ndef median(values):\n    if not values:\n        raise ValueError('median of no values')\n    ordered = sorted(values)\n    middle = len(ordered) // 2\n    if len(ordered) % 2 == 1:\n        return ordered[middle]\n    return (ordered[middle - 1] + ordered[middle]) / 2\n\nclass TestMedian(unittest.TestCase):\n    def test_odd_length(self):\n        self.assertEqual(median([3, 1, 2]), 2)\n\n    def test_even_length(self):\n        self.assertEqual(median([4, 1, 2, 3]), 2.5)\n\n    def test_single_item(self):\n        self.assertEqual(median([7]), 7)\n\n    def test_empty_refused(self):\n        with self.assertRaises(ValueError):\n            median([])\n\nresult = unittest.TestResult()\nunittest.TestLoader().loadTestsFromTestCase(TestMedian).run(result)\nprint('tests run:', result.testsRun)\nprint('failures:', len(result.failures), 'errors:', len(result.errors))\nprint('all passed' if result.wasSuccessful() else 'something is broken')\n",
        },
        {
          kind: 'prose',
          body: 'The fix changed the empty case from raising `IndexError` — an accident of the implementation — to raising `ValueError` with a sentence in it, and the test changed with it. That is a normal thing for a test to record: not only what the function returns, but how it refuses.\n\nIn a real project the file would end with `if __name__ == "__main__": unittest.main()`, and running that file would print the same report. Here the runner is driven by hand so that the output can be shown.',
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
          kind: 'prose',
          body: 'A last point about what tests cannot do. Every test you write is a case you thought of, so a green test run means "none of the things I imagined are broken", which is genuinely valuable and is not the same as "the code is correct". The gap is exactly the cases you did not think of, which is why the edge-case list earns its place: it is a way of thinking of cases that are not about this function in particular.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your marking program has 40 passing tests and produces a report that is subtly wrong for one unit. Give two reasons a full green run can coexist with a wrong answer, and say what you would add first.',
          answer: 'One: every test may be testing the pieces in isolation while the bug lives in how they are joined — each function is right, and the order they run in, or the data handed between them, is not. That is what an end-to-end test over a small realistic input catches, and unit tests by construction cannot. Two: the tests may encode the same misunderstanding as the code, because the same person wrote both from the same reading of the specification; a test copied from the code\'s output is the extreme version of this. What to add first is a test with real data for that one unit, with the expected report worked out by hand from the specification rather than from the program — and if working it out by hand is hard, that difficulty is itself the finding.',
        },
      ],
    },
  ],
};

export default lesson;
