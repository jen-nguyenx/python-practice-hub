// Accessible tabs (WAI-ARIA tabs pattern, automatic activation). Render panels with TabPanel using the same idBase.
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import './controls.css';

export interface TabDef<T extends string> { id: T; label: ComponentChildren; badge?: ComponentChildren }

export function tabId(idBase: string, id: string) { return `${idBase}-tab-${id}`; }
export function panelId(idBase: string, id: string) { return `${idBase}-panel-${id}`; }

export function Tabs<T extends string>({ tabs, active, onChange, idBase, label, class: cls }: {
  tabs: readonly TabDef<T>[]; active: T; onChange: (id: T) => void; idBase: string; label: string; class?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = Math.max(0, tabs.findIndex((t) => t.id === active));
  const onKeyDown = (e: KeyboardEvent) => {
    let next = -1;
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(tabs[next].id);
    ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };
  return (
    <div ref={ref} class={`tabs${cls ? ' ' + cls : ''}`} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          class="tab"
          id={tabId(idBase, t.id)}
          aria-selected={i === idx}
          aria-controls={i === idx ? panelId(idBase, t.id) : undefined}
          tabIndex={i === idx ? 0 : -1}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.badge !== undefined && t.badge !== null ? <span class="tab-badge">{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ idBase, id, children, class: cls }: { idBase: string; id: string; children: ComponentChildren; class?: string }) {
  return (
    <div role="tabpanel" id={panelId(idBase, id)} aria-labelledby={tabId(idBase, id)} tabIndex={0} class={cls}>
      {children}
    </div>
  );
}
