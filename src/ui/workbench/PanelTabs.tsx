// Accessible tab strip + panel (arrow keys move between tabs).
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';
import './workbench.css';

export interface PanelTab {
  id: string;
  label: string;
  /** Small count or marker shown after the label, e.g. 2 problems. */
  badge?: string | number | null;
  tone?: 'ok' | 'bad' | 'hint';
  content: ComponentChildren;
}

let uid = 0;

export function PanelTabs({ tabs, active, onChange, label, class: cls, actions }: { tabs: PanelTab[]; active: string; onChange: (id: string) => void; label: string; class?: string; actions?: ComponentChildren }) {
  const idBase = useRef(`pt${++uid}`).current;
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const listRef = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === current?.id);
    let n = -1;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = tabs.length - 1;
    if (n < 0) return;
    e.preventDefault();
    onChange(tabs[n].id);
    requestAnimationFrame(() => listRef.current?.querySelectorAll<HTMLButtonElement>('[role=tab]')[n]?.focus());
  };
  return (
    <div class={`panel${cls ? ' ' + cls : ''}`}>
      <div class="panel-tabs-row">
        <div class="panel-tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKey}>
          {tabs.map((t) => {
            const selected = t.id === current?.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${idBase}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${idBase}-panel`}
                tabIndex={selected ? 0 : -1}
                class={`panel-tab${selected ? ' active' : ''}`}
                onClick={() => onChange(t.id)}
              >
                {t.label}
                {t.badge !== undefined && t.badge !== null && t.badge !== '' ? <span class={`panel-badge${t.tone ? ' ' + t.tone : ''}`}>{t.badge}</span> : null}
              </button>
            );
          })}
        </div>
        {actions ? <div class="panel-actions">{actions}</div> : null}
      </div>
      <div class="panel-body" role="tabpanel" id={`${idBase}-panel`} aria-labelledby={`${idBase}-tab-${current?.id}`} tabIndex={0}>
        {current?.content}
      </div>
    </div>
  );
}
