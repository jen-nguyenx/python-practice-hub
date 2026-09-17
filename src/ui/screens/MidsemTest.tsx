// Mid-semester practice test (#/midsem): choose topics, size, time and coding, then take a timed mixed test.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { FORMAT_LADDER, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
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
  estimatedMinutes, MIDSEM_COUNTS, MIDSEM_MINUTES, MIDSEM_PASS_PERCENT, midsemEligible, seededRng, selectMidsem,
} from '../testmode/select.ts';
import { bestResult, testHistory } from '../testmode/summary.ts';
import type { TestProgress } from '../testmode/progress.ts';
import { clearProgress, readProgress } from '../testmode/progress.ts';
import { ResumeCard } from '../testmode/ResumeCard.tsx';
import '../testmode/testmode.css';

interface Setup { topicIds: TopicId[]; count: number; minutes: number; includeCoding: boolean }

const SETUP_KEY = 'pyladder:midsem-setup';
const PROGRESS_KEY = 'midsem';
const DEFAULT_TOPICS: TopicId[] = TOPICS.filter((t) => t.midsem).map((t) => t.id);
const DEFAULT_SETUP: Setup = { topicIds: DEFAULT_TOPICS, count: 15, minutes: 30, includeCoding: true };

function loadSetup(): Setup {
  try {
    const raw = JSON.parse(localStorage.getItem(SETUP_KEY) ?? 'null') as Partial<Setup> | null;
    if (!raw) return DEFAULT_SETUP;
    const topicIds = Array.isArray(raw.topicIds) ? raw.topicIds.filter((t): t is TopicId => (TOPIC_IDS as readonly string[]).includes(t)) : DEFAULT_TOPICS;
    return {
      topicIds,
      count: (MIDSEM_COUNTS as readonly number[]).includes(raw.count ?? 0) ? raw.count! : DEFAULT_SETUP.count,
      minutes: (MIDSEM_MINUTES as readonly number[]).includes(raw.minutes ?? 0) ? raw.minutes! : DEFAULT_SETUP.minutes,
      includeCoding: typeof raw.includeCoding === 'boolean' ? raw.includeCoding : true,
    };
  } catch {
    return DEFAULT_SETUP;
  }
}

function saveSetup(s: Setup) {
  try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch { /* private mode: not remembered */ }
}

const RUNG_WORDS = { read: 'reading', repair: 'fix or complete', write: 'coding' } as const;

