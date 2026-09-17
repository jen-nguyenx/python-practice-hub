// Canonical keyboard shortcuts, as implemented by the workbench. Listed by the shortcut sheet.
import { ALT_KEY, MOD_KEY } from './format.ts';

export interface ShortcutRow {
  action: string;
  /** Each inner array is one key combination; multiple arrays are alternatives or a sequence (see `sequence`). */
  keys: string[][];
  sequence?: boolean;
  where: string;
  /** A single key press. Turned off when settings.singleKeyShortcuts is false. */
  singleKey?: boolean;
}

export interface ShortcutGroup { title: string; rows: ShortcutRow[] }

export const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Answering',
    rows: [
      { action: 'Run your code, or Check your answer', keys: [[MOD_KEY, 'Enter']], where: 'Question page' },
      { action: 'Submit (coding questions)', keys: [[MOD_KEY, 'Shift', 'Enter']], where: 'Question page' },
      { action: 'Show the next hint', keys: [[MOD_KEY, "'"]], where: 'Question page' },
      { action: 'Choose a multiple choice option', keys: [['1-5']], where: 'Outside text fields', singleKey: true },
    ],
  },
  {
    title: 'Moving around',
    rows: [
      { action: 'Next question', keys: [[ALT_KEY, 'Shift', ']']], where: 'Anywhere' },
      { action: 'Previous question', keys: [[ALT_KEY, 'Shift', '[']], where: 'Anywhere' },
      { action: 'Next question', keys: [[']']], where: 'Outside text fields', singleKey: true },
      { action: 'Previous question', keys: [['[']], where: 'Outside text fields', singleKey: true },
      { action: 'Go to a question, topic or page', keys: [[MOD_KEY, 'K'], [MOD_KEY, 'P']], where: 'Anywhere' },
      { action: 'Show this list', keys: [['?']], where: 'Outside text fields', singleKey: true },
    ],
  },
  {
    title: 'Code editor',
    rows: [
      { action: 'Leave the code editor', keys: [['Esc'], ['Tab']], sequence: true, where: 'In the editor' },
      { action: 'Tab moves focus instead of indenting (toggle)', keys: [['Ctrl', 'M']], where: 'In the editor' },
    ],
  },
];
