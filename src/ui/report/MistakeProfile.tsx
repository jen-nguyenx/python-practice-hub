// Mistakes card: one row per mistake with a horizontal bar and a count. A row opens to the meaning, the usual fix,
// bad / good code and a practice link.
import { useState } from 'preact/hooks';
import type { MistakeId, TopicId } from '../../content/ids.ts';
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
import { CATEGORY_LABEL, CATEGORY_ORDER, fixTimeText } from './words.ts';

const SHOW_FIRST = 6;

export function exampleTopic(qid: string | null): TopicId | null {
  if (!qid) return null;
  return QUESTION_BY_ID.get(qid)?.topicId ?? topicIdOfQuestion(qid) ?? null;
}

export function MistakeProfile({ rows, now, fallbackTopic }: { rows: ReportData['mistakes']; now: number; fallbackTopic?: TopicId }) {
  const [open, setOpen] = useState<Set<MistakeId>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const toggle = (id: MistakeId) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id); else next.add(id);
    setOpen(next);
  };

  if (rows.length === 0) {
    return <div class="rp-card rp-pad"><p class="rp-quiet">No mistakes recorded in this range. They show up here when a check spots one.</p></div>;
  }

  const catRank = (id: MistakeId) => CATEGORY_ORDER.indexOf(MISTAKES[id]?.category ?? 'conceptual');
  const sorted = rows.slice().sort((a, b) => b.count - a.count || b.lastTs - a.lastTs || catRank(a.id) - catRank(b.id));
  const max = Math.max(1, ...sorted.map((r) => r.count));
  const shown = showAll ? sorted : sorted.slice(0, SHOW_FIRST);

  return (
    <div class="rp-card rp-flush">
      <ul class="rp-mlist">
        {shown.map((m) => {
          const def = MISTAKES[m.id];
          const label = def?.label ?? 'Another mistake';
          const isOpen = open.has(m.id);
          const topic = exampleTopic(m.exampleQid) ?? fallbackTopic ?? null;
          const fix = fixTimeText(m.medianFixMs);
          const panelId = `rp-m-${m.id}`;
          const cat = def?.category ?? 'conceptual';
          return (
            <li key={m.id} class={`rp-mrow${isOpen ? ' is-open' : ''}`}>
              <button type="button" class="rp-mbtn" aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined} onClick={() => toggle(m.id)}>
                <span class="rp-mtext">
                  <span class="rp-mname">{label}</span>
                  <span class="rp-mmeta">
                    {CATEGORY_LABEL[cat]} · {m.sessions > 1 ? `${m.sessions} sessions` : '1 session'} · last seen {relativeDay(m.lastTs, now)}
                  </span>
                </span>
                <span class="rp-mbar" aria-hidden="true"><span class="rp-mbar-fill" style={{ width: `${Math.max(4, (m.count / max) * 100)}%` }} /></span>
                <span class="rp-mcount">{m.count}<span class="sr-only"> {m.count === 1 ? 'time' : 'times'}</span></span>
                <Icon name="chevronDown" size={14} class="rp-chev" />
              </button>
              {isOpen ? (
                <div class="rp-mexplain" id={panelId}>
                  {def?.explain ? <Markdown text={def.explain} /> : <p class="rp-muted">An explanation for this mistake is not written yet.</p>}
                  {def?.fix ? <div class="rp-fix"><span class="rp-mini-label">Usual fix</span><Markdown text={def.fix} /></div> : null}
                  {def?.example.bad || def?.example.good ? <BadGood bad={def.example.bad} good={def.example.good} /> : null}
                  <p class="rp-links">
                    {topic ? <a href={href.topic(topic)}>Practise in {TOPIC_BY_ID[topic]?.short}<span class="sr-only">: {label}</span></a> : null}
                    <span class="rp-faint">
                      {plural(m.questions, 'question')}
                      {m.recent14d > 0 && m.recent14d !== m.count ? ` · ${m.recent14d} in the last 14 days` : ''}
                      {fix ? ` · ${fix}` : ''}
                    </span>
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {sorted.length > SHOW_FIRST ? (
        <div class="rp-card-foot">
          <button type="button" class="rp-more-btn rp-no-print" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>
            <Icon name="chevronDown" size={13} class="rp-chev" />
            {showAll ? 'Show fewer' : `Show all ${sorted.length} mistakes`}
          </button>
        </div>
      ) : null}
    </div>
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
