# Writing PyLadder content

You are writing practice material for first-year UWA students in CITS1401 (Computational Thinking with Python) who are revising for the **mid-semester test** and later the closed-book final exam. Read `src/content/schema.ts` (the type contract) and `src/content/ids.ts` (allowed ids) first. Unit research: `docs/plan/research/cits1401-curriculum.json`, `docs/plan/research/curriculum-design.json` (your topic's objectives, sample questions, mistakes), `docs/plan/research/pedagogy.json`.

## Files
Your folder: `src/content/topics/NN-<topic-id>/`.
- `index.ts` default-exports a `Topic` (`import type { Topic } from '../../schema.ts'`). Replace the stub.
- One file per scenario: `s1-<slug>.ts` exporting a `Scenario`; `index.ts` imports them WITH `.ts` extensions.
- `cheatsheet` and other Md strings may live in `cheatsheet.ts`. Content files must import only `../../schema.ts` / `../../ids.ts` types (with `import type`). No Vite-only imports, no `?raw`, no JSON imports. Node runs these files directly.
- Never edit files outside your folder. Never hand-edit `src/content/generated/**` (the verifier writes it).

## Ids
- Scenario id: `tNN-sK` (NN = topic number from `src/content/topics.ts`, K = 1..4). Question id: `tNN-sK-qM`. Ids are unique and stable.

## Volume and mix (per topic)
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

3 or 4 scenarios per topic, 3-5 questions each, ordered read → repair → write inside a scenario. Mark about two thirds `core: true`, including at least 3 code-format questions (cloze, parsons, fixBug, write, refactor, testWriter) so the topic minimum (see `minimum` in `src/content/topics.ts`) is reachable using core questions alone.

## Quality bar
- **Real, varied contexts.** Mix Perth/UWA life (Transperth, SmartRider, Rottnest ferry, Kings Park, Optus Stadium, Fremantle markets, the Swan River, Reid Library, UWA grades HD/D/CR/P/N, BOM weather, WACA cricket scores, Perth Scorchers, quokkas) with universal ones (receipts, playlists, game scores, sensor readings, student marks). Do not reuse the same context twice in one topic. Names of people: diverse and plausible.
- **Write like a good tutor, not a marketing page.** Short, specific, concrete. No filler ("Let's dive in", "unlock your potential"), no emoji, no exclamation marks.
- **Every question teaches one thing** and its `detects` lists the misconceptions it can reveal. MCQ distractors, predict `mutants`, Parsons distractors and test `tag`s must correspond to REAL beginner mistakes from `MISTAKE_IDS`.
- **Hints**: tier 1 nudges toward the key idea without giving it away; tier 2 gives the plan in words (subgoals); tier 3 gives partial code or the key line. Never paste the full solution into a hint.
- **Solution**: `explanation` walks through the answer line by line in plain language. `code` is REQUIRED for cloze, parsons, fixBug, write, refactor and testWriter.
- **Prompts state the exact return type and format**: "return a tuple (lowest, highest)", "round to 2 decimal places", "return None for an empty list", "print each on its own line".
- **Tests**: every code question has at least 2 visible and 2 hidden tests. Hidden tests cover edge cases (empty input, zero, negative, boundary, duplicate, single element, uppercase) and carry a `tag` when they expose a specific mistake. Use `cmp: 'float'` whenever the expected value contains a float. Use `argsUnchanged` with `setup` when the function must not mutate its input.
- **Paper items** (`write` with `mode: 'paper'`, `marks` 5-20) mimic the closed-book final: a function spec, no Run button. Keep them solvable by hand in 5-15 minutes.
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

## Verify (mandatory)
Run `npm run verify -- --topic <topic-id>` until it reports zero errors. It checks your content against the schema rules, runs every solution against its tests in real Python (Pyodide, Python 3.14), checks mutants/distractors/buggy versions fail as intended, and writes `src/content/generated/<topic-id>.json`. Also run `npx tsc --noEmit -p .` and fix type errors in your folder. If the verifier command does not exist yet, wait by working on content quality, then retry. Report the final verifier output summary in your last message.
