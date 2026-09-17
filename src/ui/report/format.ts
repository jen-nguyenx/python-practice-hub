// Number, time and date formatting for reports and tests. Pure; unit-tested in format.test.ts.

/** Rates in ReportData are 0..1. Values above 1 are treated as already being percentages. */
export function toPercent(x: number | null | undefined): number | null {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  const p = x > 1 ? x : x * 100;
  return Math.max(0, Math.min(100, p));
}

/** "72%" or an en dash when there is no value. */
export function pct(x: number | null | undefined): string {
  const p = toPercent(x);
  return p === null ? '–' : `${Math.round(p)}%`;
}

export type HeatStep = 0 | 1 | 2 | 3 | 4;

/** 0 = no data; 1 under 60%; 2 under 75%; 3 under 85%; 4 at 85% or more. */
export function heatStep(x: number | null | undefined): HeatStep {
  const p = toPercent(x);
  if (p === null) return 0;
  if (p < 60) return 1;
  if (p < 75) return 2;
  if (p < 85) return 3;
  return 4;
}

export const HEAT_LEGEND: { step: HeatStep; text: string }[] = [
  { step: 0, text: 'Not tried' },
  { step: 1, text: 'Under 60%' },
  { step: 2, text: '60 to 74%' },
  { step: 3, text: '75 to 84%' },
  { step: 4, text: '85% or more' },
];

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "45 min", "1 h 5 min", "0 min". */
export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** "45 s", "3 min 20 s", "1 h 2 min". */
export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    const r = s % 60;
    return r ? `${m} min ${r} s` : `${m} min`;
  }
  return formatMinutes(m);
}

/** Countdown clock: "14:05", or "1:02:09" for an hour or more. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

const DAY = 86400000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** "today", "yesterday", "3 days ago", or "12 Sep" after a week. */
export function relativeDay(ts: number | null | undefined, now = Date.now()): string {
  if (ts === null || ts === undefined) return '–';
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(ts);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "12 Sep" */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "7:05 pm" */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}

/** "Tue 16 Sep, 7:05 pm" */
export function formatDateTime(ts: number): string {
  return `${WEEKDAYS[new Date(ts).getDay()]} ${formatDate(ts)}, ${formatTime(ts)}`;
}
