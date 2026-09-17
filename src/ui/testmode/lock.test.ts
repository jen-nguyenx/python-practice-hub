import { describe, expect, it } from 'vitest';
import type { TopicId } from '../../content/ids.ts';
import { TOPICS } from '../../content/topics.ts';
import { unlockingTopic } from './lock.ts';

function states(openCount: number) {
  return Object.fromEntries(TOPICS.map((t, i) => [t.id, { state: i < openCount ? 'open' : 'locked' }])) as Record<TopicId, { state: string }>;
}

describe('unlockingTopic', () => {
  it('is the topic just before a locked topic when that one is open', () => {
    expect(unlockingTopic(states(4), TOPICS[4].id)?.id).toBe(TOPICS[3].id);
  });
  it('skips back over earlier locked topics to the last open one', () => {
    expect(unlockingTopic(states(2), TOPICS[6].id)?.id).toBe(TOPICS[1].id);
  });
  it('is null for open topics and the first topic', () => {
    expect(unlockingTopic(states(5), TOPICS[3].id)).toBeNull();
    expect(unlockingTopic(states(0), TOPICS[0].id)).toBeNull();
  });
});
