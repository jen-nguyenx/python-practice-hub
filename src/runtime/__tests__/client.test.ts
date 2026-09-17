// Python client tests with a fake worker: load stages, queueing, the hard watchdog, crashes, load failure and restart.
// The real worker is checked in Chrome by scratch/runtime-browser/drive.mjs.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRASH_MESSAGE, createPyClient, crashKind, RESTART_MESSAGE, STACK_MESSAGE, TIMEOUT_MESSAGE, runWatchdogMs, testsWatchdogMs,
} from '../pyClient.ts';
import type { PyClientOptions, WorkerLike } from '../pyClient.ts';
import { mistakesFor } from '../errorMatch.ts';
import type { PyClient, RunResult, TestsResult } from '../protocol.ts';
import type { ClientToWorker, WorkerToClient } from '../pyWorker.ts';
import type { Test } from '../../content/schema.ts';

class FakeWorker implements WorkerLike {
  onmessage: ((ev: MessageEvent) => unknown) | null = null;
  onerror: ((ev: ErrorEvent) => unknown) | null = null;
  sent: ClientToWorker[] = [];
  terminated = false;
  postMessage(message: unknown) {
    this.sent.push(message as ClientToWorker);
  }
  terminate() {
    this.terminated = true;
  }
  emit(msg: WorkerToClient) {
    this.onmessage?.({ data: msg } as MessageEvent);
  }
  ready(python = '3.14.2') {
    this.emit({ type: 'ready', python, pyodide: '314.0.7', loadMs: 1000 });
  }
  last(): ClientToWorker {
    const m = this.sent[this.sent.length - 1];
    if (!m) throw new Error('nothing sent');
    return m;
  }
  started(id = this.last().id) {
    this.emit({ type: 'started', id });
  }
  result(data: unknown, id = this.last().id) {
    this.emit({ type: 'result', id, ok: true, data });
  }
}

const RUN_OK: RunResult = { stdout: 'hi\n', timedOut: false, outputTruncated: false, durationMs: 1 };

function setup(opts: Partial<PyClientOptions> = {}) {
  const workers: FakeWorker[] = [];
  const py = createPyClient({
    createWorker: () => {
      const w = new FakeWorker();
      workers.push(w);
      return w;
    },
    ...opts,
  });
  const current = () => {
    const w = workers[workers.length - 1];
    if (!w) throw new Error('no worker');
    return w;
  };
  return { py, workers, current };
}

async function settle() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

function track<T>(p: Promise<T>) {
  const state: { value?: T; error?: unknown; done: boolean } = { done: false };
  p.then((v) => { state.value = v; state.done = true; }, (e: unknown) => { state.error = e; state.done = true; });
  return state;
}

