// Monaco themes for PyLadder. Monaco needs literal hex colours, so these mirror src/styles/tokens.css
// (light values from :root, dark values from [data-theme="dark"]). Keep them in sync when tokens change.
// Pure data with no Monaco import, so contrast and hue-ban tests can scan them.

export interface ThemeRule { token: string; foreground?: string; fontStyle?: string }
export interface ThemeData {
  base: 'vs' | 'vs-dark';
  inherit: boolean;
  rules: ThemeRule[];
  colors: Record<string, string>;
}

interface Palette {
  editorBg: string; editorLine: string; editorSelection: string;
  text: string; muted: string; faint: string;
  border: string; borderStrong: string; surface: string; surface2: string; surface3: string;
  accent: string; accentSoft: string; hint: string; ok: string; bad: string; hard: string;
  keyword: string; string: string; number: string; comment: string; fn: string; builtin: string;
}

const LIGHT: Palette = {
  editorBg: '#ffffff', editorLine: '#f4f6f8', editorSelection: '#d6e8ff',
  text: '#14181d', muted: '#4a5460', faint: '#5b6571',
  border: '#d5dbe2', borderStrong: '#b9c1cb', surface: '#ffffff', surface2: '#f7f8fa', surface3: '#e2e7ed',
  accent: '#2c64a3', accentSoft: '#2c64a317', hint: '#825c00', ok: '#17753f', bad: '#b8322a', hard: '#a8420c',
  keyword: '#0b50a8', string: '#a31515', number: '#0b6b43', comment: '#4f6f3a', fn: '#74501c', builtin: '#1f6f7a',
};

const DARK: Palette = {
  editorBg: '#0d1117', editorLine: '#141a21', editorSelection: '#1d3b5a',
  text: '#e3e8ee', muted: '#9ba6b3', faint: '#8b96a3',
  border: '#2a333e', borderStrong: '#3a4552', surface: '#141a21', surface2: '#1a2129', surface3: '#222a34',
  accent: '#6aa6e6', accentSoft: '#6aa6e61f', hint: '#f2c230', ok: '#4fc488', bad: '#f07a6e', hard: '#f59a5b',
  keyword: '#569cd6', string: '#ce9178', number: '#b5cea8', comment: '#7fa56b', fn: '#dcdcaa', builtin: '#4ec9b0',
};

const strip = (hex: string) => hex.replace('#', '');

function build(p: Palette, base: 'vs' | 'vs-dark'): ThemeData {
  return {
    base,
    inherit: true,
    rules: [
      { token: '', foreground: strip(p.text) },
      { token: 'keyword', foreground: strip(p.keyword) },
      { token: 'string', foreground: strip(p.string) },
      { token: 'string.escape', foreground: strip(p.string) },
      { token: 'number', foreground: strip(p.number) },
      { token: 'comment', foreground: strip(p.comment), fontStyle: 'italic' },
      { token: 'function', foreground: strip(p.fn) },
      { token: 'predefined', foreground: strip(p.builtin) },
      { token: 'identifier', foreground: strip(p.text) },
      { token: 'delimiter', foreground: strip(p.muted) },
      { token: 'operator', foreground: strip(p.text) },
      { token: 'tag', foreground: strip(p.builtin) },
    ],
    colors: {
      'editor.background': p.editorBg,
      'editor.foreground': p.text,
      'editor.lineHighlightBackground': p.editorLine,
      'editor.lineHighlightBorder': p.editorLine,
      'editor.selectionBackground': p.editorSelection,
      'editor.inactiveSelectionBackground': p.editorSelection,
      'editor.selectionHighlightBackground': p.accentSoft,
      'editor.wordHighlightBackground': p.accentSoft,
      'editor.wordHighlightStrongBackground': p.accentSoft,
      'editor.findMatchBackground': p.editorSelection,
      'editor.findMatchHighlightBackground': p.accentSoft,
      'editorCursor.foreground': p.accent,
      'editorLineNumber.foreground': p.faint,
      'editorLineNumber.activeForeground': p.text,
      'editorIndentGuide.background1': p.border,
      'editorIndentGuide.activeBackground1': p.borderStrong,
      'editorWhitespace.foreground': p.borderStrong,
      'editorRuler.foreground': p.border,
      'editorGutter.background': p.editorBg,
      'editorError.foreground': p.bad,
      'editorWarning.foreground': p.hint,
      'editorInfo.foreground': p.accent,
      'editorBracketMatch.background': p.accentSoft,
      'editorBracketMatch.border': p.borderStrong,
      // Bracket pair colours: palette values only (Monaco's default orchid is purple).
      'editorBracketHighlight.foreground1': p.accent,
      'editorBracketHighlight.foreground2': p.hint,
      'editorBracketHighlight.foreground3': p.ok,
      'editorBracketHighlight.foreground4': p.hard,
      'editorBracketHighlight.foreground5': p.builtin,
      'editorBracketHighlight.foreground6': p.muted,
      'editorBracketHighlight.unexpectedBracket.foreground': p.bad,
      'editorBracketPairGuide.activeBackground1': p.borderStrong,
      'editorWidget.background': p.surface,
      'editorWidget.foreground': p.text,
      'editorWidget.border': p.border,
      'editorHoverWidget.background': p.surface,
      'editorHoverWidget.border': p.border,
      'editorSuggestWidget.background': p.surface,
      'editorSuggestWidget.border': p.border,
      'editorSuggestWidget.foreground': p.text,
      'editorSuggestWidget.selectedBackground': p.surface3,
      'editorSuggestWidget.selectedForeground': p.text,
      'editorSuggestWidget.highlightForeground': p.accent,
      'editorSuggestWidget.focusHighlightForeground': p.accent,
      'list.hoverBackground': p.surface2,
      'list.activeSelectionBackground': p.surface3,
      'list.activeSelectionForeground': p.text,
      'list.focusOutline': p.accent,
      'focusBorder': p.accent,
      'input.background': p.surface,
      'input.border': p.borderStrong,
      'input.foreground': p.text,
      'inputOption.activeBorder': p.accent,
      'scrollbarSlider.background': p.border + 'b3',
      'scrollbarSlider.hoverBackground': p.borderStrong,
      'scrollbarSlider.activeBackground': p.borderStrong,
      'symbolIcon.keywordForeground': p.muted,
      'symbolIcon.functionForeground': p.accent,
      'symbolIcon.methodForeground': p.accent,
      'symbolIcon.constructorForeground': p.accent,
      'symbolIcon.variableForeground': p.accent,
      'symbolIcon.textForeground': p.muted,
      'symbolIcon.classForeground': p.hard,
      'symbolIcon.eventForeground': p.hard,
      'symbolIcon.snippetForeground': p.muted,
      'widget.shadow': '#00000026',
      'diffEditor.insertedTextBackground': p.ok + '26',
      'diffEditor.removedTextBackground': p.bad + '26',
    },
  };
}

export const MONACO_THEMES = {
  'pyladder-light': build(LIGHT, 'vs'),
  'pyladder-dark': build(DARK, 'vs-dark'),
} as const;

export type MonacoThemeName = keyof typeof MONACO_THEMES;
