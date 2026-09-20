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

/** Match a recipe against a search: every word must appear somewhere in it. */
export function matchesRecipe(r: Recipe, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${r.task} ${r.note} ${r.code} ${(r.also ?? []).join(' ')} ${GROUP_LABEL[r.group]}`.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
