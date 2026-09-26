# PyLadder — CLAUDE.md

Two paths in one app, chosen on the first visit: a Python path for first-year UWA CITS1401 students, and an
R path for STAT2402 (Analysis of Observations: regression and GLMs). The CITS1401 path is the bulk of it: a lesson library in three tracks (foundations, the 13 unit topics, and going further), 13 unlockable topics, 278 questions in 12 formats, real Python 3.14 in the browser (Pyodide), a Monaco editor, hints and answers, a Playground, interactive "what if" experiments, a searchable reference of runnable snippets, a review queue, an error decoder, topic tests, a custom timed practice test, a mock final exam (eight slots, 100 marks, two hours), and reports.

## Commands
```bash
npm run dev                          # http://localhost:5173 (never open index.html from the file system)
npm run typecheck                    # tsc --noEmit (TypeScript 7)
npm test                             # vitest: graders, progress, report, store, harness, UI logic
npm run verify -- --topic <id>       # run one topic's content in real Python; rewrites src/content/generated/<id>.json
npm run verify                       # all topics + lessons + generated indexes
npm run verify:lessons               # lessons, reference and glossary only (skips all 13 topics; fast while writing one)
npm run verify:check                 # CI: fail if generated files are stale
npm run build && npm run smoke       # production build + Chrome smoke test (system Chrome, ~4 min)
npm run gate                         # typecheck + test + verify:check + build + smoke, in that order
npm run check:live                   # the same user-facing checks against the deployed site (~40 s, no build)
npm run shots                        # screenshots of named parts of the app, seeded with practice history
npm run shots -- --list              # the names; --only skills,calibration for just those
node scripts/r-packages.ts [--update] # check (or refresh) the pinned R packages in public/r-packages
```
Do not write a throwaway Playwright script to look at the app or to check a deploy — add a check to
`scripts/lib/checks.ts` (shared by smoke and check:live) or a shot to `scripts/shots.ts`, and rerun it.
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (typecheck, test, verify:check, build).

## Stack
Vite 8, TypeScript 7 (erasable syntax only, `verbatimModuleSyntax`, import local files with extensions), Preact 10 + @preact/signals, monaco-editor 0.56 (slim import list in `src/ui/editor/monacoFeatures.ts`, `@monaco/*` alias to `node_modules/monaco-editor/esm/vs`), Pyodide 314.0.7 from jsdelivr in a module worker; the `pyodide` npm package runs the same harness in Node for the verifier and tests. webR 0.6.0 (R 4.6) from jsdelivr in a sandboxed iframe for STAT2402; the `webr` npm package runs the same R in Node for the verifier and tests (both pinned in `src/runtime/version.ts`).

