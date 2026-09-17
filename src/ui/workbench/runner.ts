// Running student code: plain program runs with replayed input(), visible/all test runs, and run events.
import { useCallback, useRef, useState } from 'preact/hooks';
import type { TopicId } from '../../content/ids.ts';
import type { RunResult, TestsRequest, TestsResult, VirtualFile } from '../../runtime/protocol.ts';
import { py, store } from '../../app/services.ts';

export interface RunContext { qid: string | null; topicId: TopicId | null }

function safeAppend(e: Parameters<typeof store.append>[0]) {
  try {
    store.append(e);
  } catch (err) {
    console.warn('Could not log event', err);
  }
}

export function logRunEvent(ctx: RunContext, r: { ok: boolean; errorType?: string; timedOut: boolean; durationMs: number }) {
  safeAppend({ type: 'run', qid: ctx.qid, topicId: ctx.topicId, ok: r.ok, errorType: r.errorType, timedOut: r.timedOut, durationMs: Math.round(r.durationMs) });
}

export function firstTestsError(r: TestsResult) {
  return r.compileError ?? r.topLevelError ?? r.outcomes.find((o) => o.error)?.error;
}

function crashResult(err: unknown): RunResult {
  const message = err instanceof Error ? err.message : String(err);
  return { stdout: '', error: { type: 'RuntimeUnavailable', message, traceback: '' }, timedOut: false, outputTruncated: false, durationMs: 0 };
}

export interface ProgramRunState {
  running: boolean;
  result: RunResult | null;
  /** Lines typed into the terminal's input prompt during this run. */
  typed: string[];
  /** Error from the Python client itself (not the student's code). */
  failure: string | null;
}

/**
 * Plain program runs. When the program asks for more input than was queued, the terminal shows a prompt;
 * answering re-runs the program from the top with the queued lines plus the new one.
 */
export function useProgramRunner(ctx: RunContext) {
  const [state, setState] = useState<ProgramRunState>({ running: false, result: null, typed: [], failure: null });
  const last = useRef<{ code: string; stdin: string[]; files?: VirtualFile[] } | null>(null);
  const token = useRef(0);
  const typedRef = useRef<string[]>([]);

  const exec = useCallback(async (code: string, stdin: string[], typed: string[], files?: VirtualFile[]) => {
    const my = ++token.current;
    last.current = { code, stdin, files };
    setState((s) => ({ ...s, running: true, typed, failure: null }));
    const t0 = performance.now();
    let result: RunResult;
    let failure: string | null = null;
    try {
      result = await py.run({ code, stdin: [...stdin, ...typed], files });
    } catch (err) {
      result = crashResult(err);
      failure = result.error!.message;
    }
    if (my !== token.current) return result;
    // One run event per Run press; replays for typed input are not counted again.
    if (!failure && typed.length === 0) {
      logRunEvent(ctx, { ok: !result.error && !result.timedOut, errorType: result.error?.type, timedOut: result.timedOut, durationMs: result.durationMs || performance.now() - t0 });
    }
    setState({ running: false, result, typed, failure });
    return result;
  }, [ctx.qid, ctx.topicId]);

  const run = useCallback((code: string, stdin: string[], files?: VirtualFile[]) => {
    typedRef.current = [];
    return exec(code, stdin, [], files);
  }, [exec]);

  const answer = useCallback((line: string) => {
    const l = last.current;
    if (!l) return;
    typedRef.current = [...typedRef.current, line];
    void exec(l.code, l.stdin, typedRef.current, l.files);
  }, [exec]);

  const clear = useCallback(() => {
    token.current++;
    typedRef.current = [];
    setState({ running: false, result: null, typed: [], failure: null });
  }, []);

  return { state, run, answer, clear };
}

/** Run tests with timing and a run event (for plain "Run" presses; submits are logged as attempts instead). */
export async function runTestsLogged(req: TestsRequest, ctx: RunContext, logAsRun: boolean): Promise<{ result: TestsResult | null; failure: string | null }> {
  const t0 = performance.now();
  try {
    const result = await py.runTests(req);
    if (logAsRun) {
      const err = firstTestsError(result);
      const timedOut = result.outcomes.some((o) => o.timedOut) || err?.type === 'TimeoutError';
      logRunEvent(ctx, { ok: !result.compileError && !result.topLevelError && !result.missingFunction, errorType: err?.type, timedOut, durationMs: performance.now() - t0 });
    }
    return { result, failure: null };
  } catch (err) {
    return { result: null, failure: err instanceof Error ? err.message : String(err) };
  }
}
