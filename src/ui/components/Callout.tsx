// Tinted panel with an optional small uppercase mono label. hint = amber (help only), info, ok, bad, neutral (sunken).
import type { ComponentChildren } from 'preact';

export function Callout({ tone = 'info', title, children, class: cls }: { tone?: 'info' | 'ok' | 'bad' | 'hint' | 'neutral'; title?: string; children?: ComponentChildren; class?: string }) {
  return (
    <div class={`callout ${tone}${cls ? ' ' + cls : ''}`} role={tone === 'bad' ? 'alert' : undefined}>
      {title ? <div class="callout-title">{title}</div> : null}
      {children}
    </div>
  );
}
