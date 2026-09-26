// Browser R client for STAT2402: owns the sandbox iframe, a serial request queue and the watchdog.
//
// R runs in public/r-sandbox.html, loaded with sandbox="allow-scripts" and no allow-same-origin, so the
// frame has an opaque origin and nothing R can reach there touches the app's storage (SECURITY.md). The
// console driver itself runs here, on the app side, and is the same one the verifier uses, so a student's
// run and a lesson's recorded output are produced the same way.
//
// Nothing loads until R is first needed: STAT2402 students pay for the download, CITS1401 students never do.
import { signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import HARNESS from './r/harness.R?raw';
import { RDriver } from './r/driver.ts';
import type { RConsole, RMessage, RRun, RTaskResult, RTest } from './r/driver.ts';
import type { RPackage } from './r/packages.ts';
import { installOrder, packagesUsed } from './r/packages.ts';
import { WEBR_URL } from './version.ts';

export type RState = 'idle' | 'loading' | 'ready' | 'running' | 'error';
export interface RStatus { state: RState; message?: string }

export interface RClient {
  status: Signal<RStatus>;
  /** Start downloading R in the background, so the first run does not wait for it. */
  warmUp(): void;
  run(code: string): Promise<RRun>;
  task(code: string, kind: 'function' | 'program', tests: readonly RTest[]): Promise<RTaskResult>;
}

/** The part of an iframe the client uses (a fake one is injected in tests). */
export interface FrameLike {
  post(message: unknown, transfer?: Transferable[]): void;
  /** Called with every message the frame sends. */
  onMessage: ((data: unknown) => void) | null;
  destroy(): void;
}

export interface RClientOptions {
  createFrame?: () => FrameLike;
  /** A pinned package's bytes. Defaults to fetching it from this app's own public/r-packages. */
  loadPackage?: (p: RPackage) => Promise<Uint8Array>;
  /** Downloading webR is tens of megabytes; on a slow connection it takes a while. */
  loadTimeoutMs?: number;
  runTimeoutMs?: number;
}

export const R_LOAD_TIMEOUT_MS = 120_000;
export const R_RUN_TIMEOUT_MS = 20_000;
/** Installing survival means fetching about 12 MB, so it gets its own clock rather than the run's. */
export const R_PACKAGE_TIMEOUT_MS = 180_000;
export const R_TIMEOUT_MESSAGE = 'Your code ran too long, so R was stopped. It will start again on your next run.';
export const R_CRASH_MESSAGE = 'R stopped unexpectedly. It will start again on your next run.';
export const R_LOAD_MESSAGE = 'R could not be loaded. Check your connection and try again.';

/** The real frame: hidden, sandboxed, and removed outright to stop R, which also ends its worker. */
function createIframe(): FrameLike {
  const el = document.createElement('iframe');
  el.setAttribute('sandbox', 'allow-scripts');
  el.setAttribute('title', 'R');
  el.setAttribute('aria-hidden', 'true');
  el.tabIndex = -1;
  el.hidden = true;
  el.src = `${import.meta.env.BASE_URL}r-sandbox.html`;
  const frame: FrameLike = {
    post: (message, transfer) => el.contentWindow?.postMessage(message, '*', transfer ?? []),
    onMessage: null,
    destroy: () => {
      window.removeEventListener('message', listen);
      el.remove();
    },
  };
  // The frame's origin is opaque, so its messages are recognised by where they come from, not by origin.
  const listen = (ev: MessageEvent) => {
    if (ev.source === el.contentWindow && el.contentWindow !== null) frame.onMessage?.(ev.data);
  };
  window.addEventListener('message', listen);
  document.body.appendChild(el);
  return frame;
}

interface Reply { plr: 1; id?: number; op?: string; ok?: boolean; value?: unknown }
const isReply = (v: unknown): v is Reply => !!v && typeof v === 'object' && (v as { plr?: unknown }).plr === 1;

/**
 * A pinned package from this app's own public/r-packages (same origin, so no CDN is involved), refused
 * unless it is byte for byte the file the lessons were verified with.
 */
async function fetchPinned(p: RPackage): Promise<Uint8Array> {
  const res = await fetch(`${import.meta.env.BASE_URL}r-packages/${p.file}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  const hex = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== p.sha256) throw new Error('the file does not match its pinned hash');
  return new Uint8Array(buf);
}

/** A stopped run, reported the way a run that stopped with an error is. */
function stopped(message: string): RRun {
  return { stdout: '', error: { type: 'Error', message, line: 0 } };
}

export function createRClient(opts: RClientOptions = {}): RClient {
  const makeFrame = opts.createFrame ?? createIframe;
  const loadPackage = opts.loadPackage ?? fetchPinned;
  const loadTimeout = opts.loadTimeoutMs ?? R_LOAD_TIMEOUT_MS;
  const runTimeout = opts.runTimeoutMs ?? R_RUN_TIMEOUT_MS;
  const status = signal<RStatus>({ state: 'idle' });

  let frame: FrameLike | null = null;
  let driver: Promise<RDriver> | null = null;
  let nextId = 1;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  // Every request goes through this chain: R has one console, and two runs typing into it at once would
  // interleave their output.
  let queue: Promise<unknown> = Promise.resolve();

  const teardown = (reason: string) => {
    frame?.destroy();
    frame = null;
    driver = null;
    for (const p of pending.values()) p.reject(new Error(reason));
    pending.clear();
  };

  const start = (): Promise<RDriver> => {
    if (driver) return driver;
    status.value = { state: 'loading', message: 'Starting R' };
    const f = makeFrame();
    frame = f;
    const loaded = new Promise<void>((resolve) => {
      f.onMessage = (data) => {
        if (!isReply(data)) return;
        if (data.op === 'loaded') {
          resolve();
          return;
        }
        if (typeof data.id !== 'number') return;
        const p = pending.get(data.id);
        if (!p) return;
        pending.delete(data.id);
        if (data.ok) p.resolve(data.value);
        else p.reject(new Error(typeof data.value === 'string' ? data.value : 'R request failed'));
      };
    });
    const ask = <T>(message: Record<string, unknown>, transfer?: Transferable[]): Promise<T> => new Promise<T>((resolve, reject) => {
      if (frame !== f) {
        reject(new Error('R was restarted'));
        return;
      }
      const id = nextId++;
      pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      f.post({ plr: 1, id, ...message }, transfer);
    });
    const con: RConsole = {
      write: (text) => ask<null>({ op: 'write', text }).then(() => undefined),
      readUntilPrompt: async () => {
        const batch = await ask<unknown>({ op: 'drain' });
        return Array.isArray(batch)
          ? batch.filter((m): m is RMessage => !!m && typeof m.type === 'string' && typeof m.data === 'string')
          : [];
      },
      evalString: async (code) => {
        const v = await ask<unknown>({ op: 'eval', code });
        return typeof v === 'string' ? v : '';
      },
      writeFile: async (path, bytes) => {
        // A copy of just these bytes, handed over rather than cloned: a package can be megabytes.
        const buf = bytes.slice().buffer;
        await ask<null>({ op: 'writeFile', path, bytes: buf }, [buf]);
      },
    };
    const boot = (async () => {
      await loaded;
      status.value = { state: 'loading', message: 'Downloading R' };
      await ask<null>({ op: 'init', base: WEBR_URL });
      const d = new RDriver(con, HARNESS, { loadPackage });
      await d.start();
      return d;
    })();
    // Cleared once start-up settles either way, so a finished start leaves no two-minute timer behind.
    let loadTimer: ReturnType<typeof setTimeout> | undefined;
    const timer = new Promise<never>((_, reject) => { loadTimer = setTimeout(() => reject(new Error('timed out')), loadTimeout); });
    const d = Promise.race([boot, timer]).finally(() => clearTimeout(loadTimer)).then(
      (ok) => {
        status.value = { state: 'ready' };
        return ok;
      },
      (err: Error) => {
        // The student sees the plain sentence; the cause goes to the console for whoever debugs it.
        console.warn(`R did not start: ${err.message}`);
        teardown(err.message);
        status.value = { state: 'error', message: R_LOAD_MESSAGE };
        throw new Error(R_LOAD_MESSAGE);
      },
    );
    driver = d;
    return d;
  };

  /**
   * Queue one job; a job still running after `runTimeout` stops R and reports that it did. Any package
   * the code asks for is installed first, on its own longer clock, so a slow download is not mistaken for
   * a program that never ends.
   */
  const job = <T>(work: (d: RDriver) => Promise<T>, onStop: (message: string) => T, codes: readonly (string | undefined)[]): Promise<T> => {
    const next = queue.then(async () => {
      let d: RDriver;
      try {
        d = await start();
      } catch (err) {
        return onStop((err as Error).message);
      }
      const needed = installOrder(packagesUsed(...codes)).map((p) => p.name);
      if (needed.length) {
        status.value = { state: 'running', message: `Loading ${needed.join(', ')}` };
        let pkgTimer: ReturnType<typeof setTimeout> | undefined;
        const late = new Promise<string>((resolve) => { pkgTimer = setTimeout(() => resolve('timed out'), R_PACKAGE_TIMEOUT_MS); });
        const why = await Promise.race([d.preparePackages(...codes), late]).finally(() => clearTimeout(pkgTimer));
        if (why === 'timed out') {
          teardown('package timed out');
          status.value = { state: 'idle' };
          return onStop(`${needed.join(', ')} took too long to load. Check your connection and try again.`);
        }
        // Any other failure is reported by the run itself, in R's words, as the driver sees it again.
      }
      status.value = { state: 'running' };
      let timer: ReturnType<typeof setTimeout> | undefined;
      const watchdog = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), runTimeout); });
      try {
        const r = await Promise.race([work(d), watchdog]);
        if (r === 'timeout') {
          teardown('timed out');
          status.value = { state: 'idle' };
          return onStop(R_TIMEOUT_MESSAGE);
        }
        status.value = { state: 'ready' };
        return r;
      } catch {
        teardown('crashed');
        status.value = { state: 'idle' };
        return onStop(R_CRASH_MESSAGE);
      } finally {
        clearTimeout(timer);
      }
    });
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    status,
    warmUp: () => {
      if (!driver) start().catch(() => undefined);
    },
    run: (code) => job((d) => d.runScript(code), stopped, [code]),
    task: (code, kind, tests) => job(
      (d) => d.task(code, kind, tests),
      (message) => ({
        run: stopped(message),
        outcomes: tests.map((t) => ({ id: t.id, label: t.label, hidden: t.hidden, pass: false, error: message })),
      }),
      [code, ...tests.flatMap((t) => [t.setup, t.call, t.expect])],
    ),
  };
}
