import type { ComponentChildren } from 'preact';

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'ok' | 'bad' | 'hint' | 'neutral'; title?: string; children?: ComponentChildren }) {
  return (
    <div class={`callout ${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {title ? <div class="callout-title">{title}</div> : null}
      {children}
    </div>
  );
}
