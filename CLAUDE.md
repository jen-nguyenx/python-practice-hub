# PyLadder — CLAUDE.md

Python learning and practice app for first-year UWA CITS1401 students: a lesson library in three tracks (foundations, the 13 unit topics, and going further), 13 unlockable topics, 278 questions in 12 formats, real Python 3.14 in the browser (Pyodide), a Monaco editor, hints and answers, a Playground, interactive "what if" experiments, a searchable reference of runnable snippets, a review queue, an error decoder, topic tests, a custom timed practice test, a mock final exam (eight slots, 100 marks, two hours), and reports.

## Commands
```bash
npm run dev                          # http://localhost:5173 (never open index.html from the file system)
npm run typecheck                    # tsc --noEmit (TypeScript 7)
npm test                             # vitest: graders, progress, report, store, harness, UI logic
npm run verify -- --topic <id>       # run one topic's content in real Python; rewrites src/content/generated/<id>.json
npm run verify                       # all topics + lessons + generated indexes
npm run verify:lessons               # lessons and the reference only (skips all 13 topics; fast while writing one)
npm run verify:check                 # CI: fail if generated files are stale
npm run build && npm run smoke       # production build + Chrome smoke test (system Chrome, ~4 min)
npm run gate                         # typecheck + test + verify:check + build + smoke, in that order
npm run check:live                   # the same user-facing checks against the deployed site (~40 s, no build)
npm run shots                        # screenshots of named parts of the app, seeded with practice history
npm run shots -- --list              # the names; --only skills,calibration for just those
```
Do not write a throwaway Playwright script to look at the app or to check a deploy — add a check to
`scripts/lib/checks.ts` (shared by smoke and check:live) or a shot to `scripts/shots.ts`, and rerun it.
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (typecheck, test, verify:check, build).

## Stack
Vite 8, TypeScript 7 (erasable syntax only, `verbatimModuleSyntax`, import local files with extensions), Preact 10 + @preact/signals, monaco-editor 0.56 (slim import list in `src/ui/editor/monacoFeatures.ts`, `@monaco/*` alias to `node_modules/monaco-editor/esm/vs`), Pyodide 314.0.7 from jsdelivr in a module worker; the `pyodide` npm package runs the same harness in Node for the verifier and tests.

## Map
| Path | What |
|---|---|
| `src/content/ids.ts`, `schema.ts`, `topics.ts` | Contracts: id catalogues, question schema, topic order + unlock minimums |
| `src/content/lessonSchema.ts`, `lessons/` | Lesson contract and content: `src/content/lessons/<track>/<id>.ts`, one file per lesson |
| `src/content/topics/NN-id/` | Topic content (cheat sheet, worked example, common mistakes, scenarios) |
| `src/content/generated/` | Verifier output (expected outputs, trace rows, real exceptions, question index, experiment runs). Never hand-edit |
| `src/content/experiments.ts` | "What if" helpers: combinations, template filling, output diffing. UI in `src/ui/shell/topic/WhatIf.tsx` |
| `src/runtime/python/harness.py` `probe()` | Verifier-only: run code, then evaluate expressions in the namespace it left, so a picture is drawn from real Python |
| `src/content/mistakes.ts`, `patterns.ts` | Mistake catalogue (labels, explanations, runtime matchers) and best-practice cards |
| `src/runtime/python/` | Grading harness (`_pl` package): sandboxed runs, tests, AST checks, tracer |
| `src/runtime/pyWorker.ts`, `pyClient.ts` | Browser worker + client (queue, watchdog, respawn) |
| `src/engine/` | Pure logic: `grade.ts`, `progress.ts` (unlock rule), `report.ts`, `review.ts` (spaced repetition), `concepts.ts` (skill strength), `calibration.ts` (sure vs right), `streak.ts`, `traceback.ts` |
| `src/store/` | IndexedDB event log, snapshots, scratch files, settings (localStorage), export/import |
| `src/app/` | App shell, hash router, singletons (`services.ts`), `markTopicOpened` |
| `src/ui/screens/` | Landing, TopicPage, LessonsIndex, LessonReader, TopicLesson, QuestionPage, Playground, Reference, Review, DecodeError, Report, TopicTest, ExamPractice, Settings |
| `src/content/recipes/`, `recipeSchema.ts` | The reference: one file per area, every snippet run by the verifier |
| `src/content/conceptWords.ts` | Concept tags in a student's words; nothing shows a raw tag |
| `src/ui/lesson/steps.ts` | Derived per-topic steps, the fallback when a topic has no authored lesson yet |
| `src/ui/lesson/LessonBlocks.tsx` | Renders one lesson block. Decides layout only; never decides what Python does |
| `src/ui/formats/read|code/` | The 12 question-format components; `registry.ts` maps format → component |
| `src/ui/workbench/`, `src/ui/editor/` | Question controller pieces, panels, hints, answers; Monaco + textarea editors |
| `src/ui/report/`, `src/ui/testmode/` | Report sections; test runner and question selection |
| `scripts/verify-content.ts`, `scripts/verify/` | Content verifier |
| `scripts/lib/browser.ts`, `lib/checks.ts` | Browser plumbing (Chrome, preview server, seeded history, tour) and the checks smoke and check:live share |
| `scripts/smoke.ts`, `check-live.ts`, `shots.ts` | The three browser runners: full local walk, deployed-site check, screenshots |
| `docs/plan/PLAN.md` | Product plan (§0 amendments override the rest) |
| `docs/build/CONTRACTS.md` | Architecture, event logging, ownership rules |
| `docs/build/CONTENT.md` | How to write questions (mix table, quality bar, concept order) |

## Rules that matter
- **Unlock rule** (`src/engine/progress.ts`): topic 1 always open; topic N+1 unlocks when topic N was opened and its `minimum` is met (questions solved without revealing the answer; hints are fine; `code` of them must be code formats), or its topic test was passed, or Settings "Unlock all topics" is on.
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
- Test mistake tags are logged only when at least one test passes and no root-cause detection (print_vs_return etc.) explains the failures (`addOutcomeMistakes` in `grade.ts`).
