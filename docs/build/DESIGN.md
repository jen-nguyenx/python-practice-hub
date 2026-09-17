# PyLadder design (current direction, 18 Sep 2026)

Decisions the student made, in order (later ones win):
1. Rejected the first design: bland, cluttered, unbalanced, wrong colours and fonts.
2. Chose a dark IDE workspace, then said an in-progress version was too crowded.
3. **Approved the calm workspace mockup** `docs/build/design-mock.html` (screenshots: `docs/build/reference/approved-mock-home.png`, `approved-mock-coding.png`, `approved-mock-mcq-light.png` (these show the old yellow accent: IGNORE the yellow, use black/white)). **Keep its frame: the thin icon bar down the left side, the slim title bar, the status bar, and its calm spacing.**
4. **Likes how their own design files organise the code questions** (`docs/build/reference/question-write-code.png`, `question-parsons.png`, `question-predict-light.png`, `question-predict-dark.png`) and some of their colouring (warm paper neutrals, dark editor card, amber hints, fonts).
5. **Hates green. Chose black-and-white accents:** near-black primary buttons in light mode, white primary buttons in dark mode, grey/ink progress. No green anywhere except inside their logo.
6. Supplied the logo `pyladder-logo.svg` (also `public/pyladder-logo.svg`). Use it unchanged as the logo mark and favicon.

Tokens: `src/styles/tokens.css`. Fonts: `--display` Bricolage Grotesque (headings), `--sans` Atkinson Hyperlegible Next (body), `--mono` JetBrains Mono (code, labels, numbers).

