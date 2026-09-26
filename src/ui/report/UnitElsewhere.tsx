// The other unit's work, at the foot of each unit's progress page. One browser keeps one event log, so a
// student who studies both CITS1401 and STAT2402 has all of it saved already; each unit's page counts only
// its own. This says the rest is there and switches to it, and says nothing to a student with no work
// in the other unit.
import type { AppEvent } from '../../engine/types.ts';
import { store } from '../../app/services.ts';
import { LESSON_BY_ID, lessonsInTrack } from '../../content/lessons/index.ts';
import { TRACK_UNIT } from '../../content/lessonSchema.ts';
import type { UnitId } from '../../content/units.ts';
import { UNITS } from '../../content/units.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { plural } from './format.ts';

/** What the other unit's work amounts to, in a phrase, or null when there is none. */
export function elsewhereSummary(events: readonly AppEvent[], other: UnitId): string | null {
  const read = new Set<string>();
  for (const e of events) {
    if (e.type !== 'lesson_done') continue;
    const l = LESSON_BY_ID[e.lessonId];
    if (l && TRACK_UNIT[l.track] === other) read.add(e.lessonId);
  }
  if (other === 'stat2402') {
    const papers = events.filter((e) => e.type === 'stat_test').length;
    if (!read.size && !papers) return null;
    const total = lessonsInTrack('stat2402').length;
    return [
      read.size ? `${read.size} of ${total} R lessons read` : '',
      papers ? `${plural(papers, 'quiz or paper', 'quizzes and papers')} sat` : '',
    ].filter(Boolean).join(', ');
  }
  const solved = new Set<string>();
  for (const e of events) if (e.type === 'attempt' && e.correct && !e.revealed) solved.add(e.qid);
  const tests = events.filter((e) => e.type === 'test_result').length;
  if (!read.size && !solved.size && !tests) return null;
  return [
    solved.size ? `${plural(solved.size, 'Python question')} solved` : '',
    read.size ? `${plural(read.size, 'lesson')} read` : '',
    tests ? `${plural(tests, 'test')} taken` : '',
  ].filter(Boolean).join(', ');
}

export function UnitElsewhere({ current }: { current: UnitId }) {
  const other: UnitId = current === 'stat2402' ? 'cits1401' : 'stat2402';
  const summary = elsewhereSummary(store.events.value, other);
  if (!summary) return null;
  const code = UNITS[other].code;
  return (
    <section class="rp-card rp-elsewhere rp-no-print" aria-labelledby="rp-elsewhere-h">
      <div class="rp-elsewhere-text">
        <h2 id="rp-elsewhere-h" class="rp-card-title sm">Your {code} work is here too</h2>
        <p class="rp-quiet">{summary}. It is saved in this browser alongside this unit's, and this page counts only {UNITS[current].code}.</p>
      </div>
      <Button onClick={() => { store.updateSettings({ unit: other }); window.scrollTo(0, 0); }}>
        Switch to {code} <Icon name="arrowRight" />
      </Button>
    </section>
  );
}