export function MidsemTest() {
  const [setup, setSetupState] = useState<Setup>(loadSetup);
  const [pool, setPool] = useState<PoolEntry[] | null>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));
  const [running, setRunning] = useState<{ items: PoolEntry[]; minutes: number; runId: number; resume?: TestProgress } | null>(null);
  const [saved, setSaved] = useState<TestProgress | null>(() => readProgress('midsem', PROGRESS_KEY));
  const [confirmNew, setConfirmNew] = useState(false);
  const events = store.events.value;

  useEffect(() => {
    let alive = true;
    loadPool(TOPIC_IDS).then((p) => { if (alive) setPool(p); });
    return () => { alive = false; };
  }, []);

  const setSetup = (patch: Partial<Setup>) => {
    const next = { ...setup, ...patch };
    setSetupState(next);
    saveSetup(next);
  };

  const selection = useMemo(
    () => (pool ? selectMidsem(pool, { topicIds: setup.topicIds, count: setup.count, includeCoding: setup.includeCoding }, seededRng(seed)) : []),
    [pool, setup, seed],
  );
  const eligibleByTopic = useMemo(() => {
    const m = new Map<TopicId, number>();
    if (pool) for (const t of TOPICS) m.set(t.id, midsemEligible(pool, { topicIds: [t.id], includeCoding: setup.includeCoding }).length);
    return m;
  }, [pool, setup.includeCoding]);
  const history = useMemo(() => testHistory(events, 'midsem'), [events]);
  const best = bestResult(history);

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
    setRunning({ items: selection, minutes: setup.minutes, runId: seed });
  };
  const isDefault = setup.topicIds.length === DEFAULT_TOPICS.length && DEFAULT_TOPICS.every((t) => setup.topicIds.includes(t));

  return (
    <div class="tx-page ms">
      <header class="tx-head">
        <span class="tx-eyebrow">Tests</span>
        <h1>Mid-semester practice test</h1>
        <p>A timed mix of questions from the topics you choose, with one check each and a full review at the end.</p>
      </header>

      {saved ? (
        <ResumeCard progress={saved} pool={pool}
          onResume={(items) => { setSaved(null); setRunning({ items, minutes: saved.durationMin, runId: saved.startedAt, resume: saved }); }}
          onDiscard={() => { clearProgress('midsem', PROGRESS_KEY); setSaved(null); }} />
      ) : null}

      <section class="tx-card" aria-labelledby="ms-setup">
        <h2 id="ms-setup" class="sr-only">Set up your test</h2>

        <fieldset class="ms-topics">
          <div class="ms-topics-head">
            <legend>Topics</legend>
            <span class="tx-mono">{setup.topicIds.length} of {TOPICS.length} chosen</span>
            <div class="ms-quick">
              <Button size="sm" variant="ghost" aria-pressed={isDefault} onClick={() => setSetup({ topicIds: DEFAULT_TOPICS })}>Mid-sem topics</Button>
              <Button size="sm" variant="ghost" onClick={() => setSetup({ topicIds: TOPICS.map((t) => t.id) })}>All</Button>
              <Button size="sm" variant="ghost" onClick={() => setSetup({ topicIds: [] })}>Clear</Button>
            </div>
          </div>
          <ul class="ms-grid">
            {TOPICS.map((t) => {
              const on = setup.topicIds.includes(t.id);
              const n = eligibleByTopic.get(t.id);
              return (
                <li key={t.id}>
                  <label class={`ms-topic${on ? ' on' : ''}${n === 0 && !on ? ' empty' : ''}`}>
                    <span class="ms-num" aria-hidden="true">{Number(t.num)}</span>
                    <span class="ms-topic-text">
                      <span class="ms-topic-name">{t.short}</span>
                      <span class="ms-topic-count">{pool === null ? '…' : n === 0 ? 'no questions yet' : plural(n ?? 0, 'question')}</span>
                    </span>
                    <input type="checkbox" checked={on} onChange={() => toggleTopic(t.id)} aria-label={`Topic ${Number(t.num)}: ${t.title}`} />
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div class="ms-options">
          <div class="ms-field">
            <span id="ms-count-l" class="ms-field-label">Questions</span>
            <Segmented labelledBy="ms-count-l" value={String(setup.count)}
              options={MIDSEM_COUNTS.map((c) => ({ value: String(c), label: String(c) }))} onChange={(v) => setSetup({ count: Number(v) })} />
          </div>
          <div class="ms-field">
            <span id="ms-time-l" class="ms-field-label">Time</span>
            <Segmented labelledBy="ms-time-l" value={String(setup.minutes)}
              options={MIDSEM_MINUTES.map((m) => ({ value: String(m), label: `${m} min` }))} onChange={(v) => setSetup({ minutes: Number(v) })} />
          </div>
          <div class="ms-switch">
            <Switch checked={setup.includeCoding} onChange={(includeCoding) => setSetup({ includeCoding })} label="Include coding questions" describedBy="ms-coding-sub" />
            <span id="ms-coding-sub" class="ms-switch-sub">
              {setup.includeCoding
                ? 'Fill in the blank, Parsons, fix the bug and write code run real Python in your browser.'
                : 'Reading questions only: multiple choice, predict the output, trace and spot the difference.'}
            </span>
          </div>
        </div>

        <div class="ms-summary">
          <p class="ms-summary-line" aria-live="polite">
            {pool === null ? <span role="status">Loading questions…</span> : setup.topicIds.length === 0 ? <span>Choose at least one topic.</span> : selection.length === 0 ? (
              <span>No questions are ready in these topics{setup.includeCoding ? '' : ' without coding'}. Try more topics{setup.includeCoding ? '' : ' or include coding questions'}.</span>
            ) : (
              <span><b>{selection.length}</b> questions · {rungCounts.map((x) => `${x.n} ${RUNG_WORDS[x.r]}`).join(', ')} · usually about <b>{est} min</b></span>
            )}
          </p>
          {shortBy > 0 && selection.length > 0 ? (
            <p class="ms-warn"><Icon name="info" /> Only {plural(selection.length, 'question')} match these choices, so the test has {selection.length} instead of {setup.count}.</p>
          ) : null}
          {selection.length > 0 && est > setup.minutes * 1.2 ? (
            <p class="ms-warn"><Icon name="clock" /> These usually take about {est} minutes. Choose more time or fewer questions, or keep it as practice under pressure.</p>
          ) : null}
          <p class="ms-honest">
            <Icon name="info" />
            <span>Built from PyLadder questions, so it is practice, not the official test. Check LMS for this semester's format; older CITS1401 mid-semester tests were multiple choice.</span>
          </p>
          <div class="tx-actions">
            <Button variant="primary" size="lg" onClick={start} disabled={!canStart}>
              Start test <Icon name="arrowRight" />
            </Button>
            {canStart ? <Button variant="ghost" onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}><Icon name="refresh" /> Pick different questions</Button> : null}
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
