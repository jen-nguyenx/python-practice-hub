// Question page (#/q/:qid): the QuestionController. Loads the question, guards locked topics, renders the page's top
// row and the format component in the layout for its family (code, Parsons, read), and owns hints,
// "Reveal full answer", check limits, the result card, navigation and event logging.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Format, MistakeId, TopicId } from '../../content/ids.ts';
import { CODE_FORMATS, FORMAT_LABEL } from '../../content/ids.ts';
import type { GeneratedQuestion, Question, Scenario, Topic } from '../../content/schema.ts';
import { loadGenerated, loadTopic, questionsOf, topicIdOfQuestion } from '../../content/index.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { Confidence, DetectionChannel, FormatProps, GradeResult, Mode } from '../../engine/types.ts';
import { HINT_MULTIPLIER } from '../../engine/types.ts';
import { questionStats, topicProgressAll } from '../../engine/progress.ts';
import type { QuestionStats } from '../../engine/progress.ts';
import { href, navigate } from '../../app/router.ts';
import { markTopicOpened } from '../../app/session.ts';
import { py, store } from '../../app/services.ts';
import { CHECK_LIMIT, FORMAT_COMPONENTS } from '../formats/registry.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { AnswerBlock, RevealControl } from '../workbench/AnswerPanel.tsx';
import { ConfidenceRow } from '../workbench/ConfidenceRow.tsx';
import { WorkbenchContext } from '../workbench/context.ts';
import type { WorkbenchContextValue } from '../workbench/context.ts';
import { ShellSession, examplesFromTests } from '../workbench/EditorCard.tsx';
import type { HintState } from '../workbench/HintLadder.tsx';
import { HintCallouts, HintsSection, ShowHintButton, hintTotal } from '../workbench/HintLadder.tsx';
import { QuestionBar } from '../workbench/QuestionBar.tsx';
import { ResultCard } from '../workbench/ResultBanner.tsx';
import { RulesList } from '../workbench/RuleViolations.tsx';
import { ScratchEditor } from '../workbench/ScratchEditor.tsx';
import { isEditableTarget } from '../workbench/shortcuts.ts';
import { checkVerb, compactResponse, flagsOf, hintGate, restoredChecks, restoredHintTier } from '../workbench/hints.ts';
import { backupDraft, takeDraftBackup } from '../workbench/unsaved.ts';
import '../workbench/questionPage.css';

// ---------------------------------------------------------------------------------------------------------------
// Loader

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: LoadedQuestion };

export interface LoadedQuestion {
  q: Question;
  topicId: TopicId;
  scenario: Scenario;
  /** The whole topic (for prev/next and the progress dots). */
  topic: Topic;
  generated?: GeneratedQuestion;
  draft: unknown;
}

export function QuestionPage({ qid }: { qid: string }) {
  return <QuestionLoader key={qid} qid={qid} />;
}

