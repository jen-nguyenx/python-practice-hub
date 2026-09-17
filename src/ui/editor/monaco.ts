// Lazy Monaco chunk. Only imported dynamically from loadMonaco(), so pages without an editor never download it.
import * as monaco from '@monaco/editor/editor.api.js';
import './monacoFeatures.ts';
import { MONACO_THEMES } from './monacoThemes.ts';
import { PY_BUILTINS, PY_KEYWORDS, PY_MONARCH } from './pythonLanguage.ts';

self.MonacoEnvironment = {
  getWorker: () => new Worker(new URL('./editorWorker.ts', import.meta.url), { type: 'module' }),
};

for (const [name, data] of Object.entries(MONACO_THEMES)) {
  monaco.editor.defineTheme(name, data as unknown as monaco.editor.IStandaloneThemeData);
}

// Our tokenizer replaces the bundled grammar's tokens (the bundled language still supplies brackets/indent rules).
monaco.languages.setMonarchTokensProvider('python', PY_MONARCH as unknown as monaco.languages.IMonarchLanguage);

// Registered for '*' so it sits in the same provider group as Monaco's word-based suggestions
// (a 'python'-only provider would outrank and hide them). Only answers for Python models.
monaco.languages.registerCompletionItemProvider('*', {
  provideCompletionItems(model, position) {
    if (model.getLanguageId() !== 'python') return { suggestions: [] };
    const word = model.getWordUntilPosition(position);
    const range = {
      startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
      startColumn: word.startColumn, endColumn: word.endColumn,
    };
    const K = monaco.languages.CompletionItemKind;
    return {
      suggestions: [
        ...PY_KEYWORDS.map((k) => ({ label: k, kind: K.Keyword, insertText: k, range, detail: 'keyword' })),
        ...PY_BUILTINS.map((b) => ({ label: b, kind: K.Function, insertText: b, range, detail: 'built-in function' })),
      ],
    };
  },
});

let fontsWatched = false;
/** Wait (briefly) for JetBrains Mono so Monaco measures the right glyph widths; remeasure when fonts settle. */
export async function ensureFonts(sizePx: number) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const load = Promise.all([
    document.fonts.load(`${sizePx}px "JetBrains Mono"`),
    document.fonts.load(`600 ${sizePx}px "JetBrains Mono"`),
  ]).catch(() => undefined);
  await Promise.race([load, new Promise((r) => setTimeout(r, 1500))]);
  if (!fontsWatched) {
    fontsWatched = true;
    document.fonts.ready.then(() => monaco.editor.remeasureFonts()).catch(() => undefined);
    document.fonts.addEventListener?.('loadingdone', () => monaco.editor.remeasureFonts());
  }
}

export { monaco };
