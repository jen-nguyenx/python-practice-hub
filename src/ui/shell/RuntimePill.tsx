// Runtime state in the title bar and status bar: a small dot and "Python ready" -- or, for a STAT2402
// student, "R ready". Visible text updates every second while loading; one polite live region announces
// state changes only.
import { useEffect, useRef, useState } from 'preact/hooks';
import { py, r, store } from '../../app/services.ts';
import { unitOf } from '../../content/units.ts';
import type { RuntimeStatus } from '../../runtime/protocol.ts';
import type { RStatus } from '../../runtime/rClient.ts';
import { WEBR_VERSION } from '../../runtime/version.ts';
import { Tooltip } from '../components/Tooltip.tsx';

function shortVersion(v: string) {
  const m = /(\d+)\.(\d+)/.exec(v);
  return m ? `${m[1]}.${m[2]}` : v;
}

export type RuntimeTone = 'idle' | 'loading' | 'ok' | 'busy' | 'bad';

export function describeRuntime(s: RuntimeStatus, secs: number): { tone: RuntimeTone; text: string; version: string; announce: string; title: string } {
  switch (s.state) {
    case 'idle':
      // Python has not been asked for yet: normally for a moment before the shell warms it up, and for
      // as long as the student stays off coding pages when the browser reports data saver.
      return { tone: 'idle', text: 'Python not started', version: 'Python', announce: 'Python has not started', title: 'Python starts when you open a coding question or the Playground.' };
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

export function describeR(s: RStatus): { tone: RuntimeTone; text: string; announce: string; title: string } {
  switch (s.state) {
    case 'idle':
      return { tone: 'idle', text: 'R not started', announce: 'R has not started', title: 'R starts when you run code: an exercise in a lesson, or the R Playground.' };
    case 'loading':
      return { tone: 'loading', text: 'Starting R', announce: 'R is starting', title: `${s.message ?? 'Starting R'}. Reading a lesson works while R starts.` };
    case 'ready':
      return { tone: 'ok', text: 'R ready', announce: 'R is ready', title: `R (webR ${WEBR_VERSION}) is running in your browser` };
    case 'running':
      return { tone: 'busy', text: s.message ?? 'Running', announce: 'R is ready', title: s.message ? `${s.message}: the first use of a package downloads it` : 'R is running your code' };
    case 'error':
      return { tone: 'bad', text: 'R failed to load', announce: 'R failed to load', title: s.message ?? 'R failed to load' };
  }
}

/** The R pill: the same look as Python's, fed by the R client. Retry just asks again; R starts afresh. */
export function RRuntimePill({ compact }: { compact?: boolean }) {
  const s = r.status.value;
  const d = describeR(s);
  if (compact) {
    return (
      <span class={`rt rt-${d.tone} rt-compact`}>
        <span class="rt-dot" aria-hidden="true" />
        <span class="rt-text">{d.text}</span>
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
      {s.state === 'error' ? <button type="button" class="rt-retry" onClick={() => r.warmUp()}>Retry</button> : null}
    </div>
  );
}

/** Whichever runtime this student's unit uses. */
export function UnitRuntimePill({ compact }: { compact?: boolean }) {
  return unitOf(store.settings.value) === 'stat2402' ? <RRuntimePill compact={compact} /> : <RuntimePill compact={compact} />;
}
