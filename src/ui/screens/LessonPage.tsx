// Lesson mode (#/learn/:id): one guided path through a topic, a step at a time.
//
// The topic page offers the same material as tabs, which leaves a beginner to guess what to read first.
// This puts it in order — the idea, then watch it work, then change it yourself, then the traps, then
// practise — and carries them through with one button. Readable while the topic is still locked, like
// every other reading surface in the app.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import type { TopicId } from '../../content/ids.ts';
import { loadExperiments, loadTopic } from '../../content/index.ts';
import type { GeneratedExperiments, Topic } from '../../content/schema.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import { Icon } from '../components/Icon.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { clampStep, lessonSteps, loadStep, saveStep } from '../lesson/steps.ts';
import type { LessonStep } from '../lesson/steps.ts';
import { safeQuestionStats, safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import { CheatSheetTab, MistakesTab, WorkedExampleTab } from '../shell/topic/ReadTabs.tsx';
import { ExperimentCard } from '../shell/topic/WhatIf.tsx';
import '../lesson/lesson.css';
import '../shell/topic/topic.css';

function append(e: Parameters<typeof store.append>[0]) {
  try {
    store.append(e);
  } catch (err) {
    console.warn('Could not save event', err);
  }
}

function Intro({ meta, steps }: { meta: TopicMeta; steps: LessonStep[] }) {
  const tries = steps.filter((s) => s.kind === 'experiment').length;
  return (
    <div class="ls-prose">
      <p class="ls-lede">{meta.blurb}</p>
      <p>
        This lesson walks through {meta.short.toLowerCase()} in {steps.length} short steps: the idea, a worked
        example{tries > 0 ? `, ${tries === 1 ? 'a program' : `${tries} programs`} you can change to see what happens` : ''}, and
        the mistakes people usually make. Then you practise.
      </p>
      <p class="ls-meta">Matches {meta.unitRef}.</p>
      {meta.note ? <p class="ls-note">{meta.note}</p> : null}
    </div>
  );
}

function Practise({ meta, locked, targetQid, solved, total }: {
  meta: TopicMeta; locked: boolean; targetQid: string | undefined; solved: number; total: number;
}) {
  return (
    <div class="ls-prose">
      <p class="ls-lede">That is the whole idea. Reading it is not the same as being able to write it, so the next part matters most.</p>
      {locked ? (
        <>
          <p>
            The questions for this topic are still locked, but nothing you just read was wasted: it is the
            same material you will need when they open.
          </p>
          <p><a class="btn" href={href.topic(meta.id)}>Back to the topic</a></p>
        </>
      ) : (
        <>
          <p>
            {total > 0 && solved > 0
              ? `You have solved ${solved} of ${total} questions here. Pick up where you left off.`
              : `There are ${total} questions for this topic. Start with the first one and use the hints freely — they cost you nothing.`}
          </p>
          <p class="ls-actions">
            {targetQid ? <a class="btn primary" href={href.question(targetQid)}>Start practising</a> : null}
            <a class="btn ghost" href={href.topic(meta.id)}>See all the questions</a>
          </p>
        </>
      )}
    </div>
  );
}

function StepBody({ step, topic, meta, generated, locked, targetQid, solved, total }: {
  step: LessonStep; topic: Topic; meta: TopicMeta; generated: GeneratedExperiments | null;
  locked: boolean; targetQid: string | undefined; solved: number; total: number;
}) {
  switch (step.kind) {
    case 'intro':
      return <Intro meta={meta} steps={lessonSteps(topic)} />;
    case 'idea':
      return <CheatSheetTab topic={topic} />;
    case 'example':
      return <WorkedExampleTab topic={topic} />;
    case 'experiment': {
      const gen = generated?.[step.experiment.id];
      if (!generated) return <Skeleton h={220} />;
      if (!gen || Object.keys(gen.runs ?? {}).length === 0) {
        return <div class="tp-empty">This experiment is being written.</div>;
      }
      return <div class="tp-read"><ExperimentCard x={step.experiment} gen={gen} compact /></div>;
    }
    case 'mistakes':
      return <MistakesTab topic={topic} />;
    case 'practise':
      return <Practise meta={meta} locked={locked} targetQid={targetQid} solved={solved} total={total} />;
  }
}

export function LessonPage({ topicId }: { topicId: string }) {
  const meta = TOPIC_BY_ID[topicId] as TopicMeta | undefined;
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const [topic, setTopic] = useState<Topic | null>(null);
  const [failed, setFailed] = useState(false);
  const [generated, setGenerated] = useState<GeneratedExperiments | null>(null);
  const [index, setIndex] = useState(() => loadStep(topicId));

  useEffect(() => {
    if (!meta) return;
    let alive = true;
    setTopic(null);
    setFailed(false);
    setIndex(loadStep(meta.id));
    loadTopic(meta.id).then(
      (t) => { if (alive) setTopic(t); },
      () => { if (alive) setFailed(true); },
    );
    loadExperiments(meta.id).then(
      (g) => { if (alive) setGenerated(g); },
      () => { if (alive) setGenerated({}); },
    );
    return () => { alive = false; };
  }, [meta?.id]);

  const steps = useMemo(() => lessonSteps(topic), [topic]);
  const at = clampStep(index, steps.length);
  const step = steps[at];

  const progressAll = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const stats = useMemo(() => safeQuestionStats(events), [events]);
  const p = meta ? progressAll[meta.id] : undefined;
  const locked = !ready || p?.state === 'locked';

  const questions = topic ? topic.scenarios.flatMap((s) => s.questions) : [];
  const firstUnsolved = questions.find((q) => !stats.get(q.id)?.solved);
  const solved = questions.filter((q) => stats.get(q.id)?.solved).length;

  // Reaching the last step means the whole lesson was seen; that is what "done" records.
  useEffect(() => {
    if (!meta || !ready || !topic || step?.kind !== 'practise') return;
    append({ type: 'lesson_done', topicId: meta.id as TopicId });
  }, [meta?.id, ready, !!topic, step?.kind]);

  if (!meta) {
    return (
      <div class="ls">
        <div class="tp-empty">
          <p><strong>Topic not found.</strong></p>
          <p><a href={href.landing()}>Back to topics</a></p>
        </div>
      </div>
    );
  }

  const go = (next: number) => {
    const clamped = clampStep(next, steps.length);
    setIndex(clamped);
    saveStep(meta.id, clamped);
    document.querySelector('.ls-body')?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  if (failed) {
    return (
      <div class="ls">
        <div class="tp-empty">
          <p><strong>This lesson didn't load.</strong></p>
          <p><button type="button" class="btn ghost" onClick={() => location.reload()}>Reload the page</button></p>
        </div>
      </div>
    );
  }

  return (
    <div class="ls">
      <header class="ls-head">
        <h1 class="ls-title">{meta.title}</h1>
        <div class="ls-progress">
          <span class="ls-count">Step {at + 1} of {steps.length}</span>
          <ProgressBar value={at + 1} max={steps.length} label="Lesson progress" />
        </div>
      </header>

      <nav class="ls-rail" aria-label="Lesson steps">
        <ol>
          {steps.map((s, i) => (
            <li key={`${s.kind}-${i}`}>
              <button
                type="button"
                class={`ls-step${i === at ? ' is-current' : ''}${i < at ? ' is-done' : ''}`}
                aria-current={i === at ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span class="ls-step-n" aria-hidden="true">{i + 1}</span>
                <span class="ls-step-l">{s.label}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div class="ls-body">
        {!topic || !step ? (
          <div class="ls-skel" aria-busy="true"><Skeleton w="40%" h={20} /><Skeleton h={160} /></div>
        ) : (
          <>
            <h2 class="ls-step-title">
              {step.kind === 'experiment' ? step.experiment.title
                : step.kind === 'intro' ? 'What this topic is for'
                : step.kind === 'idea' ? 'The idea'
                : step.kind === 'example' ? 'Watch it work'
                : step.kind === 'mistakes' ? 'Traps people fall into'
                : 'Your turn'}
            </h2>
            <StepBody
              step={step} topic={topic} meta={meta} generated={generated}
              locked={locked} targetQid={firstUnsolved?.id} solved={solved} total={questions.length}
            />
          </>
        )}
      </div>

      <footer class="ls-nav">
        <button type="button" class="btn ghost" disabled={at === 0} onClick={() => go(at - 1)}>
          <Icon name="chevronLeft" size={14} /> Back
        </button>
        <span class="ls-nav-mid">{steps[at + 1] ? `Next: ${steps[at + 1].label}` : 'Last step'}</span>
        {at < steps.length - 1 ? (
          <button type="button" class="btn primary" onClick={() => go(at + 1)}>
            Next <Icon name="chevronRight" size={14} />
          </button>
        ) : (
          <a class="btn ghost" href={href.topic(meta.id)}>Finish</a>
        )}
      </footer>
    </div>
  );
}
