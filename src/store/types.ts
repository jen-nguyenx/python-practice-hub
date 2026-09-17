// Store contract. Implemented in src/store/index.ts.
import type { ReadonlySignal } from '@preact/signals';
import type { AppEvent, NewEvent, Settings } from '../engine/types.ts';

export interface Snapshot { qid: string; draft: unknown; updatedAt: number }
export interface ScratchFile { id: string; name: string; code: string; stdin: string; updatedAt: number }

export interface ExportFile {
  format: 'pyladder-export';
  version: 1;
  exportedAt: number;
  settings: Settings;
  events: AppEvent[];
  snapshots: Snapshot[];
  scratch: ScratchFile[];
}

export interface Store {
  /** Resolves once IndexedDB is open and events are loaded into memory. */
  ready: Promise<void>;
  /** All events in insertion order. Updates on append. */
  events: ReadonlySignal<readonly AppEvent[]>;
  settings: ReadonlySignal<Settings>;
  /** Current session id. A getter: it changes after 30 idle minutes, so read it each time instead of keeping a copy. */
  readonly sessionId: string;
  append(e: NewEvent): AppEvent;
  updateSettings(patch: Partial<Settings>): void;
  getSnapshot(qid: string): Promise<Snapshot | undefined>;
  saveSnapshot(qid: string, draft: unknown): void;
  listScratch(): Promise<ScratchFile[]>;
  saveScratch(file: ScratchFile): Promise<void>;
  deleteScratch(id: string): Promise<void>;
  exportAll(): Promise<ExportFile>;
  importAll(file: ExportFile, mode: 'merge' | 'replace'): Promise<{ added: number }>;
  resetAll(): Promise<void>;
}
