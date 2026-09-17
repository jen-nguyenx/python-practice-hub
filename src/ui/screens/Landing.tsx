// Home (#/): "Your ladder" with a one-line summary and legend, the ladder list card on the left, and on the right
// Continue, the mid-semester practice test, this week's focus mistake and the Playground (docs/build/DESIGN.md "Home").
import { useMemo } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS } from '../../content/topics.ts';
import { currentSessionSummary } from '../../engine/progress.ts';
import type { SessionSummary } from '../../engine/progress.ts';
import type { AppEvent } from '../../engine/types.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { plural } from '../shell/format.ts';
import { continueInfo, midsemSummary, needsBackup } from '../shell/homeData.ts';
import { recentMistakes, safeQuestionStats, safeTopicProgress } from '../shell/progressData.ts';
import { BackupCard, ContinueCard, FocusCard, MidsemCard, PlaygroundCard } from '../shell/landing/HomeCards.tsx';
import type { FocusMistake } from '../shell/landing/HomeCards.tsx';
import { Ladder, LadderLegend } from '../shell/landing/Ladder.tsx';
import type { NextUp } from '../shell/landing/Ladder.tsx';
import { storeReady } from '../shell/storeReady.ts';
import '../shell/landing/landing.css';

function safeSession(events: readonly AppEvent[], sessionId: string): SessionSummary | null {
  try { return currentSessionSummary(events, sessionId); } catch { return null; }
}

/** The most repeated mistake of the last 14 days, with the topic it happened in most. */
function weeklyFocus(events: readonly AppEvent[]): FocusMistake | null {
  const top = recentMistakes(events, 14)[0];
  if (!top) return null;
  const since = Date.now() - 14 * 86_400_000;
  const byTopic = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'mistake' || e.mistake !== top.id || e.ts < since || !e.topicId) continue;
    byTopic.set(e.topicId, (byTopic.get(e.topicId) ?? 0) + 1);
  }
  let topicId: string | null = top.topicId;
  let best = 0;
  for (const [t, n] of byTopic) if (n > best) { best = n; topicId = t; }
  return { label: top.label, count: top.count, topicId };
}

function LandingSkeleton() {
  return (
    <div class="page home" aria-busy="true">
      <span class="sr-only" role="status">Loading your progress</span>
      <header class="home-head">
        <Skeleton w={220} h={36} />
        <Skeleton w={320} h={16} />
      </header>
      <div class="home-ladder card home-skel">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} class="lr"><Skeleton w={28} h={28} class="skel-round" /><Skeleton w="40%" h={14} /></div>
        ))}
      </div>
      <div class="home-cont"><div class="card home-skel-card"><Skeleton h={160} /></div></div>
    </div>
  );
}

export function Landing() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;
  // sessionId is a getter that changes after 30 idle minutes, so read it on every render.
  const sessionId = store.sessionId;

  const progress = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const stats = useMemo(() => safeQuestionStats(events), [events]);
  const info = useMemo(() => continueInfo(events, settings, progress), [events, settings, progress]);
  const session = useMemo(() => safeSession(events, sessionId), [events, sessionId]);
  const focus = useMemo(() => weeklyFocus(events), [events]);
  const midsem = useMemo(() => midsemSummary(), [events]);

  if (!ready) return <LandingSkeleton />;

  const complete = TOPICS.filter((t) => progress[t.id].state === 'completed').length;
  let answered = 0;
  for (const s of stats.values()) if (s.attempts > 0) answered++;
  const fresh = answered === 0;

  let next: NextUp | null = null;
  if (info.question) {
    const inTopic = QUESTION_INDEX.filter((q) => q.topicId === info.topic.id);
    const idx = inTopic.findIndex((q) => q.qid === info.question!.qid);
    if (idx >= 0) next = { topicId: info.topic.id, question: info.question, number: idx + 1 };
  }
  const started = !!next && (stats.get(next.question.qid)?.attempts ?? 0) > 0;

  const summary = [
    `${complete} of ${TOPICS.length} topics complete`,
    fresh ? 'no questions answered yet' : `${plural(answered, 'question')} answered`,
  ];
  if (settings.unlockAll) summary.push('all topics unlocked');

  return (
    <div class="page home">
      <header class="home-head">
        <h1>Your ladder</h1>
        <div class="home-summary-row">
          <p class="home-summary num">{summary.join(' · ')}</p>
          <LadderLegend />
        </div>
      </header>

      <div class="home-ladder">
        <Ladder progress={progress} next={next} />
      </div>

      <div class="home-cont">
        <ContinueCard info={info} next={next} progress={progress[info.topic.id]} fresh={fresh} started={started} session={session} />
      </div>

      <aside class="home-side" aria-label="Practice and focus">
        <MidsemCard summary={midsem} />
        {focus ? <FocusCard focus={focus} /> : null}
        <PlaygroundCard />
        {needsBackup(events, settings) ? <BackupCard lastExportTs={settings.lastExportTs} /> : null}
      </aside>
    </div>
  );
}
