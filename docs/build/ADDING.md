# Adding a unit, a topic or a lesson

Every path in PyLadder owes a student the same things: a way in and a way back, lessons, questions that say
how hard they are, quizzes and a mock final, a Progress page, and the app's hover and finish looks. This file
is the list, where each thing lives, and what fails if it is missing. Read it before adding anything that a
student will reach from the icon bar. How to *write* the content is in `CONTENT.md`; the architecture is in
`CONTRACTS.md`; the look is in `DESIGN.md`.

## What every unit gives a student

| A student gets | CITS1401 (Python) | STAT2402 (R) | Checked by |
|---|---|---|---|
| A way in, and a way back | the first-visit chooser (`UnitChooser.tsx`) and the title bar switch (`UnitSwitch.tsx`), both listing `UNIT_IDS` | same | `checkUnitChooser`; `checkStatPath` switches there and back |
| Its own home | `Landing` (ladder, Today, badges) | `StatHome.tsx` (next lesson, mock final, the path with quiz bests) | `checkStatPath` |
| An icon bar in one shared order | `NAV` in `ActivityBar.tsx` | `STAT_NAV` = `NAV` filtered and relabelled, never written out | `checkStatPath` compares the order |
| Lessons in its language | `lessons/foundations`, `core`, `advanced` | `lessons/stat2402` | the verifier runs every block; `TRACK_LANG` picks the language |
| Questions with a difficulty | `diff` on every question, mix per topic in the table in `CONTENT.md` | `diff` on every question, at least one easy, medium and hard per lesson | the verifier |
| Practice, quizzes, a mock final | topic tests, a custom practice test, the eight-slot mock (`ExamPractice`, `TopicTest`) | a quiz per lesson, a practice test, a mock final of 100 marks in two hours (`StatExams`, `StatQuiz`) | smoke; `checkStatExams` |
| Results kept | `attempt`, `test_result` events | `stat_test` events | `validate.ts` `sanitizeEvent` and its tests |
| A Progress page at `#/report` | `Report` (strengths, topics by difficulty, mistakes, readiness, sessions) | `StatProgress` (strengths, lessons by difficulty, kinds, papers) | `checkReportSections`; `checkStatExams` |
| Its work elsewhere acknowledged | `UnitElsewhere` at the foot of each Progress page | same | `checkStatExams` |
| A streak that counts it | `streak.ts` `COUNTS` | `stat_test` and `lesson_done` are in `COUNTS` | `streak` tests |
| The hover on every card | `src/styles/spotlight.css` + `SPOTLIGHT_SELECTOR` | same lists | `spotlight.test.ts` |
| Finished looks finished | ink-filled tile, solid check | ink-filled step, solid check | `DESIGN.md`, by eye in `npm run shots` |
| Search | the palette's pages, topics, questions, reference | the palette's STAT2402 pages and lessons | smoke |

Not yet on the STAT2402 side, so not free for a new unit either: badges (`achievements.ts` counts CITS1401
work only), the Review queue, the run-in (`#/plan`), and the glossary and reference (both Python). Say so
plainly in the unit's home rather than linking to a CITS1401 page.

## Difficulty, in one place

Every question in every unit carries `diff: 'easy' | 'medium' | 'hard'`, on one rubric (`DIFF_LEGEND` in
`src/ui/components/Chip.tsx`, which is also the tooltip a student sees):

- **easy**: one idea used as taught, under 2 minutes;
- **medium**: two ideas together or one twist, 2 to 6 minutes;
- **hard**: needs planning or has a trap in it, 6 to 15 minutes.

Judge by what the student must do, not by the marks. Where it shows: `DiffChip` pips on every question, the
topic page's filter (CITS1401), the quiz page's mix and easy-first order and the practice test's difficulty
choice (STAT2402), the Easy / Medium / Hard columns of both Progress pages, and the mock papers' preference
for medium and hard. A new question schema without `diff`, or a verifier that does not require it, is a
bug.

## Adding a lesson to STAT2402

1. Write `src/content/lessons/stat2402/<id>.ts` (rules: "STAT2402 lessons (R)" in `CONTENT.md`). Its `order`
   places it on the path.
2. Write `src/content/stat2402/questions/<id>.ts`: at least six questions, every one with `diff`, at least one
   of each level ("STAT2402 exam questions" in `CONTENT.md`).
