'use client';

import { useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

export default function ChangePasswordPage() {
  const { token, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      await api.post(
        '/auth/change-password',
        { currentPassword, newPassword },
        token ?? undefined,
      );
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password change failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-sm">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-stone-900">Change Password</h1>
          <p className="text-sm text-stone-500">
            Update your password. You will need to sign in again after changing it.
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-6">
            <p className="mb-4 text-sm text-success">Password changed successfully.</p>
            <button
              onClick={() => logout()}
              className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Sign in again
            </button>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="rounded-2xl border border-stone-200 bg-white p-6"
          >
            {error && (
              <p className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <label className="block text-sm text-stone-600">
              Current password
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="mt-4 block text-sm text-stone-600">
              New password
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <label className="mt-4 block text-sm text-stone-600">
              Confirm new password
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="mt-6 w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}
