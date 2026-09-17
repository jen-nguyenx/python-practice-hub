// Timed test runner shared by the topic test and the mid-semester practice test.
// While running it takes the whole workspace (mainFill, so the frame hides its global bar): a focused test bar (title,
// question dots + "Question N of M", countdown, Finish) over one scrolling column with the question in a white card.
// One check per question, answers saved silently, results and review at the end.
import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useReducer, useRef, useState } from 'preact/hooks';
import { CODE_FORMATS, FORMAT_LABEL, FORMAT_LADDER } from '../../content/ids.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { GradeResult } from '../../engine/types.ts';
import { py, store } from '../../app/services.ts';
import { FORMAT_COMPONENTS } from '../formats/registry.ts';
import { Button } from '../components/Button.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { mainFill } from '../shell/uiState.ts';
import { plural } from '../report/format.ts';
import { useLeaveGuard } from './leaveGuard.ts';
import { TimeLeft } from './TimeLeft.tsx';
import type { TestProgress } from './progress.ts';
import { clearProgress, writeProgress } from './progress.ts';
import type { SavedAnswer, TestItem, TestSummary } from './summary.ts';
import { buildTestEvents, summarizeTest } from './summary.ts';
import { TestResults } from './TestResults.tsx';
import './testmode.css';

export type { TestItem, TestSummary } from './summary.ts';

export interface TestRunnerProps {
  title: string;
  questions: TestItem[];
  durationMin: number;
  mode: 'topic-test' | 'midsem';
  onFinish: (summary: TestSummary) => void;
  /** One quiet line under the score on the results view (for example the unlock message or a best score). */
  resultExtra?: (summary: TestSummary) => ComponentChildren;
  /** The results view's actions (one primary). */
  resultActions?: (summary: TestSummary) => ComponentChildren;
  /**
   * Save progress under this key (topic id, or "midsem") after every answer, flag, move and draft change,
   * so the test can be resumed after a reload or a discarded tab. Cleared when the test finishes.
   */
  persistKey?: string;
  /** Saved progress to continue from. `questions` must be the items for `resume.qids`, in order. */
  resume?: TestProgress;
}

const WARN_MS = 5 * 60 * 1000;
const LEAVE_MESSAGE = 'Leave the test? The timer keeps running. Your saved answers are kept, and you can carry on from the test page until time is up.';

