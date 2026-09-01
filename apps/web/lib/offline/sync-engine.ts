// Nexora Smart Edu — offline-first sync engine.
//
// Manages an IndexedDB-backed queue of attendance events with:
//   - automatic background synchronization on network reconnection
//   - retry with exponential backoff (15s → 30s → 1m → 2m → 5m cap, ±20% jitter)
//   - a subscriber API so the UI can render a live offline/sync badge
//
// Sync contract: POST /attendance/sync  { events: [...] }
//   -> { results: [{ localEventId, status: ACCEPTED|REJECTED|CONFLICT }] }

import { openDB, type IDBPDatabase } from 'idb';
import { api } from '../api';

export type AttendanceType = 'CHECK_IN' | 'CHECK_OUT';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT' | 'DEDUPLICATED';

export interface AttendanceEventPayload {
  localEventId: string;
  teacherId: string;
  attendanceType: AttendanceType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  deviceId: string | null;
  verificationMethod?: string;
  /** Client-recorded verification state (informative); the server recomputes the authoritative state. */
  verificationState?: 'verified_local' | 'pending_verification';
}

export interface StoredEvent extends AttendanceEventPayload {
  syncStatus: SyncStatus;
  retryCount: number;
  lastError: string | null;
  queuedAt: string;
}

export interface SyncState {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
}

type Listener = (state: SyncState) => void;

const DB_NAME = 'nexora-offline';
const STORE = 'attendance-queue';
const TEACHER_STORE = 'teacher-profile';
const DB_VERSION = 2;
export const MAX_RETRIES = 5;
// Exponential backoff ladder: 15s → 30s → 1m → 2m → 5m (cap).
const RETRY_DELAY_STEPS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];
const JITTER_RATIO = 0.2;
const MIN_RETRY_DELAY_MS = 1_000;

/** Backoff with small jitter, keyed by the retry attempt (0-based). */
function retryDelayForAttempt(attempt: number): number {
  const step = Math.min(attempt, RETRY_DELAY_STEPS_MS.length - 1);
  const base = RETRY_DELAY_STEPS_MS[step];
  const jitter = base * JITTER_RATIO * (Math.random() * 2 - 1); // ±20%
  return Math.max(MIN_RETRY_DELAY_MS, Math.round(base + jitter));
}