## Map
| Path | What |
|---|---|
| `src/content/ids.ts`, `schema.ts`, `topics.ts` | Contracts: id catalogues, question schema, topic order + unlock minimums |
| `src/content/lessonSchema.ts`, `lessons/` | Lesson contract and content: `src/content/lessons/<track>/<id>.ts`, one file per lesson. Tracks: foundations, core, advanced, markets (Python), stat2402 (R); `TRACK_LANG`, `TRACK_UNIT` |
| `src/content/units.ts` | The two units, `unitOf(settings)` (unchosen means CITS1401) |
| `src/runtime/r/` | `harness.R` + `driver.ts`: runs R through R's own console, shared by the verifier (`scripts/verify/r.ts`) and the browser |
| `src/runtime/rClient.ts`, `public/r-sandbox.*` | Browser R: an opaque-origin iframe running webR, queue, watchdog. `r` in `services.ts` |
| `src/runtime/r/packages.ts`, `packages.json`, `public/r-packages/` | MASS, pscl, survival (+ Matrix, lattice): pinned by SHA-256, installed on first `library()` |
| `src/content/topics/NN-id/` | Topic content (cheat sheet, worked example, common mistakes, scenarios) |
| `src/content/generated/` | Verifier output (expected outputs, trace rows, real exceptions, question index, experiment runs). Never hand-edit |
| `src/content/experiments.ts` | "What if" helpers: combinations, template filling, output diffing. UI in `src/ui/shell/topic/WhatIf.tsx` |
| `src/runtime/python/harness.py` `probe()` | Verifier-only: run code, then evaluate expressions in the namespace it left, so a picture is drawn from real Python |
| `src/content/mistakes.ts`, `patterns.ts` | Mistake catalogue (labels, explanations, runtime matchers) and best-practice cards |
| `src/runtime/python/` | Grading harness (`_pl` package): sandboxed runs, tests, AST checks, tracer |
| `src/runtime/pyWorker.ts`, `pyClient.ts` | Browser worker + client (queue, watchdog, respawn) |
| `src/engine/` | Pure logic: `grade.ts`, `progress.ts` (unlock rule), `report.ts`, `review.ts` (which mistakes are due), `reviewSession.ts` (what a session asks), `concepts.ts` (skill strength), `calibration.ts` (sure vs right), `examPlan.ts` (the run-in), `placement.ts` (where to join the ladder), `projectBuild.ts` (a project in stages), `achievements.ts` (what is finished), `semester.ts` (the CITS1401 calendar), `streak.ts`, `traceback.ts` |
| `src/store/` | IndexedDB event log, snapshots, scratch files, settings (localStorage), export/import |
| `src/app/` | App shell, hash router, singletons (`services.ts`), `markTopicOpened` |
| `src/ui/screens/` | Landing, TopicPage, LessonsIndex, LessonReader, TopicLesson, QuestionPage, Playground, RPlayground (`#/r`), Reference, Glossary, Revision, ProjectBuild, Review, ExamPlan, Placement, DecodeError, Report, TopicTest, ExamPractice, Settings |
| `src/ui/shell/landing/UnitChooser.tsx`, `StatHome.tsx` | The first-visit "which unit?" question, and STAT2402's home |
| `src/content/statQuestionSchema.ts`, `stat2402/questions/` | STAT2402 exam questions, one file per lesson; checked by `scripts/verify/statQuestions.ts` |
| `src/engine/statExam.ts`, `src/ui/stat/`, `StatExams.tsx`, `StatQuiz.tsx` | STAT2402 exams: lesson quizzes (`#/quiz/:id`), practice test and mock final (`#/exam`) |
| `src/content/recipes/`, `recipeSchema.ts` | The reference: one file per area, every snippet run by the verifier |
| `src/content/conceptWords.ts` | Concept tags in a student's words; nothing shows a raw tag |
| `src/content/glossary.ts`, `glossarySchema.ts` | The glossary: one entry per word the course uses, each demo run by the verifier |
| `src/ui/lesson/steps.ts` | Derived per-topic steps, the fallback when a topic has no authored lesson yet |
| `src/ui/lesson/LessonBlocks.tsx` | Renders one lesson block. Decides layout only; never decides what Python does |
| `src/ui/formats/read|code/` | The 12 question-format components; `registry.ts` maps format → component |
| `src/ui/workbench/`, `src/ui/editor/` | Question controller pieces, panels, hints, answers; Monaco + textarea editors |
| `src/ui/report/`, `src/ui/testmode/` | Report sections; test runner and question selection |
| `src/ui/review/` | The review session runner: the app's own question components, dealt one at a time with instant feedback |
| `scripts/verify-content.ts`, `scripts/verify/` | Content verifier |
| `scripts/lib/browser.ts`, `lib/checks.ts` | Browser plumbing (Chrome, preview server, seeded history, tour) and the checks smoke and check:live share |
| `scripts/smoke.ts`, `check-live.ts`, `shots.ts` | The three browser runners: full local walk, deployed-site check, screenshots |
| `docs/plan/PLAN.md` | Product plan (§0 amendments override the rest) |
| `docs/build/CONTRACTS.md` | Architecture, event logging, ownership rules |
| `docs/build/CONTENT.md` | How to write questions (mix table, quality bar, concept order) |

## Rules that matter
- **Two units, two paths.** `settings.unit` is null until the home page's "Which unit are you studying?"
  is answered (changeable in Settings), and `unitOf()` treats null as CITS1401, so nothing changed for an
  existing student until they choose. Each track belongs to a unit (`TRACK_UNIT`); `visibleTracks()` is
  the one rule, and a unit sees only its own tracks (Markets belongs to neither and keeps its switch).
  STAT2402 gets its own home, a five-item bar (Home, Lessons, Exams, R Playground, Settings), an R runtime pill,
  a lessons-and-exams palette, and no tour; Python is never warmed for it. Everything CITS1401 has --
  topics, questions, tests, the run-in, the report -- is untouched and unreachable from the STAT2402 bar;
  `#/exam` shows whichever unit's exams are in force.
