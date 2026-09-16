import type { ComponentChildren } from 'preact';
import type { Diff, Format } from '../../content/ids.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';

export function Chip({ tone, children, title }: { tone?: 'easy' | 'medium' | 'hard' | 'ok' | 'bad' | 'accent' | 'hint'; children: ComponentChildren; title?: string }) {
  return <span class={`chip${tone ? ' ' + tone : ''}`} title={title}>{children}</span>;
}

const DIFF_TEXT: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const DIFF_LEGEND: Record<Diff, string> = {
  easy: 'One idea used as taught. Under 2 minutes.',
  medium: 'Two ideas together, or one twist. 2 to 6 minutes.',
  hard: 'Needs planning or has hidden edge cases. 6 to 15 minutes.',
};

export function DiffChip({ diff }: { diff: Diff }) {
  return <Chip tone={diff} title={DIFF_LEGEND[diff]}>{DIFF_TEXT[diff]}</Chip>;
}

export function FormatChip({ format }: { format: Format }) {
  return <Chip>{FORMAT_LABEL[format]}</Chip>;
}
