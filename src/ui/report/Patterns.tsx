// Pattern cards: Recommended first, then Already using, then Later (collapsed).
import type { PatternId } from '../../content/ids.ts';
import type { PatternCard } from '../../content/patterns.ts';
import { PATTERNS } from '../../content/patterns.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { ReportData } from '../../engine/report.ts';
import { Chip } from '../components/Chip.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { BadGood } from './MistakeProfile.tsx';

type PatternRow = ReportData['patterns'][number];

function Card({ card, row }: { card: PatternCard; row: PatternRow }) {
  const topic = TOPIC_BY_ID[card.topicId];
  return (
    <article class="card rp-pcard" aria-labelledby={`rp-p-${card.id}`}>
      <div class="rp-pcard-inner">
        <div class="rp-pcard-text">
          <header class="rp-pcard-head">
            <h4 id={`rp-p-${card.id}`}>{card.title}</h4>
            {row.status === 'recommended' ? <Chip tone="accent"><Icon name="target" size={11} /> Recommended</Chip>
              : row.status === 'using' ? <Chip tone="ok"><Icon name="check" size={11} /> Already using</Chip>
              : <Chip><Icon name="lock" size={11} /> Later</Chip>}
          </header>
          {row.status === 'recommended' && row.triggerCount > 0 ? (
            <p class="faint num">Related mistakes came up {row.triggerCount === 1 ? 'once' : `${row.triggerCount} times`} in your answers.</p>
          ) : null}
          {row.status === 'later' && topic ? <p class="faint">Comes up in {topic.title}.</p> : null}
          <Markdown text={card.why} />
          {card.reference ? <p class="rp-pref faint"><Icon name="book" size={12} /> {card.reference}</p> : null}
        </div>
        <BadGood bad={card.bad} good={card.good} />
      </div>
    </article>
  );
}

export function PatternCards({ rows }: { rows: ReportData['patterns'] }) {
  const byId = new Map<PatternId, PatternCard>(PATTERNS.map((p) => [p.id, p]));
  const resolved = rows.map((row) => ({ row, card: byId.get(row.id) })).filter((x): x is { row: PatternRow; card: PatternCard } => !!x.card);
  const recommended = resolved.filter((x) => x.row.status === 'recommended').sort((a, b) => b.row.triggerCount - a.row.triggerCount);
  const using = resolved.filter((x) => x.row.status === 'using');
  const later = resolved.filter((x) => x.row.status === 'later');

  if (resolved.length === 0) return <p class="muted">Pattern cards appear here as you practise.</p>;

  return (
    <div class="rp-pgroups">
      {recommended.length ? (
        <div class="rp-pgroup">
          <h3>Recommended for you <span class="faint num">{recommended.length}</span></h3>
          <div class="rp-pgrid">{recommended.map((x) => <Card key={x.card.id} card={x.card} row={x.row} />)}</div>
        </div>
      ) : <p class="muted">No patterns flagged for you right now.</p>}
      {using.length ? (
        <div class="rp-pgroup">
          <h3>Already using <span class="faint num">{using.length}</span></h3>
          <div class="rp-pgrid">{using.map((x) => <Card key={x.card.id} card={x.card} row={x.row} />)}</div>
        </div>
      ) : null}
      {later.length ? (
        <details class="rp-later">
          <summary><Icon name="chevronRight" size={14} class="rp-later-chev" /> Later: {later.length} patterns for topics you have not reached yet</summary>
          <div class="rp-pgrid">{later.map((x) => <Card key={x.card.id} card={x.card} row={x.row} />)}</div>
        </details>
      ) : null}
    </div>
  );
}
