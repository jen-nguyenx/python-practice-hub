// Which topic a student should work in to open a locked topic. Pure; unit-tested in lock.test.ts.
import type { TopicId } from '../../content/ids.ts';
import { TOPICS } from '../../content/topics.ts';
import type { TopicMeta } from '../../content/topics.ts';

type States = Partial<Record<TopicId, { state: string }>>;

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
