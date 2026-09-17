// Three hint tiers, opened one at a time. Locked tiers say what unlocks them.
import type { Md } from '../../content/schema.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { MOD } from './shortcuts.ts';
import './workbench.css';

const TIER_NAME = ['A nudge', 'The plan', 'Part of the code'];

export interface HintLadderProps {
  hints: readonly Md[];
  /** Highest tier opened so far (0 = none). */
  tier: number;
  /** True when the next tier can be opened now. */
  nextAvailable: boolean;
  /** Plain sentence saying what unlocks the next tier, e.g. "after your next check or in 12 s". */
  unlockText: string;
  onNext: () => void;
  disabled?: boolean;
}

export function HintLadder({ hints, tier, nextAvailable, unlockText, onNext, disabled }: HintLadderProps) {
  const total = Math.min(3, hints.length);
  const next = tier + 1;
  return (
    <section class="hints" aria-label="Hints">
      <div class="hints-head">
        <h3 class="label">Hints</h3>
        <span class="faint num">{tier} of {total} used</span>
      </div>
      {hints.slice(0, tier).map((h, i) => (
        <div class="hint-card" key={i}>
          <div class="hint-title"><Icon name="bulb" size={14} /> Hint {i + 1} of {total} · {TIER_NAME[i]}</div>
          <Markdown text={h} />
        </div>
      ))}
      {next <= total ? (
        nextAvailable && !disabled ? (
          <Button variant="hint" size="sm" onClick={onNext} kbd={`${MOD}+'`}>
            <Icon name="bulb" size={14} /> Show hint {next} of {total}
          </Button>
        ) : (
          <p class="hint-locked">
            <Icon name="lock" size={14} /> Hint {next} of {total} {disabled ? 'is not available now.' : `unlocks ${unlockText}.`}
          </p>
        )
      ) : null}
    </section>
  );
}
