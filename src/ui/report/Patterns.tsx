// Pattern cards: Recommended first as open cards; Already using and Later collapsed underneath.
import type { PatternId } from '../../content/ids.ts';
import type { PatternCard } from '../../content/patterns.ts';
import { PATTERNS } from '../../content/patterns.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { BadGood } from './MistakeProfile.tsx';

type PatternRow = ReportData['patterns'][number];

function Card({ card, row }: { card: PatternCard; row: PatternRow }) {
  const topic = TOPIC_BY_ID[card.topicId];
  const note = row.status === 'recommended' && row.triggerCount > 0
    ? `Related mistakes came up ${row.triggerCount === 1 ? 'once' : `${row.triggerCount} times`}`
    : row.status === 'using' ? 'You already write this'
    : row.status === 'later' && topic ? `Comes up in ${topic.short}` : null;
  return (
    <article class="rp-card rp-pcard" aria-labelledby={`rp-p-${card.id}`}>
      <header class="rp-pcard-head">
        <h3 id={`rp-p-${card.id}`} class="rp-card-title">{card.title}</h3>
        {note ? <span class="rp-pcard-note">{note}</span> : null}
      </header>
      <div class="rp-pcard-why"><Markdown text={card.why} /></div>
      <details class="rp-pex">
        <summary><Icon name="chevronRight" size={13} class="rp-collapse-chev" /> See an example<span class="sr-only">: {card.title}</span></summary>
        <div class="rp-pex-body">
          <BadGood bad={card.bad} good={card.good} />
          {card.reference ? <p class="rp-pref"><Icon name="book" size={13} /> {card.reference}</p> : null}
        </div>
      </details>
    </article>
  );
}

function Collapsed({ title, items }: { title: string; items: { row: PatternRow; card: PatternCard }[] }) {
  return (
    <details class="rp-collapse">
      <summary>
        <Icon name="chevronRight" size={14} class="rp-collapse-chev" />
        <span class="rp-collapse-title">{title}</span>
        <span class="rp-collapse-count">{items.length}</span>
      </summary>
      <div class="rp-pgrid rp-collapse-body">{items.map((x) => <Card key={x.card.id} card={x.card} row={x.row} />)}</div>
    </details>
  );
}

export function PatternCards({ rows }: { rows: ReportData['patterns'] }) {
  const byId = new Map<PatternId, PatternCard>(PATTERNS.map((p) => [p.id, p]));
  const resolved = rows.map((row) => ({ row, card: byId.get(row.id) })).filter((x): x is { row: PatternRow; card: PatternCard } => !!x.card);
  const recommended = resolved.filter((x) => x.row.status === 'recommended').sort((a, b) => b.row.triggerCount - a.row.triggerCount);
  const using = resolved.filter((x) => x.row.status === 'using');
  const later = resolved.filter((x) => x.row.status === 'later');

  if (resolved.length === 0) return <div class="rp-card rp-pad"><p class="rp-quiet">Pattern cards appear here as you practise.</p></div>;

  return (
    <div class="rp-pgroups">
      {recommended.length ? (
        <div class="rp-pgrid">{recommended.map((x) => <Card key={x.card.id} card={x.card} row={x.row} />)}</div>
      ) : <div class="rp-card rp-pad"><p class="rp-quiet">No patterns flagged for you right now.</p></div>}
      {using.length ? <Collapsed title="Already using" items={using} /> : null}
      {later.length ? <Collapsed title="Later, for topics ahead" items={later} /> : null}
    </div>
  );
}
