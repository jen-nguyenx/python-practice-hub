// Which topic a student should work in to open a locked topic, and which topics a test starts from.
// Pure; unit-tested in lock.test.ts.
import type { TopicId } from '../../content/ids.ts';
import { TOPICS } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';

type States = Partial<Record<TopicId, { state: string; remaining?: string }>>;

/**
 * The nearest earlier topic that is open: that is where solving questions (or passing its test) moves the student
 * towards `topicId`. Null when the topic is not locked or no earlier topic is open.
 */
export function unlockingTopic(progress: States, topicId: TopicId): TopicMeta | null {
  const at = TOPICS.findIndex((t) => t.id === topicId);
  if (at <= 0 || progress[topicId]?.state !== 'locked') return null;
  for (let i = at - 1; i >= 0; i--) {
    const p = progress[TOPICS[i].id];
    if (p && p.state !== 'locked') return TOPICS[i];
  }
  return null;
}

export interface LockCopy {
  /** The topic to work in now. Null only when nothing earlier is open. */
  opener: TopicMeta | null;
  /** Names the topic that has to be finished, never the locked topic itself. */
  sentence: string;
  /** What is still missing there, when the progress rows say. */
  detail?: string;
}

/**
 * The words for a locked test page: which topic must be finished, and what is left there.
 * The sentence and the button always name the same topic, and each topic is called by one name (its short name).
 */
export function lockCopy(progress: States, topicId: TopicId): LockCopy {
  const opener = unlockingTopic(progress, topicId);
  if (!opener) return { opener: null, sentence: 'It opens when the topics before it are finished.' };
  const at = TOPICS.findIndex((t) => t.id === topicId);
  const gap = at - TOPICS.findIndex((t) => t.id === opener.id) > 1;
  const sentence = gap
    ? `It opens when you finish ${opener.short} and the topics after it.`
    : `It opens when you finish ${opener.short}.`;
  const remaining = progress[opener.id]?.remaining;
  return { opener, sentence, detail: remaining ? `${opener.short} needs ${remaining}.` : undefined };
}

/** Topics the student can practise now. Never empty: the first topic is always open. */
export function openTopicIds(progress: States): TopicId[] {
  const open = TOPICS.filter((t) => progress[t.id] && progress[t.id]!.state !== 'locked').map((t) => t.id);
  return open.length > 0 ? open : [TOPICS[0].id];
}

/**
 * The topics a mid-semester practice test starts from: the whole mid-sem set once the student can practise all of it,
 * otherwise only the part they can practise, so every result on the page leads somewhere they can work.
 * The "Mid-sem topics" button still offers the full set for revision.
 */
export function defaultMidsemTopics(progress: States): TopicId[] {
  const midsem = TOPICS.filter((t) => t.midsem).map((t) => t.id);
  const open = new Set(openTopicIds(progress));
  const openMidsem = midsem.filter((t) => open.has(t));
  return openMidsem.length === 0 || openMidsem.length === midsem.length ? midsem : openMidsem;
}
