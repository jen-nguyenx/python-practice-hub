// Sessions: accuracy sparkline, then a table of sessions that expand into a timeline.
import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { FORMAT_LABEL } from '../../content/ids.ts';
import { QUESTION_BY_ID } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import type { ReportData } from '../../engine/report.ts';
import { sessionTimeline } from '../../engine/report.ts';
import type { AppEvent } from '../../engine/types.ts';
import { href } from '../../app/router.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatDateTime, formatDuration, formatMinutes, formatTime, pct, toPercent } from './format.ts';
import { Sparkline } from './Sparkline.tsx';

const SHOW_FIRST = 8;

export function AccuracyTrend({ trend }: { trend: ReportData['trend'] }) {
  const points = useMemo(
    () => trend
      .filter((t) => toPercent(t.accuracy) !== null)
      .slice()
      .sort((a, b) => a.start - b.start)
      .map((t) => ({ ts: t.start, pct: toPercent(t.accuracy) as number })),
    [trend],
  );
  return <Sparkline points={points} title="Accuracy per session" />;
}

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

  if (sorted.length === 0) return <p class="muted">No sessions in this range.</p>;

  return (
    <>
      <div class="rp-table-wrap">
        <table class="rp-table rp-sessions">
          <caption class="sr-only">Practice sessions, newest first</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col" class="n">Duration</th>
              <th scope="col" class="n">Questions</th>
              <th scope="col" class="n">Accuracy</th>
              <th scope="col">New mistakes</th>
              <th scope="col"><span class="sr-only">Timeline</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => {
              const isOpen = open.has(s.sessionId);
              const id = `rp-s-${s.sessionId}`;
              const labels = s.newMistakes.map((m) => MISTAKES[m]?.label ?? 'Another mistake');
              return (
                <Fragment key={s.sessionId}>
                  <tr>
                    <th scope="row" class="rp-nowrap num">{formatDateTime(s.start)}</th>
                    <td class="n num">{formatMinutes(s.durationMin)}</td>
                    <td class="n num">{s.questions}</td>
                    <td class="n num">{pct(s.accuracy)}</td>
                    <td class="rp-newm">
                      {labels.length === 0 ? <span class="faint">None</span> : (
                        <>{labels.slice(0, 2).join(', ')}{labels.length > 2 ? <span class="faint"> and {labels.length - 2} more</span> : null}</>
                      )}
                    </td>
                    <td class="rp-nowrap">
                      <button type="button" class="btn sm ghost" aria-expanded={isOpen} aria-controls={id} onClick={() => toggle(s.sessionId)}>
                        <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={13} /> Timeline
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
        <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show recent sessions only' : `Show all ${sorted.length} sessions`}
        </Button>
      ) : null}
    </>
  );
}

function Timeline({ events, sessionId, allMistakes }: { events: readonly AppEvent[]; sessionId: string; allMistakes: string[] }) {
  const rows = useMemo(() => {
    try { return sessionTimeline(events, sessionId); } catch { return []; }
  }, [events, sessionId]);
  if (rows.length === 0) return <p class="muted rp-detail">No checked answers recorded in this session.</p>;
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
              <span class="rp-tl-time faint num">{formatTime(r.ts)}</span>
              <span class={`rp-tl-result ${result.cls}`}><Icon name={result.icon} size={13} /> {result.text}</span>
              <a class="rp-tl-q" href={href.question(r.qid)}>{meta?.title ?? 'Question'}</a>
              <span class="rp-tl-meta faint">
                {FORMAT_LABEL[r.format]} · {r.hintTier > 0 ? `Hint ${r.hintTier} of 3` : 'no hints'} · <span class="num">{formatDuration(r.timeMs)}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {allMistakes.length > 2 ? <p class="faint">New mistakes this session: {allMistakes.join(', ')}.</p> : null}
    </div>
  );
}
