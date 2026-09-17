// Always-readable topic tabs: cheat sheet, worked example and common mistakes.
import type { Topic } from '../../../content/schema.ts';
import { MISTAKES } from '../../../content/mistakes.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';

export function CheatSheetTab({ topic }: { topic: Topic }) {
  if (!topic.cheatsheet?.trim()) return <div class="empty-state">The cheat sheet for this topic is being written.</div>;
  return (
    <article class="read-card">
      <Markdown text={topic.cheatsheet} class="read-md" />
    </article>
  );
}

export function WorkedExampleTab({ topic }: { topic: Topic }) {
  const ex = topic.workedExample;
  if (!ex || (!ex.code?.trim() && ex.steps.length === 0)) {
    return <div class="empty-state">The worked example for this topic is being written.</div>;
  }
  return (
    <article class="read-card worked">
      <h3 class="read-title">{ex.title}</h3>
      <div class="worked-grid">
        {ex.code?.trim() ? <CodeBlock code={ex.code} numbered label={`Worked example: ${ex.title}`} class="worked-code" /> : null}
        {ex.steps.length ? (
          <ol class="worked-steps">
            {ex.steps.map((s, i) => (
              <li key={i}>
                <span class="worked-step-num mono" aria-hidden="true">{i + 1}</span>
                <Markdown text={s} />
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </article>
  );
}

export function MistakesTab({ topic }: { topic: Topic }) {
  if (!topic.commonMistakes.length) return <div class="empty-state">Common mistakes for this topic are being written.</div>;
  return (
    <div class="cm-list">
      {topic.commonMistakes.map((m, i) => {
        const def = MISTAKES[m.mistake];
        return (
          <article key={`${m.mistake}-${i}`} class="read-card cm">
            <h3 class="read-title">{def?.label ?? 'Common mistake'}</h3>
            {m.note ? <Markdown text={m.note} class="cm-note" /> : null}
            <div class="cm-pair">
              <figure class="cm-side cm-bad">
                <figcaption><Icon name="x" size={14} /> Instead of</figcaption>
                <CodeBlock code={m.bad} />
              </figure>
              <figure class="cm-side cm-good">
                <figcaption><Icon name="check" size={14} /> Write</figcaption>
                <CodeBlock code={m.good} />
              </figure>
            </div>
          </article>
        );
      })}
    </div>
  );
}
