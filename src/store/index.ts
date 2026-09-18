// Store: append-only event log, drafts and scratch files in IndexedDB; settings in localStorage.
import { signal } from '@preact/signals';
import type { ReadonlySignal } from '@preact/signals';
import { DEFAULT_SETTINGS } from '../engine/types.ts';
import type { AppEvent, NewEvent, Settings } from '../engine/types.ts';
import { IdbBackend, MemoryBackend, openDatabase } from './idb.ts';
import type { Backend } from './idb.ts';
import type { ExportFile, ScratchFile, Snapshot, Store } from './types.ts';
import { ImportError, sanitizeExport, settingsFrom } from './validate.ts';

export { ImportError };

export const DB_NAME = 'pyladder';
/** Every key PyLadder puts in localStorage starts with this. */
export const LOCAL_PREFIX = 'pyladder:';
export const SESSION_KEY = 'pyladder:session';
export const SETTINGS_KEY = 'pyladder:settings';
export const CHANNEL_NAME = 'pyladder';
/** A new session starts after 30 minutes without activity. */
export const SESSION_IDLE_MS = 30 * 60_000;

/**
 * The only localStorage key a reset keeps: the settings (the reset dialog promises to keep the theme, and
 * `resetAll` rewrites the rest of that object with the defaults). Everything else under `pyladder:` goes, including
 * keys other screens write directly: in-progress tests, test setup, filters, Playground state, report range.
 */
const KEEP_ON_RESET = new Set<string>([SETTINGS_KEY]);

/**
 * A test screen saves its progress when it unmounts and up to a second after the last answer, so a test that was
 * running when the reset started can write its key back just after the sweep. Re-sweeping over this window stops that.
 */
export const RESET_SWEEP_MS = 2000;
const RESET_SWEEP_AT = [50, 250, 600, 1200, RESET_SWEEP_MS];

/** False when IndexedDB is unavailable (for example some private browsing modes): progress lasts only until the tab closes. */
const storageAvailableSignal = signal(true);
export const storageAvailable: ReadonlySignal<boolean> = storageAvailableSignal;

export interface StoreOptions {
  /** IndexedDB database name. Default 'pyladder'. */
  dbName?: string;
  /** IndexedDB factory. Default globalThis.indexedDB; null forces the in-memory fallback. */
  indexedDB?: IDBFactory | null;
  /** Key/value storage for settings and the session marker. Default localStorage (in-memory if unavailable). */
  storage?: (Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & Partial<Pick<Storage, 'key' | 'length'>>) | null;
  /** BroadcastChannel name for other tabs; null disables. Default 'pyladder'. */
  channelName?: string | null;
  /** Clock, for tests. */
  now?: () => number;
  /** Draft autosave delay. Default 500 ms. */
  snapshotDelayMs?: number;
  /** Give up on IndexedDB after this long and use memory. Default 10 s. */
  openTimeoutMs?: number;
}

export type PyLadderStore = Store & {
  /** False when data is kept in memory only. */
  readonly persistent: ReadonlySignal<boolean>;
  /** Write pending drafts now and wait for every queued write to finish. */
  flush(): Promise<void>;
  /** Close the database and channel (tests, teardown). */
  close(): void;
};

type KV = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & Partial<Pick<Storage, 'key' | 'length'>>;

function memoryKV(): KV {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() {
      return m.size;
    },
  };
}

/** Every `pyladder:` key currently in the storage. Empty when the storage cannot be enumerated. */
function pyladderKeys(kv: KV): string[] {
  const out: string[] = [];
  try {
    if (typeof kv.key !== 'function' || typeof kv.length !== 'number') return out;
    for (let i = 0; i < kv.length; i++) {
      const k = kv.key(i);
      if (k !== null && k.startsWith(LOCAL_PREFIX)) out.push(k);
    }
  } catch {
    // storage blocked mid-flight
  }
  return out;
}

