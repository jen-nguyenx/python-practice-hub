// Exams (#/exam): a mock final paper built to the real CITS1401 shape, and a custom timed practice test.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ExamSlot, TopicId } from '../../content/ids.ts';
import { EXAM_SLOT_IDS, EXAM_SLOT_LABEL, EXAM_SLOT_MARKS, FORMAT_LADDER, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import type { AppEvent, TestKind } from '../../engine/types.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Switch } from '../components/Switch.tsx';
import { ConfirmDialog } from '../testmode/ConfirmDialog.tsx';
import { formatDateTime, formatDuration, plural } from '../report/format.ts';
import { TestRunner } from '../testmode/TestRunner.tsx';
import type { PoolEntry } from '../testmode/pool.ts';
import { loadPool } from '../testmode/pool.ts';
import {
  buildMockExam, estimatedMinutes, marksByQid, MOCK_EXAM_MINUTES, MOCK_EXAM_TOTAL_MARKS,
  PRACTICE_COUNTS, PRACTICE_DEFAULT_COUNT, PRACTICE_DEFAULT_MINUTES, PRACTICE_MINUTES,
  practiceEligible, recentlyUsedQids, seededRng, selectPracticeTest, slotCandidates,
} from '../testmode/select.ts';
import { openTopicIds } from '../testmode/lock.ts';
import { bestResult, testHistory } from '../testmode/summary.ts';
import type { TestProgress } from '../testmode/progress.ts';
import { clearProgress, readProgress } from '../testmode/progress.ts';
import { ResumeCard } from '../testmode/ResumeCard.tsx';
import { storeReady } from '../shell/storeReady.ts';
import '../testmode/testmode.css';

type Tab = 'exam' | 'practice';
interface Setup { topicIds: TopicId[]; count: number; minutes: number; includeCoding: boolean }

const SETUP_KEY = 'pyladder:practice-setup';
const TAB_KEY = 'pyladder:exam-tab';
const EXAM_PROGRESS_KEY = 'mock-exam';
const PRACTICE_PROGRESS_KEY = 'practice';
const ALL_TOPICS: TopicId[] = TOPICS.map((t) => t.id);
const DEFAULT_SETUP: Setup = {
  topicIds: ALL_TOPICS, count: PRACTICE_DEFAULT_COUNT, minutes: PRACTICE_DEFAULT_MINUTES, includeCoding: true,
};

function loadSetup(): Setup {
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<Setup> | null;
    if (!raw) return DEFAULT_SETUP;
    const topicIds = Array.isArray(raw.topicIds)
      ? raw.topicIds.filter((t): t is TopicId => (TOPIC_IDS as readonly string[]).includes(t))
      : ALL_TOPICS;
    return {
      topicIds: topicIds.length ? topicIds : ALL_TOPICS,
      count: (PRACTICE_COUNTS as readonly number[]).includes(raw.count ?? 0) ? raw.count! : DEFAULT_SETUP.count,
      minutes: (PRACTICE_MINUTES as readonly number[]).includes(raw.minutes ?? 0) ? raw.minutes! : DEFAULT_SETUP.minutes,
      includeCoding: typeof raw.includeCoding === 'boolean' ? raw.includeCoding : true,
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: not remembered */ }
}

function loadTab(): Tab {
  try { return localStorage.getItem(TAB_KEY) === 'practice' ? 'practice' : 'exam'; } catch { return 'exam'; }
}

const RUNG_WORDS = { read: 'reading', repair: 'fix or complete', write: 'coding' } as const;

/** Papers handed out in this browser session, so "Different paper" really does give different questions. */
let seenExam: readonly string[] = [];
let seenPractice: readonly string[] = [];

export function ExamPractice() {
  const [tab, setTab] = useState<Tab>(loadTab);
  const [pool, setPool] = useState<PoolEntry[] | null>(null);
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  useEffect(() => {
    let alive = true;
    loadPool(TOPIC_IDS).then((p) => { if (alive) setPool(p); });
    return () => { alive = false; };
  }, []);

  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(events, QUESTION_INDEX, settings); } catch { return {}; }
  }, [events, settings]);

  const [running, setRunning] = useState<
    { kind: TestKind; items: PoolEntry[]; minutes: number; runId: number; resume?: TestProgress } | null
  >(null);

  if (running) {
    const isExam = running.kind === 'mock-exam';
    const history = testHistory(events, running.kind);
    return (
      <TestRunner
        key={running.runId}
        title={isExam
          ? `Mock final exam · ${MOCK_EXAM_TOTAL_MARKS} marks`
          : `Practice test · ${plural(running.items.length, 'question')}`}
        questions={running.items.map((p) => p.item)}
        durationMin={running.minutes}
        persistKey={isExam ? EXAM_PROGRESS_KEY : PRACTICE_PROGRESS_KEY}
        resume={running.resume}
        mode={running.kind}
        marks={isExam ? marksByQid(running.items) : undefined}
        onFinish={() => { /* the setup screen reshuffles when it comes back */ }}
        resultExtra={(s) => {
          const prev = bestResult(history.filter((h) => h.ts < s.finishedAt));
          // The score and the pass mark are already in the headline above: only say how it compares.
          if (!prev) return null;
          return (
            <p>
              {s.percent > prev.percent
                ? <>A new best. Your previous best was {prev.percent}%.</>
                : <>Your best {isExam ? 'paper' : 'score'} before this: {prev.percent}%.</>}
            </p>
          );
        }}
        resultActions={() => (
          <>
            <Button variant="primary" onClick={() => setRunning(null)}>
              {isExam ? 'Back to exams' : 'New practice test'}
            </Button>
            <LinkButton href={href.report()}>See your report</LinkButton>
          </>
        )}
      />
    );
  }

  return (
    <div class="tx-page ms">
      <header class="tx-head">
        <h1>Exams</h1>
        <p>
          Sit a full mock paper built to the shape of the CITS1401 final, or build a shorter timed test
          over whichever topics you want to drill.
        </p>
      </header>

      <Segmented
        label="What to sit"
        value={tab}
        options={[{ value: 'exam', label: 'Mock final exam' }, { value: 'practice', label: 'Custom practice test' }]}
        onChange={(v) => { setTab(v as Tab); try { localStorage.setItem(TAB_KEY, v); } catch { /* ignore */ } }}
      />

      {tab === 'exam'
        ? <MockExam pool={pool} onStart={(items, resume) => setRunning({ kind: 'mock-exam', items, minutes: MOCK_EXAM_MINUTES, runId: Date.now(), resume })} />
        : <PracticeTest pool={pool} progress={progress} ready={ready} onStart={(items, minutes, resume) => setRunning({ kind: 'practice-test', items, minutes, runId: Date.now(), resume })} />}

      <History kind={tab === 'exam' ? 'mock-exam' : 'practice-test'} events={events} />
    </div>
  );
}

