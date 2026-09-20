// Renders one lesson block. Every output shown here was recorded by the verifier running the code in real
// Python, so nothing in this file decides what Python does: it only lays out what Python already said.
import { useState } from 'preact/hooks';
import type { GeneratedBlock, LessonBlock, LessonError, ShellLine } from '../../content/lessonSchema.ts';
import type { Experiment, GeneratedExperiments, Topic } from '../../content/schema.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { InlineMd, Markdown } from '../components/Markdown.tsx';
import { Annotate, Match, Order, Predict, Quiz, Task, Walkthrough } from './Interactive.tsx';
import { openInPlayground } from '../workbench/openInPlayground.ts';
import { MistakesTab, WorkedExampleTab } from '../shell/topic/ReadTabs.tsx';
import { ExperimentCard } from '../shell/topic/WhatIf.tsx';

function errorText(e: LessonError): string {
  return `${e.type}${e.message ? `: ${e.message}` : ''}`;
}

/**
 * Takes the program to the Playground so a reader can change it and run it themselves. Deliberately not
 * offered on a prediction until it has been answered: being able to run the code first would turn
 * "what does this print" into "press the button".
 */
function TryIt({ code, name, back }: { code: string; name: string; back?: { href: string; label: string } }) {
  return (
    <p class="lb-tryit">
      <button type="button" class="btn ghost lb-tryit-btn" onClick={() => openInPlayground(code, name, back)}>
        <Icon name="terminal" size={14} /> Try it yourself
      </button>
    </p>
  );
}

/**
 * What a program printed, and the error it ended with when it ended with one.
 *
 * `recorded` is false when the verifier left no output for this block, which only happens if the
 * generated data is stale against the lesson file. Saying "this prints nothing" then would be the app
 * claiming something about Python that Python never said, so it says nothing at all instead.
 */
