// Small promise wrapper over IndexedDB plus an in-memory backend with the same shape.
import type { AppEvent } from '../engine/types.ts';
import type { ScratchFile, Snapshot } from './types.ts';

export const DB_VERSION = 1;
export type StoreName = 'events' | 'snapshots' | 'scratch';
export const STORE_NAMES: readonly StoreName[] = ['events', 'snapshots', 'scratch'];

export function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB request failed'));
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

/** Opens (and creates on first use) the PyLadder database. Rejects when IndexedDB is unusable or opening takes too long. */
export function openDatabase(factory: IDBFactory, name: string, timeoutMs: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Opening IndexedDB timed out'));
    }, timeoutMs);
    let req: IDBOpenDBRequest;
    try {
      req = factory.open(name, DB_VERSION);
    } catch (err) {
      clearTimeout(timer);
      settled = true;
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('events')) {
        const events = db.createObjectStore('events', { keyPath: 'eid' });
        events.createIndex('ts', 'ts');
      }
      if (!db.objectStoreNames.contains('snapshots')) db.createObjectStore('snapshots', { keyPath: 'qid' });
      if (!db.objectStoreNames.contains('scratch')) db.createObjectStore('scratch', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      clearTimeout(timer);
      if (settled) {
        req.result.close();
        return;
      }
      settled = true;
      resolve(req.result);
    };
    req.onerror = () => {
      clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(req.error ?? new Error('IndexedDB open failed'));
    };
  });
}

export interface Backend {
  readonly persistent: boolean;
  loadEvents(): Promise<AppEvent[]>;
  putEvents(events: readonly AppEvent[]): Promise<void>;
  getSnapshot(qid: string): Promise<Snapshot | undefined>;
  putSnapshots(snaps: readonly Snapshot[]): Promise<void>;
  allSnapshots(): Promise<Snapshot[]>;
  allScratch(): Promise<ScratchFile[]>;
  putScratch(files: readonly ScratchFile[]): Promise<void>;
  deleteScratch(id: string): Promise<void>;
  clearAll(): Promise<void>;
  close(): void;
}

export class IdbBackend implements Backend {
  readonly persistent = true;
  private readonly db: IDBDatabase;

  constructor(db: IDBDatabase) {
    this.db = db;
  }

  /** Runs synchronous store operations in one readwrite transaction; aborts it if any operation throws. */
  private async write(name: StoreName | StoreName[], fn: (tx: IDBTransaction) => void): Promise<void> {
    const tx = this.db.transaction(name, 'readwrite');
    const done = transactionDone(tx);
    try {
      fn(tx);
    } catch (err) {
      try {
        tx.abort();
      } catch {
        // already finished
      }
      await done.catch(() => undefined);
      throw err;
    }
    await done;
  }

  async loadEvents(): Promise<AppEvent[]> {
    const tx = this.db.transaction('events', 'readonly');
    const all = await requestToPromise(tx.objectStore('events').index('ts').getAll() as IDBRequest<AppEvent[]>);
    return all;
  }

  async putEvents(events: readonly AppEvent[]): Promise<void> {
    if (events.length === 0) return;
    await this.write('events', (tx) => {
      const os = tx.objectStore('events');
      for (const e of events) os.put(e);
    });
  }

  async getSnapshot(qid: string): Promise<Snapshot | undefined> {
    const tx = this.db.transaction('snapshots', 'readonly');
    return (await requestToPromise(tx.objectStore('snapshots').get(qid))) as Snapshot | undefined;
  }

  async putSnapshots(snaps: readonly Snapshot[]): Promise<void> {
    if (snaps.length === 0) return;
    await this.write('snapshots', (tx) => {
      const os = tx.objectStore('snapshots');
      for (const s of snaps) os.put(s);
    });
  }

  async allSnapshots(): Promise<Snapshot[]> {
    const tx = this.db.transaction('snapshots', 'readonly');
    return (await requestToPromise(tx.objectStore('snapshots').getAll())) as Snapshot[];
  }

  async allScratch(): Promise<ScratchFile[]> {
    const tx = this.db.transaction('scratch', 'readonly');
    return (await requestToPromise(tx.objectStore('scratch').getAll())) as ScratchFile[];
  }

  async putScratch(files: readonly ScratchFile[]): Promise<void> {
    if (files.length === 0) return;
    await this.write('scratch', (tx) => {
      const os = tx.objectStore('scratch');
      for (const f of files) os.put(f);
    });
  }

  async deleteScratch(id: string): Promise<void> {
    await this.write('scratch', (tx) => tx.objectStore('scratch').delete(id));
  }

  async clearAll(): Promise<void> {
    await this.write([...STORE_NAMES], (tx) => {
      for (const name of STORE_NAMES) tx.objectStore(name).clear();
    });
  }

  close(): void {
    this.db.close();
  }
}

/** Used when IndexedDB is unavailable (some private modes) or was closed by another tab. Data lasts for this page only. */
export class MemoryBackend implements Backend {
  readonly persistent = false;
  private events = new Map<string, AppEvent>();
  private snapshots = new Map<string, Snapshot>();
  private scratch = new Map<string, ScratchFile>();

  async loadEvents(): Promise<AppEvent[]> {
    return [...this.events.values()].sort((a, b) => a.ts - b.ts);
  }
  async putEvents(events: readonly AppEvent[]): Promise<void> {
    for (const e of events) this.events.set(e.eid, e);
  }
  async getSnapshot(qid: string): Promise<Snapshot | undefined> {
    return this.snapshots.get(qid);
  }
  async putSnapshots(snaps: readonly Snapshot[]): Promise<void> {
    for (const s of snaps) this.snapshots.set(s.qid, s);
  }
  async allSnapshots(): Promise<Snapshot[]> {
    return [...this.snapshots.values()];
  }
  async allScratch(): Promise<ScratchFile[]> {
    return [...this.scratch.values()];
  }
  async putScratch(files: readonly ScratchFile[]): Promise<void> {
    for (const f of files) this.scratch.set(f.id, f);
  }
  async deleteScratch(id: string): Promise<void> {
    this.scratch.delete(id);
  }
  async clearAll(): Promise<void> {
    this.events.clear();
    this.snapshots.clear();
    this.scratch.clear();
  }
  close(): void {}
}
