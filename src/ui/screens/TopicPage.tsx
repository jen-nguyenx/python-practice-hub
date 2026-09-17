// Topic page (#/topic/:id): header, progress against the minimum, actions, and tabs for questions, cheat sheet,
// worked example and common mistakes. Locked topics stay readable; their questions are listed but not clickable.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { markTopicOpened } from '../../app/session.ts';
import type { TopicId } from '../../content/ids.ts';
import { loadTopic } from '../../content/index.ts';
import type { Topic } from '../../content/schema.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import type { TopicProgress } from '../../engine/progress.ts';
import { Icon } from '../components/Icon.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { TabPanel, Tabs } from '../components/Tabs.tsx';
import { plural } from '../shell/format.ts';
import { StateLabel } from '../shell/landing/TopicCard.tsx';
import { CODE_FORMAT_NAMES, minimumText, nextTopic, prevTopic, recentMistakes, safeQuestionStats, safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import type { TopicFilters, TopicTab } from '../shell/topic/filters.ts';
import { loadFilters, loadTopicTab, rememberTopicTab, saveFilters } from '../shell/topic/filters.ts';
import { QuestionsTab } from '../shell/topic/QuestionsTab.tsx';
import { CheatSheetTab, MistakesTab, WorkedExampleTab } from '../shell/topic/ReadTabs.tsx';
import '../shell/topic/topic.css';

type LoadState = { status: 'loading' } | { status: 'ready'; topic: Topic } | { status: 'error'; message: string };

function ProgressBlock({ meta, p, prevLocked }: { meta: TopicMeta; p: TopicProgress; prevLocked: boolean }) {
  const next = nextTopic(meta);
  const prev = prevTopic(meta);
  const locked = p.state === 'locked';
  const total = p.total;

  let explain;
  if (locked) {
    explain = (
      <div class="tp-lock">
        <Icon name="lock" size={16} />
        <div class="tp-lock-main">
          <p><strong>To unlock:</strong> {p.lockReason ?? 'Finish the previous topic first.'}</p>
          <p class="muted">The cheat sheet, worked example and common mistakes are readable now.</p>
          <span class="inline-links">
            {prev ? <a href={href.topic(prev.id)}>Go to {prev.short}</a> : null}
            {prev && !prevLocked ? <a href={href.topicTest(prev.id)}>Take the {prev.short} test</a> : null}
          </span>
        </div>
      </div>
    );
  } else if (p.minimumMet) {
    explain = (
      <p class="tp-explain">
        <Icon name="check" size={14} class="tp-ok" />{' '}
        {p.testedOut && p.solved < p.minimum.solve ? 'You passed the topic test, so the minimum is done.' : 'Minimum done.'}{' '}
        {next ? <>Topic {Number(next.num)}, <a href={href.topic(next.id)}>{next.title}</a>, is unlocked.</> : 'This is the last topic.'}
        {total > p.solved ? ' The remaining questions are extra practice.' : ''}
      </p>
    );
  } else {
    explain = (
      <div class="tp-explain">
        <p>
          <strong>Minimum:</strong> solve {plural(p.minimum.solve, 'question')} without showing the answer (hints are fine), including{' '}
          {plural(p.minimum.code, 'coding question')}.{' '}
          {next ? <>Reaching it unlocks topic {Number(next.num)}, {next.title}.</> : 'This is the last topic.'}
        </p>
        <p class="muted">
          {p.remaining ? <>Still to do: {p.remaining}. </> : null}
          {next ? <>Or pass the <a href={href.topicTest(meta.id)}>topic test</a> to unlock it straight away.</> : null}
        </p>
        <p class="faint tp-small">Coding questions: {CODE_FORMAT_NAMES}.</p>
      </div>
    );
  }

  return (
    <section class="tp-progress" aria-label="Progress in this topic">
      <div class="tp-progress-top">
        <StateLabel state={p.state} testedOut={p.testedOut} />
        <span class="tp-progress-count num">
          <span class="mono">{p.solved}</span> of <span class="mono">{total}</span> solved · <span class="mono">{p.codeSolved}</span> coding
        </span>
        <span class="spacer" />
        <span class="tp-progress-min">{minimumText(p.minimum)}</span>
      </div>
      {total > 0 ? (
        <ProgressBar
          value={p.solved}
          max={total}
          marker={Math.min(p.minimum.solve, total)}
          tone={p.minimumMet ? 'ok' : 'accent'}
          label="Questions solved in this topic"
          valueText={`${p.solved} of ${total} solved. Minimum ${p.minimum.solve}.`}
        />
      ) : null}
      {explain}
    </section>
  );
}

function TopicSkeleton() {
  return (
    <div class="stack" aria-busy="true">
      <span class="sr-only" role="status">Loading topic</span>
      <Skeleton w="40%" h={16} />
      <Skeleton h={44} />
      <Skeleton h={44} />
      <Skeleton h={44} />
    </div>
  );
}

export function TopicPage({ topicId }: { topicId: string }) {
  const meta = TOPIC_BY_ID[topicId] as TopicMeta | undefined;
  const ready = storeReady.value;
  const events = store.events.value;
  const settings = store.settings.value;

  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [tab, setTab] = useState<TopicTab>(() => loadTopicTab(topicId));
  const [filters, setFilters] = useState<TopicFilters>(() => loadFilters(topicId));

  useEffect(() => {
    if (!meta) return;
    let alive = true;
    setLoad({ status: 'loading' });
    loadTopic(meta.id).then(
      (topic) => { if (alive) setLoad({ status: 'ready', topic }); },
      (err: unknown) => { if (alive) setLoad({ status: 'error', message: err instanceof Error ? err.message : String(err) }); },
    );
    return () => { alive = false; };
  }, [meta?.id]);

  const progressAll = useMemo(() => safeTopicProgress(events, settings), [events, settings]);
  const stats = useMemo(() => safeQuestionStats(events), [events]);
  const recent = useMemo(() => recentMistakes(events, 30), [events]);
  const p = meta ? progressAll[meta.id] : undefined;
  const locked = !ready || p?.state === 'locked';

  // Opening an unlocked topic counts toward unlocking the next one. Never mark a locked topic.
  useEffect(() => {
    if (meta && ready && p && p.state !== 'locked') markTopicOpened(meta.id as TopicId);
  }, [meta?.id, ready, p?.state]);

  if (!meta) {
    return (
      <div class="page page-narrow">
        <div class="empty-state">
          <p><strong>Topic not found.</strong></p>
          <p><a href={href.landing()}>Back to topics</a></p>
        </div>
      </div>
    );
  }

  const changeTab = (t: TopicTab) => { setTab(t); rememberTopicTab(meta.id, t); };
  const changeFilters = (f: TopicFilters) => { setFilters(f); saveFilters(meta.id, f); };

  const topic = load.status === 'ready' ? load.topic : null;
  const questions = topic ? topic.scenarios.flatMap((s) => s.questions) : [];
  const firstUnsolved = questions.find((q) => !stats.get(q.id)?.solved) ?? questions[0];
  const allSolved = questions.length > 0 && questions.every((q) => stats.get(q.id)?.solved);

  const tabs = [
    { id: 'questions' as const, label: 'Questions', badge: questions.length || undefined },
    { id: 'cheatsheet' as const, label: 'Cheat sheet' },
    { id: 'example' as const, label: 'Worked example' },
    { id: 'mistakes' as const, label: 'Common mistakes', badge: topic?.commonMistakes.length || undefined },
  ];
  const idBase = `topic-${meta.id}`;

  let panel;
  if (load.status === 'loading' || !ready) panel = <TopicSkeleton />;
  else if (load.status === 'error') {
    panel = (
      <div class="empty-state">
        <p><strong>This topic didn't load.</strong> {load.message}</p>
        <p><button type="button" class="btn sm" onClick={() => location.reload()}>Reload the page</button></p>
      </div>
    );
  } else if (topic) {
    switch (tab) {
      case 'questions':
        panel = <QuestionsTab topic={topic} stats={stats} filters={filters} onFilters={changeFilters} locked={locked} recent={recent} />;
        break;
      case 'cheatsheet': panel = <CheatSheetTab topic={topic} />; break;
      case 'example': panel = <WorkedExampleTab topic={topic} />; break;
      case 'mistakes': panel = <MistakesTab topic={topic} />; break;
    }
  }

  return (
    <div class="page topic-page">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href={href.landing()}>Topics</a>
        <Icon name="chevronRight" size={12} />
        <span aria-current="page">{meta.num} {meta.short}</span>
      </nav>

      <header class="tp-head">
        <div class="tp-head-main">
          <p class="tp-kicker"><span class="mono">Topic {meta.num}</span> · {meta.unitRef}</p>
          <h1>{meta.title}</h1>
          <p class="tp-blurb">{meta.blurb}</p>
          {meta.note ? (
            <p class="tp-note"><Icon name="info" size={14} /> {meta.note}</p>
          ) : null}
        </div>
        <div class="tp-actions">
          <button
            type="button"
            class="btn primary"
            disabled={locked || !firstUnsolved}
            onClick={() => firstUnsolved && navigate(href.question(firstUnsolved.id))}
          >
            <Icon name="play" size={14} />
            {allSolved ? 'Start again' : 'Start at first unsolved'}
          </button>
          {locked ? (
            <button type="button" class="btn" disabled title="Unlock this topic first">Take topic test</button>
          ) : (
            <a class="btn" href={href.topicTest(meta.id)}><Icon name="clock" size={14} />Take topic test</a>
          )}
          <a class="btn ghost" href={href.report(meta.id)}><Icon name="chart" size={14} />Topic report</a>
        </div>
      </header>

      {ready && p ? <ProgressBlock meta={meta} p={p} prevLocked={meta.order > 1 && progressAll[TOPICS[meta.order - 2].id].state === 'locked'} /> : <div class="tp-progress"><Skeleton h={60} /></div>}

      <Tabs idBase={idBase} label="Topic sections" tabs={tabs} active={tab} onChange={changeTab} class="tp-tabs" />
      <TabPanel idBase={idBase} id={tab} class="tp-panel">
        {panel}
      </TabPanel>
    </div>
  );
}
