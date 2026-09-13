'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface AttendanceRecord {
  id: string;
  teacherId: string;
  teacher: { firstName: string; lastName: string; employeeId: string } | null;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  checkInGeofenceStatus: string | null;
  checkOutGeofenceStatus: string | null;
  riskScore: number;
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-success-soft text-success',
  LATE: 'bg-warning-soft text-warning',
  EARLY: 'bg-warning-soft text-warning',
  ABSENT: 'bg-stone-100 text-stone-500',
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function geoLabel(s: string | null): string {
  if (!s || s === 'UNKNOWN') return '—';
  return s === 'INSIDE' ? '✓ Inside' : '✗ Outside';
}

export default function AttendanceAdminPage() {
  const { token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<{ data: AttendanceRecord[]; meta: { total: number } }>(
        `/attendance?date=${date}&limit=100`,
        token ?? undefined,
      )
      .then((r) => setRecords(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attendance.'))
      .finally(() => setLoading(false));
  }, [date, token]);

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-stone-900">Attendance Records</h1>
          <p className="text-sm text-stone-500">View and monitor teacher attendance for any day.</p>
        </div>

        <label className="mb-4 block max-w-xs">
          <span className="text-sm text-stone-600">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </label>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}
        {loading && <p className="text-sm text-stone-400">Loading…</p>}

        {!loading && records.length === 0 && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No attendance records for this date.
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-stone-200 bg-surface text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th className="px-4 py-3">Teacher</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check-in</th>
                    <th className="px-4 py-3">Check-out</th>
                    <th className="hidden px-4 py-3 md:table-cell">Geofence</th>
                    <th className="hidden px-4 py-3 lg:table-cell">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">
                          {r.teacher?.firstName} {r.teacher?.lastName}
                        </p>
                        <p className="text-xs text-stone-400">{r.teacher?.employeeId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_COLORS[r.status] ?? 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{fmtTime(r.checkInTime)}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {r.checkOutTime ? fmtTime(r.checkOutTime) : (
                          <span className="text-xs text-warning">Missing</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <span className="text-xs">
                          {geoLabel(r.checkInGeofenceStatus)}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <span className={`text-xs ${r.riskScore > 40 ? 'text-warning' : 'text-stone-500'}`}>
                          {r.riskScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
