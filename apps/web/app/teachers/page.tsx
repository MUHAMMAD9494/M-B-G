'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  department: string | null;
  designation: string | null;
  email: string | null;
  employmentStatus: string;
}

export default function TeachersPage() {
  const { token } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: Teacher[]; meta: { total: number } }>('/teachers?limit=100', token ?? undefined)
      .then((r) => setTeachers(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load teachers.'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-stone-900">Teachers</h1>
          <p className="text-sm text-stone-500">Your teaching workforce and assignments.</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No teachers yet. Teachers appear here once added by an administrator.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-surface text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Employee ID</th>
                  <th className="hidden px-4 py-3 md:table-cell">Department</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">
                        {t.firstName} {t.lastName}
                      </p>
                      <p className="text-xs text-stone-400">{t.email ?? t.designation ?? ''}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-stone-600 sm:table-cell">{t.employeeId}</td>
                    <td className="hidden px-4 py-3 text-stone-600 md:table-cell">
                      {t.department ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          t.employmentStatus === 'ACTIVE'
                            ? 'bg-success-soft text-success'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {t.employmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
