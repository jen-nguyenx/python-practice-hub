// Result of the latest check: plain score, feedback, and Next question.
import type { GradeResult } from '../../engine/types.ts';
import { LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import './workbench.css';

export interface ResultBannerProps {
  result: GradeResult | null;
  /** Paper questions: show marks earned out of this total. */
  marks?: number;
  nextHref?: string;
  nextLabel?: string;
  checksLeft?: number;
  revealed?: boolean;
}

export function marksEarned(score: number, marks: number) {
  return Math.round(score * marks);
}

export function ResultBanner({ result, marks, nextHref, nextLabel = 'Next question', checksLeft, revealed }: ResultBannerProps) {
  return (
    <div class="result-live" aria-live="polite" aria-atomic="true">
      {result ? (
        <div class={`result-banner ${result.correct ? 'ok' : result.score > 0 ? 'part' : 'bad'}`}>
          <span class="result-icon" aria-hidden="true"><Icon name={result.correct ? 'check' : result.score > 0 ? 'target' : 'x'} size={18} /></span>
          <div class="result-text">
            <strong class="result-title">
              {result.correct ? 'Correct' : result.score > 0 ? 'Partly right' : 'Not yet'}
              <span class="result-score num">
                {marks ? ` · ${marksEarned(result.score, marks)} of ${marks} marks` : ` · score ${Math.round(result.score * 100)}%`}
              </span>
            </strong>
            {result.feedback ? <span class="result-feedback">{result.feedback}</span> : null}
            {!result.correct && !revealed && checksLeft !== undefined && Number.isFinite(checksLeft) ? (
              <span class="result-feedback muted">{checksLeft <= 0 ? 'No checks left. The answer is shown below.' : `${checksLeft} ${checksLeft === 1 ? 'check' : 'checks'} left.`}</span>
            ) : null}
          </div>
          <span class="spacer" />
          {nextHref ? (
            <LinkButton href={nextHref} variant={result.correct ? 'primary' : 'secondary'} size="sm">
              {nextLabel} <Icon name="arrowRight" size={14} />
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
