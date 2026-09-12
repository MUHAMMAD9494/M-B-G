"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redactSensitive = redactSensitive;
exports.redactSensitiveString = redactSensitiveString;
const SENSITIVE_PATTERNS = [
    /(authorization\s*[:=]\s*)(bearer\s+)?[a-zA-Z0-9._~+/=-]{8,}/gi,
    /(cookie\s*[:=]\s*)[^;\s,]{4,}/gi,
    /\b(x-api-key|x-auth-token)\s*[:=]\s*[a-zA-Z0-9._-]{8,}/gi,
    /(?:"?password"?\s*[:=]\s*["']?)[^"'&\s,;]{1,}/gi,
    /(?:"?(?:access_token|refresh_token|id_token|jwt|secret|token|apikey|api_key|client_secret|private[_-]?key)"?\s*[:=]\s*["']?)[^"'&\s,;]{6,}/gi,
    /data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=]{20,}/gi,
    /\b(?:face|frame|embedding|embedding_hash|liveness_response|biometric)(?:_?\w*)\s*[:=]\s*["']?[a-zA-Z0-9+/=]{16,}/gi,
    /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{6,}/gi,
    /\b[a-zA-Z0-9+/]{200,}={0,2}\b/g,
];
const REDACTED = '[REDACTED]';
function redactSensitive(value) {
    if (typeof value === 'string') {
        let out = value;
        for (const pattern of SENSITIVE_PATTERNS) {
            out = out.replace(pattern, (_m, p1) => (p1 ? `${p1}${REDACTED}` : REDACTED));
        }
        return out;
    }
    if (Array.isArray(value))
        return value.map((v) => redactSensitive(v));
    if (value !== null && typeof value === 'object') {
        const out = {};
        for (const [k, v] of Object.entries(value)) {
            const key = k.toLowerCase();
            if (/password|token|secret|authorization|cookie|embedding|face|frame|biometric|dataurl|base64|liveness/.test(key)) {
                out[k] = REDACTED;
            }
            else {
                out[k] = redactSensitive(v);
            }
        }
        return out;
    }
    return value;
}
function redactSensitiveString(value) {
    return String(redactSensitive(value));
}
//# sourceMappingURL=log-sanitizer.js.map