// Small shared pieces of the code formats: the busy line and the checks counter text.
import type { RuntimeStatus } from '../../../runtime/protocol.ts';
import { isStarting } from '../../workbench/plain.ts';
import './code.css';

export function BusyLine({ status, starting, running }: { status: RuntimeStatus; starting: string; running: string }) {
  return (
    <p class="term-status" aria-live="polite">
      <span class="term-dot" aria-hidden="true" />
      {isStarting(status) ? `Starting Python · ${starting}` : running}
    </p>
  );
}

/** "2 checks left", "One check", "Answer submitted". */
export function checksText(testMode: boolean, checks: number, checksLeft: number): string {
  if (testMode) return checks ? 'Answer submitted' : 'One check';
  if (!Number.isFinite(checksLeft)) return '';
  const n = Math.max(0, checksLeft);
  return `${n} ${n === 1 ? 'check' : 'checks'} left`;
}
