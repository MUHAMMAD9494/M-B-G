// Nexora Smart Edu — server-side middleware.
//
// Auth is handled entirely client-side via sessionStorage + Bearer tokens
// (see apps/web/lib/auth.tsx and apps/web/components/Shell.tsx).
// The Shell component redirects unauthenticated users to /login.
//
// A previous version checked for the `nse_access` cookie here, but that
// only works when the API and frontend share the same domain (cookies are
// domain-scoped). In the Vercel + Railway deployment, the API sets cookies
// on the Railway domain, which the Vercel frontend cannot read.
//
// We keep this middleware file for future server-side logic (e.g., i18n
// redirects, feature flags) but currently pass all requests through.
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Match all app routes — currently a pass-through.
  matcher: [
    '/dashboard/:path*',
    '/teachers/:path*',
    '/reports/:path*',
    '/attendance/:path*',
    '/teacher/:path*',
  ],
};
