// Minimal promise helpers over IndexedDB (no dependency). Works in windows and workers.
export const DB_NAME = "action-tracker";
export const DB_VERSION = 1;
export const STORE = { recordings: "recordings", analyses: "analyses" } as const;

let dbPromise: Promise<IDBDatabase> | undefined;

export function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Subset of designs/04 §6 for P1; later versions add athletes, events, metrics, sync_state.
      if (!db.objectStoreNames.contains(STORE.recordings)) {
        const s = db.createObjectStore(STORE.recordings, { keyPath: "id" });
        s.createIndex("videoSha256", "videoSha256", { unique: true });
      }
      if (!db.objectStoreNames.contains(STORE.analyses)) {
        const s = db.createObjectStore(STORE.analyses, { keyPath: "id" });
        s.createIndex("recordingId", "recordingId");
        s.createIndex("videoSha256", "videoSha256");
        s.createIndex("createdAt", "createdAt");
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = undefined;
      };
      resolve(db);
    };
    req.onerror = () => {
      dbPromise = undefined;
      reject(req.error);
    };
  });
  return dbPromise;
}

export function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("Transaction aborted", "AbortError"));
  });
}
