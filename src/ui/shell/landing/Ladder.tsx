// Home ladder: 13 identical tiles in a 4-column grid, topics 01-08 then "Projects and final exam" and 09-13.
// Tile = number + state icon (check when the minimum is met, filled dot on the current topic, lock when locked),
// short name, 4px progress bar, "solved/total" and "min N" or "done". Lock reasons live in a tooltip.
import { href } from '../../../app/router.ts';
import type { TopicId } from '../../../content/ids.ts';
import { TOPICS } from '../../../content/topics.ts';
import type { TopicMeta } from '../../../content/topics.ts';
import type { TopicProgress } from '../../../engine/progress.ts';
import { Icon } from '../../components/Icon.tsx';
import { Skeleton } from '../../components/Skeleton.tsx';
import { Tooltip } from '../../components/Tooltip.tsx';

/** "min 5 · 1 coding": the minimum has two parts, so a tile with 5 reading answers cannot read as done. */
function minimumText(p: TopicProgress) {
  return p.minimum.code > 0 ? `min ${p.minimum.solve} · ${p.minimum.code} coding` : `min ${p.minimum.solve}`;
}

function tileLabel(t: TopicMeta, p: TopicProgress, current: boolean) {
  const parts = [`${t.num} ${t.short}`];
  if (p.state === 'locked') parts.push('locked');
  else {
    parts.push(`${p.solved} of ${p.total} solved`);
    const min = p.minimum.code > 0
      ? `minimum ${p.minimum.solve} solved including ${p.minimum.code} coding`
      : `minimum ${p.minimum.solve} solved`;
    parts.push(p.minimumMet ? 'minimum met' : min);
    if (current) parts.push('current topic');
  }
  return parts.join(', ');
}

function Tile({ t, p, current }: { t: TopicMeta; p: TopicProgress; current: boolean }) {
  const locked = p.state === 'locked';
  const pct = p.total > 0 ? Math.min(100, (p.solved / p.total) * 100) : 0;
  const cls = `tile${current && !locked ? ' is-current' : ''}${locked ? ' is-locked' : ''}${p.minimumMet ? ' is-done' : ''}`;
  let icon = null;
  if (locked) icon = <Icon name="lock" size={14} />;
  else if (p.minimumMet) icon = <Icon name="check" size={14} />;
  else if (current) icon = <span class="tile-current-dot" />;
  const link = (
    <a class={cls} href={href.topic(t.id)} aria-label={tileLabel(t, p, current)}>
      <span class="tile-top" aria-hidden="true">
        <span class="tile-num">{t.num}</span>
        <span class="tile-icon">{icon}</span>
      </span>
      <span class="tile-name" aria-hidden="true">{t.short}</span>
      <span class="tile-bar" aria-hidden="true"><span class="tile-fill" style={{ width: `${locked ? 0 : pct}%` }} /></span>
      <span class="tile-foot" aria-hidden="true">
        <span class="tile-count">{p.solved}/{p.total}</span>
        <span class="tile-min">{locked ? 'Locked' : p.minimumMet ? 'Done' : minimumText(p)}</span>
      </span>
    </a>
  );
  return (
    <li class="tile-cell">
      {locked && p.lockReason ? <Tooltip content={p.lockReason} side="bottom">{link}</Tooltip> : link}
    </li>
  );
}

export function Ladder({ progress, currentTopic }: { progress: Record<TopicId, TopicProgress>; currentTopic: TopicId | null }) {
  const open = TOPICS.filter((t) => progress[t.id].state !== 'locked').length;
  const core = TOPICS.filter((t) => t.band === 'core');
  const late = TOPICS.filter((t) => t.band !== 'core');
  return (
    <section class="ladder" aria-labelledby="ladder-title">
      <h2 class="ladder-head" id="ladder-title">
        <span class="ladder-title">Your ladder</span>
        <span class="ladder-count num">{open} of {TOPICS.length} open</span>
      </h2>
      <ol class="tiles">
        {core.map((t) => <Tile key={t.id} t={t} p={progress[t.id]} current={t.id === currentTopic} />)}
      </ol>
      {late.length ? (
        <>
          <h3 class="ladder-band" id="ladder-late">Projects and final exam</h3>
          <ol class="tiles" start={late[0].order} aria-labelledby="ladder-late">
            {late.map((t) => <Tile key={t.id} t={t} p={progress[t.id]} current={t.id === currentTopic} />)}
          </ol>
        </>
      ) : null}
    </section>
  );
}

export function LadderSkeleton() {
  return (
    <div class="ladder">
      <Skeleton w={180} h={14} class="ladder-skel-head" />
      <div class="tiles">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} class="tile is-skel">
            <Skeleton w={24} h={12} />
            <Skeleton w="60%" h={16} />
            <Skeleton h={4} />
            <Skeleton w={40} h={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
