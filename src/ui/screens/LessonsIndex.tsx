// Lesson library (#/lessons): every lesson, grouped into its track. Markets is shown only when switched on.
//
// Foundations assumes nothing at all, Core follows the unit, and Going further goes past it. A topic's
// lesson also shows how far the reader has got with that topic's questions, so the library doubles as a
// map of where they are.
import { useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { lessonsInTrack } from '../../content/lessons/index.ts';
import type { LessonMeta } from '../../content/lessons/index.ts';
import { TRACK_BLURB, TRACK_LABEL } from '../../content/lessonSchema.ts';
import { visibleTracks } from '../../content/lessons/index.ts';
import { ProgressBar } from '../components/ProgressBar.tsx';
import type { Track } from '../../content/lessonSchema.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { InlineMd } from '../components/Markdown.tsx';
import { lessonsRead, safeTopicProgress } from '../shell/progressData.ts';
import { Icon } from '../components/Icon.tsx';
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
      <p class="lx-card-sum"><InlineMd text={lesson.summary} /></p>
      <p class="lx-card-meta num">
        <span>{lesson.minutes} min</span>
        <span>{lesson.sections} steps</span>
        {topic ? <span>Topic {topic.num}</span> : null}
        {topic && total > 0 ? <span>{solved}/{total} solved</span> : null}
      </p>
    </a>
  );
}

/** Matched against the title, the summary and the outcomes, so a search can be about what it teaches. */
function matches(l: LessonMeta, q: string): boolean {
  if (!q) return true;
  const hay = `${l.title} ${l.summary} ${l.outcomes.join(' ')} ${(l.sectionTitles ?? []).join(' ')}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function TrackSection({ track, read, progress, query }: {
  track: Track;
  read: Set<string>;
  progress: ReturnType<typeof safeTopicProgress> | null;
  query: string;
}) {
  const all = lessonsInTrack(track);
  const lessons = all.filter((l) => matches(l, query));
  if (query && lessons.length === 0) return null;
  if (lessons.length === 0) {
    return (
      <section class="lx-track" aria-labelledby={`lx-${track}`}>
        <h2 class="lx-track-title" id={`lx-${track}`}>{TRACK_LABEL[track]}</h2>
        <p class="lx-track-blurb">{TRACK_BLURB[track]}</p>
        <div class="tp-empty">These lessons are being written.</div>
      </section>
    );
  }
  const readCount = lessons.filter((l) => read.has(l.id)).length;
  return (
    <section class="lx-track" aria-labelledby={`lx-${track}`}>
      <div class="lx-track-head">
        <h2 class="lx-track-title" id={`lx-${track}`}>{TRACK_LABEL[track]}</h2>
        <p class="lx-track-count num">{query ? `${lessons.length} of ${all.length}` : `${lessons.length} lessons`}{readCount > 0 ? ` · ${readCount} read` : ''}</p>
      </div>
      <p class="lx-track-blurb">{TRACK_BLURB[track]}</p>
      <div class="lx-grid">
        {lessons.map((l) => {
          const p = l.topicId && progress ? progress[l.topicId as keyof typeof progress] : undefined;
          return (
            <Card
              key={l.id}
              lesson={l}
              done={read.has(l.id)}
              solved={p?.solved ?? 0}
              total={p?.total ?? 0}
            />
          );
        })}
      </div>
    </section>
  );
}

/**
 * The next lesson to read, in reading order across all three tracks. A library of 35 cards answers
 * "what is there"; a beginner also needs an answer to "what now", and picking for themselves is exactly
 * the decision they are least equipped to make.
 */
function nextUnread(read: Set<string>): LessonMeta | null {
  for (const t of visibleTracks(store.settings.value)) {
    for (const l of lessonsInTrack(t)) if (!read.has(l.id)) return l;
  }
  return null;
}

function UpNext({ read }: { read: Set<string> }) {
  const all = visibleTracks(store.settings.value).flatMap((t) => lessonsInTrack(t));
  const total = all.length;
  const next = nextUnread(read);
  // Count only lessons that still exist: a renamed or removed one would push this past the total.
  const done = all.filter((l) => read.has(l.id)).length;
  if (!next) {
    return (
      <section class="lx-next is-done">
        <p class="lx-next-tag">All read</p>
        <h2 class="lx-next-t">You have been through every lesson.</h2>
        <p class="lx-next-p">Reading them again is worth less than practising, so go and answer some questions.</p>
        <p><a class="btn" href={href.landing()}>Go to the topics</a></p>
      </section>
    );
  }
  return (
    <section class="lx-next">
      <p class="lx-next-tag">{done === 0 ? 'Start here' : 'Up next'}</p>
      <h2 class="lx-next-t">{next.title}</h2>
      <p class="lx-next-p">{next.summary}. About {next.minutes} minutes.</p>
      <div class="lx-next-row">
        <a class="btn primary" href={href.lesson(next.id)}>
          {done === 0 ? 'Start reading' : 'Continue'}<Icon name="arrowRight" size={16} />
        </a>
        {done > 0 ? (
          <div class="lx-next-bar">
            <span class="lx-next-n num">{done} of {total} read</span>
            <ProgressBar value={done} max={total} label="Lessons read" thin />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function LessonsIndex() {
  const ready = storeReady.value;
  const tracks = visibleTracks(store.settings.value);
  const events = store.events.value;
  const settings = store.settings.value;

  const read = useMemo(() => lessonsRead(events), [events]);
  const [query, setQuery] = useState('');
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
      <UpNext read={read} />
      <div class="lx-search">
        <Icon name="search" size={15} />
        <input
          type="search"
          class="lx-search-in"
          placeholder="Search lessons by what they teach"
          aria-label="Search lessons"
          value={query}
          onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
        />
      </div>
      {tracks.map((t) => <TrackSection key={t} track={t} read={read} progress={progress} query={query} />)}
      {query && tracks.every((t) => lessonsInTrack(t).every((l) => !matches(l, query)))
        ? <p class="lx-none">Nothing matches “{query}”. Try a word that would appear in what you want to learn, like “slice” or “rounding”.</p>
        : null}
    </div>
  );
}
