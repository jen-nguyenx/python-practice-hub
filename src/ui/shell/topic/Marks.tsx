// Small state marks for topic page rows, in the style of the home ladder: a status circle (shape + colour + hidden
// text) and difficulty as 1-3 pips in ink-2 (never coloured).
import type { Diff } from '../../../content/ids.ts';
import { DIFF_LEGEND } from '../../components/Chip.tsx';
import { Icon } from '../../components/Icon.tsx';
import type { QStatus } from '../progressData.ts';
import { STATUS_TEXT } from '../progressData.ts';

const DIFF_WORD: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFF_PIPS: Record<Diff, number> = { easy: 1, medium: 2, hard: 3 };

/** solved: filled rung with a tick; tried: rung outline; new: empty sunken circle; answer seen: amber ring. */
export function StatusMark({ status, num }: { status: QStatus; num?: number }) {
  return (
    <span class={`tp-st tp-st-${status}`} title={STATUS_TEXT[status]}>
      {status === 'solved' ? <Icon name="check" size={14} /> : num !== undefined ? <span aria-hidden="true">{num}</span> : null}
      <span class="sr-only">{STATUS_TEXT[status]}: </span>
    </span>
  );
}

export function DiffPips({ diff }: { diff: Diff }) {
  const n = DIFF_PIPS[diff];
  return (
    <span class="tp-pips" title={`${DIFF_WORD[diff]}. ${DIFF_LEGEND[diff]}`}>
      {[1, 2, 3].map((i) => <i key={i} class={i <= n ? 'on' : undefined} aria-hidden="true" />)}
      <span class="sr-only">{DIFF_WORD[diff]}</span>
    </span>
  );
}

export { DIFF_WORD };
