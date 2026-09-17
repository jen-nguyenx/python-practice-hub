// Sessions card: a compact table of sessions, newest first, each opening into a timeline of checked answers.
import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { FORMAT_LABEL } from '../../content/ids.ts';
import { QUESTION_BY_ID } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import type { ReportData } from '../../engine/report.ts';
import { sessionTimeline } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { formatDateTime, formatDuration, formatMinutes, formatTime, pct } from './format.ts';

const SHOW_FIRST = 6;

export function SessionsTable({ sessions, events }: { sessions: ReportData['sessions']; events: readonly AppEvent[] }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => sessions.slice().sort((a, b) => b.start - a.start), [sessions]);
  const shown = showAll ? sorted : sorted.slice(0, SHOW_FIRST);
  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };

  if (sorted.length === 0) return <div class="rp-card rp-pad"><p class="rp-quiet">No sessions in this range.</p></div>;

  return (
    <div class="rp-card rp-flush">
      <div class="rp-table-wrap">
        <table class="rp-table rp-sessions">
          <caption class="sr-only">Practice sessions, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col" class="n rp-col-time">Time</th>
              <th scope="col" class="n"><span class="rp-wide">Questions</span><span class="rp-narrow" aria-hidden="true">Qs</span></th>
              <th scope="col" class="n">Accuracy</th>
              <th scope="col" class="rp-col-new">New mistakes</th>
              <th scope="col" class="rp-col-status"><span class="sr-only">Timeline</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const isOpen = open.has(s.sessionId);
              const id = `rp-s-${s.sessionId}`;
              const labels = s.newMistakes.map((m) => MISTAKES[m]?.label ?? 'Another mistake');
              return (
                <Fragment key={s.sessionId}>
                  <tr class={isOpen ? 'is-open' : ''}>
                    <th scope="row" class="rp-nowrap rp-date">{formatDateTime(s.start)}</th>
                    <td class="n rp-mono rp-nowrap rp-col-time">{formatMinutes(s.durationMin)}</td>
                    <td class="n rp-mono">{s.questions}</td>
                    <td class="n rp-mono">{pct(s.accuracy)}</td>
                    <td class="rp-col-new rp-newm">
                      {labels.length === 0 ? <span class="rp-faint">None</span> : (
                        <>{labels[0]}{labels.length > 1 ? <span class="rp-faint"> +{labels.length - 1} more</span> : null}</>
                      )}
                    </td>
                    <td class="rp-col-status">
                      <button type="button" class="rp-icon-toggle" aria-expanded={isOpen} aria-controls={isOpen ? id : undefined} onClick={() => toggle(s.sessionId)}>
                        <span class="rp-toggle-text">Timeline</span>
                        <Icon name="chevronDown" size={13} class="rp-chev" />
                        <span class="sr-only">: {formatDateTime(s.start)}</span>
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr class="rp-detail-row" id={id}>
                      <td colSpan={6}><Timeline events={events} sessionId={s.sessionId} allMistakes={labels} /></td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {sorted.length > SHOW_FIRST ? (
        <div class="rp-card-foot">
          <button type="button" class="rp-more-btn rp-no-print" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
            <Icon name="chevronDown" size={13} class="rp-chev" />
            {showAll ? 'Show recent sessions only' : `Show all ${sorted.length} sessions`}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Timeline({ events, sessionId, allMistakes }: { events: readonly AppEvent[]; sessionId: string; allMistakes: string[] }) {
  const rows = useMemo(() => {
    try { return sessionTimeline(events, sessionId); } catch { return []; }
  }, [events, sessionId]);
  if (rows.length === 0) return <p class="rp-muted rp-detail">No checked answers recorded in this session.</p>;
  return (
    <div class="rp-detail">
      <ol class="rp-timeline">
        {rows.map((r, i) => {
          const meta = QUESTION_BY_ID.get(r.qid);
          const result = r.revealed ? { icon: 'eye', text: 'Answer shown', cls: 'shown' } as const
            : r.correct ? { icon: 'check', text: 'Correct', cls: 'ok' } as const
            : { icon: 'x', text: 'Not yet', cls: 'bad' } as const;
          return (
            <li key={`${r.ts}-${i}`} class="rp-tl-row">
              <span class="rp-tl-time">{formatTime(r.ts)}</span>
              <span class={`rp-tl-result ${result.cls}`}><Icon name={result.icon} size={13} /> {result.text}</span>
              <a class="rp-tl-q" href={href.question(r.qid)}>{meta?.title ?? 'Question'}</a>
              <span class="rp-tl-meta">
                {FORMAT_LABEL[r.format]} · {r.hintTier > 0 ? `hint ${r.hintTier} of 3` : 'no hints'} · {formatDuration(r.timeMs)}
              </span>
            </li>
          );
        })}
      </ol>
      {allMistakes.length > 1 ? <p class="rp-faint">New mistakes this session: {allMistakes.join(', ')}.</p> : null}
    </div>
  );
}
