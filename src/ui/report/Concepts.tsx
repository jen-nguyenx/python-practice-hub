// Concepts: what you are actually good at, underneath the topic percentages.
//
// A topic is a chapter; a concept is a skill, and the two do not line up. Slicing turns up in three
// topics, so a student can sit at 80% in each and still be the person who gets slicing wrong every time.
// This reads the concept tags every question already carries and says which skills are holding.
import { useMemo } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { conceptLabel } from '../../content/conceptWords.ts';
import type { TopicId } from '../../content/ids.ts';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { conceptStats, ENOUGH } from '../../engine/concepts.ts';
import type { ConceptStat } from '../../engine/concepts.ts';
import type { AppEvent } from '../../engine/types.ts';
import { Icon } from '../components/Icon.tsx';

/** Above this a concept is holding up; below it, it is worth another go. */
const SOLID = 0.8;
/** Enough to see the shape of things without turning the report into a wall of bars. */
const SHOW = 8;

function Row({ s, practise }: { s: ConceptStat; practise?: string }) {
  const p = Math.round((s.accuracy ?? 0) * 100);
  return (
    <li class="rp-cq">
      <span class="rp-cq-name">{conceptLabel(s.concept)}</span>
      <span class="rp-cq-bar rp-mbar" aria-hidden="true">
        <span class="rp-mbar-fill" style={{ width: `${p}%` }} />
      </span>
      <span class="rp-cq-num num">
        {s.solved} of {s.attempted}
        <span class="sr-only"> questions solved, {p} per cent</span>
      </span>
      {practise ? (
        <a class="rp-cq-go" href={practise}>
          Practise<span class="sr-only"> {conceptLabel(s.concept)}</span>
          <Icon name="arrowRight" size={13} />
        </a>
      ) : <span class="rp-cq-go" />}
    </li>
  );
}

export function Concepts({ events, index, unlocked }: {
  events: readonly AppEvent[];
  index: readonly QuestionMeta[];
  /** Topics the student can reach. Practise links stay inside them; the counts do not change. */
  unlocked?: readonly TopicId[];
}) {
  const { shaky, solid, tried } = useMemo(() => {
    const stats = conceptStats(events, index);
    const judged = stats.filter((s) => s.accuracy !== null);
    return {
      shaky: judged.filter((s) => (s.accuracy ?? 0) < SOLID).slice(0, SHOW),
      solid: judged.filter((s) => (s.accuracy ?? 0) >= SOLID),
      tried: stats.length,
    };
  }, [events, index]);

  // A weak concept is only useful if there is somewhere to go about it, so each one points at a question
  // carrying it that has not been solved yet.
  const nextFor = useMemo(() => {
    const solved = new Set<string>();
    for (const e of events) if (e.type === 'attempt' && e.correct && !e.revealed) solved.add(e.qid);
    const open = unlocked ? new Set<TopicId>(unlocked) : null;
    const out = new Map<string, string>();
    for (const q of index) {
      if (solved.has(q.qid) || (open && !open.has(q.topicId))) continue;
      for (const c of q.concepts) if (!out.has(c)) out.set(c, q.qid);
    }
    return out;
  }, [events, index, unlocked]);

  if (tried === 0) {
    return (
      <div class="rp-card rp-pad">
        <p class="rp-quiet">
          Every question carries the skills it leans on. Answer a few and this becomes a list of which
          ones are holding and which need another go.
        </p>
      </div>
    );
  }

  return (
    <div class="rp-cgrid">
      <section class="rp-card rp-list-card" aria-labelledby="rp-c-shaky">
        <h3 id="rp-c-shaky" class="rp-card-title">Worth another go</h3>
        {shaky.length ? (
          <ul class="rp-cq-list">
            {shaky.map((s) => <Row key={s.concept} s={s} practise={nextFor.get(s.concept) ? href.question(nextFor.get(s.concept) as string) : undefined} />)}
          </ul>
        ) : (
          <p class="rp-quiet">
            Nothing is dragging. A skill lands here once you have tried it {ENOUGH} times and got fewer
            than {Math.round(SOLID * 100)}% of those right.
          </p>
        )}
      </section>

      <section class="rp-card rp-list-card" aria-labelledby="rp-c-solid">
        <h3 id="rp-c-solid" class="rp-card-title">Holding up</h3>
        {solid.length ? (
          <>
            <ul class="rp-cchips">
              {solid.slice(0, 18).map((s) => (
                <li key={s.concept} class="rp-cchip" title={`${s.solved} of ${s.attempted} solved`}>{conceptLabel(s.concept)}</li>
              ))}
            </ul>
            {solid.length > 18 ? <p class="rp-card-note">and {solid.length - 18} more.</p> : null}
          </>
        ) : (
          <p class="rp-quiet">A skill lands here once you have solved {Math.round(SOLID * 100)}% or more of the questions you tried it on.</p>
        )}
      </section>
    </div>
  );
}
