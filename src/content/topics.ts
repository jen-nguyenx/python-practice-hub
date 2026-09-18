// Ordered topic metadata. Order here IS the unlock order.
import type { TopicId } from './ids.ts';

export interface TopicMeta {
  id: TopicId;
  order: number;
  /** Two-digit folder prefix, e.g. "03". */
  num: string;
  title: string;
  short: string;
  band: 'core' | 'late';
  blurb: string;
  concepts: string[];
  /** Which CITS1401 lectures/labs this matches. */
  unitRef: string;
  /**
   * Minimum to unlock the next topic (the topic must also have been opened).
   * solve: questions answered correctly without revealing the answer (hints are fine).
   * code: how many of those must be code formats (fill-in, Parsons, fix, write, refactor, break-the-code).
   */
  minimum: { solve: number; code: number };
  note?: string;
}

export const TOPICS: readonly TopicMeta[] = [
  { id: 'variables-expressions', order: 1, num: '01', title: 'Variables, types and expressions', short: 'Variables', band: 'core',
    blurb: 'Arithmetic with / // % **, int, float, str and bool, converting between them, and naming things well.',
    concepts: ['operators', 'types', 'conversion', 'f-strings'], unitRef: 'Lectures 3-4, 6 · Lab 01', minimum: { solve: 5, code: 1 } },
  { id: 'if-elif-else', order: 2, num: '02', title: 'If, elif, else and Boolean logic', short: 'Decisions', band: 'core',
    blurb: 'Comparisons, and/or/not, chained comparisons, elif chains versus separate ifs, and returning booleans.',
    concepts: ['comparison', 'boolean', 'elif', 'in'], unitRef: 'Lectures 7-8 · Lab 03', minimum: { solve: 5, code: 2 },
    note: 'In lectures, for loops come before if/else. Here decisions come first so loops can use them straight away.' },
  { id: 'for-loops-range', order: 3, num: '03', title: 'For loops and range()', short: 'For loops', band: 'core',
    blurb: 'range bounds, the accumulator pattern, loops with an if inside, and tracing a loop by hand.',
    concepts: ['range', 'accumulator', 'trace', 'fibonacci'], unitRef: 'Lecture 5 · Lab 03', minimum: { solve: 6, code: 2 } },
  { id: 'functions-basics', order: 4, num: '04', title: 'Functions part 1', short: 'Functions', band: 'core',
    blurb: 'def, parameters and arguments, return versus print, docstrings, and using the value a function gives back.',
    concepts: ['def', 'return', 'parameters', 'docstring'], unitRef: 'Lecture 9 · Lab 02', minimum: { solve: 5, code: 2 } },
  { id: 'strings', order: 5, num: '05', title: 'Strings', short: 'Strings', band: 'core',
    blurb: 'Indexing and slicing, string methods, building strings in loops, and comparing text case-insensitively.',
    concepts: ['slicing', 'methods', 'immutability', 'palindrome'], unitRef: 'Lectures 10-11', minimum: { solve: 5, code: 2 } },
  { id: 'lists-tuples', order: 6, num: '06', title: 'Lists, tuples and sorting', short: 'Lists', band: 'core',
    blurb: 'append and pop, sort versus sorted, sorting with key and tie-breaks, tuples, multiple return values and aliasing.',
    concepts: ['list', 'tuple', 'sort', 'aliasing', 'nested-list'], unitRef: 'Lecture 12 · Lab 04', minimum: { solve: 6, code: 2 } },
  { id: 'while-nested-loops', order: 7, num: '07', title: 'While loops, nested loops and series', short: 'While loops', band: 'core',
    blurb: 'Sentinel loops, digit tricks with % and //, series summed to a tolerance, and combinations with nested loops.',
    concepts: ['while', 'nested-loop', 'series', 'digits'], unitRef: 'Lectures 16-18', minimum: { solve: 6, code: 2 } },
  { id: 'dictionaries', order: 8, num: '08', title: 'Dictionaries', short: 'Dictionaries', band: 'core',
    blurb: 'get and items, counting and grouping, turning a dict into a sorted list of tuples, and ranking with tie-breaks.',
    concepts: ['dict', 'counting', 'grouping', 'ranking'], unitRef: 'Lectures 20-21 · Lab 05', minimum: { solve: 5, code: 2 } },
  { id: 'files-csv', order: 9, num: '09', title: 'Text files and CSV without imports', short: 'Files and CSV', band: 'late',
    blurb: 'with open, strip and split, finding columns by header name, skipping bad rows, and writing files, all without the csv module.',
    concepts: ['open', 'split', 'header', 'validation'], unitRef: 'Lectures 13-14 · Projects', minimum: { solve: 4, code: 2 } },
  { id: 'exceptions', order: 10, num: '10', title: 'Exceptions and graceful termination', short: 'Exceptions', band: 'late',
    blurb: 'Reading tracebacks, catching specific exceptions, and returning empty results instead of crashing.',
    concepts: ['try', 'except', 'traceback', 'validation'], unitRef: 'Lecture 19 · Projects', minimum: { solve: 4, code: 1 } },
  { id: 'functions-project', order: 11, num: '11', title: 'Functions part 2 and the main() contract', short: 'Project rules', band: 'late',
    blurb: 'Scope, default parameters, helpers called from main(csvfile), and the project rules: no import, input or print, round only at output.',
    concepts: ['scope', 'defaults', 'main', 'rules'], unitRef: 'Lecture 15 · Project specs', minimum: { solve: 5, code: 2 } },
  { id: 'project-simulator', order: 12, num: '12', title: 'Project simulator', short: 'Project sim', band: 'late',
    blurb: 'Mean, standard deviation and cosine similarity by hand, nested dictionaries, ranking and messy CSV files.',
    concepts: ['statistics', 'nested-dict', 'ranking', 'csv'], unitRef: 'Projects 1 and 2', minimum: { solve: 3, code: 2 } },
  { id: 'recursion', order: 13, num: '13', title: 'Recursion', short: 'Recursion', band: 'late',
    blurb: 'Base case and recursive case, tracing the call stack, recursion over nested lists, and solving without loops.',
    concepts: ['base-case', 'call-stack', 'nested-list'], unitRef: 'Lectures 27-28 · Final exam', minimum: { solve: 5, code: 2 },
    note: 'Every recent final exam has a mandatory recursion question where loops are not allowed.' },
];

export const TOPIC_BY_ID: Record<string, TopicMeta> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));
