// Last-moment backups in localStorage. IndexedDB writes started while a tab is closing or reloading may never
// finish, so the latest unsaved edit is also written synchronously on pagehide and merged back on the next load.

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the IndexedDB copy is still attempted */
  }
}

export function removeBackup(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const DRAFT_KEY = 'pyladder:unsaved-draft';

export interface DraftBackup { qid: string; draft: unknown; ts: number }

export function backupDraft(qid: string, draft: unknown) {
  write(DRAFT_KEY, { qid, draft, ts: Date.now() } satisfies DraftBackup);
}

/** Returns the backed-up draft for this question if it is newer than `savedAt`, and clears the backup. */
export function takeDraftBackup(qid: string, savedAt: number | undefined): DraftBackup | null {
  const b = read<DraftBackup>(DRAFT_KEY);
  if (!b || b.qid !== qid) return null;
  removeBackup(DRAFT_KEY);
  return savedAt === undefined || b.ts > savedAt ? b : null;
}

export const SCRATCH_BACKUP_KEY = 'pyladder:playground-unsaved';

export function backupScratch<T extends { id: string; updatedAt: number }>(files: T[]) {
  if (files.length) write(SCRATCH_BACKUP_KEY, files);
}

export function takeScratchBackup<T extends { id: string; updatedAt: number }>(): T[] {
  const files = read<T[]>(SCRATCH_BACKUP_KEY);
  removeBackup(SCRATCH_BACKUP_KEY);
  return Array.isArray(files) ? files.filter((f) => f && typeof f.id === 'string' && typeof f.updatedAt === 'number') : [];
}
