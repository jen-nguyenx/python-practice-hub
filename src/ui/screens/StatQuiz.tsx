// A STAT2402 lesson's quiz (#/quiz/:lessonId): every question written for that lesson, timed, marked at the
// end and reviewed. Reached from the end of the lesson, the home page's path and the Exams page.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { LESSON_BY_ID } from '../../content/lessons/index.ts';
import { loadStatBank } from '../../content/statBank.ts';
import type { StatBank } from '../../engine/statExam.ts';
import { bestAttempt, buildQuiz, minutesFor, statHistory } from '../../engine/statExam.ts';
import { STAT_KIND_LABEL } from '../../content/statQuestionSchema.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import type { StatProgress } from '../stat/progress.ts';
import { clearStatProgress, itemsFromProgress, readStatProgress } from '../stat/progress.ts';
import { StatTestRunner } from '../stat/StatTestRunner.tsx';
import { StatHistory, StatResumeCard } from './StatExams.tsx';
import '../testmode/testmode.css';
import '../stat/stat.css';

export function StatQuiz({ lessonId }: { lessonId: string }) {
  const lesson = LESSON_BY_ID[lessonId];
  const key = `quiz:${lessonId}`;
  const [bank, setBank] = useState<StatBank | null>(null);
  const [failed, setFailed] = useState(false);
  const [run, setRun] = useState<{ runId: number; resume?: StatProgress } | null>(null);
  const [saved, setSaved] = useState<StatProgress | null>(() => readStatProgress(key));
  const events = store.events.value;
  const history = useMemo(() => statHistory(events, 'quiz', lessonId), [events, lessonId]);

  useEffect(() => { loadStatBank().then(setBank, () => setFailed(true)); }, []);

  if (!lesson || lesson.track !== 'stat2402') {
    return (
      <div class="tx-page">
        <h1>No quiz here</h1>
        <p class="tx-muted">There is no STAT2402 lesson with that name.</p>
        <p><LinkButton href={href.exam()}>All quizzes</LinkButton></p>
      </div>
    );
  }

  const items = bank ? buildQuiz(bank, lessonId) : [];
  const minutes = minutesFor(items);
  const title = `${lesson.title}`;

  if (run && bank) {
    const resumed = run.resume ? itemsFromProgress(bank, run.resume) : null;
    return (
      <StatTestRunner
        key={run.runId}
        kind="quiz"
        title={title}
        items={resumed ?? items}
        lessonIds={[lessonId]}
        minutes={run.resume && resumed ? run.resume.minutes : minutes}
        persistKey={key}
        resume={resumed ? run.resume : undefined}
        extra={(s) => {
          const prev = bestAttempt(history.filter((h) => h.ts < s.finishedAt));
          return prev ? <p>{s.percent > prev.percent ? <>A new best. Your previous best was {prev.percent}%.</> : <>Your best before this: {prev.percent}%.</>}</p> : null;
        }}
        actions={() => (
          <>
            <LinkButton variant="primary" href={href.lesson(lessonId)}>Back to the lesson</LinkButton>
            <Button onClick={() => { setSaved(null); setRun({ runId: Date.now() }); }}>Try again</Button>
            <LinkButton variant="ghost" href={href.exam()}>All quizzes</LinkButton>
          </>
        )}
      />
    );
  }

  const kinds = [...new Set(items.map((i) => i.q.kind))];
  return (
    <div class="tx-page sx">
      <header class="tx-head">
        <p class="tx-eyebrow">Lesson quiz</p>
        <h1>{lesson.title}</h1>
        <p>
          {bank ? <>{items.length} questions, about {minutes} minutes, timed. </> : null}
          Nothing is marked until you finish; then every answer is checked and explained.
        </p>
      </header>
      {failed ? <p class="tx-muted" role="alert">The questions could not be loaded. Check your connection and reload the page.</p> : null}
      {saved ? (
        <StatResumeCard progress={saved} onResume={() => setRun({ runId: Date.now(), resume: saved })} onDiscard={() => { clearStatProgress(key); setSaved(null); }} />
      ) : null}
      <section class="tx-card" aria-labelledby="sx-quiz-start">
        <div class="tx-card-head"><h2 id="sx-quiz-start">Before you start</h2></div>
        {bank ? <p class="tx-muted">Kinds of question: {kinds.map((k) => STAT_KIND_LABEL[k]).join(', ')}.</p> : null}
        <div class="tx-actions">
          <Button variant={saved ? 'secondary' : 'primary'} size="lg" disabled={!bank || items.length === 0}
            onClick={() => { clearStatProgress(key); setSaved(null); setRun({ runId: Date.now() }); }}>
            {bank ? (saved ? 'Start again' : 'Start the quiz') : 'Loading questions…'} {bank ? <Icon name="arrowRight" /> : null}
          </Button>
          <LinkButton variant="ghost" href={href.lesson(lessonId)}>Read the lesson first</LinkButton>
        </div>
      </section>
      <section class="tx-card" aria-labelledby="sx-quiz-h">
        <div class="tx-card-head"><h2 id="sx-quiz-h">Past attempts</h2></div>
        <StatHistory history={history} empty="Not taken yet. Your marks appear here after you finish it." />
      </section>
    </div>
  );
}