3. `npm run verify:lessons` until clean, then `npm run verify` for the generated indexes.

Nothing else to wire. The home path, the library, the lesson's quiz, the practice test's lesson tiles, the
mock final (one question from every lesson) and the Progress rows all read `lessonsInTrack('stat2402')`.
The smoke counts lessons from the generated index, so a lesson that fails to render fails the smoke.

## Adding a topic to CITS1401

1. Add the id to `TOPIC_IDS` (`src/content/ids.ts`) and its entry to `TOPICS` (`src/content/topics.ts`):
   order, short name, concepts, `unitRef`, and the unlock `minimum`.
2. Write `src/content/topics/NN-<id>/` as `CONTENT.md` "Files" describes: scenarios, cheat sheet, worked
   example, common mistakes, optional experiments. Every question has `diff`; hit the topic's row of the mix
   table (questions, easy/medium/hard, formats). A paper-mode `write` question may claim an `examSlot`.
3. Write its lesson, `src/content/lessons/core/core-<id>.ts`.
4. `npm run verify -- --topic <id>` until clean.

The ladder tile, the unlock rule, the topic test, the report's topic row and difficulty columns, Review and
the run-in all derive from `TOPICS` and the question index.

## Adding a unit

In this order. Each step names what to generalise, because STAT2402 was built as the second unit and some
of it still assumes there are exactly two.

1. **Name it.** `src/content/units.ts`: a `UnitId`, an entry in `UNIT_IDS` and `UNITS` (code, full name,
   one-sentence blurb, language). The chooser and the title bar switch list `UNIT_IDS`, and `validate.ts`
   accepts any `isUnitId`, so it appears in both and survives an export.
2. **Give it tracks.** `src/content/lessonSchema.ts`: add to `TRACKS`, `TRACK_UNIT` and `TRACK_LANG`.
   `visibleTracks()` is the one rule for who sees what; do not add a second.
3. **Give it a runtime** if the language is new: a driver shared by the verifier and the browser (as
   `src/runtime/r/driver.ts` is), a sandbox that never shares the app's origin, and a smoke check proving the
   sandbox cannot read IndexedDB. See `SECURITY.md` and the R rules in `CLAUDE.md`.
4. **Write the content**: lessons, then a question bank whose schema requires `diff` and a verifier check
   that every lesson has one of each level (copy `scripts/verify/statQuestions.ts`).
5. **Exams.** Reuse the STAT2402 runner (`src/engine/statExam.ts`, `src/ui/stat/`) rather than copying it.
   Today `StatHome`, `StatExams`, `StatProgress` and `UnitElsewhere` call `lessonsInTrack('stat2402')`
   directly, and the `stat_test` event does not say which unit it belongs to: pass the track in, and add a
   new event type (or a `unit` field, validated in `validate.ts`) rather than guessing the unit from lesson
   ids. The event log is append-only; never rewrite old events.
6. **Home, bar and routes.** Filter `NAV` in `navFor()` so the destinations every unit has keep one order.
   `App.tsx` picks the screen for `#/`, `#/exam` and `#/report` by unit; `routeSurvivesUnitSwitch` in
   `router.ts` lists the pages every unit has; `crumbsFor` in `TitleBar.tsx` names them; `CommandPalette.tsx`
   has a branch per unit. `UnitElsewhere` picks "the other unit" as whichever one is not current, so with a
   third unit it must list every other unit that has work.
7. **Progress.** Totals, strengths and what to work on next, one row per lesson or topic with marks by
   difficulty, marks by kind of question and by difficulty, past papers, and a print button. Build it from
   the event log in a pure `src/engine/` module with tests, as `statProgress.ts` is.
8. **Look.** Every new card-like surface joins every selector list in `spotlight.css` and
   `SPOTLIGHT_SELECTOR`; tokens only; finished is ink-filled with a solid check.
9. **Checks.** In `scripts/lib/checks.ts` (shared by `smoke.ts` and `check-live.ts`): the home, the bar and
   its order, every lesson walked, the runtime and its isolation, a quiz and a mock final sat, the Progress
   page counting them, and the unit switch there and back. Add shots to `scripts/shots.ts`, seeding history
   with `writeSeed`'s `extra` so the smoke itself still starts from nothing.
10. **Docs.** A rule and map rows in `CLAUDE.md`, an authoring section in `CONTENT.md`, and a column in the
    table at the top of this file.
