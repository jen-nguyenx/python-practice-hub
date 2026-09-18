// Scenario t02-s6: a Perth Airport bag drop (writing a range condition three ways, filling in the
// conditions of an elif chain, and finding the one weight that exposes a boundary bug).
import type { Scenario } from '../../schema.ts';

const md = (...lines: string[]): string => lines.join('\n');

const CHECK_TEMPLATE = `def baggage_check(weight, is_member):
    """Return the kiosk's decision for one bag."""
    if weight <= 0:
        return 'invalid'
    elif ⟦1⟧:
        return 'ok'
    elif ⟦2⟧:
        return 'free upgrade'
    elif weight <= 32:
        return 'excess fee'
    else:
        return 'too heavy'`;

const CHECK_SOLUTION = `def baggage_check(weight, is_member):
    """Return the kiosk's decision for one bag."""
    if weight <= 0:
        return 'invalid'
    elif weight <= 23:
        return 'ok'
    elif weight <= 32 and is_member:
        return 'free upgrade'
    elif weight <= 32:
        return 'excess fee'
    else:
        return 'too heavy'`;

const FEE_REFERENCE = `def excess_fee(weight):
    if weight <= 23:
        return 0.0
    elif weight <= 32:
        return 65.0
    else:
        return -1.0`;

const FEE_BUGGY = `def excess_fee(weight):
    if weight < 23:
        return 0.0
    elif weight <= 32:
        return 65.0
    else:
        return -1.0`;

