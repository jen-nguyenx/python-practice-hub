// Right-hand Home cards: Continue, Mid-semester practice test, This week's focus, Playground and (when due) a backup reminder.
import { useState } from 'preact/hooks';
import { href } from '../../../app/router.ts';
import { FORMAT_LABEL } from '../../../content/ids.ts';
import { TOPIC_BY_ID } from '../../../content/topics.ts';
import type { TopicProgress } from '../../../engine/progress.ts';
import type { SessionSummary } from '../../../engine/progress.ts';
import { LinkButton } from '../../components/Button.tsx';
import { Icon } from '../../components/Icon.tsx';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { downloadExport } from '../backup.ts';
import { plural, relativeDay } from '../format.ts';
import type { ContinueInfo, MidsemSummary } from '../homeData.ts';
import type { NextUp } from './Ladder.tsx';

export function ContinueCard({ info, next, progress, fresh, started, session }: {
  info: ContinueInfo; next: NextUp | null; progress: TopicProgress; fresh: boolean; started: boolean; session: SessionSummary | null;
}) {
  const t = info.topic;
  return (
    <section class="hc card" aria-labelledby="hc-continue">
      <p class="label hc-eyebrow">{fresh ? 'Start here' : 'Continue'}</p>
      <h2 class="hc-title" id="hc-continue">{t.title}</h2>
      {next ? (
        <p class="hc-sub num">Question {next.number} of {progress.total} · {FORMAT_LABEL[next.question.format]}</p>
      ) : (
        <p class="hc-sub">Every open question here is done.</p>
      )}
      <ProgressBar value={progress.solved} max={progress.total} label={`${t.short} progress`} valueText={`${progress.solved} of ${progress.total} solved`} class="hc-bar" />
      {next ? (
        <LinkButton href={href.question(next.question.qid)} variant="primary" size="lg" block>
          {started ? 'Resume' : 'Start'} question {next.number}
        </LinkButton>
      ) : (
        <LinkButton href={href.topic(t.id)} variant="primary" size="lg" block>Open {t.short}</LinkButton>
      )}
      {session && session.questions > 0 ? (
        <p class="hc-note num">This session: {plural(session.questions, 'question')} · {Math.round(session.focusedMin)} min</p>
      ) : null}
    </section>
  );
}

export function MidsemCard({ summary }: { summary: MidsemSummary }) {
  return (
    <section class="hc card" aria-labelledby="hc-midsem">
      <h2 class="hc-title sm" id="hc-midsem">Mid-semester practice test</h2>
      <p class="hc-sub num">{summary.count} questions · {summary.minutes} minutes · {summary.scope}</p>
      <LinkButton href={href.midsem()} variant="outline" size="lg" block class="hc-action">
        {summary.resumable ? 'Resume practice test' : 'Start practice test'}
      </LinkButton>
    </section>
  );
}

export interface FocusMistake { label: string; count: number; topicId: string | null }

export function FocusCard({ focus }: { focus: FocusMistake }) {
  const topic = focus.topicId ? TOPIC_BY_ID[focus.topicId] : undefined;
  return (
    <section class="hc card" aria-labelledby="hc-focus">
      <h2 class="hc-title sm" id="hc-focus">This week's focus</h2>
      <p class="hc-focus-row">
        <span class="chip hint mono">{focus.label}</span>
        <span class="hc-small num">seen {plural(focus.count, 'time')}</span>
      </p>
      <p class="hc-text">Your most repeated mistake{topic ? `, mostly in ${topic.short} questions` : ' in the last 14 days'}.</p>
      <p class="hc-links">
        {topic ? (
          <a class="hc-link" href={href.topic(topic.id)}>
            Practise {topic.short} <Icon name="arrowRight" size={14} />
          </a>
        ) : null}
        <a class="hc-link quiet" href={href.report()}>View full report</a>
      </p>
    </section>
  );
}

export function PlaygroundCard() {
  return (
    <section class="hc hc-dark" aria-labelledby="hc-play">
      <h2 class="hc-title sm" id="hc-play">Playground</h2>
      <p class="hc-code mono" aria-hidden="true">
        <span class="hc-prompt">&gt;&gt;&gt; </span><span class="tok-b">print</span>(<span class="tok-s">"hello, Perth"</span>)
      </p>
      <p class="hc-text">Free coding with real Python 3.14, running in your browser.</p>
      <a class="btn lg block hc-dark-btn" href={href.playground()}>Open playground</a>
    </section>
  );
}

export function BackupCard({ lastExportTs }: { lastExportTs: number | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const run = async () => {
    setState('busy');
    try {
      const name = await downloadExport();
      setState('done');
      setMsg(`Saved ${name}.`);
    } catch (e) {
      setState('error');
      setMsg(`Export failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  return (
    <section class="hc card" aria-labelledby="hc-backup">
      <h2 class="hc-title sm" id="hc-backup">Back up your progress</h2>
      <p class="hc-text">
        Progress lives only in this browser. {lastExportTs ? `Last backup ${relativeDay(lastExportTs)}.` : 'No backup yet.'}
      </p>
      <p class="hc-links">
        <button type="button" class="btn sm" onClick={run} disabled={state === 'busy'}>
          <Icon name="download" size={14} />
          {state === 'busy' ? 'Exporting...' : 'Export now'}
        </button>
        <a class="hc-link quiet" href={href.settings()}>Backup settings</a>
      </p>
      <p class={`hc-small${state === 'error' ? ' is-bad' : ''}`} aria-live="polite">{msg}</p>
    </section>
  );
}
