// Lesson reader (#/lesson/:id): one authored lesson, a section at a time.
//
// Sections are the steps. Everything a reader sees that claims to be Python output was recorded by the
// verifier running that code, so this screen never decides what Python does.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import type { TopicId } from '../../content/ids.ts';
import { loadExperiments, loadTopic } from '../../content/index.ts';
import { LESSON_BY_ID, loadLesson, loadLessonOutputs } from '../../content/lessons/index.ts';
import type { GeneratedLesson, Lesson } from '../../content/lessonSchema.ts';
import { blockKey, TRACK_LABEL, TRACK_LANG } from '../../content/lessonSchema.ts';
import { CodeLang } from '../components/codeLang.ts';
import type { GeneratedExperiments, Topic } from '../../content/schema.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { Icon } from '../components/Icon.tsx';
import { InlineMd } from '../components/Markdown.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { Block } from '../lesson/LessonBlocks.tsx';
import type { BlockContext } from '../lesson/LessonBlocks.tsx';
import { clampStep, loadStep, saveStep } from '../lesson/steps.ts';
import { safeQuestionStats } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import '../lesson/lesson.css';
import '../shell/topic/topic.css';

function append(e: Parameters<typeof store.append>[0]) {
  try {
    store.append(e);
  } catch (err) {
    console.warn('Could not save event', err);
  }
}

function Outcomes({ lesson }: { lesson: Lesson }) {
  return (
    <div class="ls-outcomes">
      <p class="tp-label">By the end you can</p>
      <ul>
        {lesson.outcomes.map((o) => (
          <li key={o}><Icon name="check" size={14} /><span><InlineMd text={o} /></span></li>
        ))}
      </ul>
      {lesson.prereqs?.length ? (
        <p class="ls-prereq">
          Best after{' '}
          {lesson.prereqs.map((p, i) => (
            <span key={p}>
              {i > 0 ? ', ' : ''}
              <a href={href.lesson(p)}>{LESSON_BY_ID[p]?.title ?? p}</a>
            </span>
          ))}.
        </p>
      ) : null}
    </div>
  );
}

