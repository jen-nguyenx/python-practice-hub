// Content loader. Topic content is code-split: one chunk per topic.
import type { TopicId } from './ids.ts';
import type { GeneratedExperiments, GeneratedTopic, Question, Topic } from './schema.ts';
import { TOPICS } from './topics.ts';

const loaders: Record<TopicId, () => Promise<{ default: Topic }>> = {
  'variables-expressions': () => import('./topics/01-variables-expressions/index.ts'),
  'if-elif-else': () => import('./topics/02-if-elif-else/index.ts'),
  'for-loops-range': () => import('./topics/03-for-loops-range/index.ts'),
  'functions-basics': () => import('./topics/04-functions-basics/index.ts'),
  strings: () => import('./topics/05-strings/index.ts'),
  'lists-tuples': () => import('./topics/06-lists-tuples/index.ts'),
  'while-nested-loops': () => import('./topics/07-while-nested-loops/index.ts'),
  dictionaries: () => import('./topics/08-dictionaries/index.ts'),
  'files-csv': () => import('./topics/09-files-csv/index.ts'),
  exceptions: () => import('./topics/10-exceptions/index.ts'),
  'functions-project': () => import('./topics/11-functions-project/index.ts'),
  'project-simulator': () => import('./topics/12-project-simulator/index.ts'),
  recursion: () => import('./topics/13-recursion/index.ts'),
};

const generatedLoaders = import.meta.glob<GeneratedTopic>(['./generated/*.json', '!./generated/question-index.json'], { import: 'default' });

const topicCache = new Map<TopicId, Promise<Topic>>();
export function loadTopic(id: TopicId): Promise<Topic> {
  let p = topicCache.get(id);
  if (!p) {
    p = loaders[id]().then((m) => m.default);
    topicCache.set(id, p);
  }
  return p;
}

export async function loadGenerated(id: TopicId): Promise<GeneratedTopic> {
  const key = `./generated/${id}.json`;
  const loader = generatedLoaders[key];
  return loader ? loader() : {};
}

// What every combination of every "what if" control really did, recorded by the verifier in real Python.
// Topics without experiments have no file, so a missing loader is normal, not an error.
const experimentLoaders = import.meta.glob<GeneratedExperiments>('./generated/experiments/*.json', { import: 'default' });

export async function loadExperiments(id: TopicId): Promise<GeneratedExperiments> {
  const loader = experimentLoaders[`./generated/experiments/${id}.json`];
  return loader ? loader() : {};
}

export async function loadAllTopics(): Promise<Topic[]> {
  return Promise.all(TOPICS.map((t) => loadTopic(t.id)));
}

export function questionsOf(topic: Topic): Question[] {
  return topic.scenarios.flatMap((s) => s.questions);
}

/** Question id -> topic id, derived from the id prefix "tNN-". */
export function topicIdOfQuestion(qid: string): TopicId | undefined {
  const m = /^t(\d\d)-/.exec(qid);
  if (!m) return undefined;
  return TOPICS.find((t) => t.num === m[1])?.id;
}
