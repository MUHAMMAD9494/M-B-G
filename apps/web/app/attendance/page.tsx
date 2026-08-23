'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { enqueueEvent, getPendingEvents, pendingCount } from '@/lib/idb';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string | null;
}

export default function AttendancePage() {
  const { token, user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [pending, setPending] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Fetch the teacher profile linked to the current user account.
    api
      .get<{ data: Teacher[] }>('/teachers?search=' + encodeURIComponent(user?.email ?? ''), token ?? undefined)
      .then((r) => {
        const match = r.data.find(
          (t) => (t as unknown as { email?: string }).email === user?.email,
        );
        if (match) setTeacher(match);
      })
      .catch(() => setError('Could not load your teacher profile.'));
  }, [token, user]);

  useEffect(() => {
    pendingCount().then(setPending);
  }, []);

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
      const payload = {
        localEventId: crypto.randomUUID(),
        teacherId: teacher.id,
        attendanceType: type,
        timestamp: new Date().toISOString(),
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        deviceId: null,
        verificationMethod: 'gps_geofence',
      };

      // Try real-time first; on network failure, queue for offline sync.
      try {
        await api.post('/attendance/check-in', {
          attendanceType: type,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          verificationMethod: 'gps_geofence',
        }, token ?? undefined);
        setStatus(`${type === 'CHECK_IN' ? 'Checked in' : 'Checked out'} successfully.`);
      } catch (err) {
        // Offline or rejected — persist locally and surface a clear message.
        await enqueueEvent(payload as never);
        setPending(await pendingCount());
        setStatus(
          `Saved offline (will sync when online). ${
            err instanceof Error ? err.message : ''
          }`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to get location.');
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    const events = await getPendingEvents();
    if (events.length === 0) {
      setStatus('Nothing to sync.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ results: { localEventId: string; status: string }[] }>(
        '/attendance/sync',
        { events: events.map((e) => ({ ...e })) },
        token ?? undefined,
      );
      setStatus(`Synced ${res.results.filter((r) => r.status === 'ACCEPTED').length}/${events.length} events.`);
      setPending(await pendingCount());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Attendance</h1>
            <p className="text-sm text-stone-500">GPS + geofence verified check-in / check-out.</p>
          </div>
          <button
            onClick={syncNow}
            disabled={busy || pending === 0}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:opacity-50"
          >
            Sync offline ({pending})
          </button>
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
