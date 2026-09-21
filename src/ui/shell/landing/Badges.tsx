// What you have finished, said out loud.
//
// Progress used to be legible only as percentages and a faded tile, which is a poor reward for the thing
// a beginner most needs to feel: that the last hour turned into something. These are the moments worth
// marking, and the next one is always in view so there is something to be close to.
import { QUESTION_INDEX } from '../../../content/loadIndex.ts';
import { badges, nextBadge } from '../../../engine/achievements.ts';
import type { TopicProgress } from '../../../engine/progress.ts';
import type { AppEvent } from '../../../engine/types.ts';
import { Icon } from '../../components/Icon.tsx';

export function Badges({ events, progress }: {
  events: readonly AppEvent[];
  progress: Readonly<Record<string, TopicProgress>>;
}) {
  const all = badges({ events, index: QUESTION_INDEX, progress });
  const earned = all.filter((b) => b.earned);
  const next = nextBadge(all);
  // Nothing earned and nothing started: an empty trophy case is a worse start than no trophy case.
  if (earned.length === 0 && (!next || next.have === 0)) return null;

  return (
    <section class="bdg" aria-labelledby="bdg-h">
      <div class="bdg-head">
        <h2 class="bdg-h" id="bdg-h">Finished</h2>
        <span class="bdg-count num">{earned.length} of {all.length}</span>
      </div>
      <ul class="bdg-list">
        {earned.map((b) => (
          <li key={b.id} class="bdg-item is-earned" title={b.blurb}>
            <span class="bdg-mark" aria-hidden="true"><Icon name="check" size={12} /></span>
            <span class="bdg-name">{b.title}</span>
          </li>
        ))}
        {next ? (
          <li class="bdg-item is-next" title={next.blurb}>
            <span class="bdg-mark bdg-mark-open" aria-hidden="true" />
            <span class="bdg-name">{next.title}</span>
            <span class="bdg-prog num">{next.have}/{next.need}</span>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
