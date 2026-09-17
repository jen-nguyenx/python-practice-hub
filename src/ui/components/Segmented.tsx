// Segmented control with radio-group semantics: one tab stop, arrow keys move and select.
// Classes are prefixed "segm" because src/ui/report/segmented.css styles the global .seg / .seg-opt names.
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import './controls.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ComponentChildren;
  /** Optional count shown after the label in mono. */
  count?: number;
  title?: string;
}

export interface SegmentedProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  /** Accessible name for the group (use this or labelledBy). */
  label?: string;
  labelledBy?: string;
  size?: 'sm' | 'md';
  class?: string;
}

export function Segmented<T extends string>({ value, options, onChange, label, labelledBy, size = 'md', class: cls }: SegmentedProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, options.findIndex((o) => o.value === value));

  const onKeyDown = (e: KeyboardEvent) => {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next].value);
    const btns = ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    btns?.[next]?.focus();
  };

  return (
    <div ref={ref} class={`segm${size === 'sm' ? ' segm-sm' : ''}${cls ? ' ' + cls : ''}`} role="radiogroup" aria-label={label} aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          class="segm-opt"
          aria-checked={i === idx}
          tabIndex={i === idx ? 0 : -1}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined ? <span class="segm-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