function QuestionLoader({ qid }: { qid: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const topicId = (QUESTION_BY_ID.get(qid)?.topicId ?? topicIdOfQuestion(qid)) as TopicId | undefined;

  useEffect(() => {
    if (!topicId) {
      setState({ status: 'missing' });
      return;
    }
    let alive = true;
    Promise.all([
      loadTopic(topicId),
      loadGenerated(topicId).catch(() => ({})),
      store.ready.then(() => store.getSnapshot(qid)).catch(() => undefined),
    ])
      .then(([topic, gen, snap]) => {
        if (!alive) return;
        const scenario = topic.scenarios.find((s) => s.questions.some((x) => x.id === qid));
        const q = scenario?.questions.find((x) => x.id === qid);
        if (!q || !scenario) {
          setState({ status: 'missing' });
          return;
        }
        let draft = snap?.draft;
        const backup = takeDraftBackup(qid, snap?.updatedAt);
        if (backup) {
          draft = backup.draft;
          store.saveSnapshot(qid, draft);
        }
        setState({ status: 'ready', data: { q, topicId, scenario, topic, generated: (gen as Record<string, GeneratedQuestion>)[qid], draft } });
      })
      .catch((err) => {
        if (alive) setState({ status: 'error', message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      alive = false;
    };
  }, [qid, topicId]);

  if (state.status === 'loading') {
    return (
      <div class="qp qp-loading" aria-busy="true">
        <p class="muted">Loading question…</p>
      </div>
    );
  }
  if (state.status === 'missing') {
    return (
      <div class="qp qp-message">
        <div class="empty-state">
          <p>This question is not available yet.</p>
          <p><a href={topicId ? href.topic(topicId) : href.landing()}>{topicId ? 'Back to the topic' : 'Back to topics'}</a></p>
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div class="qp qp-message">
        <Callout tone="bad" title="The question could not be loaded">
          <p>{state.message}</p>
          <p><Button size="sm" onClick={() => location.reload()}>Reload the page</Button></p>
        </Callout>
      </div>
    );
  }
  return <LockGuard data={state.data} />;
}

function LockGuard({ data }: { data: LoadedQuestion }) {
  const events = store.events.value;
  const settings = store.settings.value;
  let progress;
  try {
    progress = topicProgressAll(events, QUESTION_INDEX, settings)?.[data.topicId];
  } catch {
    progress = undefined;
  }
  const meta = TOPIC_BY_ID[data.topicId];
  if (progress?.state === 'locked') {
    return (
      <div class="qp qp-message">
        <div class="qp-locked card">
          <Icon name="lock" size={20} />
          <div class="stack">
            <h1 class="qp-locked-title">{meta?.title ?? 'This topic'} is locked</h1>
            <p>{progress.lockReason ?? 'Finish the earlier topic first.'}</p>
            <p class="muted">The cheat sheet and worked example are always open on the topic page.</p>
            <div class="row">
              <LinkButton href={href.topic(data.topicId)} variant="primary">Go to the topic</LinkButton>
              <LinkButton href={href.landing()}>All topics</LinkButton>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return <QuestionView data={data} />;
}

// ---------------------------------------------------------------------------------------------------------------
// Visible time (only counts while the tab is visible)

function useVisibleClock() {
  const acc = useRef(0);
  const since = useRef<number | null>(typeof document === 'undefined' || document.visibilityState === 'visible' ? performance.now() : null);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (since.current === null) since.current = performance.now();
      } else if (since.current !== null) {
        acc.current += performance.now() - since.current;
        since.current = null;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return () => acc.current + (since.current !== null ? performance.now() - since.current : 0);
}

/** Re-render once a second while `active` (used only while a hint is waiting on its timer). */
function useTicker(active: boolean) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
}

function safeAppend(e: Parameters<typeof store.append>[0]) {
  try {
    store.append(e);
  } catch (err) {
    console.warn('Could not save event', err);
  }
}

function safeStats(events: Parameters<typeof questionStats>[0]): Map<string, QuestionStats> {
  try {
    return questionStats(events);
  } catch {
    return new Map();
  }
}

type Family = 'code' | 'parsons' | 'read';
function familyOf(format: Format): Family {
  if (format === 'parsons') return 'parsons';
  return CODE_FORMATS.includes(format) ? 'code' : 'read';
}

/** Formats whose own component shows the answer inline, so the answer block skips the model code. */
const HIDE_ANSWER_CODE: Format[] = ['fixBug', 'testWriter', 'parsons', 'refactor'];

interface ShownResult { res: GradeResult; credit: number; hints: number; answerShown: boolean }

// ---------------------------------------------------------------------------------------------------------------
// The controller view (also used by the dev preview with inline questions)

export function QuestionView({ data, modeOverride }: { data: LoadedQuestion; modeOverride?: Mode }) {
  const { q, topicId, scenario, topic, generated } = data;
  const family = familyOf(q.format);
  const isCode = CODE_FORMATS.includes(q.format);
  const mode: Mode = modeOverride ?? (q.format === 'write' && q.mode === 'paper' ? 'paper' : 'practice');
  const practice = mode === 'practice' || mode === 'paper';
  // Paper (exam-style) questions allow one submission, so the model answer opens after it.
  const limit = mode === 'paper' ? 1 : CHECK_LIMIT[q.format];
  const meta = TOPIC_BY_ID[topicId];

  const questions = useMemo(() => questionsOf(topic), [topic]);
  const index = questions.findIndex((x) => x.id === q.id);
  const prev = index > 0 ? questions[index - 1] : undefined;
  const next = index >= 0 && index < questions.length - 1 ? questions[index + 1] : undefined;
  const nextHref = next ? href.question(next.id) : href.topic(topicId);

  const events = store.events.value;
  const stats = useMemo(() => safeStats(events), [events]);

  // State from earlier visits, read once per visit (for the "solved before" pill and the "earlier visit" note).
  const [before] = useState(() => {
    const s = safeStats(store.events.value).get(q.id);
    return { solved: s?.solved ?? false, revealed: s?.revealed ?? false };
  });

  const visibleMs = useVisibleClock();
  const [checkNoHere, setCheckNo] = useState(0);
  const [failedHere, setFailed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealedHere, setRevealedHere] = useState(false);
  const [shown, setShown] = useState<ShownResult | null>(null);
  const [hintTierHere, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const shownAt = useRef<number[]>([0, 0, 0, 0]);
  const checksAt = useRef<number[]>([0, 0, 0, 0]);
  const resultRef = useRef<HTMLDivElement>(null);

  // A shown answer is remembered from the event log (reveal events), so leaving and coming back keeps the question
  // revealed: answers stay visible, input stays locked and later checks earn no credit.
  const revealed = revealedHere || (practice && (stats.get(q.id)?.revealed ?? false));
  // Revealed hints are remembered the same way (hint events), so a reload re-shows the hint text and keeps the
  // credit multiplier: a student cannot clear the hint penalty by reloading.
  const hintTier = Math.max(hintTierHere, practice ? restoredHintTier(events, q.id, q.hints.length) : 0) as 0 | 1 | 2 | 3;
  // Checks already used are remembered too (attempt events), so the checks left, the hint gate and the auto-reveal
  // when the limit runs out all survive leaving the page: reloading before the last check no longer buys a new one.
  // A question that is already finished (solved, or the answer shown) starts fresh instead, so it can be practised
  // again without the old checks locking its Check button.
  const finished = revealed || (practice && (stats.get(q.id)?.solved ?? false));
  const priorChecks = useMemo(
    () => (practice && !finished ? restoredChecks(events, q.id) : { checks: 0, failed: 0 }),
    [events, q.id, practice, finished],
  );
  const checkNo = Math.max(checkNoHere, priorChecks.checks);
  const failed = Math.max(failedHere, priorChecks.failed);

  // Latest values for callbacks that formats call after async work.
  const live = useRef({ checkNo, failed, revealed, hintTier, solved, confidence });
  live.current = {
    checkNo, failed, revealed: revealed || live.current.revealed, hintTier,
    solved: solved || live.current.solved, confidence,
  };

  useEffect(() => {
    markTopicOpened(topicId);
    if (isCode) py.warmUp();
  }, [topicId, isCode]);

  // Draft saving: the store debounces snapshot writes itself and flushes them when the page is hidden. The latest
  // edit is also backed up synchronously on pagehide in case the tab closes before IndexedDB finishes.
  const lastDraft = useRef<{ value: unknown; ts: number } | null>(null);
  const onDraft = (value: unknown) => {
    lastDraft.current = { value, ts: Date.now() };
    try {
      store.saveSnapshot(q.id, value);
    } catch (err) {
      console.warn('Could not save draft', err);
    }
  };
  const backupRecent = () => {
    const d = lastDraft.current;
    if (d && Date.now() - d.ts < 5000) backupDraft(q.id, d.value);
  };
  useEffect(() => {
    window.addEventListener('pagehide', backupRecent);
    return () => window.removeEventListener('pagehide', backupRecent);
  }, [q.id]);

  const reveal = () => {
    if (live.current.revealed) return;
    live.current = { ...live.current, revealed: true };
    setRevealedHere(true);
    safeAppend({ type: 'reveal', qid: q.id, topicId });
  };

  const onCheck = (res: GradeResult, response: unknown) => {
    const cur = live.current;
    const n = cur.checkNo + 1;
    live.current = { ...cur, checkNo: n };
    setCheckNo(n);
    const credit = cur.revealed ? 0 : res.score * HINT_MULTIPLIER[cur.hintTier];
    const seen = new Set<string>();
    const mistakes: { id: MistakeId; channel: DetectionChannel }[] = [];
    for (const m of res.mistakes ?? []) {
      const key = `${m.id}:${m.channel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      mistakes.push(m);
    }
    safeAppend({
      type: 'attempt', qid: q.id, topicId, format: q.format, diff: q.diff, mode, checkNo: n,
      correct: res.correct, score: res.score, credit, hintTier: cur.hintTier, revealed: cur.revealed,
      timeMs: Math.round(visibleMs()), mistakes: [...new Set(mistakes.map((m) => m.id))],
      response: compactResponse(response), flags: flagsOf(response),
      // Only the first check: after a result has been seen, what the student says is a memory of the
      // answer, not a prediction about it.
      ...(n === 1 && cur.confidence ? { confidence: cur.confidence } : {}),
    });
    for (const m of mistakes) safeAppend({ type: 'mistake', qid: q.id, topicId, mistake: m.id, channel: m.channel });
    setShown({ res, credit, hints: cur.hintTier, answerShown: cur.revealed });
    if (res.correct) {
      if (!cur.revealed) {
        setSolved(true);
        live.current = { ...live.current, solved: true };
      }
    } else {
      const f = cur.failed + 1;
      setFailed(f);
      live.current = { ...live.current, failed: f };
      if (Number.isFinite(limit) && n >= limit) reveal();
    }
  };

  // Hints close for good once the question is solved or the answer is shown.
  const hintsClosed = revealed ? 'The answer is shown, so hints are closed' : solved ? 'Solved, so hints are closed' : null;
  const verb = checkVerb(q.format);
  const gate = hintGate(hintTier, checkNo, visibleMs(), shownAt.current, checksAt.current, verb);
  useTicker(hintTier < 3 && !gate.available && !hintsClosed);
  const showHint = () => {
    const cur = live.current;
    if (cur.revealed || cur.solved) return;
    const t = cur.hintTier;
    const g = hintGate(t, cur.checkNo, visibleMs(), shownAt.current, checksAt.current, verb);
    if (!g.available || t >= Math.min(3, q.hints.length)) return;
    const nt = (t + 1) as 1 | 2 | 3;
    const now = visibleMs();
    const dwellMs = Math.round(now - (t === 0 ? 0 : shownAt.current[t]));
    shownAt.current[nt] = now;
    checksAt.current[nt] = cur.checkNo;
    live.current = { ...cur, hintTier: nt };
    setHintTier(nt);
    safeAppend({ type: 'hint', qid: q.id, topicId, tier: nt, dwellMs });
  };

  // After a check, a format component often replaces the button that was pressed, which drops keyboard focus to
  // <body>. When that happens, move focus to the result ("Next question" if it is offered, otherwise the card) so
  // a keyboard user carries on from the result instead of tabbing from the top of the page. Focus is never taken
  // from an element that is still there (the editor, a still-present Check button).
  useEffect(() => {
    if (!shown) return;
    const el = document.activeElement;
    if (el && el !== document.body && el !== document.documentElement && el.isConnected) return;
    const card = resultRef.current;
    if (!card) return;
    (card.querySelector<HTMLElement>('.result-next') ?? card).focus();
  }, [shown]);

  // Keyboard: next/previous question and next hint.
  const keyRef = useRef({ showHint, prev, next });
  keyRef.current = { showHint, prev, next };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keyRef.current;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.altKey && (e.key === "'" || e.code === 'Quote')) {
        e.preventDefault();
        k.showHint();
        return;
      }
      if (e.altKey && e.shiftKey && !mod && (e.code === 'BracketRight' || e.code === 'BracketLeft')) {
        e.preventDefault();
        const target = e.code === 'BracketRight' ? k.next : k.prev;
        if (target) navigate(href.question(target.id));
        return;
      }
      if (e.defaultPrevented || mod || e.altKey || !store.settings.value.singleKeyShortcuts || isEditableTarget(e.target)) return;
      if (e.target instanceof Element && e.target.closest('dialog')) return;
      if (e.key === ']' || e.key === '[') {
        const target = e.key === ']' ? k.next : k.prev;
        if (target) {
          e.preventDefault();
          navigate(href.question(target.id));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const Format = FORMAT_COMPONENTS[q.format];
  const formatProps: FormatProps<Question> = {
    q, topicId, generated, mode,
    checksLeft: Number.isFinite(limit) ? Math.max(0, limit - checkNo) : Infinity,
    revealed, locked: solved, onCheck, draft: data.draft, onDraft,
  };

  const h: HintState = { hints: q.hints, tier: hintTier, available: gate.available, unlockText: gate.text, onShow: showHint, closedReason: hintsClosed };
  const total = hintTotal(h);
  // Once the question is solved there is nothing left to lose, so the model answer opens without the confirm and
  // the link says plainly what it does.
  const freeReveal = solved || failed >= 2 || (mode === 'paper' && checkNo > 0);
  const testMode = mode === 'topic-test' || mode === 'exam';
  const revealControl = (
    <RevealControl
      revealed={revealed}
      free={freeReveal}
      onReveal={reveal}
      hidden={testMode}
      label={solved ? 'Show the model answer' : 'Reveal full answer'}
    />
  );

  const resultCard = (
    <ResultCard
      cardRef={resultRef}
      result={shown?.res ?? null}
      credit={shown?.credit ?? 0}
      hints={shown?.hints ?? 0}
      answerShown={shown?.answerShown ?? false}
      marks={mode === 'paper' && q.format === 'write' ? q.marks : undefined}
      nextHref={nextHref}
      nextLabel={next ? 'Next question' : 'Back to topic'}
      checksLeft={Number.isFinite(limit) ? limit - checkNo : undefined}
    />
  );

  const answer = revealed ? (
    <AnswerBlock
      solution={q.solution}
      selfExplain={q.selfExplain}
      onSelfExplain={(text) => safeAppend({ type: 'self_explain', qid: q.id, text: text.slice(0, 2000) })}
      hideCode={HIDE_ANSWER_CODE.includes(q.format)}
      earlier={before.revealed && !revealedHere}
    />
  ) : null;

  // Asked once, before the first check, and only where a check is still ahead: not in a test (where the
  // pace is the point), not after a check, not on a revealed or already-solved question.
  const askConfidence = store.settings.value.askConfidence && !testMode && checkNo === 0 && !revealed && !solved && !before.solved;
  const confidenceRow = askConfidence
    ? <ConfidenceRow value={confidence} onPick={(v) => setConfidence(v)} />
    : null;

  const hintsUsedText = total === 0 ? '' : `${hintTier} of ${total} hints used`;
  const parsonsHelp = (
    <div class="qp-bar-help">
      <ShowHintButton h={h} numbered={false} />
      {hintsUsedText ? <span class="qp-hint-count num">{hintsUsedText}</span> : null}
      {revealControl}
    </div>
  );

  const ctx: WorkbenchContextValue = {
    layout: 'simple', pageShowsAnswer: true, fill: false, onQuestionPage: true,
    resultSlot: family === 'read' ? undefined : resultCard,
    helpSlot: family === 'parsons' ? parsonsHelp : undefined,
  };

  const eyebrowText = `Topic ${String(meta?.num ?? '').padStart(2, '0')} · ${meta?.short ?? topicId}`;
  const pills = (
    <>
      {q.core ? <span class="pill">Core</span> : null}
      {mode === 'paper' ? <span class="pill">Exam-style{q.format === 'write' && q.marks ? ` · ${q.marks} marks` : ''}</span> : null}
      {before.solved ? <span class="pill"><Icon name="check" size={12} /> Solved before</span> : null}
    </>
  );
  const story = scenario.story ? <Markdown class="qp-story" text={scenario.story} /> : null;
  const examples = 'tests' in q ? examplesFromTests(q.tests) : [];

  let body: ComponentChildren;
  if (family === 'code') {
    body = (
      <div class="qp-code">
        <section class="qp-brief" aria-labelledby="qp-title">
          <div class="qp-brief-top">
            <div class="qp-eyebrow-row"><span class="eyebrow">{eyebrowText}</span>{pills}</div>
            <h1 class="qp-title" id="qp-title">{q.title}</h1>
            {story}
            <Markdown class="qp-prompt" text={q.prompt} />
            {q.format === 'write' && q.rules?.length ? <RulesList rules={q.rules} /> : null}
            {examples.length ? <ShellSession lines={examples} label="Example calls and results" /> : null}
          </div>
          {testMode ? null : (
            <div class="qp-brief-bottom">
              <HintsSection h={h} after={revealControl} />
              {answer}
            </div>
          )}
        </section>
        <div class="qp-work">{confidenceRow}<Format {...formatProps} /></div>
      </div>
    );
  } else if (family === 'parsons') {
    body = (
      <div class="qp-parsons">
        <section class="qp-top" aria-labelledby="qp-title">
          <div class="qp-top-text">
            <div class="qp-eyebrow-row"><span class="eyebrow">{eyebrowText}</span>{pills}</div>
            <h1 class="qp-title" id="qp-title">{q.title}</h1>
            {story}
            <Markdown class="qp-prompt" text={q.prompt} />
            <HintCallouts hints={q.hints} tier={hintTier} />
          </div>
          {examples.length ? <ShellSession lines={examples} label="Example calls and results" /> : null}
        </section>
        {confidenceRow}
        <Format {...formatProps} />
        {answer}
      </div>
    );
  } else {
    body = (
      <div class="qp-read">
        <section class="qp-read-main" aria-labelledby="qp-title">
          <div class="qp-eyebrow-row"><span class="eyebrow">{eyebrowText}</span>{pills}</div>
          <h1 class="qp-title big" id="qp-title">{q.title}</h1>
          {story}
          <Markdown class="qp-prompt" text={q.prompt} />
          <div class="qp-format">{confidenceRow}<Format {...formatProps} /></div>
          {resultCard}
          {testMode ? null : (
            <>
              <div class="qp-help-row">
                <ShowHintButton h={h} look="hint" numbered />
                {revealControl}
                <span class="spacer" />
                {!solved && !revealed ? (
                  <a class="text-link blue" href={nextHref} onClick={backupRecent}>{next ? 'Skip for now' : 'Back to topic'}</a>
                ) : null}
              </div>
              <HintCallouts hints={q.hints} tier={hintTier} />
              {total > 0 && !hintsClosed ? (
                <p class="qp-info">
                  <Icon name="bulb" size={14} />
                  {hintTier === 0
                    ? `${total} hints available. A hint lowers this question's score a little.`
                    : `${hintsUsedText}.${hintTier < total ? (gate.available ? ' The next one is ready.' : ` The next one unlocks ${gate.text}.`) : ''}`}
                </p>
              ) : null}
              {answer}
            </>
          )}
        </section>
        <aside class="qp-read-side" aria-label="Scratch editor">
          <ScratchEditor q={q} topicId={topicId} />
        </aside>
      </div>
    );
  }

  return (
    <WorkbenchContext.Provider value={ctx}>
      <div class={`qp qp-family-${family}`}>
        <div class="qp-page">
          <QuestionBar
            qid={q.id}
            topicId={topicId}
            topicShort={meta?.short ?? topicId}
            questions={questions}
            index={index}
            stats={stats}
            format={q.format}
            onLeave={backupRecent}
          />
          {body}
        </div>
      </div>
    </WorkbenchContext.Provider>
  );
}
