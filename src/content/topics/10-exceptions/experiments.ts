// "What if" experiments for try/except. Change one control, see the output change.
// Every outcome shown in the app is run in real Python by the verifier, never typed here.
import type { Experiment } from '../../schema.ts';

const whichCatches: Experiment = {
  id: 't10-x1',
  title: 'A handler only catches the error it names',
  intro:
    'The same `try` block, given three different things to convert and guarded by three different handlers. Watch which pairings recover and which ones still stop the program.',
  template:
    "text = ⟦value⟧\ntry:\n    number = int(text)\n    print('the number is', number)\nexcept ⟦catch⟧:\n    print('could not use that')\nprint('the program carries on')\n",
  knobs: [
    {
      id: 'value',
      label: 'the value handed in is',
      choices: [
        { value: "'42'", caption: "'42' — a whole number, as text" },
        { value: "'4.5'", caption: "'4.5' — a decimal, as text" },
        { value: 'None', caption: 'None — nothing at all' },
      ],
    },
    {
      id: 'catch',
      label: 'guard against',
      choices: [
        { value: 'ValueError', caption: 'ValueError' },
        { value: 'TypeError', caption: 'TypeError' },
        { value: '(ValueError, TypeError)', caption: 'either of the two' },
      ],
    },
  ],
  notes: {
    '0-0':
      'Nothing goes wrong, so the whole `except` block is skipped as if it were not there. This is what a `try` costs you when all is well: nothing.',
    '1-0':
      "The pairing that works. `int('4.5')` is a **ValueError** — the value is text, which is the right kind of thing, but its content is not a whole number — and the handler names ValueError, so the program recovers and carries on.",
    '1-1':
      'The handler is there, it just names the wrong error, so the ValueError sails straight past it and the program stops. An `except` is not a safety net in general; it catches one named thing.',
    '2-0':
      "Now it is the other way round: `int(None)` is a **TypeError**, because `None` is the wrong *kind* of thing entirely, and the ValueError handler does not catch it. Wrong content is a ValueError; wrong type is a TypeError.",
    '2-1': 'TypeError named, TypeError raised, so this one recovers.',
    '1-2':
      'Naming both in brackets handles whichever turns up, without guessing. This is the honest way to widen a handler: list the errors you actually expect.',
    '2-2': 'The same handler, catching the other error in its list. One `except` line, two named errors, both dealt with the same way.',
  },
  takeaway:
    'Read the error type in the message and name that exact type in your handler. `ValueError` is right type, wrong content (`int(\'4.5\')`, `float(\'N/A\')`); `TypeError` is the wrong kind of thing altogether (`int(None)`, `\'Total: \' + 5`). If more than one can really happen, list them together as `except (ValueError, TypeError):` — and when nothing goes wrong at all, the `except` block simply never runs.',
};

const whereItGoes: Experiment = {
  id: 't10-x2',
  title: 'What the except block leaves behind',
  intro:
    'Readings from a sensor, some of them unusable. Change the data and change what happens when a reading fails, then read the table: one row every time the loop reaches `total = total + value`.',
  template:
    "readings = ⟦rows⟧\ntotal = 0\ncount = 0\nfor text in readings:\n    try:\n        value = float(text)\n    except ValueError:\n        ⟦handle⟧\n    total = total + value\n    count = count + 1\nprint('mean', total / count)\n",
  knobs: [
    {
      id: 'rows',
      label: 'the readings are',
      choices: [
        { value: "['3.2', 'N/A', '1.5']", caption: 'two good, one unusable' },
        { value: "['N/A', 'n/a']", caption: 'every one unusable' },
        { value: "['3.2', '1.5']", caption: 'all good' },
      ],
    },
    {
      id: 'handle',
      label: 'when a reading fails',
      choices: [
        { value: 'continue', caption: 'move straight on to the next reading' },
        { value: 'pass', caption: 'do nothing and keep going down the block' },
        { value: 'value = 0', caption: 'count it as 0' },
      ],
    },
  ],
  watch: ['text', 'value', 'total'],
  anchorLine: 9,
  notes: {
    '0-0':
      'The right answer, 2.35. `continue` jumps to the next reading immediately, so the unusable one never reaches the two lines below and is not counted.',
    '0-1':
      "The nastiest bug in this topic. `pass` means \"do nothing\", so the lines below still run — and `value` is still holding **3.2 from the previous reading**, which gets added a second time. Look at the table: 3.2 appears twice. The mean comes out just above 2.63 and nothing warns you.",
    '0-2':
      "No crash, and defensible if the task says a missing reading means zero — but read it carefully: the bad reading is still counted, so this is the mean over three readings, just under 1.57, not over the two that worked.",
    '1-0':
      "Every reading is skipped, so nothing was ever added and `count` is still 0: **ZeroDivisionError** on the very last line, outside the `try`. This is why a mean over 'valid rows only' needs `if count == 0:` before it divides.",
    '1-1':
      "A **NameError**: `value` was never given anything, because the first reading failed before the assignment finished. After an `except` block, either `continue`, `return`, or give the variable a value — otherwise the next line that uses it has nothing to use.",
    '2-0':
      'Nothing goes wrong, so the `except` block never runs and the answer is the plain mean, 2.35. A `try` around working code changes nothing at all.',
  },
  takeaway:
    'An `except` block does not undo the failed line: whatever the variable held before is still in it, and if it never held anything, it still holds nothing. So end every handler deliberately — `continue` to skip this row, or set the variable to a real value — and never fall through on a `pass`. Then guard the division afterwards, because "skip the bad rows" can skip every row.',
};

