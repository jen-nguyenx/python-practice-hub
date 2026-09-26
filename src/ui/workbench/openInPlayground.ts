// "Open in Playground": stash a file for the Playground to open, then go there.
import { href, navigate } from '../../app/router.ts';

export const PLAYGROUND_OPEN_KEY = 'pyladder:playground-open';
/**
 * Where to go back to. Kept separately from the file because the file is consumed the moment the
 * Playground opens, while the way back has to survive for as long as the reader is there.
 */
export const PLAYGROUND_BACK_KEY = 'pyladder:playground-back';

export interface PendingPlaygroundFile { code: string; name?: string; ts: number }
/** A link back to whatever sent the reader here, so taking code away is not a one-way trip. */
export interface PlaygroundReturn { href: string; label: string }

/** The R Playground's hand-off slot: one buffer, so only the code travels. */
export const R_PLAYGROUND_OPEN_KEY = 'pyladder:r-playground-open';

/** "Try it yourself" from an R lesson: the same hand-off, to the R Playground (#/r). */
export function openInRPlayground(code: string, back?: PlaygroundReturn) {
  try {
    sessionStorage.setItem(R_PLAYGROUND_OPEN_KEY, JSON.stringify({ code, ts: Date.now() }));
    if (back && back.href && back.label) sessionStorage.setItem(PLAYGROUND_BACK_KEY, JSON.stringify(back));
    else sessionStorage.removeItem(PLAYGROUND_BACK_KEY);
  } catch {
    /* storage blocked: the R Playground opens with what it had */
  }
  navigate(href.rPlayground());
}

/** Read and remove code handed to the R Playground (called on mount). */
export function takePendingRCode(): string | null {
  try {
    const raw = sessionStorage.getItem(R_PLAYGROUND_OPEN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(R_PLAYGROUND_OPEN_KEY);
    const v = JSON.parse(raw) as { code?: unknown };
    return typeof v?.code === 'string' ? v.code : null;
  } catch {
    return null;
  }
}

export function openInPlayground(code: string, name?: string, back?: PlaygroundReturn) {
  try {
    const pending: PendingPlaygroundFile = { code, name, ts: Date.now() };
    sessionStorage.setItem(PLAYGROUND_OPEN_KEY, JSON.stringify(pending));
    if (back && back.href && back.label) sessionStorage.setItem(PLAYGROUND_BACK_KEY, JSON.stringify(back));
    else sessionStorage.removeItem(PLAYGROUND_BACK_KEY);
  } catch {
    /* storage blocked: the Playground opens without the file */
  }
  navigate(href.playground());
}

/** The way back, if the reader arrived from somewhere. Left in place so it survives a re-render. */
export function playgroundReturn(): PlaygroundReturn | null {
  try {
    const raw = sessionStorage.getItem(PLAYGROUND_BACK_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as PlaygroundReturn;
    // Only ever an in-app hash route: this comes from storage, which a page on the same origin can write.
    if (v && typeof v.href === 'string' && v.href.startsWith('#/') && typeof v.label === 'string') {
      return { href: v.href, label: v.label.slice(0, 80) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearPlaygroundReturn() {
  try { sessionStorage.removeItem(PLAYGROUND_BACK_KEY); } catch { /* ignore */ }
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