function Output({ recorded, stdout, error, label }: { recorded: boolean; stdout?: string; error?: LessonError; label: string }) {
  if (!recorded) return null;
  const text = (stdout ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const lines = text === '' ? [] : text.split('\n');
  if (lines.length === 0 && !error) {
    return <p class="lb-out is-quiet">This prints nothing.</p>;
  }
  return (
    <div class="lb-out" role="group" aria-label={label}>
      <pre><code>
        {lines.map((l, i) => <span key={i} class="lb-out-line">{l || ' '}{'\n'}</span>)}
        {error ? <span class="lb-out-line is-error">{errorText(error)}{'\n'}</span> : null}
      </code></pre>
      {error ? <p class="lb-out-where">Stopped on line {error.line}.</p> : null}
    </div>
  );
}

function Shell({ lines }: { lines: ShellLine[] }) {
  return (
    <div class="lb-shell" role="group" aria-label="Python shell session">
      <pre><code>
        {lines.map((l, i) => (
          <span key={i}>
            <span class="lb-sh-in"><span class="lb-sh-prompt" aria-hidden="true">{'>>> '}</span>{l.source}{'\n'}</span>
            {l.stdout ? l.stdout.replace(/\n$/, '').split('\n').map((o, j) => (
              <span key={`o${j}`} class="lb-sh-out">{o || ' '}{'\n'}</span>
            )) : null}
            {l.value !== undefined ? <span class="lb-sh-val">{l.value}{'\n'}</span> : null}
            {l.error ? <span class="lb-sh-err">{errorText(l.error)}{'\n'}</span> : null}
          </span>
        ))}
      </code></pre>
    </div>
  );
}

function Checkpoint({ prompt, answer }: { prompt: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div class="lb-check">
      <p class="lb-check-tag">Check yourself</p>
      <Markdown text={prompt} class="lb-md" />
      <button
        type="button"
        class="btn ghost lb-check-btn"
        onClick={() => setOpen(true)}
        disabled={open}
        aria-expanded={open}
      >
        {open ? 'Answer shown' : 'Show the answer'}
      </button>
      {open ? (
        <div class="lb-check-answer" role="status">
          <Markdown text={answer} class="lb-md" />
        </div>
      ) : null}
    </div>
  );
}

const CALLOUT_TITLE = { note: 'Worth knowing', warn: 'Careful', exam: 'In the exam' } as const;

export interface BlockContext {
  /** Used to name the file when a program is sent to the Playground. */
  slug: string;
  /** Where the Playground should offer to send the reader back to. */
  back: { href: string; label: string };
  topic: Topic | null;
  experiments: GeneratedExperiments | null;
  /** Where the practice block sends the reader. */
  practiceHref: string | null;
  practiceLabel: string;
}

export function Block({ block, gen, ctx }: { block: LessonBlock; gen: GeneratedBlock | undefined; ctx: BlockContext }) {
  switch (block.kind) {
    case 'prose':
      return <Markdown text={block.body} class="lb-md lb-prose" />;

    case 'code':
      return (
        <figure class="lb-fig">
          {block.caption ? <figcaption><Markdown text={block.caption} class="lb-md lb-cap" /></figcaption> : null}
          <CodeBlock code={block.code} numbered label="Example program" />
          {block.hideOutput ? null : <Output recorded={gen !== undefined} stdout={gen?.stdout} error={gen?.error} label="What it prints" />}
          <TryIt code={block.code} name={`${ctx.slug}.py`} back={ctx.back} />
        </figure>
      );

    case 'shell':
      return (
        <figure class="lb-fig">
          {block.caption ? <figcaption><Markdown text={block.caption} class="lb-md lb-cap" /></figcaption> : null}
          {gen?.shell ? <Shell lines={gen.shell} /> : null}
        </figure>
      );

    case 'compare':
      return (
        <figure class="lb-fig">
          {block.caption ? <figcaption><Markdown text={block.caption} class="lb-md lb-cap" /></figcaption> : null}
          <div class="lb-compare">
            {([['left', block.left, gen?.left], ['right', block.right, gen?.right]] as const).map(([side, spec, out]) => (
              <div key={side} class={`lb-side${spec.bad ? ' is-bad' : ''}`}>
                <p class="lb-side-label">
                  {spec.bad ? <span class="lb-side-mark" aria-hidden="true"><Icon name="x" size={11} /></span> : null}
                  {spec.label}
                </p>
                <CodeBlock code={spec.code} label={spec.label} />
                <Output recorded={out !== undefined} stdout={out?.stdout} error={out?.error} label={`What ${spec.label} prints`} />
                <TryIt code={spec.code} name={`${ctx.slug}-${side}.py`} back={ctx.back} />
              </div>
            ))}
          </div>
        </figure>
      );

    case 'callout':
      return (
        <aside class={`lb-callout is-${block.tone}`}>
          <p class={`lb-callout-title${block.title ? ' is-custom' : ''}`}>
            {block.title ? <InlineMd text={block.title} /> : CALLOUT_TITLE[block.tone]}
          </p>
          <Markdown text={block.body} class="lb-md" />
        </aside>
      );

    case 'checkpoint':
      return <Checkpoint prompt={block.prompt} answer={block.answer} />;

    case 'quiz':
      return <Quiz prompt={block.prompt} code={block.code} options={block.options} />;

    case 'predict':
      return <Predict code={block.code} ask={block.ask} choices={block.choices} stdout={gen?.stdout} error={gen?.error} slug={ctx.slug} back={ctx.back} recorded={gen !== undefined} />;

    case 'order':
      return <Order lines={block.lines} ask={block.ask} stdout={gen?.stdout} recorded={gen !== undefined} />;

    case 'match':
      return <Match pairs={block.pairs} ask={block.ask} />;

    case 'walkthrough': {
      if (!gen?.steps?.length) return null;
      return (
        <>
          <Walkthrough code={block.code} steps={gen.steps} stdout={gen.stdout ?? ''} ask={block.ask} />
          <TryIt code={block.code} name={`${ctx.slug}.py`} back={ctx.back} />
        </>
      );
    }

    case 'annotate':
      return (
        <>
          <Annotate code={block.code} notes={block.notes} ask={block.ask} />
          <TryIt code={block.code} name={`${ctx.slug}.py`} back={ctx.back} />
        </>
      );

    case 'steps':
      return (
        <div class="lb-steps">
          {block.title ? <p class="lb-steps-title">{block.title}</p> : null}
          <ol>
            {block.items.map((item, i) => (
              <li key={i}><Markdown text={item} class="lb-md" /></li>
            ))}
          </ol>
        </div>
      );

    case 'table':
      return (
        <figure class="lb-fig">
          {block.caption ? <figcaption><Markdown text={block.caption} class="lb-md lb-cap" /></figcaption> : null}
          <div class="lb-table-wrap">
            <table class="lb-table">
              <thead>
                <tr>{block.head.map((h) => <th key={h} scope="col"><InlineMd text={h} /></th>)}</tr>
              </thead>
              <tbody>
                {block.rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => <td key={j}><InlineMd text={cell} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      );

    case 'interactive': {
      const runs = gen?.experiment;
      if (!runs || Object.keys(runs.runs ?? {}).length === 0) return null;
      // Keyed by experiment id: without it Preact reuses the card instance across sections, and a
      // one-slider card inherits a two-knob card's picks and looks up a combination that does not exist.
      return <div class="lb-experiment tp-read"><ExperimentCard key={block.experiment.id} x={block.experiment} gen={runs} compact /></div>;
    }

    case 'experiment': {
      const x = ctx.topic?.experiments?.find((e: Experiment) => e.id === block.id);
      const data = ctx.experiments?.[block.id];
      if (!x || !data || Object.keys(data.runs ?? {}).length === 0) return null;
      return <div class="lb-experiment tp-read"><ExperimentCard key={x.id} x={x} gen={data} compact /></div>;
    }

    case 'workedExample':
      return ctx.topic ? <div class="lb-embed">{<WorkedExampleTab topic={ctx.topic} />}</div> : null;

    case 'mistakes': {
      if (!ctx.topic) return null;
      const only = block.only;
      const topic = only?.length
        ? { ...ctx.topic, commonMistakes: ctx.topic.commonMistakes.filter((m) => only.includes(m.mistake)) }
        : ctx.topic;
      return <div class="lb-embed">{<MistakesTab topic={topic} />}</div>;
    }

    case 'task':
      return (
        <Task
          prompt={block.prompt}
          run={block.run}
          fnName={block.fnName}
          starter={block.starter}
          solution={block.solution}
          tests={block.tests}
          hint={block.hint}
        />
      );

    case 'practice':
      return (
        <div class="lb-practice">
          {block.body ? <Markdown text={block.body} class="lb-md" /> : (
            <p>Reading is not the same as being able to write it. The questions are where that happens.</p>
          )}
          {ctx.practiceHref ? (
            <p><a class="btn primary" href={ctx.practiceHref}>{ctx.practiceLabel}<Icon name="arrowRight" size={16} /></a></p>
          ) : null}
        </div>
      );
  }
}
