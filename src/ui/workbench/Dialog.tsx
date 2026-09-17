// Modal dialog built on <dialog> (native focus handling and Esc to close).
import type { ComponentChildren, JSX } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '../components/Button.tsx';
import './workbench.css';

export function Dialog({ open, title, onClose, children, labelledBy }: { open: boolean; title: string; onClose: () => void; children: ComponentChildren; labelledBy?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute('open', '');
      }
    } else if (!open && d.open) d.close();
  }, [open]);
  const id = labelledBy ?? `dlg-${title.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <dialog
      ref={ref}
      class="wb-dialog"
      aria-labelledby={id}
      onClose={() => { if (open) onClose(); }}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
    >
      {open ? (
        <div class="wb-dialog-body">
          <h2 id={id} class="wb-dialog-title">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export interface ConfirmOptions { title: string; body: string; confirmLabel: string; cancelLabel?: string; danger?: boolean }

export function ConfirmDialog({ options, onResult }: { options: ConfirmOptions | null; onResult: (ok: boolean) => void }) {
  return (
    <Dialog open={!!options} title={options?.title ?? 'Confirm'} onClose={() => onResult(false)}>
      <p>{options?.body}</p>
      <div class="wb-dialog-actions">
        <Button onClick={() => onResult(false)}>{options?.cancelLabel ?? 'Cancel'}</Button>
        <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => onResult(true)} autoFocus>{options?.confirmLabel}</Button>
      </div>
    </Dialog>
  );
}

/** `const [confirmEl, confirm] = useConfirm();` render confirmEl, then `if (await confirm({...}))`. */
export function useConfirm(): [JSX.Element, (o: ConfirmOptions) => Promise<boolean>] {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setOptions(o);
  }), []);
  const el = (
    <ConfirmDialog
      options={options}
      onResult={(ok) => {
        setOptions(null);
        const r = resolver.current;
        resolver.current = null;
        r?.(ok);
      }}
    />
  );
  return [el, confirm];
}
