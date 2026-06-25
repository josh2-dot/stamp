/**
 * Tiny IndexedDB wrapper for the scanner offline cache.
 *
 * Schema:
 *   db: stamp_scanner_v1
 *     store: caches  (keyPath: eventId)
 *       { eventId, paid: string[], used: string[], cachedAt: string }
 *     store: pending (keyPath: id, autoIncrement)
 *       { eventId, qr, at: number }
 *
 * Why raw IDB instead of an `idb` library: zero extra bytes shipped to clients
 * for what is fundamentally three operations (read cache, write cache, queue
 * pending scan). The wrapper below is ~100 LoC and never throws on missing
 * IndexedDB support — falls back silently.
 */

const DB_NAME = "stamp_scanner_v1";
const DB_VERSION = 1;
const CACHE_STORE = "caches";
const PENDING_STORE = "pending";

export interface CachedEvent {
  eventId: string;
  paid: string[];
  used: string[];
  cachedAt: string;
}

export interface PendingScan {
  id?: number;
  eventId: string;
  qr: string;
  at: number;
}

function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function open(): Promise<IDBDatabase | null> {
  if (!isSupported()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "eventId" });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      console.warn("[offline-cache] db open failed", req.error);
      resolve(null);
    };
  });
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T | null> {
  const db = await open();
  if (!db) return null;

  return new Promise((resolve) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    let result: T | null = null;
    const req = fn(objectStore);
    if (req) {
      req.onsuccess = () => {
        result = req.result as T;
      };
    }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => {
      console.warn("[offline-cache] tx failed", transaction.error);
      resolve(null);
    };
  });
}

// ============================================================
// Cache operations
// ============================================================

export async function saveCache(payload: CachedEvent): Promise<void> {
  await tx<unknown>(CACHE_STORE, "readwrite", (store) => store.put(payload));
}

export async function loadCache(eventId: string): Promise<CachedEvent | null> {
  const result = await tx<CachedEvent>(
    CACHE_STORE,
    "readonly",
    (store) => store.get(eventId),
  );
  return result ?? null;
}

export async function markUsedLocally(eventId: string, qr: string): Promise<void> {
  const cache = await loadCache(eventId);
  if (!cache) return;
  if (cache.used.includes(qr)) return;
  cache.used.push(qr);
  await saveCache(cache);
}

// ============================================================
// Pending-scan queue (for offline → online sync)
// ============================================================

export async function queueScan(
  eventId: string,
  qr: string,
): Promise<void> {
  const entry: PendingScan = { eventId, qr, at: Date.now() };
  await tx<unknown>(PENDING_STORE, "readwrite", (store) => store.add(entry));
}

export async function drainPendingScans(eventId: string): Promise<PendingScan[]> {
  const db = await open();
  if (!db) return [];

  return new Promise((resolve) => {
    const transaction = db.transaction(PENDING_STORE, "readwrite");
    const store = transaction.objectStore(PENDING_STORE);
    const out: PendingScan[] = [];

    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const value = cursor.value as PendingScan;
        if (value.eventId === eventId) {
          out.push(value);
          cursor.delete();
        }
        cursor.continue();
      }
    };
    transaction.oncomplete = () => resolve(out);
    transaction.onerror = () => resolve([]);
  });
}

export async function countPendingScans(eventId: string): Promise<number> {
  const db = await open();
  if (!db) return 0;

  return new Promise((resolve) => {
    const transaction = db.transaction(PENDING_STORE, "readonly");
    const store = transaction.objectStore(PENDING_STORE);
    let count = 0;
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if ((cursor.value as PendingScan).eventId === eventId) count += 1;
        cursor.continue();
      } else {
        resolve(count);
      }
    };
    transaction.onerror = () => resolve(0);
  });
}
