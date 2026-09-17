// Always-readable topic tabs, each a single readable column (~72ch) in a white card: cheat sheet (with a quiet
// "On this page" rail on wide screens), worked example (the code, then the steps) and common mistakes (bad / good
// code side by side with a one-line note).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Topic } from '../../../content/schema.ts';
import { MISTAKES } from '../../../content/mistakes.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';

interface Section { title: string | null; body: string }

/** Split a cheat sheet at lines that are only bold text ("**range() at a glance**"), outside fenced code. */
export function splitSections(md: string): Section[] {
  const out: Section[] = [];
  let cur: Section = { title: null, body: '' };
  const lines: string[] = [];
  let inCode = false;
  const flush = () => {
    cur.body = lines.join('\n').trim();
    if (cur.title || cur.body) out.push(cur);
    lines.length = 0;
  };
  for (const line of md.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```/.test(line)) inCode = !inCode;
    const m = !inCode ? /^\*\*([^*]+?)\*\*:?\s*$/.exec(line) : null;
    if (m) {
      flush();
      cur = { title: m[1].replace(/[.:]$/, ''), body: '' };
    } else {
      lines.push(line);
    }
  }
  flush();
  return out;
}

function reducedMotion() {
  return document.documentElement.getAttribute('data-motion') === 'reduce' || matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CheatSheetTab({ topic }: { topic: Topic }) {
  const sections = useMemo(() => splitSections(topic.cheatsheet ?? ''), [topic]);
  const titled = sections.map((s, i) => ({ ...s, i })).filter((s) => s.title);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const idFor = (i: number) => `cs-${topic.id}-${i}`;

  // Highlight the section nearest the top of the scrolling main area.
  useEffect(() => {
    const el = root.current;
    if (!el || titled.length < 3 || typeof IntersectionObserver === 'undefined') return;
    const scroller = el.closest('main');
    const seen = new Map<number, boolean>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(Number((e.target as HTMLElement).dataset.idx), e.isIntersecting);
      const first = [...seen.entries()].filter(([, v]) => v).map(([k]) => k).sort((a, b) => a - b)[0];
      if (first !== undefined) setActive(first);
    }, { root: scroller, rootMargin: '0px 0px -65% 0px' });
    el.querySelectorAll('[data-idx]').forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [topic.id, titled.length]);

  if (!topic.cheatsheet?.trim()) return <div class="tp-empty">The cheat sheet for this topic is being written.</div>;

  const jump = (i: number) => {
    const target = document.getElementById(idFor(i));
    if (!target) return;
    target.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
    target.focus({ preventScroll: true });
    setActive(i);
  };

  return (
    <div class={`tp-read tp-cs${titled.length >= 3 ? ' has-toc' : ''}`} ref={root}>
      <article class="tp-card tp-read-main">
        {sections.map((s, i) => (
          <section key={i} class="tp-cs-sec" data-idx={i}>
            {s.title ? <h3 id={idFor(i)} tabIndex={-1} class="tp-read-h">{s.title}</h3> : null}
            {s.body ? <Markdown text={s.body} class="tp-md" /> : null}
          </section>
        ))}
      </article>
      {titled.length >= 3 ? (
        <nav class="tp-toc" aria-label="Cheat sheet sections">
          <p class="tp-label">On this page</p>
          <ul>
            {titled.map((s) => (
              <li key={s.i}>
                <button type="button" class={s.i === active ? 'is-on' : undefined} aria-current={s.i === active ? 'location' : undefined} onClick={() => jump(s.i)}>
                  {s.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export function WorkedExampleTab({ topic }: { topic: Topic }) {
  const ex = topic.workedExample;
  if (!ex || (!ex.code?.trim() && ex.steps.length === 0)) {
    return <div class="tp-empty">The worked example for this topic is being written.</div>;
  }
  const hasCode = !!ex.code?.trim();
  return (
    <div class="tp-read tp-we">
      <article class="tp-card tp-we-card">
        <p class="tp-label">Worked example</p>
        <h3 class="tp-read-title">{ex.title}</h3>
        {hasCode ? <CodeBlock code={ex.code} numbered label={`Worked example code: ${ex.title}`} /> : null}
        {ex.steps.length ? (
          <ol class="tp-steps">
            {ex.steps.map((s, i) => (
              <li key={i}>
                <span class="tp-step-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <Markdown text={s} class="tp-md" />
              </li>
            ))}
          </ol>
        ) : null}
      </article>
    </div>
  );
}

export function MistakesTab({ topic }: { topic: Topic }) {
  if (!topic.commonMistakes.length) return <div class="tp-empty">Common mistakes for this topic are being written.</div>;
  return (
    <ol class="tp-read tp-cm-list">
      {topic.commonMistakes.map((m, i) => {
        const def = MISTAKES[m.mistake];
        return (
          <li key={`${m.mistake}-${i}`} class="tp-card tp-cm">
            <div class="tp-cm-text">
              <h3 class="tp-read-h">{def?.label ?? 'Common mistake'}</h3>
              {m.note ? <Markdown text={m.note} class="tp-md tp-cm-note" /> : null}
            </div>
            <div class="tp-cm-pair">
              <figure class="tp-cm-side is-bad">
                <figcaption><span class="tp-cm-mark"><Icon name="x" size={12} /></span>Instead of</figcaption>
                <CodeBlock code={m.bad} label="Code with the mistake" />
              </figure>
              <figure class="tp-cm-side is-good">
                <figcaption><span class="tp-cm-mark"><Icon name="check" size={12} /></span>Write</figcaption>
                <CodeBlock code={m.good} label="Corrected code" />
              </figure>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
