// Nexora Smart Edu — offline-first attendance queue backed by IndexedDB.
// Captures check-in/check-out events while offline, then syncs them when the
// network returns (48h server-side window).
import { openDB, type IDBPDatabase } from 'idb';

export interface OfflineEvent {
  id: string;
  localEventId: string;
  teacherId: string;
  attendanceType: 'CHECK_IN' | 'CHECK_OUT';
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  deviceId: string | null;
  verificationMethod?: string;
  syncStatus: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
}

const DB_NAME = 'nexora-offline';
const STORE = 'attendance-queue';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, { keyPath: 'localEventId' });
          store.createIndex('syncStatus', 'syncStatus');
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueueEvent(event: OfflineEvent): Promise<void> {
  const d = await db();
  await d.put(STORE, { ...event, syncStatus: 'PENDING' });
}

export async function getPendingEvents(): Promise<OfflineEvent[]> {
  const d = await db();
  const all = (await d.getAll(STORE)) as OfflineEvent[];
  return all.filter((e) => e.syncStatus === 'PENDING' || e.syncStatus === 'FAILED');
}

export async function markSynced(localEventId: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const existing = (await store.get(localEventId)) as OfflineEvent | undefined;
  if (existing) await store.put({ ...existing, syncStatus: 'SYNCED' });
  await tx.done;
}

export async function markFailed(localEventId: string): Promise<void> {
  const d = await db();
  const tx = d.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  const existing = (await store.get(localEventId)) as OfflineEvent | undefined;
  if (existing) await store.put({ ...existing, syncStatus: 'FAILED' });
  await tx.done;
}

export async function pendingCount(): Promise<number> {
  return (await getPendingEvents()).length;
}
