// Glossary (#/glossary): the words the course uses, in words a first-year already has.
//
// Everything a lesson says is written for someone who does not know the vocabulary yet, and then uses
// it. This is where the vocabulary lives, and where a definition that makes a claim about Python shows
// the claim running rather than asserting it.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { TERM_BY_ID, TERM_ENTRIES } from '../../content/glossaryIndex.ts';
import { matchesTerm, scoreTerm } from '../../content/glossarySchema.ts';
import type { TermEntry } from '../../content/glossarySchema.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { InlineMd } from '../components/Markdown.tsx';
import { glossaryJump } from '../shell/uiState.ts';
import './glossary.css';

/**
 * Render a definition, turning [[other-term]] into a link to that entry.
 *
 * Built by splitting rather than by setting markup: the app never writes innerHTML, and a definition is
 * still Markdown between the links, so each run goes through InlineMd.
 */
function Definition({ text }: { text: string }) {
  const parts = text.split(/(\[\[[a-z0-9-]+\]\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const link = /^\[\[([a-z0-9-]+)\]\]$/.exec(part);
        if (!link) return <InlineMd key={i} text={part} />;
        const target = TERM_BY_ID.get(link[1]);
        if (!target) return <InlineMd key={i} text={link[1]} />;
        return <a key={i} class="gl-xref" href={`#/glossary?t=${target.id}`}>{target.term}</a>;
      })}
    </>
  );
}

function Entry({ t, open }: { t: TermEntry; open: boolean }) {
  const confused = t.confusedWith ? TERM_BY_ID.get(t.confusedWith) : undefined;
  const out = t.stdout.replace(/\n$/, '');
  return (
    <article class={`gl-card${open ? ' is-open' : ''}`} id={`t-${t.id}`}>
      <h3 class="gl-term">{t.term}</h3>
      <p class="gl-short"><Definition text={t.short} /></p>
      {t.note ? <p class="gl-note"><Definition text={t.note} /></p> : null}
      {t.demo ? (
        <div class="gl-demo">
          <CodeBlock code={t.demo} label={`${t.term}: an example`} />
          {out ? (
            <div class="gl-out" role="group" aria-label="What it prints">
              <pre><code>{out}</code></pre>
            </div>
          ) : null}
        </div>
      ) : null}
      <p class="gl-links">
        {confused ? (
          <a class="gl-link" href={`#/glossary?t=${confused.id}`}>
            <Icon name="refresh" size={13} />Often mixed up with “{confused.term}”
          </a>
        ) : null}
        {t.lessonId ? (
          <a class="gl-link" href={href.lesson(t.lessonId)}>
            <Icon name="book" size={13} />Learn it properly
          </a>
        ) : null}
      </p>
    </article>
  );
}

/** The term named in the hash (#/glossary?t=argument), if any. */
function termFromHash(): string {
  const m = /[?&]t=([a-z0-9-]+)/.exec(typeof location === 'undefined' ? '' : location.hash);
  return m ? m[1] : '';
}

export function Glossary() {
  const [query, setQuery] = useState(() => glossaryJump.value ?? '');
  const [focused, setFocused] = useState(() => termFromHash());
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => { glossaryJump.value = null; }, []);

  // A term can be linked to from anywhere, including from another entry, so the hash is watched.
  useEffect(() => {
    const onHash = () => setFocused(termFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!focused) return;
    // Asking for a word has to show that word: following a cross-reference while a search is running
    // would otherwise land on a filtered list that excludes the very entry being asked for.
    const term = TERM_BY_ID.get(focused);
    if (term) setQuery(term.term);
    // After the list has re-rendered around the new query.
    requestAnimationFrame(() => document.getElementById(`t-${focused}`)?.scrollIntoView({ block: 'start' }));
  }, [focused]);

  // "/" jumps to the search, the way every reference site behaves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return;
      e.preventDefault();
      box.current?.focus();
      box.current?.select();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hits = useMemo(() => {
    const found = TERM_ENTRIES.filter((t) => matchesTerm(t, query));
    if (!query.trim()) return found.slice().sort((a, b) => a.term.localeCompare(b.term));
    return found
      .map((t) => ({ t, s: scoreTerm(t, query) }))
      .sort((a, b) => b.s - a.s || a.t.term.localeCompare(b.t.term))
      .map((x) => x.t);
  }, [query]);

  return (
    <div class="gl">
      <header class="gl-top">
        <h1 class="gl-h1">Glossary</h1>
        <p class="gl-lede">
          The words this course uses, in words you already have. Where one is really a claim about Python,
          the code underneath it was run to get the answer. Press <kbd>/</kbd> to search.
        </p>
      </header>

      <div class="gl-search">
        <Icon name="search" size={15} />
        <input
          ref={box}
          type="search"
          class="gl-search-in"
          placeholder="argument, mutable, truthy…"
          aria-label="Search the glossary"
          value={query}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
        />
        <span class="gl-count num">{hits.length} of {TERM_ENTRIES.length}</span>
      </div>

      {hits.length === 0 ? (
        <p class="gl-none">
          Nothing matches “{query}”. If it is a word from a lesson that should be here, it is worth
          reporting — the glossary is meant to cover the vocabulary the course actually uses.
        </p>
      ) : (
        <div class="gl-list">
          {hits.map((t) => <Entry key={t.id} t={t} open={t.id === focused} />)}
        </div>
      )}
    </div>
  );
}
