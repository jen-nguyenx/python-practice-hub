// Shared building blocks for the read formats: the frame (body + Check row), option rows,
// output boxes and inputs, result marks, draft state and keyboard helpers.
import type { ComponentChildren, JSX, Ref } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import type { Mode } from '../../../engine/types.ts';
import { hidesHelp } from '../../../engine/types.ts';
import { store } from '../../../app/services.ts';
import { Button } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { useWorkbench } from '../../workbench/context.ts';
import { isCodeLike } from './logic.ts';
import './read.css';

export const isTestMode = (mode: Mode): boolean => hidesHelp(mode);

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
export const CHECK_KBD = IS_MAC ? '⌘↵' : 'Ctrl ↵';
const CHECK_ARIA_KEYS = IS_MAC ? 'Meta+Enter' : 'Control+Enter';

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

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');
export { cx };

/** Small glyphs the shared icon set does not have (same 20px grid, 1.5px stroke). */
export function Glyph({ name, size = 14 }: { name: 'plus' | 'minus'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <path d={name === 'plus' ? 'M10 4v12 M4 10h12' : 'M4 10h12'} />
    </svg>
  );
}

/** Icon + word, never colour alone. */
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
    <p class="rf-missing" role="alert">
      <Icon name="alert" size={16} />
      <span>The answer data for this question is missing, so it cannot be checked. Try the next question.</span>
    </p>
  );
}

/** Field label ("Your output"), with optional quiet text on the right. Pass `as="legend"` inside a fieldset. */
export function Label({ children, as = 'div', htmlFor, id, end }: { children: ComponentChildren; as?: 'div' | 'legend' | 'label'; htmlFor?: string; id?: string; end?: ComponentChildren }) {
  const inner = <><span class="rf-label-text">{children}</span>{end ? <span class="rf-label-end">{end}</span> : null}</>;
  if (as === 'legend') return <legend class="rf-label" id={id}>{inner}</legend>;
  if (as === 'label') return <label class="rf-label" for={htmlFor} id={id}>{inner}</label>;
  return <div class="rf-label" id={id}>{inner}</div>;
}

/** A question heading above a group of inputs, with an optional result mark on the right. */
export function Ask({ children, mark, as = 'legend', htmlFor }: { children: ComponentChildren; mark?: boolean | null; as?: 'legend' | 'label'; htmlFor?: string }) {
  const inner = (
    <>
      <span class="rf-ask-text">{children}</span>
      {mark === true || mark === false ? <Mark ok={mark} /> : null}
    </>
  );
  return as === 'label' ? <label class="rf-ask" for={htmlFor}>{inner}</label> : <legend class="rf-ask">{inner}</legend>;
}

// ---------- frame ----------

/** The format body followed by its button row. `bar` is normally a <CheckBar>. */
export function ReadFrame(p: { kind: string; rootRef?: Ref<HTMLDivElement>; onCheck: () => void; bar: ComponentChildren; children: ComponentChildren }) {
  // In the question page's workspace pane the format fills it; elsewhere (tests, reviews) it flows as a block.
  const fill = useWorkbench().fill === true;
  return (
    <div class={cx('rf', `rf-${p.kind}`, fill ? 'fill' : 'flow')} ref={p.rootRef} onKeyDown={checkShortcut(p.onCheck)}>
      <div class="rf-body">
        <div class="rf-inner">{p.children}</div>
      </div>
      {p.bar}
    </div>
  );
}

export interface CheckBarProps {
  vis: Visibility;
  revealed: boolean;
  locked: boolean;
  checksLeft: number;
  /** The answer is complete enough to check. */
  ready: boolean;
  /** Plain-language reason shown when not ready, e.g. "Pick an answer first". */
  notReadyText?: string;
  missing: boolean;
  submitted: boolean;
  onCheck: () => void;
  /** Result for the live region (practice mode). The page's result bar shows it visually, so here it is for screen readers. */
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
    else if (!(p.checksLeft > 0)) note = 'No checks left';
    else if (!p.ready && p.notReadyText) note = p.notReadyText;
    else if (vis.testMode) note = null;
    else if (Number.isFinite(p.checksLeft)) note = p.checksLeft === 1 ? '1 check left' : `${p.checksLeft} checks left`;
  }
  const quiet = !showButton && !saved;
  return (
    <div class={cx('rf-actions', quiet && 'quiet')}>
      {showButton ? (
        <Button variant="primary" size="lg" icon="check" class="rf-check-btn" onClick={p.onCheck} disabled={disabled} aria-keyshortcuts={CHECK_ARIA_KEYS}>
          {vis.testMode ? 'Submit answer' : 'Check answer'}
          <span class="kbd-hint" aria-hidden="true">{CHECK_KBD}</span>
        </Button>
      ) : null}
      {note ? <span class="rf-note num">{note}</span> : null}
      <div class={cx('rf-status', !saved && 'sr-only')} aria-live="polite">
        {saved ? <span class="rf-saved"><Icon name="check" size={14} /> Answer saved</span> : p.status}
      </div>
    </div>
  );
}

// ---------- option rows ----------

