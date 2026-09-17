// Home ladder list: one 56px row per topic with a numbered circle, title, optional "Revisit" chip, progress and state.
// The current topic row is tinted with "Next: Q4 · Write code" and a "Resume" link. Locked rows are muted.
import { href } from '../../../app/router.ts';
import type { QuestionMeta } from '../../../content/questionIndex.ts';
import { FORMAT_LABEL } from '../../../content/ids.ts';
import type { TopicId } from '../../../content/ids.ts';
import { TOPICS } from '../../../content/topics.ts';
import type { TopicProgress, TopicState } from '../../../engine/progress.ts';
import { Icon } from '../../components/Icon.tsx';

const STATE_TEXT: Record<TopicState, string> = { completed: 'Complete', 'in-progress': 'In progress', open: 'Not started', locked: 'Locked' };

/** A topic needs another look when its average score is low after a few questions. */
export function needsRevisit(p: TopicProgress) {
  return p.state !== 'locked' && p.score !== null && p.attempted >= 3 && p.score < 0.75;
}

export interface NextUp { topicId: TopicId; question: QuestionMeta; number: number }

export function LadderLegend() {
  return (
    <ul class="ladder-legend" aria-label="Legend">
      <li><span class="lg-dot is-done" aria-hidden="true" />Complete</li>
      <li><span class="lg-dot is-progress" aria-hidden="true" />In progress</li>
      <li><Icon name="lock" size={12} />Locked</li>
    </ul>
  );
}

export function Ladder({ progress, next }: { progress: Record<TopicId, TopicProgress>; next: NextUp | null }) {
  return (
    <ol class="ladder card" aria-label="Topics">
      {TOPICS.map((t, i) => {
        const p = progress[t.id];
        const prev = i > 0 ? progress[TOPICS[i - 1].id] : undefined;
        const current = next?.topicId === t.id && p.state !== 'locked';
        const locked = p.state === 'locked';
        const circle = p.state === 'completed' ? 'is-done' : p.state === 'in-progress' || current ? 'is-progress' : locked ? 'is-locked' : 'is-open';
        const pct = p.score !== null ? ` · ${Math.round(p.score * 100)}%` : '';
        const lockText = prev && prev.state !== 'locked' ? `Finish ${TOPICS[i - 1].short} to unlock` : 'Locked';
        return (
          <li key={t.id} class={`lr${current ? ' is-current' : ''}${locked ? ' is-locked' : ''}`}>
            <span class={`lr-num ${circle}`} aria-hidden="true">{t.order}</span>
            <div class="lr-main">
              <div class="lr-title-row">
                <a class="lr-link" href={href.topic(t.id)}>
                  {t.title}
                  <span class="sr-only">, {STATE_TEXT[p.state]}</span>
                </a>
                {needsRevisit(p) ? <span class="chip hint lr-chip">Revisit</span> : null}
              </div>
              {current && next ? (
                <span class="lr-next">Next: Q{next.number} · {FORMAT_LABEL[next.question.format]}</span>
              ) : null}
            </div>
            {locked ? (
              <span class="lr-lock" title={p.lockReason}>
                <Icon name="lock" size={13} />
                {lockText}
              </span>
            ) : (
              <div class="lr-meta">
                <span class="lr-bar" aria-hidden="true">
                  <span class="lr-fill" style={{ width: `${p.total > 0 ? Math.min(100, (p.solved / p.total) * 100) : 0}%` }} />
                </span>
                <span class="lr-count mono num">
                  {p.solved}/{p.total}{current ? '' : pct}
                  <span class="sr-only"> solved</span>
                </span>
                {current && next ? (
                  <a class="lr-resume" href={href.question(next.question.qid)}>
                    {p.attempted > 0 ? 'Resume' : 'Start'}<span class="sr-only"> {t.short}, question {next.number}</span>
                    <Icon name="arrowRight" size={14} />
                  </a>
                ) : (
                  <Icon name="chevronRight" size={16} class="lr-chev" />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
