// Home for a STAT2402 student (#/ when settings.unit is 'stat2402'): the week, where to pick up, the mock
// final, and the path of R lessons in reading order with the ones already read filled in and each lesson's
// best quiz result beside it.
//
// Only what exists is listed. The unit goes further than these lessons do, and a list of weeks with
// nothing behind them would be a promise, not a path.
import { useMemo } from 'preact/hooks';
import { href } from '../../../app/router.ts';
import { store } from '../../../app/services.ts';
import { lessonsInTrack } from '../../../content/lessons/index.ts';
import { UNITS } from '../../../content/units.ts';
import { bestAttempt, statHistory } from '../../../engine/statExam.ts';
import { Icon } from '../../components/Icon.tsx';
import { lessonsRead } from '../progressData.ts';
import { useSemester } from '../StatusBar.tsx';

export function StatHome() {
  const sem = useSemester();
  const events = store.events.value;
  const lessons = lessonsInTrack('stat2402');
  const read = useMemo(() => lessonsRead(events), [events]);
  const next = lessons.find((l) => !read.has(l.id)) ?? null;
  const done = lessons.filter((l) => read.has(l.id)).length;
  const started = done > 0;
  const mocks = useMemo(() => statHistory(events, 'mock'), [events]);
  const bestMock = bestAttempt(mocks);
  const quizBest = useMemo(
    () => new Map(lessons.map((l) => [l.id, bestAttempt(statHistory(events, 'quiz', l.id))])),
    [events, lessons.length],
  );

  return (
    <div class="page home stat-home">
      <h1 class="sr-only">PyLadder home, {UNITS.stat2402.code}</h1>
      <header class="home-head">
        <p class="home-eyebrow num">{UNITS.stat2402.code} · {sem.label}</p>
        <p class="home-today num">
          {started
            ? <><span><b>{done}</b> of {lessons.length} lessons read</span></>
            : <>{lessons.length} lessons on {UNITS.stat2402.name.toLowerCase()}, in R. R runs right here in your browser.</>}
        </p>
      </header>

      <div class="home-hero">
        {next ? (
          <section class="hc hc-continue" aria-labelledby="sh-next">
            <p class="hc-eyebrow">{started ? 'Pick up here' : 'Start here'}</p>
            <h2 class="hc-title" id="sh-next">{next.title}</h2>
            <p class="hc-text">{next.summary}.</p>
            <p class="hc-meta num"><span>{next.minutes} min</span><span>{next.sections} steps</span></p>
            <div class="hc-actions">
              <a class="btn primary" href={href.lesson(next.id)}>
                {started ? 'Continue' : 'Start the first lesson'} <Icon name="arrowRight" size={16} />
              </a>
            </div>
          </section>
        ) : (
          <section class="hc hc-continue" aria-labelledby="sh-next">
            <p class="hc-eyebrow">All read</p>
            <h2 class="hc-title" id="sh-next">Every lesson here is done</h2>
            <p class="hc-text">Go back to any of them below: the sliders and the exercises are worth a second pass before an assessment.</p>
          </section>
        )}
        <section class="hc" aria-labelledby="sh-exam">
          <h2 class="hc-title sm" id="sh-exam">Mock final</h2>
          <p class="hc-text num">
            {bestMock
              ? <>Best so far {bestMock.score} of {bestMock.total} ({bestMock.percent}%), from {mocks.length} {mocks.length === 1 ? 'paper' : 'papers'}.</>
              : <>The whole unit in one timed paper, marked out of 100. There is a quiz for every lesson, too.</>}
          </p>
          <div class="hc-actions">
            <a class="btn" href={href.exam()}>{bestMock ? 'Exams' : 'Sit a paper'}</a>
            <a class="btn ghost" href={href.rPlayground()}>R Playground</a>
          </div>
        </section>
      </div>

      <section class="ladder" aria-labelledby="sh-path">
        <h2 class="ladder-head" id="sh-path">
          <span class="ladder-title">Your path</span>
          <span class="ladder-count num">{done} of {lessons.length} read</span>
        </h2>
        <ol class="sh-path">
          {lessons.map((l, i) => {
            const isRead = read.has(l.id);
            const isNext = next?.id === l.id;
            return (
              <li key={l.id}>
                <a class={`sh-step${isRead ? ' is-read' : ''}${isNext ? ' is-next' : ''}`} href={href.lesson(l.id)}>
                  <span class="sh-n num" aria-hidden="true">{isRead ? <Icon name="check" size={14} /> : i + 1}</span>
                  <span class="sh-body">
                    <span class="sh-title">{l.title}</span>
                    <span class="sh-sum">{l.summary}</span>
                  </span>
                  <span class="sh-meta num">
                    {isRead ? <span class="sr-only">Read. </span> : null}
                    {l.minutes} min
                    {quizBest.get(l.id) ? <span class="sh-quiz"> · quiz best {quizBest.get(l.id)!.percent}%</span> : null}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
