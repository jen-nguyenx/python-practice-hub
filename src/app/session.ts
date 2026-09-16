import { store } from './services.ts';
import type { TopicId } from '../content/ids.ts';

const openedThisSession = new Set<string>();

/** Log a topic_open event once per session. Call when a topic page or any question in the topic is shown. */
export function markTopicOpened(topicId: TopicId) {
  if (openedThisSession.has(topicId)) return;
  openedThisSession.add(topicId);
  store.ready.then(() => store.append({ type: 'topic_open', topicId }));
}
