// Home hero row: the Continue card (one primary action) and the mock final exam card (secondary action).
// Both cards stretch to the same height and pin their button to the bottom so the buttons line up.
import { href } from '../../../app/router.ts';
import { FORMAT_LABEL } from '../../../content/ids.ts';
import type { Diff } from '../../../content/ids.ts';
import { Icon } from '../../components/Icon.tsx';
import type { ContinueInfo, ExamSummary } from '../homeData.ts';

const DIFF_WORD: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export interface ContinuePosition { number: number; total: number }

export function ContinueCard({ info, position, fresh, lessonDone }: {
  info: ContinueInfo; position: ContinuePosition | null; fresh: boolean; lessonDone: boolean;
}) {
  const t = info.topic;
  const q = info.question;
  // A first-time student is better served by the lesson than by a cold question with no context.
  const lessonFirst = fresh && !lessonDone;
  return (
    <section class="hc hc-continue" aria-labelledby="hc-continue">
      <p class="hc-eyebrow">{fresh ? 'Start here' : 'Continue'}</p>
      <h2 class="hc-title" id="hc-continue">
        {q ? <>{t.short}<span class="hc-dot" aria-hidden="true"> · </span><span class="sr-only">, </span>{q.title}</> : t.title}
      </h2>
      <p class="hc-meta num">
        {q ? (
          <>
            <span>{FORMAT_LABEL[q.format]}</span>
            <span>{DIFF_WORD[q.diff]}</span>
            {position ? <span>Question {position.number} of {position.total}</span> : null}
          </>
        ) : <span>Every open question in this topic is done.</span>}
      </p>
      <div class="hc-actions">
        {lessonFirst ? (
          <>
            <a class="btn primary" href={href.lesson(t.id)}>
              Start the lesson
              <span class="sr-only">: {t.title}</span>
              <Icon name="arrowRight" size={16} />
            </a>
            {q ? <a class="btn ghost" href={href.question(q.qid)}>Skip to questions</a> : null}
          </>
        ) : (
          <a class="btn primary" href={q ? href.question(q.qid) : href.topic(t.id)}>
            {q ? (fresh ? 'Start' : 'Continue') : 'Open topic'}
            <span class="sr-only">: {q ? q.title : t.title}</span>
            <Icon name="arrowRight" size={16} />
          </a>
        )}
      </div>
    </section>
  );
}

export function ExamCard({ summary }: { summary: ExamSummary }) {
  return (
    <section class="hc hc-exam" aria-labelledby="hc-exam">
      <h2 class="hc-title sm" id="hc-exam">Mock final exam</h2>
      <p class="hc-text num">
        {summary.questions} questions, {summary.marks} marks, {summary.minutes / 60} hours. Closed book, like the real paper.
      </p>
      <div class="hc-actions">
        <a class="btn" href={href.exam()}>
          {summary.resumable ? 'Resume paper' : 'Sit a paper'}
        </a>
      </div>
    </section>
  );
}
