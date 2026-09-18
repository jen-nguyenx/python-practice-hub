// Hints: amber-tint callouts labelled HINT 1..3, and the "Show hint" button that respects the controller's gates
// (a tooltip says what unlocks the next hint). Hints close once the question is solved or the answer is shown.
import type { ComponentChildren } from 'preact';
import type { Md } from '../../content/schema.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { MOD } from './shortcuts.ts';
import { Tip } from './Tip.tsx';
import './workbench.css';

export const TIER_NAME = ['A nudge', 'The plan', 'Part of the code'];

export interface HintState {
  hints: readonly Md[];
  /** Highest tier opened so far (0 = none). */
  tier: number;
  /** True when the next tier can be opened now. */
  available: boolean;
  /** Plain words for what unlocks the next tier, e.g. "after your next check or in 12 s". */
  unlockText: string;
  onShow: () => void;
  /** Why hints are closed (solved, answer shown). */
  closedReason?: string | null;
}

export function hintTotal(h: HintState) {
  return Math.min(3, h.hints.length);
}

export function HintCallouts({ hints, tier }: { hints: readonly Md[]; tier: number }) {
  if (tier <= 0) return null;
  return (
    <div class="hint-list">
      {hints.slice(0, tier).map((h, i) => (
        <div class="hint-callout" key={i} role="note" aria-label={`Hint ${i + 1}`}>
          <div class="hint-callout-label">Hint {i + 1}</div>
          <Markdown text={h} />
        </div>
      ))}
    </div>
  );
}

/**
 * "Show hint N" button. `look` is 'secondary' (outline, code questions) or 'hint' (amber tint, read formats and
 * Parsons). A hint that is only locked for now keeps the button focusable (aria-disabled) so the tooltip can say
 * what unlocks it; once hints are closed for good (solved, or the answer shown) the button goes away instead.
 */
export function ShowHintButton({ h, look = 'secondary', numbered = true }: { h: HintState; look?: 'secondary' | 'hint'; numbered?: boolean }) {
  const total = hintTotal(h);
  if (total === 0 || h.tier >= total || h.closedReason) return null;
  const next = h.tier + 1;
  const ready = h.available;
  const tip = ready ? `${TIER_NAME[h.tier] ?? 'Hint'} · ${MOD}+'` : `Unlocks ${h.unlockText}`;
  return (
    <Tip text={tip} side="top" align="start">
      {(id) => (
        <button
          type="button"
          class={`btn hint-btn ${look}${ready ? '' : ' locked'}`}
          aria-disabled={!ready || undefined}
          aria-describedby={id}
          aria-keyshortcuts={`${MOD === '⌘' ? 'Meta' : 'Control'}+'`}
          onClick={() => { if (ready) h.onShow(); }}
        >
          <Icon name={ready ? 'bulb' : 'lock'} size={15} />
          {numbered && h.tier > 0 ? `Show hint ${next}` : 'Show hint'}
        </button>
      )}
    </Tip>
  );
}

/**
 * Hints section for the code-question brief: header with "1 of 3 revealed", callouts, then the actions row.
 * Once hints are closed and none were read there is nothing to count, so only the actions row (the answer link)
 * is left.
 */
export function HintsSection({ h, after }: { h: HintState; after?: ComponentChildren }) {
  const total = hintTotal(h);
  const empty = !!h.closedReason && h.tier === 0;
  return (
    <section class="hints-section" aria-label="Hints">
      {empty ? null : (
        <>
          <div class="hints-head">
            <h2 class="hints-title">Hints</h2>
            <span class="hints-count">{total === 0 ? 'No hints' : `${h.tier} of ${total} revealed`}</span>
          </div>
          <HintCallouts hints={h.hints} tier={h.tier} />
        </>
      )}
      <div class="hints-actions">
        <ShowHintButton h={h} />
        {after}
      </div>
    </section>
  );
}
