import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../engine/types.ts';
import type { AppEvent } from '../engine/types.ts';
import { ImportError, SESSION_KEY, SETTINGS_KEY, createStore, storageAvailable } from './index.ts';
import type { PyLadderStore, StoreOptions } from './index.ts';
import type { ExportFile } from './types.ts';

const MIN = 60_000;
let n = 0;
const open: PyLadderStore[] = [];

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    map: m,
  };
}

function clock(start = Date.UTC(2026, 8, 17, 9, 0, 0)) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

function make(opts: StoreOptions): PyLadderStore {
  const s = createStore({ channelName: null, ...opts });
  open.push(s);
  return s;
}

async function until(pred: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 5));
  }
}

afterEach(() => {
  while (open.length) open.pop()!.close();
});

const attemptPayload = (qid: string) => ({
  type: 'attempt' as const, qid, topicId: 'variables-expressions' as const, format: 'mcq' as const, diff: 'easy' as const, mode: 'practice' as const,
  checkNo: 1, correct: true, score: 1, credit: 1, hintTier: 0 as const, revealed: false, timeMs: 1000, mistakes: [],
});

describe('store: events', () => {
  it('append fills eid/v/ts/sessionId, updates the signal synchronously, and survives a reload in order', async () => {
    const dbName = `db-${++n}`;
    const storage = memStorage();
    const c = clock();
    const a = make({ dbName, storage, now: c.now });
    await a.ready;
    expect(a.events.value.map((e) => e.type)).toEqual(['session_start']);

    const e1 = a.append({ type: 'topic_open', topicId: 'strings' });
    expect(a.events.value).toHaveLength(2);
    expect(e1).toMatchObject({ type: 'topic_open', v: 1, sessionId: a.sessionId });
    expect(e1.eid).toMatch(/^[0-9a-f-]{36}$/);
    // Many appends in the same millisecond keep their order.
    for (let i = 0; i < 20; i++) a.append(attemptPayload(`t01-s1-q${i}`));
    const ids = a.events.value.map((e) => e.eid);
    const ts = a.events.value.map((e) => e.ts);
    expect(new Set(ts).size).toBe(ts.length);
    await a.flush();
    a.close();

    c.advance(MIN);
    const b = make({ dbName, storage, now: c.now });
    await b.ready;
    expect(b.events.value.map((e) => e.eid)).toEqual(ids);
    expect(b.sessionId).toBe(a.sessionId);
  });

  it('events appended before ready are kept and written', async () => {
    const dbName = `db-${++n}`;
    const storage = memStorage();
    const a = make({ dbName, storage });
    a.append({ type: 'topic_open', topicId: 'strings' });
    await a.ready;
    expect(a.events.value.map((e) => e.type)).toEqual(['session_start', 'topic_open']);
    await a.flush();
    a.close();
    const b = make({ dbName, storage });
    await b.ready;
    expect(b.events.value.map((e) => e.type)).toEqual(['session_start', 'topic_open']);
  });
});

describe('store: sessions', () => {
  it('reuses the session within 30 minutes and starts a new one after', async () => {
    const dbName = `db-${++n}`;
    const storage = memStorage();
    const c = clock();
    const a = make({ dbName, storage, now: c.now });
    await a.ready;
    a.append({ type: 'topic_open', topicId: 'strings' });
    await a.flush();
    a.close();
    const stored = JSON.parse(storage.getItem(SESSION_KEY)!);
    expect(stored).toEqual({ id: a.sessionId, lastTs: c.now() });

    c.advance(29 * MIN);
    const b = make({ dbName, storage, now: c.now });
    await b.ready;
    expect(b.sessionId).toBe(a.sessionId);
    expect(b.events.value.filter((e) => e.type === 'session_start')).toHaveLength(1);
    b.append({ type: 'topic_open', topicId: 'recursion' });
    await b.flush();
    b.close();

    c.advance(31 * MIN);
    const d = make({ dbName, storage, now: c.now });
    await d.ready;
    expect(d.sessionId).not.toBe(a.sessionId);
    const starts = d.events.value.filter((e) => e.type === 'session_start');
    expect(starts).toHaveLength(2);
    expect(starts[1].sessionId).toBe(d.sessionId);
  });

  it('a tab left open rolls over to a new session after 30 idle minutes', async () => {
    const c = clock();
    const s = make({ dbName: `db-${++n}`, storage: memStorage(), now: c.now });
    await s.ready;
    const first = s.sessionId;
    s.append({ type: 'topic_open', topicId: 'strings' });
    c.advance(45 * MIN);
    const e = s.append({ type: 'topic_open', topicId: 'lists-tuples' });
    expect(s.sessionId).not.toBe(first);
    expect(e.sessionId).toBe(s.sessionId);
    const types = s.events.value.map((x) => `${x.type}:${x.sessionId === first ? 'old' : 'new'}`);
    expect(types).toEqual(['session_start:old', 'topic_open:old', 'session_start:new', 'topic_open:new']);
  });
});

