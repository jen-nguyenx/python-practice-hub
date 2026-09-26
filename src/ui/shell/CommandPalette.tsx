// Command palette ("Go to question or topic", Cmd/Ctrl+K or Cmd/Ctrl+P): fuzzy search over pages and actions, the 13
// topics and every question title. Combobox + listbox pattern inside a native modal <dialog>: typing filters,
// Up/Down/Home/End move, Enter opens, Esc closes and focus returns to where it was.
import { Fragment } from 'preact';
import { signal } from '@preact/signals';
import { useEffect, useId, useMemo, useRef, useState } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { isLessonVisible, LESSON_INDEX } from '../../content/lessons/index.ts';
import { TRACK_LABEL } from '../../content/lessonSchema.ts';
import { TERM_ENTRIES } from '../../content/glossaryIndex.ts';
import { RECIPES } from '../../content/recipes/index.ts';
import { GROUP_LABEL } from '../../content/recipeSchema.ts';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import '../components/controls.css';
import { matchItem } from './fuzzy.ts';
import { continueInfo } from './homeData.ts';
import { safeTopicProgress } from './progressData.ts';
import { toggleTheme } from './ThemeToggle.tsx';
import { glossaryJump, mainFill, paletteOpen, referenceJump, shortcutSheetOpen } from './uiState.ts';
import { unitOf } from '../../content/units.ts';

type Group = 'Pages and actions' | 'Lessons' | 'Reference' | 'Glossary' | 'Topics' | 'Questions';
interface Item {
  id: string; group: Group; label: string; detail: string; icon: IconName; search: string; run: () => void;
  /** The question's topic is locked: shown as "Locked" and ranked below everything that is open. */
  locked?: boolean;
  /** Route this item goes to, so the palette can tell when it is the page you are already on. */
  href?: string;
  /** Set while a test is running on this item's own route: choosing it explains instead of doing nothing. */
  unavailable?: string;
}

const GROUPS: Group[] = ['Pages and actions', 'Lessons', 'Reference', 'Glossary', 'Topics', 'Questions'];
/** The reference is browsed on its own page; the palette offers the few best answers, not all of it. */
const MAX_REFERENCE = 5;
/** A word and its one-line meaning; the glossary page is where the rest of it lives. */
const MAX_GLOSSARY = 4;
const MAX_QUESTIONS = 40;

function go(h: string) { return () => navigate(h); }

