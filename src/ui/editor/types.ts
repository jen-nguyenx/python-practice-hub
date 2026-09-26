export interface EditorMarker {
  /** 1-based line. */
  line: number;
  /** 1-based start column; defaults to the first non-space character. */
  col?: number;
  /** 1-based exclusive end column; defaults to the end of the line. */
  endCol?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** Paper mode: plain text, no suggestions, no bracket colours. */
  plain?: boolean;
  /** The language being written. Python unless set; R for STAT2402, indented by two spaces. */
  language?: 'python' | 'r';
  /** Auto-grow between these heights (px). Ignored when `fill` is set. */
  minHeight?: number;
  maxHeight?: number;
  /** Fill the parent's height instead of growing with the content. */
  fill?: boolean;
  markers?: EditorMarker[];
  /** Cmd/Ctrl+Enter */
  onRun?: () => void;
  /** Cmd/Ctrl+Shift+Enter */
  onSubmit?: () => void;
  onCursor?: (line: number, col: number) => void;
  ariaLabel: string;
  /** Hide the "Esc then Tab" footer line (e.g. when a status bar shows it). */
  hideHint?: boolean;
  class?: string;
}
