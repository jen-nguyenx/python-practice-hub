// Result feedback card after a check: ok-tint "Correct" / bad-tint "Not quite", one sentence of feedback (Markdown,
// never raw backticks), the score that was actually saved (after hints, none once the answer was shown), and
// "Next question" (primary when correct).
import type { Ref } from 'preact';
import type { GradeResult } from '../../engine/types.ts';
import { LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import './workbench.css';

export interface ResultCardProps {
  result: GradeResult | null;
  /** Credited score saved with the attempt (score x hint multiplier, 0 when the answer was shown). */
  credit: number;
  /** Hint tier used before the check. */
  hints: number;
  /** The answer had been shown before this check. */
  answerShown: boolean;
  /** Paper questions: marks out of this total. */
  marks?: number;
  nextHref?: string;
  nextLabel?: string;
  checksLeft?: number;
  /** The controller focuses this card (or its "Next question" button) when a check drops keyboard focus. */
  cardRef?: Ref<HTMLDivElement>;
}

export function marksEarned(score: number, marks: number) {
  return Math.round(score * marks);
}

export function scoreText({ result, credit, hints, answerShown, marks }: Pick<ResultCardProps, 'result' | 'credit' | 'hints' | 'answerShown' | 'marks'>): string {
  if (!result) return '';
  if (answerShown) return 'No score: the answer was shown';
  const hintText = hints > 0 ? ` with ${hints} ${hints === 1 ? 'hint' : 'hints'}` : '';
  if (marks) return `${marksEarned(credit, marks)} of ${marks} marks${hintText}`;
  // Every scored check shows its score, including 0%: leaving it out on a zero read as a missing value.
  return `Score ${Math.round(credit * 100)}%${hintText}`;
}

export function ResultCard(p: ResultCardProps) {
  const { result } = p;
  const finite = p.checksLeft !== undefined && Number.isFinite(p.checksLeft);
  const outOfChecks = !!result && !result.correct && finite && p.checksLeft! <= 0;
  const tone = !result ? '' : result.correct ? 'ok' : 'bad';
  const word = !result ? '' : result.correct ? 'Correct' : 'Not quite';
  const score = scoreText(p);
  const left = !!result && !result.correct && !p.answerShown && finite && p.checksLeft! > 0
    ? `${p.checksLeft} ${p.checksLeft === 1 ? 'check' : 'checks'} left` : '';
  const showNext = !!result && !!p.nextHref && (result.correct || p.answerShown || outOfChecks);
  const fallback = result?.correct ? 'Nice work.' : outOfChecks ? 'No checks left, so the answer is shown below.' : 'Look at what differs and try again.';
  return (
    <div class="result-live" aria-live="polite" aria-atomic="true">
      {result ? (
        <div class={`result-card ${tone}`} ref={p.cardRef} tabIndex={-1} role="group" aria-label={`Result: ${word}`}>
          <span class="result-icon" aria-hidden="true"><Icon name={result.correct ? 'check' : 'x'} size={18} /></span>
          <div class="result-text">
            <div class="result-head">
              <strong class="result-word">{word}</strong>
              {score ? <span class="result-score">{score}</span> : null}
              {left ? <span class="result-left">{left}</span> : null}
            </div>
            <Markdown class="result-feedback" text={result.feedback?.trim() ? result.feedback : fallback} />
          </div>
          {showNext ? (
            <LinkButton href={p.nextHref!} variant={result.correct ? 'primary' : 'secondary'} class="result-next">
              {p.nextLabel ?? 'Next question'} <Icon name="arrowRight" size={16} />
            </LinkButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
