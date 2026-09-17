// Command palette ("Go to question or topic", Cmd/Ctrl+K or Cmd/Ctrl+P): fuzzy search over pages and actions, the 13
// topics and every question title. Combobox + listbox pattern inside a native modal <dialog>: typing filters,
// Up/Down/Home/End move, Enter opens, Esc closes and focus returns to where it was.
import { Fragment } from 'preact';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import '../components/controls.css';
import { matchItem } from './fuzzy.ts';
import { continueInfo } from './homeData.ts';
import { safeTopicProgress } from './progressData.ts';
import { toggleTheme } from './ThemeToggle.tsx';
import { paletteOpen, shortcutSheetOpen } from './uiState.ts';

type Group = 'Pages and actions' | 'Topics' | 'Questions';
interface Item { id: string; group: Group; label: string; detail: string; icon: IconName; search: string; run: () => void }

const GROUPS: Group[] = ['Pages and actions', 'Topics', 'Questions'];
const MAX_QUESTIONS = 40;

function go(h: string) { return () => navigate(h); }

function buildItems(): { items: Item[]; continueItem: Item | null } {
  const events = store.events.value;
  const settings = store.settings.value;
  const progress = safeTopicProgress(events, settings);
  const actions: Item[] = [
    { id: 'a-home', group: 'Pages and actions', label: 'Topics', detail: 'Home', icon: 'ladder', search: 'home ladder', run: go(href.landing()) },
    { id: 'a-play', group: 'Pages and actions', label: 'Playground', detail: 'Write and run any Python', icon: 'code', search: 'editor run python', run: go(href.playground()) },
    { id: 'a-midsem', group: 'Pages and actions', label: 'Mid-sem test', detail: 'Timed practice test', icon: 'clock', search: 'midsem practice exam', run: go(href.midsem()) },
    { id: 'a-report', group: 'Pages and actions', label: 'Report', detail: 'Strengths and weak spots', icon: 'chart', search: 'progress mistakes stats', run: go(href.report()) },
    { id: 'a-settings', group: 'Pages and actions', label: 'Settings', detail: 'Theme, backup, unlock', icon: 'sliders', search: 'preferences backup export', run: go(href.settings()) },
    { id: 'a-theme', group: 'Pages and actions', label: 'Toggle theme', detail: 'Switch light and dark', icon: 'moon', search: 'dark light mode', run: toggleTheme },
    { id: 'a-keys', group: 'Pages and actions', label: 'Keyboard shortcuts', detail: 'Show the list', icon: 'keyboard', search: 'keys help', run: () => { shortcutSheetOpen.value = true; } },
  ];
  const topics: Item[] = TOPICS.map((t) => {
    const p = progress[t.id];
    const detail = p.state === 'locked' ? 'Locked' : `${p.solved} of ${p.total} solved`;
    return { id: `t-${t.id}`, group: 'Topics', label: `${t.num} ${t.title}`, detail, icon: p.state === 'locked' ? 'lock' : 'ladder', search: t.short, run: go(href.topic(t.id)) };
  });
  const questions: Item[] = QUESTION_INDEX.map((q) => {
    const t = TOPIC_BY_ID[q.topicId];
    return {
      id: `q-${q.qid}`, group: 'Questions', label: q.title, detail: `${t?.short ?? ''} · ${FORMAT_LABEL[q.format]}`,
      icon: 'file', search: `${t?.short ?? ''} ${FORMAT_LABEL[q.format]}`, run: go(href.question(q.qid)),
    };
  });
  let continueItem: Item | null = null;
  const info = continueInfo(events, settings, progress);
  if (info.question && QUESTION_BY_ID.has(info.question.qid)) {
    const q = info.question;
    continueItem = { id: 'c-continue', group: 'Pages and actions', label: `Continue: ${q.title}`, detail: info.topic.short, icon: 'arrowRight', search: 'continue resume', run: go(href.question(q.qid)) };
  }
  return { items: [...actions, ...topics, ...questions], continueItem };
}

