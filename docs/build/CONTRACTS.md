# PyLadder build contracts

Read this before writing code. The product plan is `docs/plan/PLAN.md` (read §0 amendments first; they override later sections). The approved decisions:
- Unlock: topic 1 always open. Topic N+1 unlocks when topic N has been **opened** AND its **minimum** is met (`minimum` in `src/content/topics.ts`), or its topic test was passed, or Settings "Unlock all topics" is on.
- Order: variables → if/else → for loops → functions → strings → lists → while → dicts → files → exceptions → functions part 2 → project simulator → recursion.
- Stack: Vite 8 + TypeScript 7 + **Preact 10 with @preact/signals** (JSX, function components, hooks). Monaco 0.56 (npm). Pyodide 314.0.7 (Python 3.14) from jsdelivr in a module worker; `pyodide` npm package in Node for verification.
- The student needs this for **mid-semester revision now**. Correctness and a working core beat extra polish.

## Commands
- `npx tsc --noEmit -p .` typecheck (whole project; fix only errors in files you own, ignore others' in-progress errors).
- `npx vitest run <path>` run your tests only.
- `npx vite build` production build.
- `npm run verify -- --topic <topic-id>` verify one topic's content and regenerate its generated JSON (available once the harness agent lands it).
- Do NOT run `npm install`. All dependencies are installed: preact, @preact/signals, monaco-editor, vite, typescript, vitest, pyodide, playwright-core, fake-indexeddb, jsdom, @types/node. If you truly need another package, say so in your final report instead.
- Do NOT start long-running dev servers without killing them. Do NOT commit to git.

## Code rules
- TypeScript strict. `verbatimModuleSyntax` is on: type-only imports must use `import type`. Import local files WITH their extension (`./foo.ts`, `./Bar.tsx`).
- No `enum`, no `namespace`, no parameter properties (erasableSyntaxOnly).
- Never use `innerHTML` / `dangerouslySetInnerHTML`. Render text with JSX. Use `Markdown` for Md strings and `CodeBlock` for static code.
- Singletons: `import { store, py } from '../app/services.ts'`. Never construct your own store or Python client.
- Routes: use `href.*` and `navigate()` from `src/app/router.ts`.
- Styling: CSS files next to your components, imported from your components. Use ONLY tokens from `src/styles/tokens.css` (`var(--surface)`, `var(--accent)` …). Never hard-code colours. No gradients, no purple, no glow, no shadows on flat cards, radius ≤ 8px. Every state has text or an icon, not colour alone. Respect reduced motion (transitions ≤ 150ms, opacity/transform only).
- Plain language in the UI: "Hint 1 of 3", "Show answer", "score", "Check", "Run". Never show internal words (credit, channel, ladder, L4, mistake ids). Use `MISTAKES[id].label` to name mistakes.
- Accessibility is part of done: every control reachable by keyboard with visible focus, labelled inputs, `aria-live="polite"` for results and runtime status, no keyboard traps (editors: Esc then Tab leaves; document Ctrl+M in Monaco).
- Layout must work from 400px to 1600px wide.
- Shared components exist in `src/ui/components/`: `Button`, `LinkButton`, `Chip`, `DiffChip`, `FormatChip`, `Callout`, `CodeBlock`, `Markdown`, `Icon`. You may ADD components there only if you are the shell agent; others put components in their own folder.

## Ownership (edit only your files; replacing a STUB you own is expected)
| Agent | Owns |
|---|---|
| harness | `src/runtime/python/**`, `scripts/verify-content.ts`, `scripts/verify/**`, `src/content/generated/**` (tool output), `src/runtime/__tests__/harness.test.ts` |
| runtime-browser | `src/runtime/pyWorker.ts`, `src/runtime/pyClient.ts`, `src/runtime/errorMatch.ts`, `src/runtime/__tests__/client*.test.ts` |
| engine-store | `src/engine/grade.ts`, `src/engine/progress.ts`, `src/engine/report.ts`, `src/engine/**/*.test.ts`, `src/engine/util/**`, `src/store/**` (not `types.ts`) |
| shell | `src/app/App.tsx`, `src/styles/shell.css`, `src/ui/shell/**`, `src/ui/components/**` (additions), `src/ui/screens/Landing.tsx`, `TopicPage.tsx`, `Settings.tsx`, `index.html` (head only) |
| workbench | `src/ui/editor/**`, `src/ui/workbench/**`, `src/ui/formats/code/**`, `src/ui/formats/registry.ts`, `src/ui/screens/QuestionPage.tsx`, `Playground.tsx` |
| read-formats | `src/ui/formats/read/**` |
| reports-tests | `src/ui/report/**`, `src/ui/testmode/**`, `src/ui/screens/Report.tsx`, `TopicTest.tsx`, `MidsemTest.tsx` |
| catalogues | `src/content/mistakes.ts`, `src/content/patterns.ts`, `src/content/__tests__/catalogues.test.ts` |
| content-NN | `src/content/topics/NN-<id>/**` only |

Contract files that nobody edits without the lead: `src/content/ids.ts`, `src/content/schema.ts`, `src/content/topics.ts`, `src/content/index.ts`, `src/content/questionIndex.ts`, `src/content/loadIndex.ts`, `src/runtime/protocol.ts`, `src/engine/types.ts`, `src/store/types.ts`, `src/app/router.ts`, `src/app/services.ts`, `src/app/session.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/styles/components.css`. If a contract is wrong or missing something, work around it inside your files and list the needed change in your final report.

## How the pieces fit
- **Content**: `loadTopic(id)` and `loadGenerated(id)` from `src/content/index.ts`. `QUESTION_INDEX` / `QUESTION_BY_ID` from `src/content/loadIndex.ts` (generated list of every question's metadata; use it for counts on the landing page without loading content).
- **Question page** (workbench agent) = QuestionController: loads the question + generated data + draft; renders `FORMAT_COMPONENTS[q.format]` with `FormatProps`; owns hint ladder (3 tiers, gated: tier 1 after first check or 45 s; each next tier after one more check or 20 s), "Show answer" (available after 2 failed checks, or immediately with a confirm; reveals `solution.explanation` + `solution.code` and the `selfExplain` prompt), check limits from `CHECK_LIMIT` (auto-reveal when exhausted), result banner, prev/next within the topic, and event logging: on each `onCheck` append an `attempt` event (credit = score × HINT_MULTIPLIER[hintTier], 0 if revealed) and one `mistake` event per detected mistake; `hint` and `reveal` events; `markTopicOpened(topicId)`.
- **Format components** render the question body and their own Check / Run / Submit buttons, call graders from `src/engine/grade.ts`, and call `props.onCheck(result, response)`. Code formats call `py.runTests(...)` / `py.run(...)` / `py.pair(...)` and append `run` events for plain runs. When `revealed` is true they show the correct answer inline and lock input. When `locked` is true they lock input. In `mode` 'topic-test' | 'midsem' they allow one check/submit (code formats may still Run visible tests unlimited) and show no answers until the test ends (the test screen passes `revealed` at the end).
- **Graders** (`src/engine/grade.ts`) are pure and unit-tested. Read formats grade from `generated` data (no Python). Code formats grade from `TestsResult`.
- **Progress** (`src/engine/progress.ts`) derives everything from the event log: `topicProgressAll`, `questionStats`, `sessionSummaries`, `continueTarget`.
- **Reports** (`src/engine/report.ts`) → `ReportData`; UI in reports-tests.
- **Mistakes / patterns** catalogues give labels, explanations, runtime matchers and pattern cards.
- **Runtime**: `py.run`, `py.runTests`, `py.analyze`, `py.pair`; `py.status` signal for the header pill; `py.warmUp()` called at app start.
