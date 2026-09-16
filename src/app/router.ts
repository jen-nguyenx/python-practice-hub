import { signal } from '@preact/signals';

export type Route =
  | { name: 'landing' }
  | { name: 'topic'; topicId: string }
  | { name: 'question'; qid: string }
  | { name: 'playground' }
  | { name: 'report'; topicId?: string }
  | { name: 'topic-test'; topicId: string }
  | { name: 'midsem' }
  | { name: 'settings' }
  | { name: 'not-found'; path: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/';
  const parts = path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { name: 'landing' };
  switch (parts[0]) {
    case 'topic': return parts[1] ? { name: 'topic', topicId: parts[1] } : { name: 'not-found', path };
    case 'q': return parts[1] ? { name: 'question', qid: parts[1] } : { name: 'not-found', path };
    case 'playground': return { name: 'playground' };
    case 'report': return { name: 'report', topicId: parts[1] };
    case 'test': return parts[1] ? { name: 'topic-test', topicId: parts[1] } : { name: 'not-found', path };
    case 'midsem': return { name: 'midsem' };
    case 'settings': return { name: 'settings' };
    default: return { name: 'not-found', path };
  }
}

export const route = signal<Route>(parseHash(typeof location !== 'undefined' ? location.hash : ''));

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    route.value = parseHash(location.hash);
    window.scrollTo(0, 0);
  });
}

export function navigate(path: string) {
  const target = path.startsWith('#') ? path : '#' + path;
  if (location.hash === target) route.value = parseHash(target);
  else location.hash = target;
}

export const href = {
  landing: () => '#/',
  topic: (id: string) => `#/topic/${id}`,
  question: (qid: string) => `#/q/${qid}`,
  playground: () => '#/playground',
  report: (topicId?: string) => (topicId ? `#/report/${topicId}` : '#/report'),
  topicTest: (id: string) => `#/test/${id}`,
  midsem: () => '#/midsem',
  settings: () => '#/settings',
};
