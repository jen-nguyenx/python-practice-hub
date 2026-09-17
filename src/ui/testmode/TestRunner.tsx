// Timed test runner shared by the topic test and the mid-semester practice test.
// One question at a time, one check per question, answers saved silently, results and review at the end.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import { CODE_FORMATS, FORMAT_LABEL } from '../../content/ids.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { GradeResult } from '../../engine/types.ts';
import { py, store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { FORMAT_COMPONENTS } from '../formats/registry.ts';
import { WorkbenchContext } from '../workbench/context.ts';
import { Button } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Chip, DiffChip } from '../components/Chip.tsx';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { formatClock, formatDuration, plural } from '../report/format.ts';
import { useLeaveGuard } from './leaveGuard.ts';
import type { SavedAnswer, TestItem, TestSummary } from './summary.ts';
import { buildTestEvents, summarizeTest, weakTopics } from './summary.ts';
import './testmode.css';

export type { TestItem, TestSummary } from './summary.ts';

export interface TestRunnerProps {
  title: string;
  questions: TestItem[];
  durationMin: number;
  mode: 'topic-test' | 'midsem';
  onFinish: (summary: TestSummary) => void;
  /** Extra content shown under the score on the results view (for example the unlock message). */
  resultExtra?: (summary: TestSummary) => ComponentChildren;
  /** Buttons at the end of the results view. */
  resultActions?: (summary: TestSummary) => ComponentChildren;
}

const WARN_MS = 5 * 60 * 1000;
const LEAVE_MESSAGE = 'Leave the test? Your answers in this test will not be saved.';

