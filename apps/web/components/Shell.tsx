'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/teachers', label: 'Teachers' },
  { href: '/reports', label: 'Reports' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-stone-400">Loading…</div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="border-b border-stone-200 px-5 py-5">
          <p className="font-display text-lg leading-tight text-stone-900">Nexora</p>
          <p className="text-xs text-stone-500">Smart Edu</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-200 p-4">
          <p className="truncate text-sm font-medium text-stone-800">
            {user.firstName} {user.lastName}
          </p>
          <p className="truncate text-xs text-stone-500">{user.email}</p>
          <button
            onClick={() => logout().then(() => router.replace('/login'))}
            className="mt-3 w-full rounded-lg border border-stone-200 px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-4 py-3 md:px-8">
            <p className="font-display text-base text-stone-900 md:hidden">Nexora Smart Edu</p>
            <p className="hidden text-sm text-stone-500 md:block">
              {user.role.replace(/_/g, ' ').toLowerCase()}
            </p>
            <div className="text-xs font-medium uppercase tracking-wide text-accent">
              {user.schoolId ? 'School' : 'Platform'}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
