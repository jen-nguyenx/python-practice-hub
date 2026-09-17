// Accuracy-per-session sparkline. SVG shapes stretch to the container; text stays in HTML so it never scales.
import { formatDate } from './format.ts';

export interface SparkPoint { ts: number; pct: number; label?: string }

const PAD_X = 2;
const PAD_Y = 8;

function yOf(p: number): number {
  return PAD_Y + (1 - p / 100) * (100 - 2 * PAD_Y);
}

export function Sparkline({ points, title }: { points: readonly SparkPoint[]; title: string }) {
  const n = points.length;
  if (n === 0) return <p class="muted">No sessions with checked answers in this range yet.</p>;
  const xOf = (i: number) => (n === 1 ? 50 : PAD_X + (i / (n - 1)) * (100 - 2 * PAD_X));
  const coords = points.map((p, i) => ({ x: xOf(i), y: yOf(p.pct), p }));
  const d = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  const last = coords[n - 1];
  const best = Math.max(...points.map((p) => p.pct));
  const first = points[0];
  const summary = n === 1
    ? `${title}: one session, ${Math.round(last.p.pct)}%.`
    : `${title} over ${n} sessions: first ${Math.round(first.pct)}%, best ${Math.round(best)}%, last ${Math.round(last.p.pct)}%.`;

  return (
    <figure class="spark">
      <div class="spark-plot">
        <div class="spark-axis" aria-hidden="true">
          {[100, 50, 0].map((g) => <span key={g} class="spark-axis-label num" style={{ top: `${yOf(g)}%` }}>{g}%</span>)}
        </div>
        <div class="spark-area">
          <svg class="spark-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={summary}>
            {[100, 50, 0].map((g) => (
              <line key={g} class="spark-grid" x1="0" x2="100" y1={yOf(g)} y2={yOf(g)} vector-effect="non-scaling-stroke" />
            ))}
            {n > 1 ? <path class="spark-line" d={d} vector-effect="non-scaling-stroke" /> : null}
            {coords.slice(0, -1).map((c, i) => (
              <line key={i} class="spark-dot" x1={c.x} x2={c.x} y1={c.y} y2={c.y} vector-effect="non-scaling-stroke">
                <title>{`${formatDate(c.p.ts)}: ${Math.round(c.p.pct)}%`}</title>
              </line>
            ))}
            <line class="spark-last-ring" x1={last.x} x2={last.x} y1={last.y} y2={last.y} vector-effect="non-scaling-stroke" />
            <line class="spark-last" x1={last.x} x2={last.x} y1={last.y} y2={last.y} vector-effect="non-scaling-stroke">
              <title>{`${formatDate(last.p.ts)}: ${Math.round(last.p.pct)}%`}</title>
            </line>
          </svg>
          <span class={`spark-last-label num${last.y < 30 ? ' below' : ''}`} style={{ left: `${last.x}%`, top: `${last.y}%` }} aria-hidden="true">
            Last {Math.round(last.p.pct)}%
          </span>
        </div>
      </div>
      <figcaption class="spark-caption">
        <span class="faint num">{formatDate(first.ts)}</span>
        <span class="muted num">{n > 1 ? <>Best {Math.round(best)}% · {n} sessions</> : 'One session so far'}</span>
        <span class="faint num">{formatDate(last.p.ts)}</span>
      </figcaption>
    </figure>
  );
}
