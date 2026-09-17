// Code editor: Monaco (lazy chunk) on desktop, a textarea editor on touch/narrow screens or if Monaco fails.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type * as MonacoApi from '@monaco/editor/editor.api.js';
import { store } from '../../app/services.ts';
import { loadMonaco, prefersMonaco } from './loadMonaco.ts';
import type { MonacoModule } from './loadMonaco.ts';
import { TextareaEditor } from './TextareaEditor.tsx';
import { resolveTheme, useResolvedTheme } from './useResolvedTheme.ts';
import type { CodeEditorProps, EditorMarker } from './types.ts';
import './editor.css';

export type { CodeEditorProps, EditorMarker } from './types.ts';

const PAD = 16;
export function lineHeightFor(fontSize: number) {
  return Math.round(fontSize * 1.65);
}
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function CodeEditor(props: CodeEditorProps) {
  const [kind, setKind] = useState<'monaco' | 'textarea'>(() => (prefersMonaco() ? 'monaco' : 'textarea'));
  if (kind === 'textarea') return <TextareaEditor {...props} />;
  return <MonacoEditor {...props} onFail={() => setKind('textarea')} />;
}

/** Session-wide "Tab moves focus" toggle (Ctrl+M), shared by every Monaco editor. */
let tabMovesFocusGlobal = false;

