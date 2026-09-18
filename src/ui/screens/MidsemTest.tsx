// Mid-semester practice test (#/midsem): choose topics, size, time and coding, then take a timed mixed test.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { FORMAT_LADDER, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { topicProgressAll } from '../../engine/progress.ts';
import type { TopicProgress } from '../../engine/progress.ts';
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
  estimatedMinutes, MIDSEM_COUNTS, MIDSEM_DEFAULT_COUNT, MIDSEM_DEFAULT_MINUTES, MIDSEM_MINUTES, MIDSEM_PASS_PERCENT,
  midsemEligible, recentlyUsedQids, seededRng, selectMidsem,
} from '../testmode/select.ts';
import { defaultMidsemTopics, openTopicIds } from '../testmode/lock.ts';
import { bestResult, testHistory } from '../testmode/summary.ts';
import type { TestProgress } from '../testmode/progress.ts';
import { clearProgress, readProgress } from '../testmode/progress.ts';
import { ResumeCard } from '../testmode/ResumeCard.tsx';
import { storeReady } from '../shell/storeReady.ts';
import '../testmode/testmode.css';

interface Setup { topicIds: TopicId[]; count: number; minutes: number; includeCoding: boolean }

const SETUP_KEY = 'pyladder:midsem-setup';
const PROGRESS_KEY = 'midsem';
const DEFAULT_TOPICS: TopicId[] = TOPICS.filter((t) => t.midsem).map((t) => t.id);
const DEFAULT_SETUP: Setup = { topicIds: DEFAULT_TOPICS, count: MIDSEM_DEFAULT_COUNT, minutes: MIDSEM_DEFAULT_MINUTES, includeCoding: true };

/** The saved setup, or null when the student has never changed it (then the topics come from what they can practise). */
function loadSetup(): Setup | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<Setup> | null;
    if (!raw) return null;
    const topicIds = Array.isArray(raw.topicIds) ? raw.topicIds.filter((t): t is TopicId => (TOPIC_IDS as readonly string[]).includes(t)) : DEFAULT_TOPICS;
    return {
      topicIds,
      count: (MIDSEM_COUNTS as readonly number[]).includes(raw.count ?? 0) ? raw.count! : DEFAULT_SETUP.count,
      minutes: (MIDSEM_MINUTES as readonly number[]).includes(raw.minutes ?? 0) ? raw.minutes! : DEFAULT_SETUP.minutes,
      includeCoding: typeof raw.includeCoding === 'boolean' ? raw.includeCoding : true,
    };
  } catch {
    return null;
  }
}

function saveSetup(s: Setup) {
  try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch { /* private mode: not remembered */ }
}

const RUNG_WORDS = { read: 'reading', repair: 'fix or complete', write: 'coding' } as const;

/**
 * Questions already handed out in this browser session (started or replaced with "Different questions").
 * Module scope, so leaving the page and coming back still gives a different paper; finished tests are remembered
 * in the event log instead.
 */
let seenThisSession: readonly string[] = [];

