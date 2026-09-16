// STUB catalogue. Replaced by the catalogues agent. Keep exported names and shapes.
import type { AstFlag, MistakeId, PatternId, TopicId } from './ids.ts';
import type { Md } from './schema.ts';

export interface PatternCard {
  id: PatternId;
  title: string;
  why: Md;
  bad: string;
  good: string;
  /** e.g. "PEP 8: Naming Conventions" or "CITS1401 project rules". */
  reference: string;
  /** Mistakes that make this card recommended. */
  triggers: MistakeId[];
  /** AST flags in passing code that show the student already uses this idiom. */
  idiomFlags: AstFlag[];
  /** The card is shown as "Later" until this topic is unlocked. */
  topicId: TopicId;
}

export const PATTERNS: PatternCard[] = [];
