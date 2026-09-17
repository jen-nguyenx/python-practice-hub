// Shared building blocks for the read formats: draft state, the Check bar, result marks and keyboard helpers.
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Mode } from '../../../engine/types.ts';
import { store } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Callout } from '../../components/Callout.tsx';
import { Icon } from '../../components/Icon.tsx';
import { isCodeLike } from './logic.ts';
import './read.css';

export const isTestMode = (mode: Mode): boolean => mode === 'topic-test' || mode === 'midsem';

/** What a read-format component may show, derived once from the controller's props. */
export interface Visibility {
  testMode: boolean;
  /** Inputs are read-only. */
  inputLocked: boolean;
  /** Correct answers may be shown (revealed, solved, or no checks left in practice). */
  full: boolean;
  /** Right/wrong marks may be shown at all. */
  marks: boolean;
}

export function visibility(p: { mode: Mode; revealed: boolean; locked: boolean; checksLeft: number }, checked: boolean, submitted: boolean): Visibility {
  const testMode = isTestMode(p.mode);
  const noChecks = !(p.checksLeft > 0);
  const inputLocked = p.revealed || p.locked || noChecks || (testMode && submitted);
  if (testMode) return { testMode, inputLocked, full: p.revealed, marks: p.revealed };
  const full = p.revealed || p.locked || noChecks;
  return { testMode, inputLocked, full, marks: full || checked };
}

/**
 * Local answer state seeded from the persisted draft. Every change is saved through onDraft.
 * If the draft arrives after mount and the student has not touched anything yet, it is adopted.
 */
export function useDraftState<T>(draft: unknown, onDraft: (d: unknown) => void, parse: (d: unknown) => T | null, empty: () => T): [T, (next: T) => void] {
  const [state, setState] = useState<T>(() => parse(draft) ?? empty());
  const touched = useRef(false);
  const parseRef = useRef(parse);
  parseRef.current = parse;
  useEffect(() => {
    if (touched.current) return;
    const parsed = parseRef.current(draft);
    if (parsed !== null) setState(parsed);
  }, [draft]);
  const update = (next: T) => {
    touched.current = true;
    setState(next);
    onDraft(next);
  };
  return [state, update];
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const CHECK_KBD = IS_MAC ? '⌘ Enter' : 'Ctrl Enter';

/** onKeyDown for a format's root element: Cmd/Ctrl+Enter runs Check. */
export function checkShortcut(run: () => void) {
  return (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      run();
    }
  };
}

/** True for elements where typing a digit should type, not trigger a shortcut. */
export function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['radio', 'checkbox', 'button', 'submit', 'reset', 'range', 'color'].includes(type);
  }
  return !!el.closest('.monaco-editor');
}

/** Whether single-key shortcuts are on in Settings (reactive: reads the settings signal during render). */
export function useSingleKeysOn(): boolean {
  try { return store.settings.value.singleKeyShortcuts !== false; } catch { return true; }
}

/**
 * Single-key shortcuts 1..count pick an option (when enabled in Settings and focus is not in a text field).
 * The handler receives the 0-based index.
 */
export function useNumberKeys(enabled: boolean, count: number, pick: (index: number) => void) {
  const pickRef = useRef(pick);
  pickRef.current = pick;
  useEffect(() => {
    if (!enabled || count <= 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (!/^[1-9]$/.test(e.key)) return;
      const idx = Number(e.key) - 1;
      if (idx >= Math.min(count, 5)) return;
      if (isEditableTarget(e.target) || isEditableTarget(document.activeElement)) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('dialog, [role="dialog"]') || document.querySelector('dialog[open]')) return;
      let on = true;
      try { on = store.settings.value.singleKeyShortcuts !== false; } catch { on = true; }
      if (!on) return;
      e.preventDefault();
      pickRef.current(idx);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [enabled, count]);
}

/**
 * Ref callback that turns autocorrect off. Set as an attribute because Chrome and Safari expose a boolean
 * `autocorrect` property that turns the string "off" into true.
 */
export function noAutocorrect(el: HTMLElement | null) {
  if (el && el.getAttribute('autocorrect') !== 'off') el.setAttribute('autocorrect', 'off');
}

/** "Correct" / "Not quite" with an icon, never colour alone. */
export function Mark({ ok, label }: { ok: boolean; label?: string }) {
  return (
    <span class={`rf-mark ${ok ? 'ok' : 'bad'}`}>
      <Icon name={ok ? 'check' : 'x'} size={14} />
      <span>{label ?? (ok ? 'Correct' : 'Not quite')}</span>
    </span>
  );
}

export function MissingData() {
  return (
    <Callout tone="bad" title="This question's answer data is missing">
      <p>It cannot be checked right now. Try the next question, or report this one so it can be fixed.</p>
    </Callout>
  );
}

export interface CheckBarProps {
  vis: Visibility;
  revealed: boolean;
  locked: boolean;
  checksLeft: number;
  /** The answer is complete enough to check. */
  ready: boolean;
  /** Plain-language reason shown when not ready, e.g. "Pick an option first." */
  notReadyText?: string;
  missing: boolean;
  submitted: boolean;
  onCheck: () => void;
  /** Result text for the live region (practice mode). */
  status?: ComponentChildren;
}

export function CheckBar(p: CheckBarProps) {
  const { vis } = p;
  // Test modes: once submitted (or locked by the test screen) the answer is saved and nothing else is shown until the end.
  const saved = vis.testMode && !p.revealed && (p.submitted || p.locked || !(p.checksLeft > 0));
  const showButton = !p.revealed && !p.locked && !saved;
  const disabled = p.missing || !p.ready || !(p.checksLeft > 0);
  let note: string | null = null;
  if (showButton) {
    if (p.missing) note = null;
    else if (!(p.checksLeft > 0)) note = 'No checks left.';
    else if (!p.ready && p.notReadyText) note = p.notReadyText;
    else if (vis.testMode) note = null;
    else if (Number.isFinite(p.checksLeft)) note = p.checksLeft === 1 ? '1 check left' : `${p.checksLeft} checks left`;
  }
  return (
    <div class="rf-checkbar">
      {showButton ? (
        <Button variant="primary" size="lg" class="rf-check-btn" onClick={p.onCheck} disabled={disabled} kbd={CHECK_KBD}>
          {vis.testMode ? 'Submit answer' : 'Check'}
        </Button>
      ) : null}
      {note ? <span class="rf-checkbar-note">{note}</span> : null}
      <div class="rf-status" aria-live="polite">
        {saved ? <span class="rf-saved"><Icon name="check" size={14} /> Answer saved</span> : p.status}
      </div>
    </div>
  );
}

/** Monospace output block; shows a plain note when the output is empty. */
export function OutputBlock({ text, label }: { text: string; label?: string }) {
  return text === ''
    ? <div class="rf-output empty" aria-label={label}>(nothing is printed)</div>
    : <pre class="rf-output" aria-label={label}>{text}</pre>;
}

/** Option text: monospace block for code or output (multi-line kept), plain text for sentences. */
export function OptionText({ text }: { text: string }) {
  return isCodeLike(text)
    ? <pre class="rf-option-code">{text}</pre>
    : <span class="rf-option-prose">{text}</span>;
}
