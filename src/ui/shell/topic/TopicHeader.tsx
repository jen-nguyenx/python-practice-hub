// Topic page header: identity on the left (mono eyebrow, display title, one-line blurb) and a white card on the right:
// progress against the minimum with one primary action, or, for a locked topic, a calm notice with the way forward.
import { href, navigate } from '../../../app/router.ts';
import type { Question } from '../../../content/schema.ts';
import type { TopicMeta } from '../../../content/topics.ts';
import type { TopicProgress } from '../../../engine/progress.ts';
import { Icon } from '../../components/Icon.tsx';
import { ProgressBar } from '../../components/ProgressBar.tsx';
import { Skeleton } from '../../components/Skeleton.tsx';
import { plural } from '../format.ts';
import { CODE_FORMAT_NAMES, nextTopic, prevTopic } from '../progressData.ts';
import { Popover } from './Popover.tsx';

function MinimumDetails({ meta, p }: { meta: TopicMeta; p: TopicProgress }) {
  const next = nextTopic(meta);
  if (p.minimumMet) {
    return (
      <div class="tp-pop-text">
        <p>
          {p.testedOut && p.solved < p.minimum.solve ? 'You passed the topic test, so the minimum is done.' : 'Minimum done.'}{' '}
          {next ? <>Topic {next.num}, <a href={href.topic(next.id)}>{next.short}</a>, is open.</> : 'This is the last topic.'}
        </p>
        {p.total > p.solved ? <p class="tp-faint">The other questions are extra practice.</p> : null}
      </div>
    );
  }
  return (
    <div class="tp-pop-text">
      <p>
        Solve {plural(p.minimum.solve, 'question')} without showing the answer (hints are fine), {p.minimum.code} of them coding.
        {next ? <> That opens topic {next.num}, {next.short}.</> : null}
      </p>
      {next ? <p>Or pass the <a href={href.topicTest(meta.id)}>topic test</a> to open it straight away.</p> : null}
      <p class="tp-faint">Coding questions: {CODE_FORMAT_NAMES}.</p>
    </div>
  );
}

/** One plain sentence about where the student stands. */
function statusLine(meta: TopicMeta, p: TopicProgress, allSolved: boolean) {
  const next = nextTopic(meta);
  if (allSolved) return 'Every question solved. Nice work.';
  if (p.minimumMet) {
    if (p.testedOut && p.solved < p.minimum.solve) return next ? `Topic test passed. ${next.short} is open.` : 'Topic test passed.';
    return next ? `Minimum done. ${next.short} is open.` : 'Minimum done. The rest is extra practice.';
  }
  if (p.remaining) return next ? `${capital(p.remaining)}, then ${next.short} opens.` : `${capital(p.remaining)}.`;
  return next ? `Reach the minimum to open ${next.short}.` : 'Reach the minimum to finish the ladder.';
}

function capital(s: string) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