## Colour roles
- **Accent presets (the student asked for a choice of two-colour accents):** Settings > Appearance > Accent colours offers Blue + Gold (default, the student's choice), Mono, Navy + Coral, Ink + Tangerine. Hover: the cursor spotlight rim from Jen's landing page (src/ui/effects/spotlight.ts + src/styles/spotlight.css) glows --accent-2 at the pointer and fades out through --accent; add new card-like surfaces to its selector list. Stored as `settings.accent`, applied as `<html data-accent>`. Every screen must use `--accent` for the primary button (and `--accent-soft` / `--accent-line` for selected tints) and `--accent-2` (via `--progress`) for progress bars and "you are here" markers, so all presets work automatically. Never hard-code accent colours.
- Ground: warm paper `--bg` with white cards in light; neutral near-black greys in dark.
- **Primary action** (one per region): `--accent` fill with `--on-accent` text (black button in light, white button in dark). Hover `--accent-hover`.
- **Progress bars**: `--progress` on `--progress-track`. Current/selected rows: `--accent-soft` background, `--accent-line` border.
- **Correct / passed**: ink (`--ok`) with a check icon and neutral `--ok-soft` tint. **Wrong / failed**: `--bad` red. **Hints / help**: `--hint` amber. **Links, focus ring, reading-format chips**: `--blue`.
- Difficulty: 1-3 small pips in `--text-muted`, never coloured.
- Code editor: dark in both themes (`--editor-*`, VS Code Dark+ syntax colours).
- No gradients, no glow, no emoji icons.

## Frame (from the approved mockup)
```
┌ title bar 48px (--panel): [logo] breadcrumb ··········· [⌕ Go to question or topic ⌘K] ● Python ready  [theme] ┐
├ icon bar 52px │ main (--bg), scrolls                                                                            │
│ (--panel)     │                                                                                                 │
│ Topics        │                                                                                                 │
│ Playground    │                                                                                                 │
│ Mid-sem test  │                                                                                                 │
│ Report        │                                                                                                 │
│ (spacer)      │                                                                                                 │
│ Settings      │                                                                                                 │
└ status bar 28px (--panel), mono 12px: ● Python 3.14 ·········································· Week 8 · exams in 38 days ┘
```
- The icon bar sits down the LEFT side (as in the mockup). Icons 20px, muted; the active item is `--text` with a 2px `--accent` bar on its left edge; tooltips and aria-labels; aria-current.
- Title bar: logo (32px, from pyladder-logo.svg, unchanged colours) at the left edge above the icon bar column, then a breadcrumb of the route (e.g. "For loops / Jacob's Ladder / Stair count"), a search-field style button opening the command palette (Cmd/Ctrl+K, Cmd/Ctrl+P: topics, questions, actions), runtime state, theme toggle.
- Status bar: runtime on the left; "Week N · exams in N days" on the right from the CITS1401 S2 2026 calendar (week 1 = Mon 20 Jul; study break week of 31 Aug; week 12 = week of 12 Oct; study break 19 Oct; exams 26 Oct to 6 Nov). Question pages may add "Ln, Col".
- No explorer sidebar. No top text navigation.
- Contract: html/body never scroll; `main.app-main` scrolls; `main[data-fill]` (routes in `FILL_ROUTES`, or while the `mainFill` signal is true) has no padding and no scroll and its child fills it.

## Home (from the approved mockup, monochrome)
Mono eyebrow "CITS1401 · WEEK 8 · EXAMS IN 38 DAYS", one line of today's numbers (questions, minutes, new mistakes). Hero row: **Continue** card (mono CONTINUE label, "Topic · Question title" in --display 24px, meta line, black/white primary "Continue →"; "Start" for a new student) and **Mid-sem practice test** card (one sentence, secondary outline "Start test"). Then "YOUR LADDER · N of 13 open" and 13 tiles in a 4-column grid (01-08, then a "Projects and final exam" label and 09-13): number + state icon (check when minimum met, filled dot on the current topic, lock when locked), short name, 4px progress bar, "solved/total" and "min N" or "done". Current tile has an `--accent-line` border. Lock reasons in a tooltip only. Nothing else.

## Questions (organisation from the student's design files)
- **Write code / fix bug / refactor / cloze / break the code** (`question-write-code.png`): two columns ~5fr/7fr on paper. **Left white card**: mono eyebrow "TOPIC 6 · FUNCTIONS" + "Core" pill; title in --display 28px; prompt; requirements as short bullets; an example block on `--bg-inset` written as a Python shell session (`>>> call` then result, built from visible tests); pinned to the bottom a **Hints** section ("Hints" + "1 of 3 revealed", revealed hints as amber-tint callouts labelled HINT 1, secondary "Show hint 2", text link "Reveal full answer"). **Right**: a dark editor card (tab "solution.py" with an ink/white underline, mono runtime label "Python 3.14 · runs in your browser", Monaco, a bottom bar inside the card: primary "▶ Run tests", secondary "Reset code", mono "Ctrl + Enter" hint; Submit for hidden tests stays available). **Below it a white Tests card**: "Tests" + status chip ("3 of 4 passing"), rows with round ✓/✕ icons (✓ in ink, ✕ in red) and mono "call → expected"; failing rows tinted `--bad-soft` with "got X"; hidden tests show their label only; Output / Problems / Explain as quiet tabs in the card when relevant.
- **Parsons** (`question-parsons.png`): top white card (title, paragraph, shell example on the right); two columns: Blocks tray (sunken, dashed, "N left") and Your program ("1 indent = 4 spaces", indent guides, dashed drop zones); bottom bar: "Show hint" + "N of 3 hints used" left, "Attempt N" + primary "Check order" right.
- **Reading formats: predict, MCQ, select all, trace, twins, error translator** (`question-predict-*.png`): two columns. Left: mono "TOPIC 03 · STRINGS" + "Question 7 of 12" + a segmented progress bar; blue format chip; the question title as a big --display heading; one instruction sentence; code block; answer area; button row: primary "✓ Check answer", amber-tint "Show hint", text link "Skip for now"; quiet "3 hints available" row. Right: mono "SCRATCH EDITOR" + "Nothing leaves your browser" and a dark editor card (main.py tab, runtime label, small "▶ Run", OUTPUT area) preloaded with the question's code.
- Question header inside the page (below the global title bar): prev/next and "Question N of M" dots may live in the page's first row; the global frame stays visible.
- Result feedback: an inline card (neutral with ✓ "Correct" in ink, or red-tint "Not quite") with one sentence, credited score, primary "Next question →" when correct.
- Stack columns under 1000px.

## Calm rules (the student twice said "too crowded")
One primary action per region; at most three regions above the fold; short copy (no paragraph over two lines in UI chrome); no boxes inside boxes; space and background steps instead of borders; details in tooltips, popovers or expandable rows. Body 15-16px, prompts 17px, headings in --display.

## Other screens
Same frame and language: topic page (title, progress card, tabs with ink underline, question rows like the ladder, minimal filters), Playground (full-height dark editor card with file tabs, Run, bottom output panel), tests (setup card, running test with dots + mono timer, results cards), reports (stat numbers, strengths / work-on-next cards, grey heat table), settings (editor-style list).
