'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

// Demo credentials are only rendered when explicitly enabled at build time
// (NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true'). Never ship them by default.
const SHOW_DEMO_CREDS = process.env.NEXT_PUBLIC_SHOW_DEMO_CREDS === 'true';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      router.replace(u.role === 'TEACHER' || u.role === 'STAFF' ? '/teacher/attendance' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="font-display text-2xl tracking-tight text-stone-900">Nexora Smart Edu</p>
          <p className="mt-1 text-sm text-stone-500">Teacher attendance &amp; workforce management</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-base font-semibold text-stone-900">Sign in</h1>

          <label className="mt-5 block text-sm text-stone-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="you@school.edu.ng"
            />
          </label>

          <label className="mt-4 block text-sm text-stone-600">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="••••••••"
            />
          </label>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          {SHOW_DEMO_CREDS && (
            <p className="mt-4 text-xs text-stone-500">
              Demo: super@nexora.dev / SuperAdmin@2024!
            </p>
          )}
        </form>
      </div>
    </main>
  );
}