function MonacoEditor(props: CodeEditorProps & { onFail: () => void }) {
  const { value, readOnly, plain, fill, markers, ariaLabel, hideHint } = props;
  const minHeight = props.minHeight ?? 160;
  const maxHeight = props.maxHeight ?? 560;
  const fontSize = store.settings.value.editorFontSize || 14;
  const lh = lineHeightFor(fontSize);
  const theme = useResolvedTheme();

  const hostRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const modRef = useRef<MonacoModule | null>(null);
  const editorRef = useRef<MonacoApi.editor.IStandaloneCodeEditor | null>(null);
  const suppress = useRef(false);
  /** Values sent through onChange that the parent has not rendered back yet. */
  const emitted = useRef<string[]>([]);
  const escArmed = useRef(false);
  const [ready, setReady] = useState(false);
  const [contentHeight, setContentHeight] = useState(() => value.split('\n').length * lh + PAD * 2);
  const [tabMoves, setTabMoves] = useState(tabMovesFocusGlobal);
  const [announce, setAnnounce] = useState('');

  // Create the editor once.
  useEffect(() => {
    let disposed = false;
    let editor: MonacoApi.editor.IStandaloneCodeEditor | null = null;
    let model: MonacoApi.editor.ITextModel | null = null;
    loadMonaco()
      .then(async (mod) => {
        await mod.ensureFonts(fontSize);
        if (disposed || !hostRef.current) return;
        const { monaco } = mod;
        const p = propsRef.current;
        modRef.current = mod;
        model = monaco.editor.createModel(p.value, p.plain ? 'plaintext' : 'python');
        model.updateOptions({ tabSize: 4, insertSpaces: true });
        monaco.editor.setTheme(themeName(resolveTheme()));
        editor = monaco.editor.create(hostRef.current, {
          model,
          ...baseOptions(fontSize, !!p.plain, !!p.readOnly),
          ariaLabel: p.ariaLabel,
        });
        editorRef.current = editor;
        const KM = monaco.KeyMod;
        const KC = monaco.KeyCode;
        editor.addAction({ id: 'pyladder.run', label: 'Run', keybindings: [KM.CtrlCmd | KC.Enter], run: () => { propsRef.current.onRun?.(); } });
        editor.addAction({ id: 'pyladder.submit', label: 'Submit', keybindings: [KM.CtrlCmd | KM.Shift | KC.Enter], run: () => { propsRef.current.onSubmit?.(); } });
        editor.addAction({
          id: 'pyladder.toggleTabFocus', label: 'Toggle Tab key moves focus', keybindings: [KM.WinCtrl | KC.KeyM],
          run: () => {
            tabMovesFocusGlobal = !tabMovesFocusGlobal;
            setTabMoves(tabMovesFocusGlobal);
            editor?.updateOptions({ tabFocusMode: tabMovesFocusGlobal });
            setAnnounce(tabMovesFocusGlobal ? 'Tab now moves focus out of the editor.' : 'Tab now inserts spaces.');
          },
        });
        editor.onDidChangeModelContent(() => {
          if (suppress.current || !model) return;
          const v = model.getValue();
          const recent = emitted.current;
          recent.push(v);
          if (recent.length > 50) recent.splice(0, recent.length - 50);
          propsRef.current.onChange?.(v);
        });
        editor.onDidContentSizeChange((e) => setContentHeight(e.contentHeight));
        editor.onDidChangeCursorPosition((e) => propsRef.current.onCursor?.(e.position.lineNumber, e.position.column));
        // Esc then Tab leaves the editor: Esc turns on tab-focus mode until the next other key or blur.
        editor.onKeyDown((e) => {
          if (e.keyCode === KC.Escape) {
            escArmed.current = true;
            editor?.updateOptions({ tabFocusMode: true });
          } else if (escArmed.current && e.keyCode !== KC.Tab && e.keyCode !== KC.Shift) {
            escArmed.current = false;
            editor?.updateOptions({ tabFocusMode: tabMovesFocusGlobal });
          }
        });
        editor.onDidBlurEditorText(() => {
          if (escArmed.current) {
            escArmed.current = false;
            editor?.updateOptions({ tabFocusMode: tabMovesFocusGlobal });
          }
        });
        if (tabMovesFocusGlobal) editor.updateOptions({ tabFocusMode: true });
        setContentHeight(editor.getContentHeight());
        setReady(true);
      })
      .catch((err) => {
        console.warn('Monaco failed to load; using the textarea editor.', err);
        if (!disposed) propsRef.current.onFail();
      });
    return () => {
      disposed = true;
      editor?.dispose();
      model?.dispose();
      editorRef.current = null;
    };
  }, []);

  // External value changes (reset, restore) without losing undo history. A layout effect, so it runs before the
  // next key press; `emitted` also ignores props that are just an older echo of what the student typed, which
  // would otherwise overwrite newer text and move the cursor when typing fast.
  useLayoutEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    const recent = emitted.current;
    if (!editor || !model) return;
    if (model.getValue() === value) {
      recent.length = 0;
      return;
    }
    const echo = recent.lastIndexOf(value);
    if (echo >= 0) {
      recent.splice(0, echo + 1);
      return;
    }
    recent.length = 0;
    suppress.current = true;
    model.pushStackElement();
    model.pushEditOperations([], [{ range: model.getFullModelRange(), text: value }], () => null);
    model.pushStackElement();
    suppress.current = false;
  }, [value, ready]);

  useEffect(() => {
    const editor = editorRef.current;
    const mod = modRef.current;
    if (!editor || !mod) return;
    editor.updateOptions({ ...baseOptions(fontSize, !!plain, !!readOnly), ariaLabel });
    const model = editor.getModel();
    if (model) mod.monaco.editor.setModelLanguage(model, plain ? 'plaintext' : 'python');
  }, [plain, readOnly, fontSize, ariaLabel, ready]);

  useEffect(() => {
    modRef.current?.monaco.editor.setTheme(themeName(theme));
  }, [theme, ready]);

  useEffect(() => {
    const editor = editorRef.current;
    const mod = modRef.current;
    const model = editor?.getModel();
    if (!editor || !mod || !model) return;
    mod.monaco.editor.setModelMarkers(model, 'pyladder', toMonacoMarkers(mod, model, markers ?? []));
  }, [markers, ready]);

  const height = fill ? undefined : clamp(contentHeight, minHeight, maxHeight);
  // Keep the layout stable: the host has its final size before Monaco paints.
  useLayoutEffect(() => {
    editorRef.current?.layout();
  }, [height]);

  return (
    <div class={`code-editor${fill ? ' fill' : ''}${props.class ? ' ' + props.class : ''}`}>
      <div class="ce-frame" style={fill ? undefined : { height: `${height}px` }}>
        <div ref={hostRef} class="ce-host" />
        {!ready ? <EditorSkeleton lines={value.split('\n').length} lineHeight={lh} /> : null}
      </div>
      {hideHint ? null : <EditorHint tabMoves={tabMoves} />}
      <span class="sr-only" aria-live="polite">{announce}</span>
    </div>
  );
}

