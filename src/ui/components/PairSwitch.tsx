// Two pages that are really one idea, switched at the top of both.
//
// The icon bar had grown to ten destinations, which is more than anyone holds in their head — the
// glossary went unfound the day it shipped. Reference and Glossary are both "look something up"; the
// run-in and the report are both "how am I doing". Each pair keeps its own route, so every link and
// bookmark still works; what changed is that the bar offers one door instead of two, and the other side
// is a switch away rather than a hunt.
import { navigate } from '../../app/router.ts';
import { Segmented } from './Segmented.tsx';

export interface PairSwitchProps<T extends string> {
  /** Which side is showing. */
  value: T;
  /** The two sides, in order, with the route each one lives at. */
  options: readonly { value: T; label: string; href: string }[];
  label: string;
}

export function PairSwitch<T extends string>({ value, options, label }: PairSwitchProps<T>) {
  return (
    <Segmented
      class="pair-switch"
      size="sm"
      value={value}
      label={label}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
      onChange={(next) => {
        const to = options.find((o) => o.value === next);
        // Replacing rather than pushing: flicking between two views of the same thing should not fill
        // the back button with them.
        if (to) navigate(to.href, true);
      }}
    />
  );
}
