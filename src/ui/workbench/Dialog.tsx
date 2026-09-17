// Workbench dialogs on top of the shared <Dialog> (native <dialog>: focus trap, Esc, focus return).
import type { ComponentChildren, JSX } from 'preact';
import { useCallback, useRef, useState } from 'preact/hooks';
import { Button } from '../components/Button.tsx';
import { Dialog as BaseDialog } from '../components/Dialog.tsx';
import './workbench.css';

export function Dialog({ open, title, onClose, children, initialFocus }: { open: boolean; title: string; onClose: () => void; children: ComponentChildren; initialFocus?: string }) {
  return (
    <BaseDialog open={open} title={title} onClose={onClose} size="sm" class="wb-dialog" initialFocus={initialFocus}>
      {children}
    </BaseDialog>
  );
}

export interface ConfirmOptions { title: string; body: string; confirmLabel: string; cancelLabel?: string; danger?: boolean }

export function ConfirmDialog({ options, onResult }: { options: ConfirmOptions | null; onResult: (ok: boolean) => void }) {
  return (
    <BaseDialog
      open={!!options}
      title={options?.title ?? 'Confirm'}
      onClose={() => onResult(false)}
      size="sm"
      class="wb-dialog"
      initialFocus=".wb-confirm-ok"
      footer={
        <>
          <Button onClick={() => onResult(false)}>{options?.cancelLabel ?? 'Cancel'}</Button>
          <Button class="wb-confirm-ok" variant={options?.danger ? 'danger' : 'primary'} onClick={() => onResult(true)}>{options?.confirmLabel}</Button>
        </>
      }
    >
      <p>{options?.body}</p>
    </BaseDialog>
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
