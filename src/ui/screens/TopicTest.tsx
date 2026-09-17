// Topic test (#/test/:topicId): 5 questions, 15 minutes, no hints. Passing (4 of 5) unlocks the next topic.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { CODE_FORMATS, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { markTopicOpened } from '../../app/session.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Chip } from '../components/Chip.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatDate, formatDuration, plural } from '../report/format.ts';
import { TestRunner } from '../testmode/TestRunner.tsx';
import type { PoolEntry } from '../testmode/pool.ts';
import { loadPool } from '../testmode/pool.ts';
import { selectTopicTest, TOPIC_TEST_MINUTES, TOPIC_TEST_SIZE, topicTestPassMark } from '../testmode/select.ts';
import type { TestSummary } from '../testmode/summary.ts';
import { testHistory } from '../testmode/summary.ts';
import type { TestProgress } from '../testmode/progress.ts';
import { clearProgress, readProgress } from '../testmode/progress.ts';
import { ResumeCard } from '../testmode/ResumeCard.tsx';
import '../testmode/testmode.css';

export function TopicTest({ topicId }: { topicId: string }) {
  // Keyed so switching between topics' tests starts fresh.
  return <TopicTestScreen key={topicId} topicId={topicId} />;
}

function TopicTestScreen({ topicId }: { topicId: string }) {
  const meta = TOPIC_BY_ID[topicId];
  const [pool, setPool] = useState<PoolEntry[] | null>(null);
  const [picked, setPicked] = useState<PoolEntry[] | null>(null);
  const [resume, setResume] = useState<TestProgress | undefined>(undefined);
  const [saved, setSaved] = useState<TestProgress | null>(() => (meta ? readProgress('topic-test', meta.id) : null));
  const [runId, setRunId] = useState(0);
  const events = store.events.value;

  useEffect(() => {
    if (!meta) return;
    let alive = true;
    loadPool([meta.id]).then((p) => { if (alive) setPool(p); });
    return () => { alive = false; };
  }, [topicId]);

  const history = useMemo(() => (meta ? testHistory(events, 'topic-test', meta.id) : []), [events, meta]);
  const settings = store.settings.value;
  const lockReason = useMemo(() => {
    if (!meta) return null;
    try {
      const p = topicProgressAll(events, QUESTION_INDEX, settings)[meta.id];
      return p && p.state === 'locked' ? (p.lockReason ?? '') : null;
    } catch {
      return null;
    }
  }, [events, settings, meta]);

  if (!meta || !(TOPIC_IDS as readonly string[]).includes(topicId)) {
    return (
      <div class="tm tm-narrow">
        <div class="empty-state">There is no topic called "{topicId}". <a href={href.landing()}>Back to topics</a></div>
      </div>
    );
  }

  const next = TOPICS[meta.order] ?? null;
  const size = pool ? Math.min(TOPIC_TEST_SIZE, pool.length) : TOPIC_TEST_SIZE;
  const passMark = topicTestPassMark(size);
  const passedBefore = history.find((h) => h.passed);

  if (picked) {
    return (
      <TestRunner
        key={runId}
        title={`${meta.title}`}
        questions={picked.map((p) => p.item)}
        durationMin={resume?.durationMin ?? TOPIC_TEST_MINUTES}
        persistKey={meta.id}
        resume={resume}
        mode="topic-test"
        onFinish={() => {}}
        resultExtra={(s: TestSummary) => <TopicTestOutcome summary={s} topicId={meta.id} next={next?.id ?? null} />}
        resultActions={() => (
          <>
            <Button variant="primary" onClick={() => { setSaved(readProgress('topic-test', meta.id)); setPicked(null); setResume(undefined); setRunId(runId + 1); }}>Take the test again</Button>
            <LinkButton href={href.topic(meta.id)}>Back to {meta.short}</LinkButton>
            <LinkButton href={href.report(meta.id)} variant="ghost">Topic report</LinkButton>
          </>
        )}
      />
    );
  }

  const start = () => {
    if (!pool || pool.length === 0) return;
    if (saved && !window.confirm('Start a new test? The test you have in progress will be discarded.')) return;
    markTopicOpened(meta.id as TopicId);
    clearProgress('topic-test', meta.id);
    setSaved(null);
    setResume(undefined);
    setPicked(selectTopicTest(pool));
  };
  const hasCode = pool?.some((p) => CODE_FORMATS.includes(p.format)) ?? true;

  return (
    <div class="tm tm-narrow">
      <nav class="tm-crumbs muted" aria-label="Breadcrumb">
        <a href={href.landing()}>Topics</a> <span aria-hidden="true">›</span> <a href={href.topic(meta.id)}>{meta.short}</a> <span aria-hidden="true">›</span> Topic test
      </nav>
      <header class="tm-head">
        <span class="label">Topic {meta.num} · test</span>
        <h1>Topic test: {meta.title}</h1>
        <p class="muted">
          {next
            ? <>Pass this test and <strong>{next.title}</strong> unlocks straight away, even if you have not finished the practice questions here.</>
            : <>This is the last topic. Passing marks {meta.short} as done.</>}
        </p>
      </header>

      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); setResume(saved); setRunId(saved.startedAt); setPicked(items); }}
          onDiscard={() => { clearProgress('topic-test', meta.id); setSaved(null); }} />
      ) : null}

      <section class="card tm-card" aria-labelledby="tt-how">
        <h2 id="tt-how" class="sr-only">How the test works</h2>
        <ul class="tm-facts">
          <li><span class="label">Questions</span><strong>{size}</strong></li>
          <li><span class="label">Time</span><strong>{TOPIC_TEST_MINUTES} minutes</strong></li>
          <li><span class="label">To pass</span><strong>{passMark} of {size} correct</strong></li>
          <li><span class="label">Hints</span><strong>None</strong></li>
        </ul>
        <ul class="tm-rules">
          <li>Two reading questions, one fix or complete, and two coding questions, at medium or hard level where possible.</li>
          <li>Each question gets <strong>one</strong> check or submit. Your answer is saved, and you see how you did at the end.</li>
          <li>No hints and no Show answer during the test. Every answer is explained afterwards.</li>
          <li>Move between questions freely and flag any you want to come back to.</li>
          <li>The test finishes by itself when the timer reaches 0:00. If you leave or reload the page, your saved answers are kept and you can carry on here, but the timer keeps running.</li>
        </ul>

        {pool === null ? <p class="muted" role="status">Loading questions…</p> : null}
        {pool !== null && pool.length === 0 ? (
          <Callout tone="neutral" title="No questions yet">Questions for {meta.short} are still being written, so this test is not available yet.</Callout>
        ) : null}
        {pool !== null && pool.length > 0 && pool.length < TOPIC_TEST_SIZE ? (
          <Callout tone="info" title="Shorter test">Only {plural(pool.length, 'question')} {pool.length === 1 ? 'is' : 'are'} ready in {meta.short}, so this test has {pool.length}. You need {passMark} correct to pass.</Callout>
        ) : null}
        {pool !== null && pool.length > 0 && hasCode ? (
          <p class="muted"><Icon name="terminal" /> Coding questions run your code with Python in the browser. It loads in the background and can take a few seconds the first time.</p>
        ) : null}
        {lockReason !== null && !passedBefore ? (
          <Callout tone="neutral" title="This topic is not unlocked yet">
            <p>You can still take the test for revision.{next ? ` Passing it unlocks ${next.title}.` : ''}{lockReason ? ` To open the practice questions: ${lockReason}` : ''}</p>
          </Callout>
        ) : null}
        {passedBefore ? (
          <Callout tone="ok" title="Already passed">You passed this test on {formatDate(passedBefore.ts)} ({passedBefore.score} of {passedBefore.total}). You can take it again for practice.</Callout>
        ) : null}

        <div class="tm-actions">
          <Button variant="primary" size="lg" onClick={start} disabled={!pool || pool.length === 0}>
            Start the {TOPIC_TEST_MINUTES}-minute test <Icon name="arrowRight" />
          </Button>
          <LinkButton href={href.topic(meta.id)} variant="ghost">Practise {meta.short} first</LinkButton>
        </div>
      </section>

      {history.length ? (
        <section class="tm-section" aria-labelledby="tt-history">
          <h2 id="tt-history">Your attempts</h2>
          <ul class="tm-history">
            {history.map((h) => (
              <li key={h.ts}>
                <span class="num">{formatDate(h.ts)}</span>
                <span class="num"><strong>{h.score} / {h.total}</strong> <span class="muted">· {h.percent}%</span></span>
                <span class="tm-history-topics">
                  {h.passed ? <Chip tone="ok"><Icon name="check" size={11} /> Passed</Chip> : <Chip tone="bad"><Icon name="x" size={11} /> Not passed</Chip>}
                  <span class="muted num"> · {formatDuration(h.durationMs)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TopicTestOutcome({ summary, topicId, next }: { summary: TestSummary; topicId: TopicId; next: TopicId | null }) {
  const meta = TOPIC_BY_ID[topicId];
  const nextMeta = next ? TOPIC_BY_ID[next] : null;
  if (summary.passed) {
    return (
      <Callout tone="ok" title={`Passed: ${summary.correct} of ${summary.total}`}>
        {nextMeta ? (
          <>
            <p>{nextMeta.title} is now unlocked.</p>
            <p><LinkButton href={href.topic(nextMeta.id)} variant="primary">Go to {nextMeta.short} <Icon name="arrowRight" /></LinkButton></p>
          </>
        ) : <p>{meta.short} is marked as done.</p>}
      </Callout>
    );
  }
  return (
    <Callout tone="info" title={`Not passed this time: ${summary.correct} of ${summary.total}`}>
      <p>You need {summary.passMark} of {summary.total} to pass. Review the questions below, practise {meta.short}, then try again.</p>
    </Callout>
  );
}