function tests(n: number): Test[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i}`, label: `t${i}`, call: `f(${i})`, expect: String(i) }) as Test);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-17T10:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});

describe('loading', () => {
  it('starts idle and does not create a worker until needed', () => {
    const { py, workers } = setup();
    expect(py.status.value).toEqual({ state: 'idle' });
    expect(workers).toHaveLength(0);
  });

  it('warmUp is idempotent and status shows stages with a ticking elapsedMs', () => {
    const { py, workers, current } = setup();
    py.warmUp();
    py.warmUp();
    expect(workers).toHaveLength(1);
    expect(py.status.value).toEqual({ state: 'loading', stage: 'Downloading Python', elapsedMs: 0 });
    vi.advanceTimersByTime(3000);
    expect(py.status.value).toMatchObject({ state: 'loading', stage: 'Downloading Python', elapsedMs: 3000 });
    current().emit({ type: 'status', stage: 'Starting Python' });
    expect(py.status.value).toMatchObject({ state: 'loading', stage: 'Starting Python', elapsedMs: 3000 });
    current().emit({ type: 'status', stage: 'Loading grader' });
    vi.advanceTimersByTime(1000);
    expect(py.status.value).toMatchObject({ state: 'loading', stage: 'Loading grader', elapsedMs: 4000 });
    current().ready();
    expect(py.status.value).toEqual({ state: 'ready', python: '3.14.2' });
    py.warmUp();
    expect(workers).toHaveLength(1);
    vi.advanceTimersByTime(5000);
    expect(py.status.value).toEqual({ state: 'ready', python: '3.14.2' });
  });

  it('queues requests made before ready and sends them once ready', async () => {
    const { py, workers, current } = setup();
    const r = track(py.run({ code: 'print("hi")' }));
    expect(workers).toHaveLength(1); // a request starts Python
    expect(py.status.value.state).toBe('loading');
    expect(current().sent).toHaveLength(0);
    current().ready();
    expect(current().sent).toEqual([{ id: 1, op: 'run', payload: { code: 'print("hi")' } }]);
    expect(py.status.value).toEqual({ state: 'running', python: '3.14.2' });
    current().started();
    current().result(RUN_OK);
    await settle();
    expect(r.value).toEqual(RUN_OK);
    expect(py.status.value).toEqual({ state: 'ready', python: '3.14.2' });
  });

  it('load failure sets error, rejects pending requests, and warmUp retries', async () => {
    const { py, workers, current } = setup();
    const r = track(py.run({ code: 'x' }));
    current().emit({ type: 'loadError', message: 'Python could not be downloaded (offline).' });
    await settle();
    expect(py.status.value).toEqual({ state: 'error', message: 'Python could not be downloaded (offline).' });
    expect(r.error).toBeInstanceOf(Error);
    expect((r.error as Error).message).toContain('offline');
    expect(workers[0]!.terminated).toBe(true);
    py.warmUp();
    expect(workers).toHaveLength(2);
    expect(py.status.value).toMatchObject({ state: 'loading', stage: 'Downloading Python' });
    current().ready();
    expect(py.status.value.state).toBe('ready');
  });

  it('a request made in the error state retries the load', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().emit({ type: 'loadError', message: 'offline' });
    const r = track(py.run({ code: 'print(1)' }));
    expect(workers).toHaveLength(2);
    current().ready();
    current().started();
    current().result(RUN_OK);
    await settle();
    expect(r.value).toEqual(RUN_OK);
  });

  it('reports a load that never finishes', () => {
    const { py, current } = setup({ loadTimeoutMs: 60_000 });
    py.warmUp();
    vi.advanceTimersByTime(59_999);
    expect(py.status.value.state).toBe('loading');
    vi.advanceTimersByTime(1);
    expect(py.status.value.state).toBe('error');
    expect(current().terminated).toBe(true);
  });

  it('a worker error during loading is a load failure', () => {
    const { py, current } = setup();
    py.warmUp();
    current().onerror?.({ message: 'SyntaxError in worker', preventDefault() {} } as ErrorEvent);
    expect(py.status.value).toMatchObject({ state: 'error' });
    expect((py.status.value as { message: string }).message).toContain('SyntaxError in worker');
  });

  it('restart before Python was ever ready shows loading, not restarting', () => {
    const { py, workers } = setup();
    py.warmUp();
    workers[0]!.emit({ type: 'loadError', message: 'offline' });
    py.restart('Retry after load failure');
    py.warmUp();
    expect(workers).toHaveLength(2);
    expect(py.status.value).toMatchObject({ state: 'loading', stage: 'Downloading Python' });
  });
});

describe('requests', () => {
  let ctx: ReturnType<typeof setup>;
  let py: PyClient;
  beforeEach(() => {
    ctx = setup();
    py = ctx.py;
    py.warmUp();
    ctx.current().ready();
  });

  it('runs one request at a time, in order', async () => {
    const w = ctx.current();
    const a = track(py.run({ code: 'a' }));
    const b = track(py.run({ code: 'b' }));
    expect(w.sent.map((m) => m.id)).toEqual([1]);
    w.started(1);
    w.result({ ...RUN_OK, stdout: 'a' }, 1);
    expect(w.sent.map((m) => m.id)).toEqual([1, 2]);
    expect(w.sent[1]).toMatchObject({ op: 'run', payload: { code: 'b' } });
    w.started(2);
    w.result({ ...RUN_OK, stdout: 'b' }, 2);
    await settle();
    expect(a.value?.stdout).toBe('a');
    expect(b.value?.stdout).toBe('b');
  });

  it('fills mistakes on run errors from the catalogue', async () => {
    const w = ctx.current();
    const r = track(py.run({ code: 'print(totl)' }));
    w.started();
    w.result({ ...RUN_OK, stdout: '', error: { type: 'NameError', message: "name 'totl' is not defined. Did you mean: 'total'?", traceback: '', line: 1 } });
    await settle();
    expect(r.value?.error?.mistakes).toEqual(['name_typo']);
  });

  it('fills mistakes on every error in a TestsResult and keeps harness-attached ids first', async () => {
    const w = ctx.current();
    const data: TestsResult = {
      topLevelError: { type: 'TimeoutError', message: 'Your code ran for more than 1 second', traceback: '', mistakes: ['top_level_code'] },
      outcomes: [
        { id: 't1', label: 't1', hidden: false, pass: false, stdout: '', timedOut: false, detections: [], error: { type: 'ZeroDivisionError', message: 'division by zero', traceback: '' } },
      ],
      flags: [], ruleViolations: [], passed: 0, total: 1,
    };
    const r = track(py.runTests({ code: 'x', tests: tests(1), kind: 'function', fnName: 'f' }));
    expect(w.last()).toMatchObject({ op: 'tests', payload: { fnName: 'f', kind: 'function' } });
    w.started();
    w.result(data);
    await settle();
    expect(r.value?.topLevelError?.mistakes).toEqual(['top_level_code', 'infinite_while']);
    expect(r.value?.outcomes[0]?.error?.mistakes).toEqual(['zero_division']);
  });

  it('fills mistakes on analyze syntax errors and does not show Running for analyze', async () => {
    const w = ctx.current();
    const r = track(py.analyze('if x\n    pass'));
    expect(w.last()).toMatchObject({ op: 'analyze', payload: { code: 'if x\n    pass' } });
    expect(py.status.value.state).toBe('ready');
    w.started();
    w.result({ flags: [{ flag: 'loop_present', line: 1 }], syntaxError: { type: 'SyntaxError', message: "expected ':'", traceback: '', line: 1, col: 5, endCol: 6 } });
    await settle();
    expect(r.value?.syntaxError?.mistakes).toEqual(['missing_colon']);
    expect(r.value?.flags).toHaveLength(1);
    expect(py.status.value.state).toBe('ready');
  });

  it('passes pair requests through', async () => {
    const w = ctx.current();
    const req = { reference: 'def f(x): return x', buggy: 'def f(x): return 0', fnName: 'f', argsRepr: '(1,)' };
    const r = track(py.pair(req));
    expect(w.last()).toMatchObject({ op: 'pair', payload: req });
    expect(py.status.value.state).toBe('running');
    w.started();
    w.result({ validArgs: true, differs: true, refResult: '1', bugResult: '0' });
    await settle();
    expect(r.value).toEqual({ validArgs: true, differs: true, refResult: '1', bugResult: '0' });
  });

  it('rejects when the harness itself fails, then carries on with the queue', async () => {
    const w = ctx.current();
    const a = track(py.run({ code: 'a' }));
    const b = track(py.run({ code: 'b' }));
    w.started(1);
    w.emit({ type: 'result', id: 1, ok: false, error: 'The Python grader failed: boom' });
    w.started(2);
    w.result(RUN_OK, 2);
    await settle();
    expect((a.error as Error).message).toContain('boom');
    expect(b.value).toEqual(RUN_OK);
  });

  it('ignores messages from a worker that was replaced', async () => {
    const old = ctx.current();
    const r = track(py.run({ code: 'a' }));
    py.restart('manual');
    await settle();
    expect(r.value?.error?.message).toBe(RESTART_MESSAGE);
    old.emit({ type: 'ready', python: '3.0.0', pyodide: 'x', loadMs: 0 });
    old.result(RUN_OK, 1);
    expect(py.status.value).toEqual({ state: 'restarting', reason: 'manual' });
  });
});

describe('hard watchdog', () => {
  it('starts only when the worker acknowledges the request', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const r = track(py.run({ code: 'while True: pass', budgetMs: 2000 }));
    vi.advanceTimersByTime(9000); // not acknowledged yet (under the 10 s ack limit): no watchdog
    expect(workers).toHaveLength(1);
    current().started();
    vi.advanceTimersByTime(4999);
    expect(workers).toHaveLength(1);
    expect(r.done).toBe(false);
    vi.advanceTimersByTime(1);
    await settle();
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
    expect(r.value).toMatchObject({ stdout: '', timedOut: true, outputTruncated: false });
    expect(r.value?.error).toMatchObject({ type: 'TimeoutError', message: TIMEOUT_MESSAGE });
    expect(r.value?.error?.mistakes).toEqual(['infinite_while']);
    expect(py.status.value).toMatchObject({ state: 'restarting' });
  });

  it('keeps queued requests and runs them on the respawned worker', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const slow = track(py.run({ code: 'sum(range(10**10))' }));
    const next = track(py.run({ code: 'print("back")' }));
    current().started();
    vi.advanceTimersByTime(5000);
    await settle();
    expect(slow.value?.timedOut).toBe(true);
    expect(workers).toHaveLength(2);
    const w2 = current();
    expect(w2.sent).toHaveLength(0);
    w2.emit({ type: 'status', stage: 'Starting Python' });
    expect(py.status.value).toMatchObject({ state: 'restarting' }); // stays "restarting" through the reload
    w2.ready();
    expect(w2.sent).toHaveLength(1);
    expect(w2.last()).toMatchObject({ op: 'run', payload: { code: 'print("back")' } });
    w2.started();
    w2.result({ ...RUN_OK, stdout: 'back\n' });
    await settle();
    expect(next.value?.stdout).toBe('back\n');
    expect(py.status.value).toEqual({ state: 'ready', python: '3.14.2' });
  });

  it('uses the documented limits for each request type', () => {
    expect(runWatchdogMs({ code: '' })).toBe(5000);
    expect(runWatchdogMs({ code: '', budgetMs: 4000 })).toBe(7000);
    expect(testsWatchdogMs({ code: '', tests: tests(3), kind: 'function' })).toBe(6000);
    expect(testsWatchdogMs({ code: '', tests: tests(3), kind: 'function', budgetMsPerTest: 500 })).toBe(4500);
    expect(testsWatchdogMs({ code: '', tests: tests(20), kind: 'function' })).toBe(12000);
    expect(testsWatchdogMs({ code: '', tests: [], kind: 'program' })).toBe(4000);
  });

  it('times out runTests with a topLevelError', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const r = track(py.runTests({ code: 'x', tests: tests(2), kind: 'function', fnName: 'f' }));
    current().started();
    vi.advanceTimersByTime(4999);
    expect(workers).toHaveLength(1);
    vi.advanceTimersByTime(1);
    await settle();
    expect(workers).toHaveLength(2);
    expect(r.value).toMatchObject({ outcomes: [], flags: [], ruleViolations: [], passed: 0, total: 2 });
    expect(r.value?.topLevelError).toMatchObject({ type: 'TimeoutError', message: TIMEOUT_MESSAGE });
    expect(r.value?.topLevelError?.mistakes).toContain('infinite_while');
  });

  it('times out analyze after 4 s and pair after 6 s', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const a = track(py.analyze('x'));
    current().started();
    vi.advanceTimersByTime(4000);
    await settle();
    expect(a.value).toEqual({ flags: [] });
    expect(workers).toHaveLength(2);
    current().ready();
    const p = track(py.pair({ reference: 'r', buggy: 'b', fnName: 'f', argsRepr: '(10**10,)' }));
    current().started();
    vi.advanceTimersByTime(5999);
    expect(p.done).toBe(false);
    vi.advanceTimersByTime(1);
    await settle();
    expect(p.value).toMatchObject({ validArgs: true, differs: false });
    expect(workers).toHaveLength(3);
  });

  it('treats an unacknowledged request as a dead worker', async () => {
    const { py, workers, current } = setup({ ackTimeoutMs: 10_000 });
    py.warmUp();
    current().ready();
    const r = track(py.run({ code: 'x' }));
    vi.advanceTimersByTime(10_000);
    await settle();
    expect(workers).toHaveLength(2);
    expect(r.value?.error?.message).toBe(CRASH_MESSAGE);
    expect(r.value?.timedOut).toBe(false);
  });
});

describe('crashes and restart', () => {
  it('a fatal Pyodide error from stack overflow resolves as RecursionError and respawns', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const r = track(py.run({ code: 'deep' }));
    current().started();
    current().emit({ type: 'fatal', id: 1, message: 'Maximum call stack size exceeded' });
    await settle();
    expect(workers).toHaveLength(2);
    expect(workers[0]!.terminated).toBe(true);
    expect(r.value?.error).toMatchObject({ type: 'RecursionError', message: STACK_MESSAGE });
    expect(r.value?.error?.mistakes).toContain('missing_base_case');
    expect(py.status.value).toMatchObject({ state: 'restarting' });
    current().ready();
    expect(py.status.value.state).toBe('ready');
  });

  it('a worker error while ready resolves the request and respawns', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const r = track(py.runTests({ code: 'x', tests: tests(1), kind: 'function', fnName: 'f' }));
    current().started();
    current().onerror?.({ message: 'out of memory', preventDefault() {} } as ErrorEvent);
    await settle();
    expect(workers).toHaveLength(2);
    expect(r.value?.topLevelError).toMatchObject({ type: 'MemoryError', message: CRASH_MESSAGE });
  });

  it('restart(reason) resolves the in-flight request and shows restarting', async () => {
    const { py, workers, current } = setup();
    py.warmUp();
    current().ready();
    const r = track(py.run({ code: 'x' }));
    current().started();
    py.restart('Restarted from Settings');
    await settle();
    expect(workers).toHaveLength(2);
    expect(py.status.value).toEqual({ state: 'restarting', reason: 'Restarted from Settings' });
    expect(r.value).toMatchObject({ timedOut: true, error: { type: 'TimeoutError', message: RESTART_MESSAGE } });
    current().ready();
    expect(py.status.value.state).toBe('ready');
  });

  it('classifies crash messages', () => {
    expect(crashKind('RangeError: Maximum call stack size exceeded')).toBe('stack');
    expect(crashKind('memory access out of bounds')).toBe('crash');
    expect(crashKind(undefined)).toBe('crash');
  });
});

describe('errorMatch', () => {
  it('matches catalogue ids without duplicates', () => {
    expect(mistakesFor({ type: 'SyntaxError', message: "expected ':'", traceback: '', mistakes: ['missing_colon'] })).toEqual(['missing_colon']);
    expect(mistakesFor({ type: 'SomethingNew', message: '', traceback: '' })).toEqual([]);
  });
});