export function TestRunner({ title, questions, durationMin, mode, onFinish, resultExtra, resultActions, persistKey, resume }: TestRunnerProps) {
  const limitMs = Math.max(1, durationMin) * 60 * 1000;
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const [phase, setPhase] = useState<'running' | 'results'>('running');
  const [current, setCurrent] = useState(() => resume?.current ?? 0);
  const [lowTime, setLowTime] = useState(false);
  const [announce, setAnnounce] = useState('');
  const [timerAnnounce, setTimerAnnounce] = useState('');
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);

  const startedAt = useRef(resume?.startedAt ?? Date.now());
  const answers = useRef(new Map<number, SavedAnswer>(resume?.answers ?? []));
  const drafts = useRef(new Map<number, unknown>(resume?.drafts ?? []));
  const flagged = useRef(new Set<number>(resume?.flagged ?? []));
  const timeSpent = useRef<number[]>(questions.map((_, i) => resume?.timeSpent[i] ?? 0));
  const enteredAt = useRef(Date.now());
  const currentRef = useRef(resume?.current ?? 0);
  const saveTimer = useRef<number | undefined>(undefined);
  const finishing = useRef(false);
  const warned = useRef({ five: false, one: false });
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resultsHeading = useRef<HTMLHeadingElement>(null);

  const running = phase === 'running' && questions.length > 0;
  useLeaveGuard(running, LEAVE_MESSAGE);

  // Full-height workspace while the test runs; the normal scrolling page comes back for results and on leaving.
  useLayoutEffect(() => {
    if (!running) return;
    mainFill.value = true;
    return () => { mainFill.value = false; };
  }, [running]);

  useEffect(() => {
    if (questions.some((it) => CODE_FORMATS.includes(it.q.format))) py.warmUp();
  }, []);

  // ---- saved progress ----
  const saveProgress = () => {
    window.clearTimeout(saveTimer.current);
    saveTimer.current = undefined;
    if (!persistKey || finishing.current) return;
    const spent = timeSpent.current.slice();
    spent[currentRef.current] += Date.now() - enteredAt.current;
    writeProgress({
      v: 1, kind: mode, key: persistKey, title, qids: questions.map((it) => it.q.id), durationMin,
      startedAt: startedAt.current, savedAt: Date.now(), current: currentRef.current,
      answers: [...answers.current.entries()], flagged: [...flagged.current], timeSpent: spent,
      drafts: [...drafts.current.entries()],
    });
  };
  const saveRef = useRef(saveProgress);
  saveRef.current = saveProgress;
  const scheduleSave = () => {
    if (!persistKey || saveTimer.current !== undefined) return;
    saveTimer.current = window.setTimeout(() => saveRef.current(), 1000);
  };

  // Layout effect: registered before paint, so even a test left straight after it starts is saved on unmount.
  useLayoutEffect(() => {
    if (!persistKey) return;
    saveRef.current();
    const onHide = () => { if (document.visibilityState === 'hidden') saveRef.current(); };
    const onPageHide = () => saveRef.current();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      // Leaving inside the app keeps the progress (the guard says so). No-op once the test has finished.
      saveRef.current();
    };
  }, [persistKey]);

  const addTimeOnCurrent = () => {
    const t = Date.now();
    timeSpent.current[currentRef.current] += t - enteredAt.current;
    enteredAt.current = t;
  };

  const finish = (timedOut: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    window.clearTimeout(saveTimer.current);
    if (persistKey) clearProgress(mode, persistKey);
    addTimeOnCurrent();
    setFinishOpen(false);
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

  // Countdown: warn at 5 minutes and 1 minute, finish at 0. The runner only re-renders when a warning fires;
  // the visible clocks tick on their own (TimeLeft) so the question and its editor are not re-rendered every tick.
  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const left = limitMs - (Date.now() - startedAt.current);
      if (left <= 0) {
        finishRef.current(true);
        return;
      }
      if (left <= WARN_MS && !warned.current.five) {
        warned.current.five = true;
        setLowTime(true);
        if (limitMs > WARN_MS) setTimerAnnounce('5 minutes left. Unanswered questions score zero.');
      }
      if (left <= 60000 && !warned.current.one && limitMs > 60000) {
        warned.current.one = true;
        setTimerAnnounce('1 minute left.');
      }
    };
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [running, limitMs]);

  useEffect(() => {
    if (phase !== 'results') return;
    // main scrolls (not the window) once the full-height workspace is gone.
    requestAnimationFrame(() => {
      document.getElementById('main')?.scrollTo(0, 0);
      resultsHeading.current?.focus({ preventScroll: true });
    });
  }, [phase]);

  /** New question: both panes back to the top, focus on its heading. */
  const showQuestionTop = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    questionHeading.current?.focus({ preventScroll: true });
  };

  const goTo = (i: number, focus = true) => {
    if (i < 0 || i >= questions.length || i === currentRef.current) return;
    addTimeOnCurrent();
    currentRef.current = i;
    setCurrent(i);
    setAnnounce('');
    saveProgress();
    if (focus) requestAnimationFrame(showQuestionTop);
  };

  const onCheckFor = (i: number) => (result: GradeResult, response: unknown) => {
    if (finishing.current || answers.current.has(i)) return;
    const extra = currentRef.current === i ? Date.now() - enteredAt.current : 0;
    answers.current.set(i, { result, response, timeMs: timeSpent.current[i] + extra });
    setAnnounce(`Answer saved for question ${i + 1}.`);
    saveProgress();
    rerender(0);
  };

  const toggleFlag = (i: number) => {
    if (flagged.current.has(i)) flagged.current.delete(i);
    else flagged.current.add(i);
    saveProgress();
    rerender(0);
  };

  /** Roving focus in the question number list, so Tab moves past it in one step. */
  const navKeys = (e: KeyboardEvent) => {
    const buttons = Array.from((e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('.tr-nav-btn'));
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(buttons.length - 1, at + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, at - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = buttons.length - 1;
    if (next < 0) return;
    e.preventDefault();
    buttons[next].focus();
    buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const requestFinish = () => {
    const unanswered = questions.length - answers.current.size;
    if (unanswered > 0 || flagged.current.size > 0) setFinishOpen(true);
    else finish(false);
  };

  if (questions.length === 0) {
    return <div class="tr-empty">No questions to show.</div>;
  }

  if (phase === 'results' && summary) {
    return (
      <TestResults summary={summary} items={questions} answers={answers.current} drafts={drafts.current} mode={mode}
        headingRef={resultsHeading} saveError={saveError} extra={resultExtra?.(summary)} actions={resultActions?.(summary)} />
    );
  }

  const item = questions[current];
  const Comp = FORMAT_COMPONENTS[item.q.format];
  const isCode = CODE_FORMATS.includes(item.q.format);
  const isRead = FORMAT_LADDER[item.q.format] === 'read';
  const answered = answers.current.has(current);
  const isFlagged = flagged.current.has(current);
  const answeredCount = answers.current.size;
  const unanswered = questions.length - answeredCount;
  const allAnswered = unanswered === 0;
  const topic = TOPIC_BY_ID[item.topicId];
  const last = current === questions.length - 1;
  const flaggedList = [...flagged.current].sort((a, b) => a - b).map((i) => i + 1);
  const pips = item.q.diff === 'easy' ? 1 : item.q.diff === 'medium' ? 2 : 3;

  return (
    <div class="tr" data-kind={mode}>
      <header class="tr-bar">
        <div class="tr-bar-title">
          <span class="tr-bar-kind">{mode === 'midsem' ? 'Practice test' : 'Topic test'}</span>
          <span class="tr-bar-sep" aria-hidden="true" />
          <h1>{title}</h1>
        </div>

        <nav class="tr-nav" aria-label="Questions">
          <p id="tr-nav-hint" class="sr-only">Arrow keys move between questions; Enter opens one.</p>
          <ol class="tr-nav-list" onKeyDown={navKeys}>
            {questions.map((it, i) => {
              const a = answers.current.has(i);
              const f = flagged.current.has(i);
              const state = [a ? 'answered' : 'not answered', f ? 'flagged' : ''].filter(Boolean).join(', ');
              return (
                <li key={it.q.id}>
                  <button type="button" class={`tr-nav-btn${i === current ? ' current' : ''}${a ? ' answered' : ''}${f ? ' flagged' : ''}`}
                    tabIndex={i === current ? 0 : -1} aria-describedby="tr-nav-hint" title={`Question ${i + 1}: ${state}`}
                    aria-current={i === current ? 'step' : undefined} aria-label={`Question ${i + 1}, ${state}`} onClick={() => goTo(i)} />
                </li>
              );
            })}
          </ol>
          <span class="tr-nav-count" aria-hidden="true">Question <b>{current + 1}</b> of {questions.length}</span>
        </nav>

        <div class="tr-bar-end">
          <span class={`tr-timer${lowTime ? ' low' : ''}`} title={lowTime ? 'Under 5 minutes left. The test finishes by itself at 0:00.' : 'Time left. The test finishes by itself at 0:00.'}>
            <Icon name={lowTime ? 'alert' : 'clock'} />
            <TimeLeft startedAt={startedAt.current} limitMs={limitMs} />
            <span class="sr-only">left</span>
          </span>
          <Button variant={allAnswered ? 'primary' : 'secondary'} onClick={requestFinish}>Finish</Button>
        </div>
        <div class="sr-only" aria-live="assertive">{timerAnnounce}</div>
      </header>

      <div class="tr-scroll" ref={scrollRef}>
        <div class={`tr-body${isCode ? ' code' : ''}`}>
          <section class="tr-card" aria-labelledby="tr-q-heading" data-qid={item.q.id}>
            <div class="tr-meta">
              <span class="tx-eyebrow">
                Question {current + 1}{mode === 'midsem' && topic ? ` · ${topic.short}` : ''}
              </span>
              <span class={`tr-fmt${isRead ? '' : ' build'}`}>{FORMAT_LABEL[item.q.format]}</span>
              <span class="tx-pips" title={`Difficulty: ${item.q.diff}`}>
                {[1, 2, 3].map((n) => <i key={n} class={n <= pips ? 'on' : ''} aria-hidden="true" />)}
                <span class="sr-only">Difficulty: {item.q.diff}</span>
              </span>
              <Button class="tr-flag" aria-pressed={isFlagged} onClick={() => toggleFlag(current)}>
                <Icon name="flag" /> {isFlagged ? 'Flagged' : 'Flag for review'}
              </Button>
            </div>
            <h2 id="tr-q-heading" class="tr-title" ref={questionHeading} tabIndex={-1}>
              <span class="sr-only">Question {current + 1} of {questions.length}: </span>{item.q.title}
            </h2>
            {item.scenario ? <div class="tr-story"><Markdown text={item.scenario.story} /></div> : null}
            <Markdown text={item.q.prompt} class="tr-prompt" />
            <div class="tr-answer-area" aria-label="Your answer" role="group">
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
                onDraft={(d: unknown) => { drafts.current.set(current, d); scheduleSave(); }}
              />
            </div>
          </section>

          <div class="tr-foot">
            <div class={`tr-saved${answered ? ' on' : ''}`} aria-live="polite">
              {answered
                ? <><Icon name="check" /><span>Answer saved</span></>
                : <><span class="tr-saved-dot" aria-hidden="true" /><span>Not answered yet · one check</span></>}
              <span class="sr-only">{announce}</span>
            </div>
            <span class="spacer" />
            <Button variant="ghost" onClick={() => goTo(current - 1)} disabled={current === 0}><Icon name="arrowLeft" /> Previous</Button>
            {!last ? (
              <Button variant={answered && !allAnswered ? 'primary' : 'secondary'} onClick={() => goTo(current + 1)}>Next <Icon name="arrowRight" /></Button>
            ) : (
              <Button variant={answered && !allAnswered ? 'primary' : 'secondary'} onClick={requestFinish}>Finish test</Button>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        title="Finish the test?"
        size="sm"
        class="tx-dialog"
        initialFocus=".tx-finish-keep"
        footer={
          <>
            <Button class="tx-finish-keep" variant="ghost" onClick={() => setFinishOpen(false)}>Keep going</Button>
            {unanswered > 0 ? (
              <Button onClick={() => {
                setFinishOpen(false);
                const next = questions.findIndex((_, i) => !answers.current.has(i));
                if (next >= 0) goTo(next);
              }}>Go to question {questions.findIndex((_, i) => !answers.current.has(i)) + 1}</Button>
            ) : null}
            <Button variant="primary" onClick={() => finish(false)}>Finish</Button>
          </>
        }
      >
        {unanswered > 0
          ? <p>{plural(unanswered, 'question')} {unanswered === 1 ? 'has' : 'have'} no saved answer and will score zero. Code you did not submit is not marked.</p>
          : <p>Every question has a saved answer.</p>}
        {flaggedList.length ? <p class="muted">Flagged: {flaggedList.join(', ')}.</p> : null}
        <p class="muted tx-mono"><TimeLeft startedAt={startedAt.current} limitMs={limitMs} /> left</p>
      </Dialog>
    </div>
  );
}
