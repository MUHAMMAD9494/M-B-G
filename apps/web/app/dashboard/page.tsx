'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface Summary {
  PRESENT: number;
  LATE: number;
  EARLY: number;
  ABSENT: number;
  PENDING_REVIEW: number;
  INVALID: number;
}

const CARDS: { key: keyof Summary; label: string; tone: string }[] = [
  { key: 'PRESENT', label: 'Present', tone: 'text-success' },
  { key: 'LATE', label: 'Late', tone: 'text-warning' },
  { key: 'EARLY', label: 'Early departure', tone: 'text-warning' },
  { key: 'ABSENT', label: 'Absent', tone: 'text-stone-500' },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Summary>('/attendance/today-summary', token ?? undefined)
      .then(setSummary)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load summary.'));
  }, [token]);

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-stone-900">Today&apos;s attendance</h1>
          <p className="text-sm text-stone-500">Live roll-up across your teaching workforce.</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {!summary && !error ? (
          <p className="text-sm text-stone-400">Loading summary…</p>
        ) : summary ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {CARDS.map((c) => (
              <div key={c.key} className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className={`text-3xl font-semibold ${c.tone}`}>{summary[c.key]}</p>
                <p className="mt-1 text-sm text-stone-500">{c.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
