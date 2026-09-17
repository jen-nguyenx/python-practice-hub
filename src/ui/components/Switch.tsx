// On/off switch (role="switch"). Shows "On"/"Off" text so state is never colour alone.
import type { ComponentChildren } from 'preact';
import './controls.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Visible label next to the switch. Omit and pass labelledBy when the label lives elsewhere. */
  label?: ComponentChildren;
  labelledBy?: string;
  describedBy?: string;
  disabled?: boolean;
  class?: string;
}

export function Switch({ checked, onChange, label, labelledBy, describedBy, disabled, class: cls }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      class={`switch${cls ? ' ' + cls : ''}`}
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span class="switch-track" aria-hidden="true"><span class="switch-thumb" /></span>
      <span class="switch-state" aria-hidden="true">{checked ? 'On' : 'Off'}</span>
      {label ? <span class="switch-label">{label}</span> : null}
    </button>
  );
}
