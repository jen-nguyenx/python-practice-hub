// Reference (#/reference): "how do I ...?" answered with a snippet that really runs.
//
// Built for the two minutes before you remember: search by the job, read the snippet, see what it
// prints, get on with it. Every output shown was produced by the verifier running that code.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { RECIPES } from '../../content/recipes/index.ts';
import { GROUP_LABEL, matchesRecipe, RECIPE_GROUPS } from '../../content/recipeSchema.ts';
import type { RecipeEntry, RecipeGroup } from '../../content/recipeSchema.ts';
import { LESSON_FOR_TOPIC } from '../../content/lessons/index.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { openInPlayground } from '../workbench/openInPlayground.ts';
import './reference.css';

function Entry({ r }: { r: RecipeEntry }) {
  const lesson = r.topicId ? LESSON_FOR_TOPIC[r.topicId] : undefined;
  const out = r.stdout.replace(/\n$/, '');
  return (
    <article class="rf-card">
      <h3 class="rf-task">{r.task}</h3>
      <CodeBlock code={r.code} label={r.task} />
      {out ? (
        <div class="rf-out" role="group" aria-label="What it prints">
          <pre><code>{out}</code></pre>
        </div>
      ) : null}
      <Markdown text={r.note} class="rf-note" />
      <p class="rf-links">
        <button
          type="button"
          class="rf-link"
          onClick={() => openInPlayground(r.code, `${r.id}.py`, { href: href.reference(), label: 'the reference' })}
        >
          <Icon name="terminal" size={13} />Try it
        </button>
        {lesson ? (
          <a class="rf-link" href={href.lesson(lesson.id)}>
            <Icon name="book" size={13} />Learn it properly
          </a>
        ) : null}
      </p>
    </article>
  );
}

export function Reference() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<RecipeGroup | 'all'>('all');
  const box = useRef<HTMLInputElement>(null);

  // A reference is opened to look something up, so the cursor starts where the looking-up happens.
  useEffect(() => { box.current?.focus(); }, []);

  // "/" jumps to the search from anywhere on the page, the way every reference site behaves.
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

  const hits = useMemo(
    () => RECIPES.filter((r) => (group === 'all' || r.group === group) && matchesRecipe(r, query)),
    [query, group],
  );
  const groups = useMemo(() => {
    const out: { g: RecipeGroup; items: RecipeEntry[] }[] = [];
    for (const g of RECIPE_GROUPS) {
      const items = hits.filter((r) => r.group === g);
      if (items.length) out.push({ g, items });
    }
    return out;
  }, [hits]);

  return (
    <div class="rf">
      <header class="rf-top">
        <h1 class="rf-h1">Reference</h1>
        <p class="rf-lede">
          How do I…? Every snippet here was run to get the answer underneath it. Press <kbd>/</kbd> to search.
        </p>
      </header>

      <div class="rf-search">
        <Icon name="search" size={15} />
        <input
          ref={box}
          type="search"
          class="rf-search-in"
          placeholder="sort a dictionary, count things, read a file…"
          aria-label="Search the reference"
          value={query}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
        />
        <span class="rf-count num">{hits.length} of {RECIPES.length}</span>
      </div>

      <div class="rf-groups" role="group" aria-label="Filter by area">
        <button type="button" class={`rf-chip${group === 'all' ? ' is-on' : ''}`} aria-pressed={group === 'all'} onClick={() => setGroup('all')}>
          Everything
        </button>
        {RECIPE_GROUPS.filter((g) => RECIPES.some((r) => r.group === g)).map((g) => (
          <button key={g} type="button" class={`rf-chip${group === g ? ' is-on' : ''}`} aria-pressed={group === g} onClick={() => setGroup(g)}>
            {GROUP_LABEL[g]}
          </button>
        ))}
      </div>

      {hits.length === 0 ? (
        <p class="rf-none">
          Nothing matches “{query}”. Try the words you would use to describe the job, like “sort”,
          “count” or “round”.
        </p>
      ) : (
        groups.map(({ g, items }) => (
          <section key={g} class="rf-group" aria-labelledby={`rf-${g}`}>
            <h2 class="rf-group-h" id={`rf-${g}`}>{GROUP_LABEL[g]}</h2>
            <div class="rf-list">
              {items.map((r) => <Entry key={r.id} r={r} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
