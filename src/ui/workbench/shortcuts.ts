// Keyboard shortcut helpers shared by the question page, code formats and the Playground.
import type { RefObject } from 'preact';
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
/** Compact key hints shown inside buttons ("⌘↵", "Ctrl ↵"). */
export const kbdRunShort = isMac ? '⌘↵' : 'Ctrl ↵';
export const kbdSubmitShort = isMac ? '⌘⇧↵' : 'Ctrl ⇧↵';

/**
 * Cmd/Ctrl+Enter and Cmd/Ctrl+Shift+Enter anywhere on the page. Events Monaco already handled
 * (defaultPrevented) are ignored, so the editor's own bindings do not fire twice.
 *
 * With `root`, the component's root element must carry `data-run-scope`. Keys pressed inside that element always
 * count; keys pressed elsewhere count only when this is the only run scope on the page (so a list of several
 * questions, such as a test review, does not run every question at once).
 */
export function useRunShortcuts(handlers: { onRun?: () => void; onSubmit?: () => void }, enabled = true, root?: RefObject<HTMLElement>) {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== 'Enter' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (root) {
        const el = root.current;
        if (!el) return;
        const target = e.target instanceof Node ? e.target : null;
        const inside = !!target && el.contains(target);
        if (!inside) {
          const owner = target instanceof Element ? target.closest('[data-run-scope]') : null;
          if (owner || document.querySelectorAll('[data-run-scope]').length !== 1) return;
        }
      }
      const h = e.shiftKey ? ref.current.onSubmit : ref.current.onRun;
      if (!h) return;
      e.preventDefault();
      h();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
