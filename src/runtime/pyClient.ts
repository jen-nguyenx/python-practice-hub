// Browser Python client: owns the Pyodide worker, a serial request queue, the hard watchdog and restarts.
// The worker is src/runtime/pyWorker.ts. Status goes to `status` for the header pill.
import { signal } from '@preact/signals';
import { annotateTests, withMistakes } from './errorMatch.ts';
import type {
  AstFinding, PairRequest, PairResult, PyClient, PyError, RunRequest, RunResult, RuntimeStatus, TestsRequest, TestsResult,
} from './protocol.ts';
import type { ClientToWorker, WorkerOp, WorkerToClient } from './pyWorker.ts';

/** The part of a Worker the client uses (a fake one is injected in tests). */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onmessage: ((ev: MessageEvent) => unknown) | null;
  onerror: ((ev: ErrorEvent) => unknown) | null;
}

export interface PyClientOptions {
  createWorker?: () => WorkerLike;
  /** A load that has not reached `ready` after this long is reported as failed. */
  loadTimeoutMs?: number;
  /** How often `elapsedMs` is refreshed while loading. */
  tickMs?: number;
  /** A request the worker has not acknowledged after this long means the worker died. */
  ackTimeoutMs?: number;
}

export const DEFAULT_RUN_BUDGET_MS = 2000;
export const DEFAULT_TEST_BUDGET_MS = 1000;
export const WATCHDOG_GRACE_MS = 3000;
export const TESTS_WATCHDOG_CAP_MS = 12000;
export const ANALYZE_WATCHDOG_MS = 4000;
export const PAIR_WATCHDOG_MS = 6000;
export const TIMEOUT_MESSAGE = 'Your code ran too long and Python was restarted.';
export const CRASH_MESSAGE = 'Python crashed while running your code and was restarted. A very large list or string can cause this.';
export const STACK_MESSAGE = 'Your code went too deep into recursion, so Python crashed and was restarted. Check that every recursive call moves towards a base case.';
export const RESTART_MESSAGE = 'Python was restarted before your code finished.';

export function runWatchdogMs(req: RunRequest): number {
  return positive(req.budgetMs, DEFAULT_RUN_BUDGET_MS) + WATCHDOG_GRACE_MS;
}

export function testsWatchdogMs(req: TestsRequest): number {
  const per = positive(req.budgetMsPerTest, DEFAULT_TEST_BUDGET_MS);
  const n = Math.max(1, Array.isArray(req.tests) ? req.tests.length : 0);
  return Math.min(n * per + WATCHDOG_GRACE_MS, TESTS_WATCHDOG_CAP_MS);
}

function positive(v: number | undefined, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback;
}

/** timeout: hard watchdog. stack / crash: the worker died (JS stack overflow, memory). restart: restart() was called. */
type StopKind = 'timeout' | 'stack' | 'crash' | 'restart';

const STOP_ERRORS: Record<StopKind, [string, string]> = {
  timeout: ['TimeoutError', TIMEOUT_MESSAGE],
  stack: ['RecursionError', STACK_MESSAGE],
  crash: ['MemoryError', CRASH_MESSAGE],
  restart: ['TimeoutError', RESTART_MESSAGE],
};

function stopError(kind: StopKind): PyError {
  const [type, message] = STOP_ERRORS[kind];
  return withMistakes({ type, message, traceback: `${type}: ${message}\n` });
}

/** Pyodide reports a blown WebAssembly stack as "RangeError: Maximum call stack size exceeded". */
export function crashKind(message: string | undefined): 'stack' | 'crash' {
  return /call stack|recursion/i.test(message ?? '') ? 'stack' : 'crash';
}

interface Job {
  id: number;
  op: WorkerOp;
  payload: unknown;
  watchdogMs: number;
  /** Sets the pill to "Running" while in flight (not for background analyze calls). */
  busy: boolean;
  finish(data: unknown): unknown;
  stopped(kind: StopKind, elapsedMs: number): unknown;
  resolve(value: unknown): void;
  reject(err: Error): void;
  startedAt: number;
  ackTimer: ReturnType<typeof setTimeout> | null;
  watchdog: ReturnType<typeof setTimeout> | null;
}

function defaultWorker(): WorkerLike {
  return new Worker(new URL('./pyWorker.ts', import.meta.url), { type: 'module' }) as unknown as WorkerLike;
}

function parseData<T>(data: unknown): T {
  return (typeof data === 'string' ? JSON.parse(data) : data) as T;
}

