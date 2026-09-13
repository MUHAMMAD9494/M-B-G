'use client';

import { useCallback, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  phone: string | null;
}

const ROLES = ['SCHOOL_ADMIN', 'TEACHER', 'STAFF'];

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Add form
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addFirst, setAddFirst] = useState('');
  const [addLast, setAddLast] = useState('');
  const [addRole, setAddRole] = useState('TEACHER');

  const loadUsers = useCallback(() => {
    setLoading(true);
    api
      .get<{ data: User[]; meta: { total: number } }>('/users?limit=100', token ?? undefined)
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load users.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(
        '/users',
        {
          email: addEmail.trim(),
          password: addPassword,
          firstName: addFirst.trim(),
          lastName: addLast.trim(),
          role: addRole,
        },
        token ?? undefined,
      );
      setShowAdd(false);
      setAddEmail('');
      setAddPassword('');
      setAddFirst('');
      setAddLast('');
      setAddRole('TEACHER');
      loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add user.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(u: User) {
    setTogglingId(u.id);
    setError(null);
    try {
      const endpoint = u.status === 'ACTIVE' ? 'disable' : 'enable';
      await api.post(`/users/${u.id}/${endpoint}`, {}, token ?? undefined);
      setUsers((prev) =>
        prev.map((x) =>
          x.id === u.id ? { ...x, status: x.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' } : x,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status change failed.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-container">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl text-stone-900">Users</h1>
            <p className="text-sm text-stone-500">Manage user accounts and roles.</p>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
          >
            {showAdd ? 'Cancel' : 'Add User'}
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {showAdd && (
          <form
            onSubmit={addUser}
            className="mb-6 rounded-2xl border border-accent/30 bg-accent-soft/30 p-6"
          >
            <h2 className="mb-4 text-base font-semibold text-stone-900">New User</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-sm text-stone-600">
                Email <span className="text-danger">*</span>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Password <span className="text-danger">*</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Role <span className="text-danger">*</span>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-stone-600">
                First name <span className="text-danger">*</span>
                <input
                  type="text"
                  required
                  value={addFirst}
                  onChange={(e) => setAddFirst(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <label className="block text-sm text-stone-600">
                Last name <span className="text-danger">*</span>
                <input
                  type="text"
                  required
                  value={addLast}
                  onChange={(e) => setAddLast(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-stone-400">Loading…</p>
        ) : users.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center text-sm text-stone-400">
            No users found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-surface text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="hidden px-4 py-3 md:table-cell">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-stone-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.status === 'ACTIVE'
                            ? 'bg-success-soft text-success'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.status !== 'pending' && (
                        <button
                          onClick={() => toggleStatus(u)}
                          disabled={togglingId === u.id}
                          className="text-xs font-medium text-stone-500 hover:text-stone-700 disabled:opacity-50"
                        >
                          {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      )}
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