function buildItems(): { items: Item[]; continueItem: Item | null } {
  const events = store.events.value;
  const settings = store.settings.value;
  const progress = safeTopicProgress(events, settings);
  const actions: Item[] = [
    { id: 'a-home', group: 'Pages and actions', label: 'Topics', detail: 'Home', icon: 'ladder', search: 'home ladder', href: href.landing(), run: go(href.landing()) },
    { id: 'a-lessons', group: 'Pages and actions', label: 'Lessons', detail: 'Explanations from the beginning to beyond the unit', icon: 'book', search: 'learn teach read tutorial guide', href: href.lessons(), run: go(href.lessons()) },
    { id: 'a-revision', group: 'Pages and actions', label: 'Revision pack', detail: 'Every cheat sheet on one printable page', icon: 'download', search: 'print pdf paper cheat sheet revision pack closed book', href: href.revision(), run: go(href.revision()) },
    { id: 'a-gloss', group: 'Pages and actions', label: 'Glossary', detail: 'What the words mean, in plainer words', icon: 'book', search: 'glossary vocabulary jargon term definition meaning word', href: href.glossary(), run: go(href.glossary()) },
    { id: 'a-ref', group: 'Pages and actions', label: 'Reference', detail: 'How do I…? Snippets that really run', icon: 'search', search: 'how do i syntax cheat sheet snippet lookup recipe', href: href.reference(), run: go(href.reference()) },
    { id: 'a-play', group: 'Pages and actions', label: 'Playground', detail: 'Write and run any Python', icon: 'code', search: 'editor run python', href: href.playground(), run: go(href.playground()) },
    { id: 'a-exam', group: 'Pages and actions', label: 'Exams', detail: 'Mock final paper or a timed practice test', icon: 'clock', search: 'exam final mock practice test timed', href: href.exam(), run: go(href.exam()) },
    { id: 'a-review', group: 'Pages and actions', label: 'Review', detail: 'Practise the mistakes you have made', icon: 'refresh', search: 'mistakes weak spots revise repeat', href: href.review(), run: go(href.review()) },
    { id: 'a-decode', group: 'Pages and actions', label: 'Decode an error', detail: 'Paste a traceback, get it in plain words', icon: 'help', search: 'traceback exception meaning what does this mean stuck', href: href.decode(), run: go(href.decode()) },
    { id: 'a-plan', group: 'Pages and actions', label: 'The run-in', detail: 'Weeks left, and whether you are on track', icon: 'flag', search: 'exam plan revision schedule countdown ready weeks', href: href.plan(), run: go(href.plan()) },
    { id: 'a-placement', group: 'Pages and actions', label: 'Where should you start?', detail: 'Answer a few questions to open the topics you already know', icon: 'ladder', search: 'placement skip ahead already know unlock start level test', href: href.placement(), run: go(href.placement()) },
    { id: 'a-report', group: 'Pages and actions', label: 'Report', detail: 'Strengths and weak spots', icon: 'chart', search: 'progress mistakes stats', href: href.report(), run: go(href.report()) },
    { id: 'a-settings', group: 'Pages and actions', label: 'Settings', detail: 'Theme, backup, unlock', icon: 'sliders', search: 'preferences backup export', href: href.settings(), run: go(href.settings()) },
    { id: 'a-theme', group: 'Pages and actions', label: 'Toggle theme', detail: 'Switch light and dark', icon: 'moon', search: 'dark light mode', run: toggleTheme },
    { id: 'a-keys', group: 'Pages and actions', label: 'Keyboard shortcuts', detail: 'Show the list', icon: 'keyboard', search: 'keys help', run: () => { shortcutSheetOpen.value = true; } },
  ];
  // A running test hides the title bar and the icon bar, and its route is already current, so navigate() would do
  // nothing at all. Say so instead of looking broken.
  if (mainFill.value) {
    const here = typeof location === 'undefined' ? '' : location.hash;
    for (const a of actions) {
      if (!a.href || a.href !== here) continue;
      a.detail = 'Unavailable during the test';
      a.unavailable = `${a.label} is the page you are on. Finish the test, or leave it, to come back here.`;
    }
  }
  const topics: Item[] = TOPICS.map((t) => {
    const p = progress[t.id];
    const locked = p.state === 'locked';
    const detail = locked ? 'Locked' : `${p.solved} of ${p.total} solved`;
    return {
      id: `t-${t.id}`, group: 'Topics', label: `${t.num} ${t.title}`, detail, icon: locked ? 'lock' : 'ladder',
      search: t.short, locked, href: href.topic(t.id), run: go(href.topic(t.id)),
    };
  });
  // Lessons are searchable by their outcomes too, so "sort by two keys" finds the lesson that teaches it
  // even though those words are not in its title.
  const lessons: Item[] = LESSON_INDEX.filter((l) => isLessonVisible(l, settings)).map((l) => ({
    id: `l-${l.id}`,
    group: 'Lessons',
    label: l.title,
    detail: `${TRACK_LABEL[l.track]} · ${l.minutes} min`,
    icon: 'book',
    search: `${l.summary} ${l.outcomes.join(' ')} ${(l.sectionTitles ?? []).join(' ')}`,
    href: href.lesson(l.id),
    run: go(href.lesson(l.id)),
  }));
  const questions: Item[] = QUESTION_INDEX.map((q) => {
    const t = TOPIC_BY_ID[q.topicId];
    const locked = progress[q.topicId]?.state === 'locked';
    const short = t?.short ?? '';
    // The scenario title travels in the question index, so searching for "Rottnest ferry" works
    // straight away without downloading any topic chunk.
    const scenario = q.scenarioTitle;
    return {
      id: `q-${q.qid}`, group: 'Questions', label: q.title,
      detail: locked ? `${short} · Locked` : `${short} · ${FORMAT_LABEL[q.format]}`,
      icon: locked ? 'lock' : 'file',
      search: `${short} ${t?.title ?? ''} ${scenario} ${FORMAT_LABEL[q.format]}`,
      locked, href: href.question(q.qid), run: go(href.question(q.qid)),
    };
  });
  let continueItem: Item | null = null;
  const info = continueInfo(events, settings, progress);
  if (info.question && QUESTION_BY_ID.has(info.question.qid)) {
    const q = info.question;
    continueItem = { id: 'c-continue', group: 'Pages and actions', label: `Continue: ${q.title}`, detail: info.topic.short, icon: 'arrowRight', search: 'continue resume', run: go(href.question(q.qid)) };
  }
  // The reference answers "how do I ...?", and that question is as likely to be typed here as on its own
  // page. Its snippets and notes are searchable too, so remembering the error is enough to find the entry.
  const reference: Item[] = RECIPES.map((r) => ({
    id: `r-${r.id}`, group: 'Reference', label: r.task, detail: GROUP_LABEL[r.group], icon: 'search',
    search: `${(r.also ?? []).join(' ')} ${r.note} ${r.code}`,
    href: href.reference(),
    run: () => { referenceJump.value = r.task; navigate(href.reference()); },
  }));
  // A word met in a question is looked up from wherever the student is, which is here.
  const glossary: Item[] = TERM_ENTRIES.filter((t) => !t.markets || settings.showMarkets === true).map((t) => ({
    id: `g-${t.id}`, group: 'Glossary', label: t.term, detail: t.short.replace(/\[\[([a-z0-9-]+)\]\]/g, '$1'),
    icon: 'book', search: `${(t.also ?? []).join(' ')} ${t.note ?? ''} meaning definition what is`,
    href: href.glossary(t.id),
    run: () => { glossaryJump.value = t.term; navigate(href.glossary(t.id)); },
  }));
  // A STAT2402 student's app is their lessons and R. The topics, questions, Python reference and glossary
  // are CITS1401's, and searching "regression" should not turn up a Python recipe.
  if (unitOf(settings) === 'stat2402') {
    const keep = new Set(['a-lessons', 'a-settings', 'a-theme', 'a-keys']);
    const statActions: Item[] = [
      { id: 'a-home', group: 'Pages and actions', label: 'Home', detail: 'Your STAT2402 path', icon: 'home', search: 'home path start', href: href.landing(), run: go(href.landing()) },
      ...actions.filter((a) => keep.has(a.id)),
      { id: 'a-exam', group: 'Pages and actions', label: 'Exams', detail: 'Mock final, practice tests and lesson quizzes', icon: 'clock', search: 'exam final mock practice test quiz timed', href: href.exam(), run: go(href.exam()) },
      { id: 'a-sprog', group: 'Pages and actions', label: 'Progress', detail: 'Lessons read, marks lesson by lesson, what to work on', icon: 'chart', search: 'progress report marks stats weak strengths', href: href.report(), run: go(href.report()) },
      { id: 'a-rplay', group: 'Pages and actions', label: 'R Playground', detail: 'Write and run any R', icon: 'code', search: 'editor run r console script', href: href.rPlayground(), run: go(href.rPlayground()) },
    ];
    return { items: [...statActions, ...lessons], continueItem: null };
  }
  return { items: [...actions, ...lessons, ...reference, ...glossary, ...topics, ...questions], continueItem };
}

