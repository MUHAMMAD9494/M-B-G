'use client';

import { Suspense, useEffect, useState } from 'react';
import Shell from '@/components/Shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useRouter, useSearchParams } from 'next/navigation';

interface Teacher {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  designation: string | null;
  employmentStatus: string;
  branchId: string | null;
}

interface FormState {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
}

const EMPTY: FormState = {
  employeeId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  department: '',
  designation: '',
};

function TeacherForm() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get('edit');

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editId || !token) return;
    api
      .get<Teacher>(`/teachers/${editId}`, token)
      .then((t) =>
        setForm({
          employeeId: t.employeeId,
          firstName: t.firstName,
          lastName: t.lastName,
          email: t.email ?? '',
          phone: t.phone ?? '',
          department: t.department ?? '',
          designation: t.designation ?? '',
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load teacher.'));
  }, [editId, token]);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        employeeId: form.employeeId.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (form.department.trim()) payload.department = form.department.trim();
      if (form.designation.trim()) payload.designation = form.designation.trim();

      if (editId) {
        await api.patch(`/teachers/${editId}`, payload, token ?? undefined);
      } else {
        await api.post('/teachers', payload, token ?? undefined);
      }
      router.push('/teachers');
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
          <h1 className="font-display text-2xl text-stone-900">
            {editId ? 'Edit Teacher' : 'Add Teacher'}
          </h1>
          <p className="text-sm text-stone-500">
            {editId ? 'Update teacher profile information.' : 'Register a new teacher in your school.'}
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-stone-600">
              Employee ID <span className="text-danger">*</span>
              <input
                type="text"
                required
                value={form.employeeId}
                onChange={(e) => set('employeeId', e.target.value)}
                placeholder="TCH-2024-001"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              Designation
              <input
                type="text"
                value={form.designation}
                onChange={(e) => set('designation', e.target.value)}
                placeholder="Mathematics Teacher"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              First name <span className="text-danger">*</span>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              Last name <span className="text-danger">*</span>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="teacher@school.edu.ng"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              Phone
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+2348012345678"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="block text-sm text-stone-600">
              Department
              <input
                type="text"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="Science"
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : editId ? 'Update Teacher' : 'Add Teacher'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/teachers')}
              className="rounded-lg border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Shell>
  );
}

export default function TeacherFormPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-stone-400">Loading…</div>}>
      <TeacherForm />
    </Suspense>
  );
}
