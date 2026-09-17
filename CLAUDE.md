# PyLadder — CLAUDE.md

Python practice app for first-year UWA CITS1401 students: 13 unlockable topics, 155 questions in 12 formats, real Python 3.14 in the browser (Pyodide), a Monaco editor, hints and answers, a Playground, a mid-semester practice test, topic tests, and reports.

## Commands
```bash
npm run dev                          # http://localhost:5173 (never open index.html from the file system)
npm run typecheck                    # tsc --noEmit (TypeScript 7)
npm test                             # vitest: graders, progress, report, store, harness, UI logic
npm run verify -- --topic <id>       # run one topic's content in real Python; rewrites src/content/generated/<id>.json
npm run verify                       # all topics + question-index.json
npm run verify:check                 # CI: fail if generated files are stale
npm run build && node scripts/smoke.ts   # production build + Chrome smoke test (system Chrome)
```
Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml` (typecheck, test, verify:check, build).

## Stack
Vite 8, TypeScript 7 (erasable syntax only, `verbatimModuleSyntax`, import local files with extensions), Preact 10 + @preact/signals, monaco-editor 0.56 (slim import list in `src/ui/editor/monacoFeatures.ts`, `@monaco/*` alias to `node_modules/monaco-editor/esm/vs`), Pyodide 314.0.7 from jsdelivr in a module worker; the `pyodide` npm package runs the same harness in Node for the verifier and tests.

## Map
| Path | What |
|---|---|
| `src/content/ids.ts`, `schema.ts`, `topics.ts` | Contracts: id catalogues, question schema, topic order + unlock minimums |
| `src/content/topics/NN-id/` | Topic content (cheat sheet, worked example, common mistakes, scenarios) |
| `src/content/generated/` | Verifier output (expected outputs, trace rows, real exceptions, question index). Never hand-edit |
| `src/content/mistakes.ts`, `patterns.ts` | Mistake catalogue (labels, explanations, runtime matchers) and best-practice cards |
| `src/runtime/python/` | Grading harness (`_pl` package): sandboxed runs, tests, AST checks, tracer |
| `src/runtime/pyWorker.ts`, `pyClient.ts` | Browser worker + client (queue, watchdog, respawn) |
| `src/engine/` | Pure logic: `grade.ts`, `progress.ts` (unlock rule), `report.ts` |
| `src/store/` | IndexedDB event log, snapshots, scratch files, settings (localStorage), export/import |
| `src/app/` | App shell, hash router, singletons (`services.ts`), `markTopicOpened` |
| `src/ui/screens/` | Landing, TopicPage, QuestionPage, Playground, Report, TopicTest, MidsemTest, Settings |
| `src/ui/formats/read|code/` | The 12 question-format components; `registry.ts` maps format → component |
| `src/ui/workbench/`, `src/ui/editor/` | Question controller pieces, panels, hints, answers; Monaco + textarea editors |
| `src/ui/report/`, `src/ui/testmode/` | Report sections; test runner and question selection |
| `scripts/verify-content.ts`, `scripts/verify/` | Content verifier |
| `docs/plan/PLAN.md` | Product plan (§0 amendments override the rest) |
| `docs/build/CONTRACTS.md` | Architecture, event logging, ownership rules |
| `docs/build/CONTENT.md` | How to write questions (mix table, quality bar, concept order) |

## Rules that matter
- **Unlock rule** (`src/engine/progress.ts`): topic 1 always open; topic N+1 unlocks when topic N was opened and its `minimum` is met (questions solved without revealing the answer; hints are fine; `code` of them must be code formats), or its topic test was passed, or Settings "Unlock all topics" is on.
- **Everything is derived from the append-only event log** (`src/engine/types.ts` `AppEvent`). Add a new event type rather than mutating state.
- **Content changes must pass the verifier** with 0 errors: solutions pass tests in Pyodide, buggy variants and distractors fail tagged tests, read-format answers are generated not typed.
- **Styling uses tokens only** (`src/styles/tokens.css`), light on `:root`, dark via `prefers-color-scheme` or `data-theme`. No gradients, no purple (hue 250–320), no emoji icons, radius ≤ 8px. Plain student-facing words; never show internal ids.
- **Never `innerHTML`**. Render Md strings with `Markdown`, code with `CodeBlock`.
- Test mistake tags are logged only when at least one test passes and no root-cause detection (print_vs_return etc.) explains the failures (`addOutcomeMistakes` in `grade.ts`).
