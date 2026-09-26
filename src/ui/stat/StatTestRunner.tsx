// The STAT2402 test runner: a lesson quiz, a practice test or the mock final.
//
// Looks and behaves like the CITS1401 runner (testmode/TestRunner.tsx, whose styles it shares): while the
// paper runs it takes the whole workspace, one question at a time with a question map, a countdown and a
// finish dialog; answers are kept silently and nothing is marked until the end. Then every answer is
// marked -- choice, number and predict from what the verifier recorded, write by running its tests in the
// browser's R -- the result goes to the event log as a `stat_test`, and the review opens.
import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { r, store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { LESSON_BY_ID } from '../../content/lessons/index.ts';
import type { RTest } from '../../runtime/r/driver.ts';
import type { StatAnswer, StatItem, StatSummary, StatTestKind } from '../../engine/statExam.ts';
import { markInstant, STAT_TEST_TITLE, summarize, writeMarks } from '../../engine/statExam.ts';
import { Button } from '../components/Button.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatClock } from '../report/format.ts';
import { mainFill } from '../shell/uiState.ts';
import { useLeaveGuard } from '../testmode/leaveGuard.ts';
import { TimeLeft } from '../testmode/TimeLeft.tsx';
import type { StatProgress } from './progress.ts';
import { clearStatProgress, writeStatProgress } from './progress.ts';
import type { StatReview } from './StatQuestionView.tsx';
import { StatQuestionView } from './StatQuestionView.tsx';
import '../testmode/testmode.css';
import '../lesson/lesson.css';
import './stat.css';

export interface StatTestRunnerProps {
  kind: StatTestKind;
  title: string;
  items: StatItem[];
  lessonIds: string[];
  minutes: number;
  /** Where the unfinished paper is kept (e.g. "mock", "quiz:regression-in-r"). */
  persistKey: string;
  resume?: StatProgress;
  /** The results page's buttons. */
  actions: (summary: StatSummary) => ComponentChildren;
  /** One quiet line under the score, e.g. how it compares with a previous best. */
  extra?: (summary: StatSummary) => ComponentChildren;
}

type Phase = 'running' | 'marking' | 'results';
const LEAVE_MESSAGE = 'Leave the test? Your answers are kept and the clock keeps running; you can come back to it.';

export function StatTestRunner({ kind, title, items, lessonIds, minutes, persistKey, resume, actions, extra }: StatTestRunnerProps) {
  const [phase, setPhase] = useState<Phase>('running');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(StatAnswer | undefined)[]>(() => (resume ? resume.answers.map((a) => a ?? undefined) : items.map(() => undefined)));
  const [flagged, setFlagged] = useState<Set<number>>(() => new Set(resume?.flagged ?? []));
  const [finishOpen, setFinishOpen] = useState(false);
  const [marked, setMarked] = useState<{ reviews: StatReview[]; summary: StatSummary } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [markingNote, setMarkingNote] = useState('');
  const startedAt = useRef(resume?.startedAt ?? Date.now());
  const limitMs = minutes * 60_000;
  const finishing = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const topRef = useRef<HTMLHeadingElement>(null);

  // The paper takes the whole workspace while it runs, as the CITS1401 tests do; the results do not.
  useEffect(() => {
    mainFill.value = phase !== 'results';
    return () => { mainFill.value = false; };
  }, [phase]);
  useLeaveGuard(phase === 'running', LEAVE_MESSAGE);

  // R is only needed to mark writing questions; start it early so marking does not wait for the download.
  useEffect(() => { if (items.some((it) => it.q.kind === 'write')) r.warmUp(); }, []);

  const save = (next: (StatAnswer | undefined)[], nextFlags: Set<number>) => {
    writeStatProgress(persistKey, {
      v: 1, kind, title, lessonIds, qids: items.map((it) => it.q.id), marks: items.map((it) => it.marks),
      answers: next.map((a) => a ?? null), flagged: [...nextFlags], startedAt: startedAt.current, minutes,
    });
  };

  const answer = (i: number, a: StatAnswer) => {
    const next = answers.slice();
    next[i] = a;
    setAnswers(next);
    save(next, flagged);
  };

  const toggleFlag = (i: number) => {
    const next = new Set(flagged);
    if (next.has(i)) next.delete(i); else next.add(i);
    setFlagged(next);
    save(answers, next);
  };

  const finish = async (timedOut: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    setFinishOpen(false);
    setPhase('marking');
    const finishedAt = Date.now();
    const given = answersRef.current;
    const reviews: StatReview[] = [];
    for (const [i, it] of items.entries()) {
      const a = given[i];
      if (it.q.kind !== 'write') {
        reviews.push({ earned: markInstant(it, a) });
        continue;
      }
      const code = a && a.kind === 'write' ? a.code : '';
      const total = it.q.tests.length;
      // Untouched starter code is not run: it was written to fail, and running it only costs time.
      if (!code.trim() || code === it.q.starter) {
        reviews.push({ earned: 0, tests: { passed: 0, total } });
        continue;
      }
      setMarkingNote(`Running your code for question ${i + 1} in R`);
      const res = await r.task(code, it.q.run, it.q.tests as unknown as RTest[]);
      const passed = res.run.error ? 0 : res.outcomes.filter((o) => o.pass).length;
      reviews.push({ earned: writeMarks(it.marks, passed, total), tests: { passed, total } });
    }
    const earned = reviews.map((rv) => rv.earned ?? 0);
    const summary = summarize(kind, title, items, earned, {
      durationMs: Math.min(limitMs, finishedAt - startedAt.current), limitMs, timedOut, finishedAt,
    });
    clearStatProgress(persistKey);
    store.ready
      .then(() => store.append({
        type: 'stat_test', kind, lessonIds, score: summary.earned, total: summary.total,
        durationMs: summary.durationMs, timedOut, qids: items.map((it) => it.q.id), earned,
      }))
      .catch((err: unknown) => setSaveError(err instanceof Error ? err.message : String(err)));
    setMarked({ reviews, summary });
    setPhase('results');
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // The clock: a paper whose time ran out while it was away is marked straight away.
  useEffect(() => {
    if (phase !== 'running') return;
    const tick = () => { if (Date.now() - startedAt.current >= limitMs) void finishRef.current(true); };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => { topRef.current?.focus(); }, [current]);

  if (phase === 'results' && marked) {
    return <StatResults kind={kind} items={items} answers={answers} reviews={marked.reviews} summary={marked.summary} saveError={saveError} actions={actions(marked.summary)} extra={extra?.(marked.summary)} />;
  }

  if (phase === 'marking') {
    return (
      <div class="tx-page">
        <section class="tx-card sx-marking" role="status" aria-live="polite">
          <h1 class="sx-h">Marking your paper</h1>
          <p class="tx-muted">{markingNote || 'Adding up your marks'}…</p>
        </section>
      </div>
    );
  }

  const it = items[current];
  const answered = answers.filter((a) => a !== undefined).length;
  const unanswered = items.length - answered;
  const last = current === items.length - 1;
  const isFlagged = flagged.has(current);

  return (
    <div class="tr" data-kind={kind}>
      <header class="tr-bar">
        <div class="tr-bar-title">
          <span class="tr-bar-kind">{STAT_TEST_TITLE[kind]}</span>
          <span class="tr-bar-sep" aria-hidden="true" />
          <h1>{title}</h1>
        </div>
        <nav class="tr-nav" aria-label="Questions">
          <ol class="tr-nav-list">
            {items.map((item, i) => {
              const a = answers[i] !== undefined;
              const f = flagged.has(i);
              const state = [a ? 'answered' : 'not answered', f ? 'flagged' : ''].filter(Boolean).join(', ');
              return (
                <li key={item.q.id}>
                  <button type="button" class={`tr-nav-btn${i === current ? ' current' : ''}${a ? ' answered' : ''}${f ? ' flagged' : ''}`}
                    aria-current={i === current ? 'step' : undefined} aria-label={`Question ${i + 1}, ${state}`} title={`Question ${i + 1}: ${state}`}
                    onClick={() => setCurrent(i)} />
                </li>
              );
            })}
          </ol>
          <span class="tr-nav-count" aria-hidden="true">Question <b>{current + 1}</b> of {items.length}</span>
        </nav>
        <div class="tr-bar-end">
          <span class="tr-timer" title="Time left. The paper is marked by itself at 0:00.">
            <Icon name="clock" />
            <TimeLeft startedAt={startedAt.current} limitMs={limitMs} />
            <span class="sr-only">left</span>
          </span>
          <Button variant={unanswered === 0 ? 'primary' : 'secondary'} onClick={() => (unanswered || flagged.size ? setFinishOpen(true) : void finish(false))}>Finish</Button>
        </div>
      </header>

      <div class="tr-scroll">
        <div class={`tr-body${it.q.kind === 'write' ? ' code' : ''}`}>
          <section class="tr-card" aria-labelledby="sx-q-heading">
            <div class="tr-meta">
              <h2 id="sx-q-heading" class="sr-only" ref={topRef} tabIndex={-1}>Question {current + 1} of {items.length}</h2>
              <span class="tx-eyebrow">{LESSON_BY_ID[it.q.lessonId]?.title ?? ''}</span>
              <Button class="tr-flag" aria-pressed={isFlagged} onClick={() => toggleFlag(current)}>
                <Icon name="flag" /> {isFlagged ? 'Flagged' : 'Flag for review'}
              </Button>
            </div>
            <StatQuestionView key={it.q.id} item={it} number={current + 1} answer={answers[current]} onAnswer={(a) => answer(current, a)} />
          </section>

          <div class="tr-foot">
            <div class={`tr-saved${answers[current] !== undefined ? ' on' : ''}`} aria-live="polite">
              {answers[current] !== undefined
                ? <><Icon name="check" /><span>Answer kept</span></>
                : <><span class="tr-saved-dot" aria-hidden="true" /><span>Not answered yet</span></>}
            </div>
            <span class="spacer" />
            <Button variant="ghost" onClick={() => setCurrent(current - 1)} disabled={current === 0}><Icon name="arrowLeft" /> Previous</Button>
            {!last
              ? <Button variant="secondary" onClick={() => setCurrent(current + 1)}>Next <Icon name="arrowRight" /></Button>
              : <Button variant={unanswered === 0 ? 'primary' : 'secondary'} onClick={() => setFinishOpen(true)}>Finish</Button>}
          </div>
        </div>
      </div>

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish and mark the paper?"
        size="sm"
        class="tx-dialog"
        initialFocus=".sx-finish-keep"
        footer={
          <>
            <Button class="sx-finish-keep" variant="ghost" onClick={() => setFinishOpen(false)}>Keep going</Button>
            <Button variant="primary" onClick={() => void finish(false)}>Finish and mark</Button>
          </>
        }
      >
        {unanswered > 0
          ? <p>{unanswered} {unanswered === 1 ? 'question has' : 'questions have'} no answer and will score zero.</p>
          : <p>Every question has an answer.</p>}
        {flagged.size ? <p class="muted">Flagged: {[...flagged].sort((a, b) => a - b).map((i) => i + 1).join(', ')}.</p> : null}
        <p class="muted tx-mono"><TimeLeft startedAt={startedAt.current} limitMs={limitMs} /> left</p>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- results

function StatResults({ kind, items, answers, reviews, summary, saveError, actions, extra }: {
  kind: StatTestKind;
  items: StatItem[];
  answers: (StatAnswer | undefined)[];
  reviews: StatReview[];
  summary: StatSummary;
  saveError: string | null;
  actions: ComponentChildren;
  extra?: ComponentChildren;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headRef.current?.focus(); }, []);
  const toggle = (i: number) => {
    const next = new Set(open);
    if (next.has(i)) next.delete(i); else next.add(i);
    setOpen(next);
  };
  const allOpen = open.size === items.length;

  return (
    <div class="tx-page trs">
      <div class="trs-top">
        <section class="tx-card trs-main" aria-labelledby="sx-results">
          <span class="tx-eyebrow">{STAT_TEST_TITLE[kind]} · results</span>
          <h1 id="sx-results" ref={headRef} tabIndex={-1}>{summary.title}</h1>
          <div class="trs-score" aria-live="polite">
            <span class="trs-big" aria-label={`${summary.earned} of ${summary.total} marks`}>{summary.earned}<span>/{summary.total}</span></span>
            <span class="trs-pct">{summary.percent}%</span>
          </div>
          <dl class="trs-facts">
            <div><dt>Time</dt><dd>{formatClock(summary.durationMs)} of {formatClock(summary.limitMs)}</dd></div>
            <div><dt>Answered</dt><dd>{answers.filter((a) => a !== undefined).length}/{items.length}</dd></div>
            {summary.timedOut ? <div><dd>Time ran out</dd></div> : null}
          </dl>
          {extra ? <div class="trs-extra">{extra}</div> : null}
          {saveError ? <p class="trs-error" role="alert"><Icon name="alert" /> Not saved to your history: {saveError}</p> : null}
          <div class="tx-actions">{actions}</div>
        </section>

        {summary.perLesson.length > 1 ? (
          <section class="tx-card trs-bars" aria-labelledby="sx-bars">
            <h2 id="sx-bars" class="tx-eyebrow">By lesson</h2>
            {summary.perLesson.map((row) => {
              const p = row.total ? Math.round((row.earned / row.total) * 100) : 0;
              return (
                <div class="trs-bar-row" key={row.lessonId}>
                  <span class="trs-bar-name"><a href={href.lesson(row.lessonId)}>{LESSON_BY_ID[row.lessonId]?.title ?? row.lessonId}</a></span>
                  <span class="trs-bar-end"><span class="trs-bar-score">{row.earned}/{row.total} · {p}%</span></span>
                  <span class="trs-track" aria-hidden="true"><span class={`trs-fill${p < 60 ? ' weak' : ''}`} style={{ width: `${p}%` }} /></span>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>

      <section class="tx-card" aria-labelledby="sx-review">
        <div class="tx-card-head">
          <h2 id="sx-review">Your answers</h2>
          <button type="button" class="tx-textbtn" onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((_, i) => i)))}>
            {allOpen ? 'Close all' : 'Open all'}
          </button>
        </div>
        <ol class="sx-review">
          {items.map((it, i) => {
            const rv = reviews[i];
            const full = rv.earned !== null && rv.earned >= it.marks;
            return (
              <li key={it.q.id} class={`sx-review-row${full ? ' is-right' : ''}`}>
                <button type="button" class="sx-review-head" aria-expanded={open.has(i)} onClick={() => toggle(i)}>
                  <span class="sx-review-mark" aria-hidden="true"><Icon name={full ? 'check' : rv.earned ? 'dot' : 'x'} size={12} /></span>
                  <span class="sx-review-n">Question {i + 1}</span>
                  <span class="sx-review-lesson">{LESSON_BY_ID[it.q.lessonId]?.title ?? ''}</span>
                  <span class="sx-review-score num">{rv.earned ?? '–'}/{it.marks}</span>
                  <Icon name={open.has(i) ? 'chevronUp' : 'chevronDown'} size={14} />
                </button>
                {open.has(i) ? (
                  <div class="sx-review-body">
                    <StatQuestionView item={it} number={i + 1} answer={answers[i]} review={rv} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
