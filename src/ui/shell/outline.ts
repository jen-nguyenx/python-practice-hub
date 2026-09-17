// Topic outlines for the explorer, breadcrumb and Home: scenarios and their questions from QUESTION_INDEX,
// with scenario titles loaded lazily from topic content (one code-split chunk per topic, cached).
import { signal } from '@preact/signals';
import type { TopicId } from '../../content/ids.ts';
import { loadTopic } from '../../content/index.ts';
import { QUESTION_BY_ID, QUESTION_INDEX } from '../../content/loadIndex.ts';
import type { QuestionMeta } from '../../content/questionIndex.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';

export interface ScenarioOutline { id: string; title: string | null; questions: QuestionMeta[] }

const BY_TOPIC = new Map<TopicId, ScenarioOutline[]>();
for (const q of QUESTION_INDEX) {
  let list = BY_TOPIC.get(q.topicId);
  if (!list) { list = []; BY_TOPIC.set(q.topicId, list); }
  let sc = list.find((s) => s.id === q.scenarioId);
  if (!sc) { sc = { id: q.scenarioId, title: null, questions: [] }; list.push(sc); }
  sc.questions.push(q);
}

const titles = signal<Record<string, string>>({});
const requested = new Set<TopicId>();

function requestTitles(topicId: TopicId) {
  if (requested.has(topicId) || !TOPIC_BY_ID[topicId]) return;
  requested.add(topicId);
  loadTopic(topicId).then(
    (t) => {
      const next = { ...titles.value };
      for (const s of t.scenarios) next[s.id] = s.title;
      titles.value = next;
    },
    () => { requested.delete(topicId); },
  );
}

/** Scenarios of a topic in content order. Titles are null until the topic chunk has loaded (reading this subscribes). */
export function topicOutline(topicId: TopicId): ScenarioOutline[] {
  const t = titles.value;
  requestTitles(topicId);
  return (BY_TOPIC.get(topicId) ?? []).map((s) => ({ ...s, title: t[s.id] ?? null }));
}

/** Scenario title for a question, or null while loading. */
export function scenarioTitleOf(qid: string): string | null {
  const q = QUESTION_BY_ID.get(qid);
  if (!q) return null;
  const t = titles.value[q.scenarioId];
  if (t === undefined) requestTitles(q.topicId);
  return t ?? null;
}

/** 1-based position of a question within its topic, and the topic's question count. */
export function positionInTopic(qid: string): { pos: number; total: number } | null {
  const q = QUESTION_BY_ID.get(qid);
  if (!q) return null;
  const list = QUESTION_INDEX.filter((m) => m.topicId === q.topicId);
  return { pos: list.findIndex((m) => m.qid === qid) + 1, total: list.length };
}
