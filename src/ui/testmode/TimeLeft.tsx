// A self-updating countdown label. It re-renders only itself, never the question around it.
import { useEffect, useState } from 'preact/hooks';
import { formatClock } from '../report/format.ts';

export function TimeLeft({ startedAt, limitMs }: { startedAt: number; limitMs: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);
  const left = Math.max(0, limitMs - (now - startedAt));
  return <span role="timer" aria-live="off">{formatClock(left)}</span>;
}
