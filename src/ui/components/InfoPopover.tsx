// Small disclosure popover for help text (e.g. the difficulty legend). Opens on click, closes on Esc or outside click.
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { Icon } from './Icon.tsx';
import './controls.css';

export function InfoPopover({ label, children, align = 'left', buttonText }: { label: string; children: ComponentChildren; align?: 'left' | 'right'; buttonText?: ComponentChildren }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);
  return (
    <span class="pop" ref={wrap}>
      <button ref={btn} type="button" class={buttonText ? 'btn ghost sm' : 'icon-btn sm'} aria-expanded={open} aria-controls={id} aria-label={buttonText ? undefined : label} onClick={() => setOpen(!open)}>
        <Icon name="info" />
        {buttonText}
      </button>
      <div id={id} class={`pop-panel${align === 'right' ? ' right' : ''}`} hidden={!open}>
        {children}
      </div>
    </span>
  );
}
