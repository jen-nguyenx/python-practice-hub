// Segmented control built on native radio inputs (arrow keys, labels and focus come for free).
import './segmented.css';

export interface SegmentedOption<T extends string | number> { value: T; label: string }

export function Segmented<T extends string | number>({ name, label, showLabel = false, options, value, onChange, size = 'md' }: {
  name: string;
  label: string;
  showLabel?: boolean;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <fieldset class={`seg${size === 'sm' ? ' sm' : ''}`}>
      <legend class={showLabel ? 'seg-legend label' : 'sr-only'}>{label}</legend>
      <div class="seg-track">
        {options.map((o) => (
          <label key={String(o.value)} class={`seg-opt${o.value === value ? ' on' : ''}`}>
            <input type="radio" name={name} value={String(o.value)} checked={o.value === value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
