// Mid-semester practice test (#/midsem): choose topics, size, time and coding, then take a timed mixed test.
import { useEffect, useMemo, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import { FORMAT_LADDER, TOPIC_IDS } from '../../content/ids.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import { store } from '../../app/services.ts';
import { href } from '../../app/router.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Callout } from '../components/Callout.tsx';
import { Chip } from '../components/Chip.tsx';
import { Icon } from '../components/Icon.tsx';
import { Segmented } from '../report/Segmented.tsx';
import { formatDateTime, formatDuration, plural } from '../report/format.ts';
import { TestRunner } from '../testmode/TestRunner.tsx';
import type { PoolEntry } from '../testmode/pool.ts';
import { loadPool } from '../testmode/pool.ts';
import {
  estimatedMinutes, MIDSEM_COUNTS, MIDSEM_MINUTES, MIDSEM_PASS_PERCENT, midsemEligible, seededRng, selectMidsem,
} from '../testmode/select.ts';
import { bestResult, testHistory } from '../testmode/summary.ts';
import '../testmode/testmode.css';

interface Setup { topicIds: TopicId[]; count: number; minutes: number; includeCoding: boolean }

const SETUP_KEY = 'pyladder:midsem-setup';
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
  const [running, setRunning] = useState<{ items: PoolEntry[]; minutes: number; runId: number } | null>(null);
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
        title={`Mid-sem practice · ${plural(n, 'question')}, ${running.minutes} min`}
        questions={running.items.map((p) => p.item)}
        durationMin={running.minutes}
        mode="midsem"
        onFinish={() => setSeed(Math.floor(Math.random() * 2 ** 31))}
        resultExtra={(s) => {
          const prev = bestResult(history.filter((h) => h.ts < s.finishedAt));
          return (
            <p class="muted num">
              {prev ? (s.percent > prev.percent
                ? <>New best score. Your previous best was {prev.percent}%. </>
                : <>Your best before this test: {prev.percent}% ({prev.score} of {prev.total}). </>) : null}
              Pass mark in this practice test: {MIDSEM_PASS_PERCENT}%.
            </p>
          );
        }}
        resultActions={() => (
          <>
            <Button variant="primary" onClick={() => setRunning(null)}>New practice test</Button>
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
    setRunning({ items: selection, minutes: setup.minutes, runId: seed });
  };

  return (
    <div class="tm">
      <header class="tm-head">
        <span class="label">Revision</span>
        <h1>Mid-semester practice test</h1>
        <p class="muted">A timed, mixed test across the topics you choose. One check per question, no hints, and a full review at the end.</p>
      </header>

      <Callout tone="neutral">
        <p><strong>Practice test built from PyLadder questions, not the official test.</strong> Past CITS1401 mid-semester tests have been multiple choice; check LMS for this semester's format, and turn coding questions off to practise that style.</p>
      </Callout>

      <section class="card tm-card" aria-labelledby="ms-setup">
        <h2 id="ms-setup" class="sr-only">Set up your test</h2>

        <fieldset class="tm-topics">
          <legend class="label">Topics</legend>
          <div class="tm-quick">
            <Button size="sm" onClick={() => setSetup({ topicIds: DEFAULT_TOPICS })}>Mid-sem topics (1 to {DEFAULT_TOPICS.length})</Button>
            <Button size="sm" onClick={() => setSetup({ topicIds: TOPICS.map((t) => t.id) })}>All 13 topics</Button>
            <Button size="sm" variant="ghost" onClick={() => setSetup({ topicIds: [] })}>Clear</Button>
          </div>
          <div class="tm-topic-grid">
            {TOPICS.map((t) => {
              const on = setup.topicIds.includes(t.id);
              const n = eligibleByTopic.get(t.id);
              return (
                <label key={t.id} class={`tm-topic${on ? ' on' : ''}${n === 0 ? ' empty' : ''}`}>
                  <input type="checkbox" checked={on} onChange={() => toggleTopic(t.id)} />
                  <span><span class="tm-topic-num">{t.num}</span>{t.short}</span>
                  <span class="tm-topic-count">{pool === null ? '' : n === 0 ? 'none yet' : plural(n ?? 0, 'question')}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div class="tm-options">
          <Segmented name="ms-count" label="Questions" showLabel value={setup.count}
            options={MIDSEM_COUNTS.map((c) => ({ value: c as number, label: String(c) }))} onChange={(count) => setSetup({ count })} />
          <Segmented name="ms-time" label="Time" showLabel value={setup.minutes}
            options={MIDSEM_MINUTES.map((m) => ({ value: m as number, label: `${m} min` }))} onChange={(minutes) => setSetup({ minutes })} />
          <label class="tm-toggle">
            <input type="checkbox" checked={setup.includeCoding} onChange={(e) => setSetup({ includeCoding: (e.currentTarget as HTMLInputElement).checked })} />
            <span class="tm-toggle-text">
              <span>Include coding questions</span>
              <span class="muted">Fill in the blank, Parsons, fix the bug and write code. Off: reading questions only, no Python needed.</span>
            </span>
          </label>
        </div>

        <div class="tm-summary-line" aria-live="polite">
          {pool === null ? <span role="status">Loading questions…</span> : setup.topicIds.length === 0 ? <span>Choose at least one topic.</span> : selection.length === 0 ? (
            <span>No questions are ready in the chosen topics yet{setup.includeCoding ? '' : ' without coding'}. Try more topics{setup.includeCoding ? '' : ' or include coding questions'}.</span>
          ) : (
            <>
              <span><strong>{selection.length}</strong> questions: {rungCounts.map((x) => `${x.n} ${RUNG_WORDS[x.r]}`).join(', ')}</span>
              <span>Expected working time about <strong>{est} min</strong> for your <strong>{setup.minutes} min</strong></span>
            </>
          )}
        </div>
        {shortBy > 0 && selection.length > 0 ? (
          <Callout tone="info">Only {plural(selection.length, 'question')} match these choices, so the test has {selection.length} instead of {setup.count}.</Callout>
        ) : null}
        {selection.length > 0 && est > setup.minutes * 1.2 ? (
          <Callout tone="hint">These questions usually take about {est} minutes. Choose more time or fewer questions, or keep it as practice under pressure.</Callout>
        ) : null}

        <div class="tm-actions">
          <Button variant="primary" size="lg" onClick={start} disabled={!canStart}>
            Start test <Icon name="arrowRight" />
          </Button>
          {canStart ? <Button variant="ghost" onClick={() => setSeed(Math.floor(Math.random() * 2 ** 31))}><Icon name="refresh" /> Pick different questions</Button> : null}
        </div>
      </section>

      <section class="tm-section" aria-labelledby="ms-history">
        <div class="row">
          <h2 id="ms-history">Previous practice tests</h2>
          {best ? (
            <span class="tm-best num"><Icon name="target" /> Best: {best.percent}% ({best.score} of {best.total})</span>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p class="muted">No practice tests yet. Your scores appear here after you finish one.</p>
        ) : (
          <ul class="tm-history">
            {history.map((h) => (
              <li key={h.ts}>
                <span class="num">{formatDateTime(h.ts)}</span>
                <span class="num">
                  <strong>{h.score} / {h.total}</strong> <span class="muted">· {h.percent}%</span>
                  {best && h.ts === best.ts ? <> <Chip tone="accent">best</Chip></> : null}
                </span>
                <span class="tm-history-topics muted">
                  {topicList(h.topicIds)} · {formatDuration(h.durationMs)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function topicList(ids: readonly TopicId[]): string {
  const names = ids.map((id) => TOPIC_BY_ID[id]?.short ?? id);
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}
