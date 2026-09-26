// Exams for STAT2402 (#/exam when the unit is STAT2402): the mock final, a custom practice test, and the
// list of lesson quizzes. The CITS1401 Exams page is ExamPractice; this is its counterpart, built on the R
// question bank (src/content/stat2402/questions/) rather than the Python one, with the same look.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { lessonsInTrack } from '../../content/lessons/index.ts';
import { loadStatBank } from '../../content/statBank.ts';
import type { StatAttempt, StatBank, StatItem, StatTestKind } from '../../engine/statExam.ts';
import {
  bestAttempt, buildMock, buildPractice, minutesFor, MOCK_MINUTES, MOCK_TOTAL_MARKS, MOCK_WRITE_QUESTIONS,
  PRACTICE_COUNTS, practiceEligible, recentQids, seededRng, statHistory,
} from '../../engine/statExam.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../components/Segmented.tsx';
import { Switch } from '../components/Switch.tsx';
import { formatDateTime, formatDuration } from '../report/format.ts';
import { ConfirmDialog } from '../testmode/ConfirmDialog.tsx';
import type { StatProgress } from '../stat/progress.ts';
import { clearStatProgress, itemsFromProgress, readStatProgress, timeLeftMs } from '../stat/progress.ts';
import { StatTestRunner } from '../stat/StatTestRunner.tsx';
import '../testmode/testmode.css';
import '../stat/stat.css';

type Tab = 'mock' | 'practice' | 'quizzes';
const TAB_KEY = 'pyladder:stat-exam-tab';
const SETUP_KEY = 'pyladder:stat-practice-setup';

interface Running { kind: StatTestKind; title: string; items: StatItem[]; lessonIds: string[]; minutes: number; key: string; resume?: StatProgress; runId: number }

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return t === 'practice' || t === 'quizzes' ? t : 'mock';
  } catch {
    return 'mock';
  }
}

interface Setup { lessonIds: string[]; count: number; includeWrite: boolean }

function readSetup(all: string[]): Setup {
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<Setup> | null;
    const lessonIds = Array.isArray(raw?.lessonIds) ? raw.lessonIds.filter((l) => all.includes(l)) : all;
    return {
      lessonIds: lessonIds.length ? lessonIds : all,
      count: (PRACTICE_COUNTS as readonly number[]).includes(raw?.count ?? 0) ? raw!.count! : 10,
      includeWrite: typeof raw?.includeWrite === 'boolean' ? raw.includeWrite : true,
    };
  } catch {
    return { lessonIds: all, count: 10, includeWrite: true };
  }
}

/** A paper left unfinished: how far it got, and a way back in or out. */
export function StatResumeCard({ progress, onResume, onDiscard }: { progress: StatProgress; onResume: () => void; onDiscard: () => void }) {
  const left = timeLeftMs(progress);
  const done = progress.answers.filter(Boolean).length;
  return (
    <section class="tx-card sx-resume" aria-label="Unfinished paper">
      <div>
        <p class="tx-eyebrow">Unfinished</p>
        <p class="sx-resume-t">{progress.title}</p>
        <p class="tx-muted">
          {done} of {progress.qids.length} answered · {left > 0 ? `${Math.ceil(left / 60_000)} min left` : 'time ran out; it will be marked as it stands'}
        </p>
      </div>
      <div class="tx-actions">
        <Button variant="primary" onClick={onResume}>{left > 0 ? 'Carry on' : 'Mark it'}</Button>
        <Button variant="ghost" onClick={onDiscard}>Discard</Button>
      </div>
    </section>
  );
}

