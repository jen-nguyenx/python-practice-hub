// One topic on the landing ladder: number, title, blurb, difficulty mix, progress against the minimum, state, and
// (when locked) the exact unlock rule with links to the cheat sheet and the previous topic's test.
import { href } from '../../../app/router.ts';
import type { TopicMeta } from '../../../content/topics.ts';
import type { TopicProgress, TopicState } from '../../../engine/progress.ts';
import { Icon } from '../../components/Icon.tsx';
import type { IconName } from '../../components/Icon.tsx';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { DIFF_LEGEND } from '../../components/Chip.tsx';
import type { DiffCounts } from '../progressData.ts';
import { minimumText, prevTopic } from '../progressData.ts';
import { rememberTopicTab } from '../topic/filters.ts';

const STATE: Record<TopicState, { label: string; icon: IconName }> = {
  locked: { label: 'Locked', icon: 'lock' },
  open: { label: 'Open', icon: 'unlock' },
  'in-progress': { label: 'In progress', icon: 'play' },
  completed: { label: 'Minimum done', icon: 'check' },
};

export function StateLabel({ state, testedOut }: { state: TopicState; testedOut?: boolean }) {
  const s = STATE[state] ?? STATE.open;
  const label = state === 'completed' && testedOut ? 'Passed topic test' : s.label;
  return (
    <span class={`state-label st-${state}`}>
      <Icon name={s.icon} size={14} />
      {label}
    </span>
  );
}

export function DiffMix({ counts, compact }: { counts: DiffCounts; compact?: boolean }) {
  if (counts.total === 0) return <span class="diffmix-empty">Questions coming soon</span>;
  const parts = (['easy', 'medium', 'hard'] as const).filter((d) => counts[d] > 0);
  return (
    <div class={`diffmix${compact ? ' compact' : ''}`}>
      <div class="diffmix-bar" aria-hidden="true">
        {parts.map((d) => <span key={d} class={`diffmix-seg ${d}`} style={{ flexGrow: counts[d] }} title={DIFF_LEGEND[d]} />)}
      </div>
      <span class="diffmix-text num">
        {counts.easy} easy · {counts.medium} medium · {counts.hard} hard
      </span>
    </div>
  );
}

export function TopicCard({ meta, progress, counts, prevLocked }: { meta: TopicMeta; progress: TopicProgress; counts: DiffCounts; prevLocked?: boolean }) {
  const locked = progress.state === 'locked';
  const done = progress.state === 'completed';
  const prev = prevTopic(meta);
  const total = progress.total || counts.total;
  const titleId = `tc-title-${meta.id}`;
  return (
    <li class={`tc st-${progress.state}`}>
      <span class="tc-num" aria-hidden="true">{meta.num}</span>
      <div class="tc-main">
        <div class="tc-top">
          <h3 class="tc-title" id={titleId}>
            <a class="tc-link" href={href.topic(meta.id)}>
              <span class="sr-only">Topic {meta.order}: </span>{meta.title}
            </a>
          </h3>
          <StateLabel state={progress.state} testedOut={progress.testedOut} />
        </div>
        <p class="tc-blurb">{meta.blurb}</p>
        {locked && progress.lockReason ? (
          <div class="tc-lock">
            <Icon name="lock" size={14} />
            <span class="tc-lock-text">{progress.lockReason}</span>
            <span class="inline-links tc-lock-links">
              <a href={href.topic(meta.id)} onClick={() => rememberTopicTab(meta.id, 'cheatsheet')}>Cheat sheet</a>
              {prev && !prevLocked ? <a href={href.topicTest(prev.id)}>Take the {prev.short} test</a> : null}
            </span>
          </div>
        ) : null}
        <div class="tc-stats">
          <div class="tc-stat">
            <span class="tc-stat-label">Difficulty</span>
            <DiffMix counts={counts} />
          </div>
          <div class="tc-stat">
            <span class="tc-stat-label">Progress</span>
            {total > 0 ? (
              <>
                <ProgressBar
                  value={progress.solved}
                  max={total}
                  marker={Math.min(progress.minimum.solve, total)}
                  tone={done ? 'ok' : 'accent'}
                  label={`${meta.short} questions solved`}
                  valueText={`${progress.solved} of ${total} solved`}
                  thin
                />
                <span class="tc-progress-text num">
                  <span class="mono">{progress.solved}</span> of <span class="mono">{total}</span> solved
                  <span class="tc-min"> · {minimumText(progress.minimum)}</span>
                </span>
              </>
            ) : (
              <span class="tc-progress-text">{minimumText(progress.minimum)}</span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
