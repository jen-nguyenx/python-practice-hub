// Topic test (#/test/:topicId): 5 questions, 15 minutes, no hints. Passing (4 of 5) unlocks the next topic.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { CODE_FORMATS, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { markTopicOpened } from '../../app/session.ts';
import { Button, LinkButton } from '../components/Button.tsx';
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
import { ConfirmDialog } from '../testmode/ConfirmDialog.tsx';
import { unlockingTopic } from '../testmode/lock.ts';
import { storeReady } from '../shell/storeReady.ts';
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
  const [confirmNew, setConfirmNew] = useState(false);
  const events = store.events.value;
  const settings = store.settings.value;
  const ready = storeReady.value;

  useEffect(() => {
    if (!meta) return;
    let alive = true;
    loadPool([meta.id]).then((p) => { if (alive) setPool(p); });
    return () => { alive = false; };
  }, [topicId]);

  const history = useMemo(() => (meta ? testHistory(events, 'topic-test', meta.id) : []), [events, meta]);
  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(events, QUESTION_INDEX, settings); } catch { return {}; }
  }, [events, settings]);

  if (!meta || !(TOPIC_IDS as readonly string[]).includes(topicId)) {
    return (
      <div class="tx-page tt-page">
        <section class="tx-card"><p>There is no topic called "{topicId}". <a href={href.landing()}>Back to topics</a></p></section>
      </div>
    );
  }

  const next = TOPICS[meta.order] ?? null;
  const size = pool ? Math.min(TOPIC_TEST_SIZE, pool.length) : TOPIC_TEST_SIZE;
  const passMark = topicTestPassMark(size);
  const passedBefore = history.find((h) => h.passed);
  const locked = progress[meta.id]?.state === 'locked';

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
        resultActions={(s: TestSummary) => {
          const back = () => { setSaved(readProgress('topic-test', meta.id)); setPicked(null); setResume(undefined); setRunId(runId + 1); };
          return s.passed ? (
            <>
              {next ? <LinkButton href={href.topic(next.id)} variant="primary">Go to {next.short} <Icon name="arrowRight" /></LinkButton> : null}
              <Button variant={next ? 'secondary' : 'primary'} onClick={back}>Back to test page</Button>
            </>
          ) : (
            <>
              <LinkButton href={href.topic(meta.id)} variant="primary">Practise {meta.short} <Icon name="arrowRight" /></LinkButton>
              <Button onClick={back}>Back to test page</Button>
            </>
          );
        }}
      />
    );
  }

  const crumbs = (
    <nav class="tx-crumbs" aria-label="Breadcrumb">
      <a href={href.landing()}>Topics</a> <Icon name="chevronRight" size={12} /> <a href={href.topic(meta.id)}>{meta.short}</a> <Icon name="chevronRight" size={12} /> <span aria-current="page">Topic test</span>
    </nav>
  );

  // A locked topic's test cannot be taken: passing it would unlock the next topic while this one stayed locked.
  if (locked && ready) {
    const opener = unlockingTopic(progress, meta.id);
    const reason = progress[meta.id]?.lockReason;
    return (
      <div class="tx-page tt-page">
        {crumbs}
        <section class="tx-card tt-card tt-lock" aria-labelledby="tt-h">
          <span class="tt-lock-icon" aria-hidden="true"><Icon name="lock" size={20} /></span>
          <span class="tx-eyebrow">Topic {Number(meta.num)} · test</span>
          <h1 id="tt-h">{meta.title} is locked</h1>
          <p class="tt-lede">The topic test opens once {meta.short} is unlocked, so you are tested on a topic you can practise.</p>
          {reason ? <p class="tt-lock-reason">{reason}</p> : null}
          <div class="tx-actions">
            {opener
              ? <LinkButton href={href.topic(opener.id)} variant="primary">Go to {opener.short} <Icon name="arrowRight" /></LinkButton>
              : <LinkButton href={href.landing()} variant="primary">Back to topics</LinkButton>}
            <LinkButton href={href.topic(meta.id)} variant="ghost">Read the {meta.short} cheat sheet</LinkButton>
          </div>
        </section>
      </div>
    );
  }

  const begin = () => {
    if (!pool || pool.length === 0) return;
    setConfirmNew(false);
    markTopicOpened(meta.id as TopicId);
    clearProgress('topic-test', meta.id);
    setSaved(null);
    setResume(undefined);
    // A retake prefers questions that were not in the last attempt, whose answers were just shown.
    const avoid = new Set(history[0]?.qids ?? []);
    setPicked(selectTopicTest(pool, Math.random, undefined, avoid));
  };
  const start = () => {
    if (!pool || pool.length === 0) return;
    if (saved) setConfirmNew(true);
    else begin();
  };
  const hasCode = pool?.some((p) => CODE_FORMATS.includes(p.format)) ?? true;

  return (
    <div class="tx-page tt-page">
      {crumbs}

      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); setResume(saved); setRunId(saved.startedAt); setPicked(items); }}
          onDiscard={() => { clearProgress('topic-test', meta.id); setSaved(null); }} />
      ) : null}

      <section class="tx-card tt-card" aria-labelledby="tt-h">
        <span class="tx-eyebrow">Topic {Number(meta.num)} · test</span>
        <h1 id="tt-h">{meta.title}</h1>
        <p class="tt-lede">
          {next
            ? <>Pass to unlock <strong>{next.title}</strong> straight away, even if you have not finished the practice questions.</>
            : <>This is the last topic. Passing marks {meta.short} as done.</>}
        </p>
        <ul class="tt-facts">
          <li><b>{size}</b><span>questions</span></li>
          <li><b>{TOPIC_TEST_MINUTES}</b><span>minutes</span></li>
          <li><b>{passMark}/{size}</b><span>correct to pass</span></li>
        </ul>

        <details class="tt-how">
          <summary><Icon name="chevronRight" size={14} /> How the test works</summary>
          <ul>
            <li>Reading, fix or complete, and coding questions, at medium or hard level where possible.</li>
            <li>Each question gets one check. Your answer is saved and marked at the end.</li>
            <li>No hints during the test. Every answer is explained afterwards.</li>
            <li>Move between questions freely and flag any to come back to.</li>
            <li>The test finishes by itself at 0:00. If you leave, your answers are kept, but the timer keeps running.</li>
          </ul>
        </details>

        {pool === null ? <p class="tt-note" role="status">Loading questions…</p> : null}
        {pool !== null && pool.length === 0 ? (
          <p class="tt-note"><Icon name="info" /> Questions for {meta.short} are still being written, so this test is not available yet.</p>
        ) : null}
        {pool !== null && pool.length > 0 && pool.length < TOPIC_TEST_SIZE ? (
          <p class="tt-note"><Icon name="info" /> Only {plural(pool.length, 'question')} {pool.length === 1 ? 'is' : 'are'} ready in {meta.short}, so this test is shorter.</p>
        ) : null}
        {pool !== null && pool.length > 0 && hasCode ? (
          <p class="tt-note"><Icon name="terminal" /> Coding questions run Python in your browser. It can take a few seconds to load the first time.</p>
        ) : null}
        {passedBefore ? (
          <p class="tt-note ok"><Icon name="check" /> <span>You passed on {formatDate(passedBefore.ts)} ({passedBefore.score} of {passedBefore.total}). Take it again any time for practice.</span></p>
        ) : null}

        <div class="tx-actions">
          <Button variant="primary" size="lg" onClick={start} disabled={!pool || pool.length === 0}>
            Start test <Icon name="arrowRight" />
          </Button>
          <LinkButton href={href.topic(meta.id)} variant="ghost">Practise {meta.short} first</LinkButton>
        </div>
      </section>

      {history.length ? (
        <section class="tx-card" aria-labelledby="tt-history">
          <div class="tx-card-head"><h2 id="tt-history">Past attempts</h2></div>
          <div class="tx-table-wrap">
            <table class="tx-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Result</th><th scope="col">Time</th></tr></thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.ts}>
                    <td class="dim">{formatDate(h.ts)}</td>
                    <td class="num"><b>{h.score}/{h.total}</b></td>
                    <td class="wide">
                      {h.passed
                        ? <span class="tx-pass ok sm"><Icon name="check" size={12} /> Passed</span>
                        : <span class="tx-pass bad sm"><Icon name="x" size={12} /> Not passed</span>}
                    </td>
                    <td class="num dim">{formatDuration(h.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <ConfirmDialog open={confirmNew} title="Start a new test?" confirmLabel="Start new test" cancelLabel="Keep my test"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The test you have in progress will be discarded and its saved answers deleted.</p>
      </ConfirmDialog>
    </div>
  );
}

function TopicTestOutcome({ summary, topicId, next }: { summary: TestSummary; topicId: TopicId; next: TopicId | null }) {
  const meta = TOPIC_BY_ID[topicId];
  const nextMeta = next ? TOPIC_BY_ID[next] : null;
  if (summary.passed) {
    return (
      <p class="ok"><Icon name="unlock" /> {nextMeta ? `${nextMeta.title} is now unlocked.` : `${meta.short} is marked as done.`}</p>
    );
  }
  return (
    <p>You need {summary.passMark} of {summary.total} to pass. Review the questions below and practise {meta.short}; your next try picks different questions where it can.</p>
  );
}
