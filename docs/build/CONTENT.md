# Writing PyLadder content

You are writing practice material for first-year UWA students in CITS1401 (Computational Thinking with Python) who are studying Python generally and preparing for the **closed-book final exam**. Read `src/content/schema.ts` (the type contract) and `src/content/ids.ts` (allowed ids) first. Unit research: `docs/plan/research/cits1401-curriculum.json`, `docs/plan/research/curriculum-design.json` (your topic's objectives, sample questions, mistakes), `docs/plan/research/pedagogy.json`.

## Files
Your folder: `src/content/topics/NN-<topic-id>/`.
- `index.ts` default-exports a `Topic` (`import type { Topic } from '../../schema.ts'`). Replace the stub.
- One file per scenario: `s1-<slug>.ts` exporting a `Scenario`; `index.ts` imports them WITH `.ts` extensions.
- Optional `experiments.ts` exporting `experiments: Experiment[]` for the "What if" tab (see below).
- `cheatsheet` and other Md strings may live in `cheatsheet.ts`. Content files must import only `../../schema.ts` / `../../ids.ts` types (with `import type`). No Vite-only imports, no `?raw`, no JSON imports. Node runs these files directly.
- Never edit files outside your folder. Never hand-edit `src/content/generated/**` (the verifier writes it).

## Ids
- Scenario id: `tNN-sK` (NN = topic number from `src/content/topics.ts`, K = 1..4). Question id: `tNN-sK-qM`. Experiment id: `tNN-xK`. Ids are unique and stable.

## Volume and mix (per topic) — these are MINIMUMS
A topic may hold more than the table says (extra practice is welcome); the verifier only warns when a topic has fewer questions than planned, or loses a format, difficulty band, paper item or project item. When you add questions, keep the same quality bar and spread them across formats and difficulties.
| # | Topic id | Questions | Easy/Med/Hard | Format mix |
|---|---|---|---|---|
| 01 | variables-expressions | 12 | 5/5/2 | mcq 3 (one true/false), multi 1, predict 3, trace 1, cloze 1, fixBug 1, write 2 |
| 02 | if-elif-else | 12 | 4/5/3 | mcq 3, predict 2, twins 1, multi 1, parsons 1, fixBug 1, write 2, refactor 1 |
| 03 | for-loops-range | 13 | 4/6/3 | mcq 1, multi 1, predict 3, trace 2, cloze 1, parsons 2, fixBug 1, write 2 (1 paper) |
| 04 | functions-basics | 12 | 4/5/3 | mcq 2, cloze 1, predict 2, errorTranslator 1, parsons 1, fixBug 1, write 3, refactor 1 |
| 05 | strings | 12 | 4/5/3 | mcq 1, predict 3, twins 1, errorTranslator 1, cloze 1, fixBug 1, write 4 (1 paper) |
| 06 | lists-tuples | 13 | 4/5/4 | mcq 2, predict 2, trace 1, twins 1, parsons 1, fixBug 1, write 4 (1 paper), refactor 1 |
| 07 | while-nested-loops | 13 | 3/5/5 | mcq 1, predict 2, trace 2, cloze 1, parsons 1, fixBug 1, write 5 (2 paper) |
| 08 | dictionaries | 12 | 3/5/4 | mcq 1, predict 2, errorTranslator 1, cloze 1, parsons 1, fixBug 1, write 4 (1 paper), refactor 1 |
| 09 | files-csv | 11 | 2/5/4 | mcq 1, predict 1, multi 1, cloze 1, parsons 1, fixBug 2, write 4 (virtual files; 1 paper) |
| 10 | exceptions | 11 | 3/5/3 | mcq 1, multi 1, predict 2, errorTranslator 2, fixBug 1, write 3, testWriter 1 |
| 11 | functions-project | 12 | 2/5/5 | mcq 1, predict 2, errorTranslator 1, multi 1, fixBug 1, refactor 2, write 4 (1 project) |
| 12 | project-simulator | 10 | 1/4/5 | mcq 1, predict 1, fixBug 1, write 5 (3 project), refactor 1, testWriter 1 |
| 13 | recursion | 12 | 3/4/5 | mcq 1, predict 2, trace 2, errorTranslator 1, parsons 1, fixBug 1, write 4 (2 paper, rules ['noLoops']) |

3 to 6 scenarios per topic, 3-5 questions each, ordered read → repair → write inside a scenario. Mark about two thirds `core: true`, including at least 3 code-format questions (cloze, parsons, fixBug, write, refactor, testWriter) so the topic minimum (see `minimum` in `src/content/topics.ts`) is reachable using core questions alone.

## Quality bar
- **Real, varied contexts.** Mix Perth/UWA life (Transperth, SmartRider, Rottnest ferry, Kings Park, Optus Stadium, Fremantle markets, the Swan River, Reid Library, UWA grades HD/D/CR/P/N, BOM weather, WACA cricket scores, Perth Scorchers, quokkas) with universal ones (receipts, playlists, game scores, sensor readings, student marks). Do not reuse the same context twice in one topic. Names of people: diverse and plausible.
- **Write like a good tutor, not a marketing page.** Short, specific, concrete. No filler ("Let's dive in", "unlock your potential"), no emoji, no exclamation marks.
- **Every question teaches one thing** and its `detects` lists the misconceptions it can reveal. MCQ distractors, predict `mutants`, Parsons distractors and test `tag`s must correspond to REAL beginner mistakes from `MISTAKE_IDS`.
- **Hints**: tier 1 nudges toward the key idea without giving it away; tier 2 gives the plan in words (subgoals); tier 3 gives partial code or the key line. Never paste the full solution into a hint.
- **Solution**: `explanation` walks through the answer line by line in plain language. `code` is REQUIRED for cloze, parsons, fixBug, write, refactor and testWriter.
- **Prompts state the exact return type and format**: "return a tuple (lowest, highest)", "round to 2 decimal places", "return None for an empty list", "print each on its own line".
- **Tests**: every code question has at least 2 visible and 2 hidden tests. Hidden tests cover edge cases (empty input, zero, negative, boundary, duplicate, single element, uppercase) and carry a `tag` when they expose a specific mistake. Use `cmp: 'float'` whenever the expected value contains a float. Use `argsUnchanged` with `setup` when the function must not mutate its input.
- **Paper items** (`write` with `mode: 'paper'`, `marks` 5-20) mimic the closed-book final: a function spec, no Run button. Keep them solvable by hand in 5-15 minutes.
- **Exam slots.** A paper item may also claim one of the eight slots of a real CITS1401 paper by setting `examSlot` (see `EXAM_SLOT_IDS` in `src/content/ids.ts`). The mock exam draws one question per slot, so `marks` MUST equal that slot's marks (the verifier errors otherwise) and the eight slots add to 100:

| slot | marks | what it is | past-paper examples |
|---|---|---|---|
| `short-string` | 5 | a small string function | insert spaces into a run-together name; case-insensitive palindrome |
| `short-list` | 5 | a small list or number function | filter and sort two lists; a short numeric scan |
| `dict-sort` | 10 | a dict turned into a sorted list of tuples, or banded into a dict | `sortdict`, `sortStaff`, `marksdistribution` |
| `recursion-simple` | 10 | recursion on a number or string, looping not allowed | `sumdigits`, recursive `pow`, recursive reverse |
| `series-tolerance` | 15 | a series summed with a while loop until `abs(term) < tol`, rounded only at the end | `seriesexp`, `log_cosh` |
| `recursion-nested` | 20 | recursion over arbitrarily nested lists | `multiply_lists`, `extract_strings` |
| `combinations` | 15 | all combinations via nested loops | `team_maker`, `team` |
| `file-report` | 20 | read a file whose header order is unknown, compute, fail gracefully | `user_account`, `donors` |

  Aim for at least three questions per slot so a student can sit several different papers. A slot with no question means no mock exam can be built at all.
- **Project items** (`kind: 'project'`, topics 09, 11, 12): `fnName: 'main'`, tests call `main('data_a', ...)` with `files` (no `.csv` extension, shuffled header order, an extra column, a blank or invalid row, mixed case), `rules: ['noImport','noInput','noPrint','roundAtEnd','noCsvExt']`, results rounded to 4 dp only at output.
- **Difficulty** follows the rubric in `docs/plan/research/curriculum-design.json` (`difficultyRubric`): easy = one idea as taught, ≤ 2 min; medium = two ideas or a twist, 2-6 min; hard = planning or hidden edge cases, 6-15 min. `expectedSec` must agree.
- **Concept order**: use only constructs taught up to your topic. Before topic 04 (functions), code questions may use exactly one `def` line that is given in the starter/template/buggy code/Parsons lines (students fill in the body). No comprehensions required anywhere. No `import` anywhere except where a question is explicitly about the no-import rule. Recursion only in topic 13 (and not required elsewhere). `while` from topic 07, dicts from 08, files from 09, try/except from 10.
- **Deterministic output**: no `random`, `time`, `id()`, printing sets of strings, or dict ordering tricks in read formats.
- **Read-format specifics**:
  - `predict`: output must be short (≤ 8 lines). Provide 1-3 `mutants` whose output differs from the real output and reflects a real misconception. Set `choice: true` for easy items.
  - `trace`: loops of 3-6 iterations; `anchorLine` is the last line of the loop body (one row per pass); `watch` 2-3 variables.
  - `twins`: the two snippets differ by one token or one line; `mistake` names the misconception.
  - `errorTranslator`: code must actually raise; `exceptionOptions` has 4 real exception names; `causes` has 3 options, one correct.
  - `mcq`: 4 options (2 for true/false) with a `why` for every option; exactly one `correct: true`.
  - `multi`: 4-5 options, at least 2 correct, a `why` for every option.
- **Code-format specifics**:
  - `cloze`: 1-3 blanks marked `⟦1⟧`, `⟦2⟧`, `⟦3⟧`; `accept` lists every reasonable correct fill; tests prove equivalents work.
  - `parsons`: 4-8 lines plus 1-2 distractors that are paired twins of real lines; `indentMatters: true` for medium/hard.
  - `fixBug`: one bug (occasionally two for hard) that a hidden or visible test exposes with `tag` = `bugMistake`; `maxChangedLines` 1-2.
  - `refactor`: working but clumsy code; `mustRemove`/`mustAdd` are AST flags from `AST_FLAGS`; tests still pass after refactoring; `pattern` from `PATTERN_IDS`.
  - `testWriter`: `reference` correct, `buggy` wrong on an edge case; `argsExample` is a Python tuple literal like `"([1, 2, 3],)"`.

## "What if" experiments (optional, 2-3 per topic)

One short program with two or three parts turned into controls. The student changes a control and sees the
real output change. This is the only place in the app that teaches by exploration rather than by question,
so aim it at the thing students get wrong *before* they can answer anything: what `range()` counts, what a
loop variable holds, where an accumulator update goes.

Write them in `experiments.ts` (see `src/content/topics/03-for-loops-range/experiments.ts` for three worked
examples) and add `experiments` to the `Topic` in `index.ts`.

- `template` is the program, with `⟦knobId⟧` markers — the same marker style as a cloze. Each knob gets
  exactly one marker.
- Every choice `value` is substituted verbatim and **must stay on one line**, so line numbers never move. A
  fragment at the start of a line carries its own indentation, which is how "inside the loop" versus "after
  the loop" is offered as a choice.
- 1-3 knobs and at most 500 combinations in total, since every one is run and shipped. Give a `caption`
  when the fragment alone would not read as plain words; the fragment is then shown on hover.
- A knob is either a set of 2-4 written-out `choices`, or `kind: 'range'` with whole-number `min` and `max`,
  which is drawn as a **slider** the student can drag. A slider is just a knob whose choices are the whole
  numbers in that span, so it costs one combination per stop: keep it to 100 stops, and remember two
  sliders multiply. `start` says where the handle sits when the card opens.
- `label` names the control the way a student would say it ("stop before", "each time round the loop"), not
  the way the language does.
- Set `watch` and `anchorLine` to add a variable table that changes with the controls. Keep it under 16 rows.
- Add a **picture** with `probes` and `visual`. A probe is a Python expression evaluated after the program
  runs, in the namespace it left behind; markers work inside a probe too, so it can follow the controls.
  The picture is drawn from what Python really returned, never from a JavaScript guess at Python's rules,
  which is the whole reason probes exist. Two kinds:
  - `sequence` draws one box per item with its position underneath and lights up the picked ones. `items`
    and `picked` each name a probe returning a list, e.g. `items: 'list(word)'` and
    `picked: 'list(range(len(word)))[⟦from⟧:⟦to⟧]'`. This is the one for slicing.
  - `numberline` draws the whole numbers from `min` to `max` and marks the ones produced, e.g.
    `picked: 'list(range(⟦start⟧, ⟦stop⟧, ⟦step⟧))'`. This is the one for `range()`.
  - `bars` draws one bar per number from a probe returning numbers, with optional `labels` from a probe
    returning the same count of strings. Every bar that reaches the top is marked. Use it for sizes: a
    list's values, counts from a dictionary, a running total, the saw-tooth of `n % k`.
  - `plot` draws up to four curves on one shared scale; each series names a probe returning a list of
    `[x, y]` number pairs, at least two points. Use it where the **shape** is the lesson: how a cost grows
    with n, how a series closes on its limit. Give it `xLabel` and `yLabel`.
  A probe must return a list for either kind, so wrap it in `list(...)`. Probe values that come out the
  same for every combination are stored once, so a constant probe like `list(word)` costs almost nothing.
- `notes` explains one specific combination, keyed by choice indexes (`"1-0"`). Write notes for the
  combinations that teach something: the right answer, and the two or three wrong beliefs worth naming.
- `takeaway` is always visible and is the point of the whole thing.
- A combination that **crashes is allowed and often is the lesson** (`len()` of a number). A combination that
  does not *compile* is an authoring bug and fails the verifier.
- Nothing is graded and nothing is logged; this tab is readable even when the topic is locked.

The verifier runs every combination in real Python and writes
`src/content/generated/experiments/<topic-id>.json`. It fails if a fragment does not compile, if every
combination shows the same thing, if `anchorLine` never runs, if a probe raises on a run that otherwise
succeeded, or if a probe a picture needs is not a list. It warns if a control never changes anything
whatever the others are set to.

## Lessons

A lesson is authored teaching material, separate from questions (practice) and experiments (exploration).
Lessons live at `src/content/lessons/<track>/<id>.ts`, default-exporting a `Lesson`
(`import type { Lesson } from '../../lessonSchema.ts'`). The file name must equal the id, and the folder
must equal the track. Read `src/content/lessonSchema.ts`, then
`src/content/lessons/foundations/reading-an-error.ts` as the worked example and the quality bar.

**The rule that governs everything: a lesson never states what Python does.** Every output a reader sees is
produced by the verifier running that code. Never type an output, a value, a `repr`, or an error message
into prose as if it were fact — write the code and let the block show it. If you want to claim
`int(3.7)` is 3, put it in a `shell` block and let Python say so.

**Tracks.** `foundations` assumes nothing whatsoever and never mentions the unit. `core` teaches one of the
13 topics and sets `topicId`. `advanced` goes past the unit and may use any module the sandbox allows
(everything except os/sys/subprocess and friends: math, random, json, csv, re, collections, itertools,
functools, datetime, statistics, dataclasses, typing, enum and more all work).

**Sections are the steps** a reader walks through, so each one should be a single idea with a title short
enough for a rail ("Why it matters", not "Why this matters in practice"). Aim for 4 to 8 sections.

**Plain text, not Md, in these fields:** `title`, `summary`, `outcomes`, section `title`, `callout.title`,
`steps.title` and every `table` cell. Backticks there render as literal backticks. Md works in `prose`,
`caption`, `callout.body`, `checkpoint.prompt`/`answer` and `steps.items`.

**Order:** foundations and advanced lessons need an `order` (their place in the track's reading order,
lowest first) or the library sorts them to the end. Core lessons are ordered by their topic and need none.

**Blocks** are the body of a section:
- `prose` is the workhorse. Md: `inline code`, **bold**, *italic*, lists, blank line for a paragraph.
- `code` is a program plus the output the verifier recorded. Add `stdin` if it calls `input()`.
- `shell` is a `>>>` session: each line runs in one shared namespace and its value is recorded. Best for
  showing what an expression *is*. Add `stdin` if any line calls `input()`.
- `compare` runs two versions side by side; mark the wrong one `bad: true`.
- `callout` with tone `note`, `warn` or `exam` (`exam` means "this comes up in the paper").
- **Blocks the reader answers, not reads. Prefer these to prose wherever one fits:**
  - `quiz` — a question answered in place, 2 to 5 options, **every option needs a `why`**, including the
    wrong ones. Use it instead of a paragraph explaining a distinction.
  - `predict` — show code, the reader commits to what it prints, then the real output is revealed. The
    strongest device here. Either free typing or 2 to 4 `choices`, exactly one of which must match what
    Python really prints. The code must actually print something and **must not call `input()`**: the
    typed line is echoed into the output, so the answer would contain a line nobody could predict.
  - `order` — 3 to 8 shuffled lines the reader drags into a working order. Indentation is given. The
    lines as written must run, and no two may be identical.
  - `match` — 2 to 6 pairs dragged together. Use it instead of a `table` the reader would skim.
  - `annotate` — code where clicking a line reveals what it does. Use it instead of prose walking
    through a program line by line.
  - `walkthrough` — step through the program one line at a time, watching the variables change and the
    output appear. The whole run is recorded by the verifier, so stepping is instant. This is the answer
    to "I can read it but I cannot see what is happening", and it is the best thing in the library for a
    loop, an accumulator or a swap. Under 14 lines, must run cleanly, and must not run so long that
    stepping through it is a chore. `watch` names the variables to show; leave it out to show whatever
    the program defines.
- `checkpoint` is a question with the answer hidden until asked for. Prefer `quiz`, which tells you
  whether you were right; a checkpoint only tells you what the answer was.
- `steps` for a procedure, `table` for a small reference.
- `experiment`, `workedExample`, `mistakes` and `practice` pull in the topic's own material and need
  `topicId`. Use them: a core lesson should not restate what the topic already has.
- `interactive` is a card written **for this lesson**, available in every track including foundations and
  advanced. It holds a whole `Experiment` inline (see the "What if" section above for the contract), so a
  reader gets sliders and a picture that redraw as they drag. Every combination is run at verify time, so
  there is no lag and no output that Python did not produce. Reach for one wherever the lesson would
  otherwise say "as n grows, this gets slower" — show it instead.

**A block that raises on purpose is good teaching** and is allowed everywhere; say so in the surrounding
prose. A block that fails to *compile* is a bug and fails the verifier. Two shell mistakes are always
bugs and are caught: a line calling `input()` with no `stdin`, and a line failing because an earlier line
failed to set the name it uses (everything after that point is not real output).

**Write for someone who is not sure they can do this.** Plain words, short sentences, and say why something
matters before saying what it is. Never write "simply", "just" or "obviously".

**Show, do not tell.** A lesson that is mostly `prose` has failed, however well written. A reader who has
answered a question remembers it; a reader who has read a paragraph about it does not. Aim for **at most
half the blocks being prose**, and never more than two `prose` blocks in a row without something to do
between them. When you catch yourself explaining a difference, make it a `quiz`; explaining what code
prints, make it a `predict`; explaining what each line does, make it an `annotate`; listing pairs, make it
a `match`; explaining why order matters, make it an `order`.

**Generated output must be the same on every run,** or `verify:check` fails in CI. Three things leak
run-to-run variation into a block and must be avoided:
- `hash()` of anything containing a string is randomised per run; compare `hash(x) == hash(x)` instead.
- A set of strings iterates in a different order each run; show one through `sorted(...)`.
- Writing a `.py` file and importing it in the same block is intermittently `ModuleNotFoundError`, because
  Python's per-directory import cache goes stale against the recreated in-memory workdir. Model importing
  with `exec` into a namespace dict, or use a real standard-library module.

A default object `repr` carries a memory address; the verifier normalises those to `0x...` for you, so
printing a function without calling it is safe to teach.

Run `npm run verify:lessons` (fast: skips every topic) until it reports 0 errors and 0 warnings.

## Verify (mandatory)
Run `npm run verify -- --topic <topic-id>` until it reports zero errors. It checks your content against the schema rules, runs every solution against its tests in real Python (Pyodide, Python 3.14), checks mutants/distractors/buggy versions fail as intended, and writes `src/content/generated/<topic-id>.json` (plus `generated/experiments/<topic-id>.json` if you wrote experiments). Also run `npx tsc --noEmit -p .` and fix type errors in your folder. If the verifier command does not exist yet, wait by working on content quality, then retry. Report the final verifier output summary in your last message.
