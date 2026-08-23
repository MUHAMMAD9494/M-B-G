'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface ReportSummary {
  summary: { totalTeachers: string; present: number; late: number; early: number; absent: number };
}

export default function ReportsPage() {
  const { token } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    setError(null);
    api
      .get<ReportSummary>(`/reports/daily?date=${date}`, token ?? undefined)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report.'))
      .finally(() => setLoading(false));
  }, [date, token]);

  async function exportCsv() {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/reports/export/csv?startDate=${date}&endDate=${date}`,
      '_blank',
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Reports</h1>
            <p className="text-sm text-stone-500">Daily attendance roll-ups and exports.</p>
          </div>
          <button
            onClick={exportCsv}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Export CSV
          </button>
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
        {loading && <p className="text-sm text-stone-400">Loading report…</p>}

        {report && !loading && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            {[
              { label: 'Total teachers', value: report.summary.totalTeachers, tone: 'text-stone-900' },
              { label: 'Present', value: report.summary.present, tone: 'text-success' },
              { label: 'Late', value: report.summary.late, tone: 'text-warning' },
              { label: 'Early', value: report.summary.early, tone: 'text-warning' },
              { label: 'Absent', value: report.summary.absent, tone: 'text-stone-500' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-stone-200 bg-white p-5">
                <p className={`text-3xl font-semibold ${c.tone}`}>{c.value}</p>
                <p className="mt-1 text-sm text-stone-500">{c.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
