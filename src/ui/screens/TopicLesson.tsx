// #/learn/:topicId — the route a topic page and old bookmarks use. Every topic has an authored lesson,
// so this resolves to it. It stays a route of its own rather than a link so that a topic's lesson can be
// found by topic id, without every caller needing the lesson index.
import { useEffect } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { LESSON_FOR_TOPIC } from '../../content/lessons/index.ts';
import '../lesson/lesson.css';

export function TopicLesson({ topicId }: { topicId: string }) {
  const meta = LESSON_FOR_TOPIC[topicId];

  useEffect(() => {
    if (meta) navigate(href.lesson(meta.id), true);
  }, [meta?.id]);

  if (meta) {
    return (
      <div class="ls">
        <p class="ls-count" role="status">Opening {meta.title}…</p>
      </div>
    );
  }
  return (
    <div class="ls">
      <div class="tp-empty">
        <p><strong>There is no lesson for that topic yet.</strong></p>
        <p><a href={href.lessons()}>Back to the lesson library</a></p>
      </div>
    </div>
  );
}
