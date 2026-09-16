// STUB catalogue. Replaced by the catalogues agent. Keep exported names and shapes.
import type { AstFlag, MistakeCategory, MistakeId, PatternId } from './ids.ts';
import { MISTAKE_IDS } from './ids.ts';
import type { Md } from './schema.ts';

export interface MistakeDef {
  id: MistakeId;
  /** Short plain-language name, e.g. "Printing instead of returning". */
  label: string;
  category: MistakeCategory;
  /** What it means, for a beginner. */
  explain: Md;
  /** The usual fix. */
  fix: Md;
  example: { bad: string; good: string };
  pattern?: PatternId;
  /** Runtime errors that indicate this mistake: exception type plus optional message regex (source string). */
  runtime?: { type: string; message?: string }[];
  astFlags?: AstFlag[];
}

export const MISTAKES: Record<MistakeId, MistakeDef> = Object.fromEntries(
  MISTAKE_IDS.map((id) => [id, { id, label: id.replace(/_/g, ' '), category: 'conceptual', explain: '', fix: '', example: { bad: '', good: '' } }]),
) as Record<MistakeId, MistakeDef>;

export interface ErrorExplanation {
  /** Heading, e.g. "KeyError: a key that isn't in the dictionary". */
  title: string;
  meaning: Md;
  fix: Md;
  mistakes: MistakeId[];
}

/** Map a Python error (type + message) to likely mistakes. */
export function matchError(err: { type: string; message: string }): MistakeId[] {
  void err;
  return [];
}

/** Plain-English explanation for any Python error, with a generic fallback. */
export function explainError(err: { type: string; message: string; line?: number }): ErrorExplanation {
  return { title: `${err.type}: ${err.message}`, meaning: '', fix: '', mistakes: [] };
}
