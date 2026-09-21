// Shell-wide UI state shared between the frame (title bar, icon bar, status bar), screens and dialogs.
import { signal } from '@preact/signals';

/** Keyboard shortcut sheet visibility. Any screen may set this to true to open the sheet. */
export const shortcutSheetOpen = signal(false);
/** Set true to show the first-run tour again (Settings "Show the tour"). */
export const tourOpen = signal(false);
/** Command palette ("Go to question or topic", Cmd/Ctrl+K). */
export const paletteOpen = signal(false);
/**
 * Set true while a screen outside FILL_ROUTES needs the full-height workspace (a running test). The frame then hides
 * the title bar and the icon bar because that screen renders its own focused bar. Reset on unmount.
 */
export const mainFill = signal(false);
/** Optional text a screen shows at the right of the status bar, before the week, e.g. "Ln 4, Col 26". Reset on unmount. */
export const statusBarExtra = signal<string | null>(null);
/**
 * A reference entry chosen from somewhere else (the command palette). The reference page searches for it
 * on arrival and then clears this, so landing there from a search shows the answer, not the whole shelf.
 */
export const referenceJump = signal<string | null>(null);

/**
 * A glossary term chosen from somewhere else (the command palette). The glossary searches for it on
 * arrival and then clears this, so landing there from a search shows the word, not the whole list.
 */
export const glossaryJump = signal<string | null>(null);
