// Layout primitives for the Settings page.
import type { ComponentChildren } from 'preact';

export function SettingsSection({ id, title, children }: { id: string; title: string; children: ComponentChildren }) {
  return (
    <section class="set-section" id={`set-${id}`} aria-labelledby={`set-${id}-title`}>
      <h2 class="set-title" id={`set-${id}-title`} tabIndex={-1}>{title}</h2>
      <div class="set-card">{children}</div>
    </section>
  );
}

export function SettingRow({ id, label, desc, children, stack }: { id: string; label: ComponentChildren; desc?: ComponentChildren; children?: ComponentChildren; stack?: boolean }) {
  return (
    <div class={`set-row${stack ? ' stack-row' : ''}`}>
      <div class="set-text">
        <div class="set-label" id={`${id}-label`}>{label}</div>
        {desc ? <div class="set-desc" id={`${id}-desc`}>{desc}</div> : null}
      </div>
      {children ? <div class="set-control">{children}</div> : null}
    </div>
  );
}
