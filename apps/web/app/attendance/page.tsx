'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api, getDeviceId } from '@/lib/api';
import { syncEngine, type SyncState } from '@/lib/offline/sync-engine';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
  email?: string;
}

/** Fetch rejects with a TypeError when the network is unreachable. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export default function AttendancePage() {
  const { token, user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [sync, setSync] = useState<SyncState>(syncEngine.getState());
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Subscribe to the shared offline sync engine (same queue as the mobile app).
  useEffect(() => {
    const unsub = syncEngine.subscribe(setSync);
    return unsub;
  }, []);

  const loadTeacher = useCallback(() => {
    if (!user?.email) return;
    api
      .get<{ data: Teacher[] }>(
        '/teachers?search=' + encodeURIComponent(user.email),
        token ?? undefined,
      )
      .then((r) => {
        const match = r.data.find((t) => t.email === user.email);
        if (match) setTeacher(match);
      })
      .catch(() => setError('Could not load your teacher profile.'));
  }, [token, user]);

  useEffect(() => {
    loadTeacher();
  }, [loadTeacher]);

  useEffect(() => {
    const onOnline = () => loadTeacher();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [loadTeacher]);

  function getPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this device.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    });
  }

  async function record(type: 'CHECK_IN' | 'CHECK_OUT') {
    if (!teacher) return;
    setError(null);
    setBusy(true);
    try {
      const pos = await getPosition();
      const deviceId = getDeviceId();
      const baseEvent = {
        attendanceType: type,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        deviceId,
        verificationMethod: 'gps_geofence',
      };

      // Try real-time first; on network failure, queue for offline sync via the
      // shared sync engine (which handles marking SYNCED/FAILED per event).
      if (!isOffline()) {
        try {
          await api.post('/attendance/check-in', baseEvent, token ?? undefined);
          setStatus(`${type === 'CHECK_IN' ? 'Checked in' : 'Checked out'} successfully.`);
          return;
        } catch (err) {
          if (!isNetworkError(err)) {
            setError(err instanceof Error ? err.message : 'Server rejected the check-in.');
            return;
          }
          // Network failure — fall through and queue for offline sync.
        }
      }

      await syncEngine.enqueue({
        localEventId: crypto.randomUUID(),
        teacherId: teacher.id,
        attendanceType: type,
        timestamp: new Date().toISOString(),
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        deviceId,
        verificationMethod: 'gps_geofence',
      });
      setStatus('Saved offline — will sync when back online.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to get location.');
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    setError(null);
    setStatus(null);
    const accepted = await syncEngine.flush(token ?? undefined);
    if (accepted === 0) setStatus('Nothing new synced.');
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Attendance</h1>
            <p className="text-sm text-stone-500">GPS + geofence verified check-in / check-out.</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              role="status"
              aria-live="polite"
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                sync.online ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {sync.online ? 'Online' : 'Offline'}
              {sync.pending > 0 && <span>· {sync.pending} pending</span>}
              {sync.lastSyncAt && <span>· synced {new Date(sync.lastSyncAt).toLocaleTimeString()}</span>}
            </span>
            <button
              onClick={syncNow}
              disabled={busy || sync.syncing || sync.pending === 0}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
            >
              {sync.syncing ? 'Syncing…' : `Sync offline (${sync.pending})`}
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}
        {status && (
          <p className="mb-4 rounded-lg bg-accent-soft px-4 py-3 text-sm text-accent">{status}</p>
        )}

        {!teacher ? (
          <p className="text-sm text-stone-400">
            {error ? '' : 'Loading your teacher profile…'}
          </p>
        ) : (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="text-sm text-stone-500">Signed in as</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">
              {teacher.firstName} {teacher.lastName}
            </p>
            <p className="text-sm text-stone-500">
              {teacher.employeeId} · {teacher.designation ?? 'Teacher'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => record('CHECK_IN')}
                disabled={busy}
                className="rounded-xl bg-accent px-4 py-4 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
              >
                {busy ? 'Working…' : 'Check in'}
              </button>
              <button
                onClick={() => record('CHECK_OUT')}
                disabled={busy}
                className="rounded-xl border border-stone-300 px-4 py-4 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-60"
              >
                {busy ? 'Working…' : 'Check out'}
              </button>
            </div>

            <p className="mt-4 text-xs text-stone-400">
              Requires geolocation. Events captured offline are stored in your browser and
              sync automatically when connectivity returns.
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}