// The report page body. Every number comes from ReportData.
import type { ComponentChildren } from 'preact';
import type { TopicId } from '../../content/ids.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { Icon } from '../components/Icon.tsx';
import { heatStep, formatMinutes, pct } from './format.ts';
import { MistakeProfile } from './MistakeProfile.tsx';
import { PatternCards } from './Patterns.tsx';
import { Readiness } from './Readiness.tsx';
import { AccuracyTrend, SessionsTable } from './Sessions.tsx';
import { HeatLegend, TopicMap } from './TopicMap.tsx';
import { behaviourNotes, ladderGaps } from './words.ts';

function Section({ id, title, lead, children, class: cls }: { id: string; title: string; lead?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={`rp-section${cls ? ' ' + cls : ''}`} aria-labelledby={id}>
      <header class="rp-sec-head">
        <h2 id={id}>{title}</h2>
        {lead ? <p class="muted">{lead}</p> : null}
      </header>
      {children}
    </section>
  );
}

export function Headline({ data }: { data: ReportData }) {
  const { strengths, workOn } = data.headline;
  return (
    <section class="card rp-open" aria-label="Summary">
      <div class="rp-open-col">
        <h2 class="rp-open-h"><Icon name="check" /> Strengths</h2>
        {strengths.length ? (
          <ul class="rp-open-list">{strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        ) : <p class="muted">Strengths show up once a topic has a few correct answers.</p>}
      </div>
      <div class="rp-open-col">
        <h2 class="rp-open-h"><Icon name="target" /> Work on next</h2>
        {workOn.length ? (
          <ol class="rp-open-list rp-work">
            {workOn.map((w, i) => (
              <li key={i}><a href={w.href}>{w.text}</a><Icon name="arrowRight" size={14} class="rp-work-arrow" /></li>
            ))}
          </ol>
        ) : <p class="muted">Nothing urgent. Keep going with the next unsolved question.</p>}
      </div>
    </section>
  );
}

export function Totals({ data }: { data: ReportData }) {
  const t = data.totals;
  const tiles: { label: string; value: string; sub?: string }[] = [
    { label: 'Questions', value: String(t.questions), sub: t.attempts !== t.questions ? `${t.attempts} checks` : undefined },
    { label: 'Sessions', value: String(t.sessions) },
    { label: 'Focused time', value: formatMinutes(t.focusedMinutes) },
    { label: 'Accuracy', value: pct(t.accuracy) },
    { label: 'Right first try', value: pct(t.firstTryRate) },
  ];
  const extras: string[] = [];
  if (t.hintRate !== null) extras.push(`Hints used on ${pct(t.hintRate)} of questions`);
  if (t.revealRate !== null) extras.push(`answer shown on ${pct(t.revealRate)}`);
  return (
    <section class="rp-totals-wrap" aria-label="Totals">
      <dl class="rp-totals">
        {tiles.map((tile) => (
          <div key={tile.label} class="rp-total">
            <dt class="label">{tile.label}</dt>
            <dd class="num">{tile.value}{tile.sub ? <span class="rp-total-sub faint">{tile.sub}</span> : null}</dd>
          </div>
        ))}
      </dl>
      {extras.length ? <p class="faint rp-totals-note">{extras.join(' · ')}.</p> : null}
    </section>
  );
}

function LadderMatrix({ rows }: { rows: ReportData['ladder'] }) {
  const shown = rows.filter((r) => r.read !== null || r.repair !== null || r.write !== null);
  const gaps = ladderGaps(shown);
  if (shown.length === 0) return <p class="muted">Nothing to compare yet in this range.</p>;
  const cell = (v: number | null, what: string) => (
    <td class={`heat h-${heatStep(v)} n num`} aria-label={v === null ? `${what}: not tried` : `${what}: ${pct(v)}`}>{pct(v)}</td>
  );
  return (
    <div class="rp-ladder">
      <div class="rp-table-wrap rp-ladder-table">
        <table class="rp-table">
          <caption class="sr-only">Accuracy on reading, repairing and writing questions per topic</caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col" class="n" title="Multiple choice, predict the output, trace tables, spot the difference, error translator">Read</th>
              <th scope="col" class="n" title="Fill in the blank, Parsons puzzles, fix the bug">Repair</th>
              <th scope="col" class="n" title="Write code, refactor, break the code">Write</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.topicId}>
                <th scope="row"><span class="rp-topic-num">{TOPIC_BY_ID[r.topicId]?.num}</span>{TOPIC_BY_ID[r.topicId]?.short ?? r.topicId}</th>
                {cell(r.read, 'Read')}
                {cell(r.repair, 'Repair')}
                {cell(r.write, 'Write')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="rp-gaps">
        <h3 class="label">What stands out</h3>
        {gaps.length ? (
          <ul class="rp-gap-list">{gaps.map((g) => <li key={g.topicId}>{g.text}</li>)}</ul>
        ) : <p class="muted">No big gaps between reading, repairing and writing code in any topic.</p>}
        <p class="faint">Read: choose, predict and trace. Repair: fill in, order and fix. Write: code from scratch.</p>
      </div>
    </div>
  );
}

function Behaviour({ data }: { data: ReportData['behaviour'] }) {
  const notes = behaviourNotes(data);
  if (notes.length === 0) return null;
  return (
    <Section id="rp-habits" title="Study habits" lead="Small changes that tend to help.">
      <ul class="rp-notes">
        {notes.map((n) => <li key={n.key}><Icon name="bulb" size={15} /> <span>{n.text}</span></li>)}
      </ul>
    </Section>
  );
}

export function ReportBody({ data, events, topicId, now }: { data: ReportData; events: readonly AppEvent[]; topicId?: TopicId; now: number }) {
  return (
    <>
      <Headline data={data} />
      <Totals data={data} />

      <Section id="rp-topics" title={topicId ? 'Topic summary' : 'Topic map'}
        lead={topicId ? undefined : 'Every topic at a glance. Open a status to see why it is marked that way.'}>
        <TopicMap rows={data.topics} now={now} single={!!topicId} />
      </Section>

      <Section id="rp-ladder" title="Read, repair, write" lead="How you do when reading code, fixing or completing it, and writing it yourself.">
        <LadderMatrix rows={data.ladder} />
      </Section>

      <Section id="rp-mistakes" title="Mistake profile" lead="What tripped you up, grouped by kind. Longer bars happened more often.">
        <MistakeProfile rows={data.mistakes} now={now} fallbackTopic={topicId} />
      </Section>

      <Section id="rp-ready" title="CITS1401 readiness" lead={topicId ? 'Exam and project checks for this topic.' : 'Exam and project checks.'}>
        <Readiness data={data.readiness} topicId={topicId} />
      </Section>

      <Section id="rp-sessions" title="Sessions">
        <div class="rp-trend card">
          <h3 class="label">Accuracy per session</h3>
          <AccuracyTrend trend={data.trend} />
        </div>
        <SessionsTable sessions={data.sessions} events={events} />
      </Section>

      <Section id="rp-patterns" title="Patterns to use" lead="Habits that make code clearer and prevent the mistakes above.">
        <PatternCards rows={data.patterns} />
      </Section>

      <Behaviour data={data.behaviour} />
    </>
  );
}

export { HeatLegend };
