# Nexora Smart Edu — Security

## Authentication

- **Passwords**: bcrypt (`bcryptjs`, 12 rounds) via `PasswordService`.
- **Access tokens**: short-lived JWT (15 min default), signed with `JWT_SECRET`.
- **Refresh tokens**: opaque 48-byte random values; only the SHA-256 hash is
  stored (`refresh_tokens.token_hash`). Rotation on every refresh; old token is
  revoked.
- **Delivery**: HTTP-only cookies `nse_access` / `nse_refresh`,
  `SameSite=Lax`, `Secure` in production. Bearer fallback supported.
- **Lockout**: 5 failed login attempts → 15-minute lock (`locked_until`).

## Authorization (RBAC)

- 8 roles (`SUPER_ADMIN` … `STAFF`) mapped to 19 granular permissions
  (`school.read`, `attendance.correct`, …).
- `PermissionsGuard` enforces `@Permissions(...)` on every admin route.
- `SUPER_ADMIN` holds all permissions; tenant admins hold everything within
  their school scope.

## Multi-tenant isolation

1. **Application checks** — every service validates `actor.schoolId` against the
   target entity and scopes queries.
2. **PostgreSQL RLS** — `app.tenant_policy()` filters rows per transaction using
   `current_setting('app.school_id')`; super admins bypass via `app.is_super`.
3. **Least privilege** — `nexora_app` role has DML only, no DDL/superuser.

A dedicated test (`test/tenant-isolation.spec.ts`) verifies cross-tenant access
is blocked at the application layer. It must pass before any release.

## Input & output

- Global `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`.
- `class-validator` decorators on every DTO.
- Responses always go through `HttpExceptionFilter` → consistent, safe envelope
  that never leaks stack traces.
- `passwordHash`, `tokenHash`, and biometric `embeddingHash` are never returned
  by any controller (the `toDto` mappers exclude them).

## Transport & headers

- `helmet` security headers.
- CORS restricted to `CORS_ORIGIN` (default `http://localhost:3000`), with
  credentials enabled.
- `trust proxy` configurable for reverse-proxy deployments.

## Rate limiting

`@nestjs/throttler`:
- `standard`: 300 requests / minute.
- `auth`: 10 requests / minute (login, refresh).

## Audit & non-repudiation

- Append-only `audit_logs` for login/logout, CRUD, corrections, sync, settings.
- Correction flows record `old_value` and `new_value`.
- Attendance status is derived deterministically (server timestamp + geofence +
  verification), and raw events are retained in `attendance_events` for tamper
  analysis.

## Biometric privacy

- Only hashed/encrypted **template references** are stored — never raw images.
- The V1 `DevBiometricProvider` is explicitly **development-only** (SHA-256 of
  image data) and must be replaced before production use.
- Liveness results are recorded as statuses, not biometric payloads.

## Secrets

- Secrets come from environment variables (`DATABASE_URL`, `JWT_SECRET`,
  `JWT_REFRESH_SECRET`). In production they are **required** (the app fails
  fast without them); dev-only defaults are clearly labelled and never used in
  production.
- `.env` is gitignored; `.env.example` holds placeholder values only.
