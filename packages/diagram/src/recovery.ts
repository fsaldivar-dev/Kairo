import { parseDocument } from './document';
import type { DiagramDocument } from './types';

/** A subset of Web Storage; access is lazy so importing this module is safe without a browser. */
export interface DraftStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface DraftRecord {
  version: 1;
  id: string;
  revision: number;
  updatedAt: number;
  title: string;
  document: DiagramDocument;
}
export type DraftEntry = { id: string; record: DraftRecord; error?: never } | { id: string; record?: never; error: string };
export interface DraftStoreOptions {
  storage(): DraftStorage;
  namespace?: string;
  /** UTF-8 bytes per record, default 1 MiB. Browser quota can be smaller. */
  maxBytes?: number;
  /** Admission limit, default 20. Concurrent writers may exceed it; existing records are never evicted. */
  maxRecords?: number;
}
export interface DraftStore {
  list(): DraftEntry[];
  read(id: string): DraftRecord | null;
  write(record: DraftRecord): void;
  remove(id: string): void;
}
function validId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id)) throw new Error('Invalid draft ID');
}
function integer(value: number, name: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`Invalid ${name}`);
  return value;
}
function validate(value: unknown): DraftRecord {
  if (!value || typeof value !== 'object') throw new Error('Invalid draft');
  const r = value as DraftRecord;
  if (r.version !== 1) throw new Error('Unsupported draft version');
  validId(r.id); integer(r.revision, 'draft revision'); integer(r.updatedAt, 'draft timestamp');
  if (typeof r.title !== 'string' || r.title.length > 200) throw new Error('Invalid draft title');
  return { version: 1, id: r.id, revision: r.revision, updatedAt: r.updatedAt, title: r.title, document: parseDocument(r.document) };
}
export function createDraftStore(options: DraftStoreOptions): DraftStore {
  const prefix = options.namespace ?? 'kairo-draft-v1:';
  if (!prefix) throw new Error('Draft namespace must not be empty');
  const maxBytes = integer(options.maxBytes ?? 1024 * 1024, 'draft byte limit', 1);
  const maxRecords = integer(options.maxRecords ?? 20, 'draft count limit', 1);
  const key = (id: string): string => { validId(id); return prefix + id; };
  const size = (raw: string): void => {
    if (raw.length > maxBytes || new TextEncoder().encode(raw).length > maxBytes) throw new Error('Draft exceeds byte limit');
  };
  function ids(storage: DraftStorage): string[] {
    const found = new Set<string>();
    for (let i = 0; i < storage.length; i++) {
      const name = storage.key(i);
      if (name?.startsWith(prefix) && /^[a-zA-Z0-9_-]{1,80}$/.test(name.slice(prefix.length))) found.add(name.slice(prefix.length));
    }
    return [...found];
  }
  function read(storage: DraftStorage, id: string): DraftRecord | null {
    const raw = storage.getItem(key(id));
    if (raw === null) return null;
    size(raw);
    const record = validate(JSON.parse(raw));
    if (record.id !== id) throw new Error('Draft ID does not match its storage key');
    return record;
  }
  return {
    read: id => read(options.storage(), id),
    list() {
      const storage = options.storage(), entries: DraftEntry[] = [];
      for (const id of ids(storage)) {
        try { const record = read(storage, id); if (record) entries.push({ id, record }); }
        catch (error) { entries.push({ id, error: String(error) }); }
      }
      return entries.sort((a, b) => (b.record?.updatedAt ?? 0) - (a.record?.updatedAt ?? 0) || a.id.localeCompare(b.id));
    },
    write(value) {
      const record = validate(value), raw = JSON.stringify(record), name = key(record.id);
      size(raw);
      const storage = options.storage();
      if (storage.getItem(name) === null && ids(storage).length >= maxRecords) throw new Error('Draft storage is full; remove a draft first');
      // One key per writer; never update a shared index or evict someone else's recovery copy.
      storage.setItem(name, raw);
    },
    remove: id => options.storage().removeItem(key(id)),
  };
}

export interface DraftClock {
  now(): number;
  setTimeout(callback: () => void, delay: number): unknown;
  clearTimeout(timer: unknown): void;
}
export interface DraftStatus { state: 'idle' | 'pending' | 'saved' | 'error'; revision?: number; error?: unknown }
export interface DraftRecoveryOptions {
  store: DraftStore;
  /** Unique per editor mount, e.g. crypto.randomUUID(). Never share between active writers. */
  id: string;
  debounceMs?: number;
  maxWaitMs?: number;
  clock?: DraftClock;
  onStatus?(status: DraftStatus): void;
}
export interface DraftRecovery {
  schedule(document: DiagramDocument, metadata: { revision: number; title?: string }): void;
  flush(): boolean;
  markSaved(revision: number): boolean;
  discard(): boolean;
  /** Cancels timers without deleting the stored draft. Call flush first if desired. */
  destroy(): void;
}
export function createDraftRecovery(options: DraftRecoveryOptions): DraftRecovery {
  validId(options.id);
  const delay = integer(options.debounceMs ?? 500, 'draft debounce');
  const maxWait = integer(options.maxWaitMs ?? 2000, 'draft maximum wait', 1);
  const clock: DraftClock = options.clock ?? {
    now: () => Date.now(), setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: timer => clearTimeout(timer as ReturnType<typeof setTimeout>),
  };
  let pending: DraftRecord | null = null, latest = -1, destroyed = false;
  let timer: unknown, deadline: unknown;
  function clear(): void { if (timer !== undefined) clock.clearTimeout(timer); if (deadline !== undefined) clock.clearTimeout(deadline); timer = deadline = undefined; }
  const status = (state: DraftStatus['state'], revision?: number, error?: unknown): void => options.onStatus?.({ state, revision, error });
  function flush(): boolean {
    if (destroyed) return false;
    clear();
    if (!pending) return true;
    const record = { ...pending, updatedAt: clock.now() };
    try { options.store.write(record); }
    catch (error) { status('error', pending.revision, error); return false; }
    pending = null; status('saved', record.revision); return true;
  }
  return {
    schedule(document, metadata) {
      if (destroyed) return;
      integer(metadata.revision, 'draft revision');
      if (metadata.revision <= latest) return;
      pending = validate({ version: 1, id: options.id, revision: metadata.revision, updatedAt: clock.now(), title: metadata.title ?? '', document });
      latest = metadata.revision;
      if (timer !== undefined) clock.clearTimeout(timer);
      timer = clock.setTimeout(flush, delay);
      if (deadline === undefined) deadline = clock.setTimeout(flush, maxWait);
      status('pending', latest);
    },
    flush,
    markSaved(revision) {
      if (destroyed) return false;
      integer(revision, 'saved revision');
      latest = Math.max(latest, revision);
      // An asynchronous save of revision N must leave pending/stored N+1 untouched.
      try {
        const record = options.store.read(options.id);
        if (record && record.revision <= revision) options.store.remove(options.id);
        if (pending && pending.revision <= revision) { pending = null; clear(); }
        status(pending ? 'pending' : record && record.revision > revision ? 'saved' : 'idle', pending?.revision ?? record?.revision);
        return true;
      } catch (error) { status('error', revision, error); return false; }
    },
    discard() {
      if (destroyed) return false;
      try { options.store.remove(options.id); pending = null; clear(); status('idle'); return true; }
      catch (error) { status('error', latest, error); return false; }
    },
    destroy() { destroyed = true; pending = null; clear(); },
  };
}