const tooBroad: Experiment = {
  id: 't10-x3',
  title: 'Catching too much hides your own mistakes',
  intro:
    'One price in this list is genuinely unusable, so a handler is needed. But two of the three versions of the code have a typing mistake in them. Watch which pairings let you see it.',
  template:
    "prices = ['4.50', 'N/A', '3.00']\ntotal = 0\nfor price in prices:\n    try:\n        total = total + ⟦call⟧\n⟦catch⟧\n        pass\nprint('total', total)\n",
  knobs: [
    {
      id: 'call',
      label: 'the line in the try says',
      choices: [
        { value: 'float(price)', caption: 'float(price) — as intended' },
        { value: 'flaot(price)', caption: 'flaot(price) — the name is misspelt' },
        { value: 'float(price.strip)', caption: 'float(price.strip) — the brackets after strip are missing' },
      ],
    },
    {
      id: 'catch',
      label: 'the handler line says',
      choices: [
        { value: '    except ValueError:', caption: 'except ValueError' },
        { value: '    except (ValueError, TypeError):', caption: 'except ValueError or TypeError' },
        { value: '    except:', caption: 'except — anything at all' },
      ],
    },
  ],
  notes: {
    '0-0':
      "The code is right and the handler names exactly the error the data can cause: `float('N/A')` raises ValueError, that row is skipped, and the total is 7.5.",
    '1-0':
      'The program stops with a **NameError** pointing straight at `flaot`. That is the handler doing its job: it caught what it promised to catch and let your typo through, loudly, where you can fix it in ten seconds.',
    '1-2':
      "A bare `except:` catches the NameError too, so **every** price is skipped, the total is 0 and not one word of complaint appears. A total of 0 on real data is what a hidden typo looks like. This is why a bare `except:` is banned.",
    '1-1':
      'Widening the handler to two named errors still lets the NameError through, because a misspelt name is neither of them. Naming errors, even several, keeps your own mistakes visible.',
    '2-0':
      "**TypeError**: `price.strip` without brackets is the method itself rather than the tidied text, so `float` was handed a function. Again the program stops and tells you where.",
    '2-1':
      'Here the widened handler backfires. The forgotten brackets raise a TypeError, TypeError is in the list, so the mistake is swallowed and the total is 0 — the same silent nonsense as a bare `except:`, from a handler that looked careful.',
    '2-2': 'A bare `except:` hides it too, of course. Total 0, no message, nothing to go on.',
  },
  takeaway:
    'A handler should name the error your **data** can cause, and nothing more. Every extra error type you catch is a place one of your own mistakes — a misspelt name, a method you forgot to call — can hide, and the symptom is a total of 0 or an empty result with no error at all. Never write a bare `except:`, and widen an `except` only when you can say which real input causes each error in the list.',
};

export const experiments: Experiment[] = [whichCatches, whereItGoes, tooBroad];
