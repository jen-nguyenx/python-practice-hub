// Landing (#/): progress sentence, Continue and Mid-sem test actions, the topic ladder in two bands, and a side column
// with this session, recent mistakes, a backup reminder and the difficulty legend.
import { useMemo } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import { continueTarget, currentSessionSummary } from '../../engine/progress.ts';
import type { SessionSummary, TopicProgress } from '../../engine/progress.ts';
import type { TopicId } from '../../content/ids.ts';
import { Icon } from '../components/Icon.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { plural, relativeDay } from '../shell/format.ts';
import { DIFF_COUNTS, attemptCount, lastOtherSessionTs, recentMistakes, safeQuestionStats, safeTopicProgress } from '../shell/progressData.ts';
import { BackupReminder, LegendCard, MistakesCard, SessionCard } from '../shell/landing/SideCards.tsx';
import { TopicCard } from '../shell/landing/TopicCard.tsx';
import { storeReady } from '../shell/storeReady.ts';
import '../shell/landing/landing.css';

const BACKUP_AFTER_ATTEMPTS = 10;
const BACKUP_MAX_AGE_MS = 7 * 86_400_000;

const MIDSEM = TOPICS.filter((t) => t.midsem);
const MIDSEM_RANGE = MIDSEM.length ? `topics ${Number(MIDSEM[0].num)}-${Number(MIDSEM[MIDSEM.length - 1].num)}` : '';

const BANDS: { id: string; title: string; note: string; topics: TopicMeta[] }[] = [
  {
    id: 'core',
    title: 'Core · mid-semester',
    note: MIDSEM_RANGE ? `The mid-sem practice test covers ${MIDSEM_RANGE}.` : '',
    topics: TOPICS.filter((t) => t.band === 'core'),
  },
  {
    id: 'late',
    title: 'Projects and final exam',
    note: 'Files, exceptions, the project rules and recursion.',
    topics: TOPICS.filter((t) => t.band === 'late'),
  },
];

function safeSession(events: Parameters<typeof currentSessionSummary>[0], sessionId: string): SessionSummary | null {
  try { return currentSessionSummary(events, sessionId); } catch { return null; }
}

function safeContinue(events: Parameters<typeof continueTarget>[0], settings: Parameters<typeof continueTarget>[2]) {
  try { return continueTarget(events, QUESTION_INDEX, settings); } catch { return null; }
}

function ContinueButton({ target, progress }: { target: { qid: string; topicId: TopicId } | null; progress: Record<TopicId, TopicProgress> }) {
  if (target) {
    const q = QUESTION_BY_ID.get(target.qid);
    const topic = TOPIC_BY_ID[target.topicId];
    return (
      <a class="btn primary lg hero-continue" href={href.question(target.qid)}>
        <Icon name="play" size={14} />
        <span class="hero-btn-text">
          Continue: {topic?.short ?? 'practice'}{q ? <span class="hero-btn-sub"> · {q.title}</span> : null}
        </span>
      </a>
    );
  }
  // No question to resume: point at the furthest open topic that isn't done, else topic 1.
  const open = TOPICS.filter((t) => progress[t.id]?.state !== 'locked');
  const next = open.find((t) => progress[t.id]?.state !== 'completed') ?? open[open.length - 1] ?? TOPICS[0];
  const fresh = !open.some((t) => (progress[t.id]?.attempted ?? 0) > 0);
  return (
    <a class="btn primary lg hero-continue" href={href.topic(next.id)}>
      <Icon name="play" size={14} />
      <span class="hero-btn-text">{fresh ? 'Start' : 'Continue'}: {next.short}</span>
    </a>
  );
}

function LandingSkeleton() {
  return (
    <div class="page landing" aria-busy="true">
      <span class="sr-only" role="status">Loading your progress</span>
      <div class="hero">
        <Skeleton w={320} h={30} />
        <Skeleton w={420} h={14} />
        <div class="row"><Skeleton w={200} h={38} /><Skeleton w={180} h={38} /></div>
      </div>
      <div class="landing-grid">
        <div class="ladder">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} class="tc tc-skel"><Skeleton w={28} h={28} /><div class="stack" style={{ flex: 1 }}><Skeleton w="50%" h={16} /><Skeleton w="85%" h={12} /><Skeleton w="60%" h={8} /></div></div>
          ))}
        </div>
        <aside class="side"><Skeleton h={120} /><Skeleton h={120} /></aside>
      </div>
    </div>
  );
}

export function Landing() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const progress = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const stats = useMemo(() => safeQuestionStats(events), [events]);
  const session = useMemo(() => safeSession(events, store.sessionId), [events]);
  const target = useMemo(() => safeContinue(events, settings), [events, settings]);
  const mistakes = useMemo(() => recentMistakes(events), [events]);
  const attempts = useMemo(() => attemptCount(events), [events]);
  const lastOther = useMemo(() => lastOtherSessionTs(events, store.sessionId), [events]);

  if (!ready) return <LandingSkeleton />;

  const openCount = TOPICS.filter((t) => progress[t.id].state !== 'locked').length;
  let tried = 0;
  for (const s of stats.values()) if (s.attempts > 0) tried++;

  const sentence: string[] = [`${openCount} of ${TOPICS.length} topics open`];
  sentence.push(tried > 0 ? `${plural(tried, 'question')} tried` : 'no questions tried yet');
  if (lastOther !== null) sentence.push(`last session ${relativeDay(lastOther)}`);

  const now = Date.now();
  const needsBackup = attempts >= BACKUP_AFTER_ATTEMPTS && (settings.lastExportTs === null || now - settings.lastExportTs > BACKUP_MAX_AGE_MS);

  return (
    <div class="page landing">
      <header class="hero">
        <h1>CITS1401 Python practice</h1>
        <p class="hero-sentence num">{sentence.join(' · ')}</p>
        <div class="hero-actions">
          <ContinueButton target={target} progress={progress} />
          <a class="btn lg hero-midsem" href={href.midsem()}>
            <Icon name="clock" size={14} />
            Mid-sem practice test
          </a>
        </div>
        {settings.unlockAll ? (
          <p class="hero-note"><Icon name="unlock" size={14} /> All topics are unlocked in <a href={href.settings()}>Settings</a>.</p>
        ) : null}
      </header>

      <div class="landing-grid">
        <div class="ladder">
          {BANDS.map((band) => (
            <section key={band.id} class="band" aria-labelledby={`band-${band.id}`}>
              <div class="band-head">
                <h2 id={`band-${band.id}`} class="band-title">{band.title}</h2>
                {band.note ? <p class="band-note">{band.note}</p> : null}
              </div>
              <ol class="topic-list">
                {band.topics.map((t) => (
                  <TopicCard
                    key={t.id}
                    meta={t}
                    progress={progress[t.id]}
                    counts={DIFF_COUNTS[t.id]}
                    prevLocked={t.order > 1 && progress[TOPICS[t.order - 2].id].state === 'locked'}
                  />
                ))}
              </ol>
            </section>
          ))}
        </div>

        <aside class="side" aria-label="Your activity">
          <SessionCard summary={session} />
          <MistakesCard mistakes={mistakes} />
          {needsBackup ? <BackupReminder lastExportTs={settings.lastExportTs} /> : null}
          <LegendCard />
        </aside>
      </div>
    </div>
  );
}
