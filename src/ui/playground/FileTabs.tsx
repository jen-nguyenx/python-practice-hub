// Playground file tabs on the dark card strip: select, add (+), rename (double-click, F2 or the tab menu) and
// delete (Delete key or the tab menu; the parent confirms).
import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { ScratchFile } from '../../store/types.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import { Tooltip } from '../components/Tooltip.tsx';

export interface FileTabsProps {
  files: ScratchFile[];
  activeId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  /** Returns an error message, or null when the name was accepted. */
  onRename: (id: string, name: string) => string | null;
  onDelete: (file: ScratchFile) => void;
  /** Start renaming this file (set by the parent after "+"). */
  renameRequest?: string | null;
  onRenameRequestHandled?: () => void;
}

/** Icon-only button for the dark card, with a tooltip. */
export function CardIconButton({ icon, label, onClick, tip, children, class: cls, ...rest }: {
  icon?: IconName; label: string; onClick?: (e: MouseEvent) => void; tip?: ComponentChildren; children?: ComponentChildren; class?: string;
} & Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'label' | 'onClick' | 'class'>) {
  return (
    <Tooltip content={tip ?? label} side="bottom" decorative={!tip}>
      <button type="button" class={`pg-icon-btn${cls ? ' ' + cls : ''}`} aria-label={label} onClick={onClick} {...rest}>
        {icon ? <Icon name={icon} size={16} /> : children}
      </button>
    </Tooltip>
  );
}

export function PlusIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">
      <path d="M10 4.5v11 M4.5 10h11" />
    </svg>
  );
}

function useFixedBelow(anchor: { current: HTMLElement | null }, open: boolean, align: 'start' | 'end' = 'start') {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !anchor.current) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = anchor.current!.getBoundingClientRect();
      const left = align === 'end' ? r.right : r.left;
      setPos({ left: Math.max(8, Math.min(left, window.innerWidth - 8)), top: r.bottom + 4 });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  return pos;
}

