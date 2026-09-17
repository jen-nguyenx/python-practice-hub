// Monaco themes for PyLadder. The editor is dark in BOTH app themes (docs/build/DESIGN.md), with VS Code Dark+
// syntax colours. Monaco needs literal hex colours, so these mirror the --editor-* and --syn-* tokens in
// src/styles/tokens.css ('pyladder-light' = values on :root, 'pyladder-dark' = the dark theme's values).
// Pure data with no Monaco import. Keep in sync when tokens change.

export interface ThemeRule { token: string; foreground?: string; fontStyle?: string }
export interface ThemeData {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: ThemeRule[];
  colors: Record<string, string>;
}

interface Palette {
  bg: string; chrome: string; line: string; selection: string; text: string; gutter: string; muted: string;
  accent: string; ok: string; bad: string; hint: string;
}

const SYN = {
  keyword: '#569cd6', control: '#c586c0', string: '#ce9178', number: '#b5cea8', comment: '#6a9955',
  fn: '#dcdcaa', builtin: '#4ec9b0', variable: '#9cdcfe', delimiter: '#d4d4d4',
};

/** Editor tokens as defined on :root (the editor card inside the light app theme). */
const ON_LIGHT: Palette = {
  bg: '#1b1f1c', chrome: '#232824', line: '#232824', selection: '#1e3a31', text: '#e8eaf0', gutter: '#4e5568', muted: '#7a8090',
  accent: '#5fc4a0', ok: '#6bcb85', bad: '#f2837a', hint: '#f2a94b',
};

/** Editor tokens in the dark app theme. */
const ON_DARK: Palette = { ...ON_LIGHT, bg: '#161a17', chrome: '#1b1f1c', line: '#1f2420' };

const strip = (hex: string) => hex.replace('#', '');

function build(p: Palette): ThemeData {
  return {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: strip(p.text) },
      { token: 'keyword', foreground: strip(SYN.keyword) },
      { token: 'keyword.control', foreground: strip(SYN.control) },
      { token: 'string', foreground: strip(SYN.string) },
      { token: 'string.escape', foreground: strip(SYN.string) },
      { token: 'number', foreground: strip(SYN.number) },
      { token: 'comment', foreground: strip(SYN.comment), fontStyle: 'italic' },
      { token: 'function', foreground: strip(SYN.fn) },
      { token: 'predefined', foreground: strip(SYN.builtin) },
      { token: 'identifier', foreground: strip(SYN.variable) },
      { token: 'delimiter', foreground: strip(SYN.delimiter) },
      { token: 'operator', foreground: strip(SYN.delimiter) },
      { token: 'tag', foreground: strip(SYN.builtin) },
    ],
    colors: {
      'editor.background': p.bg,
      'editor.foreground': p.text,
      'editor.lineHighlightBackground': p.chrome,
      'editor.lineHighlightBorder': p.chrome,
      'editor.selectionBackground': p.selection,
      'editor.inactiveSelectionBackground': p.selection,
      'editor.selectionHighlightBackground': p.selection + '99',
      'editor.wordHighlightBackground': p.selection + '99',
      'editor.wordHighlightStrongBackground': p.selection,
      'editor.findMatchBackground': p.selection,
      'editor.findMatchHighlightBackground': p.selection + '99',
      'editorCursor.foreground': p.accent,
      'editorLineNumber.foreground': p.gutter,
      'editorLineNumber.activeForeground': p.muted,
      'editorIndentGuide.background1': p.line,
      'editorIndentGuide.activeBackground1': p.gutter,
      'editorWhitespace.foreground': p.gutter,
      'editorRuler.foreground': p.line,
      'editorGutter.background': p.bg,
      'editorError.foreground': p.bad,
      'editorWarning.foreground': p.hint,
      'editorInfo.foreground': p.accent,
      'editorBracketMatch.background': p.selection,
      'editorBracketMatch.border': p.gutter,
      'editorBracketHighlight.foreground1': SYN.fn,
      'editorBracketHighlight.foreground2': SYN.variable,
      'editorBracketHighlight.foreground3': SYN.builtin,
      'editorBracketHighlight.foreground4': SYN.fn,
      'editorBracketHighlight.foreground5': SYN.variable,
      'editorBracketHighlight.foreground6': SYN.builtin,
      'editorBracketHighlight.unexpectedBracket.foreground': p.bad,
      'editorBracketPairGuide.activeBackground1': p.gutter,
      'editorWidget.background': p.chrome,
      'editorWidget.foreground': p.text,
      'editorWidget.border': p.gutter,
      'editorHoverWidget.background': p.chrome,
      'editorHoverWidget.border': p.gutter,
      'editorSuggestWidget.background': p.chrome,
      'editorSuggestWidget.border': p.gutter,
      'editorSuggestWidget.foreground': p.text,
      'editorSuggestWidget.selectedBackground': p.selection,
      'editorSuggestWidget.selectedForeground': p.text,
      'editorSuggestWidget.highlightForeground': p.accent,
      'editorSuggestWidget.focusHighlightForeground': p.accent,
      'list.hoverBackground': p.line,
      'list.activeSelectionBackground': p.selection,
      'list.activeSelectionForeground': p.text,
      'list.focusOutline': p.accent,
      'focusBorder': p.accent,
      'input.background': p.bg,
      'input.border': p.gutter,
      'input.foreground': p.text,
      'inputOption.activeBorder': p.accent,
      'scrollbarSlider.background': p.gutter + '80',
      'scrollbarSlider.hoverBackground': p.gutter,
      'scrollbarSlider.activeBackground': p.muted,
      'symbolIcon.keywordForeground': SYN.keyword,
      'symbolIcon.functionForeground': SYN.fn,
      'symbolIcon.methodForeground': SYN.fn,
      'symbolIcon.constructorForeground': SYN.fn,
      'symbolIcon.variableForeground': SYN.variable,
      'symbolIcon.textForeground': p.muted,
      'symbolIcon.classForeground': SYN.builtin,
      'symbolIcon.eventForeground': SYN.builtin,
      'symbolIcon.snippetForeground': p.muted,
      'widget.shadow': '#00000066',
      'diffEditor.insertedTextBackground': p.ok + '26',
      'diffEditor.removedTextBackground': p.bad + '26',
    },
  };
}

export const MONACO_THEMES = {
  'pyladder-light': build(ON_LIGHT),
  'pyladder-dark': build(ON_DARK),
} as const;

export type MonacoThemeName = keyof typeof MONACO_THEMES;