function filterItems(all: Item[], continueItem: Item | null, query: string): Item[] {
  const q = query.trim();
  if (!q) return [...(continueItem ? [continueItem] : []), ...all.filter((i) => i.group !== 'Questions' && i.group !== 'Reference' && i.group !== 'Glossary')];
  const scored: { item: Item; score: number }[] = [];
  for (const item of all) {
    const s = matchItem(q, item.label, item.search);
    if (s !== null) scored.push({ item, score: s });
  }
  // Anything the student can open now comes before anything in a locked topic.
  scored.sort((a, b) => Number(!!a.item.locked) - Number(!!b.item.locked) || b.score - a.score);
  const out: Item[] = [];
  for (const g of GROUPS) {
    const inGroup = scored.filter((s) => s.item.group === g).map((s) => s.item);
    const cap = g === 'Questions' ? MAX_QUESTIONS
      : g === 'Reference' ? MAX_REFERENCE
        : g === 'Glossary' ? MAX_GLOSSARY
          : inGroup.length;
    out.push(...inGroup.slice(0, cap));
  }
  return out;
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { items, continueItem } = useMemo(buildItems, []);
  const results = useMemo(() => filterItems(items, continueItem, query), [items, continueItem, query]);
  const idx = results.length ? Math.min(active, results.length - 1) : -1;
  const optId = (i: number) => `${listId}-o${i}`;

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActive(0); setNotice(null); }, [query]);
  useEffect(() => {
    if (idx < 0) return;
    listRef.current?.querySelector(`#${CSS.escape(optId(idx))}`)?.scrollIntoView({ block: 'nearest' });
  }, [idx, results]);

  const choose = (item: Item | undefined) => {
    if (!item) return;
    if (item.unavailable) {
      setNotice(item.unavailable);
      return;
    }
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
                aria-disabled={item.unavailable ? 'true' : undefined}
                class={`pal-opt${i === idx ? ' is-active' : ''}${item.unavailable ? ' is-off' : ''}`}
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
      {notice ? <p class="pal-notice" role="status"><Icon name="info" size={14} />{notice}</p> : null}
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
