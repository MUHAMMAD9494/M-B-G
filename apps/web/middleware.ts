// Nexora Smart Edu — server-side auth guard (cookie presence check only).
//
// The API signs in with httpOnly cookies named `nse_access` / `nse_refresh`
// (see apps/api/src/auth/auth.controller.ts). This middleware blocks unauthenticated
// requests to app routes before any client code runs. It deliberately does NOT
// verify the JWT — that stays with the API — so a redirect here only means
// "no session cookie present", which is the correct boundary for a client app.
import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'nse_access';

export function middleware(req: NextRequest) {
  if (req.cookies.has(AUTH_COOKIE)) {
    return NextResponse.next();
  }

  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Only these route prefixes are guarded. Everything else — '/', '/login',
  // static assets, icons, manifest, sw.js — is implicitly whitelisted because
  // it never matches.
  matcher: [
    '/dashboard/:path*',
    '/teachers/:path*',
    '/reports/:path*',
    '/attendance/:path*',
    '/teacher/:path*',
  ],
};