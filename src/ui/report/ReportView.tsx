// The report page body: stat cards, Strengths / Work on next, then Topics, Mistakes, Readiness, Sessions, Patterns.
// Every number comes from ReportData. The same components render the one-topic report (#/report/:topicId).
import type { ComponentChildren } from 'preact';
import type { TopicId } from '../../content/ids.ts';
import type { ReportData } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { Icon } from '../components/Icon.tsx';
import { formatMinutes, pct, toPercent } from './format.ts';
import { MistakeProfile } from './MistakeProfile.tsx';
import { PatternCards } from './Patterns.tsx';
import { Readiness } from './Readiness.tsx';
import { SessionsTable } from './Sessions.tsx';
import { TopicMap } from './TopicMap.tsx';
import { behaviourNotes } from './words.ts';

export function Section({ id, title, note, children }: { id: string; title: string; note?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="rp-sec" aria-labelledby={id}>
      <header class="rp-sec-head">
        <h2 id={id} class="rp-sec-title">{title}</h2>
        {note ? <span class="rp-sec-note">{note}</span> : null}
      </header>
      {children}
    </section>
  );
}

/** Tiny accuracy trend for the Accuracy stat card. Shapes only; the summary is in aria-label. */
function MiniTrend({ trend }: { trend: ReportData['trend'] }) {
  const pts = trend
    .map((t) => ({ start: t.start, p: toPercent(t.accuracy) }))
    .filter((t): t is { start: number; p: number } => t.p !== null)
    .sort((a, b) => a.start - b.start)
    .slice(-12);
  if (pts.length < 2) return null;
  const W = 72;
  const H = 24;
  const xy = pts.map((t, i) => [(i / (pts.length - 1)) * (W - 4) + 2, H - 2 - (t.p / 100) * (H - 4)] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  const label = `Accuracy over the last ${pts.length} sessions: first ${Math.round(pts[0].p)}%, last ${Math.round(pts[pts.length - 1].p)}%.`;
  return (
    <svg class="rp-mini" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <path d={d} />
      <circle cx={lx} cy={ly} r="2.5" />
    </svg>
  );
}

/** "2 h 3 min" -> big numbers with small unit words, so mono spacing does not stretch the figure. */
function splitUnits(value: string): ComponentChildren {
  if (!/[a-z]/i.test(value)) return value;
  return value.split(/\s+/).map((part, i) => (/^\d/.test(part) ? <span key={i}>{part}</span> : <span key={i} class="rp-stat-unit">{part}</span>));
}

export function Totals({ data }: { data: ReportData }) {
  const t = data.totals;
  const shown = t.revealRate ? Math.round(t.revealRate * t.questions) : 0;
  const qSub = [t.attempts !== t.questions ? `${t.attempts} checks` : '', shown ? `${shown} ${shown === 1 ? 'answer' : 'answers'} shown` : ''].filter(Boolean).join(' · ');
  const perSession = t.sessions > 0 ? Math.round(t.focusedMinutes / t.sessions) : 0;
  const tiles: { key: string; value: string; label: string; sub?: string; extra?: ComponentChildren }[] = [
    { key: 'q', value: String(t.questions), label: t.questions === 1 ? 'question' : 'questions', sub: qSub || undefined },
    { key: 'a', value: pct(t.accuracy), label: 'accuracy', sub: t.firstTryRate !== null ? `${pct(t.firstTryRate)} right first try` : undefined, extra: <MiniTrend trend={data.trend} /> },
    { key: 't', value: formatMinutes(t.focusedMinutes), label: 'focused time', sub: t.hintRate !== null ? `hints on ${pct(t.hintRate)} of questions` : undefined },
    { key: 's', value: String(t.sessions), label: t.sessions === 1 ? 'session' : 'sessions', sub: t.sessions > 1 && perSession > 0 ? `about ${formatMinutes(perSession)} each` : undefined },
  ];
  return (
    <ul class="rp-stats" aria-label="Totals">
      {tiles.map((tile) => (
        <li key={tile.key} class="rp-stat">
          <span class="rp-stat-top">
            <span class="rp-stat-num">{splitUnits(tile.value)}</span>
            {tile.extra}
          </span>
          <span class="rp-stat-label">{tile.label}</span>
          {tile.sub ? <span class="rp-stat-sub">{tile.sub}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function Headline({ data, topicId }: { data: ReportData; topicId?: TopicId }) {
  const { strengths, workOn } = data.headline;
  const notes = behaviourNotes(data.behaviour);
  return (
    <div class="rp-duo">
      <section class="rp-card rp-list-card" aria-labelledby="rp-strengths">
        <h2 id="rp-strengths" class="rp-card-title">Strengths</h2>
        {strengths.length ? (
          <ul class="rp-rows">
            {strengths.map((s, i) => (
              <li key={i} class="rp-row-item"><Icon name="check" size={15} class="rp-ok-icon" /><span>{s}</span></li>
            ))}
          </ul>
        ) : <p class="rp-quiet">Strengths show up once {topicId ? 'this topic has' : 'a topic has'} a few correct answers.</p>}
        {strengths.length ? <p class="rp-card-note">Keep these warm with one review question a week.</p> : null}
      </section>
      <section class="rp-card rp-list-card" aria-labelledby="rp-workon">
        <h2 id="rp-workon" class="rp-card-title">Work on next</h2>
        {workOn.length || notes.length ? (
          <ul class="rp-rows">
            {workOn.map((w, i) => (
              <li key={`w${i}`} class="rp-row-item">
                <Icon name="arrowRight" size={15} class="rp-link-icon" />
                <a href={w.href}>{w.text}</a>
              </li>
            ))}
            {notes.slice(0, workOn.length ? 1 : 2).map((n) => (
              <li key={n.key} class="rp-row-item rp-habit"><Icon name="bulb" size={15} class="rp-hint-icon" /><span>{n.text}</span></li>
            ))}
          </ul>
        ) : <p class="rp-quiet">Nothing urgent. Keep going with the next unsolved question.</p>}
      </section>
    </div>
  );
}

export function ReportBody({ data, events, topicId, now }: { data: ReportData; events: readonly AppEvent[]; topicId?: TopicId; now: number }) {
  const mistakeTotal = data.mistakes.reduce((s, m) => s + m.count, 0);
  const tried = data.topics.filter((t) => t.label !== 'not-started').length;
  return (
    <>
      <Totals data={data} />
      <Headline data={data} topicId={topicId} />

      <Section id="rp-topics" title={topicId ? 'Progress' : 'Topics'} note={topicId ? undefined : `${tried} of ${data.topics.length} practised`}>
        <TopicMap rows={data.topics} ladder={data.ladder} now={now} single={!!topicId} />
      </Section>

      <Section id="rp-mistakes" title="Mistakes" note={mistakeTotal ? `${mistakeTotal} in this range` : undefined}>
        <MistakeProfile rows={data.mistakes} now={now} fallbackTopic={topicId} />
      </Section>

      <Section id="rp-ready" title="Readiness" note={topicId ? 'Exam and project checks for this topic' : 'Exam and project checks'}>
        <Readiness data={data.readiness} topicId={topicId} />
      </Section>

      <Section id="rp-sessions" title="Sessions" note={data.sessions.length ? `${data.sessions.length} in this range` : undefined}>
        <SessionsTable sessions={data.sessions} events={events} />
      </Section>

      <Section id="rp-patterns" title="Patterns">
        <PatternCards rows={data.patterns} />
      </Section>
    </>
  );
}
