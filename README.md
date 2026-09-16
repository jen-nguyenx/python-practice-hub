# PyLadder

Python practice for first-year UWA students taking **CITS1401 Computational Thinking with Python**.

- 13 topics from variables and if/else up to files, project rules and recursion, unlocked one after another.
- Around 155 questions in 12 formats: multiple choice, select all, predict the output, trace tables, spot the difference, error translator, fill in the blank, Parsons puzzles, fix the bug, write code (including paper-exam and CSV project styles), refactor, and break the code.
- A VS Code-style editor (Monaco) running real Python 3.14 in the browser (Pyodide). Nothing is sent to a server.
- Hints in three steps, full answers with explanations, a free-coding Playground, a mid-semester practice test and topic tests.
- Reports on strengths, weak spots, repeated mistakes and the best-practice patterns to work on.

Progress is stored only in your browser. Use Settings → Export progress to back it up.

Not affiliated with UWA. Aligned with public CITS1401 materials; check your LMS unit outline for this semester's order and rules.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

Opening `index.html` directly from the file system cannot run Python; use the dev server or the hosted site.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build into `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (graders, progress rules, reports, store, Python harness) |
| `npm run verify` | Checks every question in real Python and regenerates `src/content/generated/` |
| `npm run verify -- --topic strings` | Verify one topic |
| `npm run verify:check` | Fails if generated files are stale (used in CI) |
| `node scripts/smoke.ts` | End-to-end smoke test of a build in Chrome |

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: typecheck, tests, content verification, build, then GitHub Pages.

## Docs

- `docs/plan/PLAN.md`: the product and technical plan (read §0 amendments first).
- `docs/build/CONTRACTS.md`: architecture, ownership and interfaces.
- `docs/build/CONTENT.md`: how to write and verify questions.
