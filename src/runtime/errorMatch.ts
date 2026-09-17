// Attaches mistake ids to PyErrors coming back from the worker, using the catalogue's runtime matchers.
import type { MistakeId } from '../content/ids.ts';
import { matchError } from '../content/mistakes.ts';
import type { PyError, TestsResult } from './protocol.ts';

/** Mistake ids for an error: ids the harness already attached first, then catalogue matches, no duplicates. */
export function mistakesFor(err: PyError): MistakeId[] {
  const out: MistakeId[] = [];
  for (const id of err.mistakes ?? []) if (!out.includes(id)) out.push(id);
  let matched: MistakeId[] = [];
  try {
    matched = matchError({ type: String(err.type ?? ''), message: typeof err.message === 'string' ? err.message : '' });
  } catch {
    matched = [];
  }
  for (const id of matched) if (!out.includes(id)) out.push(id);
  return out;
}

/** Returns the same error object with `mistakes` filled in. */
export function withMistakes<T extends PyError | undefined>(err: T): T {
  if (err && typeof err === 'object') err.mistakes = mistakesFor(err);
  return err;
}

/** Fills `mistakes` on every PyError inside a TestsResult. Mutates and returns it. */
export function annotateTests(result: TestsResult): TestsResult {
  withMistakes(result.compileError);
  withMistakes(result.topLevelError);
  for (const o of result.outcomes ?? []) withMistakes(o.error);
  return result;
}
