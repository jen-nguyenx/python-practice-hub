// Where a reader is up to in a lesson, remembered per lesson in this browser.

/** Keep a remembered position usable after the content behind it changed. */
export function clampStep(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) return 0;
  return Math.min(Math.max(Math.floor(index), 0), total - 1);
}

const key = (lessonId: string) => `pyladder:lesson:${lessonId}`;

export function loadStep(topicId: string): number {
  try {
    const raw = localStorage.getItem(key(topicId));
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveStep(topicId: string, index: number): void {
  try { localStorage.setItem(key(topicId), String(Math.max(0, Math.floor(index)))); } catch { /* storage blocked */ }
}
