// "What if" experiments for if, elif, else and Boolean logic. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const andOr: Experiment = {
  id: 't02-x1',
  title: 'and needs both, or needs one',
  intro:
    'A cafe gives a free drink on hot days to customers with a loyalty card. Change the temperature, the card, and the little word joining the two conditions.',
  template:
    "temp = ⟦temp⟧\nhas_card = ⟦card⟧\nif temp >= 35 ⟦joiner⟧ has_card:\n    print('Free drink')\nelse:\n    print('No free drink')\n",
  knobs: [
    { id: 'temp', kind: 'range', label: 'how hot it is', min: 30, max: 40, start: 35 },
    {
      id: 'card',
      label: 'the customer',
      choices: [
        { value: 'True', caption: 'has a loyalty card' },
        { value: 'False', caption: 'has no card' },
      ],
    },
    {
      id: 'joiner',
      label: 'join the two conditions with',
      choices: [
        { value: 'and', caption: 'and' },
        { value: 'or', caption: 'or' },
      ],
    },
  ],
  notes: {
    '5-0-0': 'Both true, so `and` is happy: it is 35 and the card is there. This is the only shape of day that `and` lets through.',
    '5-1-0': 'No drink. It is hot enough, but `and` refuses as soon as one side is false. Half true is false.',
    '5-1-1': 'A drink, from the heat alone. `or` only needs one side, so the missing card no longer matters.',
    '0-0-0': 'No drink at 30 degrees, even with the card. Again `and` needs both.',
    '0-0-1': 'A drink at 30 degrees, from the card alone. This is the giveaway that `or` is too generous for a rule that was meant to say "hot **and** a member".',
    '0-1-1': 'The only way `or` says no: both sides false. Not hot, no card.',
    '10-1-0': 'Still no drink at 40 degrees. Cranking one condition as high as it goes never rescues an `and` whose other side is false, which is why a rule that never fires is usually an `and` that should be an `or`.',
    '10-0-1': 'Both sides true, so `or` says yes as well. `and` and `or` agree whenever both conditions agree, and only split apart when exactly one of them is true.',
  },
  takeaway:
    'Read `and` as "both" and `or` as "either". They give the same answer when both conditions are true and when both are false, so a test that only tries those two cases will not tell you which one you wrote. The case that exposes it is the one where exactly one condition holds: `and` says no, `or` says yes. A rule that never fires is usually an `and` that should be an `or`; a rule that fires for everybody is usually the reverse.',
};

const chainOrNot: Experiment = {
  id: 't02-x2',
  title: 'A chain of ifs is not an elif chain',
  intro:
    'One word changes how many lines of warning come out. Drag the temperature up past 40 and switch the second test between `if` and `elif`.',
  template:
    "temp = ⟦temp⟧\nif temp >= 40:\n    print('Extreme heat')\n⟦joiner⟧ temp >= 35:\n    print('Heat warning')\nelse:\n    print('No warning today')\n",
  knobs: [
    { id: 'temp', kind: 'range', label: 'how hot it is', min: 30, max: 42, start: 41 },
    {
      id: 'joiner',
      label: 'start the second test with',
      choices: [
        { value: 'if', caption: 'if  (a brand new decision)' },
        { value: 'elif', caption: 'elif  (only if the first was false)' },
      ],
    },
  ],
  notes: {
    '11-0': 'Two warnings for one day. 41 is above 40 **and** above 35, and a fresh `if` asks its question no matter what the previous one decided.',
    '11-1': 'One warning. `elif` means "only if nothing above me was true", so once `Extreme heat` has printed the rest of the chain is skipped.',
    '10-0': 'Exactly on 40, and still two warnings, because `>=` lets 40 through both tests.',
    '7-0': 'At 37 the two versions look identical: the first test is false, so the second gets its turn either way. Testing only warm days would never show you the difference.',
    '0-1': 'Below both cutoffs the `else` runs. Notice that with a separate `if`, that `else` belongs to the **second** `if` only, which is a quiet source of bugs once there are three or four branches.',
    '12-1': 'The hottest day, one line. When exactly one outcome should happen, `elif` is what guarantees it.',
  },
  takeaway:
    'An `elif` chain is one decision with several possible answers and it stops at the first true branch. Separate `if`s are separate decisions, each asked in full. Use `elif` when exactly one outcome should happen, and separate `if`s when several can apply at once. The trap is that both versions behave identically until a value makes two conditions true at the same time, so the bug only shows up on the extreme cases you were least likely to test.',
};

const boundary: Experiment = {
  id: 't02-x3',
  title: 'Exactly on the line',
  intro:
    'A ride has a height rule. Drag the height across the cutoff and change both the comparison and the number it uses. Watch the dots: they show every height the rule lets on.',
  template:
    "height = ⟦height⟧\nif height ⟦test⟧ ⟦limit⟧:\n    print('Can ride')\nelse:\n    print('Too short')\n",
  knobs: [
    { id: 'height', kind: 'range', label: 'how tall you are, in cm', min: 115, max: 125, start: 120 },
    {
      id: 'test',
      label: 'let them on when their height is',
      choices: [
        { value: '>', caption: 'above  ( > )' },
        { value: '>=', caption: 'at least  ( >= )' },
      ],
    },
    {
      id: 'limit',
      label: 'the number in the rule',
      choices: [{ value: '119' }, { value: '120' }],
    },
  ],
  probes: { allowed: '[h for h in range(115, 126) if h ⟦test⟧ ⟦limit⟧]' },
  visual: {
    kind: 'numberline',
    min: 115,
    max: 125,
    picked: 'allowed',
    caption: 'Every height from 115 to 125 cm. The filled dots are the heights this rule lets on the ride.',
  },
  notes: {
    '5-1-1': 'The rule the sign means: "you must be 120 cm". `>=` includes the number itself, so somebody exactly 120 gets on.',
    '5-0-1': 'The classic off-by-one. A child measured at exactly 120 is turned away, because `>` means strictly taller. One person in the whole queue is affected, which is why this bug reaches real software.',
    '5-0-0': 'Also on the ride. Look at the dots: `> 119` lights up exactly the same heights as `>= 120`. Two different-looking rules, one behaviour.',
    '4-1-0': 'At 119 with `>= 119`, the rule is a centimetre too generous. Changing the number and changing the comparison both shift the line, so when you fix a boundary bug, change one of them, not both.',
    '4-1-1': 'One centimetre under and turned away, which is the whole point of a cutoff. Check the value just below, just on, and just above every boundary in a spec.',
  },
  takeaway:
    'On whole numbers, `>` and `>=` differ for exactly one value: the cutoff itself. Everything else behaves identically, so the boundary is the only test that can catch a wrong comparison, and "just below, exactly on, just above" is the set of values to try for every cutoff in a question. It also means `> 119` and `>= 120` are the same rule written two ways, so prefer the one that reads like the spec: if the sign says "120 cm or taller", write `>= 120`.',
};

export const experiments: Experiment[] = [andOr, chainOrNot, boundary];
