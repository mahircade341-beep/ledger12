/**
 * localStore — IndexedDB-backed on-device cache + offline write queue ("outbox").
 *
 * Every table the app syncs with Supabase is mirrored on the device, scoped per
 * user, so DukaHub keeps working with zero connectivity:
 *   - Reads: served instantly from this cache, refreshed from the server when online.
 *   - Writes: applied to the cache immediately and queued in the outbox; the queue
 *     is flushed to the server the moment a connection returns (see syncEngine.ts).
 *
 * Key scheme: `u:<userId>:table:<table>` / `u:<userId>:outbox` / `u:<userId>:meta`
 */

const DB_NAME = 'dukahub-offline';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then((db) =>
    new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    })
  );
}

async function getItem<T>(key: string): Promise<T | null> {
  try {
    const v = await tx<{ value: T } | undefined>('readonly', (s) => s.get(key) as IDBRequest<{ value: T } | undefined>);
    return v ? v.value : null;
  } catch {
    return null;
  }
}

async function putItem(key: string, value: unknown): Promise<void> {
  try {
    await tx('readwrite', (s) => s.put({ key, value }));
  } catch {
    // storage unavailable — degrade gracefully (app still works, just no offline cache)
  }
}

async function removeByPrefix(prefix: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction(STORE, 'readwrite');
      const store = t.objectStore(STORE);
      const cursorReq = store.openKeyCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          if (String(cursor.key).startsWith(prefix)) store.delete(cursor.key);
          cursor.continue();
        } else {
          resolve();
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
      t.onerror = () => reject(t.error);
    });
  } catch {
    // ignore cleanup errors
  }
}

// ── Table cache ────────────────────────────────────────────────

const tableKey = (userId: string, table: string) => `u:${userId}:table:${table}`;

export async function loadTableRows(userId: string, table: string): Promise<any[] | null> {
  const v = await getItem<{ rows: any[] }>(tableKey(userId, table));
  return v ? v.rows : null;
}

export async function saveTableRows(userId: string, table: string, rows: any[]): Promise<void> {
  await putItem(tableKey(userId, table), { rows });
}

export async function clearUserData(userId: string): Promise<void> {
  await removeByPrefix(`u:${userId}:`);
}

// ── Outbox (pending offline writes) ────────────────────────────

export interface SyncOp {
  kind: 'insert' | 'update' | 'delete';
  table: string;
  id?: string;
  /** For insert: full Supabase-shaped row. For update: mapped changes. */
  payload?: any;
  seq: number;
}

const outboxKey = (userId: string) => `u:${userId}:outbox`;

// All outbox mutations run through a single promise chain so rapid writes
// (e.g. a POS checkout that inserts a transaction AND updates stock in the
// same tick) never read-modify-write over each other and lose an op.
let mutationQueue: Promise<unknown> = Promise.resolve();

export function withOutboxLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = mutationQueue.then(fn, fn);
  mutationQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function getOutbox(userId: string): Promise<SyncOp[]> {
  const v = await getItem<{ ops: SyncOp[] }>(outboxKey(userId));
  return v ? v.ops : [];
}

export async function pushOps(userId: string, ops: SyncOp[]): Promise<void> {
  await withOutboxLock(async () => {
    const existing = await getOutbox(userId);
    await putItem(outboxKey(userId), { ops: [...existing, ...ops] });
    notifySyncChanged();
  });
}

export async function replaceOutbox(userId: string, ops: SyncOp[]): Promise<void> {
  await withOutboxLock(async () => {
    await putItem(outboxKey(userId), { ops });
    notifySyncChanged();
  });
}

/**
 * Write the outbox without taking the lock — only for callers that are already
 * inside the lock (syncEngine's flush).
 */
export async function setOutboxRaw(userId: string, ops: SyncOp[]): Promise<void> {
  await putItem(outboxKey(userId), { ops });
  notifySyncChanged();
}

// ── Sync metadata ──────────────────────────────────────────────

const metaKey = (userId: string) => `u:${userId}:meta`;

export async function getSyncMeta(userId: string): Promise<{ lastSyncedAt: number | null }> {
  const v = await getItem<{ lastSyncedAt: number }>(metaKey(userId));
  return { lastSyncedAt: v ? v.lastSyncedAt : null };
}

export async function setLastSynced(userId: string, ts: number): Promise<void> {
  await putItem(metaKey(userId), { lastSyncedAt: ts });
}

// ── Change notification (drives the live sync status pill) ────

const listeners = new Set<() => void>();

export function onSyncChanged(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function notifySyncChanged(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // a listener must never break the others
    }
  });
}