export class OfflineSyncEngine {
  private listeners = new Set<Listener>();
  private state: SyncState = {
    online: true,
    pending: 0,
    syncing: false,
    lastSyncAt: null,
    lastError: null,
  };
  private dbPromise: Promise<IDBPDatabase> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.state.online = navigator.onLine;
      window.addEventListener('online', () => {
        this.patch({ online: true });
        void this.flush();
      });
      window.addEventListener('offline', () => this.patch({ online: false }));
      // Don't retry while the tab is hidden/being unloaded — clear the timer so
      // a background tab can't keep waking the network (and so the timer is
      // re-armed with backoff on the next visible flush).
      window.addEventListener('pagehide', this.clearRetryTimer);
      document.addEventListener('visibilitychange', this.handleVisibility);
      void this.refresh();
    }
  }

  private handleVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.clearRetryTimer();
    } else if (document.visibilityState === 'visible' && this.state.online) {
      void this.flush();
    }
  };

  private clearRetryTimer = (): void => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  };

  private db(): Promise<IDBPDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDB(DB_NAME, DB_VERSION, {
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
    return this.dbPromise;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): SyncState {
    return this.state;
  }

  private patch(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    for (const l of this.listeners) l(this.state);
  }

  async refresh(): Promise<void> {
    const pending = await this.pendingCount();
    this.patch({ pending });
  }

  private async pendingCount(): Promise<number> {
    const d = await this.db();
    const all = (await d.getAll(STORE)) as StoredEvent[];
    return all.filter((e) => e.syncStatus === 'PENDING' || e.syncStatus === 'FAILED').length;
  }

  async enqueue(event: AttendanceEventPayload): Promise<void> {
    const d = await this.db();
    const stored: StoredEvent = {
      ...event,
      syncStatus: 'PENDING',
      retryCount: 0,
      lastError: null,
      queuedAt: new Date().toISOString(),
    };
    await d.put(STORE, stored);
    await this.refresh();
  }

  /** Push all pending/failed events to the server. Returns accepted count. */
  async flush(token?: string): Promise<number> {
    if (this.state.syncing) return this.state.pending;
    if (!this.state.online) return 0;

    this.patch({ syncing: true, lastError: null });
    try {
      const d = await this.db();
      const all = (await d.getAll(STORE)) as StoredEvent[];
      const toSync = all.filter(
        (e) => e.syncStatus === 'PENDING' || e.syncStatus === 'FAILED',
      );
      if (toSync.length === 0) {
        this.patch({ syncing: false });
        return 0;
      }

      // Mark in-flight.
      const tx = d.transaction(STORE, 'readwrite');
      for (const e of toSync) {
        await tx.store.put({ ...e, syncStatus: 'SYNCING' } as StoredEvent);
      }
      await tx.done;

      const res = await api.post<{ results: { localEventId: string; status: string }[] }>(
        '/attendance/sync',
        {
          events: toSync.map((e) => ({
            localEventId: e.localEventId,
            attendanceType: e.attendanceType,
            timestamp: e.timestamp,
            latitude: e.latitude,
            longitude: e.longitude,
            accuracy: e.accuracy,
            deviceId: e.deviceId,
            verificationMethod: e.verificationMethod,
          })),
        },
        token,
      );

      const byId = new Map(res.results.map((r) => [r.localEventId, r.status]));
      for (const e of toSync) {
        const status = byId.get(e.localEventId);
        if (status === 'ACCEPTED' || status === 'DEDUPLICATED') {
          // DEDUPLICATED = idempotent replay of an already-synced event: the
          // server returned the existing record, so the queue item is done.
          await this.markSynced(e.localEventId);
        } else if (status === 'REJECTED' || status === 'CONFLICT') {
          // Server made a final decision (invalid timestamp/accuracy, or a
          // duplicate that the server refuses): dead-letter it — never retry,
          // never silently drop (stays visible in the queue as CONFLICT).
          await this.markDeadLetter(e.localEventId, status ?? 'REJECTED');
        } else {
          await this.markFailed(e.localEventId, status ?? 'REJECTED');
        }
      }

      this.patch({ lastSyncAt: new Date().toISOString() });
      await this.refresh();
      return res.results.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed';
      this.patch({ lastError: msg });
      const d = await this.db();
      const all = (await d.getAll(STORE)) as StoredEvent[];
      let maxAttempt = 0;
      for (const e of all.filter((x) => x.syncStatus === 'SYNCING')) {
        // markFailed bumps retryCount internally; use the post-increment count
        // for backoff so consecutive failures climb the ladder.
        maxAttempt = Math.max(maxAttempt, (e.retryCount ?? 0) + 1);
        await this.markFailed(e.localEventId, msg);
      }
      await this.refresh();
      this.scheduleRetry(token, maxAttempt);
      return 0;
    } finally {
      this.patch({ syncing: false });
    }
  }

  private async markSynced(localEventId: string): Promise<void> {
    const d = await this.db();
    const tx = d.transaction(STORE, 'readwrite');
    const existing = (await tx.store.get(localEventId)) as StoredEvent | undefined;
    if (existing) await tx.store.put({ ...existing, syncStatus: 'SYNCED', lastError: null });
    await tx.done;
  }

  private async markFailed(localEventId: string, reason: string): Promise<void> {
    const d = await this.db();
    const tx = d.transaction(STORE, 'readwrite');
    const existing = (await tx.store.get(localEventId)) as StoredEvent | undefined;
    if (existing) {
      const retryCount = (existing.retryCount ?? 0) + 1;
      const syncStatus: SyncStatus = retryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';
      await tx.store.put({ ...existing, syncStatus, retryCount, lastError: reason });
    }
    await tx.done;
  }

  /** Server-final state (REJECTED/CONFLICT): keep the record, stop retrying. */
  private async markDeadLetter(localEventId: string, reason: string): Promise<void> {
    const d = await this.db();
    const tx = d.transaction(STORE, 'readwrite');
    const existing = (await tx.store.get(localEventId)) as StoredEvent | undefined;
    if (existing) {
      await tx.store.put({
        ...existing,
        syncStatus: 'CONFLICT' as SyncStatus,
        lastError: reason,
      });
    }
    await tx.done;
  }

  private scheduleRetry(token: string | undefined, attempt: number): void {
    if (this.retryTimer) return;
    const delay = retryDelayForAttempt(attempt);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush(token);
    }, delay);
  }

  async pendingEvents(): Promise<StoredEvent[]> {
    const d = await this.db();
    const all = (await d.getAll(STORE)) as StoredEvent[];
    return all.filter(
      (e) => e.syncStatus === 'PENDING' || e.syncStatus === 'FAILED' || e.syncStatus === 'SYNCING',
    );
  }

  async clearSynced(): Promise<void> {
    const d = await this.db();
    const all = (await d.getAll(STORE)) as StoredEvent[];
    const tx = d.transaction(STORE, 'readwrite');
    for (const e of all.filter((x) => x.syncStatus === 'SYNCED')) {
      await tx.store.delete(e.localEventId);
    }
    await tx.done;
    await this.refresh();
  }
}

export const syncEngine = new OfflineSyncEngine();