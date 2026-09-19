// Lesson library (#/lessons): every lesson, grouped into the three tracks.
//
// Foundations assumes nothing at all, Core follows the unit, and Going further goes past it. A topic's
// lesson also shows how far the reader has got with that topic's questions, so the library doubles as a
// map of where they are.
import { useMemo } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { lessonsInTrack } from '../../content/lessons/index.ts';
import type { LessonMeta } from '../../content/lessons/index.ts';
import { TRACK_BLURB, TRACK_LABEL, TRACKS } from '../../content/lessonSchema.ts';
import type { Track } from '../../content/lessonSchema.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { Icon } from '../components/Icon.tsx';
import { lessonsDone, safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import '../lesson/lesson.css';

function Card({ lesson, done, solved, total }: { lesson: LessonMeta; done: boolean; solved: number; total: number }) {
  const topic = lesson.topicId ? TOPIC_BY_ID[lesson.topicId] : undefined;
  return (
    <a class={`lx-card${done ? ' is-done' : ''}`} href={href.lesson(lesson.id)}>
      <div class="lx-card-head">
        <h3 class="lx-card-title">{lesson.title}</h3>
        {done ? <span class="lx-done" title="You have read this"><Icon name="check" size={13} /></span> : null}
      </div>
      <p class="lx-card-sum">{lesson.summary}</p>
      <p class="lx-card-meta num">
        <span>{lesson.minutes} min</span>
        <span>{lesson.sections} steps</span>
        {topic ? <span>Topic {topic.num}</span> : null}
        {topic && total > 0 ? <span>{solved}/{total} solved</span> : null}
      </p>
    </a>
  );
}

function TrackSection({ track, done, progress }: {
  track: Track;
  done: Set<string>;
  progress: ReturnType<typeof safeTopicProgress> | null;
}) {
  const lessons = lessonsInTrack(track);
  if (lessons.length === 0) {
    return (
      <section class="lx-track" aria-labelledby={`lx-${track}`}>
        <h2 class="lx-track-title" id={`lx-${track}`}>{TRACK_LABEL[track]}</h2>
        <p class="lx-track-blurb">{TRACK_BLURB[track]}</p>
        <div class="tp-empty">These lessons are being written.</div>
      </section>
    );
  }
  const readCount = lessons.filter((l) => l.topicId && done.has(l.topicId)).length;
  return (
    <section class="lx-track" aria-labelledby={`lx-${track}`}>
      <div class="lx-track-head">
        <h2 class="lx-track-title" id={`lx-${track}`}>{TRACK_LABEL[track]}</h2>
        <p class="lx-track-count num">{lessons.length} lessons{readCount > 0 ? ` · ${readCount} read` : ''}</p>
      </div>
      <p class="lx-track-blurb">{TRACK_BLURB[track]}</p>
      <div class="lx-grid">
        {lessons.map((l) => {
          const p = l.topicId && progress ? progress[l.topicId as keyof typeof progress] : undefined;
          return (
            <Card
              key={l.id}
              lesson={l}
              done={!!l.topicId && done.has(l.topicId)}
              solved={p?.solved ?? 0}
              total={p?.total ?? 0}
            />
          );
        })}
      </div>
    </section>
  );
}

export function LessonsIndex() {
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const done = useMemo(() => lessonsDone(events), [events]);
  const progress = useMemo(() => (ready ? safeTopicProgress(events, settings) : null), [ready, events, settings]);

  return (
    <div class="lx">
      <header class="lx-head">
        <h1 class="lx-title">Lessons</h1>
        <p class="lx-lede">
          Explanations, worked examples and programs you can change, in the order that makes them make sense.
          Everything Python prints here was produced by running the code, not typed by hand.
        </p>
      </header>
      {TRACKS.map((t) => <TrackSection key={t} track={t} done={done} progress={progress} />)}
    </div>
  );
}
