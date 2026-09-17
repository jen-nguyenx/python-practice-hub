// Small plain-language formatting helpers for the shell screens.

export function plural(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function shortDate(ts: number) {
  const d = new Date(ts);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${sameYear ? '' : ' ' + d.getFullYear()}`;
}

/** "today", "yesterday", "3 days ago", "on 4 Sep". */
export function relativeDay(ts: number, now = Date.now()) {
  const days = Math.round((startOfDay(now) - startOfDay(ts)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `on ${shortDate(ts)}`;
}

/** Local date as YYYY-MM-DD. */
export function isoDay(ts = Date.now()) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
export const MOD_KEY = IS_MAC ? 'Cmd' : 'Ctrl';
export const ALT_KEY = IS_MAC ? 'Option' : 'Alt';

/** True when keyboard focus is somewhere a single key press should type text. */
export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false;
  if (t.closest('.monaco-editor, [contenteditable=""], [contenteditable="true"]')) return true;
  const el = t as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image'].includes(type);
  }
  return false;
}
