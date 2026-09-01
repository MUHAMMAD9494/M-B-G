'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';

const AUTH_KEY = 'nexora_auth_user';
function hasCachedSession(): boolean {
  try { return !!sessionStorage.getItem(AUTH_KEY); } catch { return false; }
}
import { LayoutDashboard, CalendarCheck, Users, BarChart3, ScanFace, Smartphone } from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/teachers', label: 'Teachers', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const TEACHER_NAV = [
  { href: '/teacher/attendance', label: 'Mobile attendance', icon: Smartphone },
  { href: '/teacher/enroll', label: 'Enrollment', icon: ScanFace },
];

const MOBILE_BOTTOM_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/teacher/attendance', label: 'Clock', icon: CalendarCheck },
  { href: '/teacher/enroll', label: 'Enroll', icon: ScanFace },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

const TEACHER_BOTTOM_NAV = [
  { href: '/teacher/attendance', label: 'Clock', icon: CalendarCheck },
  { href: '/teacher/enroll', label: 'Enroll', icon: ScanFace },
];

const isTeacherRole = (role: string) => role === 'TEACHER' || role === 'STAFF';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user && !hasCachedSession()) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-stone-500">Loading…</div>;
  }
  if (!user) return null;

  const teacherOnly = isTeacherRole(user.role);
  const desktopNav = teacherOnly ? TEACHER_NAV : [...NAV, ...TEACHER_NAV];
  const bottomNav = teacherOnly ? TEACHER_BOTTOM_NAV : MOBILE_BOTTOM_NAV;

  const isNavActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-surface pb-16 md:pb-0">
      {/* Skip to content (WCAG 2.4.1 Bypass Blocks) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-accent focus:shadow"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="border-b border-stone-200 px-5 py-5">
          <p className="font-display text-lg leading-tight text-stone-900">Nexora</p>
          <p className="text-xs text-stone-500">Smart Edu</p>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {desktopNav.map((item) => {
            const active = isNavActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-accent-soft font-medium text-accent'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <item.icon size={16} className="shrink-0" />
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
        <main id="main-content" className="px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav aria-label="Secondary" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white md:hidden">
        {bottomNav.map((item) => {
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition ${
                active ? 'text-accent' : 'text-stone-500'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}