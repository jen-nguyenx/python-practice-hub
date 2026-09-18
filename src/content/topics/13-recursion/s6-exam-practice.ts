import type { Scenario } from '../../schema.ts';

const scenario: Scenario = {
  id: 't13-s6',
  title: 'Closed-book practice',
  story:
    'Three questions in the shape of the final paper: a written spec, no Run button and one submit. The paper says outright that recursion must be used ' +
    'and looping is not allowed, so each one comes down to a base case, a call on something smaller, and a return that joins the two.',
  questions: [
    {
      id: 't13-s6-q1',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 10,
      examSlot: 'recursion-simple',
      diff: 'hard',
      core: true,
      title: 'Ways up Jacob\'s Ladder (exam style)',
      prompt:
        '*Exam style, 10 marks. Write it by hand first, then submit once.*\n\n' +
        'Runners climbing Jacob\'s Ladder at the foot of Kings Park take the steps either one at a time or two at a time.\n\n' +
        'Write a function `climb_ways(steps)` that returns, as an **int**, how many different ways a flight of `steps` steps can be climbed using strides of 1 step and 2 steps. ' +
        'Two climbs count as different when the strides come in a different order, so 1 then 2 is not the same climb as 2 then 1.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions).\n\n' +
        '- `steps` is an int, 0 or more.\n' +
        '- `climb_ways(0)` returns 1: taking no strides at all is the one way to climb no steps.\n' +
        '- `climb_ways(1)` returns 1.\n\n' +
        'Example: `climb_ways(4)` returns 5, because four steps can be climbed as 1+1+1+1, 1+1+2, 1+2+1, 2+1+1 or 2+2.',
      fnName: 'climb_ways',
      starter: `def climb_ways(steps):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: 'climb_ways(4)', expect: '5', label: 'the example', hidden: false },
        { id: 'v2', call: 'climb_ways(2)', expect: '2', label: 'two steps', hidden: false },
        { id: 'h1', call: 'climb_ways(0)', expect: '1', label: 'no steps at all', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: 'climb_ways(1)', expect: '1', label: 'a single step', hidden: true, tag: 'missing_base_case' },
        { id: 'h3', call: 'climb_ways(3)', expect: '3', label: 'three steps', hidden: true },
        { id: 'h4', call: 'climb_ways(10)', expect: '89', label: 'a short flight', hidden: true },
        { id: 'h5', call: 'climb_ways(18)', expect: '4181', label: 'a long flight', hidden: true },
      ],
      concepts: ['base-case', 'recursive-case', 'counting', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'loop_in_recursion', 'off_by_one_range', 'print_vs_return'],
      expectedSec: 480,
      hints: [
        'Think about the first stride only. There are two choices for it, and after either one there is a smaller flight left. Who can count the ways up that smaller flight?',
        'Plan: a climb either starts with a 1-step stride, leaving `steps - 1` to climb, or with a 2-step stride, leaving `steps - 2`. No climb is in both groups, so the answer is the number of ways for each, added together. ' +
          'Then decide which flights are so small that you can give the answer without any stride at all.',
        'The recursive case is `return climb_ways(steps - 1) + climb_ways(steps - 2)`. The base case has to answer 0 **and** 1, because the second call subtracts 2.',
      ],
      solution: {
        code: `def climb_ways(steps):
    if steps < 2:
        return 1
    return climb_ways(steps - 1) + climb_ways(steps - 2)`,
        explanation:
          '- `if steps < 2: return 1` is the base case, and it has to cover both 0 and 1. A flight of 0 steps is climbed one way (take no strides), and a flight of 1 step is climbed one way (a single 1-step stride).\n' +
          '- A base case of only `steps == 0` looks reasonable but never stops: `climb_ways(1)` would ask for `climb_ways(0) + climb_ways(-1)`, and -1 asks about -2 and -3, down forever until `RecursionError`.\n' +
          '- `climb_ways(steps - 1)` counts every climb that starts with a 1-step stride, and `climb_ways(steps - 2)` counts every climb that starts with a 2-step stride. A climb starts with exactly one of the two, so nothing is counted twice and nothing is missed.\n' +
          '- The two counts are added and returned. Nothing is stored between calls and nothing is printed: the caller gets an int back.\n' +
          '- Checking by hand: `climb_ways(2)` is `climb_ways(1) + climb_ways(0)` = 1 + 1 = 2. `climb_ways(3)` is 2 + 1 = 3. `climb_ways(4)` is 3 + 2 = 5, which matches the five climbs listed in the question.\n\n' +
          'Marking guide (10): base case answering both 0 and 1 steps (3), recursive call on `steps - 1` (2), recursive call on `steps - 2` (2), the two results added and returned (2), no loops anywhere (1).',
      },
      selfExplain: 'Why must the base case cover steps == 1 as well as steps == 0?',
    },
    {
      id: 't13-s6-q2',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 10,
      examSlot: 'recursion-simple',
      diff: 'hard',
      core: true,
      title: 'Squash the gate log (exam style)',
      prompt:
        '*Exam style, 10 marks. Write it by hand first, then submit once.*\n\n' +
        'Each minute, a gate at Optus Stadium adds one letter to a log string: `\'O\'` while the gate is open and `\'C\'` while it is closed. ' +
        'Staff only care about the changes, so a run of the same letter is squashed down to one letter.\n\n' +
        'Write a function `squash(log)` that returns a **new string** in which every run of the same character in `log` is replaced by a single copy of that character. ' +
        'The characters that are kept stay in the order they appear.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions).\n\n' +
        '- `log` is a string. Any character may appear in it, not only `\'O\'` and `\'C\'`.\n' +
        '- `squash(\'\')` returns `\'\'`, and a string of one character comes back unchanged.\n\n' +
        'Example: `squash(\'OOCCCO\')` returns `\'OCO\'`.',
      fnName: 'squash',
      starter: `def squash(log):
    pass`,
      rules: ['noLoops'],
      tests: [
        { id: 'v1', call: "squash('OOCCCO')", expect: "'OCO'", label: 'the example', hidden: false },
        { id: 'v2', call: "squash('OCOC')", expect: "'OCOC'", label: 'nothing to squash', hidden: false },
        { id: 'h1', call: "squash('')", expect: "''", label: 'an empty log', hidden: true, tag: 'missing_base_case' },
        { id: 'h2', call: "squash('O')", expect: "'O'", label: 'one minute only', hidden: true, tag: 'index_out_of_range' },
        { id: 'h3', call: "squash('OOOOOO')", expect: "'O'", label: 'the gate never changed', hidden: true },
        { id: 'h4', call: "squash('CCOOCC')", expect: "'COC'", label: 'a run at each end', hidden: true },
        { id: 'h5', call: "squash('gate  4  shut')", expect: "'gate 4 shut'", label: 'repeated spaces in a note', hidden: true },
      ],
      concepts: ['string-recursion', 'base-case', 'slicing', 'no-loops'],
      detects: ['missing_base_case', 'index_out_of_range', 'recursion_result_ignored', 'loop_in_recursion', 'return_type_wrong'],
      expectedSec: 420,
      hints: [
        'This call only has to decide about the first character. Compare it with the one next to it, and let a recursive call deal with everything from the second character onwards.',
        'Plan: a log shorter than two characters is already squashed, so return it as it is. Otherwise compare `log[0]` with `log[1]`. If they are the same, the first character adds nothing to the answer, so the answer is just the squash of `log[1:]`. If they differ, keep `log[0]` and join it to the front of the squash of `log[1:]`.',
        'Both branches call `squash(log[1:])`. The only difference is whether `log[0] + ` goes in front of it: `return log[0] + squash(log[1:])`.',
      ],
      solution: {
        code: `def squash(log):
    if len(log) < 2:
        return log
    if log[0] == log[1]:
        return squash(log[1:])
    return log[0] + squash(log[1:])`,
        explanation:
          '- `if len(log) < 2: return log` is the base case. It answers the empty log and any one-character log, and returning `log` itself keeps the return type a string on every path.\n' +
          '- The base case also has to be this wide because the next line reads `log[1]`. With a base case of only `log == \'\'`, a one-character log would fall through to `log[1]` and raise `IndexError`, which is the usual way this question is lost in the exam.\n' +
          '- `if log[0] == log[1]: return squash(log[1:])` drops a repeat. The first character is the same as the next one, so whatever the rest of the log squashes down to already starts with that character; adding it again would double it up.\n' +
          '- `return log[0] + squash(log[1:])` is the other case: the first character is the start of a new run, so it is kept and the squashed rest is joined on after it.\n' +
          '- `log[1:]` is one character shorter every time, so every chain of calls reaches the base case, and strings are never changed in place: each call builds a new string with `+`.\n' +
          '- By hand, `squash(\'OOCCCO\')`: the two `O`s make the first call drop one, then `\'OCCCO\'` keeps its `O`, then `\'CCCO\'` and `\'CCO\'` each drop a `C`, then `\'CO\'` keeps the `C`, and `\'O\'` is the base case. The pieces join up as `\'O\'` + `\'C\'` + `\'O\'` = `\'OCO\'`.\n\n' +
          'Marking guide (10): base case for a log shorter than two characters (3), the first two characters compared (2), a repeated first character dropped by recursing on `log[1:]` (2), a new character kept in front of the recursive result (2), a string returned with no loops (1).',
      },
      selfExplain: 'Why does the base case test len(log) < 2 rather than log == \'\'?',
    },
    {
      id: 't13-s6-q3',
      format: 'write',
      kind: 'function',
      mode: 'paper',
      marks: 20,
      examSlot: 'recursion-nested',
      diff: 'hard',
      core: false,
      title: 'Crate stocktake (exam style)',
      prompt:
        '*Exam style, 20 marks. Write it by hand first, then submit once.*\n\n' +
        'A fruit stall at the Fremantle Markets packs its produce into crates, and a crate can hold smaller crates. A crate is a list whose items are:\n\n' +
        '- the weight of one piece of fruit in grams (an int),\n' +
        '- a label (a string), which weighs nothing and is not a piece of fruit,\n' +
        '- or a smaller crate (a list), nested to any depth. Any crate may be empty.\n\n' +
        'Write a function `stocktake(crate)` that returns the **tuple** `(count, weight)`, where `count` is how many weights appear anywhere in `crate`, at any depth, ' +
        'and `weight` is those weights added together. Both are ints.\n\n' +
        '**Recursion must be used. Looping is not allowed** (no `for`, `while` or comprehensions).\n\n' +
        '- `stocktake([])` returns `(0, 0)`, and so does a crate holding nothing but labels and empty crates.\n' +
        '- Do not change `crate`.\n\n' +
        'Example: `stocktake([900, [\'granny smith\', 450, [200]], \'tray\'])` returns `(3, 1550)`.',
      fnName: 'stocktake',
      starter: `def stocktake(crate):
    pass`,
      rules: ['noLoops'],
      tests: [
        {
          id: 'v1',
          call: "stocktake([900, ['granny smith', 450, [200]], 'tray'])",
          expect: '(3, 1550)',
          label: 'the example',
          hidden: false,
        },
        { id: 'v2', call: 'stocktake([120, 80])', expect: '(2, 200)', label: 'no nesting', hidden: false },
        { id: 'h1', call: 'stocktake([])', expect: '(0, 0)', label: 'an empty crate', hidden: true, tag: 'missing_base_case' },
        {
          id: 'h2',
          call: "stocktake([[], ['pallet', []]])",
          expect: '(0, 0)',
          label: 'only labels and empty crates',
          hidden: true,
          tag: 'missing_base_case',
        },
        { id: 'h3', call: "stocktake(['lemons'])", expect: '(0, 0)', label: 'one label and nothing else', hidden: true, tag: 'index_out_of_range' },
        { id: 'h4', call: 'stocktake([[[[25]]], 5])', expect: '(2, 30)', label: 'a weight four crates down', hidden: true, tag: 'recursion_result_ignored' },
        {
          id: 'h5',
          call: "stocktake([[100, ['apples', 200]], 300, ['crate', [[50]]]])",
          expect: '(4, 650)',
          label: 'several crates inside crates',
          hidden: true,
          tag: 'recursion_result_ignored',
        },
        {
          id: 'h6',
          setup: "crate = [100, ['box', [200]]]",
          call: 'stocktake(crate)',
          expect: '(2, 300)',
          argsUnchanged: ['crate'],
          label: 'the crate is not changed',
          hidden: true,
          tag: 'mutated_input',
        },
      ],
      concepts: ['nested-list', 'isinstance', 'tuple-return', 'no-loops'],
      detects: ['missing_base_case', 'recursion_result_ignored', 'return_type_wrong', 'loop_in_recursion', 'mutated_input', 'index_out_of_range'],
      expectedSec: 780,
      hints: [
        'Two numbers have to come back from every call, so start by deciding what an empty crate is worth. Which tuple says "nothing in here"?',
        'Plan: an empty crate gives `(0, 0)`. Otherwise work out a tuple for `crate[0]` on its own — a smaller crate gets a recursive call, a label gives `(0, 0)`, and a weight gives `(1, weight)` — then get a tuple for the rest of the crate with a second recursive call on `crate[1:]`. ' +
          'Add the two counts together and the two weights together, and return the pair.',
        'Store both calls: `found` for the first item and `rest = stocktake(crate[1:])`. Then `return (found[0] + rest[0], found[1] + rest[1])`. Sort the first item out with `isinstance(first, list)` and `isinstance(first, str)`.',
      ],
      solution: {
        code: `def stocktake(crate):
    if crate == []:
        return (0, 0)
    first = crate[0]
    if isinstance(first, list):
        found = stocktake(first)
    elif isinstance(first, str):
        found = (0, 0)
    else:
        found = (1, first)
    rest = stocktake(crate[1:])
    return (found[0] + rest[0], found[1] + rest[1])`,
        explanation:
          '- `if crate == []: return (0, 0)` is the base case, and it must come first, before anything reads `crate[0]`. It returns a tuple, not 0, so every call gets the same shape of answer back.\n' +
          '- `first = crate[0]` is the one item this call decides about. Everything else is somebody else\'s job.\n' +
          '- `isinstance(first, list)` is tested before anything else, because a smaller crate can hold weights at any depth and only a recursive call can find them. The tuple that call returns is kept in `found`; calling `stocktake(first)` without storing or returning it would quietly lose the whole crate.\n' +
          '- `elif isinstance(first, str)` catches a label. It contributes `(0, 0)`: no fruit, no grams.\n' +
          '- The `else` branch is a weight, and one weight is `(1, first)`: one piece of fruit, `first` grams.\n' +
          '- `rest = stocktake(crate[1:])` is the second recursive call, the one that walks along the crate. `crate[1:]` is a new, shorter list, so the original crate is never touched and the calls always get closer to `[]`.\n' +
          '- `return (found[0] + rest[0], found[1] + rest[1])` adds counts to counts and grams to grams, and hands one tuple back.\n' +
          '- For the example, `[200]` gives `(1, 200)`, so `[\'granny smith\', 450, [200]]` gives `(2, 650)`, and the outer crate adds the 900 and ignores `\'tray\'`, giving `(3, 1550)`.\n\n' +
          'Marking guide (20): base case returning `(0, 0)` for an empty crate (4), first item taken apart with `isinstance` in the right order (3), nested crate handled by a recursive call whose result is kept (4), ' +
          'label worth `(0, 0)` and a weight worth `(1, weight)` (3), second recursive call on `crate[1:]` (3), counts and weights added and returned as a tuple, with no loops (3).',
      },
      selfExplain: 'Why does every branch of the function produce a tuple rather than sometimes a plain number?',
    },
  ],
};

export default scenario;