export interface OptionRowProps {
  type: 'radio' | 'checkbox';
  name?: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  /** Enter on the input (without a modifier) runs Check. */
  onEnter?: () => void;
  /** 1-based number-key hint shown at the far right. */
  keyHint?: number | null;
  /** ok / bad: the checked answer. answer: the correct answer the student did not pick. missed: a right option left unticked. */
  tone?: 'ok' | 'bad' | 'answer' | 'missed' | null;
  /** Result shown under the row (a quiet mark sits at the far right instead). */
  mark?: { ok: boolean; label: string; quiet?: boolean } | null;
  /** Explanation shown under the row. */
  why?: string | null;
  /** Explanation behind a small "Why" toggle. */
  whyToggle?: string | null;
  whyToggleLabel?: string;
  dataKey?: string;
  class?: string;
  children: ComponentChildren;
}

export function OptionRow(p: OptionRowProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const onKeyDown = p.onEnter
    ? (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); p.onEnter?.(); } }
    : undefined;
  const hasToggle = !p.why && !!p.whyToggle;
  const loud = p.mark && !p.mark.quiet ? p.mark : null;
  const quiet = p.mark && p.mark.quiet ? p.mark : null;
  const cls = cx('rf-opt', p.checked && 'selected', p.disabled && 'locked', p.tone, p.class);
  return (
    <div class={cls}>
      <label class="rf-opt-main">
        <input
          type={p.type} name={p.name} value={p.value} data-key={p.dataKey}
          checked={p.checked} disabled={p.disabled}
          onChange={p.onChange} onKeyDown={onKeyDown}
        />
        <span class="rf-opt-body">{p.children}</span>
        {quiet ? (
          <span class="rf-opt-end quiet">{quiet.label}</span>
        ) : p.keyHint && !loud ? (
          <span class="rf-opt-key" aria-hidden="true">{p.keyHint}</span>
        ) : null}
      </label>
      {loud || p.why || hasToggle ? (
        <div class="rf-opt-fb">
          {loud || hasToggle ? (
            <div class="rf-opt-fb-head">
              {loud ? <Mark ok={loud.ok} label={loud.label} /> : null}
              {hasToggle ? (
                <button type="button" class="rf-why-btn" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
                  {p.whyToggleLabel ?? 'Why'}
                  <Icon name="chevronDown" size={14} class="rf-why-chev" />
                </button>
              ) : null}
            </div>
          ) : null}
          {p.why ? <div class="rf-why"><Markdown text={p.why} /></div> : null}
          {hasToggle ? <div class="rf-why" id={id} hidden={!open}><Markdown text={p.whyToggle as string} /></div> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Option text: monospace block for code or output (indentation kept), plain text for sentences. */
export function OptionText({ text }: { text: string }) {
  return isCodeLike(text)
    ? <pre class="rf-opt-code">{text}</pre>
    : <span class="rf-opt-prose">{text}</span>;
}

// ---------- terminal boxes ----------

/** Read-only program output in mono; shows a plain note when the output is empty. */
export function OutputBlock({ text, label, bare }: { text: string; label?: string; bare?: boolean }) {
  const cls = cx('rf-output', bare && 'bare', text === '' && 'empty');
  return text === ''
    ? <div class={cls} aria-label={label}>(nothing is printed)</div>
    : <pre class={cls} aria-label={label}>{text}</pre>;
}

/** Mono multi-line input for typed outputs. Grows with the text. */
export function TerminalInput(p: {
  id: string; value: string; readOnly: boolean; onInput: (v: string) => void;
  mark: boolean | null; minRows?: number; describedBy?: string; placeholder?: string; label?: string;
}) {
  return (
    <textarea
      id={p.id}
      class={cx('rf-term', p.mark === true && 'ok', p.mark === false && 'bad')}
      aria-describedby={p.describedBy}
      aria-label={p.label}
      rows={Math.max(p.minRows ?? 1, p.value.split('\n').length)}
      value={p.value}
      readOnly={p.readOnly}
      placeholder={p.placeholder}
      ref={noAutocorrect} autocomplete="off" autocapitalize="off" spellcheck={false} wrap="off"
      onInput={(e) => p.onInput(e.currentTarget.value)}
    />
  );
}

// ---------- segmented choice (radio inputs) ----------

/** Two or three mutually exclusive choices as a segmented control. Native radios, so arrow keys and forms work. */
export function Choice<T extends string>(p: {
  name: string; value: T | null; disabled: boolean; label: string;
  options: { value: T; label: string; ok?: boolean | null }[];
  onChange: (v: T) => void; describedBy?: string;
}) {
  return (
    <div class={cx('rf-seg', p.disabled && 'locked')} role="radiogroup" aria-label={p.label} aria-describedby={p.describedBy}>
      {p.options.map((o) => {
        const checked = p.value === o.value;
        return (
          <label key={o.value} class={cx('rf-seg-opt', checked && 'selected', o.ok === true && 'ok', o.ok === false && 'bad')}>
            <input type="radio" name={p.name} value={o.value} checked={checked} disabled={p.disabled} onChange={() => p.onChange(o.value)} />
            {o.ok === true || o.ok === false ? <Icon name={o.ok ? 'check' : 'x'} size={14} /> : null}
            <span>{o.label}</span>
          </label>
        );
      })}
    </div>
  );
}