export function createPyClient(options: PyClientOptions = {}): PyClient {
  const makeWorker = options.createWorker ?? defaultWorker;
  const loadTimeoutMs = options.loadTimeoutMs ?? 150_000;
  const tickMs = options.tickMs ?? 1000;
  const ackTimeoutMs = options.ackTimeoutMs ?? 10_000;

  const status = signal<RuntimeStatus>({ state: 'idle' });
  let worker: WorkerLike | null = null;
  let generation = 0;
  let ready = false;
  let everReady = false;
  let python = '';
  let loadStartedAt = 0;
  let stage = '';
  let restartReason: string | null = null;
  let tick: ReturnType<typeof setInterval> | null = null;
  let loadTimer: ReturnType<typeof setTimeout> | null = null;
  let nextId = 1;
  let inflight: Job | null = null;
  const queue: Job[] = [];

  const setStatus = (s: RuntimeStatus) => {
    status.value = s;
  };

  const clearLoadTimers = () => {
    if (tick !== null) clearInterval(tick);
    if (loadTimer !== null) clearTimeout(loadTimer);
    tick = null;
    loadTimer = null;
  };

  const clearJobTimers = (job: Job) => {
    if (job.ackTimer !== null) clearTimeout(job.ackTimer);
    if (job.watchdog !== null) clearTimeout(job.watchdog);
    job.ackTimer = null;
    job.watchdog = null;
  };

  const showLoading = () => {
    if (restartReason !== null) setStatus({ state: 'restarting', reason: restartReason });
    else setStatus({ state: 'loading', stage, elapsedMs: Math.max(0, Date.now() - loadStartedAt) });
  };

  const idleStatus = () => {
    if (!ready) return;
    const busy = (inflight?.busy ?? false) || queue.some((j) => j.busy);
    setStatus(busy ? { state: 'running', python } : { state: 'ready', python });
  };

  const killWorker = () => {
    generation++;
    clearLoadTimers();
    const w = worker;
    worker = null;
    ready = false;
    if (w) {
      w.onmessage = null;
      w.onerror = null;
      try {
        w.terminate();
      } catch {
        /* already gone */
      }
    }
  };

  const spawn = (reason: string | null) => {
    killWorker();
    const gen = generation;
    restartReason = reason;
    stage = 'Downloading Python';
    loadStartedAt = Date.now();
    let w: WorkerLike;
    try {
      w = makeWorker();
    } catch (e) {
      loadFailed(`Python could not be started in this browser (${e instanceof Error ? e.message : String(e)}).`);
      return;
    }
    worker = w;
    w.onmessage = (ev: MessageEvent) => {
      if (gen === generation) onMessage(ev.data as WorkerToClient);
    };
    w.onerror = (ev: ErrorEvent) => {
      if (gen !== generation) return;
      ev?.preventDefault?.();
      const detail = ev?.message ? ` (${ev.message})` : '';
      if (ready) hardStop(crashKind(ev?.message), `The Python worker stopped${detail}.`);
      else loadFailed(`Python could not be started${detail}.`);
    };
    showLoading();
    tick = setInterval(() => {
      if (gen === generation && !ready && restartReason === null) showLoading();
    }, tickMs);
    loadTimer = setTimeout(() => {
      if (gen === generation && !ready) loadFailed('Python took too long to start. Check your internet connection and try again.');
    }, loadTimeoutMs);
  };

  const loadFailed = (message: string) => {
    killWorker();
    restartReason = null;
    if (inflight) {
      clearJobTimers(inflight);
      queue.unshift(inflight);
      inflight = null;
    }
    const pending = queue.splice(0);
    setStatus({ state: 'error', message });
    for (const job of pending) {
      clearJobTimers(job);
      job.reject(new Error(message));
    }
  };

  /** Watchdog expiry, worker crash or a requested restart: resolve the in-flight request, then respawn. */
  const hardStop = (kind: StopKind, reason: string | null) => {
    const job = inflight;
    inflight = null;
    if (job) {
      clearJobTimers(job);
      job.resolve(job.stopped(kind, Date.now() - job.startedAt));
    }
    spawn(reason);
  };

  const onMessage = (msg: WorkerToClient) => {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.type) {
      case 'status':
        if (!ready) {
          stage = msg.stage;
          showLoading();
        }
        return;
      case 'ready':
        clearLoadTimers();
        ready = true;
        everReady = true;
        restartReason = null;
        python = msg.python;
        idleStatus();
        pump();
        return;
      case 'loadError':
        loadFailed(msg.message);
        return;
      case 'started': {
        const job = inflight;
        if (!job || job.id !== msg.id) return;
        if (job.ackTimer !== null) clearTimeout(job.ackTimer);
        job.ackTimer = null;
        job.startedAt = Date.now();
        job.watchdog = setTimeout(() => {
          if (inflight === job) hardStop('timeout', 'Your code ran too long');
        }, job.watchdogMs);
        return;
      }
      case 'result': {
        const job = inflight;
        if (!job || job.id !== msg.id) return;
        clearJobTimers(job);
        inflight = null;
        if (msg.ok) {
          try {
            job.resolve(job.finish(msg.data));
          } catch (e) {
            job.reject(e instanceof Error ? e : new Error(String(e)));
          }
        } else {
          job.reject(new Error(msg.error));
        }
        idleStatus();
        pump();
        return;
      }
      case 'fatal':
        if (!ready) loadFailed(`Python could not be started (${msg.message}).`);
        else hardStop(crashKind(msg.message), 'Python crashed');
        return;
    }
  };

  const pump = () => {
    if (!ready || !worker || inflight || queue.length === 0) return;
    const job = queue.shift()!;
    inflight = job;
    job.startedAt = Date.now();
    idleStatus();
    job.ackTimer = setTimeout(() => {
      if (inflight === job && job.watchdog === null) hardStop('crash', 'Python stopped responding');
    }, ackTimeoutMs);
    try {
      worker.postMessage({ id: job.id, op: job.op, payload: job.payload } as ClientToWorker);
    } catch (e) {
      clearJobTimers(job);
      inflight = null;
      job.reject(e instanceof Error ? e : new Error(String(e)));
      idleStatus();
      pump();
    }
  };

  const warmUp = () => {
    if (worker) return;
    spawn(null);
  };

  const request = <T>(op: WorkerOp, payload: unknown, watchdogMs: number, busy: boolean, finish: (data: unknown) => T, stopped: (kind: StopKind, elapsedMs: number) => T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const job: Job = {
        id: nextId++, op, payload, watchdogMs, busy, finish, stopped,
        resolve: resolve as (v: unknown) => void, reject,
        startedAt: 0, ackTimer: null, watchdog: null,
      };
      queue.push(job);
      if (!worker) spawn(null); // first use, or a retry after a load failure
      else if (ready) {
        idleStatus();
        pump();
      }
    });

  const run = (req: RunRequest): Promise<RunResult> =>
    request<RunResult>('run', req, runWatchdogMs(req), true,
      (data) => {
        const r = parseData<RunResult>(data);
        withMistakes(r.error);
        return r;
      },
      (kind, elapsedMs) => ({ stdout: '', error: stopError(kind), timedOut: kind === 'timeout' || kind === 'restart', outputTruncated: false, durationMs: elapsedMs }));

  const runTests = (req: TestsRequest): Promise<TestsResult> =>
    request<TestsResult>('tests', req, testsWatchdogMs(req), true,
      (data) => annotateTests(parseData<TestsResult>(data)),
      (kind) => ({ topLevelError: stopError(kind), outcomes: [], flags: [], ruleViolations: [], passed: 0, total: Array.isArray(req.tests) ? req.tests.length : 0 }));

  const analyze = (code: string): Promise<{ syntaxError?: PyError; flags: AstFinding[] }> =>
    request<{ syntaxError?: PyError; flags: AstFinding[] }>('analyze', { code }, ANALYZE_WATCHDOG_MS, false,
      (data) => {
        const r = parseData<{ syntaxError?: PyError; flags: AstFinding[] }>(data);
        withMistakes(r.syntaxError);
        if (!Array.isArray(r.flags)) r.flags = [];
        return r;
      },
      () => ({ flags: [] }));

  const pair = (req: PairRequest): Promise<PairResult> =>
    request<PairResult>('pair', req, PAIR_WATCHDOG_MS, true,
      (data) => parseData<PairResult>(data),
      (kind) => {
        const text = kind === 'stack' || kind === 'crash' ? 'crashed Python' : 'did not finish in time';
        return { validArgs: true, differs: false, refResult: text, bugResult: text };
      });

  // Before Python was ever ready (a retry after a load failure) the pill shows the loading stages instead.
  const restart = (reason: string) => hardStop('restart', everReady ? reason || 'Restarting Python' : null);

  return { status, warmUp, run, runTests, analyze, pair, restart };
}