describe('store: settings, snapshots, scratch', () => {
  it('settings merge over defaults and persist to localStorage', async () => {
    const storage = memStorage();
    storage.setItem(SETTINGS_KEY, JSON.stringify({ theme: 'dark', editorFontSize: 'huge', bogus: 1 }));
    const s = make({ dbName: `db-${++n}`, storage });
    expect(s.settings.value).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    s.updateSettings({ unlockAll: true });
    expect(s.settings.value.unlockAll).toBe(true);
    expect(JSON.parse(storage.getItem(SETTINGS_KEY)!)).toMatchObject({ theme: 'dark', unlockAll: true });
    storage.setItem(SETTINGS_KEY, '{not json');
    const t = make({ dbName: `db-${++n}`, storage });
    expect(t.settings.value).toEqual(DEFAULT_SETTINGS);
  });

  it('snapshots are debounced, readable before the write, and persisted', async () => {
    const dbName = `db-${++n}`;
    const storage = memStorage();
    const a = make({ dbName, storage, snapshotDelayMs: 20 });
    await a.ready;
    a.saveSnapshot('t01-s1-q1', { code: 'x = 1' });
    a.saveSnapshot('t01-s1-q1', { code: 'x = 2' });
    expect((await a.getSnapshot('t01-s1-q1'))?.draft).toEqual({ code: 'x = 2' });
    await new Promise((r) => setTimeout(r, 60));
    await a.flush();
    a.close();
    const b = make({ dbName, storage });
    await b.ready;
    expect((await b.getSnapshot('t01-s1-q1'))?.draft).toEqual({ code: 'x = 2' });
    expect(await b.getSnapshot('nope')).toBeUndefined();
  });

  it('scratch files save, list newest first and delete', async () => {
    const s = make({ dbName: `db-${++n}`, storage: memStorage() });
    await s.ready;
    await s.saveScratch({ id: 'a', name: 'a.py', code: 'print(1)', stdin: '', updatedAt: 1 });
    await s.saveScratch({ id: 'b', name: 'b.py', code: 'print(2)', stdin: '3', updatedAt: 2 });
    expect((await s.listScratch()).map((f) => f.id)).toEqual(['b', 'a']);
    await s.deleteScratch('b');
    expect((await s.listScratch()).map((f) => f.id)).toEqual(['a']);
  });
});

