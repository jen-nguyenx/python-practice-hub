import { describe, expect, it } from 'vitest';
import type { TopicId } from '../../content/ids.ts';
import { TOPICS } from '../../content/topics.ts';
import { lockCopy, openTopicIds, unlockingTopic } from './lock.ts';

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

describe('lockCopy', () => {
  it('names the topic that has to be finished, not the locked one', () => {
    const copy = lockCopy(states(2), TOPICS[2].id);
    expect(copy.opener?.id).toBe(TOPICS[1].id);
    expect(copy.sentence).toBe(`It opens when you finish ${TOPICS[1].short}.`);
    expect(copy.sentence).not.toContain(TOPICS[2].short);
    expect(copy.sentence).not.toContain(TOPICS[2].title);
  });

  it('mentions the topics in between when the gap is wider, and always names the button topic', () => {
    const copy = lockCopy(states(2), TOPICS[6].id);
    expect(copy.opener?.id).toBe(TOPICS[1].id);
    expect(copy.sentence).toBe(`It opens when you finish ${TOPICS[1].short} and the topics after it.`);
  });

  it('adds what is left in that topic when the progress row says', () => {
    const s = states(2) as Record<TopicId, { state: string; remaining?: string }>;
    s[TOPICS[1].id].remaining = '2 more to solve, including 1 coding question';
    expect(lockCopy(s, TOPICS[2].id).detail).toBe(`${TOPICS[1].short} needs 2 more to solve, including 1 coding question.`);
    expect(lockCopy(states(2), TOPICS[2].id).detail).toBeUndefined();
  });

  it('falls back when nothing earlier is open', () => {
    const copy = lockCopy({}, TOPICS[4].id);
    expect(copy.opener).toBeNull();
    expect(copy.sentence).toBe('It opens when the topics before it are finished.');
  });
});

describe('open topics', () => {
  it('open topics are never empty', () => {
    expect(openTopicIds({})).toEqual([TOPICS[0].id]);
    expect(openTopicIds(states(3))).toEqual(TOPICS.slice(0, 3).map((t) => t.id));
  });

});
