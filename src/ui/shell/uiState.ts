// Shell-wide UI state shared between the frame (top bar), screens and dialogs.
import { signal } from '@preact/signals';

/** Keyboard shortcut sheet visibility. Any screen may set this to true to open the sheet. */
export const shortcutSheetOpen = signal(false);
/** Set true to show the first-run tour again (Settings "Show the tour"). */
export const tourOpen = signal(false);
/**
 * Set true while a screen outside FILL_ROUTES needs the full-height workspace (a running test). The frame then hides
 * the global top bar because that screen renders its own focused bar. Reset on unmount.
 */
export const mainFill = signal(false);
