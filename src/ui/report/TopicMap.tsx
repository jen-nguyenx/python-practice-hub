// Topics card: one row per practised topic with grey heat cells that always print their number.
// A status pill opens the row to show why it is marked that way, read / repair / write accuracy and links.
// Topics not started yet sit behind one "Show" row so the table stays short.
import { Fragment } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Diff, TopicId } from '../../content/ids.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { lockCopy } from '../testmode/lock.ts';
import { HEAT_LEGEND, heatStep, pct, relativeDay } from './format.ts';
import { ladderGaps } from './words.ts';

type TopicRow = ReportData['topics'][number];
type LadderRow = ReportData['ladder'][number];

const LABEL_TEXT: Record<TopicRow['label'], string> = { strong: 'Strong', weak: 'Weak', ok: 'OK', 'not-started': 'Not started' };
const DIFF_TEXT: Record<Diff, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export function HeatLegend() {
  return (
    <ul class="rp-legend" aria-label="Colour key">
      {HEAT_LEGEND.map((l) => (
        <li key={l.step}><span class={`rp-swatch heat h-${l.step}`} aria-hidden="true" />{l.text}</li>
      ))}
    </ul>
  );
}

function Heat({ value, text, label, cls }: { value: number | null; text: string; label: string; cls?: string }) {
  const step = heatStep(value);
  return <td class={`n${cls ? ' ' + cls : ''}`}><span class={`rp-heat heat h-${step}`} aria-label={label}>{text}</span></td>;
}

function DiffCell({ cell, diff }: { cell: { attempted: number; correct: number } | undefined; diff: Diff }) {
  if (!cell || cell.attempted === 0) return <Heat value={null} text="–" label={`${DIFF_TEXT[diff]}: not tried`} cls="rp-col-diff" />;
  return <Heat value={cell.correct / cell.attempted} text={`${cell.correct}/${cell.attempted}`} label={`${DIFF_TEXT[diff]}: ${cell.correct} of ${cell.attempted} correct`} cls="rp-col-diff" />;
}

function Rungs({ row }: { row: LadderRow | undefined }) {
  if (!row || (row.read === null && row.repair === null && row.write === null)) return null;
  const gap = ladderGaps([row])[0];
  const items = [
    { key: 'read', label: 'Read', hint: 'Choose, predict and trace', v: row.read },
    { key: 'repair', label: 'Repair', hint: 'Fill in, order and fix', v: row.repair },
    { key: 'write', label: 'Write', hint: 'Code from scratch', v: row.write },
  ];
  return (
    <div class="rp-rungs">
      <ul class="rp-rung-list" aria-label="Accuracy by kind of question">
        {items.map((it) => (
          <li key={it.key} title={it.hint}>
            <span class="rp-rung-label">{it.label}</span>
            <span class={`rp-heat heat h-${heatStep(it.v)}`}>{pct(it.v)}</span>
          </li>
        ))}
      </ul>
      {gap ? <p class="rp-rung-gap">{gap.text}</p> : null}
    </div>
  );
}

