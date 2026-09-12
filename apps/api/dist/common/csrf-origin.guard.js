"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfOriginGuard = void 0;
class CsrfOriginGuard {
    allowedOrigins;
    constructor(allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }
    use(req, res, next) {
        const method = req.method.toUpperCase();
        if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            next();
            return;
        }
        const origin = req.headers.origin;
        if (!origin) {
            next();
            return;
        }
        const allowed = this.allowedOrigins.map((o) => o.toLowerCase().replace(/\/+$/, '')).includes(origin.toLowerCase()) ||
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
exports.CsrfOriginGuard = CsrfOriginGuard;
//# sourceMappingURL=csrf-origin.guard.js.map