export function LessonReader({ lessonId }: { lessonId: string }) {
  const meta = LESSON_BY_ID[lessonId];
  const ready = storeReady.value;
  const events = store.events.value;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [outputs, setOutputs] = useState<GeneratedLesson>({});
  const [topic, setTopic] = useState<Topic | null>(null);
  const [experiments, setExperiments] = useState<GeneratedExperiments | null>(null);
  const [missing, setMissing] = useState(false);
  const [index, setIndex] = useState(() => loadStep(lessonId));

  useEffect(() => {
    let alive = true;
    setLesson(null);
    setMissing(false);
    setIndex(loadStep(lessonId));
    loadLesson(lessonId).then(
      (l) => {
        if (!alive) return;
        if (!l) { setMissing(true); return; }
        setLesson(l);
        if (l.topicId) {
          loadTopic(l.topicId).then((t) => { if (alive) setTopic(t); }, () => {});
          loadExperiments(l.topicId).then((g) => { if (alive) setExperiments(g); }, () => {});
        }
      },
      () => { if (alive) setMissing(true); },
    );
    loadLessonOutputs(lessonId).then((o) => { if (alive) setOutputs(o); }, () => {});
    return () => { alive = false; };
  }, [lessonId]);

  const sections = lesson?.sections ?? [];
  const at = clampStep(index, Math.max(1, sections.length));
  // The key handler is registered once per lesson, so it reads the position through a ref.
  const atRef = useRef(at);
  atRef.current = at;
  const section = sections[at];

  const stats = useMemo(() => safeQuestionStats(events), [events]);
  const questions = topic ? topic.scenarios.flatMap((s) => s.questions) : [];
  const firstUnsolved = questions.find((q) => !stats.get(q.id)?.solved);

  // Reaching the last section means the lesson was read through; that is what "done" records. Walking
  // back and forward would otherwise append a new event each time, so it is recorded once per visit.
  const recorded = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !lesson || sections.length === 0 || at !== sections.length - 1) return;
    if (recorded.current === lesson.id) return;
    recorded.current = lesson.id;
    append({
      type: 'lesson_done',
      lessonId: lesson.id,
      ...(lesson.topicId ? { topicId: lesson.topicId as TopicId } : {}),
    });
  }, [ready, lesson?.id, at, sections.length]);

  // Left and right move through the lesson, but only when the key would otherwise do nothing: a slider,
  // a textarea and a held drag item all use arrows themselves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (el?.closest('[role="button"][aria-grabbed="true"], .ib-order-item, .wi-slider')) return;
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = clampStep(atRef.current + delta, sections.length);
      if (next === atRef.current) return;
      e.preventDefault();
      setIndex(next);
      saveStep(lessonId, next);
      document.querySelector('.ls-body')?.scrollIntoView({ block: 'start', behavior: 'auto' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sections.length, lessonId]);

  if (missing || (!meta && !lesson)) {
    return (
      <div class="ls">
        <div class="tp-empty">
          <p><strong>That lesson does not exist.</strong></p>
          <p><a href={href.lessons()}>Back to the lesson library</a></p>
        </div>
      </div>
    );
  }

  const go = (next: number) => {
    const clamped = clampStep(next, sections.length);
    setIndex(clamped);
    saveStep(lessonId, clamped);
    document.querySelector('.ls-body')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  const title = lesson?.title ?? meta?.title ?? 'Lesson';
  const track = lesson?.track ?? meta?.track;
  const ctx: BlockContext = {
    slug: lessonId,
    back: { href: href.lesson(lessonId), label: title },
    topic,
    experiments,
    practiceHref: firstUnsolved ? href.question(firstUnsolved.id) : topic ? href.topic(topic.id) : null,
    practiceLabel: firstUnsolved ? 'Start practising' : 'See the questions',
  };

  return (
    <div class="ls">
      <header class="ls-head">
        <p class="ls-eyebrow">
          {track ? TRACK_LABEL[track] : ''}
          {lesson?.topicId && TOPIC_BY_ID[lesson.topicId] ? <> · Topic {TOPIC_BY_ID[lesson.topicId].num}</> : null}
        </p>
        <h1 class="ls-title">{title}</h1>
        {sections.length > 0 ? (
          <div class="ls-progress">
            <span class="ls-count">Step {at + 1} of {sections.length}</span>
            <ProgressBar value={at + 1} max={sections.length} label="Lesson progress" />
          </div>
        ) : null}
      </header>

      {sections.length > 0 ? (
        <nav class="ls-rail" aria-label="Lesson sections">
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  class={`ls-step${i === at ? ' is-current' : ''}${i < at ? ' is-done' : ''}`}
                  aria-current={i === at ? 'step' : undefined}
                  onClick={() => go(i)}
                >
                  <span class="ls-step-n" aria-hidden="true">{i + 1}</span>
                  <span class="ls-step-l"><InlineMd text={s.title} /></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div class="ls-body">
        {!lesson || !section ? (
          <div class="ls-skel" aria-busy="true"><Skeleton w="40%" h={20} /><Skeleton h={160} /></div>
        ) : (
          <>
            <h2 class="ls-step-title"><InlineMd text={section.title} /></h2>
            {at === 0 ? <Outcomes lesson={lesson} /> : null}
            {/* The track decides the language, so every block below highlights, prompts and runs in it. */}
            <CodeLang.Provider value={TRACK_LANG[lesson.track] ?? 'python'}>
              <div class="lb-flow">
                {section.blocks.map((b, bi) => (
                  // Keyed by section as well as index, so no block state (a picked slider, an opened
                  // checkpoint answer) can leak into the block at the same position in the next section.
                  <Block key={`${section.id}-${bi}`} block={b} gen={outputs[blockKey(at, bi)]} ctx={ctx} />
                ))}
              </div>
            </CodeLang.Provider>
          </>
        )}
      </div>

      {sections.length > 0 ? (
        <footer class="ls-nav">
          <button type="button" class="btn ghost" disabled={at === 0} onClick={() => go(at - 1)}>
            <Icon name="chevronLeft" size={14} /> Back
          </button>
          <span class="ls-nav-mid">{sections[at + 1] ? `Next: ${sections[at + 1].title}` : 'Last step'}</span>
          {at < sections.length - 1 ? (
            <button type="button" class="btn primary" onClick={() => go(at + 1)}>
              Next <Icon name="chevronRight" size={14} />
            </button>
          ) : lesson?.track === 'stat2402' ? (
            // Every STAT2402 lesson has a quiz, and the end of the lesson is the moment to take it.
            <span class="ls-nav-end">
              <a class="btn ghost" href={href.lessons()}>Back to lessons</a>
              <a class="btn primary" href={href.quiz(lessonId)}>Take the lesson quiz <Icon name="arrowRight" size={14} /></a>
            </span>
          ) : (
            <a class="btn ghost" href={href.lessons()}>Back to lessons</a>
          )}
        </footer>
      ) : null}
    </div>
  );
}
