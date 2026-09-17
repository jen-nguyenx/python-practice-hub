// "Delete file?" confirm for the Playground (shared native dialog: focus trap, Esc, focus return).
import { useCallback, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { ScratchFile } from '../../store/types.ts';
import { Button } from '../components/Button.tsx';
import { Dialog } from '../components/Dialog.tsx';

export function useConfirmDelete(): [JSX.Element, (f: ScratchFile) => Promise<boolean>] {
  const [file, setFile] = useState<ScratchFile | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const ask = useCallback((f: ScratchFile) => new Promise<boolean>((resolve) => {
    resolver.current?.(false);
    resolver.current = resolve;
    setFile(f);
  }), []);
  const done = (ok: boolean) => {
    setFile(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(ok);
  };
  const el = (
    <Dialog
      open={!!file}
      title={`Delete ${file?.name ?? 'file'}?`}
      onClose={() => done(false)}
      size="sm"
      initialFocus=".pg-confirm-cancel"
      footer={
        <>
          <Button class="pg-confirm-cancel" onClick={() => done(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => done(true)}>Delete</Button>
        </>
      }
    >
      <p>This removes the file from this browser. It cannot be undone.</p>
    </Dialog>
  );
  return [el, ask];
}
