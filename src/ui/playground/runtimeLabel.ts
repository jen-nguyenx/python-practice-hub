// Short mono runtime label for the Playground card strip, e.g. "Python 3.14 · runs in your browser".
import type { RuntimeStatus } from '../../runtime/protocol.ts';

export function shortPython(version: string | undefined): string {
  const v = /\d+\.\d+/.exec(version ?? '')?.[0];
  return v ? `Python ${v}` : 'Python';
}

export function runtimeLabel(s: RuntimeStatus): string {
  switch (s.state) {
    case 'idle': return 'Python not started';
    case 'loading': return `Starting Python · ${Math.max(0, Math.round(s.elapsedMs / 1000))} s`;
    case 'ready': return `${shortPython(s.python)} · runs in your browser`;
    case 'running': return `${shortPython(s.python)} · running`;
    case 'restarting': return 'Restarting Python';
    case 'error': return 'Python could not start';
  }
}
