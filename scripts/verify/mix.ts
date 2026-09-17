// Target question volume and format mix per topic, copied from the table in docs/build/CONTENT.md.
import type { Format } from '../../src/content/ids.ts';

export interface MixTarget {
  total: number;
  diff: { easy: number; medium: number; hard: number };
  formats: Partial<Record<Format, number>>;
  paper?: number;
  project?: number;
}

export const MIX: Record<string, MixTarget> = {
  'variables-expressions': { total: 12, diff: { easy: 5, medium: 5, hard: 2 },
    formats: { mcq: 3, multi: 1, predict: 3, trace: 1, cloze: 1, fixBug: 1, write: 2 } },
  'if-elif-else': { total: 12, diff: { easy: 4, medium: 5, hard: 3 },
    formats: { mcq: 3, predict: 2, twins: 1, multi: 1, parsons: 1, fixBug: 1, write: 2, refactor: 1 } },
  'for-loops-range': { total: 13, diff: { easy: 4, medium: 6, hard: 3 },
    formats: { mcq: 1, multi: 1, predict: 3, trace: 2, cloze: 1, parsons: 2, fixBug: 1, write: 2 }, paper: 1 },
  'functions-basics': { total: 12, diff: { easy: 4, medium: 5, hard: 3 },
    formats: { mcq: 2, cloze: 1, predict: 2, errorTranslator: 1, parsons: 1, fixBug: 1, write: 3, refactor: 1 } },
  strings: { total: 12, diff: { easy: 4, medium: 5, hard: 3 },
    formats: { mcq: 1, predict: 3, twins: 1, errorTranslator: 1, cloze: 1, fixBug: 1, write: 4 }, paper: 1 },
  'lists-tuples': { total: 13, diff: { easy: 4, medium: 5, hard: 4 },
    formats: { mcq: 2, predict: 2, trace: 1, twins: 1, parsons: 1, fixBug: 1, write: 4, refactor: 1 }, paper: 1 },
  'while-nested-loops': { total: 13, diff: { easy: 3, medium: 5, hard: 5 },
    formats: { mcq: 1, predict: 2, trace: 2, cloze: 1, parsons: 1, fixBug: 1, write: 5 }, paper: 2 },
  dictionaries: { total: 12, diff: { easy: 3, medium: 5, hard: 4 },
    formats: { mcq: 1, predict: 2, errorTranslator: 1, cloze: 1, parsons: 1, fixBug: 1, write: 4, refactor: 1 }, paper: 1 },
  'files-csv': { total: 11, diff: { easy: 2, medium: 5, hard: 4 },
    formats: { mcq: 1, predict: 1, multi: 1, cloze: 1, parsons: 1, fixBug: 2, write: 4 }, paper: 1 },
  exceptions: { total: 11, diff: { easy: 3, medium: 5, hard: 3 },
    formats: { mcq: 1, multi: 1, predict: 2, errorTranslator: 2, fixBug: 1, write: 3, testWriter: 1 } },
  'functions-project': { total: 12, diff: { easy: 2, medium: 5, hard: 5 },
    formats: { mcq: 1, predict: 2, errorTranslator: 1, multi: 1, fixBug: 1, refactor: 2, write: 4 }, project: 1 },
  'project-simulator': { total: 10, diff: { easy: 1, medium: 4, hard: 5 },
    formats: { mcq: 1, predict: 1, fixBug: 1, write: 5, refactor: 1, testWriter: 1 }, project: 3 },
  recursion: { total: 12, diff: { easy: 3, medium: 4, hard: 5 },
    formats: { mcq: 1, predict: 2, trace: 2, errorTranslator: 1, parsons: 1, fixBug: 1, write: 4 }, paper: 2 },
};
