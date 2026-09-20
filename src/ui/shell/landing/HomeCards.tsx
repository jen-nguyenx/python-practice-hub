// Home hero row: the Today plan (see landing/Today.tsx) and the mock final exam card beside it.
import { href } from '../../../app/router.ts';
import { Icon } from '../../components/Icon.tsx';
import type { ExamSummary } from '../homeData.ts';

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
