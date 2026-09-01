import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF defense for cookie-authenticated requests.
 *
 * Angular/Next.js clients send `Origin` on same-origin fetch/XHR; cross-site
 * requests carry a different Origin (or none for some legacy flows). This
 * guard rejects state-changing requests whose Origin is present but does not
 * match the configured CORS_ORIGIN list. Combined with SameSite=Lax/Strict
 * cookies (set by the auth service) this blocks cross-site request forgery
 * without CSRF token choreography.
 *
 * Bearer-token requests (no cookies involved) are not affected: they carry no
 * Origin check risk since the token must be exfiltrated first.
 */
export class CsrfOriginGuard implements NestMiddleware {
  constructor(private readonly allowedOrigins: string[]) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const method = req.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      next();
      return;
    }
    const origin = req.headers.origin;
    if (!origin) {
      // No Origin header (non-browser client, or same-origin GET-like fetch
      // without CORS). Cookies are SameSite-protected; allow.
      next();
      return;
    }
    const allowed =
      this.allowedOrigins.map((o) => o.toLowerCase().replace(/\/+$/, '')).includes(origin.toLowerCase()) ||
      origin.toLowerCase() === `http://localhost:${req.socket.localPort}`;
    if (allowed) {
      next();
      return;
    }
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Cross-origin requests are not allowed.' },
    });
  }
}