/** The editor is dark in both app themes; the two Monaco themes only differ in the editor ground (see tokens). */
function themeName(t: 'light' | 'dark') {
  return t === 'dark' ? 'pyladder-dark' : 'pyladder-light';
}

function baseOptions(fontSize: number, plain: boolean, readOnly: boolean): MonacoApi.editor.IStandaloneEditorConstructionOptions {
  return {
    readOnly,
    domReadOnly: false,
    tabSize: 4,
    insertSpaces: true,
    detectIndentation: false,
    renderWhitespace: 'none',
    minimap: { enabled: false },
    bracketPairColorization: { enabled: !plain },
    guides: { indentation: true, bracketPairs: false, highlightActiveIndentation: false },
    matchBrackets: plain ? 'never' : 'always',
    fontFamily: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
    fontLigatures: false,
    fontSize,
    lineHeight: lineHeightFor(fontSize),
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordBasedSuggestions: plain ? 'off' : 'currentDocument',
    quickSuggestions: plain ? false : { other: true, comments: false, strings: false },
    suggestOnTriggerCharacters: !plain,
    parameterHints: { enabled: !plain },
    autoClosingBrackets: plain ? 'never' : 'languageDefined',
    autoClosingQuotes: plain ? 'never' : 'languageDefined',
    occurrencesHighlight: plain ? 'off' : 'singleFile',
    selectionHighlight: !plain,
    codeLens: false,
    lightbulb: { enabled: 'off' as MonacoApi.editor.ShowLightbulbIconMode },
    stickyScroll: { enabled: false },
    padding: { top: PAD, bottom: PAD },
    lineDecorationsWidth: 12,
    scrollbar: { alwaysConsumeMouseWheel: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    renderLineHighlight: 'line',
    lineNumbersMinChars: 3,
    folding: false,
    glyphMargin: false,
    contextmenu: true,
    fixedOverflowWidgets: true,
    accessibilitySupport: 'auto',
    unicodeHighlight: { ambiguousCharacters: true, invisibleCharacters: true },
  };
}

function toMonacoMarkers(mod: MonacoModule, model: MonacoApi.editor.ITextModel, markers: EditorMarker[]): MonacoApi.editor.IMarkerData[] {
  const S = mod.monaco.MarkerSeverity;
  const count = model.getLineCount();
  return markers.map((m) => {
    const line = clamp(m.line, 1, count);
    const maxCol = model.getLineMaxColumn(line);
    const first = model.getLineFirstNonWhitespaceColumn(line) || 1;
    let startColumn = m.col ? clamp(m.col, 1, maxCol) : first;
    let endColumn = m.endCol ? clamp(m.endCol, 1, maxCol) : maxCol;
    if (endColumn <= startColumn) {
      // Zero-width ranges are invisible: widen to one character (or the whole line when the line is empty).
      if (startColumn >= maxCol) startColumn = Math.max(1, maxCol - 1);
      endColumn = Math.min(maxCol, startColumn + 1);
      if (endColumn <= startColumn) endColumn = startColumn + 1;
    }
    return {
      startLineNumber: line, endLineNumber: line, startColumn, endColumn, message: m.message,
      severity: m.severity === 'error' ? S.Error : m.severity === 'warning' ? S.Warning : S.Info,
    };
  });
}

export function EditorSkeleton({ lines, lineHeight }: { lines: number; lineHeight: number }) {
  const n = Math.max(3, Math.min(lines, 18));
  return (
    <div class="ce-skeleton" aria-hidden="true" style={{ paddingTop: `${PAD}px` }}>
      {Array.from({ length: n }, (_, i) => (
        <div class="ce-skel-line" key={i} style={{ height: `${lineHeight}px` }}>
          <span class="ce-skel-num">{i + 1}</span>
          <span class="ce-skel-bar" style={{ width: `${20 + ((i * 37) % 55)}%` }} />
        </div>
      ))}
      <span class="ce-skel-note">Loading editor…</span>
    </div>
  );
}

export function EditorHint({ tabMoves }: { tabMoves: boolean }) {
  return (
    <p class="ce-hint">
      <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the editor · <kbd>Ctrl</kbd>+<kbd>M</kbd>: Tab {tabMoves ? 'moves focus (on)' : 'inserts spaces'}
    </p>
  );
}