export function TestRunner({ title, questions, durationMin, mode, onFinish, resultExtra, resultActions }: TestRunnerProps) {
  const limitMs = Math.max(1, durationMin) * 60 * 1000;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [phase, setPhase] = useState<'running' | 'results'>('running');
  const [current, setCurrent] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [announce, setAnnounce] = useState('');
  const [timerAnnounce, setTimerAnnounce] = useState('');
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const startedAt = useRef(Date.now());
  const answers = useRef(new Map<number, SavedAnswer>());
  const drafts = useRef(new Map<number, unknown>());
  const flagged = useRef(new Set<number>());
  const timeSpent = useRef<number[]>(questions.map(() => 0));
  const enteredAt = useRef(Date.now());
  const currentRef = useRef(0);
  const finishing = useRef(false);
  const warned = useRef({ five: false, one: false });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  const running = phase === 'running';
  useLeaveGuard(running && questions.length > 0, LEAVE_MESSAGE);

  useEffect(() => {
    if (questions.some((it) => CODE_FORMATS.includes(it.q.format))) py.warmUp();
  }, []);

  const addTimeOnCurrent = () => {
    const t = Date.now();
    timeSpent.current[currentRef.current] += t - enteredAt.current;
    enteredAt.current = t;
  };

  const finish = (timedOut: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    addTimeOnCurrent();
    if (dialogRef.current?.open) dialogRef.current.close();
    const finishedAt = Date.now();
    const s = summarizeTest({
      kind: mode, title, items: questions, answers: answers.current, flagged: flagged.current, timeSpent: timeSpent.current,
      durationMs: Math.min(limitMs, finishedAt - startedAt.current), limitMs, timedOut, finishedAt,
    });
    const events = buildTestEvents(s, questions, answers.current);
    store.ready
      .then(() => { for (const e of events) store.append(e); })
      .catch((err: unknown) => setSaveError(err instanceof Error ? err.message : String(err)));
    setSummary(s);
    setPhase('results');
    try { onFinish(s); } catch { /* the caller's problem; results still show */ }
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  // Countdown: warn at 5 minutes and 1 minute, finish at 0.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const left = limitMs - (t - startedAt.current);
      if (left <= 0) {
        finishRef.current(true);
      } else if (left <= 60000 && !warned.current.one && limitMs > 60000) {
        warned.current.one = true;
        setTimerAnnounce('1 minute left.');
      } else if (left <= WARN_MS && !warned.current.five && limitMs > WARN_MS) {
        warned.current.five = true;
        setTimerAnnounce('5 minutes left. Unanswered questions score zero.');
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, limitMs]);

  useEffect(() => {
    if (phase === 'results') {
      window.scrollTo(0, 0);
      resultsHeading.current?.focus();
    }
  }, [phase]);

  const goTo = (i: number, focus = true) => {
    if (i < 0 || i >= questions.length || i === currentRef.current) return;
    addTimeOnCurrent();
    currentRef.current = i;
    setCurrent(i);
    setAnnounce('');
    if (focus) requestAnimationFrame(() => questionHeading.current?.focus());
  };

  const onCheckFor = (i: number) => (result: GradeResult, response: unknown) => {
    if (finishing.current || answers.current.has(i)) return;
    const extra = currentRef.current === i ? Date.now() - enteredAt.current : 0;
    answers.current.set(i, { result, response, timeMs: timeSpent.current[i] + extra });
    setAnnounce(`Answer saved for question ${i + 1}.`);
    rerender(0);
  };

  const toggleFlag = (i: number) => {
    if (flagged.current.has(i)) flagged.current.delete(i);
    else flagged.current.add(i);
    rerender(0);
  };

  const requestFinish = () => {
    const unanswered = questions.length - answers.current.size;
    if (unanswered > 0 || flagged.current.size > 0) dialogRef.current?.showModal();
    else finish(false);
  };

  if (questions.length === 0) {
    return <div class="empty-state">No questions to show.</div>;
  }

  if (phase === 'results' && summary) {
    return (
      <TestResults summary={summary} items={questions} answers={answers.current} drafts={drafts.current} mode={mode}
        durationMin={durationMin} headingRef={resultsHeading} saveError={saveError} extra={resultExtra?.(summary)} actions={resultActions?.(summary)} />
    );
  }

  const left = Math.max(0, limitMs - (now - startedAt.current));
  const lowTime = left <= WARN_MS;
  const item = questions[current];
  const Comp = FORMAT_COMPONENTS[item.q.format];
  const answered = answers.current.has(current);
  const isFlagged = flagged.current.has(current);
  const answeredCount = answers.current.size;
  const unanswered = questions.length - answeredCount;
  const topic = TOPIC_BY_ID[item.topicId];

  return (
    <div class="tr">
      <div class="tr-bar">
        <div class="tr-bar-title">
          <span class="label">{mode === 'midsem' ? 'Mid-sem practice test' : 'Topic test'}</span>
          <h1 class="tr-h1">{title}</h1>
        </div>
        <div class="tr-bar-stats">
          <span class="tr-count num" aria-label={`${answeredCount} of ${questions.length} answered`}>
            <Icon name="check" /> {answeredCount}/{questions.length} answered
          </span>
          <span class={`tr-timer num${lowTime ? ' low' : ''}`} role="timer" aria-label={`Time left ${formatClock(left)}`}>
            <Icon name={lowTime ? 'alert' : 'clock'} />
            <span>{formatClock(left)}</span>
            <span class="tr-timer-word">{lowTime ? 'left, nearly out of time' : 'left'}</span>
          </span>
          <Button variant="primary" onClick={requestFinish}>Finish test</Button>
        </div>
        <div class="sr-only" aria-live="assertive">{timerAnnounce}</div>
      </div>

      <nav class="tr-nav" aria-label="Questions">
        <ol class="tr-nav-list">
          {questions.map((it, i) => {
            const a = answers.current.has(i);
            const f = flagged.current.has(i);
            const state = [a ? 'answered' : 'not answered', f ? 'flagged for review' : ''].filter(Boolean).join(', ');
            return (
              <li key={it.q.id}>
                <button type="button" class={`tr-nav-btn${i === current ? ' current' : ''}${a ? ' answered' : ''}${f ? ' flagged' : ''}`}
                  aria-current={i === current ? 'step' : undefined} aria-label={`Question ${i + 1}, ${state}`} onClick={() => goTo(i)}>
                  <span class="num">{i + 1}</span>
                  {f ? <Icon name="flag" size={12} class="tr-nav-flag" /> : a ? <Icon name="check" size={12} class="tr-nav-check" /> : null}
                </button>
              </li>
            );
          })}
        </ol>
        <p class="tr-nav-legend faint">
          <span><Icon name="check" size={12} /> answered</span>
          <span><Icon name="flag" size={12} /> flagged</span>
          <span>{plural(unanswered, 'question')} not answered</span>
        </p>
      </nav>

      {lowTime ? (
        <div class="tr-lowtime" role="status">
          <Icon name="alert" /> Under 5 minutes left. The test finishes by itself at 0:00; saved answers count.
        </div>
      ) : null}

      <section class="tr-q card" aria-labelledby="tr-q-heading">
        <header class="tr-q-head">
          <div class="row tr-q-meta">
            <span class="label num">Question {current + 1} of {questions.length}</span>
            <span class="faint">·</span>
            <span class="muted">{topic?.short ?? item.topicId}</span>
            <Chip>{FORMAT_LABEL[item.q.format]}</Chip>
            <DiffChip diff={item.q.diff} />
          </div>
          <h2 id="tr-q-heading" ref={questionHeading} tabIndex={-1}>{item.q.title}</h2>
          <Markdown text={item.q.prompt} class="tr-prompt" />
        </header>

        <div class="tr-q-body">
          <Comp
            key={item.q.id}
            q={item.q}
            topicId={item.topicId}
            generated={item.generated}
            mode={mode}
            checksLeft={1}
            revealed={false}
            locked={answered}
            onCheck={onCheckFor(current)}
            draft={drafts.current.get(current)}
            onDraft={(d: unknown) => { drafts.current.set(current, d); }}
          />
        </div>

        <footer class="tr-q-foot">
          <div class={`tr-saved${answered ? ' on' : ''}`} aria-live="polite">
            {answered
              ? <><Icon name="check" /> Answer saved. You see how you did when the test ends.</>
              : <><Icon name="info" /> One check for this question. Your answer is saved when you check or submit.</>}
            <span class="sr-only">{announce}</span>
          </div>
          <div class="tr-q-actions">
            <Button variant={isFlagged ? 'hint' : 'ghost'} aria-pressed={isFlagged} onClick={() => toggleFlag(current)}>
              <Icon name="flag" /> {isFlagged ? 'Flagged for review' : 'Flag for review'}
            </Button>
            <span class="spacer" />
            <Button onClick={() => goTo(current - 1)} disabled={current === 0}><Icon name="arrowLeft" /> Previous</Button>
            {current < questions.length - 1
              ? <Button variant={answered ? 'primary' : 'secondary'} onClick={() => goTo(current + 1)}>Next <Icon name="arrowRight" /></Button>
              : <Button variant="primary" onClick={requestFinish}>Finish test</Button>}
          </div>
        </footer>
      </section>

      <dialog ref={dialogRef} class="tr-dialog" aria-labelledby="tr-dialog-title">
        <h2 id="tr-dialog-title">Finish the test?</h2>
        <div class="stack">
          {unanswered > 0 ? (
            <p>{plural(unanswered, 'question')} {unanswered === 1 ? 'has' : 'have'} no saved answer and will score zero. Code you typed but did not check or submit is not marked.</p>
          ) : <p>Every question has a saved answer.</p>}
          {flagged.current.size > 0 ? <p>{plural(flagged.current.size, 'question')} flagged for review: {[...flagged.current].sort((a, b) => a - b).map((i) => i + 1).join(', ')}.</p> : null}
          <p class="muted num">Time left: {formatClock(left)}</p>
        </div>
        <div class="tr-dialog-actions">
          <Button onClick={() => dialogRef.current?.close()}>Keep going</Button>
          {unanswered > 0 ? (
            <Button onClick={() => {
              dialogRef.current?.close();
              const next = questions.findIndex((_, i) => !answers.current.has(i));
              if (next >= 0) goTo(next);
            }}>Go to first unanswered</Button>
          ) : null}
          <Button variant="primary" onClick={() => finish(false)}>Finish and see results</Button>
        </div>
      </dialog>
    </div>
  );
}