// ---------------------------------------------------------------- mock final exam

function MockExam({ pool, onStart }: { pool: PoolEntry[] | null; onStart: (items: PoolEntry[], resume?: TestProgress) => void }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [saved, setSaved] = useState<TestProgress | null>(() => readProgress('mock-exam', EXAM_PROGRESS_KEY));
  const [confirmNew, setConfirmNew] = useState(false);
  const [seenHere, setSeenHere] = useState<readonly string[]>(seenExam);

  const avoid = useMemo(() => new Set(seenHere), [seenHere]);
  const paper = useMemo(() => (pool ? buildMockExam(pool, seededRng(seed), avoid) : null), [pool, seed, avoid]);
  const perSlot = useMemo(() => (pool ? slotCandidates(pool) : new Map<ExamSlot, PoolEntry[]>()), [pool]);
  const missing = EXAM_SLOT_IDS.filter((s) => (perSlot.get(s) ?? []).length === 0);

  const remember = (qids: readonly string[]) => {
    seenExam = [...seenExam, ...qids].slice(-40);
    setSeenHere(seenExam);
  };
  const begin = () => {
    if (!paper) return;
    setConfirmNew(false);
    clearProgress('mock-exam', EXAM_PROGRESS_KEY);
    setSaved(null);
    remember(paper.map((p) => p.id));
    onStart(paper);
  };

  return (
    <>
      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); onStart(items, saved); }}
          onDiscard={() => { clearProgress('mock-exam', EXAM_PROGRESS_KEY); setSaved(null); }} />
      ) : null}

      <section class="tx-card ms-form" aria-labelledby="ex-paper">
        <div class="tx-card-head">
          <h2 id="ex-paper">The paper</h2>
          <span class="tx-best">
            <Icon name="target" size={14} /> {EXAM_SLOT_IDS.length} questions · {MOCK_EXAM_TOTAL_MARKS} marks · {MOCK_EXAM_MINUTES / 60} hours
          </span>
        </div>
        <p class="tx-muted">
          Closed book: no hints, no answers and no Run button, exactly like writing code by hand in the exam
          room. Every question is marked on the tests it passes when you submit.
        </p>

        <ol class="ex-slots">
          {EXAM_SLOT_IDS.map((slot, i) => {
            const pick = paper?.[i];
            const topic = pick ? TOPIC_BY_ID[pick.topicId] : undefined;
            return (
              <li key={slot} class="ex-slot">
                <span class="ex-slot-num tx-mono">Q{i + 1}</span>
                <span class="ex-slot-name">{EXAM_SLOT_LABEL[slot]}</span>
                <span class="ex-slot-topic tx-mono">{topic ? topic.short : (perSlot.get(slot) ?? []).length === 0 ? 'none yet' : ''}</span>
                <span class="ex-slot-marks tx-mono">{EXAM_SLOT_MARKS[slot]} marks</span>
              </li>
            );
          })}
        </ol>

        <div class="ms-start">
          {pool === null ? <p class="ms-summary"><span role="status">Loading questions…</span></p> : null}
          {missing.length > 0 ? (
            <p class="ms-note">
              <Icon name="info" size={16} />
              <span>
                No question is written yet for {missing.length === 1 ? 'one slot' : `${missing.length} slots`}:
                {' '}{missing.map((s) => EXAM_SLOT_LABEL[s]).join(', ')}. A full paper needs every slot filled.
              </span>
            </p>
          ) : null}
          <p class="ms-note">
            <Icon name="info" size={16} />
            <span>Practice built from PyLadder questions, not a real paper. Check LMS for this semester's format.</span>
          </p>
          <div class="tx-actions">
            <Button variant={saved ? 'secondary' : 'primary'} size="lg" disabled={!paper}
              onClick={() => (saved ? setConfirmNew(true) : begin())}>
              Start mock exam <Icon name="arrowRight" />
            </Button>
            {paper ? (
              <Button variant="ghost" onClick={() => { remember(paper.map((p) => p.id)); setSeed(Math.floor(Math.random() * 2 ** 31)); }}>
                <Icon name="refresh" /> Different paper
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <ConfirmDialog open={confirmNew} title="Start a new paper?" confirmLabel="Start new paper" cancelLabel="Keep my paper"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The paper you have in progress will be discarded and its saved answers deleted.</p>
      </ConfirmDialog>
    </>
  );
}

