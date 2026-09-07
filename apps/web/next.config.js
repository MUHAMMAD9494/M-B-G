/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Workspace packages are plain TypeScript (no prebuilt ESM) and must be
  // compiled by Next.js's own bundler instead of being treated as external deps.
  transpilePackages: [
    '@nexora/types',
    '@nexora/config',
    '@nexora/utils',
    '@nexora/validation',
  ],

  // Security headers (HTTP response hardening): CSP, XFO, nosniff,
  // referrer-policy. TLS itself is terminated at Cloudflare/edge.
  async headers() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    // CSP connect-src requires an origin, not a full URL with path.
    // Strip the path so https://host/api/v1 becomes https://host
    let apiOrigin;
    try {
      const parsed = new URL(apiUrl);
      apiOrigin = parsed.origin;
    } catch {
      apiOrigin = apiUrl;
    }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              `connect-src 'self' ${apiOrigin}`,
              "media-src 'self' blob:",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Deployment: standalone output for Docker containerisation (see infrastructure/deploy/dockerfile.web).
  // NOT set for local dev — standalone mode changes the output structure.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),

  // Source maps are unnecessary for a production bundle and balloon memory.
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