describe('store: export and import', () => {
  async function seeded(topicId: 'strings' | 'recursion') {
    const s = make({ dbName: `db-${++n}`, storage: memStorage(), snapshotDelayMs: 10 });
    await s.ready;
    s.append({ type: 'topic_open', topicId });
    s.append(attemptPayload(`${topicId}-q`));
    s.saveSnapshot('t05-s1-q1', { code: topicId });
    await s.saveScratch({ id: topicId, name: `${topicId}.py`, code: 'pass', stdin: '', updatedAt: 5 });
    await s.flush();
    return s;
  }

  it('exports everything with format and version', async () => {
    const a = await seeded('strings');
    const file = await a.exportAll();
    expect(file).toMatchObject({ format: 'pyladder-export', version: 1 });
    expect(file.events).toHaveLength(3);
    expect(file.snapshots).toEqual([expect.objectContaining({ qid: 't05-s1-q1', draft: { code: 'strings' } })]);
    expect(file.scratch.map((f) => f.id)).toEqual(['strings']);
    expect(a.settings.value.lastExportTs).toBe(file.exportedAt);
    // survives JSON
    expect(JSON.parse(JSON.stringify(file)).events).toHaveLength(3);
  });

  it('merge dedupes by eid and keeps newer drafts', async () => {
    const a = await seeded('strings');
    const b = await seeded('recursion');
    const file = JSON.parse(JSON.stringify(await a.exportAll())) as ExportFile;
    const before = b.events.value.length;
    expect(await b.importAll(file, 'merge')).toEqual({ added: 3 });
    expect(b.events.value).toHaveLength(before + 3);
    const sorted = [...b.events.value].sort((x, y) => x.ts - y.ts);
    expect(b.events.value.map((e) => e.eid)).toEqual(sorted.map((e) => e.eid));
    expect(await b.importAll(file, 'merge')).toEqual({ added: 0 });
    // b's draft is newer or equal; an older imported draft must not overwrite it
    const older = { ...file, snapshots: [{ qid: 't05-s1-q1', draft: { code: 'old' }, updatedAt: 1 }] };
    await b.importAll(older, 'merge');
    expect((await b.getSnapshot('t05-s1-q1'))?.draft).toEqual({ code: 'recursion' });
    expect((await b.listScratch()).map((f) => f.id).sort()).toEqual(['recursion', 'strings']);
  });

  it('replace clears existing data first', async () => {
    const a = await seeded('strings');
    const b = await seeded('recursion');
    const file = await a.exportAll();
    expect(await b.importAll(file, 'replace')).toEqual({ added: 3 });
    expect(b.events.value.map((e) => e.eid)).toEqual(file.events.map((e) => e.eid));
    expect((await b.listScratch()).map((f) => f.id)).toEqual(['strings']);
    expect((await b.getSnapshot('t05-s1-q1'))?.draft).toEqual({ code: 'strings' });
  });

  it('rejects files that are not exports and sanitises bad entries', async () => {
    const s = make({ dbName: `db-${++n}`, storage: memStorage() });
    await s.ready;
    await expect(s.importAll({ format: 'something-else' } as unknown as ExportFile, 'merge')).rejects.toBeInstanceOf(ImportError);
    await expect(s.importAll({ format: 'pyladder-export', version: 2, events: [] } as unknown as ExportFile, 'merge')).rejects.toThrow(/different PyLadder version/);
    await expect(s.importAll({ format: 'pyladder-export', version: 1 } as unknown as ExportFile, 'merge')).rejects.toThrow(/damaged/);

    const good: AppEvent = { eid: 'good-1', v: 1, ts: 1000, sessionId: 'old', type: 'self_explain', qid: 't01-s1-q1', text: 'x'.repeat(10_000) };
    const file = {
      format: 'pyladder-export', version: 1, exportedAt: 1, settings: { theme: 'purple' },
      events: [
        good,
        { eid: 'bad-1', v: 1, ts: 1001, sessionId: 'old', type: 'attempt', qid: 't01-s1-q1' },
        { eid: 'bad-2', v: 1, ts: 1002, sessionId: 'old', type: 'topic_open', topicId: 'not-a-topic' },
        { eid: 'good-2', v: 1, ts: 1003, sessionId: 'old', type: 'mistake', qid: null, topicId: null, mistake: 'name_typo', channel: 'runtime', extra: '<script>' },
        'nonsense',
      ],
      snapshots: [{ qid: 'q', draft: { a: 1 }, updatedAt: 3 }, { nope: true }],
      scratch: [{ id: 's', name: 'n.py', code: 'print()', updatedAt: 2 }],
    } as unknown as ExportFile;
    expect(await s.importAll(file, 'merge')).toEqual({ added: 2 });
    const imported = s.events.value.filter((e) => e.sessionId === 'old');
    expect(imported.map((e) => e.eid)).toEqual(['good-1', 'good-2']);
    expect((imported[0] as Extract<AppEvent, { type: 'self_explain' }>).text).toHaveLength(2000);
    expect(imported[1]).not.toHaveProperty('extra');
    expect((await s.listScratch())[0]).toEqual({ id: 's', name: 'n.py', code: 'print()', stdin: '', updatedAt: 2 });
    expect(s.settings.value.theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('resetAll clears data and settings except the theme', async () => {
    const dbName = `db-${++n}`;
    const storage = memStorage();
    const s = make({ dbName, storage });
    await s.ready;
    s.updateSettings({ theme: 'dark', unlockAll: true, seenTour: true });
    s.append({ type: 'topic_open', topicId: 'strings' });
    s.saveSnapshot('q', { a: 1 });
    await s.saveScratch({ id: 'x', name: 'x.py', code: '', stdin: '', updatedAt: 1 });
    await s.resetAll();
    expect(s.events.value).toEqual([]);
    expect(s.settings.value).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark' });
    expect(await s.getSnapshot('q')).toBeUndefined();
    expect(await s.listScratch()).toEqual([]);
    s.close();
    const t = make({ dbName, storage });
    await t.ready;
    expect(t.events.value).toEqual([]);
  });
});

describe('store: tabs and fallbacks', () => {
  it('another tab sees appended events through BroadcastChannel', async () => {
    const dbName = `db-${++n}`;
    const channelName = `chan-${n}`;
    const storage = memStorage();
    const a = make({ dbName, storage, channelName });
    const b = make({ dbName, storage, channelName });
    await Promise.all([a.ready, b.ready]);
    const e = a.append({ type: 'topic_open', topicId: 'dictionaries' });
    await until(() => b.events.value.some((x) => x.eid === e.eid));
    await a.resetAll();
    await until(() => b.events.value.length === 0);
  });

  it('falls back to memory when IndexedDB is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = make({ indexedDB: null, storage: memStorage() });
    await s.ready;
    expect(s.persistent.value).toBe(false);
    expect(storageAvailable.value).toBe(false);
    s.append({ type: 'topic_open', topicId: 'strings' });
    s.saveSnapshot('q', 1);
    expect((await s.getSnapshot('q'))?.draft).toBe(1);
    const file = await s.exportAll();
    expect(file.events).toHaveLength(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('closes on versionchange so another tab can upgrade', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const dbName = `db-${++n}`;
    const s = make({ dbName, storage: memStorage() });
    await s.ready;
    expect(s.persistent.value).toBe(true);
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open(dbName, 2);
      req.onsuccess = () => {
        req.result.close();
        resolve();
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked: store did not close'));
    });
    expect(s.persistent.value).toBe(false);
    // Still usable in memory.
    s.append({ type: 'topic_open', topicId: 'strings' });
    await s.flush();
    warn.mockRestore();
  });
});
