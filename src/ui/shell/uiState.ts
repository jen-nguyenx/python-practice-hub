// Shell-wide UI state shared between the header, screens and dialogs.
import { signal } from '@preact/signals';

/** Keyboard shortcut sheet visibility. Any screen may set this to true to open the sheet. */
export const shortcutSheetOpen = signal(false);
/** Set true to show the first-run tour again (Settings "Show the tour"). */
export const tourOpen = signal(false);