function ProgressCard({ meta, p, target, allSolved, lessonDone }: { meta: TopicMeta; p: TopicProgress; target: Question | undefined; allSolved: boolean; lessonDone: boolean }) {
  const total = p.total;
  if (total === 0) {
    return (
      <section class="tp-card tp-side" aria-label="Progress in this topic">
        <p class="tp-muted">Questions for this topic are being written.</p>
        <p class="tp-side-links"><a class="tp-link" href={href.report(meta.id)}>Topic report</a></p>
      </section>
    );
  }
  const label = allSolved ? 'Practise again' : p.attempted === 0 && p.solved === 0 ? 'Start' : 'Resume';
  // Someone who has never touched this topic is better served by the lesson than by a cold question.
  const lessonFirst = !lessonDone && p.attempted === 0 && p.solved === 0;
  return (
    <section class="tp-card tp-side" aria-label="Progress in this topic">
      <div class="tp-count">
        <span class="tp-count-num">{p.solved} / {total}</span>
        <span class="tp-count-word">solved</span>
      </div>
      <ProgressBar
        value={p.solved}
        max={total}
        marker={Math.min(p.minimum.solve, total)}
        class="tp-bar"
        label="Questions solved in this topic"
        valueText={`${p.solved} of ${total} solved. Minimum ${p.minimum.solve}, ${p.minimum.code} coding.`}
      />
      <div class="tp-min">
        <Popover
          triggerClass="tp-min-btn"
          panelLabel="About the minimum"
          trigger={<>Minimum {p.minimum.solve} · {p.minimum.code} coding{p.minimumMet ? <Icon name="check" size={14} class="tp-min-ok" label="done" /> : null}</>}
        >
          <MinimumDetails meta={meta} p={p} />
        </Popover>
      </div>
      <p class="tp-status">{statusLine(meta, p, allSolved)}</p>
      <div class="tp-side-actions">
        {lessonFirst ? (
          <>
            <a class="btn primary tp-cta" href={href.topicLesson(meta.id)}>
              Start the lesson
              <Icon name="arrowRight" size={16} />
            </a>
            <button
              type="button"
              class="btn tp-btn2"
              disabled={!target}
              onClick={() => target && navigate(href.question(target.id))}
            >
              Skip to questions
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              class="btn primary tp-cta"
              disabled={!target}
              title={target ? `${allSolved ? 'First question' : 'Next unsolved'}: ${target.title}` : undefined}
              onClick={() => target && navigate(href.question(target.id))}
            >
              {label}
              <Icon name="arrowRight" size={16} />
            </button>
            <a class="btn tp-btn2" href={href.topicTest(meta.id)}>Topic test</a>
          </>
        )}
      </div>
      <p class="tp-side-links">
        {lessonFirst ? null : <a class="tp-link" href={href.topicLesson(meta.id)}>{lessonDone ? 'Read the lesson again' : 'Lesson'}<Icon name="arrowRight" size={14} /></a>}
        <a class="tp-link" href={href.report(meta.id)}>Topic report<Icon name="arrowRight" size={14} /></a>
      </p>
    </section>
  );
}

function LockCard({ meta, p, prevLocked }: { meta: TopicMeta; p: TopicProgress; prevLocked: boolean }) {
  const prev = prevTopic(meta);
  return (
    <section class="tp-card tp-side tp-lock" aria-label="This topic is locked">
      <p class="tp-lock-head">
        <span class="tp-lock-icon"><Icon name="lock" size={16} /></span>
        <span class="tp-lock-title">Locked for now</span>
      </p>
      <p class="tp-lock-reason">{p.lockReason ?? 'Finish the previous topic first.'}</p>
      {prev ? (
        <p class="tp-side-links">
          <a href={href.topic(prev.id)} class="tp-link">Go to {prev.num} · {prev.short}<Icon name="arrowRight" size={14} /></a>
          {!prevLocked ? <a href={href.topicTest(prev.id)} class="tp-link-quiet">or pass its topic test</a> : null}
        </p>
      ) : null}
      <p class="tp-lock-foot">
        The <a class="tp-link-quiet" href={href.topicLesson(meta.id)}>lesson</a> is open to read now, questions or not.
      </p>
    </section>
  );
}

export function TopicHeader({ meta, p, ready, target, allSolved, prevLocked, lessonDone }: {
  meta: TopicMeta;
  p: TopicProgress | undefined;
  ready: boolean;
  target: Question | undefined;
  allSolved: boolean;
  prevLocked: boolean;
  lessonDone: boolean;
}) {
  let side;
  if (!ready || !p) {
    side = (
      <div class="tp-card tp-side" aria-hidden="true">
        <Skeleton w="40%" h={24} />
        <Skeleton h={6} />
        <Skeleton w="60%" h={16} />
        <Skeleton w="55%" h={40} />
      </div>
    );
  } else if (p.state === 'locked') side = <LockCard meta={meta} p={p} prevLocked={prevLocked} />;
  else side = <ProgressCard meta={meta} p={p} target={target} allSolved={allSolved} lessonDone={lessonDone} />;

  return (
    <header class="tp-head">
      <div class="tp-id">
        <p class="tp-eyebrow">Topic {meta.num} · {meta.unitRef}</p>
        <h1 class="tp-title">{meta.title}</h1>
        <div class="tp-blurb">
          <p>{meta.blurb}</p>
          {meta.note ? (
            <Popover triggerClass="tp-note-btn" triggerLabel="Note about this topic" panelLabel="Note about this topic" trigger={<Icon name="info" size={16} />}>
              <p class="tp-pop-text">{meta.note}</p>
            </Popover>
          ) : null}
        </div>
      </div>
      {side}
    </header>
  );
}
