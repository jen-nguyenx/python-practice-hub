// Accessible modal dialog built on the native <dialog> element (focus trap and top layer come from the browser).
// Esc calls onClose; focus returns to whatever had it before the dialog opened.
import type { ComponentChildren } from 'preact';
import { useEffect, useId, useRef } from 'preact/hooks';
import { Icon } from './Icon.tsx';
import './controls.css';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ComponentChildren;
  description?: ComponentChildren;
  children?: ComponentChildren;
  footer?: ComponentChildren;
  size?: 'sm' | 'md' | 'lg';
  /** Clicking the dimmed area closes the dialog. Default true. */
  dismissOnBackdrop?: boolean;
  /** Show the X button in the header. Default true. */
  showClose?: boolean;
  /** CSS selector of the element to focus when the dialog opens (inside the dialog). */
  initialFocus?: string;
  class?: string;
}

export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissOnBackdrop = true, showClose = true, initialFocus, class: cls }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try { d.showModal(); } catch { d.setAttribute('open', ''); }
      if (initialFocus) {
        const el = d.querySelector<HTMLElement>(initialFocus);
        el?.focus();
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  // If the dialog unmounts while open (route change), still give focus back.
  useEffect(() => () => {
    const el = returnTo.current;
    if (el && el.isConnected) el.focus();
  }, []);

  const handleClose = () => {
    const el = returnTo.current;
    returnTo.current = null;
    if (el && el.isConnected) el.focus();
  };

  return (
    <dialog
      ref={ref}
      class={`dlg dlg-${size}${cls ? ' ' + cls : ''}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => { e.preventDefault(); onCloseRef.current(); }}
      onClose={handleClose}
      onClick={(e) => { if (dismissOnBackdrop && e.target === ref.current) onCloseRef.current(); }}
    >
      {open ? (
        <div class="dlg-inner">
          <div class="dlg-head">
            <div>
              <h2 class="dlg-title" id={titleId}>{title}</h2>
              {description ? <p class="dlg-desc" id={descId}>{description}</p> : null}
            </div>
            {showClose ? (
              <button type="button" class="icon-btn sm dlg-close" aria-label="Close" onClick={() => onCloseRef.current()}>
                <Icon name="x" />
              </button>
            ) : null}
          </div>
          {children ? <div class="dlg-body">{children}</div> : null}
          {footer ? <div class="dlg-foot">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}