export function StatHistory({ history, empty, lessonTitles }: { history: StatAttempt[]; empty: string; lessonTitles?: boolean }) {
  const best = bestAttempt(history);
  const titles = useMemo(() => new Map(lessonsInTrack('stat2402').map((l) => [l.id, l.title])), []);
  if (history.length === 0) return <p class="tx-muted">{empty}</p>;
  return (
    <>
      {best ? <p class="tx-best"><Icon name="target" size={14} /> Best {best.percent}% · {best.score} of {best.total}</p> : null}
      <div class="tx-table-wrap">
        <table class="tx-table">
          <thead><tr><th scope="col">Date</th><th scope="col">Marks</th>{lessonTitles ? <th scope="col">Lessons</th> : null}<th scope="col">Time</th></tr></thead>
          <tbody>
            {history.slice(0, 8).map((h) => (
              <tr key={h.ts}>
                <td class="dim">{formatDateTime(h.ts)}</td>
                <td class="num"><b>{h.score}/{h.total}</b> <span class="dim">· {h.percent}%</span>{best && h.ts === best.ts ? <span class="tx-best-tag">Best</span> : null}</td>
                {lessonTitles ? <td class="wide dim">{h.lessonIds.length > 2 ? `${h.lessonIds.length} lessons` : h.lessonIds.map((l) => titles.get(l) ?? l).join(', ')}</td> : null}
                <td class="num dim">{formatDuration(h.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function StatExams() {
  const [bank, setBank] = useState<StatBank | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>(readTab);
  const [running, setRunning] = useState<Running | null>(null);
  const events = store.events.value;
  const lessons = lessonsInTrack('stat2402');
  const order = lessons.map((l) => l.id);

  useEffect(() => {
    loadStatBank().then(setBank, () => setFailed(true));
  }, []);

  if (running) {
    const history = statHistory(events, running.kind);
    return (
      <StatTestRunner
        key={running.runId}
        kind={running.kind}
        title={running.title}
        items={running.items}
        lessonIds={running.lessonIds}
        minutes={running.minutes}
        persistKey={running.key}
        resume={running.resume}
        extra={(s) => {
          const prev = bestAttempt(history.filter((h) => h.ts < s.finishedAt));
          if (!prev) return null;
          return <p>{s.percent > prev.percent ? <>A new best. Your previous best was {prev.percent}%.</> : <>Your best before this: {prev.percent}%.</>}</p>;
        }}
        actions={() => (
          <>
            <Button variant="primary" onClick={() => setRunning(null)}>Back to exams</Button>
            <LinkButton href={href.lessons()}>Lessons</LinkButton>
          </>
        )}
      />
    );
  }

  const start = (r: Omit<Running, 'runId'>) => setRunning({ ...r, runId: Date.now() });

  return (
    <div class="tx-page sx">
      <header class="tx-head">
        <h1>Exams</h1>
        <p>
          A mock final across the whole unit, a practice test over the lessons you choose, or the quiz for one
          lesson. Every answer is checked against what R itself printed, and writing questions are marked by
          running your code in R.
        </p>
      </header>

      <Segmented
        label="What to sit"
        value={tab}
        options={[{ value: 'mock', label: 'Mock final' }, { value: 'practice', label: 'Practice test' }, { value: 'quizzes', label: 'Lesson quizzes' }]}
        onChange={(v) => { setTab(v as Tab); try { localStorage.setItem(TAB_KEY, v); } catch { /* ignore */ } }}
      />

      {failed ? <p class="tx-muted" role="alert">The questions could not be loaded. Check your connection and reload the page.</p> : null}

      {tab === 'mock' ? <MockPanel bank={bank} order={order} onStart={start} /> : null}
      {tab === 'practice' ? <PracticePanel bank={bank} order={order} onStart={start} /> : null}
      {tab === 'quizzes' ? <QuizzesPanel /> : null}
    </div>
  );
}

function MockPanel({ bank, order, onStart }: { bank: StatBank | null; order: string[]; onStart: (r: Omit<Running, 'runId'>) => void }) {
  const events = store.events.value;
  const history = useMemo(() => statHistory(events, 'mock'), [events]);
  const [saved, setSaved] = useState<StatProgress | null>(() => readStatProgress('mock'));
  const [confirmNew, setConfirmNew] = useState(false);

  const begin = () => {
    if (!bank) return;
    setConfirmNew(false);
    clearStatProgress('mock');
    setSaved(null);
    const items = buildMock(bank, order, seededRng(Math.floor(Math.random() * 2 ** 31)), recentQids(history));
    onStart({ kind: 'mock', title: `Mock final · ${MOCK_TOTAL_MARKS} marks`, items, lessonIds: [...new Set(items.map((i) => i.q.lessonId))], minutes: MOCK_MINUTES, key: 'mock' });
  };
  const resume = () => {
    if (!bank || !saved) return;
    const items = itemsFromProgress(bank, saved);
    if (!items) { clearStatProgress('mock'); setSaved(null); return; }
    onStart({ kind: 'mock', title: saved.title, items, lessonIds: saved.lessonIds, minutes: saved.minutes, key: 'mock', resume: saved });
  };

  return (
    <>
      {saved ? <StatResumeCard progress={saved} onResume={resume} onDiscard={() => { clearStatProgress('mock'); setSaved(null); }} /> : null}
      <section class="tx-card" aria-labelledby="sx-mock">
        <div class="tx-card-head"><h2 id="sx-mock">Mock final</h2></div>
        <p class="tx-muted">
          One question from every lesson, then {MOCK_WRITE_QUESTIONS} questions where you write R, marked out of {MOCK_TOTAL_MARKS} in {MOCK_MINUTES / 60} hours.
          A new mix every time, favouring questions you have not just seen.
        </p>
        <p class="tx-muted sx-note">This is practice across the unit, not a copy of the real paper: the unit outline is the authority on the exam's format.</p>
        <div class="tx-actions">
          <Button variant={saved ? 'secondary' : 'primary'} size="lg" disabled={!bank} onClick={() => (saved ? setConfirmNew(true) : begin())}>
            {bank ? 'Sit the mock final' : 'Loading questions…'} {bank ? <Icon name="arrowRight" /> : null}
          </Button>
        </div>
      </section>
      <section class="tx-card" aria-labelledby="sx-mock-h">
        <div class="tx-card-head"><h2 id="sx-mock-h">Past papers</h2></div>
        <StatHistory history={history} empty="No mock finals yet. Your marks appear here after you sit one." />
      </section>
      <ConfirmDialog open={confirmNew} title="Start a new paper?" confirmLabel="Start new paper" cancelLabel="Keep my paper"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The paper you have in progress will be discarded and its answers deleted.</p>
      </ConfirmDialog>
    </>
  );
}

function PracticePanel({ bank, order, onStart }: { bank: StatBank | null; order: string[]; onStart: (r: Omit<Running, 'runId'>) => void }) {
  const lessons = lessonsInTrack('stat2402');
  const [setup, setStored] = useState<Setup>(() => readSetup(order));
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [saved, setSaved] = useState<StatProgress | null>(() => readStatProgress('practice'));
  const [confirmNew, setConfirmNew] = useState(false);
  const events = store.events.value;
  const history = useMemo(() => statHistory(events, 'practice'), [events]);

  const setSetup = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setStored(next);
    try { localStorage.setItem(SETUP_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };
  const selection = useMemo(
    () => (bank ? buildPractice(bank, setup, order, seededRng(seed), recentQids(history)) : []),
    [bank, setup, seed, history],
  );
  const eligible = (id: string) => (bank ? practiceEligible(bank, { lessonIds: [id], includeWrite: setup.includeWrite }).length : 0);
  const minutes = minutesFor(selection);

  const toggle = (id: string) => {
    const on = setup.lessonIds.includes(id);
    setSetup({ lessonIds: on ? setup.lessonIds.filter((l) => l !== id) : order.filter((l) => l === id || setup.lessonIds.includes(l)) });
  };
  const begin = () => {
    setConfirmNew(false);
    clearStatProgress('practice');
    setSaved(null);
    onStart({ kind: 'practice', title: `Practice test · ${selection.length} questions`, items: selection, lessonIds: [...new Set(selection.map((i) => i.q.lessonId))], minutes, key: 'practice' });
    setSeed(Math.floor(Math.random() * 2 ** 31));
  };
  const resume = () => {
    if (!bank || !saved) return;
    const items = itemsFromProgress(bank, saved);
    if (!items) { clearStatProgress('practice'); setSaved(null); return; }
    onStart({ kind: 'practice', title: saved.title, items, lessonIds: saved.lessonIds, minutes: saved.minutes, key: 'practice', resume: saved });
  };

  return (
    <>
      {saved ? <StatResumeCard progress={saved} onResume={resume} onDiscard={() => { clearStatProgress('practice'); setSaved(null); }} /> : null}
      <section class="tx-card ms-form" aria-label="Set up your practice test">
        <fieldset class="ms-topics">
          <legend class="sr-only">Lessons</legend>
          <div class="ms-row-head">
            <span class="ms-label" aria-hidden="true">Lessons</span>
            <span class="ms-sub tx-mono">{setup.lessonIds.length} of {lessons.length}</span>
            <span class="ms-quick">
              <button type="button" class="tx-textbtn" aria-pressed={setup.lessonIds.length === lessons.length} onClick={() => setSetup({ lessonIds: order })}>All</button>
              <button type="button" class="tx-textbtn" onClick={() => setSetup({ lessonIds: [] })}>Clear</button>
            </span>
          </div>
          <ul class="ms-grid">
            {lessons.map((l, i) => {
              const on = setup.lessonIds.includes(l.id);
              const n = eligible(l.id);
              return (
                <li key={l.id}>
                  <label class={`ms-tile${on ? ' on' : ''}${bank && n === 0 ? ' empty' : ''}`} title={l.title}>
                    <input class="sr-only" type="checkbox" checked={on} onChange={() => toggle(l.id)} aria-label={`Lesson ${i + 1}: ${l.title}`} />
                    <span class="ms-tile-top" aria-hidden="true">
                      <span class="ms-tile-num">{String(i + 1).padStart(2, '0')}<span class="ms-tile-count">{bank ? ` · ${n} ${n === 1 ? 'question' : 'questions'}` : ''}</span></span>
                      <span class="ms-tile-mark">{on ? <Icon name="check" size={12} /> : null}</span>
                    </span>
                    <span class="ms-tile-name">{l.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
        <div class="ms-options">
          <div class="ms-field">
            <span id="sx-count-l" class="ms-label">Questions</span>
            <Segmented labelledBy="sx-count-l" value={String(setup.count)}
              options={PRACTICE_COUNTS.map((c) => ({ value: String(c), label: String(c) }))} onChange={(v) => setSetup({ count: Number(v) })} />
          </div>
          <div class="ms-field ms-switch">
            <Switch checked={setup.includeWrite} onChange={(includeWrite) => setSetup({ includeWrite })} label="Include writing R" describedBy="sx-write-sub" />
            <span id="sx-write-sub" class="ms-sub">{setup.includeWrite ? 'Marked by running your code in R.' : 'Reading, numbers and predicting only.'}</span>
          </div>
        </div>
        <div class="ms-start">
          <p class="ms-summary" aria-live="polite">
            {!bank ? <span role="status">Loading questions…</span> : setup.lessonIds.length === 0 ? <span>Choose at least one lesson.</span>
              : <span><b>{selection.length}</b> questions · <b>{minutes} min</b></span>}
          </p>
          <div class="tx-actions">
            <Button variant={saved ? 'secondary' : 'primary'} size="lg" onClick={() => (saved ? setConfirmNew(true) : begin())} disabled={selection.length === 0}>
              Start test <Icon name="arrowRight" />
            </Button>
            {selection.length > 0 ? (
              <Button variant="ghost" onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}><Icon name="refresh" /> Different questions</Button>
            ) : null}
          </div>
        </div>
      </section>
      <section class="tx-card" aria-labelledby="sx-prac-h">
        <div class="tx-card-head"><h2 id="sx-prac-h">Past attempts</h2></div>
        <StatHistory history={history} empty="No practice tests yet. Your scores appear here after you finish one." lessonTitles />
      </section>
      <ConfirmDialog open={confirmNew} title="Start a new test?" confirmLabel="Start new test" cancelLabel="Keep my test"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The test you have in progress will be discarded and its answers deleted.</p>
      </ConfirmDialog>
    </>
  );
}

function QuizzesPanel() {
  const events = store.events.value;
  const lessons = lessonsInTrack('stat2402');
  return (
    <section class="tx-card" aria-labelledby="sx-quizzes">
      <div class="tx-card-head"><h2 id="sx-quizzes">Lesson quizzes</h2></div>
      <p class="tx-muted">A short timed quiz on each lesson, every question from that lesson. Take one straight after reading, and again a week later.</p>
      <ol class="sx-quiz-list">
        {lessons.map((l, i) => {
          const best = bestAttempt(statHistory(events, 'quiz', l.id));
          return (
            <li key={l.id}>
              <a class="sx-quiz" href={href.quiz(l.id)}>
                <span class="sx-quiz-n num" aria-hidden="true">{i + 1}</span>
                <span class="sx-quiz-t">{l.title}</span>
                <span class="sx-quiz-best num">{best ? `Best ${best.percent}%` : 'Not taken'}</span>
                <Icon name="arrowRight" size={14} />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
