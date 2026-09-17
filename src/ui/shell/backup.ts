// Export / import / persistence helpers used by Settings and the landing backup reminder.
import { store } from '../../app/services.ts';
import type { ExportFile } from '../../store/types.ts';
import { isoDay } from './format.ts';

export function exportFilename(ts = Date.now()) {
  return `pyladder-progress-${isoDay(ts)}.json`;
}

/** Builds the export file and starts a download. Updates settings.lastExportTs. Throws on failure. */
export async function downloadExport(): Promise<string> {
  const firstExport = store.settings.value.lastExportTs === null;
  const data = await store.exportAll();
  const filename = exportFilename();
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  store.updateSettings({ lastExportTs: Date.now() });
  // Asking for persistent storage after the first export is the least surprising moment (plan 0.6).
  if (firstExport) void requestPersist();
  return filename;
}

export type ImportCheck = { ok: true; file: ExportFile } | { ok: false; message: string };

/** Parses and sanity-checks an export file. The store validates events in depth. */
export function checkImport(text: string): ImportCheck {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, message: 'This file is not valid JSON. Choose a file exported from PyLadder.' };
  }
  if (!data || typeof data !== 'object') return { ok: false, message: 'This file is not a PyLadder export.' };
  const d = data as Partial<ExportFile>;
  if (d.format !== 'pyladder-export') return { ok: false, message: 'This file is not a PyLadder export.' };
  if (d.version !== 1) return { ok: false, message: `This export was made by a different version of PyLadder (version ${String(d.version)}).` };
  if (!Array.isArray(d.events)) return { ok: false, message: 'This export has no progress data in it.' };
  return { ok: true, file: { ...d, snapshots: Array.isArray(d.snapshots) ? d.snapshots : [], scratch: Array.isArray(d.scratch) ? d.scratch : [] } as ExportFile };
}

export type PersistState = 'granted' | 'not-granted' | 'unsupported';

export async function persistState(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persisted) return 'unsupported';
    return (await navigator.storage.persisted()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}

export async function requestPersist(): Promise<PersistState> {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    return (await navigator.storage.persist()) ? 'granted' : 'not-granted';
  } catch {
    return 'unsupported';
  }
}
