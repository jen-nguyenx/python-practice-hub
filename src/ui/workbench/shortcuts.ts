// Keyboard shortcut helpers shared by the question page, code formats and the Playground.
import { useEffect, useRef } from 'preact/hooks';

export function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file'].includes(type);
  }
  return !!el.closest?.('.monaco-editor');
}

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const MOD = isMac ? '⌘' : 'Ctrl';
export const kbdRun = `${MOD}+Enter`;
export const kbdSubmit = `${MOD}+Shift+Enter`;

/**
 * Cmd/Ctrl+Enter and Cmd/Ctrl+Shift+Enter anywhere on the page. Events Monaco already handled
 * (defaultPrevented) are ignored, so the editor's own bindings do not fire twice.
 */
export function useRunShortcuts(handlers: { onRun?: () => void; onSubmit?: () => void }, enabled = true) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      const h = e.shiftKey ? ref.current.onSubmit : ref.current.onRun;
      if (!h) return;
      e.preventDefault();
      h();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
