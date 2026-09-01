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

export interface TeacherProfile {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  department?: string | null;
  branchId?: string | null;
  cachedAt?: string;
}

const DB_NAME = 'nexora-offline';
const STORE = 'attendance-queue';
const TEACHER_STORE = 'teacher-profile';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          const store = database.createObjectStore(STORE, { keyPath: 'localEventId' });
          store.createIndex('syncStatus', 'syncStatus');
        }
        if (!database.objectStoreNames.contains(TEACHER_STORE)) {
          database.createObjectStore(TEACHER_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

/** Cache the teacher profile so the clock page renders offline. */
export async function cacheTeacherProfile(profile: TeacherProfile): Promise<void> {
  const d = await db();
  await d.put(TEACHER_STORE, { ...profile, cachedAt: new Date().toISOString() });
}

/** Last cached teacher profile, or null when the store is empty. */
export async function getCachedTeacherProfile(): Promise<TeacherProfile | null> {
  const d = await db();
  // Keep it simple: the clock is bound to one account, so the most recently
  // cached profile is the right one even if multiple were stored at some point.
  const all = (await d.getAll(TEACHER_STORE)) as TeacherProfile[];
  if (all.length === 0) return null;
  all.sort((a, b) => ((b.cachedAt ?? '') > (a.cachedAt ?? '') ? 1 : -1));
  return all[0];
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