const scenario: Scenario = {
  id: 't02-s6',
  title: 'Perth Airport bag drop',
  story:
    'The bag drop kiosks at Perth Airport weigh each bag and decide what happens to it: onto the belt, an excess baggage fee, ' +
    'or back to the counter. Every rule in the kiosk is a comparison, and every one of them has a boundary that has to be exactly right.',
  questions: [
    {
      id: 't02-s6-q1',
      format: 'multi',
      diff: 'medium',
      core: false,
      title: 'Bags the belt will take',
      prompt:
        'The belt only takes a bag that weighs **2 kg or more and 32 kg or less**. `weight` is the weight in kg as a float.\n\n' +
        'Select **every** condition that is `True` for exactly those bags and `False` for every other bag.',
      concepts: ['comparison', 'chained-comparison', 'boolean', 'not'],
      detects: ['or_with_literal', 'syntax_other'],
      expectedSec: 160,
      options: [
        {
          id: 'a',
          text: '2 <= weight <= 32',
          correct: true,
          why: 'A chained comparison is shorthand for `2 <= weight and weight <= 32`. Both boundaries use `<=`, so 2 and 32 are both accepted.',
        },
        {
          id: 'b',
          text: 'weight >= 2 and weight <= 32',
          correct: true,
          why: 'The same test written out in full. Each side of `and` is a complete comparison with `weight` written again.',
        },
        {
          id: 'c',
          text: 'weight >= 2 or 32',
          correct: false,
          mistake: 'or_with_literal',
          why:
            'Python reads this as `(weight >= 2) or 32`. The number 32 on its own counts as true, so the whole condition is `True` for every bag, ' +
            'including a 40 kg one. It has to be `weight >= 2 and weight <= 32`.',
        },
        {
          id: 'd',
          text: 'not (weight < 2 or weight > 32)',
          correct: true,
          why:
            'This says "it is not the case that the bag is too light or too heavy", which is the same set of bags. ' +
            'The brackets matter: `not` binds tighter than `or`, so without them only the first comparison would be flipped.',
        },
        {
          id: 'e',
          text: '2 <= weight and <= 32',
          correct: false,
          mistake: 'syntax_other',
          why: 'This is a SyntaxError: `<= 32` has nothing on its left. Each side of `and` must be a complete comparison, so the `weight` has to be repeated.',
        },
      ],
      hints: [
        'Try each condition with four weights: 1, 2, 32 and 40. The right ones give False, True, True, False.',
        'Check three things in each option: does it run at all, does each side of `and` or `or` name `weight`, and does it include both boundary weights?',
        'Two of the correct options are the same test written in different ways; the third describes the bags the belt refuses and then flips the answer with `not`.',
      ],
      solution: {
        explanation: md(
          'Three conditions are correct: `2 <= weight <= 32`, `weight >= 2 and weight <= 32`, and `not (weight < 2 or weight > 32)`.',
          '',
          '- `2 <= weight <= 32` chains two comparisons, which Python joins with `and` for you.',
          '- `weight >= 2 and weight <= 32` is the long form of the same test.',
          '- `not (weight < 2 or weight > 32)` flips the rule for the bags that are rejected. Rejecting needs `or` (too light **or** too heavy); accepting needs `and`. Swapping those two words is the usual slip.',
          '- `weight >= 2 or 32` always gives `True`, because `32` on its own is truthy. This is the single most common condition bug in first-year code.',
          '- `2 <= weight and <= 32` never runs: `and` joins two conditions, not a condition and half of one.',
          '',
          'A quick way to check any of these in the exam is to write the boundary values down (1, 2, 32, 40) and evaluate the condition for each.',
        ),
      },
      selfExplain: 'Which weights does not (weight < 2 or weight > 32) treat differently if you drop the brackets?',
    },
    {
      id: 't02-s6-q2',
      format: 'cloze',
      diff: 'medium',
      core: true,
      title: 'Fill in the kiosk decision',
      prompt: md(
        'Complete `baggage_check(weight, is_member)` so it **returns** one of five strings. `weight` is the weight in kg (an int or a float) and `is_member` is `True` or `False`.',
        '',
        "- `'invalid'` for a weight of 0 or less",
        "- `'ok'` for a bag up to and including 23 kg",
        "- `'excess fee'` for a bag over 23 kg and up to and including 32 kg",
        "- `'free upgrade'` instead of the fee when the passenger is a member",
        "- `'too heavy'` for anything over 32 kg, member or not",
        '',
        'Fill in the two conditions. The chain stops at the first true branch, so each condition only has to rule out what the branches above it have not already handled.',
      ),
      concepts: ['elif', 'boundary', 'boolean', 'branch-order'],
      detects: ['elif_vs_if', 'off_by_one_range', 'compare_to_true'],
      expectedSec: 240,
      fnName: 'baggage_check',
      template: CHECK_TEMPLATE,
      blanks: [
        { id: '1', accept: ['weight <= 23', '23 >= weight'] },
        { id: '2', accept: ['weight <= 32 and is_member', 'is_member and weight <= 32'] },
      ],
      tests: [
        { id: 'v1', call: 'baggage_check(18.5, False)', expect: "'ok'", label: 'an 18.5 kg bag', hidden: false },
        { id: 'v2', call: 'baggage_check(27.0, False)', expect: "'excess fee'", label: '27 kg, not a member', hidden: false },
        { id: 'v3', call: 'baggage_check(27.0, True)', expect: "'free upgrade'", label: '27 kg, member', hidden: false },
        { id: 'h1', call: 'baggage_check(23, False)', expect: "'ok'", label: 'exactly 23 kg', hidden: true, tag: 'off_by_one_range' },
        { id: 'h2', call: 'baggage_check(23.5, False)', expect: "'excess fee'", label: 'just over 23 kg', hidden: true, tag: 'off_by_one_range' },
        { id: 'h3', call: 'baggage_check(32, True)', expect: "'free upgrade'", label: 'exactly 32 kg, member', hidden: true },
        { id: 'h4', call: 'baggage_check(35.0, True)', expect: "'too heavy'", label: 'a member with a 35 kg bag', hidden: true, tag: 'elif_vs_if' },
        { id: 'h5', call: 'baggage_check(0, False)', expect: "'invalid'", label: 'a weight of zero', hidden: true },
        { id: 'h6', call: 'baggage_check(-2.5, True)', expect: "'invalid'", label: 'a negative weight', hidden: true },
      ],
      hints: [
        'Gap 1 is one comparison. Gap 2 needs two things to be true at once, and one of them is already a True/False value.',
        md(
          'Plan:',
          '',
          '1. Gap 1 separates the bags that go straight onto the belt from the rest. The spec says "up to and including 23 kg", so decide between `<` and `<=`.',
          '2. Gap 2 is reached only by bags over 23 kg. It must still keep out the ones over 32 kg, and it must only apply to members.',
          '3. `is_member` is already `True` or `False`, so test it on its own rather than with `== True`.',
        ),
        'Gap 2 has the form `weight <= ... and ...`. Leaving out the weight half sends a member with a 35 kg bag to the upgrade branch.',
      ],
      solution: {
        code: CHECK_SOLUTION,
        explanation: md(
          '- Gap 1 is `weight <= 23`. "Up to and including 23 kg" means the boundary belongs in this branch, so it needs `<=`, not `<`. With `<`, a bag of exactly 23 kg would fall through and be charged a fee.',
          '- Gap 2 is `weight <= 32 and is_member`. Both halves are needed: the branch is only for members, and it must not swallow bags over 32 kg.',
          '- `is_member` is written on its own. `is_member == True` gives the same answer but says the same thing twice.',
          '- The order of the last three branches does the rest of the work. `elif weight <= 32` is only reached by a non-member over 23 kg, so it needs no `and not is_member`, and the final `else` is everything over 32 kg.',
          '',
          'Gap 2 is the one to watch: writing just `is_member` passes all three visible tests and still gives a member with a 35 kg bag a free upgrade.',
        ),
      },
      selfExplain: 'Why does the excess fee branch not need to check is_member at all?',
    },
    {
      id: 't02-s6-q3',
      format: 'testWriter',
      diff: 'hard',
      core: true,
      title: 'Break the excess fee',
      prompt:
        'Two versions of `excess_fee` were written for the kiosk. One follows the spec and one has a single wrong comparison. ' +
        'Enter an argument tuple that makes the two versions give different answers. You cannot see the code, only the spec.',
      concepts: ['boundary', 'edge-cases', 'comparison', 'testing'],
      detects: ['off_by_one_range'],
      expectedSec: 390,
      fnName: 'excess_fee',
      spec: md(
        '`excess_fee(weight)` takes a bag weight in kg (an int or a float) and returns the excess baggage fee in dollars as a float.',
        '',
        '- `0.0` for a bag of 23 kg **or less**',
        '- `65.0` for a bag over 23 kg and up to and including 32 kg',
        '- `-1.0` for a bag over 32 kg, which cannot be checked in at all',
      ),
      reference: FEE_REFERENCE,
      buggy: FEE_BUGGY,
      bugMistake: 'off_by_one_range',
      argsExample: '(18.5,)',
      hints: [
        'Both versions handle an ordinary bag the same way. A single wrong comparison only shows up at one exact weight.',
        md(
          'Plan:',
          '',
          '1. Write down every number that appears in the spec: 23 and 32.',
          '2. For each one, list the three weights worth testing: just below it, exactly it, and just above it.',
          '3. Weights in the middle of a band (18.5, 27, 40) can never expose a wrong `<` or `>`, so try the exact boundaries first.',
        ),
        'Try the boundary in the first bullet. The spec says 23 kg itself is free, so ask both versions about a bag of exactly that weight.',
      ],
      solution: {
        code: '(23,)',
        explanation: md(
          '`(23,)` exposes the bug. The spec says a bag of 23 kg **or less** is free, so the correct version returns `0.0`. ' +
          'The buggy version tests `weight < 23`, which is `False` for exactly 23, so the bag falls through to the next branch and is charged `65.0`.',
          '',
          '`(23.0,)` breaks it in the same way.',
          '',
          'Everything else agrees. `(18.5,)` is below 23 in both versions, `(27,)` and `(32,)` are in the fee band in both, and `(40,)` is over the limit in both. ' +
          'A bug like this survives any amount of testing with "normal" values, which is why the boundary numbers in a spec are the first tests to write.',
        ),
      },
      selfExplain: 'Which weights would you test to be sure the 32 kg boundary is also right?',
    },
  ],
};

export default scenario;
