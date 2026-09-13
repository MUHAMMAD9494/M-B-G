'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
  const { token, user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const isAdmin = user?.role && !['TEACHER', 'STAFF'].includes(user.role);

  const loadTeachers = useCallback(() => {
    api
      .get<{ data: Teacher[]; meta: { total: number } }>('/teachers?limit=100', token ?? undefined)
      .then((r) => setTeachers(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load teachers.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  async function toggleStatus(t: Teacher) {
    setToggling(t.id);
    try {
      const newStatus = t.employmentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(
        `/teachers/${t.id}`,
        { employmentStatus: newStatus },
        token ?? undefined,
      );
      setTeachers((prev) =>
        prev.map((x) => (x.id === t.id ? { ...x, employmentStatus: newStatus } : x)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status change failed.');
    } finally {
      setToggling(null);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Teachers</h1>
            <p className="text-sm text-stone-500">Your teaching workforce and assignments.</p>
          </div>
          {isAdmin && (
            <Link
              href="/teachers/form"
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Add Teacher
            </Link>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : teachers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No teachers yet. Click &ldquo;Add Teacher&rdquo; to register your first teacher.
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
                  {isAdmin && <th className="px-4 py-3">Actions</th>}
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
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/teachers/form?edit=${t.id}`}
                            className="text-xs font-medium text-accent hover:underline"
                          >
                            Edit
                          </Link>
                          <button
                            onClick={() => toggleStatus(t)}
                            disabled={toggling === t.id}
                            className="text-xs font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50"
                          >
                            {t.employmentStatus === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    )}
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