- **STAT2402 lessons are in R, and R's output is R's own.** The language comes from the track
  (`TRACK_LANG`), never a lesson. The verifier types each top-level expression at webR's real console and
  records what R printed, so warnings and `Error in f(x) :` reports are R's wording, not ours; the same
  driver runs a student's code in the browser. Every block starts from an empty workspace with nothing
  attached and `set.seed(2402)`, and prose never types a number R computed. Beyond base R there are only
  MASS, pscl and survival, kept in `public/r-packages/` (repo.r-wasm.org deletes old builds, so a pinned URL
  there would break) and installed the first time code calls `library()` or `pkg::`. Authoring rules:
  "STAT2402 lessons (R)" in `docs/build/CONTENT.md`.
- **STAT2402 exams are the lesson rule applied to tests.** A quiz for every lesson, a practice test and a
  mock final (100 marks, two hours) draw from `src/content/stat2402/questions/`, where every lesson must
  have at least six questions. Each shows R code with the output the verifier recorded; a number
  question's right answer is an R expression the verifier evaluates, a predict question's right choice is
  proved to be R's output, and a write question is marked by running its tests in the browser's R. Results
  are `stat_test` events. It is its own runner (`src/ui/stat/`), not the CITS1401 one: the question bank,
  the topics and the unlock rule of CITS1401 are untouched. Authoring: "STAT2402 exam questions" in
  `docs/build/CONTENT.md`.
- **Never give R the app's origin.** R runs in `public/r-sandbox.html` inside an iframe with
  `sandbox="allow-scripts"` and no `allow-same-origin`. R can run JavaScript by design (`webr::eval_js`),
  and webR needs `'unsafe-eval'` to start, so the opaque origin is the whole boundary: adding
  `allow-same-origin`, or running webR in the app's own page or a same-origin worker, would let pasted R
  read a student's IndexedDB. `checkStatPath` in `scripts/lib/checks.ts` fails the smoke if it can.
  See SECURITY.md.
- **Unlock rule** (`src/engine/progress.ts`): topic 1 always open; topic N+1 unlocks when topic N was opened and its `minimum` is met (questions solved without revealing the answer; hints are fine; `code` of them must be code formats), or its topic test was passed, or a **placement check** was answered through it (`placement` event — access only, the minimum still has to be met), or Settings "Unlock all topics" is on.
- **Everything is derived from the append-only event log** (`src/engine/types.ts` `AppEvent`). Add a new event type rather than mutating state.
- **Content changes must pass the verifier** with 0 errors: solutions pass tests in Pyodide, buggy variants and distractors fail tagged tests, read-format answers are generated not typed.
- **A lesson never states what Python does.** Every output a reader sees in `src/content/lessons/**` is
  produced by the verifier running that code (`code`, `shell` and `compare` blocks), exactly like the
  read-format answers. Never type a value, result or error message into lesson prose as fact. The
  verifier fails a shell line that calls `input()` with no `stdin`, and one that fails because an earlier
  line failed to set the name it uses -- both of those silently render fiction as though it were output.
- **Lesson mode (`#/learn/:id`) is an order over existing content, not new content.** `lessonSteps()` derives
  the sequence from the topic itself: intro, cheat sheet, worked example, one step per experiment, common
  mistakes, then practise. Steps with nothing to show are left out, so adding an experiment adds a step for
  free and no topic needs bespoke wiring. It is readable while the topic is locked, like the other reading
  surfaces, and a student who has never touched a topic is offered the lesson before a cold question.
  `#/learn/:topicId` resolves to that topic's authored lesson when one exists; the derived path is only
  the fallback while a lesson is being written.
- **"What if" experiments never run Python in the browser.** The verifier runs every combination of every
  control and writes `src/content/generated/experiments/<topic>.json`; the tab looks the answer up, so it is
  instant and works before Python starts, and it is what lets a slider redraw on every step as it is
  dragged. Keep it that way: no live runs, and no hand-written outputs. A picture is drawn from `probes`
  (Python expressions the verifier evaluates), never from JavaScript reimplementing Python's rules.
  Authoring rules are in `docs/build/CONTENT.md`.
- **Styling uses tokens only** (`src/styles/tokens.css`), light on `:root`, dark via `prefers-color-scheme` or `data-theme`. No gradients, no purple (hue 250–320), no emoji icons, radius ≤ 8px. Plain student-facing words; never show internal ids.
- **Never `innerHTML`**. Render Md strings with `Markdown`, code with `CodeBlock`.
- **Verifier-only Python stays out of the browser.** `probe()` and `repl()` live in
  `src/runtime/python/verify.py`; `PY_BROWSER_MODULES` excludes it and the glob in `sources.ts` excludes
  it too (an eager glob bundles what it matches, so filtering the list alone is not enough).
