// Python runtime state in the title bar and status bar: a small dot and "Python ready".
// Visible text updates every second while loading; one polite live region announces state changes only.
import { useEffect, useRef, useState } from 'preact/hooks';
import { py } from '../../app/services.ts';
import type { RuntimeStatus } from '../../runtime/protocol.ts';
import { Tooltip } from '../components/Tooltip.tsx';

function shortVersion(v: string) {
  const m = /(\d+)\.(\d+)/.exec(v);
  return m ? `${m[1]}.${m[2]}` : v;
}

export type RuntimeTone = 'loading' | 'ok' | 'busy' | 'bad';

export function describeRuntime(s: RuntimeStatus, secs: number): { tone: RuntimeTone; text: string; version: string; announce: string; title: string } {
  switch (s.state) {
    case 'idle':
      return { tone: 'loading', text: 'Starting Python', version: 'Python', announce: 'Python is starting', title: 'Python loads in the background. Reading questions work straight away.' };
    case 'loading':
      return { tone: 'loading', text: secs > 0 ? `Starting Python ${secs} s` : 'Starting Python', version: 'Python', announce: 'Python is starting', title: `${s.stage || 'Loading'}. Reading questions work while Python starts.` };
    case 'ready':
      return { tone: 'ok', text: 'Python ready', version: `Python ${shortVersion(s.python)}`, announce: `Python ${shortVersion(s.python)} is ready`, title: `Python ${s.python} is running in your browser` };
    case 'running':
      return { tone: 'busy', text: 'Running', version: `Python ${shortVersion(s.python)}`, announce: `Python ${shortVersion(s.python)} is ready`, title: `Python ${s.python} is running your code` };
    case 'restarting':
      return { tone: 'loading', text: 'Restarting Python', version: 'Python', announce: 'Python is restarting', title: s.reason || 'Restarting Python' };
    case 'error':
      return { tone: 'bad', text: 'Python failed to load', version: 'Python failed', announce: 'Python failed to load', title: s.message || 'Python failed to load' };
  }
}

/** Seconds since loading started, re-rendering once a second while loading. */
function useRuntime() {
  const s = py.status.value;
  const startedAt = useRef<number | null>(null);
  const [, setTick] = useState(0);
  const loading = s.state === 'loading';
  if (loading && startedAt.current === null) startedAt.current = Date.now() - (s.elapsedMs || 0);
  if (!loading) startedAt.current = null;
  useEffect(() => {
    if (!loading) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);
  let secs = 0;
  if (s.state === 'loading') {
    const local = startedAt.current !== null ? Date.now() - startedAt.current : 0;
    secs = Math.max(0, Math.round(Math.max(s.elapsedMs || 0, local) / 1000));
  }
  return { s, d: describeRuntime(s, secs) };
}

function retry() {
  py.restart('Retry after load failure');
  py.warmUp();
}

/**
 * Title bar: dot + "Python ready", the one polite live region for runtime changes, and Retry on failure.
 * Status bar (`compact`): dot + "Python 3.14" only (no live region, so changes are announced once).
 */
export function RuntimePill({ compact }: { compact?: boolean }) {
  const { s, d } = useRuntime();
  if (compact) {
    return (
      <span class={`rt rt-${d.tone} rt-compact`}>
        <span class="rt-dot" aria-hidden="true" />
        <span class="rt-text">{d.tone === 'ok' || d.tone === 'busy' ? d.version : d.text}</span>
      </span>
    );
  }
  return (
    <div class={`rt rt-${d.tone}`}>
      <Tooltip content={d.title} side="bottom" align="end" decorative>
        <span class="rt-main">
          <span class="rt-dot" aria-hidden="true" />
          <span class="rt-text">{d.text}</span>
        </span>
      </Tooltip>
      <span class="sr-only" aria-live="polite">{d.announce}</span>
      {s.state === 'error' ? <button type="button" class="rt-retry" onClick={retry}>Retry</button> : null}
    </div>
  );
}
