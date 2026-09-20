// The reference: "how do I ...?" answered with a snippet that really runs.
//
// Organised by the job a student is trying to do, not by language feature, because during revision
// nobody looks up "the sorted builtin" — they look up "sort a dict by value". Every snippet's output is
// produced by the verifier running it, so the reference cannot drift away from the language.
import type { TopicId } from './ids.ts';
import type { Md } from './schema.ts';

export type RecipeGroup =
  | 'numbers' | 'text' | 'lists' | 'dictionaries' | 'loops'
  | 'functions' | 'files' | 'errors' | 'showing';

export const RECIPE_GROUPS: readonly RecipeGroup[] = [
  'numbers', 'text', 'lists', 'dictionaries', 'loops', 'functions', 'files', 'errors', 'showing',
];

export const GROUP_LABEL: Record<RecipeGroup, string> = {
  numbers: 'Numbers and maths',
  text: 'Text',
  lists: 'Lists and tuples',
  dictionaries: 'Dictionaries',
  loops: 'Loops',
  functions: 'Functions',
  files: 'Files and CSV',
  errors: 'When it goes wrong',
  showing: 'Showing your answer',
};

export interface Recipe {
  /** Unique, kebab-case, e.g. "sort-a-dict-by-value". */
  id: string;
  /** The job, in the words a student would use: "Sort a dictionary by its values". */
  task: string;
  group: RecipeGroup;
  /**
   * A short runnable snippet that PRINTS something, so the answer can be seen rather than promised.
   * Kept to a handful of lines: this is a reminder, not a lesson.
   */
  code: string;
  /** One or two sentences: the thing worth knowing beyond the snippet itself. */
  note: Md;
  /** Other words someone might search for that are not already in the task. */
  also?: string[];
  /** The topic whose lesson teaches this, for a "learn it properly" link. */
  topicId?: TopicId;
}

/** What running each snippet produced. Written by the verifier, never by hand. */
export interface GeneratedRecipe { stdout: string }
export type GeneratedRecipes = Record<string, GeneratedRecipe>;

/** Everything the reference page needs, including what each snippet prints. */
export interface RecipeEntry extends Recipe { stdout: string }

/**
 * Does this word appear in that text? A plural is not a different word to someone searching: "count
 * things" must find "Count how many times each thing appears", so a trailing s is tried both ways. This
 * is deliberately not a stemmer — a student typing a rough phrase is the whole case to handle.
 */
function has(hay: string, word: string): boolean {
  if (hay.includes(word)) return true;
  if (word.endsWith('es') && hay.includes(word.slice(0, -2))) return true;
  if (word.endsWith('s') && hay.includes(word.slice(0, -1))) return true;
  return hay.includes(`${word}s`);
}

function words(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Match a recipe against a search: every word must appear somewhere in it. */
export function matchesRecipe(r: Recipe, query: string): boolean {
  const ws = words(query);
  if (ws.length === 0) return true;
  const hay = `${r.task} ${r.note} ${r.code} ${(r.also ?? []).join(' ')} ${GROUP_LABEL[r.group]}`.toLowerCase();
  return ws.every((w) => has(hay, w));
}

/**
 * How well an entry answers the search. Matching anywhere is enough to be shown, but a search is typed
 * as the job itself ("sort a dict by value"), and words like "a" and "by" turn up in every note and
 * every snippet. Without this, the entry whose task IS the search sits somewhere down the list.
 */
export function scoreRecipe(r: Recipe, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const task = r.task.toLowerCase();
  const also = (r.also ?? []).join(' ').toLowerCase();
  const rest = `${r.note} ${r.code}`.toLowerCase();
  let score = 0;
  if (task.includes(q)) score += 100;
  for (const w of words(q)) {
    if (has(task, w)) score += 10;
    if (has(also, w)) score += 4;
    if (has(rest, w)) score += 1;
  }
  return score;
}
