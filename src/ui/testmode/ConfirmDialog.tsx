// Calm confirm dialog for the test screens (discard a saved test, start over), on the shared native <dialog>.
import type { ComponentChildren } from 'preact';
import { Button } from '../components/Button.tsx';
import { Dialog } from '../components/Dialog.tsx';

export interface ConfirmProps {
  open: boolean;
  title: string;
  children?: ComponentChildren;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = 'Cancel', danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      class="tx-dialog"
      initialFocus=".tx-dialog-cancel"
      footer={
        <>
          <Button class="tx-dialog-cancel" variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
