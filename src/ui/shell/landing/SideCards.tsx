// Right column of the landing page: this session, recent mistakes, backup reminder and the difficulty legend.
import { useState } from 'preact/hooks';
import { href } from '../../../app/router.ts';
import { MISTAKES } from '../../../content/mistakes.ts';
import type { MistakeId } from '../../../content/ids.ts';
import { TOPIC_BY_ID } from '../../../content/topics.ts';
import type { SessionSummary } from '../../../engine/progress.ts';
import { DIFF_LEGEND } from '../../components/Chip.tsx';
import { Icon } from '../../components/Icon.tsx';
import { downloadExport } from '../backup.ts';
import { plural, relativeDay } from '../format.ts';
import type { RecentMistake } from '../progressData.ts';

export function SessionCard({ summary }: { summary: SessionSummary | null }) {
  const has = !!summary && summary.questions > 0;
  const mistakeLabels = (summary?.newMistakes ?? [])
    .map((id) => MISTAKES[id as MistakeId]?.label)
    .filter((l): l is string => !!l);
  return (
    <section class="panel-card side-card" aria-labelledby="side-session">
      <div class="panel-card-head"><h2 class="label" id="side-session">This session</h2></div>
      <div class="panel-card-body">
        {has && summary ? (
          <>
            <dl class="kpis">
              <div class="kpi"><dt>Questions</dt><dd class="mono">{summary.questions}</dd></div>
              <div class="kpi"><dt>Minutes</dt><dd class="mono">{Math.round(summary.focusedMin)}</dd></div>
              <div class="kpi"><dt>New mistakes</dt><dd class="mono">{summary.newMistakes.length}</dd></div>
            </dl>
            <p class="side-note num">
              {summary.correct} of {summary.questions} correct
              {summary.topics.length ? ` · ${summary.topics.map((t) => TOPIC_BY_ID[t]?.short ?? t).join(', ')}` : ''}
            </p>
            {mistakeLabels.length ? (
              <ul class="side-list">
                {mistakeLabels.slice(0, 3).map((l) => <li key={l}>{l}</li>)}
              </ul>
            ) : null}
          </>
        ) : (
          <p class="side-empty">Nothing yet. After your first question, your count, time spent and any new mistakes show here.</p>
        )}
      </div>
    </section>
  );
}

export function MistakesCard({ mistakes }: { mistakes: RecentMistake[] }) {
  const top = mistakes.slice(0, 3);
  return (
    <section class="panel-card side-card" aria-labelledby="side-mistakes">
      <div class="panel-card-head">
        <h2 class="label" id="side-mistakes">Recent mistakes</h2>
        <span class="spacer" />
        <span class="side-meta">Last 14 days</span>
      </div>
      <div class="panel-card-body">
        {top.length ? (
          <ol class="mistake-list">
            {top.map((m) => {
              const topic = m.topicId ? TOPIC_BY_ID[m.topicId] : undefined;
              return (
                <li key={m.id} class="mistake-row">
                  <div class="mistake-main">
                    <span class="mistake-label">{m.label}</span>
                    <span class="mistake-meta num">
                      {plural(m.count, 'time')} · last {relativeDay(m.lastTs)}
                    </span>
                  </div>
                  {topic ? (
                    <a class="mistake-link" href={href.topic(topic.id)}>
                      <span class="sr-only">Practise in </span>{topic.short}
                      <Icon name="chevronRight" size={14} />
                    </a>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : (
          <p class="side-empty">No mistakes logged in the last 14 days. When a check spots a common slip, like printing instead of returning, it shows here with a link to practise it.</p>
        )}
      </div>
    </section>
  );
}

export function BackupReminder({ lastExportTs }: { lastExportTs: number | null }) {
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
    <section class="panel-card side-card backup-card" aria-labelledby="side-backup">
      <div class="panel-card-head">
        <Icon name="download" size={14} />
        <h2 class="label" id="side-backup">Back up your progress</h2>
      </div>
      <div class="panel-card-body">
        <p class="side-text">
          Progress lives only in this browser. {lastExportTs ? `Your last backup was ${relativeDay(lastExportTs)}.` : "You haven't made a backup yet."}
        </p>
        <div class="row side-actions">
          <button type="button" class="btn sm" onClick={run} disabled={state === 'busy'}>
            <Icon name="download" size={14} />
            {state === 'busy' ? 'Exporting...' : 'Export now'}
          </button>
          <a class="link-quiet side-small" href={href.settings()}>Backup settings</a>
        </div>
        <p class={`side-small${state === 'error' ? ' is-bad' : ''}`} aria-live="polite">{msg}</p>
      </div>
    </section>
  );
}

export function LegendCard() {
  return (
    <section class="panel-card side-card" aria-labelledby="side-legend">
      <div class="panel-card-head"><h2 class="label" id="side-legend">Difficulty</h2></div>
      <div class="panel-card-body">
        <dl class="legend">
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <div key={d} class="legend-row">
              <dt><span class={`chip ${d}`}>{d[0].toUpperCase() + d.slice(1)}</span></dt>
              <dd>{DIFF_LEGEND[d]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