// ---------------------------------------------------------------- results

function TestResults({ summary, items, answers, drafts, mode, durationMin, headingRef, saveError, extra, actions }: {
  summary: TestSummary;
  items: readonly TestItem[];
  answers: ReadonlyMap<number, SavedAnswer>;
  drafts: ReadonlyMap<number, unknown>;
  mode: 'topic-test' | 'midsem';
  durationMin: number;
  headingRef: { current: HTMLHeadingElement | null };
  saveError: string | null;
  extra?: ComponentChildren;
  actions?: ComponentChildren;
}) {
  const [open, setOpen] = useState<Set<number>>(() => new Set());
  const weak = useMemo(() => weakTopics(summary), [summary]);
  const toggle = (i: number) => {
    const next = new Set(open);
    if (next.has(i)) next.delete(i); else next.add(i);
    setOpen(next);
  };
  const allOpen = open.size === items.length;

  return (
    <div class="tr tr-results">
      <section class="card tr-score" aria-labelledby="tr-results-heading">
        <div class="tr-score-main">
          <span class="label">{mode === 'midsem' ? 'Mid-sem practice test' : 'Topic test'} · results</span>
          <h1 id="tr-results-heading" ref={headingRef} tabIndex={-1} class="tr-h1">{summary.title}</h1>
          <div class="tr-score-figures" aria-live="polite">
            <p class="tr-score-big num"><strong>{summary.correct}</strong><span class="muted"> of {summary.total} correct</span></p>
            <p class="tr-score-pct num">{summary.percent}%</p>
            {summary.passed
              ? <Chip tone="ok"><Icon name="check" size={12} /> Passed</Chip>
              : <Chip tone="bad"><Icon name="x" size={12} /> Not passed · {summary.passMark} of {summary.total} needed</Chip>}
          </div>
        </div>
        <dl class="tr-score-facts num">
          <div><dt>Time taken</dt><dd>{formatDuration(summary.durationMs)} <span class="muted">of {durationMin} min</span>{summary.timedOut ? <span class="muted"> · time ran out</span> : null}</dd></div>
          <div><dt>Answered</dt><dd>{summary.answered} of {summary.total}</dd></div>
          <div><dt>Pass mark</dt><dd>{summary.passMark} correct</dd></div>
        </dl>
      </section>

      {saveError ? <Callout tone="bad" title="Results could not be saved">{saveError}. Your score is shown here but will not appear in your report.</Callout> : null}
      {extra}

      <section class="tr-section" aria-labelledby="tr-by-topic">
        <h2 id="tr-by-topic">By topic</h2>
        <div class="tr-table-wrap">
          <table class="tr-table">
            <caption class="sr-only">Correct answers per topic</caption>
            <thead><tr><th scope="col">Topic</th><th scope="col" class="n">Correct</th><th scope="col" class="n">Score</th><th scope="col" class="bar-col"><span class="sr-only">Bar</span></th></tr></thead>
            <tbody>
              {summary.perTopic.map((t) => {
                const p = t.total ? Math.round((t.correct / t.total) * 100) : 0;
                return (
                  <tr key={t.topicId}>
                    <th scope="row"><a href={href.topic(t.topicId)}>{TOPIC_BY_ID[t.topicId]?.title ?? t.topicId}</a></th>
                    <td class="n num">{t.correct} / {t.total}</td>
                    <td class="n num">{p}%</td>
                    <td class="bar-col"><span class="tr-bar-track" aria-hidden="true"><span class="tr-bar-fill" style={{ width: `${p}%` }} /></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section class="tr-section" aria-labelledby="tr-practise">
        <h2 id="tr-practise">Practise weak topics</h2>
        {weak.length ? (
          <ul class="tr-weak">
            {weak.map((t) => (
              <li key={t.topicId}>
                <a href={href.topic(t.topicId)}>Practise {TOPIC_BY_ID[t.topicId]?.title ?? t.topicId}</a>
                <span class="muted num"> · {t.correct} of {t.total} correct</span>
              </li>
            ))}
          </ul>
        ) : <p class="muted">Every topic in this test scored 70% or more. Try a longer test or add more topics.</p>}
      </section>

      <section class="tr-section" aria-labelledby="tr-review">
        <div class="row">
          <h2 id="tr-review">Question by question</h2>
          <span class="spacer" />
          <Button size="sm" variant="ghost" onClick={() => setOpen(allOpen ? new Set() : new Set(items.map((_, i) => i)))}>
            {allOpen ? 'Close all' : 'Review all'}
          </Button>
        </div>
        <ol class="tr-review-list">
          {summary.outcomes.map((o) => {
            const it = items[o.index];
            const a = answers.get(o.index);
            const isOpen = open.has(o.index);
            const status = !o.answered ? 'Not answered' : o.correct ? 'Correct' : o.score > 0 ? `Partly right · ${Math.round(o.score * 100)}%` : 'Not correct';
            const tone = !o.answered ? 'neutral' : o.correct ? 'ok' : 'bad';
            return (
              <li key={o.qid} class={`tr-review-item ${tone}`}>
                <div class="tr-review-row">
                  <span class="tr-review-n num">{o.index + 1}</span>
                  <span class={`tr-review-status ${tone}`}>
                    <Icon name={!o.answered ? 'info' : o.correct ? 'check' : 'x'} size={14} /> {status}
                  </span>
                  <span class="tr-review-title">{o.title}</span>
                  <span class="tr-review-meta">
                    <span class="muted">{TOPIC_BY_ID[o.topicId]?.short}</span>
                    <Chip>{FORMAT_LABEL[o.format]}</Chip>
                    <DiffChip diff={o.diff} />
                    {o.flagged ? <Chip tone="hint"><Icon name="flag" size={11} /> flagged</Chip> : null}
                    <span class="faint num">{o.timeMs >= 1000 ? formatDuration(o.timeMs) : ''}</span>
                  </span>
                  <Button size="sm" aria-expanded={isOpen} aria-controls={`tr-rev-${o.index}`} onClick={() => toggle(o.index)}>
                    <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={14} /> {isOpen ? 'Hide' : 'Review'}
                  </Button>
                </div>
                {isOpen ? (
                  <div class="tr-review-body" id={`tr-rev-${o.index}`}>
                    <ReviewPanel item={it} answer={a} draft={drafts.get(o.index)} mode={mode} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </section>

      <div class="tr-end-actions">{actions}</div>
    </div>
  );
}

const noop = () => {};
/** The review panel shows the worked answer itself, so code formats should not repeat the model answer. */
const REVIEW_CONTEXT = { layout: 'simple' as const, pageShowsAnswer: true };

function ReviewPanel({ item, answer, draft, mode }: { item: TestItem; answer?: SavedAnswer; draft: unknown; mode: 'topic-test' | 'midsem' }) {
  const Comp = FORMAT_COMPONENTS[item.q.format];
  const mistakes = answer ? answer.result.mistakes.map((m) => m.id).filter((id, i, xs) => xs.indexOf(id) === i) : [];
  return (
    <div class="tr-review-panel">
      {answer?.result.feedback ? <p class="muted">{answer.result.feedback}</p> : null}
      {mistakes.length ? (
        <div class="tr-review-mistakes">
          <span class="label">What went wrong</span>
          <ul>{mistakes.map((id) => <li key={id}>{MISTAKES[id]?.label ?? 'Another mistake'}</li>)}</ul>
        </div>
      ) : null}
      <details class="tr-review-prompt">
        <summary>Question</summary>
        <Markdown text={item.q.prompt} />
      </details>
      <div class="tr-review-comp">
        <WorkbenchContext.Provider value={REVIEW_CONTEXT}>
          <Comp q={item.q} topicId={item.topicId} generated={item.generated} mode={mode} checksLeft={0}
            revealed={true} locked={true} onCheck={noop} draft={draft} onDraft={noop} />
        </WorkbenchContext.Provider>
      </div>
      <div class="tr-solution">
        <span class="label">Worked answer</span>
        <Markdown text={item.q.solution.explanation} />
        {item.q.solution.code ? <CodeBlock code={item.q.solution.code} numbered label="Model answer" /> : null}
      </div>
      <p><a href={href.question(item.q.id)}>Practise this question with hints</a></p>
    </div>
  );
}

