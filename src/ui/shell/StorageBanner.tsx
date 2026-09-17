// Warns when progress cannot be saved: the store fell back to memory (storageAvailable is false) or failed to open.
import { useState } from 'preact/hooks';
import { storageAvailable } from '../../store/index.ts';
import { Icon } from '../components/Icon.tsx';
import { storeError } from './storeReady.ts';

export function StorageBanner() {
  const [dismissed, setDismissed] = useState(false);
  const unavailable = storageAvailable.value === false;
  const err = storeError.value;
  if (dismissed || (!unavailable && !err)) return null;
  return (
    <div class="storage-banner" role="alert">
      <Icon name="alert" />
      <p>
        <strong>Progress can't be saved in this browser.</strong>{' '}
        This can happen in a private window or when site storage is blocked. You can still practise, but progress is lost when you close the tab.
        Export a backup from Settings before you leave.
      </p>
      <button type="button" class="icon-btn sm" aria-label="Dismiss storage warning" onClick={() => setDismissed(true)}>
        <Icon name="x" />
      </button>
    </div>
  );
}
