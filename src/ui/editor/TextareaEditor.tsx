// Fallback editor for touch devices, narrow screens, or when Monaco cannot load.
// Mono font, line-number gutter, Tab inserts 4 spaces (2 in R), Enter keeps indentation, Esc then Tab leaves.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { store } from '../../app/services.ts';
import type { CodeEditorProps } from './types.ts';
import './editor.css';


function insertText(ta: HTMLTextAreaElement, text: string) {
  ta.focus();
  // execCommand keeps the browser's undo stack; fall back to setRangeText.
  let ok = false;
  try {
    ok = document.execCommand('insertText', false, text);
  } catch {
    ok = false;
  }
  if (!ok) {
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function TextareaEditor(props: CodeEditorProps) {
  const { value, onChange, readOnly, plain, fill, markers, ariaLabel, hideHint } = props;
  // R is indented by two spaces and opens a block with "{"; Python by four, after a ":".
  const r = props.language === 'r';
  const width = r ? 2 : 4;
  const indentUnit = ' '.repeat(width);
  const minHeight = props.minHeight ?? 160;
  const maxHeight = props.maxHeight ?? 560;
  const fontSize = store.settings.value.editorFontSize || 14;
  const lh = Math.round(fontSize * 1.6);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const escArmed = useRef(false);
  const [tabMoves, setTabMoves] = useState(false);

  const lines = value.split('\n');
  const lineCount = lines.length;
  const byLine = new Map<number, 'error' | 'warning' | 'info'>();
  for (const m of markers ?? []) {
    const prev = byLine.get(m.line);
    if (!prev || m.severity === 'error') byLine.set(m.line, m.severity);
  }
  const height = fill ? undefined : Math.max(minHeight, Math.min(maxHeight, lineCount * lh + 16 + 12));

  useLayoutEffect(() => {
    if (gutterRef.current && taRef.current) gutterRef.current.scrollTop = taRef.current.scrollTop;
  }, [value]);

  const report = () => {
    const ta = taRef.current;
    if (!ta || !props.onCursor) return;
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    props.onCursor(line, col);
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) props.onSubmit?.();
      else props.onRun?.();
      return;
    }
    if (e.key === 'Escape') {
      escArmed.current = true;
      return;
    }
    if (e.ctrlKey && !e.metaKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      setTabMoves((v) => !v);
      return;
    }
    if (e.key === 'Tab') {
      if (escArmed.current || tabMoves) {
        escArmed.current = false;
        return; // let the browser move focus
      }
      if (readOnly) return;
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      if (e.shiftKey) {
        const lineText = v.slice(lineStart);
        const m = (r ? /^ {1,2}/ : /^ {1,4}/).exec(lineText);
        if (m) {
          ta.setSelectionRange(lineStart, lineStart + m[0].length);
          insertText(ta, '');
          const ns = Math.max(lineStart, s - m[0].length);
          ta.setSelectionRange(ns, Math.max(ns, end - m[0].length));
        }
      } else if (s !== end && v.slice(s, end).includes('\n')) {
        // Indent every selected line.
        const block = v.slice(lineStart, end);
        const indented = block.split('\n').map((l) => indentUnit + l).join('\n');
        ta.setSelectionRange(lineStart, end);
        insertText(ta, indented);
      } else {
        const col = s - lineStart;
        insertText(ta, ' '.repeat(width - (col % width)));
      }
      return;
    }
    escArmed.current = false;
    if (e.key === 'Enter' && !readOnly && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const { selectionStart: s, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const current = v.slice(lineStart, s);
      let indent = /^\s*/.exec(current)?.[0] ?? '';
      if (!plain && (r ? /\{\s*(#.*)?$/ : /:\s*(#.*)?$/).test(current)) indent += indentUnit;
      insertText(ta, '\n' + indent);
      return;
    }
    if (e.key === 'Backspace' && !readOnly && ta.selectionStart === ta.selectionEnd) {
      const { selectionStart: s, value: v } = ta;
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const before = v.slice(lineStart, s);
      if (before.length > 0 && /^ +$/.test(before)) {
        e.preventDefault();
        const n = before.length % width === 0 ? width : before.length % width;
        ta.setSelectionRange(s - n, s);
        insertText(ta, '');
      }
    }
  };

  return (
    <div class={`code-editor textarea-editor${fill ? ' fill' : ''}${props.class ? ' ' + props.class : ''}`}>
      <div class="ce-frame ta-frame" style={{ height: height ? `${height}px` : undefined, fontSize: `${fontSize}px`, lineHeight: `${lh}px` }}>
        <div class="ta-gutter" ref={gutterRef} aria-hidden="true">
          {lines.map((_, i) => {
            const sev = byLine.get(i + 1);
            return (
              <div key={i} class={`ta-ln${sev ? ' ' + sev : ''}`} style={{ height: `${lh}px` }}>
                {sev === 'error' ? '×' : sev === 'warning' ? '!' : ''}{i + 1}
              </div>
            );
          })}
        </div>
        <textarea
          ref={taRef}
          class="ta-input"
          value={value}
          readOnly={readOnly}
          aria-label={ariaLabel}
          spellcheck={false}
          autocomplete="off"
          autocapitalize="off"
          {...{ autocorrect: 'off' }}
          wrap="off"
          onInput={(e) => onChange?.(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          onKeyUp={report}
          onClick={report}
          onBlur={() => { escArmed.current = false; }}
          onScroll={(e) => {
            if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop;
          }}
        />
      </div>
      {markers && markers.length ? (
        <ul class="ta-markers">
          {markers.slice(0, 4).map((m, i) => (
            <li key={i} class={m.severity}>Line {m.line}: {m.message}</li>
          ))}
        </ul>
      ) : null}
      {hideHint ? null : (
        <p class="ce-hint">
          <kbd>Esc</kbd> then <kbd>Tab</kbd> leaves the editor · <kbd>Ctrl</kbd>+<kbd>M</kbd>: Tab {tabMoves ? 'moves focus (on)' : 'inserts spaces'}
        </p>
      )}
    </div>
  );
}
