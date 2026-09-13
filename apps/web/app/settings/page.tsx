'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface School {
  id: string;
  name: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  workingDays: number[];
  lateThresholdMinutes: number;
  earlyDepartureThresholdMinutes: number;
  status: string;
}

const DAY_LABELS: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' };

export default function SchoolSettingsPage() {
  const { token } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Edit form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lateMin, setLateMin] = useState(15);
  const [earlyMin, setEarlyMin] = useState(30);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);

  useEffect(() => {
    api
      .get<School>('/schools/me', token ?? undefined)
      .then((s) => {
        setSchool(s);
        setName(s.name);
        setAddress(s.address ?? '');
        setPhone(s.phone ?? '');
        setEmail(s.email ?? '');
        setLateMin(s.lateThresholdMinutes);
        setEarlyMin(s.earlyDepartureThresholdMinutes);
        setWorkingDays(s.workingDays ?? [1, 2, 3, 4, 5]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load school.'))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleDay(day: number) {
    setWorkingDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort());
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.patch<School>(
        '/schools/me',
        {
          name: name.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          lateThresholdMinutes: lateMin,
          earlyDepartureThresholdMinutes: earlyMin,
          workingDays,
        },
        token ?? undefined,
      );
      setSchool(updated);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-stone-900">School Settings</h1>
          <p className="text-sm text-stone-500">Configure your school profile and attendance rules.</p>
        </div>

        {loading && <p className="text-sm text-stone-400">Loading…</p>}
        {error && !loading && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {school && (
          <form onSubmit={save} className="space-y-6">
            {/* School Profile */}
            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-stone-900">School Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-stone-600">
                  School name
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="block text-sm text-stone-600">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="block text-sm text-stone-600 sm:col-span-2">
                  Address
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="block text-sm text-stone-600">
                  Phone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <div className="text-sm text-stone-600">
                  Timezone
                  <p className="mt-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-stone-800">
                    {school.timezone}
                  </p>
                </div>
              </div>
            </section>

            {/* Attendance Rules */}
            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-stone-900">Attendance Rules</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-stone-600">
                  Late threshold (minutes after start)
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={lateMin}
                    onChange={(e) => setLateMin(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
                <label className="block text-sm text-stone-600">
                  Early departure threshold (minutes before end)
                  <input
                    type="number"
                    min={0}
                    max={240}
                    value={earlyMin}
                    onChange={(e) => setEarlyMin(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </label>
              </div>
              <div className="mt-4">
                <p className="mb-2 text-sm text-stone-600">Working days</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        workingDays.includes(day)
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-stone-300 text-stone-500 hover:bg-stone-100'
                      }`}
                    >
                      {DAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Geofence Info */}
            <section className="rounded-2xl border border-stone-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-stone-900">Geofence</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Define the authorized attendance area. Teachers must be within this zone to check in.
                  </p>
                </div>
                <a
                  href="/geofences"
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
                >
                  Configure
                </a>
              </div>
            </section>

            {success && (
              <p className="rounded-lg bg-success-soft px-4 py-3 text-sm text-success">Settings saved.</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}
