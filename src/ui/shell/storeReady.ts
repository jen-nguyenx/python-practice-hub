// Tracks store.ready as a signal so screens can show a skeleton until events are loaded.
import { signal } from '@preact/signals';
import { store } from '../../app/services.ts';

export const storeReady = signal(false);
/** Set when the store failed to open (for example IndexedDB blocked in a private window). */
export const storeError = signal<string | null>(null);

store.ready.then(
  () => { storeReady.value = true; },
  (err: unknown) => {
    storeError.value = err instanceof Error ? err.message : String(err);
    storeReady.value = true;
  },
);
