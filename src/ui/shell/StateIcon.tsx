// Small state glyphs for topics and questions. Always paired with text for screen readers by the caller.
import type { TopicState } from '../../engine/progress.ts';
import type { QStatus } from './progressData.ts';
import { Icon } from '../components/Icon.tsx';

/** Topic: check (minimum met), half circle (in progress), open circle (open), lock (locked). */
export function TopicStateIcon({ state, size = 14 }: { state: TopicState; size?: number }) {
  if (state === 'completed') return <Icon name="check" size={size} class="si si-done" />;
  if (state === 'locked') return <Icon name="lock" size={size} class="si si-locked" />;
  return (
    <svg class={`si ${state === 'in-progress' ? 'si-progress' : 'si-open'}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5" />
      {state === 'in-progress' ? <path d="M8 2.75a5.25 5.25 0 0 1 0 10.5z" fill="currentColor" /> : null}
    </svg>
  );
}

/** Question: new ○, tried ◐, solved ●, answer seen ◌. */
export function QuestionStatusDot({ status }: { status: QStatus }) {
  return (
    <svg class={`qd qd-${status}`} width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      {status === 'solved' ? <circle cx="5" cy="5" r="4" fill="currentColor" /> : null}
      {status === 'new' ? <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.25" /> : null}
      {status === 'seen' ? <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.25" stroke-dasharray="2 1.7" /> : null}
      {status === 'tried' ? (
        <>
          <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" stroke-width="1.25" />
          <path d="M5 1.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" />
        </>
      ) : null}
    </svg>
  );
}
