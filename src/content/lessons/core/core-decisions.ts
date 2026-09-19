// Core lesson for topic 02: if, elif, else and Boolean logic.
// Nothing here states what Python does. Every value a reader sees comes from the verifier running the block.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-decisions',
  title: 'Making decisions',
  summary: 'Comparisons, and or not, and why an elif chain is not a run of ifs',
  track: 'core',
  minutes: 20,
  topicId: 'if-elif-else',
  prereqs: ['core-variables-expressions'],
  outcomes: [
    'Read a comparison as a value that is True or False',
    'Choose between an elif chain and separate ifs, and say what breaks if you pick wrong',
    'Join conditions with and, or and not without falling into the "or with a literal" trap',
    'Test a cutoff at the three values that can expose an off-by-one',
    'Return a condition directly instead of returning True or False',
  ],
  sections: [
    {
      id: 'a-comparison-is-a-value',
      title: 'A comparison is a value',
      blocks: [
        {
          kind: 'prose',
          body: 'A condition is not a special kind of sentence that only lives inside an `if`. It is an ordinary expression, like `3 + 4`, and what it produces is one of two values. Once you see that, `if` stops being mysterious: it runs its body when the expression it was given comes out as true.\n\nBecause a comparison is a value, you can store it, print it, hand it to a function and return it. You will do all four of those in this unit.',
        },
        {
          kind: 'shell',
          caption: 'The six comparison operators are `<`, `<=`, `>`, `>=`, `==` and `!=`.',
          lines: [
            'mark = 72',
            'mark >= 50',
            'type(mark >= 50)',
            'mark == 72',
            'mark != 72',
            "'Perth' == 'perth'",
            "'12' > '8'",
            'passed = mark >= 50',
            'passed',
          ],
        },
        {
          kind: 'prose',
          body: 'Two lines in that session deserve a second look.\n\nThe `\'Perth\' == \'perth\'` line is why text comparisons need care: a capital letter is a different character, so matching user input usually means calling `.lower()` on it first.\n\nThe `\'12\' > \'8\'` line is worse, because it produces an answer rather than an error. Text is compared character by character, in the order characters come, so comparing two numbers that are still text gives you an answer about spelling, not about size. Anything from `input()` or a file is text until you convert it.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'One = stores, two == compare',
          body: 'A single `=` inside an `if` is a `SyntaxError`, which is the good case: Python stops rather than doing something odd. Read `==` out loud as "is equal to" and `=` as "gets".',
        },
      ],
    },
    {
      id: 'the-shape-of-an-if',
      title: 'The shape of a decision',
      blocks: [
        {
          kind: 'prose',
          body: 'An `if` has three parts that must all be right: the condition, the colon at the end of the line, and the indented body underneath. Python uses the indentation to decide what belongs to the decision and what runs regardless, so the spaces are part of the meaning, not decoration.\n\n`elif` is one word. Python has no `else if`. And `else` has no condition, because it means "anything that got this far".',
        },
        {
          kind: 'code',
          caption: 'A grade chain. Python tests from the top and runs the first branch that is true.',
          code: `mark = 85
if mark >= 80:
    grade = 'HD'
elif mark >= 70:
    grade = 'D'
elif mark >= 50:
    grade = 'P'
else:
    grade = 'N'
print(mark, grade)
`,
        },
        {
          kind: 'prose',
          body: 'Notice that the second branch is written as `mark >= 70`, not `70 <= mark < 80`. It does not need the upper limit. Anything that reaches an `elif` has already failed every test above it, so each branch can rely on the ones before it — as long as you put the most demanding test first. Ordering the chain the other way round, with 50 at the top, would send every passing mark to the same branch.',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'Write the boundaries down first',
          body: 'Before coding a chain like this, list the cutoff numbers from the question: 50, 70, 80. They are the branch conditions, and they are also the values to test at the end.',
        },
      ],
    },
    {
      id: 'elif-versus-ifs',
      title: 'elif is not a run of ifs',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the single most expensive mistake in the topic, because both versions look reasonable and both run without complaint. The difference only shows up when a value makes two conditions true at once.',
        },
        {
          kind: 'predict',
          ask: 'A mark of 85 passes every one of these three tests. Predict what this prints before you check.',
          code: `mark = 85
grade = ''
if mark >= 80:
    grade = 'HD'
if mark >= 70:
    grade = 'D'
if mark >= 50:
    grade = 'P'
print(grade)
`,
        },
        {
          kind: 'compare',
          caption: 'The same mark, the same three cutoffs, one word different.',
          left: {
            label: 'Three separate decisions',
            bad: true,
            code: `mark = 85
if mark >= 80:
    grade = 'HD'
if mark >= 70:
    grade = 'D'
if mark >= 50:
    grade = 'P'
print(grade)
`,
          },
          right: {
            label: 'One decision with three answers',
            code: `mark = 85
if mark >= 80:
    grade = 'HD'
elif mark >= 70:
    grade = 'D'
elif mark >= 50:
    grade = 'P'
print(grade)
`,
          },
        },
        {
          kind: 'prose',
          body: 'On the left, all three conditions are true for a mark of 85, so all three bodies run and the last assignment is the one that survives. The grade ends up being decided by whichever branch happens to be written last, which is not a rule anybody intended.\n\nSo the question to ask of any set of branches is: **should exactly one of these happen, or can several apply at once?** Exactly one means `elif`. Several can apply means separate `if`s, and then each one really is its own decision.',
        },
        {
          kind: 'experiment',
          id: 't02-x2',
        },
        {
          kind: 'checkpoint',
          prompt: 'A weather program should print "Heat warning" at 35 degrees and above, and "Extreme heat" at 40 and above, and on a 41 degree day it should print both. Chain or separate ifs?',
          answer: 'Separate `if`s, because both messages are wanted on the same day — two independent decisions, each asked in full. If the spec had said "print the most serious warning that applies", that is exactly one outcome, so it would be an `elif` chain with the 40 test first. The wording of the question tells you which shape to write.',
        },
      ],
    },
    {
      id: 'and-or-not',
      title: 'Joining conditions',
      blocks: [
        {
          kind: 'prose',
          body: 'Read `and` as "both" and `or` as "either". They agree with each other whenever the two conditions agree, and only split apart when exactly one of them is true, which is why a test that tries "both true" and "both false" cannot tell you which word you wrote.',
        },
        {
          kind: 'experiment',
          id: 't02-x1',
        },
        {
          kind: 'prose',
          body: 'There is one trap here that catches almost every beginner, and it does not raise an error. Each side of an `and` or an `or` has to be a **complete condition**. Writing the variable once and then listing the values you want reads perfectly in English and means something else entirely in Python.',
        },
        {
          kind: 'shell',
          caption: 'The third line is the trap. Compare it with the second and the sixth.',
          lines: [
            "day = 'Mon'",
            "day == 'Sat' or day == 'Sun'",
            "day == 'Sat' or 'Sun'",
            "bool('Sun')",
            "bool('')",
            "day in ('Sat', 'Sun')",
            'True and False',
            'False or True',
            "not day == 'Mon'",
            'True or False and False',
            '(True or False) and False',
          ],
        },
        {
          kind: 'prose',
          body: 'The third line does not produce a yes-or-no answer at all. Python reads it as "either `day == \'Sat\'`, or the text `\'Sun\'`", and a non-empty piece of text counts as true, as the `bool` lines show. So the whole condition is true on a Monday, on a Tuesday, and on every other day. The fix is to repeat the variable, or to use `in` with a tuple of values, which is shorter and reads better.\n\nThe last two lines are about precedence: `and` binds more tightly than `or`, so a condition that mixes them is not read left to right. Put brackets in whenever both words appear.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A zone fare applies when `zones` is 1 or 2. Why does `if zones == 1 or 2:` give everybody that fare, and what are the two correct ways to write it?',
          answer: 'Because it means `(zones == 1) or 2`, and `2` on its own is truthy, so the whole condition is true whatever `zones` holds. Write `zones == 1 or zones == 2`, repeating the variable, or `zones in (1, 2)`. The second reads closest to the way the rule is worded in the question, and it does not get longer when a third zone is added.',
        },
      ],
    },
    {
      id: 'boundaries',
      title: 'Exactly on the line',
      blocks: [
        {
          kind: 'prose',
          body: 'Nearly every condition in the unit has a cutoff in it, and nearly every wrong condition is wrong by exactly one value. `>` and `>=` behave identically on every number except the cutoff itself, so if the only value you try is well clear of the line, your test cannot fail.',
        },
        {
          kind: 'experiment',
          id: 't02-x3',
        },
        {
          kind: 'steps',
          title: 'Testing a cutoff',
          items: [
            'Take the cutoff number straight from the words of the question.',
            'Try the value **just below** it, the value **exactly on** it, and the value **just above** it.',
            'Read the spec again and decide which side the "exactly on" case belongs to. "At least", "or more" and "and over" include it; "more than" and "above" do not.',
            'Match the operator to the wording: "120 cm or taller" is `>= 120`, not `> 119`, even though the two let the same people through.',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A theme park ride requires riders to be 120 cm or taller. Which condition matches that rule exactly?',
          options: [
            { text: 'height >= 120', correct: true, why: '"120 cm or taller" includes exactly 120, and `>=` is the only one of these that lets a rider at exactly 120 on.' },
            { text: 'height > 120', why: 'This turns away a rider at exactly 120 cm, and the rule says 120 counts.' },
            { text: 'height > 119', why: 'This happens to let the same whole-centimetre riders through, but it does not match the wording of the rule, and it breaks the moment height is measured with a decimal.' },
            { text: 'height >= 121', why: 'This is one centimetre too strict: a rider at exactly 120 should be let in, and this condition turns them away.' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'inside-or-outside',
            title: 'A range and its opposite',
            intro: 'Drag n and watch `1 <= n <= 9` against `n < 1 or n > 9`. The dots show every whole number the range test lets through.',
            template: 'n = ⟦n⟧\ninside = 1 <= n <= 9\noutside = n < 1 or n > 9\nprint("1 <= n <= 9   :", inside)\nprint("n < 1 or n > 9:", outside)\n',
            knobs: [
              { id: 'n', kind: 'range', label: 'the number tested', min: -5, max: 15, start: 5 },
            ],
            probes: {
              'inside-nums': '[k for k in range(-5, 16) if 1 <= k <= 9]',
              'n-now': '⟦n⟧',
            },
            visual: {
              kind: 'numberline',
              min: -5,
              max: 15,
              picked: 'inside-nums',
              at: 'n-now',
              caption: 'Every whole number from -5 to 15. The lit ones satisfy 1 <= n <= 9; the ringed one is the number you are testing.',
            },
            notes: {
              '6': 'n = 1 is the low end of the chain, and `<=` on both sides means the ends count. `inside` is True here, and `outside`, its exact opposite, is False.',
              '5': 'One step below the range, at n = 0: `inside` flips to False and `outside` flips to True. The two are always opposites, so knowing one tells you the other for free.',
              '14': 'n = 9 is the other boundary. `<=` includes it too, so `inside` is True right up to and including 9.',
              '15': 'One step past the top, at n = 10: `inside` is False and `outside` is True, the mirror image of n = 0.',
            },
            takeaway: 'A chained comparison `1 <= n <= 9` is `1 <= n and n <= 9` in one line: every whole number from 1 to 9 counts, both ends included. Its opposite is not `n < 1 and n > 9` — nothing satisfies that at all — it is `n < 1 or n > 9`. Negating a range flips `and` into `or` at the same time as it flips each `<=` around.',
          },
        },
      ],
    },
    {
      id: 'return-the-condition',
      title: 'Return the answer, not True',
      blocks: [
        {
          kind: 'prose',
          body: 'Once you have seen that a comparison is already a value, a whole shape of code becomes unnecessary. A function that tests something does not need an `if` at all: the condition **is** the answer.',
        },
        {
          kind: 'code',
          caption: 'The long way. It is correct, and it is six lines doing one line of work.',
          code: `def is_pass(mark):
    if mark >= 50:
        return True
    else:
        return False


print(is_pass(50), is_pass(49))
`,
        },
        {
          kind: 'code',
          caption: 'The same function. Check the output against the block above.',
          code: `def is_pass(mark):
    """Return True when the mark is a pass."""
    return mark >= 50


print(is_pass(50), is_pass(49))
`,
        },
        {
          kind: 'prose',
          body: 'The other half of the same habit is how you *use* a value that is already true or false. Comparing it to `True` is not only noise, it can change the answer, because `if x:` asks whether `x` counts as true while `x == True` asks whether `x` is that exact value.',
        },
        {
          kind: 'compare',
          caption: 'A name that is present. One of these agrees with what the code was trying to ask.',
          left: {
            label: 'Compared to True',
            bad: true,
            code: `name = 'Mei'
if name == True:
    print('we have a name')
else:
    print('no name given')
`,
          },
          right: {
            label: 'Tested directly',
            code: `name = 'Mei'
if name:
    print('we have a name')
else:
    print('no name given')
`,
          },
        },
        {
          kind: 'prose',
          body: 'Write `if is_member:` and `if not is_member:`. Keep `is` for `None` alone — `if result is None:` — and use `==` for every comparison of values.',
        },
      ],
    },
    {
      id: 'worked-example',
      title: 'A full decision, start to finish',
      blocks: [
        {
          kind: 'prose',
          body: 'The worked example below puts the whole lesson into one function: a guard for invalid input first, then a chain ordered so each branch can rely on the ones above it, a branch joined with `or`, and a final `else` that needs no condition. Follow the steps before the code.',
        },
        {
          kind: 'workedExample',
        },
      ],
    },
    {
      id: 'traps',
      title: 'Traps and practice',
      blocks: [
        {
          kind: 'prose',
          body: 'Four of these five run without any error at all and give a wrong answer, which is what makes them expensive.',
        },
        {
          kind: 'mistakes',
          only: ['elif_vs_if', 'or_with_literal', 'assign_vs_compare', 'compare_to_true', 'input_without_int'],
        },
        {
          kind: 'practice',
          body: 'Go and write some. The tracing and prediction questions are worth doing first: they are the fastest way to find out whether your mental model of a chain matches Python.',
        },
      ],
    },
  ],
};

export default lesson;