// ---------------------------------------------------------------- custom practice test

function PracticeTest({ pool, progress, ready, onStart }: {
  pool: PoolEntry[] | null;
  progress: Partial<Record<TopicId, TopicProgress>>;
  ready: boolean;
  onStart: (items: PoolEntry[], minutes: number, resume?: TestProgress) => void;
}) {
  const [setup, setStored] = useState<Setup>(loadSetup);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [saved, setSaved] = useState<TestProgress | null>(() => readProgress('practice-test', PRACTICE_PROGRESS_KEY));
  const [confirmNew, setConfirmNew] = useState(false);
  const [seenHere, setSeenHere] = useState<readonly string[]>(seenPractice);
  const events = store.events.value;

  const setSetup = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setStored(next);
    save(SETUP_KEY, next);
  };

  const topicKey = setup.topicIds.join(',');
  const history = useMemo(() => testHistory(events, 'practice-test'), [events]);
  const eligibleCount = useMemo(
    () => (pool ? practiceEligible(pool, { topicIds: setup.topicIds, includeCoding: setup.includeCoding }).length : 0),
    [pool, topicKey, setup.includeCoding],
  );
  const avoid = useMemo(() => {
    const set = recentlyUsedQids(history.map((h) => h.qids), eligibleCount);
    for (const qid of seenHere) set.add(qid);
    return set;
  }, [history, eligibleCount, seenHere]);
  const selection = useMemo(
    () => (pool ? selectPracticeTest(pool, { topicIds: setup.topicIds, count: setup.count, includeCoding: setup.includeCoding }, seededRng(seed), avoid) : []),
    [pool, topicKey, setup.count, setup.includeCoding, seed, avoid],
  );
  const eligibleByTopic = useMemo(() => {
    const m = new Map<TopicId, number>();
    if (pool) for (const t of TOPICS) m.set(t.id, practiceEligible(pool, { topicIds: [t.id], includeCoding: setup.includeCoding }).length);
    return m;
  }, [pool, setup.includeCoding]);

  const remember = (qids: readonly string[]) => {
    seenPractice = [...seenPractice, ...qids].slice(-60);
    setSeenHere(seenPractice);
  };
  const est = estimatedMinutes(selection);
  const rungCounts = (['read', 'repair', 'write'] as const)
    .map((r) => ({ r, n: selection.filter((c) => FORMAT_LADDER[c.format] === r).length }))
    .filter((x) => x.n > 0);
  const shortBy = setup.count - selection.length;
  const canStart = selection.length > 0;
  const lockedChosen = ready ? setup.topicIds.filter((t) => progress[t]?.state === 'locked') : [];

  const begin = () => {
    setConfirmNew(false);
    clearProgress('practice-test', PRACTICE_PROGRESS_KEY);
    setSaved(null);
    remember(selection.map((s) => s.id));
    onStart(selection, setup.minutes);
  };

  const toggleTopic = (id: TopicId) => {
    const on = setup.topicIds.includes(id);
    const topicIds = on ? setup.topicIds.filter((t) => t !== id) : ALL_TOPICS.filter((t) => t === id || setup.topicIds.includes(t));
    setSetup({ topicIds });
  };

  const openIds = openTopicIds(progress);
  const isAll = setup.topicIds.length === ALL_TOPICS.length;
  const isOpenOnly = ready && !isAll && setup.topicIds.length === openIds.length && openIds.every((t) => setup.topicIds.includes(t));

  return (
    <>
      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); onStart(items, saved.durationMin, saved); }}
          onDiscard={() => { clearProgress('practice-test', PRACTICE_PROGRESS_KEY); setSaved(null); }} />
      ) : null}

      <section class="tx-card ms-form" aria-label="Set up your practice test">
        <fieldset class="ms-topics">
          <legend class="sr-only">Topics</legend>
          <div class="ms-row-head">
            <span class="ms-label" aria-hidden="true">Topics</span>
            <span class="ms-sub tx-mono">{setup.topicIds.length} of {TOPICS.length}</span>
            <span class="ms-quick">
              <button type="button" class="tx-textbtn" aria-pressed={isAll} onClick={() => setSetup({ topicIds: ALL_TOPICS })}>All</button>
              <button type="button" class="tx-textbtn" aria-pressed={isOpenOnly} onClick={() => setSetup({ topicIds: openTopicIds(progress) })}>Ones I can practise</button>
              <button type="button" class="tx-textbtn" onClick={() => setSetup({ topicIds: [] })}>Clear</button>
            </span>
          </div>
          <ul class="ms-grid">
            {TOPICS.map((t) => {
              const on = setup.topicIds.includes(t.id);
              const n = eligibleByTopic.get(t.id);
              return (
                <li key={t.id}>
                  <label class={`ms-tile${on ? ' on' : ''}${n === 0 ? ' empty' : ''}`} title={t.title}>
                    <input class="sr-only" type="checkbox" checked={on} onChange={() => toggleTopic(t.id)}
                      aria-label={`Topic ${Number(t.num)}: ${t.title}${n === 0 ? ' (no questions yet)' : ''}`} />
                    <span class="ms-tile-top" aria-hidden="true">
                      <span class="ms-tile-num">{t.num}<span class="ms-tile-count">{pool === null ? '' : n === 0 ? ' · none yet' : ` · ${plural(n ?? 0, 'question')}`}</span></span>
                      <span class="ms-tile-mark">{on ? <Icon name="check" size={12} /> : null}</span>
                    </span>
                    <span class="ms-tile-name">{t.short}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div class="ms-options">
          <div class="ms-field">
            <span id="ms-count-l" class="ms-label">Questions</span>
            <Segmented labelledBy="ms-count-l" value={String(setup.count)}
              options={PRACTICE_COUNTS.map((c) => ({ value: String(c), label: String(c) }))} onChange={(v) => setSetup({ count: Number(v) })} />
          </div>
          <div class="ms-field">
            <span id="ms-time-l" class="ms-label">Time</span>
            <Segmented labelledBy="ms-time-l" value={String(setup.minutes)}
              options={PRACTICE_MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} onChange={(v) => setSetup({ minutes: Number(v) })} />
          </div>
          <div class="ms-field ms-switch">
            <Switch checked={setup.includeCoding} onChange={(includeCoding) => setSetup({ includeCoding })} label="Include coding questions" describedBy="ms-coding-sub" />
            <span id="ms-coding-sub" class="ms-sub">
              {setup.includeCoding ? 'Runs real Python in your browser.' : 'Reading questions only.'}
            </span>
          </div>
        </div>

        <div class="ms-start">
          <p class="ms-summary" aria-live="polite">
            {pool === null ? <span role="status">Loading questions…</span> : setup.topicIds.length === 0 ? <span>Choose at least one topic.</span> : selection.length === 0 ? (
              <span>No questions are ready in these topics{setup.includeCoding ? '' : ' without coding'}.</span>
            ) : (
              <span><b>{selection.length}</b> questions · {rungCounts.map((x) => `${x.n} ${RUNG_WORDS[x.r]}`).join(', ')} · about <b>{est} min</b></span>
            )}
          </p>
          {shortBy > 0 && selection.length > 0 ? (
            <p class="ms-note"><Icon name="info" size={16} /> <span>Only {plural(selection.length, 'question')} match these choices.</span></p>
          ) : null}
          {selection.length > 0 && est > setup.minutes * 1.2 ? (
            <p class="ms-note">
              <Icon name="clock" size={16} />
              <span>
                These usually take about {est} minutes, so {setup.minutes} minutes will not be enough for all of them.
                Give yourself more time, or fewer questions, for a full run.
              </span>
            </p>
          ) : null}
          {lockedChosen.length > 0 && selection.length > 0 ? (
            <p class="ms-note">
              <Icon name="lock" size={16} />
              <span>
                {lockedChosen.length === setup.topicIds.length
                  ? 'These topics are not open on your ladder yet.'
                  : `${plural(lockedChosen.length, 'chosen topic')} ${lockedChosen.length === 1 ? 'is' : 'are'} not open on your ladder yet.`}
                {' '}Revise them here any time; their practice pages open as you work up the ladder.
              </span>
            </p>
          ) : null}
          <div class="tx-actions">
            <Button variant={saved ? 'secondary' : 'primary'} size="lg" onClick={() => (saved ? setConfirmNew(true) : begin())} disabled={!canStart}>
              Start test <Icon name="arrowRight" />
            </Button>
            {canStart ? (
              <Button variant="ghost" onClick={() => { remember(selection.map((s) => s.id)); setSeed(Math.floor(Math.random() * 2 ** 31)); }}>
                <Icon name="refresh" /> Different questions
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <ConfirmDialog open={confirmNew} title="Start a new test?" confirmLabel="Start new test" cancelLabel="Keep my test"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The test you have in progress will be discarded and its saved answers deleted.</p>
      </ConfirmDialog>
    </>
  );
}

// ---------------------------------------------------------------- past attempts

function History({ kind, events }: { kind: TestKind; events: readonly AppEvent[] }) {
  const history = useMemo(() => testHistory(events, kind), [events, kind]);
  const best = bestResult(history);
  const isExam = kind === 'mock-exam';
  return (
    <section class="tx-card" aria-labelledby="ex-history">
      <div class="tx-card-head">
        <h2 id="ex-history">{isExam ? 'Past papers' : 'Past attempts'}</h2>
        {best ? <span class="tx-best"><Icon name="target" size={14} /> Best {best.percent}% · {best.score} of {best.total}</span> : null}
      </div>
      {history.length === 0 ? (
        <p class="tx-muted">
          {isExam ? 'No mock exams yet. Your marks appear here after you sit one.' : 'No practice tests yet. Your scores appear here after you finish one.'}
        </p>
      ) : (
        <div class="tx-table-wrap">
          <table class="tx-table">
            <thead><tr><th scope="col">Date</th><th scope="col">{isExam ? 'Marks' : 'Score'}</th><th scope="col">Topics</th><th scope="col">Time</th></tr></thead>
            <tbody>
              {history.slice(0, 8).map((h) => (
                <tr key={h.ts}>
                  <td class="dim">{formatDateTime(h.ts)}</td>
                  <td class="num"><b>{h.score}/{h.total}</b> <span class="dim">· {h.percent}%</span>{best && h.ts === best.ts ? <span class="tx-best-tag">Best</span> : null}</td>
                  <td class="wide dim">{topicList(h.topicIds)}</td>
                  <td class="num dim">{formatDuration(h.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.length > 8 ? <p class="tx-muted">Showing your latest 8 of {history.length} attempts.</p> : null}
    </section>
  );
}

function topicList(ids: readonly TopicId[]): string {
  const names = ids.map((id) => TOPIC_BY_ID[id]?.short ?? id);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}
