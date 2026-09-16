// STUB. Replaced by the store implementation (owner: engine-store agent). Keep the exported names.
import { signal } from '@preact/signals';
import type { Store } from './types.ts';
import { DEFAULT_SETTINGS } from '../engine/types.ts';

export function createStore(): Store {
  const events = signal([] as never[]);
  const settings = signal(DEFAULT_SETTINGS);
  const notImpl = () => { throw new Error('store not implemented'); };
  return {
    ready: Promise.resolve(), events, settings, sessionId: 'stub',
    append: notImpl as never, updateSettings: (p) => { settings.value = { ...settings.value, ...p }; },
    getSnapshot: async () => undefined, saveSnapshot: () => {}, listScratch: async () => [], saveScratch: async () => {},
    deleteScratch: async () => {}, exportAll: notImpl as never, importAll: notImpl as never, resetAll: notImpl as never,
  };
}
