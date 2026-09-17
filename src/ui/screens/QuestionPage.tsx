// Question page (#/q/:qid): the QuestionController. Loads the question, guards locked topics, renders the
// format component, and owns hints, "Show answer", check limits, the result banner, navigation and event logging.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import type { AstFlag, Format, MistakeId, TopicId } from '../../content/ids.ts';
import { CODE_FORMATS } from '../../content/ids.ts';
import type { GeneratedQuestion, Question, Scenario, Topic } from '../../content/schema.ts';
import { loadGenerated, loadTopic, questionsOf, topicIdOfQuestion } from '../../content/index.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import type { DetectionChannel, FormatProps, GradeResult, Mode } from '../../engine/types.ts';
import { HINT_MULTIPLIER } from '../../engine/types.ts';
import { questionStats, topicProgressAll } from '../../engine/progress.ts';
import type { QuestionStats } from '../../engine/progress.ts';
import { href, navigate } from '../../app/router.ts';
import { markTopicOpened } from '../../app/session.ts';
import { py, store } from '../../app/services.ts';
import { CHECK_LIMIT, FORMAT_COMPONENTS } from '../formats/registry.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Chip, DiffChip, FormatChip } from '../components/Chip.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { AnswerPanel } from '../workbench/AnswerPanel.tsx';
import { WorkbenchContext } from '../workbench/context.ts';
import type { WorkbenchContextValue } from '../workbench/context.ts';
import { FlagButton } from '../workbench/FlagDialog.tsx';
import { HintLadder } from '../workbench/HintLadder.tsx';
import { runtimeStatusText } from '../workbench/plain.ts';
import { ResultBanner } from '../workbench/ResultBanner.tsx';
import { isEditableTarget } from '../workbench/shortcuts.ts';
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
  /** All questions in the topic, in order (for prev/next and the explorer). */
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
        setState({ status: 'ready', data: { q, topicId, scenario, topic, generated: (gen as Record<string, GeneratedQuestion>)[qid], draft: snap?.draft } });
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
      <div class="qp">
        <div class="empty-state">
          <p>This question is not available yet.</p>
          <p><a href={topicId ? href.topic(topicId) : href.landing()}>{topicId ? 'Back to the topic' : 'Back to topics'}</a></p>
        </div>
      </div>
    );
  }
  if (state.status === 'error') {
    return (
      <div class="qp">
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
      <div class="qp">
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

// ---------------------------------------------------------------------------------------------------------------
// Hint gates: tier 1 after the first check or 45 s; each later tier after one more check or 20 s on the previous tier.

export function hintGate(tier: number, checkNo: number, visibleMs: number, shownAt: number[], checksAt: number[]) {
  if (tier >= 3) return { available: false, text: '' };
  if (tier === 0) {
    const secs = Math.max(0, Math.ceil((45000 - visibleMs) / 1000));
    return { available: checkNo >= 1 || visibleMs >= 45000, text: `after your first check or in ${secs} s` };
  }
  const since = visibleMs - (shownAt[tier] ?? 0);
  const secs = Math.max(0, Math.ceil((20000 - since) / 1000));
  return { available: checkNo > (checksAt[tier] ?? 0) || since >= 20000, text: `after your next check or in ${secs} s` };
}

function compactResponse(response: unknown): unknown {
  if (response === undefined) return undefined;
  let r = response;
  if (r && typeof r === 'object' && !Array.isArray(r) && 'flags' in (r as object)) {
    const { flags: _flags, ...rest } = r as Record<string, unknown>;
    void _flags;
    r = rest;
  }
  try {
    const s = JSON.stringify(r);
    if (s.length <= 4000) return r;
    if (r && typeof r === 'object' && typeof (r as { code?: unknown }).code === 'string') {
      return { ...(r as object), code: (r as { code: string }).code.slice(0, 3500), truncated: true };
    }
    return { truncated: true, preview: s.slice(0, 3500) };
  } catch {
    return undefined;
  }
}

function flagsOf(response: unknown): AstFlag[] | undefined {
  const f = (response as { flags?: unknown } | null)?.flags;
  if (!Array.isArray(f)) return undefined;
  const out = new Set<AstFlag>();
  for (const x of f) {
    if (typeof x === 'string') out.add(x as AstFlag);
    else if (x && typeof x === 'object' && typeof (x as { flag?: unknown }).flag === 'string') out.add((x as { flag: AstFlag }).flag);
  }
  return [...out];
}

function safeAppend(e: Parameters<typeof store.append>[0]) {
  try {
    store.append(e);
  } catch (err) {
    console.warn('Could not save event', err);
  }
}

const FILE_EXT: Record<Format, string> = {
  mcq: 'md', multi: 'md', predict: 'out', trace: 'table', twins: 'md', errorTranslator: 'md',
  cloze: 'py', parsons: 'pz', fixBug: 'py', write: 'py', refactor: 'py', testWriter: 'py',
};

// ---------------------------------------------------------------------------------------------------------------
// The controller view (also used by the dev preview with inline questions)

export function QuestionView({ data, modeOverride }: { data: LoadedQuestion; modeOverride?: Mode }) {
  const { q, topicId, scenario, topic, generated } = data;
  const settings = store.settings.value;
  const layout = settings.layout === 'full' ? 'full' : 'simple';
  const isCode = CODE_FORMATS.includes(q.format);
  const mode: Mode = modeOverride ?? (q.format === 'write' && q.mode === 'paper' ? 'paper' : 'practice');
  const limit = CHECK_LIMIT[q.format];
  const meta = TOPIC_BY_ID[topicId];

  const questions = useMemo(() => questionsOf(topic), [topic]);
  const index = questions.findIndex((x) => x.id === q.id);
  const prev = index > 0 ? questions[index - 1] : undefined;
  const next = index >= 0 && index < questions.length - 1 ? questions[index + 1] : undefined;
  const nextHref = next ? href.question(next.id) : href.topic(topicId);

  const visibleMs = useVisibleClock();
  const [checkNo, setCheckNo] = useState(0);
  const [failed, setFailed] = useState(0);
  const [solved, setSolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [hintTier, setHintTier] = useState<0 | 1 | 2 | 3>(0);
  const shownAt = useRef<number[]>([0, 0, 0, 0]);
  const checksAt = useRef<number[]>([0, 0, 0, 0]);
  const cursor = useMemo(() => signal<{ line: number; col: number } | null>(null), []);

  // Latest values for callbacks that formats call after async work.
  const live = useRef({ checkNo, failed, revealed, hintTier, solved });
  live.current = { checkNo, failed, revealed, hintTier, solved };

  useEffect(() => {
    markTopicOpened(topicId);
    if (isCode) py.warmUp();
  }, [topicId, isCode]);

  // Draft saving (debounced; flushed when leaving the question).
  const pendingDraft = useRef<{ value: unknown } | null>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushDraft = () => {
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = null;
    const p = pendingDraft.current;
    pendingDraft.current = null;
    if (p) {
      try {
        store.saveSnapshot(q.id, p.value);
      } catch (err) {
        console.warn('Could not save draft', err);
      }
    }
  };
  useEffect(() => () => flushDraft(), []);
  const onDraft = (value: unknown) => {
    pendingDraft.current = { value };
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(flushDraft, 600);
  };

  const reveal = () => {
    if (live.current.revealed) return;
    setRevealed(true);
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
    });
    for (const m of mistakes) safeAppend({ type: 'mistake', qid: q.id, topicId, mistake: m.id, channel: m.channel });
    setResult(res);
    if (res.correct) {
      setSolved(true);
    } else {
      const f = cur.failed + 1;
      setFailed(f);
      live.current = { ...live.current, failed: f };
      if (Number.isFinite(limit) && n >= limit) reveal();
    }
  };

  const gate = hintGate(hintTier, checkNo, visibleMs(), shownAt.current, checksAt.current);
  useTicker(hintTier < 3 && !gate.available);
  const showHint = () => {
    const t = live.current.hintTier;
    const g = hintGate(t, live.current.checkNo, visibleMs(), shownAt.current, checksAt.current);
    if (!g.available || t >= 3) return;
    const nt = (t + 1) as 1 | 2 | 3;
    const now = visibleMs();
    const dwellMs = Math.round(now - (t === 0 ? 0 : shownAt.current[t]));
    shownAt.current[nt] = now;
    checksAt.current[nt] = live.current.checkNo;
    live.current = { ...live.current, hintTier: nt };
    setHintTier(nt);
    safeAppend({ type: 'hint', qid: q.id, topicId, tier: nt, dwellMs });
  };

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
  const ctx: WorkbenchContextValue = useMemo(() => ({
    layout, pageShowsAnswer: true, onCursor: (line: number, col: number) => { cursor.value = { line, col }; },
  }), [layout]);

  const hideAnswerCode = q.format === 'fixBug' || q.format === 'testWriter' || q.format === 'parsons' || q.format === 'refactor';
  const header = (
    <header class="qp-header">
      <nav class="qp-crumbs" aria-label="Breadcrumb">
        <a href={href.topic(topicId)}>{meta?.short ?? topicId}</a>
        <span aria-hidden="true">›</span>
        <span>{scenario.title}</span>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Question {index + 1} of {questions.length}</span>
      </nav>
      <div class="qp-titlebar">
        <h1 class="qp-title">{q.title}</h1>
        <div class="qp-chips">
          <DiffChip diff={q.diff} />
          <FormatChip format={q.format} />
          {mode === 'paper' ? <Chip tone="accent">Exam-style</Chip> : null}
          {!q.core ? <Chip title="Extra practice: not needed to unlock the next topic">Extra</Chip> : null}
        </div>
        <span class="spacer" />
        <nav class="qp-nav" aria-label="Question navigation">
          {prev ? <LinkButton href={href.question(prev.id)} size="sm" variant="ghost"><Icon name="arrowLeft" size={14} /> Previous</LinkButton> : null}
          {next ? <LinkButton href={href.question(next.id)} size="sm" variant="ghost">Next <Icon name="arrowRight" size={14} /></LinkButton> : <LinkButton href={href.topic(topicId)} size="sm" variant="ghost">Back to topic</LinkButton>}
        </nav>
      </div>
      {scenario.story ? <div class="qp-story"><Markdown text={scenario.story} /></div> : null}
    </header>
  );

  const banner = (
    <ResultBanner
      result={result}
      marks={mode === 'paper' && q.format === 'write' ? q.marks : undefined}
      nextHref={nextHref}
      nextLabel={next ? 'Next question' : 'Back to topic'}
      checksLeft={Number.isFinite(limit) ? limit - checkNo : undefined}
      revealed={revealed}
    />
  );

  const support = (
    <div class="qp-support">
      <HintLadder hints={q.hints} tier={hintTier} nextAvailable={gate.available} unlockText={gate.text} onNext={showHint} />
      <AnswerPanel
        solution={q.solution}
        selfExplain={q.selfExplain}
        revealed={revealed}
        freeReveal={failed >= 2}
        onReveal={reveal}
        onSelfExplain={(text) => safeAppend({ type: 'self_explain', qid: q.id, text: text.slice(0, 2000) })}
        hideCode={hideAnswerCode}
      />
      <div class="qp-flag"><FlagButton qid={q.id} /></div>
    </div>
  );

  const prompt = (
    <section class="qp-prompt" aria-label="Question">
      <Markdown text={q.prompt} />
    </section>
  );

  const body = isCode ? (
    <div class="qp-split">
      {prompt}
      <div class="qp-work">
        <Format {...formatProps} />
      </div>
      {support}
    </div>
  ) : (
    <div class="qp-single">
      {prompt}
      <Format {...formatProps} />
      {support}
    </div>
  );

  const content = (
    <WorkbenchContext.Provider value={ctx}>
      {header}
      {banner}
      {body}
    </WorkbenchContext.Provider>
  );

  if (layout === 'simple') {
    return <div class={`qp qp-simple${isCode ? ' code' : ''}`}>{content}</div>;
  }

  const fileName = `${q.id}.${FILE_EXT[q.format]}`;
  return (
    <div class={`qp qp-full${isCode ? ' code' : ''}`}>
      <Explorer topic={topic} topicId={topicId} currentId={q.id} />
      <div class="qp-main">
        <div class="qp-filetabs" role="presentation">
          <span class="qp-filetab active"><Icon name={isCode ? 'code' : 'file'} size={14} /> {fileName}</span>
          <span class="qp-filepath faint">{meta?.short ?? topicId} / {scenario.title}</span>
        </div>
        <div class="qp-main-inner">{content}</div>
        <StatusBar cursor={cursor} isCode={isCode} diff={q.diff} checkNo={checkNo} limit={limit} hintTier={hintTier} />
      </div>
    </div>
  );
}

function StatusBar({ cursor, isCode, diff, checkNo, limit, hintTier }: { cursor: Signal<{ line: number; col: number } | null>; isCode: boolean; diff: string; checkNo: number; limit: number; hintTier: number }) {
  const status = py.status.value;
  const c = cursor.value;
  return (
    <footer class="qp-statusbar" aria-label="Status">
      <span class={`sb-item sb-py ${status.state}`} aria-live="polite"><span class="sb-dot" aria-hidden="true" />{runtimeStatusText(status)}</span>
      {isCode ? <span class="sb-item num">{c ? `Ln ${c.line}, Col ${c.col}` : 'Ln -, Col -'}</span> : null}
      {isCode ? <span class="sb-item">Spaces: 4</span> : null}
      <span class="spacer" />
      <span class="sb-item">{diff === 'easy' ? 'Easy' : diff === 'medium' ? 'Medium' : 'Hard'}</span>
      <span class="sb-item num">Check {checkNo}{Number.isFinite(limit) ? ` of ${limit}` : ''}</span>
      <span class="sb-item num">Hints {hintTier} of 3</span>
      {isCode ? <span class="sb-item sb-kbd">Ctrl+M: Tab moves focus</span> : null}
    </footer>
  );
}

function statusOf(s: QuestionStats | undefined): { icon: 'check' | 'eye' | 'target' | null; text: string } {
  if (!s) return { icon: null, text: 'New' };
  if (s.solved) return { icon: 'check', text: 'Solved' };
  if (s.revealed) return { icon: 'eye', text: 'Answer seen' };
  if (s.attempts > 0) return { icon: 'target', text: 'Tried' };
  return { icon: null, text: 'New' };
}

function Explorer({ topic, topicId, currentId }: { topic: Topic; topicId: TopicId; currentId: string }) {
  const events = store.events.value;
  const stats = useMemo(() => {
    try {
      return questionStats(events);
    } catch {
      return new Map<string, QuestionStats>();
    }
  }, [events]);
  const meta = TOPIC_BY_ID[topicId];
  const [openInitially] = useState(() => typeof window === 'undefined' || window.innerWidth >= 900);
  const list: ComponentChildren = topic.scenarios.map((s) => (
    <li key={s.id} class="ex-scenario">
      <div class="ex-scenario-title">{s.title}</div>
      <ul>
        {s.questions.map((x) => {
          const st = statusOf(stats.get(x.id));
          const current = x.id === currentId;
          return (
            <li key={x.id}>
              <a class={`ex-q${current ? ' current' : ''}`} href={href.question(x.id)} aria-current={current ? 'page' : undefined}>
                <span class={`ex-status ${st.text.replace(/\s+/g, '-').toLowerCase()}`} title={st.text}>
                  {st.icon ? <Icon name={st.icon} size={12} /> : <span class="ex-dot" aria-hidden="true" />}
                  <span class="sr-only">{st.text}: </span>
                </span>
                <span class="ex-q-title">{x.title}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </li>
  ));
  return (
    <aside class="qp-explorer" aria-label="Questions in this topic">
      <details class="ex-details" open={openInitially}>
        <summary class="ex-head"><span class="label">Explorer</span> <span class="ex-topic">{meta?.short ?? topicId}</span></summary>
        <ul class="ex-list">{list}</ul>
      </details>
    </aside>
  );
}
