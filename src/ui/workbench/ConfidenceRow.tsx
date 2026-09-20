// "How sure are you?", asked before the first check.
//
// Asked before, never after: once the result is on the screen, nobody remembers being unsure. The pair
// it produces — what you said, what happened — is the only way to find out whether a topic is genuinely
// solid or merely familiar, which is the difference that decides an exam. Answering is optional; the
// question disappears once a check has been made, and Settings can switch it off for good.
import type { Confidence } from '../../engine/types.ts';
import { Icon } from '../components/Icon.tsx';

export interface ConfidenceRowProps {
  value: Confidence | null;
  onPick: (value: Confidence) => void;
}

const CHOICES: { value: Confidence; label: string }[] = [
  { value: 'sure', label: "I'm sure" },
  { value: 'unsure', label: 'Not sure' },
];

export function ConfidenceRow({ value, onPick }: ConfidenceRowProps) {
  return (
    <div class="qp-conf" role="group" aria-label="How sure are you of your answer?">
      <span class="qp-conf-q">
        <Icon name="help" size={14} />
        Before you check — how sure are you?
      </span>
      {CHOICES.map((c) => (
        <button
          key={c.value}
          type="button"
          class={`qp-conf-btn${value === c.value ? ' is-on' : ''}`}
          aria-pressed={value === c.value}
          onClick={() => onPick(c.value)}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
