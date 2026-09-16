import type { QuestionMeta } from './questionIndex.ts';
import index from './generated/question-index.json';

export const QUESTION_INDEX: readonly QuestionMeta[] = index as QuestionMeta[];
export const QUESTION_BY_ID: ReadonlyMap<string, QuestionMeta> = new Map(QUESTION_INDEX.map((q) => [q.qid, q]));
