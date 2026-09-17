// Thin rounded progress bar (--progress on --progress-track), with an optional minimum tick. The segmented variant draws one segment per
// item (e.g. per question): the first `value` segments are done and `current` (0-based) is shown lighter.
import './controls.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Questions solved". */
  label: string;
  /** Human text for screen readers, e.g. "4 of 12 solved". */
  valueText?: string;
  /** Position of a marker tick (same units as value), e.g. the minimum needed. */
  marker?: number;
  /** accent = --progress (default), ok = ink, blue, neutral = muted grey. */
  tone?: 'accent' | 'ok' | 'blue' | 'neutral';
  /** 4px bar (default is 6px). */
  thin?: boolean;
  /** 8px bar for a hero statistic. */
  thick?: boolean;
  /** One segment per item instead of a continuous bar. */
  segmented?: boolean;
  /** Segmented only: 0-based index of the current item, drawn lighter. */
  current?: number;
  /** Segmented only: explicit done flags per segment (overrides value for drawing). */
  done?: readonly boolean[];
  class?: string;
}

export function ProgressBar({ value, max, label, valueText, marker, tone = 'accent', thin, thick, segmented, current, done, class: cls }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const markerPct = marker !== undefined && max > 0 ? Math.min(100, Math.max(0, (marker / max) * 100)) : null;
  const toneCls = tone === 'accent' ? '' : ` ${tone}`;
  const classes = `pbar${toneCls}${thin ? ' slim' : ''}${thick ? ' thick' : ''}${cls ? ' ' + cls : ''}`;
  const aria = { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': max, 'aria-valuenow': Math.min(value, max), 'aria-valuetext': valueText } as const;
  if (segmented && max > 0) {
    const count = Math.min(max, 60);
    return (
      <div class={classes}>
        <div class="pbar-segs" {...aria}>
          {Array.from({ length: count }, (_, i) => {
            const isDone = done ? !!done[i] : i < value;
            const state = i === current && !isDone ? ' current' : isDone ? ' done' : '';
            return <span key={i} class={`pbar-seg${state}`} />;
          })}
        </div>
      </div>
    );
  }
  return (
    <div class={classes}>
      <div class="progress-track" {...aria}>
        <div class="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {markerPct !== null ? <span class="pbar-marker" style={{ left: `${markerPct}%` }} aria-hidden="true" /> : null}
    </div>
  );
}
