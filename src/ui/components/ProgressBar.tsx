// Labelled progress bar with an optional marker (for example the minimum needed).
import './controls.css';

export interface ProgressBarProps {
  value: number;
  max: number;
  /** Accessible name, e.g. "Questions solved". */
  label: string;
  /** Human text for screen readers, e.g. "4 of 12 solved". */
  valueText?: string;
  /** Position of a marker tick (same units as value). */
  marker?: number;
  tone?: 'accent' | 'ok';
  thin?: boolean;
  class?: string;
}

export function ProgressBar({ value, max, label, valueText, marker, tone = 'accent', thin, class: cls }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const markerPct = marker !== undefined && max > 0 ? Math.min(100, Math.max(0, (marker / max) * 100)) : null;
  return (
    <div class={`pbar${tone === 'ok' ? ' ok' : ''}${thin ? ' thin' : ''}${cls ? ' ' + cls : ''}`}>
      <div class="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.min(value, max)} aria-valuetext={valueText}>
        <div class="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      {markerPct !== null ? <span class="pbar-marker" style={{ left: `${markerPct}%` }} aria-hidden="true" /> : null}
    </div>
  );
}
