// Load gradable questions for tests from topic content and generated data.
import type { TopicId } from '../../content/ids.ts';
import { loadGenerated, loadTopic, questionsOf } from '../../content/index.ts';
import type { Candidate } from './select.ts';
import { isGradable, toCandidate } from './select.ts';
import type { TestItem } from './summary.ts';

export interface PoolEntry extends Candidate { item: TestItem }

/** Every question in these topics that can be graded in a test. Topics that fail to load are skipped. */
export async function loadPool(topicIds: readonly TopicId[]): Promise<PoolEntry[]> {
  const perTopic = await Promise.all(topicIds.map(async (topicId) => {
    try {
      const [topic, generated] = await Promise.all([loadTopic(topicId), loadGenerated(topicId).catch(() => ({}))]);
      return questionsOf(topic)
        .filter((q) => isGradable(q, (generated as Record<string, never>)[q.id]))
        .map((q): PoolEntry => ({ ...toCandidate(q, topicId), item: { q, topicId, generated: (generated as Record<string, never>)[q.id] } }));
    } catch {
      return [];
    }
  }));
  return perTopic.flat();
}
