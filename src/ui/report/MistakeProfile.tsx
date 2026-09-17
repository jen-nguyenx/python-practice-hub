// Mistake profile: grouped by kind, horizontal bars, repeats, fix time, practice links and explanations.
import { useState } from 'preact/hooks';
import type { MistakeCategory, MistakeId, TopicId } from '../../content/ids.ts';
import { topicIdOfQuestion } from '../../content/index.ts';
import { QUESTION_BY_ID } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import { href } from '../../app/router.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { plural, relativeDay } from './format.ts';
import { CATEGORY_BLURB, CATEGORY_LABEL, CATEGORY_ORDER, fixTimeText } from './words.ts';

type MistakeRow = ReportData['mistakes'][number];

export function exampleTopic(qid: string | null): TopicId | null {
  if (!qid) return null;
  return QUESTION_BY_ID.get(qid)?.topicId ?? topicIdOfQuestion(qid) ?? null;
}

export function MistakeProfile({ rows, now, fallbackTopic }: { rows: ReportData['mistakes']; now: number; fallbackTopic?: TopicId }) {
  const [open, setOpen] = useState<Set<MistakeId>>(() => new Set());
  const toggle = (id: MistakeId) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };
  const max = Math.max(1, ...rows.map((r) => r.count));
  const groups = CATEGORY_ORDER
    .map((cat) => ({ cat, items: rows.filter((r) => (MISTAKES[r.id]?.category ?? 'conceptual') === cat).sort((a, b) => b.count - a.count || b.lastTs - a.lastTs) }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return <p class="muted">No mistakes recorded in this range. Mistakes show up here when a check spots one.</p>;
  }

  return (
    <div class="rp-mgroups">
      {groups.map((g) => (
        <MistakeGroup key={g.cat} cat={g.cat} items={g.items} max={max} now={now} open={open} toggle={toggle} fallbackTopic={fallbackTopic} />
      ))}
    </div>
  );
}

function MistakeGroup({ cat, items, max, now, open, toggle, fallbackTopic }: {
  cat: MistakeCategory; items: MistakeRow[]; max: number; now: number; open: Set<MistakeId>; toggle: (id: MistakeId) => void; fallbackTopic?: TopicId;
}) {
  const total = items.reduce((s, m) => s + m.count, 0);
  const headingId = `rp-mg-${cat}`;
  return (
    <section class={`rp-mgroup ${cat}`} aria-labelledby={headingId}>
      <header class="rp-mgroup-head">
        <h3 id={headingId}>{CATEGORY_LABEL[cat]}</h3>
        <span class="faint num">{plural(total, 'time')}</span>
        <p class="muted">{CATEGORY_BLURB[cat]}</p>
      </header>
      <ul class="rp-mlist">
        {items.map((m) => {
          const def = MISTAKES[m.id];
          const label = def?.label ?? 'Another mistake';
          const isOpen = open.has(m.id);
          const topic = exampleTopic(m.exampleQid) ?? fallbackTopic ?? null;
          const fix = fixTimeText(m.medianFixMs);
          const panelId = `rp-m-${m.id}`;
          return (
            <li key={m.id} class="rp-mrow">
              <div class="rp-mrow-top">
                <span class="rp-mname">{label}</span>
                <span class="rp-mbar" aria-hidden="true"><span class="rp-mbar-fill" style={{ width: `${Math.max(3, (m.count / max) * 100)}%` }} /></span>
                <span class="rp-mcount num">{m.count}<span class="sr-only"> times</span><span aria-hidden="true">×</span></span>
              </div>
              <p class="rp-mmeta muted num">
                <span>{m.sessions > 1 ? `repeated in ${m.sessions} sessions` : 'in 1 session'}</span>
                <span>{plural(m.questions, 'question')}</span>
                {m.recent14d > 0 && m.recent14d !== m.count ? <span>{m.recent14d} in the last 14 days</span> : null}
                {fix ? <span>{fix}</span> : null}
                <span>last seen {relativeDay(m.lastTs, now)}</span>
              </p>
              <div class="rp-mactions">
                {topic ? (
                  <a class="btn sm" href={href.topic(topic)}>Practise this<span class="sr-only">: {label}</span> <span class="muted">in {TOPIC_BY_ID[topic]?.short}</span></a>
                ) : null}
                <button type="button" class="btn sm ghost" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(m.id)}>
                  <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={13} /> What it means<span class="sr-only">: {label}</span>
                </button>
              </div>
              {isOpen ? (
                <div class="rp-mexplain" id={panelId}>
                  {def?.explain ? <Markdown text={def.explain} /> : <p class="muted">An explanation for this mistake is not written yet.</p>}
                  {def?.fix ? <div class="rp-fix"><span class="label">Usual fix</span><Markdown text={def.fix} /></div> : null}
                  {def?.example.bad || def?.example.good ? <BadGood bad={def.example.bad} good={def.example.good} /> : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function BadGood({ bad, good, badLabel = 'Instead of', goodLabel = 'Write' }: { bad: string; good: string; badLabel?: string; goodLabel?: string }) {
  return (
    <div class="rp-badgood">
      {bad ? (
        <div class="rp-bg bad">
          <span class="rp-bg-label"><Icon name="x" size={13} /> {badLabel}</span>
          <CodeBlock code={bad} label={badLabel} />
        </div>
      ) : null}
      {good ? (
        <div class="rp-bg good">
          <span class="rp-bg-label"><Icon name="check" size={13} /> {goodLabel}</span>
          <CodeBlock code={good} label={goodLabel} />
        </div>
      ) : null}
    </div>
  );
}
