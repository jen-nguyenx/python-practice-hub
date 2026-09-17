// Chips are fully rounded tinted pills (format, pass/fail, status). Difficulty is 1-3 pips in ink-2, never coloured.
import type { ComponentChildren } from 'preact';
import type { Diff, Format } from '../../content/ids.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';

export type ChipTone = 'easy' | 'medium' | 'hard' | 'ok' | 'bad' | 'accent' | 'hint' | 'info' | 'neutral';

export function Chip({ tone, children, title, class: cls, dot }: { tone?: ChipTone; children: ComponentChildren; title?: string; class?: string; dot?: boolean }) {
  return <span class={`chip${tone ? ' ' + tone : ''}${dot ? ' dot' : ''}${cls ? ' ' + cls : ''}`} title={title}>{children}</span>;
}

const DIFF_TEXT: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const DIFF_PIPS: Record<Diff, number> = { easy: 1, medium: 2, hard: 3 };
export const DIFF_LEGEND: Record<Diff, string> = {
  easy: 'One idea used as taught. Under 2 minutes.',
  medium: 'Two ideas together, or one twist. 2 to 6 minutes.',
  hard: 'Needs planning or has hidden edge cases. 6 to 15 minutes.',
};

/** Difficulty as 1-3 small pips. The word is available to screen readers and in the hover title. */
export function DiffChip({ diff, showText }: { diff: Diff; showText?: boolean }) {
  const n = DIFF_PIPS[diff] ?? 1;
  return (
    <span class="diff" title={`${DIFF_TEXT[diff]}: ${DIFF_LEGEND[diff]}`}>
      <span class="pips" aria-hidden="true">
        {[1, 2, 3].map((i) => <i key={i} class={i <= n ? undefined : 'off'} />)}
      </span>
      {showText ? <span class="diff-text">{DIFF_TEXT[diff]}</span> : <span class="sr-only">{DIFF_TEXT[diff]}</span>}
    </span>
  );
}

/** Format pill: info tint with a dot, e.g. "Predict the output". */
export function FormatChip({ format }: { format: Format }) {
  return <Chip class="fmt">{FORMAT_LABEL[format]}</Chip>;
}
