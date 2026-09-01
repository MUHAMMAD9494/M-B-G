'use client';

import { useEffect } from 'react';

/**
 * Registers the PWA service worker (/sw.js) with scope '/' once the page
 * has loaded. Only runs in production over a secure context (HTTPS or
 * localhost) — never in development, where hot-reload clobbers caching.
 */
export default function SWRegister() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      process.env.NODE_ENV === 'development' ||
      !('serviceWorker' in navigator) ||
      !window.isSecureContext
    ) {
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[SWRegister] Service worker registration failed:', err);
        });
    });
  }, []);

  return null;
}