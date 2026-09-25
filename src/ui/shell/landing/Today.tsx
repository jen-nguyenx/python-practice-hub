// "Today": one short session, composed.
//
// The app had three different answers to "what now" — Continue on this page, Up next in the library, and
// the review queue — and a student with twenty minutes had to choose between them. Choosing is the thing
// a beginner is worst at, so this picks: something to read, something to write, something to revisit.
import { href } from '../../../app/router.ts';
import { QUESTION_INDEX } from '../../../content/loadIndex.ts';
import { LESSON_INDEX } from '../../../content/lessons/index.ts';
import type { LessonMeta } from '../../../content/lessons/index.ts';
import { TRACKS } from '../../../content/lessonSchema.ts';
import { MISTAKES } from '../../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../../content/topics.ts';
import type { ReviewItem } from '../../../engine/review.ts';
import type { Streak } from '../../../engine/streak.ts';
import { Icon } from '../../components/Icon.tsx';
import type { IconName } from '../../components/Icon.tsx';
import { plural } from '../format.ts';

export interface TodayStep {
  key: string;
  icon: IconName;
  kind: string;
  title: string;
  detail: string;
  href: string;
  done?: boolean;
}

const TRACK_ORDER = new Map(
  TRACKS.flatMap((t, ti) => LESSON_INDEX.filter((l) => l.track === t).map((l) => [l.id, ti] as const)),
);

/** Reading order across the tracks, matching the library. */
function orderedLessons(): LessonMeta[] {
  return LESSON_INDEX.filter((l) => l.track !== 'markets').slice().sort((a, b) => {
    const ta = TRACK_ORDER.get(a.id) ?? 9;
    const tb = TRACK_ORDER.get(b.id) ?? 9;
    if (ta !== tb) return ta - tb;
    return (a.order ?? 99) - (b.order ?? 99);
  });
}

export interface TodayInput {
  read: Set<string>;
  queue: readonly ReviewItem[];
  /** Question id to continue with, if the student is mid-topic. */
  nextQid?: string;
  nextQTitle?: string;
  nextQTopic?: string;
}

/**
 * Three things, at most one of each kind. Anything with nothing behind it is left out rather than
 * padded: an invented task is worse than a short list.
 */
export function planToday(input: TodayInput): TodayStep[] {
  const out: TodayStep[] = [];

  const lesson = orderedLessons().find((l) => !input.read.has(l.id));
  if (lesson) {
    out.push({
      key: 'read',
      icon: 'book',
      kind: 'Read',
      title: lesson.title,
      detail: `${lesson.minutes} minutes · ${lesson.summary}`,
      href: href.lesson(lesson.id),
    });
  }

  if (input.nextQid) {
    out.push({
      key: 'practise',
      icon: 'file',
      kind: 'Practise',
      title: input.nextQTitle ?? 'Your next question',
      detail: input.nextQTopic ? `In ${input.nextQTopic}` : 'Pick up where you left off',
      href: href.question(input.nextQid),
    });
  }

  // Only something genuinely due: an item from today is in the queue but scores zero on purpose.
  const due = input.queue.find((i) => i.score > 0);
  if (due) {
    const def = MISTAKES[due.mistake];
    const topic = due.topicId ? TOPIC_BY_ID[due.topicId] : undefined;
    out.push({
      key: 'review',
      icon: 'refresh',
      kind: 'Revisit',
      title: def?.label ?? 'A mistake worth another look',
      detail: `${plural(due.count, 'time')}${topic ? ` · ${topic.short}` : ''}`,
      // Review, not the one question that catches it: the session is built from exactly this evidence
      // and asks several short things, which is what "revisit" should cost.
      href: href.review(),
    });
  }

  return out;
}

export function TodayPlan({ steps, streak: s }: { steps: readonly TodayStep[]; streak: Streak }) {
  if (steps.length === 0) return null;
  const minutes = steps.length * 7;
  return (
    <section class="td" aria-labelledby="td-h">
      <div class="td-head">
        <div>
          <p class="td-tag">Today</p>
          <h2 class="td-h" id="td-h">
            {steps.length === 1 ? 'One thing to do' : `${steps.length} things, about ${minutes} minutes`}
          </h2>
        </div>
        {s.days > 0 ? (
          <p class={`td-streak num${s.todayDone ? ' is-done' : ''}`} title={s.todayDone ? 'Done today' : 'Not done yet today'}>
            <Icon name={s.todayDone ? 'check' : 'clock'} size={14} />
            {plural(s.days, 'day')} in a row
          </p>
        ) : null}
      </div>
      <ol class="td-list">
        {steps.map((st) => (
          <li key={st.key}>
            <a class="td-item" href={st.href}>
              <span class="td-icon" aria-hidden="true"><Icon name={st.icon} size={16} /></span>
              <span class="td-text">
                <span class="td-kind">{st.kind}</span>
                <span class="td-title">{st.title}</span>
                <span class="td-detail">{st.detail}</span>
              </span>
              <span class="td-go" aria-hidden="true"><Icon name="arrowRight" size={16} /></span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Exported for the landing page to find the next question without duplicating the index scan. */
export function questionTitle(qid: string): { title: string; topic: string } | null {
  const q = QUESTION_INDEX.find((x) => x.qid === qid);
  if (!q) return null;
  return { title: q.title, topic: TOPIC_BY_ID[q.topicId]?.short ?? '' };
}