function filterItems(all: Item[], continueItem: Item | null, query: string): Item[] {
  const q = query.trim();
  if (!q) return [...(continueItem ? [continueItem] : []), ...all.filter((i) => i.group !== 'Questions')];
  const scored: { item: Item; score: number }[] = [];
  for (const item of all) {
    const s = matchItem(q, item.label, item.search);
    if (s !== null) scored.push({ item, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  const out: Item[] = [];
  for (const g of GROUPS) {
    const inGroup = scored.filter((s) => s.item.group === g).map((s) => s.item);
    out.push(...(g === 'Questions' ? inGroup.slice(0, MAX_QUESTIONS) : inGroup));
  }
  return out;
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { items, continueItem } = useMemo(buildItems, []);
  const results = useMemo(() => filterItems(items, continueItem, query), [items, continueItem, query]);
  const idx = results.length ? Math.min(active, results.length - 1) : -1;
  const optId = (i: number) => `${listId}-o${i}`;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    if (idx < 0) return;
    listRef.current?.querySelector(`#${CSS.escape(optId(idx))}`)?.scrollIntoView({ block: 'nearest' });
  }, [idx, results]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    // Let the dialog close and focus return before the route or theme changes.
    setTimeout(item.run, 0);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const n = results.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (n) setActive((idx + 1) % n); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (n) setActive((idx - 1 + n) % n); }
    else if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); setActive(0); }
    else if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); setActive(Math.max(0, n - 1)); }
    else if (e.key === 'PageDown') { e.preventDefault(); if (n) setActive(Math.min(n - 1, idx + 8)); }
    else if (e.key === 'PageUp') { e.preventDefault(); if (n) setActive(Math.max(0, idx - 8)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[idx]); }
  };

  let lastGroup: Group | null = null;
  return (
    <div class="pal">
      <div class="pal-search">
        <Icon name="search" size={18} />
        <input
          ref={inputRef}
          class="pal-input"
          type="text"
          role="combobox"
          aria-label="Go to question or topic"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={idx >= 0 ? optId(idx) : undefined}
          placeholder="Search questions, topics and pages"
          autocomplete="off"
          spellcheck={false}
          value={query}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
          onKeyDown={onKeyDown}
        />
        <kbd class="pal-esc" aria-hidden="true">Esc</kbd>
      </div>
      <div ref={listRef} id={listId} class="pal-list" role="listbox" aria-label="Results">
        {results.map((item, i) => {
          const head = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <Fragment key={item.id}>
              {head ? <div class="pal-group label" aria-hidden="true">{head}</div> : null}
              <div
                id={optId(i)}
                role="option"
                aria-selected={i === idx}
                class={`pal-opt${i === idx ? ' is-active' : ''}`}
                onMouseMove={() => { if (i !== idx) setActive(i); }}
                onClick={() => choose(item)}
              >
                <Icon name={item.icon} size={16} />
                <span class="pal-label">{item.label}</span>
                <span class="pal-detail">{item.detail}</span>
              </div>
            </Fragment>
          );
        })}
        {results.length === 0 ? <p class="pal-empty">No question, topic or page matches "{query.trim()}".</p> : null}
      </div>
      <div class="pal-foot" aria-hidden="true">
        <span><kbd>↑</kbd> <kbd>↓</kbd> move</span>
        <span><kbd>Enter</kbd> open</span>
        <span><kbd>Esc</kbd> close</span>
      </div>
      <span class="sr-only" role="status" aria-live="polite">
        {query.trim() ? `${results.length} result${results.length === 1 ? '' : 's'}` : ''}
      </span>
    </div>
  );
}

export function CommandPalette() {
  const open = paletteOpen.value;
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const close = () => { paletteOpen.value = false; };

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try { d.showModal(); } catch { d.setAttribute('open', ''); }
      d.querySelector<HTMLInputElement>('.pal-input')?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      class="dlg palette"
      aria-label="Go to question or topic"
      onCancel={(e) => { e.preventDefault(); close(); }}
      onClose={() => {
        const el = returnTo.current;
        returnTo.current = null;
        if (el && el.isConnected) el.focus();
      }}
      onClick={(e) => { if (e.target === ref.current) close(); }}
    >
      {open ? <PaletteBody onClose={close} /> : null}
    </dialog>
  );
}
