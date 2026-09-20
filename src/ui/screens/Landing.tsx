// Home (#/), docs/build/DESIGN.md "Home": mono eyebrow with the week, today's numbers, the Continue and mock exam
// practice test cards in one row, then the 13-tile ladder. Nothing else.
import { useMemo } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS } from '../../content/topics.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { continueInfo, examSummary, hasAnyAttempt, todayNumbers } from '../shell/homeData.ts';
import { lessonsRead, safeTopicProgress } from '../shell/progressData.ts';
import { reviewQueue } from '../../engine/review.ts';
import { streak } from '../../engine/streak.ts';
import { ExamCard } from '../shell/landing/HomeCards.tsx';
import { planToday, questionTitle, TodayPlan } from '../shell/landing/Today.tsx';
import { Ladder, LadderSkeleton } from '../shell/landing/Ladder.tsx';
import { useSemester } from '../shell/StatusBar.tsx';
import { storeReady } from '../shell/storeReady.ts';
import '../shell/landing/landing.css';

function Today({ events }: { events: Parameters<typeof todayNumbers>[0] }) {
  const n = useMemo(() => todayNumbers(events), [events]);
  if (!hasAnyAttempt(events)) {
    return <p class="home-today">{TOPICS.length} topics, {QUESTION_INDEX.length} questions. Python runs right here in your browser.</p>;
  }
  return (
    <p class="home-today num">
      <span><b>{n.questions}</b> {n.questions === 1 ? 'question' : 'questions'} today</span>
      <span><b>{n.minutes}</b> {n.minutes === 1 ? 'minute' : 'minutes'}</span>
      <span><b>{n.newMistakes}</b> new {n.newMistakes === 1 ? 'mistake' : 'mistakes'}</span>
    </p>
  );
}

export function Landing() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;
  const sem = useSemester();

  const progress = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const info = useMemo(() => continueInfo(events, settings, progress), [events, settings, progress]);
  const exam = useMemo(() => examSummary(), [events]);

  const eyebrow = <p class="home-eyebrow num">CITS1401 · {sem.label}</p>;

  if (!ready) {
    return (
      <div class="page home" aria-busy="true">
        <span class="sr-only" role="status">Loading your progress</span>
        <header class="home-head">{eyebrow}<Skeleton w={320} h={16} /></header>
        <div class="home-hero">
          <div class="hc"><Skeleton h={120} /></div>
          <div class="hc"><Skeleton h={120} /></div>
        </div>
        <LadderSkeleton />
      </div>
    );
  }

  const read = useMemo(() => lessonsRead(events), [events]);
  const days = useMemo(() => streak(events), [events]);
  const unlocked = useMemo(
    () => Object.values(progress).filter((p) => p.state !== 'locked').map((p) => p.topicId),
    [progress],
  );
  const queue = useMemo(() => reviewQueue(events, QUESTION_INDEX, { unlocked }), [events, unlocked]);
  const plan = useMemo(() => {
    const q = info.question ? questionTitle(info.question.qid) : null;
    return planToday({
      read,
      queue,
      nextQid: info.question?.qid,
      nextQTitle: q?.title,
      nextQTopic: q?.topic,
    });
  }, [read, queue, info.question?.qid]);

  return (
    <div class="page home">
      <h1 class="sr-only">PyLadder home</h1>
      <header class="home-head">
        {eyebrow}
        <Today events={events} />
      </header>
      <div class="home-hero">
        <TodayPlan steps={plan} streak={days} />
        <ExamCard summary={exam} />
      </div>
      <Ladder progress={progress} currentTopic={progress[info.topic.id]?.state === 'locked' ? null : info.topic.id} />
    </div>
  );
}