export function FileTabs({ files, activeId, onSelect, onAdd, onRename, onDelete, renameRequest, onRenameRequestHandled }: FileTabsProps) {
  const [renaming, setRenaming] = useState<{ id: string; value: string; error?: string } | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!renameRequest) return;
    const f = files.find((x) => x.id === renameRequest);
    if (f) setRenaming({ id: f.id, value: f.name });
    onRenameRequestHandled?.();
  }, [renameRequest]);

  // Keep the active tab in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>('.pg-tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeId, files.length]);

  const focusTab = (id: string) =>
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-file-id="${CSS.escape(id)}"]`)?.focus());

  const commit = () => {
    if (!renaming) return;
    const err = onRename(renaming.id, renaming.value);
    if (err) {
      setRenaming({ ...renaming, error: err });
      return;
    }
    const id = renaming.id;
    setRenaming(null);
    focusTab(id);
  };

  return (
    <div class="pg-files">
      <div class="pg-tabs" role="tablist" aria-label="Your files" ref={listRef}>
        {files.map((f) => {
          const selected = f.id === activeId;
          if (renaming?.id === f.id) {
            return (
              <RenameField
                key={f.id}
                file={f}
                value={renaming.value}
                error={renaming.error}
                onInput={(value) => setRenaming({ id: f.id, value })}
                onCommit={commit}
                onCancel={() => { setRenaming(null); focusTab(f.id); }}
              />
            );
          }
          return (
            <div key={f.id} class={`pg-tabwrap${selected ? ' active' : ''}`} role="presentation">
              <button
                type="button"
                role="tab"
                data-file-id={f.id}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                class={`pg-tab${selected ? ' active' : ''}`}
                onClick={() => onSelect(f.id)}
                onDblClick={() => setRenaming({ id: f.id, value: f.name })}
                onKeyDown={(e) => {
                  const i = files.findIndex((x) => x.id === f.id);
                  let n: ScratchFile | undefined;
                  if (e.key === 'ArrowRight') n = files[(i + 1) % files.length];
                  else if (e.key === 'ArrowLeft') n = files[(i - 1 + files.length) % files.length];
                  else if (e.key === 'Home') n = files[0];
                  else if (e.key === 'End') n = files[files.length - 1];
                  if (n) {
                    e.preventDefault();
                    onSelect(n.id);
                    focusTab(n.id);
                  } else if (e.key === 'F2') {
                    e.preventDefault();
                    setRenaming({ id: f.id, value: f.name });
                  } else if (e.key === 'Delete') {
                    e.preventDefault();
                    onDelete(f);
                  } else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
                    e.preventDefault();
                    setMenuFor(f.id);
                  }
                }}
                onContextMenu={(e) => { e.preventDefault(); onSelect(f.id); setMenuFor(f.id); }}
              >
                {f.name}
              </button>
              {selected ? (
                <TabMenu
                  file={f}
                  open={menuFor === f.id}
                  onOpenChange={(o) => setMenuFor(o ? f.id : null)}
                  onRename={() => setRenaming({ id: f.id, value: f.name })}
                  onDelete={() => onDelete(f)}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <CardIconButton label="New file" class="pg-add" onClick={onAdd}><PlusIcon /></CardIconButton>
    </div>
  );
}

function RenameField({ file, value, error, onInput, onCommit, onCancel }: {
  file: ScratchFile; value: string; error?: string; onInput: (v: string) => void; onCommit: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pos = useFixedBelow(ref, !!error);
  const cancelled = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const dot = el.value.toLowerCase().lastIndexOf('.py');
    el.setSelectionRange(0, dot > 0 ? dot : el.value.length);
  }, []);
  const errId = `pg-rename-err-${file.id}`;
  return (
    <form class="pg-rename" role="presentation" onSubmit={(e) => { e.preventDefault(); onCommit(); }}>
      <label class="sr-only" for={`pg-rename-${file.id}`}>New name for {file.name}</label>
      <input
        id={`pg-rename-${file.id}`}
        ref={ref}
        value={value}
        size={Math.max(8, Math.min(28, value.length + 1))}
        spellcheck={false}
        autocomplete="off"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errId : undefined}
        onInput={(e) => onInput(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            cancelled.current = true;
            onCancel();
          }
        }}
        onBlur={() => { if (!cancelled.current) onCommit(); }}
      />
      {error ? (
        <span id={errId} class="pg-rename-error" role="alert" style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: 'hidden' }}>
          {error}
        </span>
      ) : null}
    </form>
  );
}

function TabMenu({ file, open, onOpenChange, onRename, onDelete }: {
  file: ScratchFile; open: boolean; onOpenChange: (open: boolean) => void; onRename: () => void; onDelete: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const pos = useFixedBelow(trigger, open);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => menu.current?.querySelector<HTMLElement>('[role=menuitem]')?.focus());
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (menu.current?.contains(t) || trigger.current?.contains(t)) return;
      onOpenChange(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open]);

  const close = (refocus: boolean) => {
    onOpenChange(false);
    if (refocus) trigger.current?.focus();
  };
  const pick = (fn: () => void) => {
    close(false);
    fn();
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        class="pg-tab-menu-btn"
        aria-label={`Actions for ${file.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
      >
        <Icon name="chevronDown" size={14} />
      </button>
      {open ? (
        <div
          ref={menu}
          class="pg-menu"
          role="menu"
          aria-label={`Actions for ${file.name}`}
          style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: 'hidden' }}
          onKeyDown={(e) => {
            const items = [...(menu.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])];
            const i = items.indexOf(document.activeElement as HTMLElement);
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            } else if (e.key === 'Tab') {
              close(false);
            }
          }}
        >
          <button type="button" role="menuitem" class="pg-menu-item" onClick={() => pick(onRename)}>
            Rename<span class="pg-menu-kbd" aria-hidden="true">F2</span>
          </button>
          <button type="button" role="menuitem" class="pg-menu-item danger" onClick={() => pick(onDelete)}>
            Delete…<span class="pg-menu-kbd" aria-hidden="true">Del</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