export function MidsemTest() {
  const [stored, setStored] = useState<Setup | null>(loadSetup);
  const [autoTopics, setAutoTopics] = useState<TopicId[] | null>(null);
  const [pool, setPool] = useState<PoolEntry[] | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [running, setRunning] = useState<{ items: PoolEntry[]; minutes: number; runId: number; resume?: TestProgress } | null>(null);
  const [saved, setSaved] = useState<TestProgress | null>(() => readProgress('midsem', PROGRESS_KEY));
  const [confirmNew, setConfirmNew] = useState(false);
  // Questions from papers already seen, so "Different questions" and a second go really do give different ones.
  const [seenHere, setSeenHereState] = useState<readonly string[]>(seenThisSession);
  const rememberSeen = (qids: readonly string[]) => {
    seenThisSession = [...seenThisSession, ...qids].slice(-60);
    setSeenHereState(seenThisSession);
  };
  const events = store.events.value;
  const settings = store.settings.value;
  const ready = storeReady.value;

  useEffect(() => {
    let alive = true;
    loadPool(TOPIC_IDS).then((p) => { if (alive) setPool(p); });
    return () => { alive = false; };
  }, []);

  const progress = useMemo<Partial<Record<TopicId, TopicProgress>>>(() => {
    try { return topicProgressAll(events, QUESTION_INDEX, settings); } catch { return {}; }
  }, [events, settings]);

  // Without a saved setup, start from the topics the student can practise (so every result links somewhere useful).
  useEffect(() => {
    if (!stored && ready) setAutoTopics(defaultMidsemTopics(progress));
  }, [stored, ready, progress]);

  const setup: Setup = stored ?? { ...DEFAULT_SETUP, topicIds: autoTopics ?? DEFAULT_TOPICS };
  const setSetup = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setStored(next);
    saveSetup(next);
  };

  const topicKey = setup.topicIds.join(',');
  const history = useMemo(() => testHistory(events, 'midsem'), [events]);
  const eligibleCount = useMemo(
    () => (pool ? midsemEligible(pool, { topicIds: setup.topicIds, includeCoding: setup.includeCoding }).length : 0),
    [pool, topicKey, setup.includeCoding],
  );
  // Questions from recent attempts are held back until the pool runs out, so repeat papers are genuinely new.
  const avoid = useMemo(() => {
    const set = recentlyUsedQids(history.map((h) => h.qids), eligibleCount);
    for (const qid of seenHere) set.add(qid);
    return set;
  }, [history, eligibleCount, seenHere]);
  const selection = useMemo(
    () => (pool ? selectMidsem(pool, { topicIds: setup.topicIds, count: setup.count, includeCoding: setup.includeCoding }, seededRng(seed), avoid) : []),
    [pool, topicKey, setup.count, setup.includeCoding, seed, avoid],
  );
  const eligibleByTopic = useMemo(() => {
    const m = new Map<TopicId, number>();
    if (pool) for (const t of TOPICS) m.set(t.id, midsemEligible(pool, { topicIds: [t.id], includeCoding: setup.includeCoding }).length);
    return m;
  }, [pool, setup.includeCoding]);
  const best = bestResult(history);
  const lockedChosen = ready ? setup.topicIds.filter((t) => progress[t]?.state === 'locked') : [];
  const reshuffle = () => {
    rememberSeen(selection.map((s) => s.id));
    setSeed(Math.floor(Math.random() * 2 ** 31));
  };

  if (running) {
    const n = running.items.length;
    return (
      <TestRunner
        key={running.runId}
        title={`Mid-semester practice · ${plural(n, 'question')}`}
        questions={running.items.map((p) => p.item)}
        durationMin={running.minutes}
        persistKey={PROGRESS_KEY}
        resume={running.resume}
        mode="midsem"
        onFinish={() => setSeed(Math.floor(Math.random() * 2 ** 31))}
        resultExtra={(s) => {
          const prev = bestResult(history.filter((h) => h.ts < s.finishedAt));
          return (
            <p>
              {prev ? (s.percent > prev.percent
                ? <>New best score. Your previous best was {prev.percent}%. </>
                : <>Your best before this test: {prev.percent}% ({prev.score} of {prev.total}). </>) : null}
              Pass mark in this practice test: {MIDSEM_PASS_PERCENT}%.
            </p>
          );
        }}
        resultActions={() => (
          <>
            <Button variant="primary" onClick={() => { setSaved(readProgress('midsem', PROGRESS_KEY)); setRunning(null); }}>New practice test</Button>
            <LinkButton href={href.report()}>See your report</LinkButton>
          </>
        )}
      />
    );
  }

  const toggleTopic = (id: TopicId) => {
    const on = setup.topicIds.includes(id);
    const topicIds = on ? setup.topicIds.filter((t) => t !== id) : TOPICS.map((t) => t.id).filter((t) => t === id || setup.topicIds.includes(t));
    setSetup({ topicIds });
  };

  const est = estimatedMinutes(selection);
  const rungCounts = (['read', 'repair', 'write'] as const)
    .map((r) => ({ r, n: selection.filter((c) => FORMAT_LADDER[c.format] === r).length }))
    .filter((x) => x.n > 0);
  const shortBy = setup.count - selection.length;
  const canStart = selection.length > 0;

  const start = () => {
    if (!canStart) return;
    if (saved) { setConfirmNew(true); return; }
    begin();
  };
  const begin = () => {
    setConfirmNew(false);
    clearProgress('midsem', PROGRESS_KEY);
    setSaved(null);
    rememberSeen(selection.map((s) => s.id));
    setRunning({ items: selection, minutes: setup.minutes, runId: seed });
  };
  const isDefault = setup.topicIds.length === DEFAULT_TOPICS.length && DEFAULT_TOPICS.every((t) => setup.topicIds.includes(t));
  const openIds = openTopicIds(progress);
  const isOpenOnly = ready && setup.topicIds.length === openIds.length && openIds.every((t) => setup.topicIds.includes(t));

  return (
    <div class="tx-page ms">
      <header class="tx-head">
        <h1>Mid-semester practice test</h1>
        <p>A timed mix of questions from the topics you choose, with one check each and a full review at the end.</p>
      </header>

      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); setRunning({ items, minutes: saved.durationMin, runId: saved.startedAt, resume: saved }); }}
          onDiscard={() => { clearProgress('midsem', PROGRESS_KEY); setSaved(null); }} />
      ) : null}

      <section class="tx-card ms-form" aria-label="Set up your test">

        <fieldset class="ms-topics">
          <legend class="sr-only">Topics</legend>
          <div class="ms-row-head">
            <span class="ms-label" aria-hidden="true">Topics</span>
            <span class="ms-sub tx-mono">{setup.topicIds.length} of {TOPICS.length}</span>
            <span class="ms-quick">
              <button type="button" class="tx-textbtn" aria-pressed={isDefault} onClick={() => setSetup({ topicIds: DEFAULT_TOPICS })}>Mid-sem topics</button>
              <button type="button" class="tx-textbtn" aria-pressed={isOpenOnly} onClick={() => setSetup({ topicIds: openTopicIds(progress) })}>Ones I can practise</button>
              <button type="button" class="tx-textbtn" onClick={() => setSetup({ topicIds: TOPICS.map((t) => t.id) })}>All</button>
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
              options={MIDSEM_COUNTS.map((c) => ({ value: String(c), label: String(c) }))} onChange={(v) => setSetup({ count: Number(v) })} />
          </div>
          <div class="ms-field">
            <span id="ms-time-l" class="ms-label">Time</span>
            <Segmented labelledBy="ms-time-l" value={String(setup.minutes)}
              options={MIDSEM_MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} onChange={(v) => setSetup({ minutes: Number(v) })} />
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
          <p class="ms-note">
            <Icon name="info" size={16} />
            <span>Practice built from PyLadder questions, not the official test. Check LMS for this semester's format.</span>
          </p>
          <div class="tx-actions">
            <Button variant={saved ? "secondary" : "primary"} size="lg" onClick={start} disabled={!canStart}>
              Start test <Icon name="arrowRight" />
            </Button>
            {canStart ? <Button variant="ghost" onClick={reshuffle}><Icon name="refresh" /> Different questions</Button> : null}
          </div>
        </div>
      </section>

      <section class="tx-card" aria-labelledby="ms-history">
        <div class="tx-card-head">
          <h2 id="ms-history">Past attempts</h2>
          {best ? <span class="tx-best"><Icon name="target" size={14} /> Best {best.percent}% · {best.score} of {best.total}</span> : null}
        </div>
        {history.length === 0 ? (
          <p class="tx-muted">No practice tests yet. Your scores appear here after you finish one.</p>
        ) : (
          <div class="tx-table-wrap">
            <table class="tx-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Score</th><th scope="col">Topics</th><th scope="col">Time</th></tr></thead>
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

      <ConfirmDialog open={confirmNew} title="Start a new test?" confirmLabel="Start new test" cancelLabel="Keep my test"
        onCancel={() => setConfirmNew(false)} onConfirm={begin}>
        <p>The test you have in progress will be discarded and its saved answers deleted.</p>
      </ConfirmDialog>
    </div>
  );
}

function topicList(ids: readonly TopicId[]): string {
  const names = ids.map((id) => TOPIC_BY_ID[id]?.short ?? id);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}
