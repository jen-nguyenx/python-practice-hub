// Dark editor card (dark in both themes): a file tab with a rung underline, a mono runtime label, the editor or
// code body, and an optional bottom bar inside the card. Used by the code formats and the read-format scratch editor.
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { py } from '../../app/services.ts';
import type { RuntimeStatus } from '../../runtime/protocol.ts';
import './editorCard.css';

/** "Python 3.14 · runs in your browser", "Starting Python · 4 s", ... */
export function runtimeLabel(s: RuntimeStatus): string {
  switch (s.state) {
    case 'ready':
    case 'running': {
      const v = /\d+\.\d+/.exec(s.python ?? '')?.[0];
      return `Python ${v ?? '3'} · runs in your browser`;
    }
    case 'loading': return `Starting Python · ${Math.max(0, Math.round(s.elapsedMs / 1000))} s`;
    case 'restarting': return 'Restarting Python';
    case 'error': return 'Python could not start';
    default: return 'Python 3.14 · runs in your browser';
  }
}

export function RuntimeLabel() {
  const status = py.status.value;
  return <span class={`ed-runtime ${status.state}`} aria-live="polite">{runtimeLabel(status)}</span>;
}

export interface EditorCardProps {
  file: string;
  /** Accessible name of the card region. */
  label: string;
  /** Right side of the tab row, after the runtime label (e.g. a small Run button). */
  tabActions?: ComponentChildren;
  /** Bottom bar inside the card. */
  footer?: ComponentChildren;
  /** Rendered under the body inside the card (e.g. the OUTPUT area). */
  below?: ComponentChildren;
  children: ComponentChildren;
  class?: string;
}

export function EditorCard({ file, label, tabActions, footer, below, children, class: cls }: EditorCardProps) {
  return (
    <section class={`ed-card${cls ? ' ' + cls : ''}`} aria-label={label}>
      <div class="ed-tabs">
        <span class="ed-tab">{file}</span>
        <span class="ed-tabs-right">
          <RuntimeLabel />
          {tabActions}
        </span>
      </div>
      <div class="ed-body">{children}</div>
      {below}
      {footer ? <div class="ed-foot">{footer}</div> : null}
    </section>
  );
}

/**
 * Which edges of a sideways-scrolling box have more content off-screen. macOS hides overlay scrollbars at rest,
 * so a long example otherwise looks as if it just stops mid-word; the edge the reader can scroll towards gets a
 * shadow, and the box becomes keyboard-scrollable while there is anything to scroll.
 */
function useScrollEdges() {
  const ref = useRef<HTMLPreElement>(null);
  const [edges, setEdges] = useState<'' | 'left' | 'right' | 'both'>('');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 1) return setEdges('');
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft < max - 1;
      setEdges(left && right ? 'both' : left ? 'left' : right ? 'right' : '');
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  });
  return { ref, edges };
}

/** Example block written as a Python shell session: ">>> call" then the result. */
export function ShellSession({ lines, label = 'Example' }: { lines: { input: string[]; output: string }[]; label?: string }) {
  const { ref, edges } = useScrollEdges();
  if (!lines.length) return null;
  return (
    <pre
      class="shell"
      ref={ref}
      aria-label={label}
      data-scroll={edges || undefined}
      role={edges ? 'region' : undefined}
      tabIndex={edges ? 0 : undefined}
    >
      <code>
        {lines.map((l, i) => (
          <span key={i} class="shell-entry">
            {l.input.map((inp, j) => (
              <span key={j} class="shell-line"><span class="shell-prompt" aria-hidden="true">{j === 0 ? '>>> ' : '... '}</span>{inp}{'\n'}</span>
            ))}
            {l.output ? <span class="shell-out">{l.output}{'\n'}</span> : null}
          </span>
        ))}
      </code>
    </pre>
  );
}

/** Shell-session lines from a question's visible function tests (setup lines first, then the call and its value). */
export function examplesFromTests(tests: readonly { call?: string; setup?: string; expect?: string; hidden: boolean }[] | undefined, max = 3) {
  const out: { input: string[]; output: string }[] = [];
  let calls = 0;
  for (const t of tests ?? []) {
    if (t.hidden || !t.call || t.expect === undefined) continue;
    const setup = (t.setup ?? '').split('\n').filter((s) => s.trim());
    for (const s of setup) {
      const prev = out[out.length - 1];
      if (/^\s/.test(s) && prev && !prev.output) prev.input.push(s);
      else out.push({ input: [s], output: '' });
    }
    out.push({ input: [t.call], output: t.expect === 'None' ? '' : t.expect });
    if (++calls >= max) break;
  }
  return out;
}
