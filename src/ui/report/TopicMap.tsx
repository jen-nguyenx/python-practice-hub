// Topic map: one row per topic, heat-coloured cells that always print their number.
import { Fragment } from 'preact';
import { useState } from 'preact/hooks';
import type { Diff } from '../../content/ids.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { HEAT_LEGEND, heatStep, pct, relativeDay } from './format.ts';

type TopicRow = ReportData['topics'][number];

const LABEL_TEXT: Record<TopicRow['label'], string> = { strong: 'Strong', weak: 'Weak', ok: 'OK', 'not-started': 'Not started' };
const LABEL_ICON = { strong: 'check', weak: 'alert', ok: 'layers', 'not-started': 'info' } as const;

export function HeatLegend() {
  return (
    <ul class="rp-legend" aria-label="Colour key">
      {HEAT_LEGEND.map((l) => (
        <li key={l.step}><span class={`rp-swatch heat h-${l.step}`} aria-hidden="true" />{l.text}</li>
      ))}
    </ul>
  );
}

function DiffCell({ cell, diff }: { cell: { attempted: number; correct: number }; diff: Diff }) {
  if (!cell || cell.attempted === 0) {
    return <td class="heat h-0 n" aria-label={`${diff}: not tried`}>–</td>;
  }
  const ratio = cell.correct / cell.attempted;
  return (
    <td class={`heat h-${heatStep(ratio)} n num`} aria-label={`${diff}: ${cell.correct} of ${cell.attempted} correct`}>
      {cell.correct}/{cell.attempted}
    </td>
  );
}

export function TopicMap({ rows, now, single }: { rows: ReportData['topics']; now: number; single: boolean }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(single ? rows.map((r) => r.topicId) : []));
  const toggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };

  return (
    <>
      <div class="rp-table-wrap">
        <table class="rp-table rp-topicmap">
          <caption class="sr-only">Topic map: score, results by difficulty, hint use and last practice for each topic</caption>
          <thead>
            <tr>
              <th scope="col">Topic</th>
              <th scope="col" class="n">Score</th>
              <th scope="col" class="n">Easy</th>
              <th scope="col" class="n">Medium</th>
              <th scope="col" class="n">Hard</th>
              <th scope="col" class="n" title="Share of questions where you needed hint 2 or 3, or the answer">Hints</th>
              <th scope="col">Last practised</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = TOPIC_BY_ID[r.topicId];
              const isOpen = open.has(r.topicId);
              const detailId = `rp-topic-${r.topicId}`;
              const idle = r.label === 'not-started';
              return (
                <Fragment key={r.topicId}>
                  <tr class={idle ? 'idle' : ''}>
                    <th scope="row">
                      <a href={href.topic(r.topicId)} class="rp-topic-link"><span class="rp-topic-num">{meta?.num}</span>{meta?.short ?? r.topicId}</a>
                      <span class="rp-topic-sub faint num">{r.attempted} of {r.total} tried</span>
                    </th>
                    <td class={`heat h-${heatStep(r.score)} n num rp-score`}>{pct(r.score)}</td>
                    <DiffCell cell={r.byDiff.easy} diff="easy" />
                    <DiffCell cell={r.byDiff.medium} diff="medium" />
                    <DiffCell cell={r.byDiff.hard} diff="hard" />
                    <td class="n num muted">{pct(r.hintReliance)}</td>
                    <td class="muted rp-nowrap">{relativeDay(r.lastTs, now)}</td>
                    <td>
                      <button type="button" class={`rp-status ${r.label}`} aria-expanded={isOpen} aria-controls={detailId} onClick={() => toggle(r.topicId)}>
                        <Icon name={LABEL_ICON[r.label]} size={13} />
                        <span>{LABEL_TEXT[r.label]}</span>
                        <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={12} class="rp-status-chev" />
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
                          ) : <p class="muted">{idle ? 'No questions tried in this topic yet.' : 'Nothing stands out yet in this topic.'}</p>}
                          <p class="rp-detail-links">
                            <a href={href.topic(r.topicId)}>{idle ? 'Start' : 'Practise'} {meta?.short}</a>
                            {!single ? <a href={href.report(r.topicId)}>Topic report</a> : null}
                            <a href={href.topicTest(r.topicId)}>Topic test</a>
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
      <div class="rp-table-foot">
        <HeatLegend />
        <p class="faint">Score is the average of your best result on each question you tried; answers that used hints count a little less. Hints is the share of those questions where you needed hint 2 or 3, or the answer.</p>
      </div>
    </>
  );
}
