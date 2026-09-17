// Disclosure popover for the topic page (Filters, minimum details, notes). The panel follows its button in the DOM,
// so Tab moves straight into it. Closes on Esc (focus returns to the button), outside click, or focus leaving it.
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';

export function Popover({ trigger, triggerClass, triggerLabel, triggerTitle, panelLabel, align = 'left', panelClass, children }: {
  trigger: ComponentChildren;
  triggerClass: string;
  /** Accessible name for the button when its visible content is only an icon. */
  triggerLabel?: string;
  triggerTitle?: string;
  panelLabel: string;
  align?: 'left' | 'right';
  panelClass?: string;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey, true); };
  }, [open]);

  const onFocusOut = (e: FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (open && next && wrap.current && !wrap.current.contains(next)) setOpen(false);
  };

  return (
    <span class="tp-pop" ref={wrap} onFocusOut={onFocusOut}>
      <button
        ref={btn}
        type="button"
        class={triggerClass}
        aria-expanded={open}
        aria-controls={id}
        aria-label={triggerLabel}
        title={triggerTitle}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      <div id={id} role="group" aria-label={panelLabel} class={`tp-pop-panel${align === 'right' ? ' is-right' : ''}${panelClass ? ' ' + panelClass : ''}`} hidden={!open}>
        {children}
      </div>
    </span>
  );
}
