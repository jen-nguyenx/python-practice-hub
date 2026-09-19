// Review (#/review): practise the mistakes you have actually made, rather than whatever comes next.
//
// Everything here comes from the event log: the app already records which misconception each wrong
// answer showed, so it can hand back a queue without asking the student to track anything.
import { useMemo } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { reviewQueue } from '../../engine/review.ts';
import type { ReviewItem } from '../../engine/review.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { plural } from '../shell/format.ts';
import { safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import './review.css';

const QUESTION_BY_ID = new Map(QUESTION_INDEX.map((q) => [q.qid, q]));

function when(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

function Card({ item }: { item: ReviewItem }) {
  const def = MISTAKES[item.mistake];
  const topic = item.topicId ? TOPIC_BY_ID[item.topicId] : undefined;
  const next = item.qids[0];
  const q = next ? QUESTION_BY_ID.get(next) : undefined;
  return (
    <article class={`rv-card${item.settled ? ' is-settled' : ''}`}>
      <div class="rv-head">
        <h2 class="rv-title">{def?.label ?? 'A mistake'}</h2>
        <p class="rv-meta num">
          <span>{plural(item.count, 'time')}</span>
          <span>last {when(item.daysSince)}</span>
          {topic ? <span>{topic.short}</span> : null}
        </p>
      </div>
      {def ? <Markdown text={def.explain} class="rv-md" /> : null}
      {def?.fix ? (
        <div class="rv-fix">
          <p class="rv-fix-t">The usual fix</p>
          <Markdown text={def.fix} class="rv-md" />
        </div>
      ) : null}
      <div class="rv-actions">
        {q ? (
          <a class="btn primary" href={href.question(q.qid)}>
            Practise this<Icon name="arrowRight" size={16} />
          </a>
        ) : null}
        <span class="rv-count num">{plural(item.qids.length, 'question')} can catch it</span>
      </div>
      {item.settled ? (
        <p class="rv-settled">
          You have solved every question that catches this since it last happened. It is here so it does not
          quietly come back.
        </p>
      ) : null}
    </article>
  );
}

export function Review() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const progress = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const unlocked = useMemo(
    () => Object.values(progress).filter((p) => p.state !== 'locked').map((p) => p.topicId),
    [progress],
  );
  const queue = useMemo(
    () => (ready ? reviewQueue(events, QUESTION_INDEX, { unlocked }) : []),
    [ready, events, unlocked],
  );

  // Something got wrong today is in the queue but not yet due; saying so is friendlier than hiding it.
  const due = queue.filter((i) => i.score > 0);
  const resting = queue.filter((i) => i.score === 0);

  if (!ready) {
    return (
      <div class="rv">
        <div class="rv-list" aria-busy="true"><Skeleton h={120} /><Skeleton h={120} /></div>
      </div>
    );
  }

  return (
    <div class="rv">
      <header class="rv-top">
        <h1 class="rv-h1">Review</h1>
        <p class="rv-lede">
          The mistakes you have actually made, worth another attempt. Ordered by how long it has been and
          how often each one has caught you, not by topic order.
        </p>
      </header>

      {queue.length === 0 ? (
        <div class="tp-empty">
          <p><strong>Nothing to review yet.</strong></p>
          <p>
            Once a wrong answer shows a misconception the app recognises, it turns up here a day or so later.
            Answer a few questions and come back.
          </p>
          <p><a href={href.landing()}>Go to the topics</a></p>
        </div>
      ) : (
        <>
          {due.length > 0 ? <div class="rv-list">{due.map((i) => <Card key={i.mistake} item={i} />)}</div> : null}
          {resting.length > 0 ? (
            <section class="rv-resting">
              <h2 class="rv-resting-h">Not yet</h2>
              <p class="rv-resting-p">
                {plural(resting.length, 'mistake')} from today. Practising something minutes after getting it
                wrong tests what you have just read rather than what you have learned, so these come back
                tomorrow.
              </p>
              <ul class="rv-resting-l">
                {resting.map((i) => <li key={i.mistake}>{MISTAKES[i.mistake]?.label ?? i.mistake}</li>)}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
