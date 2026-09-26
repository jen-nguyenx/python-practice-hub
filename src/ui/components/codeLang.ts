// Which language the code on screen is written in. A lesson reader provides it once from the lesson's
// track (TRACK_LANG), and every block under it -- code, console sessions, errors, the experiment card --
// reads it, so no block needs to be told separately. Python by default: everything outside the STAT2402
// track is Python, and a component with no provider above it is one of those.
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Lang } from '../../content/lessonSchema.ts';

export const CodeLang = createContext<Lang>('python');

export function useCodeLang(): Lang {
  return useContext(CodeLang);
}

/**
 * An error as the language itself shows it. Python's is "TypeError: message". R's message already is the
 * whole line R printed ("Error in log(-1) : ..."), so adding a type in front would put words in R's mouth.
 */
export function errorText(e: { type: string; message: string }, lang: Lang): string {
  if (lang === 'r') return e.message;
  return `${e.type}${e.message ? `: ${e.message}` : ''}`;
}

/** What to call the thing that runs the code, in plain words for a button or a status line. */
export const LANG_NAME: Record<Lang, string> = { python: 'Python', r: 'R' };
