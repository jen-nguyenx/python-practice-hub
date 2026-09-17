// Header pill showing the Python runtime state. Visible text updates every second while loading;
// the polite live region only announces state changes, not every tick.
import { useEffect, useRef, useState } from 'preact/hooks';
import { py } from '../../app/services.ts';
import type { RuntimeStatus } from '../../runtime/protocol.ts';

function shortVersion(v: string) {
  const m = /(\d+)\.(\d+)/.exec(v);
  return m ? `${m[1]}.${m[2]}` : v;
}

type Tone = 'loading' | 'ok' | 'busy' | 'bad';

function describe(s: RuntimeStatus, secs: number): { tone: Tone; text: string; short: string; announce: string; title: string } {
  switch (s.state) {
    case 'idle':
      return { tone: 'loading', text: 'Starting Python...', short: 'Python...', announce: 'Python is starting', title: 'Python loads in the background. Read questions work straight away.' };
    case 'loading':
      return { tone: 'loading', text: `Starting Python... ${secs} s`, short: `Python ${secs} s`, announce: 'Python is starting', title: `${s.stage || 'Loading'}. Read questions work while Python starts.` };
    case 'ready':
      return { tone: 'ok', text: `Python ${shortVersion(s.python)} ready`, short: `Python ${shortVersion(s.python)}`, announce: `Python ${shortVersion(s.python)} is ready`, title: `Python ${s.python} is ready` };
    case 'running':
      return { tone: 'busy', text: 'Running', short: 'Running', announce: `Python ${shortVersion(s.python)} is ready`, title: `Python ${s.python} is running your code` };
    case 'restarting':
      return { tone: 'loading', text: 'Restarting Python', short: 'Restarting', announce: 'Python is restarting', title: s.reason || 'Restarting Python' };
    case 'error':
      return { tone: 'bad', text: 'Python failed to load', short: 'Python failed', announce: 'Python failed to load', title: s.message || 'Python failed to load' };
  }
}

export function RuntimePill() {
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
  const d = describe(s, secs);

  const retry = () => {
    py.restart('Retry after load failure');
    py.warmUp();
  };

  return (
    <div class={`rt-pill ${d.tone}`} title={d.title}>
      <span class="rt-dot" aria-hidden="true" />
      <span class="rt-text rt-long" aria-hidden="true">{d.text}</span>
      <span class="rt-text rt-short" aria-hidden="true">{d.short}</span>
      <span class="sr-only" aria-live="polite">{d.announce}</span>
      {s.state === 'error' ? (
        <button type="button" class="rt-retry" onClick={retry}>Retry</button>
      ) : null}
    </div>
  );
}
