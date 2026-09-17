// "Open in Playground": stash a file for the Playground to open, then go there.
import { href, navigate } from '../../app/router.ts';

export const PLAYGROUND_OPEN_KEY = 'pyladder:playground-open';

export interface PendingPlaygroundFile { code: string; name?: string; ts: number }

export function openInPlayground(code: string, name?: string) {
  try {
    const pending: PendingPlaygroundFile = { code, name, ts: Date.now() };
    sessionStorage.setItem(PLAYGROUND_OPEN_KEY, JSON.stringify(pending));
  } catch {
    /* storage blocked: the Playground opens without the file */
  }
  navigate(href.playground());
}

/** Read and remove the pending file (called by the Playground on mount). */
export function takePendingPlaygroundFile(): PendingPlaygroundFile | null {
  try {
    const raw = sessionStorage.getItem(PLAYGROUND_OPEN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PLAYGROUND_OPEN_KEY);
    try {
      const v = JSON.parse(raw) as PendingPlaygroundFile;
      if (v && typeof v.code === 'string') return v;
    } catch {
      return { code: raw, ts: Date.now() };
    }
  } catch {
    /* ignore */
  }
  return null;
}
