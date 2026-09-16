// STUB. Replaced by the runtime implementation (owner: runtime agent). Keep the exported names.
import { signal } from '@preact/signals';
import type { PyClient, RuntimeStatus } from './protocol.ts';

export function createPyClient(): PyClient {
  const status = signal<RuntimeStatus>({ state: 'idle' });
  const notImpl = async () => { throw new Error('python runtime not implemented'); };
  return { status, warmUp: () => {}, run: notImpl, runTests: notImpl, analyze: notImpl, pair: notImpl, restart: () => {} };
}