export function TopicMap({ rows, ladder = [], now, single }: { rows: ReportData['topics']; ladder?: ReportData['ladder']; now: number; single: boolean }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(single ? rows.map((r) => r.topicId) : []));
  const [showIdle, setShowIdle] = useState(false);
  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };
  const events = store.events.value;
  const settings = store.settings.value;
  // Topics that are not open yet still appear here; their rows say so instead of offering practice they cannot do.
  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(events, QUESTION_INDEX, settings); } catch { return {}; }
  }, [events, settings]);
  const ladderBy = new Map(ladder.map((l) => [l.topicId, l]));
  const active = rows.filter((r) => r.label !== 'not-started');
  const idle = rows.filter((r) => r.label === 'not-started');
  const shown = single || showIdle || active.length === 0 ? rows : active;

  return (
    <div class="rp-card rp-flush">
      <div class="rp-table-wrap">
        <table class="rp-table rp-topics">
          <caption class="sr-only">Topics: score, results by difficulty, hint use and last practice for each topic</caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col" class="n">Score</th>
              <th scope="col" class="n rp-col-diff">Easy</th>
              <th scope="col" class="n rp-col-diff">Medium</th>
              <th scope="col" class="n rp-col-diff">Hard</th>
              <th scope="col" class="n rp-col-hints" title="Share of questions where you needed hint 2 or 3, or the answer">Hints</th>
              <th scope="col" class="rp-col-last">Last practised</th>
              <th scope="col" class="rp-col-status"><span class="sr-only">Status</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const meta = TOPIC_BY_ID[r.topicId];
              const isOpen = open.has(r.topicId);
              const detailId = `rp-topic-${r.topicId}`;
              const notStarted = r.label === 'not-started';
              const locked = progress[r.topicId]?.state === 'locked';
              return (
                <Fragment key={r.topicId}>
                  <tr class={`${notStarted ? 'idle' : ''}${isOpen ? ' is-open' : ''}`}>
                    <th scope="row">
                      <a href={href.topic(r.topicId)} class="rp-topic-link">
                        <span class="rp-topic-num">{meta?.num}</span>{meta?.short ?? r.topicId}
                        {locked ? <Icon name="lock" size={12} class="rp-lock-ic" /> : null}
                      </a>
                      <span class="rp-topic-sub">{r.attempted} of {r.total} tried{locked ? ' · not open yet' : ''}</span>
                    </th>
                    <Heat value={r.score} text={pct(r.score)} label={r.score === null ? 'Score: not tried' : `Score ${pct(r.score)}`} />
                    <DiffCell cell={r.byDiff.easy} diff="easy" />
                    <DiffCell cell={r.byDiff.medium} diff="medium" />
                    <DiffCell cell={r.byDiff.hard} diff="hard" />
                    <td class="n rp-mono rp-col-hints">{pct(r.hintReliance)}</td>
                    <td class="rp-nowrap rp-col-last rp-muted">{relativeDay(r.lastTs, now)}</td>
                    <td class="rp-col-status">
                      <button type="button" class={`rp-pill ${r.label}`} aria-expanded={isOpen} aria-controls={isOpen ? detailId : undefined} onClick={() => toggle(r.topicId)}>
                        <span>{LABEL_TEXT[r.label]}</span>
                        <Icon name="chevronDown" size={12} class="rp-chev" />
                        <span class="sr-only">{isOpen ? ', hide reasons' : ', show reasons'}</span>
                      </button>
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr class="rp-detail-row" id={detailId}>
                      <td colSpan={8}>
                        <div class="rp-detail">
                          {r.reasons.length ? (
                            <ul class="rp-reasons">{r.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul>
                          ) : <p class="rp-muted">{notStarted ? 'No questions tried in this topic yet.' : 'Nothing stands out yet in this topic.'}</p>}
                          {!notStarted ? (
                            <p class="rp-diff-line">
                              {(['easy', 'medium', 'hard'] as const).map((d) => {
                                const c = r.byDiff[d];
                                return <span key={d}>{DIFF_TEXT[d]} {c && c.attempted ? `${c.correct}/${c.attempted}` : '–'}</span>;
                              })}
                            </p>
                          ) : null}
                          <Rungs row={ladderBy.get(r.topicId)} />
                          {locked ? (
                            <p class="rp-note-line">
                              <Icon name="lock" size={14} />
                              <span>Not open on your ladder yet. {lockCopy(progress, r.topicId).sentence}</span>
                            </p>
                          ) : null}
                          <p class="rp-links">
                            <a href={href.topic(r.topicId)}>
                              {locked ? `Notes for ${meta?.short ?? 'this topic'}` : `${notStarted ? 'Start' : 'Practise'} ${meta?.short ?? 'this topic'}`}
                            </a>
                            {!single ? <a href={href.report(r.topicId)}>Topic report</a> : null}
                            {!locked ? <a href={href.topicTest(r.topicId)}>Topic test</a> : null}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div class="rp-card-foot">
        {!single && idle.length > 0 && active.length > 0 ? (
          <button type="button" class="rp-more-btn rp-no-print" aria-expanded={showIdle} onClick={() => setShowIdle(!showIdle)}>
            <Icon name="chevronDown" size={13} class="rp-chev" />
            {showIdle ? 'Hide topics not started' : `Show ${idle.length} topics not started`}
          </button>
        ) : <span />}
        <HeatLegend />
      </div>
    </div>
  );
}