function defaultKV(): KV {
  try {
    const ls = (globalThis as { localStorage?: Storage }).localStorage;
    if (ls) {
      const probe = '__pyladder_probe__';
      ls.setItem(probe, '1');
      ls.removeItem(probe);
      return ls;
    }
  } catch {
    // localStorage blocked (privacy settings) or absent
  }
  return memoryKV();
}

function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') {
    try {
      return c.randomUUID();
    } catch {
      // not a secure context
    }
  }
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readJSON(kv: KV, key: string): unknown {
  try {
    const raw = kv.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(kv: KV, key: string, value: unknown) {
  try {
    kv.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('PyLadder: could not save to localStorage', err);
  }
}

function readSession(kv: KV): { id: string; lastTs: number } | null {
  const s = readJSON(kv, SESSION_KEY) as { id?: unknown; lastTs?: unknown } | null;
  if (s && typeof s.id === 'string' && s.id && typeof s.lastTs === 'number' && Number.isFinite(s.lastTs)) return { id: s.id, lastTs: s.lastTs };
  return null;
}

function sortEvents(list: AppEvent[]): AppEvent[] {
  return list.map((e, i) => [e, i] as const).sort((a, b) => a[0].ts - b[0].ts || a[1] - b[1]).map(([e]) => e);
}

type ChannelMsg = { kind: 'events'; events: AppEvent[] } | { kind: 'reload' } | { kind: 'reset' };

export function createStore(options: StoreOptions = {}): PyLadderStore {
  const now = options.now ?? (() => Date.now());
  const kv: KV = options.storage ?? defaultKV();
  const dbName = options.dbName ?? DB_NAME;
  const snapshotDelay = options.snapshotDelayMs ?? 500;
  const factory = options.indexedDB === undefined ? (globalThis as { indexedDB?: IDBFactory }).indexedDB ?? null : options.indexedDB;

  const events = signal<readonly AppEvent[]>([]);
  const settings = signal<Settings>(settingsFrom(readJSON(kv, SETTINGS_KEY)));
  const persistent = signal(true);
  const eids = new Set<string>();
  let backend: Backend | null = null;
  let closed = false;

  // ---------------- serialised backend access ----------------
  let resolveBackend!: (b: Backend) => void;
  const backendReady = new Promise<Backend>((r) => (resolveBackend = r));
  let chain: Promise<unknown> = backendReady;

  /** Runs op after every previously queued operation, so writes keep their order. Errors are logged, not thrown. */
  function enqueue<T>(op: (b: Backend) => Promise<T>, fallback: T): Promise<T> {
    const p = chain.then(async () => {
      const b = backend ?? (await backendReady);
      try {
        return await op(b);
      } catch (err) {
        console.error('PyLadder: storage operation failed', err);
        return fallback;
      }
    });
    chain = p;
    return p;
  }

  /** Like enqueue, but rejects on failure (import, reset). */
  function enqueueStrict<T>(op: (b: Backend) => Promise<T>): Promise<T> {
    const p = chain.then(async () => op(backend ?? (await backendReady)));
    chain = p.catch(() => undefined);
    return p;
  }

  function useMemory(reason: string, err?: unknown) {
    console.warn(`PyLadder: ${reason}. Progress will only last until this tab is closed.`, err ?? '');
    persistent.value = false;
    storageAvailableSignal.value = false;
  }

  // ---------------- events signal helpers ----------------
  function setEvents(list: AppEvent[]) {
    eids.clear();
    for (const e of list) eids.add(e.eid);
    events.value = list;
  }

  function mergeIntoSignal(incoming: readonly AppEvent[]): AppEvent[] {
    const fresh = incoming.filter((e) => !eids.has(e.eid));
    if (fresh.length === 0) return [];
    const cur = events.value;
    const lastTs = cur.length ? cur[cur.length - 1].ts : -Infinity;
    const inOrder = fresh.every((e, i) => e.ts >= (i === 0 ? lastTs : fresh[i - 1].ts));
    const next = inOrder ? [...cur, ...fresh] : sortEvents([...cur, ...fresh]);
    for (const e of fresh) eids.add(e.eid);
    events.value = next;
    return fresh;
  }

  // ---------------- other tabs ----------------
  let channel: BroadcastChannel | null = null;
  const channelName = options.channelName === undefined ? CHANNEL_NAME : options.channelName;
  if (channelName && typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(channelName);
      (channel as unknown as { unref?: () => void }).unref?.();
      channel.onmessage = (ev: MessageEvent) => {
        const msg = ev.data as ChannelMsg | null;
        if (!msg || closed) return;
        if (msg.kind === 'events' && Array.isArray(msg.events)) mergeIntoSignal(msg.events);
        else if (msg.kind === 'reset') {
          // Another tab deleted everything: drop this tab's local keys too, and keep sweeping in case a test
          // running in THIS tab writes its progress back.
          sweepLocalData();
          void reloadEvents();
        } else if (msg.kind === 'reload') void reloadEvents();
      };
    } catch {
      channel = null;
    }
  }
  function broadcast(msg: ChannelMsg) {
    if (!channel || closed) return;
    try {
      channel.postMessage(msg);
    } catch {
      // ignore: other tabs will catch up on reload
    }
  }

  // ---------------- clearing local keys after a reset ----------------
  let sweepTimers: ReturnType<typeof setTimeout>[] = [];

  function stopSweep() {
    for (const t of sweepTimers) clearTimeout(t);
    sweepTimers = [];
  }

  /** Remove every `pyladder:` key except the settings (and, after the first pass, the session marker). */
  function clearLocalData(keepSession: boolean) {
    for (const k of pyladderKeys(kv)) {
      if (KEEP_ON_RESET.has(k) || (keepSession && k === SESSION_KEY)) continue;
      try {
        kv.removeItem(k);
      } catch {
        // storage blocked: nothing was stored to begin with
      }
    }
  }

  /** Clear now, then again over the next couple of seconds so a test that was running cannot save its key back. */
  function sweepLocalData() {
    stopSweep();
    clearLocalData(false);
    for (const ms of RESET_SWEEP_AT) {
      const t = setTimeout(() => {
        if (!closed) clearLocalData(true);
      }, ms);
      (t as unknown as { unref?: () => void }).unref?.();
      sweepTimers.push(t);
    }
  }

  async function reloadEvents() {
    const loaded = await enqueue((b) => b.loadEvents(), null);
    if (loaded) setEvents(sortEvents(loaded));
  }

  // ---------------- open the database ----------------
  const ready: Promise<void> = (async () => {
    let b: Backend;
    if (!factory) {
      useMemory('IndexedDB is not available in this browser');
      b = new MemoryBackend();
    } else {
      try {
        const db = await openDatabase(factory, dbName, options.openTimeoutMs ?? 10_000);
        const idb = new IdbBackend(db);
        const dropToMemory = (reason: string) => {
          if (backend !== idb || closed) return;
          backend = new MemoryBackend();
          useMemory(reason);
        };
        db.onversionchange = () => {
          db.close();
          dropToMemory('PyLadder was updated in another tab; reload this tab to keep saving');
        };
        db.onclose = () => dropToMemory('The browser closed the progress database');
        b = idb;
      } catch (err) {
        useMemory('Could not open IndexedDB', err);
        b = new MemoryBackend();
      }
    }
    if (closed) b.close();
    let loaded: AppEvent[] = [];
    try {
      loaded = await b.loadEvents();
    } catch (err) {
      console.error('PyLadder: could not load saved progress', err);
    }
    // Keep anything appended before the database was ready.
    const loadedIds = new Set(loaded.map((l) => l.eid));
    const pending = events.value.filter((e) => !loadedIds.has(e.eid));
    setEvents(sortEvents([...loaded, ...pending]));
    backend = b;
    resolveBackend(b);
    await chain.catch(() => undefined);
  })();

  // ---------------- sessions ----------------
  let lastAssignedTs = 0;
  let sessionId: string;
  let lastActivity: number;
  {
    const t = now();
    const stored = readSession(kv);
    if (stored && t - stored.lastTs <= SESSION_IDLE_MS && stored.lastTs - t <= SESSION_IDLE_MS) {
      sessionId = stored.id;
      lastActivity = stored.lastTs;
    } else {
      sessionId = uuid();
      lastActivity = t;
      writeJSON(kv, SESSION_KEY, { id: sessionId, lastTs: t });
      appendRaw({ type: 'session_start' }, t);
    }
  }

  function appendRaw(e: NewEvent, t: number): AppEvent {
    const ts = Math.max(t, lastAssignedTs + 1);
    lastAssignedTs = ts;
    const ev = { ...e, eid: uuid(), v: 1, ts, sessionId } as AppEvent;
    eids.add(ev.eid);
    events.value = [...events.value, ev];
    lastActivity = t;
    writeJSON(kv, SESSION_KEY, { id: sessionId, lastTs: t });
    void enqueue((b) => b.putEvents([ev]), undefined).then(() => broadcast({ kind: 'events', events: [ev] }));
    return ev;
  }

  function append(e: NewEvent): AppEvent {
    const t = now();
    const stored = readSession(kv);
    if (stored && stored.id !== sessionId && t - stored.lastTs <= SESSION_IDLE_MS) {
      // Another tab started a newer session: join it.
      sessionId = stored.id;
      lastActivity = stored.lastTs;
    } else if (t - Math.max(lastActivity, stored?.id === sessionId ? stored.lastTs : 0) > SESSION_IDLE_MS) {
      sessionId = uuid();
      appendRaw({ type: 'session_start' }, t);
    }
    return appendRaw(e, t);
  }

  // ---------------- settings ----------------
  function updateSettings(patch: Partial<Settings>) {
    const next = { ...settings.value, ...patch };
    settings.value = next;
    writeJSON(kv, SETTINGS_KEY, next);
  }

  const win = typeof window !== 'undefined' && typeof window.addEventListener === 'function' ? window : null;
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === SETTINGS_KEY) settings.value = settingsFrom(readJSON(kv, SETTINGS_KEY));
  };

  // ---------------- snapshots ----------------
  const pendingSnapshots = new Map<string, Snapshot>();
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null;

  function flushSnapshots(): Promise<void> {
    if (snapshotTimer !== null) {
      clearTimeout(snapshotTimer);
      snapshotTimer = null;
    }
    if (pendingSnapshots.size === 0) return Promise.resolve();
    const batch = [...pendingSnapshots.values()];
    pendingSnapshots.clear();
    return enqueue(async (b) => {
      try {
        await b.putSnapshots(batch);
      } catch {
        // One draft that cannot be stored (e.g. not cloneable) must not block the rest.
        for (const s of batch) {
          try {
            await b.putSnapshots([s]);
          } catch (err) {
            console.warn(`PyLadder: could not save the draft for ${s.qid}`, err);
          }
        }
      }
    }, undefined);
  }

  function saveSnapshot(qid: string, draft: unknown) {
    pendingSnapshots.set(qid, { qid, draft, updatedAt: now() });
    if (snapshotTimer !== null) clearTimeout(snapshotTimer);
    snapshotTimer = setTimeout(() => {
      snapshotTimer = null;
      void flushSnapshots();
    }, snapshotDelay);
  }

  async function getSnapshot(qid: string): Promise<Snapshot | undefined> {
    const pending = pendingSnapshots.get(qid);
    if (pending) return pending;
    return enqueue((b) => b.getSnapshot(qid), undefined);
  }

  const onHide = () => void flushSnapshots();
  const onVisibility = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') void flushSnapshots();
  };
  if (win) {
    win.addEventListener('storage', onStorage);
    win.addEventListener('pagehide', onHide);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
  }

  // ---------------- scratch ----------------
  const listScratch = () => enqueue(async (b) => (await b.allScratch()).sort((a, c) => c.updatedAt - a.updatedAt), [] as ScratchFile[]);
  const saveScratch = (file: ScratchFile) => enqueue((b) => b.putScratch([file]), undefined);
  const deleteScratch = (id: string) => enqueue((b) => b.deleteScratch(id), undefined);

  // ---------------- export / import / reset ----------------
  async function flush(): Promise<void> {
    await ready;
    await flushSnapshots();
    await enqueue(async () => undefined, undefined);
  }

  async function exportAll(): Promise<ExportFile> {
    await flush();
    const [snapshots, scratch] = await Promise.all([
      enqueue((b) => b.allSnapshots(), [] as Snapshot[]),
      enqueue((b) => b.allScratch(), [] as ScratchFile[]),
    ]);
    const exportedAt = now();
    const file: ExportFile = {
      format: 'pyladder-export', version: 1, exportedAt, settings: { ...settings.value, lastExportTs: exportedAt },
      events: [...events.value], snapshots, scratch,
    };
    updateSettings({ lastExportTs: exportedAt });
    return file;
  }

  async function importAll(file: ExportFile, mode: 'merge' | 'replace'): Promise<{ added: number }> {
    const clean = sanitizeExport(file);
    await ready;
    if (mode === 'replace') pendingSnapshots.clear();
    else await flushSnapshots();
    const added = await enqueueStrict(async (b) => {
      if (mode === 'replace') {
        await b.clearAll();
        await b.putEvents(clean.events);
        await b.putSnapshots(clean.snapshots);
        await b.putScratch(clean.scratch);
        setEvents(sortEvents([...clean.events]));
        return clean.events.length;
      }
      const fresh = clean.events.filter((e) => !eids.has(e.eid));
      await b.putEvents(fresh);
      const snaps: Snapshot[] = [];
      for (const s of clean.snapshots) {
        const existing = await b.getSnapshot(s.qid);
        if (!existing || existing.updatedAt < s.updatedAt) snaps.push(s);
      }
      await b.putSnapshots(snaps);
      const scratchNow = new Map((await b.allScratch()).map((f) => [f.id, f]));
      await b.putScratch(clean.scratch.filter((f) => !scratchNow.has(f.id) || scratchNow.get(f.id)!.updatedAt < f.updatedAt));
      mergeIntoSignal(fresh);
      return fresh.length;
    });
    if (mode === 'replace') updateSettings({ ...DEFAULT_SETTINGS, ...clean.settings });
    broadcast({ kind: 'reload' });
    return { added };
  }

  /**
   * Delete everything: the event log, drafts and Playground files in IndexedDB, and every `pyladder:` key in
   * localStorage (in-progress tests, test setup, topic filters, Playground state, report range - screens write those
   * directly). The only setting kept is the theme, as the reset dialog says. The session starts fresh on the next
   * event. A test still running when this ran cannot bring its key back: see `sweepLocalData`.
   */
  async function resetAll(): Promise<void> {
    await ready;
    pendingSnapshots.clear();
    if (snapshotTimer !== null) clearTimeout(snapshotTimer);
    snapshotTimer = null;
    await enqueueStrict((b) => b.clearAll());
    setEvents([]);
    const theme = settings.value.theme;
    sweepLocalData();
    updateSettings({ ...DEFAULT_SETTINGS, theme });
    // A brand-new session: the next event starts it, exactly as it would in a browser that had never seen PyLadder.
    sessionId = uuid();
    lastActivity = -Infinity;
    broadcast({ kind: 'reset' });
  }

  function close() {
    if (closed) return;
    closed = true;
    stopSweep();
    if (snapshotTimer !== null) clearTimeout(snapshotTimer);
    try {
      channel?.close();
    } catch {
      // ignore
    }
    if (win) {
      win.removeEventListener('storage', onStorage);
      win.removeEventListener('pagehide', onHide);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility);
    }
    void chain.then(() => backend?.close());
  }

  const store: PyLadderStore = {
    ready,
    events,
    settings,
    persistent,
    get sessionId() {
      return sessionId;
    },
    append,
    updateSettings,
    getSnapshot,
    saveSnapshot,
    listScratch,
    saveScratch,
    deleteScratch,
    exportAll,
    importAll,
    resetAll,
    flush,
    close,
  };
  return store;
}
