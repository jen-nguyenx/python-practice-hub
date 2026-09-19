// Topic page (#/topic/:id): a calm header (eyebrow, title, blurb, and a white progress card with one primary action)
// and tabs for questions, cheat sheet, worked example and common mistakes. Locked topics stay readable; their
// question rows are inert.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { markTopicOpened } from '../../app/session.ts';
import type { TopicId } from '../../content/ids.ts';
import { loadExperiments, loadTopic } from '../../content/index.ts';
import type { GeneratedExperiments, Topic } from '../../content/schema.ts';
import { TOPICS, TOPIC_BY_ID } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';
import { Skeleton } from '../components/Skeleton.tsx';
import { TabPanel, Tabs } from '../components/Tabs.tsx';
import { recentMistakes, safeQuestionStats, safeTopicProgress } from '../shell/progressData.ts';
import { storeReady } from '../shell/storeReady.ts';
import type { TopicFilters, TopicTab } from '../shell/topic/filters.ts';
import { loadFilters, loadTopicTab, rememberTopicTab, saveFilters } from '../shell/topic/filters.ts';
import { QuestionsTab } from '../shell/topic/QuestionsTab.tsx';
import { CheatSheetTab, MistakesTab, WorkedExampleTab } from '../shell/topic/ReadTabs.tsx';
import { TopicHeader } from '../shell/topic/TopicHeader.tsx';
import { WhatIfTab } from '../shell/topic/WhatIf.tsx';
import '../shell/topic/topic.css';

type LoadState = { status: 'loading' } | { status: 'ready'; topic: Topic } | { status: 'error'; message: string };

/** Full label, swapped for a shorter one on narrow screens so all four tabs fit (CSS only, one name at a time). */
function ShortLabel({ long, short }: { long: string; short: string }) {
  return (
    <>
      <span class="tl-long">{long}</span>
      <span class="tl-short">{short}</span>
    </>
  );
}

function TopicSkeleton() {
  return (
    <div class="tp-skel" aria-busy="true">
      <span class="sr-only" role="status">Loading topic</span>
      <Skeleton w="30%" h={18} />
      <Skeleton h={40} />
      <Skeleton h={40} />
      <Skeleton h={40} />
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
  const [experiments, setExperiments] = useState<GeneratedExperiments | null>(null);

  // Tab and filters are remembered per topic; pick them up when moving between topics.
  useEffect(() => {
    setTab(loadTopicTab(topicId));
    setFilters(loadFilters(topicId));
  }, [topicId]);

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

  // The recorded outcomes for "what if" are only fetched when that tab is open; every other tab stays light.
  useEffect(() => {
    if (!meta || tab !== 'whatif') return;
    let alive = true;
    setExperiments(null);
    loadExperiments(meta.id).then(
      (g) => { if (alive) setExperiments(g); },
      () => { if (alive) setExperiments({}); },
    );
    return () => { alive = false; };
  }, [meta?.id, tab]);

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
      <div class="tp">
        <div class="tp-empty">
          <p><strong>Topic not found.</strong></p>
          <p><a href={href.landing()}>Back to topics</a></p>
        </div>
      </div>
    );
  }

  const changeTab = (t: TopicTab) => { setTab(t); rememberTopicTab(meta.id, t); };
  const changeFilters = (f: TopicFilters) => { setFilters(f); saveFilters(meta.id, f); };

  const topic = load.status === 'ready' && load.topic.id === meta.id ? load.topic : null;
  const questions = topic ? topic.scenarios.flatMap((s) => s.questions) : [];
  const firstUnsolved = questions.find((q) => !stats.get(q.id)?.solved);
  const allSolved = questions.length > 0 && !firstUnsolved;
  const target = firstUnsolved ?? questions[0];

  // The "what if" tab only appears for topics that have experiments written.
  const hasExperiments = (topic?.experiments?.length ?? 0) > 0;
  const tabs = [
    { id: 'questions' as const, label: 'Questions' },
    { id: 'cheatsheet' as const, label: 'Cheat sheet' },
    { id: 'example' as const, label: <ShortLabel long="Worked example" short="Example" /> },
    ...(hasExperiments ? [{ id: 'whatif' as const, label: 'What if' }] : []),
    { id: 'mistakes' as const, label: <ShortLabel long="Common mistakes" short="Mistakes" /> },
  ];
  const idBase = `topic-${meta.id}`;

  const shown: TopicTab = tab === 'whatif' && !hasExperiments ? 'questions' : tab;

  let panel;
  if (load.status === 'error') {
    panel = (
      <div class="tp-empty">
        <p><strong>This topic didn't load.</strong> {load.message}</p>
        <p><button type="button" class="btn ghost" onClick={() => location.reload()}>Reload the page</button></p>
      </div>
    );
  } else if (!topic || !ready) panel = <TopicSkeleton />;
  else {
    switch (shown) {
      case 'questions':
        panel = <QuestionsTab topic={topic} stats={stats} filters={filters} onFilters={changeFilters} locked={locked} recent={recent} />;
        break;
      case 'cheatsheet': panel = <CheatSheetTab topic={topic} />; break;
      case 'example': panel = <WorkedExampleTab topic={topic} />; break;
      case 'whatif': panel = <WhatIfTab topic={topic} generated={experiments} />; break;
      case 'mistakes': panel = <MistakesTab topic={topic} />; break;
    }
  }

  const prevLocked = meta.order > 1 && progressAll[TOPICS[meta.order - 2].id].state === 'locked';

  return (
    <div class="tp">
      <TopicHeader meta={meta} p={p} ready={ready && (!!topic || load.status === 'error')} target={target} allSolved={allSolved} prevLocked={prevLocked} />
      <Tabs idBase={idBase} label="Topic sections" tabs={tabs} active={shown} onChange={changeTab} class="tp-tabs" />
      <TabPanel idBase={idBase} id={shown} class="tp-tabpanel">
        {panel}
      </TabPanel>
    </div>
  );
}