- **Never restore Python's JavaScript bridge.** `pyWorker.ts` runs `SEVER_JS_BRIDGE` after warm-up to drop
  Pyodide's `JsFinder`; without it, pasted student code can read the app's IndexedDB and post it anywhere.
  The denylist in `sandbox.py` is a teaching aid, not the boundary. `scripts/smoke.ts` fails the build if any
  of four escape routes reaches JavaScript. See SECURITY.md.
- **Treat imported files as hostile.** Everything from an export file goes through `src/store/validate.ts`:
  allowlisted fields, capped lengths and counts, clamped timestamps and ranges. Drafts are `unknown` by
  contract, so check types before using them in a component.
- **The icon bar is eight destinations, and two of them are pairs.** Reference/Glossary is "look
  something up"; the run-in/report is "how am I doing". Each keeps its own route and a `PairSwitch` at the
  top moves between them -- resist adding an eleventh tab, which is how the glossary went unfound the day
  it shipped. The bar opens to show names (`settings.navExpanded`, on by default): nobody learns ten icons.
- **A project build (`#/build/:scenarioId`) is an order over a scenario, not new content**, the same way
  lesson mode is: helpers first, then `main()`, derived from the scenario's own `write` questions
  (`projectBuild.ts`). The coding itself is handed to the question page, which already has the editor,
  the tests and the hints; `questionReturn.ts` is what brings the student back.
- **Finishing has to look like finishing.** A completed topic is ink-filled with a solid check, never a
  faded tile, and `achievements.ts` derives badges from the event log -- every rule counts something that
  only goes up, so a bad week never takes one away. Ink, never green: see docs/build/DESIGN.md.
- **Glossary words are marked where they are read** (`src/content/glossaryMatch.ts`, `TermMark`): hover,
  focus or tap gives the definition without leaving the page. Marking is deliberately shy -- only the term
  itself (never its `also` spellings, which are search aids), never a word whose everyday English sense
  would mislead (`NEVER_AUTO`: "the whole argument for functions" is not a value being passed), once per
  word per passage, at most three marks, and never inside code. An author marks an excluded word on
  purpose by writing `[[argument]]` in the prose. Off by default: pass `terms` to `Markdown`, and not
  while a test is measuring.
- **`candles` is the trading-desk chart**: one bar per period from low to high, a tick left for the open
  and right for the close (an OHLC bar). Its probe returns `[open, high, low, close]` per period and the
  verifier rejects a bar whose high and low do not contain its own open and close -- drawing one would
  invent a shape the data denies.
- **The Markets track is off by default and outside the unit.** `src/content/lessons/markets/` is
  physical commodity trading and the derivatives a producer uses -- the author's own study, not CITS1401.
  Lessons lead with a trade, never with code: an `interactive` card sets `hideProgram: true` so the model
  computes the numbers without the reader ever seeing Python. It shows only
  when `settings.showMarkets` is on: `visibleTracks()`/`isLessonVisible()` in `lessons/index.ts` are the
  one rule, and the library, the palette and the glossary all ask it. Today and the run-in never offer
  it whichever way the switch is set. Its glossary terms carry `markets: true` and are never auto-marked
  ("carry", "spot", "basis" are ordinary words in a Python lesson) -- an author writes `[[strike]]`.
  Every curve is still a `plot` of pairs Python produced; `import math` is allowed in lessons.
- **A glossary entry demonstrates rather than asserts.** Where a term is a claim about Python's
  behaviour it carries a `demo`, and the verifier runs it for the output -- the same rule as lessons and
  the reference. The verifier also refuses a definition that uses the word to define itself, and a
  `[[link]]` or `lessonId` that names something which does not exist.
- **The run-in (`#/plan`) is the only thing that plans against the calendar.** `semester.ts` knows when
  the exams are; `examPlan.ts` puts that together with how far up the ladder a student is, and says
  whether the pace they are managing matches the pace the time left demands. Every target has something
  real behind it -- a week with nothing to put in it is left empty rather than filled.
- **The report says what, Review does something about it.** A repeated mistake links to `#/review`, never
  to one question: Review deals a handful of short questions chosen from that same evidence
  (`planSession`), and only formats that grade without Python, so a session starts before the runtime has
  loaded. Nothing answered today is offered again — that tests what is still on the screen.
- Test mistake tags are logged only when at least one test passes and no root-cause detection (print_vs_return etc.) explains the failures (`addOutcomeMistakes` in `grade.ts`).
