/**
 * Log sanitizer — defense-in-depth against sensitive data in logs.
 *
 * Never log: biometric images/face embeddings, attendance payloads,
 * passwords, access tokens, cookies.
 *
 * Use redactSensitive(v) on EVERY string that is written to a log,
 * including exception messages and stack traces (PostgreSQL and third-party
 * errors occasionally embed query fragments).
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  // Authorization / Bearer / Basic tokens
  /(authorization\s*[:=]\s*)(bearer\s+)?[a-zA-Z0-9._~+/=-]{8,}/gi,
  /(cookie\s*[:=]\s*)[^;\s,]{4,}/gi,
  /\b(x-api-key|x-auth-token)\s*[:=]\s*[a-zA-Z0-9._-]{8,}/gi,
  // Passwords (any nesting depth, quoted or not)
  /(?:"?password"?\s*[:=]\s*["']?)[^"'&\s,;]{1,}/gi,
  // Tokens / secrets / keys
  /(?:"?(?:access_token|refresh_token|id_token|jwt|secret|token|apikey|api_key|client_secret|private[_-]?key)"?\s*[:=]\s*["']?)[^"'&\s,;]{6,}/gi,
  // Biometric payloads: base64 JPEG/PNG data URLs, face frames
  /data:image\/(?:jpeg|png|webp|gif);base64,[a-zA-Z0-9+/=]{20,}/gi,
  /\b(?:face|frame|embedding|embedding_hash|liveness_response|biometric)(?:_?\w*)\s*[:=]\s*["']?[a-zA-Z0-9+/=]{16,}/gi,
  // JWT-shaped payloads (three dot-separated base64url segments)
  /\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{6,}/gi,
  // Generic long base64 blobs (image frames sent as base64 without prefix)
  /\b[a-zA-Z0-9+/]{200,}={0,2}\b/g,
];

const REDACTED = '[REDACTED]';

export function redactSensitive(value: unknown): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      out = out.replace(pattern, (_m, p1?: string) => (p1 ? `${p1}${REDACTED}` : REDACTED));
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redactSensitive(v));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const key = k.toLowerCase();
      // Per-field redaction for named sensitive keys at any depth.
      if (
        /password|token|secret|authorization|cookie|embedding|face|frame|biometric|dataurl|base64|liveness/.test(
          key,
        )
      ) {
        out[k] = REDACTED;
      } else {
        out[k] = redactSensitive(v);
      }
    }
    return out;
  }
  return value;
}

export function redactSensitiveString(value: string): string {
  return String(redactSensitive(value));
}