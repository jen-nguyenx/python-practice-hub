// Home hero row: the Continue card (one primary action) and the Mid-sem practice test card (secondary action).
// Both cards stretch to the same height and pin their button to the bottom so the buttons line up.
import { href } from '../../../app/router.ts';
import { FORMAT_LABEL } from '../../../content/ids.ts';
import type { Diff } from '../../../content/ids.ts';
import { Icon } from '../../components/Icon.tsx';
import type { ContinueInfo, MidsemSummary } from '../homeData.ts';

const DIFF_WORD: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export interface ContinuePosition { number: number; total: number }

export function ContinueCard({ info, position, fresh }: { info: ContinueInfo; position: ContinuePosition | null; fresh: boolean }) {
  const t = info.topic;
  const q = info.question;
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
        <a class="btn primary" href={q ? href.question(q.qid) : href.topic(t.id)}>
          {q ? (fresh ? 'Start' : 'Continue') : 'Open topic'}
          <span class="sr-only">: {q ? q.title : t.title}</span>
          <Icon name="arrowRight" size={16} />
        </a>
      </div>
    </section>
  );
}

export function MidsemCard({ summary }: { summary: MidsemSummary }) {
  return (
    <section class="hc hc-midsem" aria-labelledby="hc-midsem">
      <h2 class="hc-title sm" id="hc-midsem">Mid-sem practice test</h2>
      <p class="hc-text num">{summary.count} questions from {summary.scope}, timed, no hints.</p>
      <div class="hc-actions">
        <a class="btn" href={href.midsem()}>
          {summary.resumable ? 'Resume test' : 'Start test'}
          <span class="sr-only"> (mid-sem practice)</span>
        </a>
      </div>
    </section>
  );
}
