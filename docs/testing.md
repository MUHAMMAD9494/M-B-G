# Nexora Smart Edu — Testing

## Structure

Tests live alongside source (`*.spec.ts`) plus a security-focused suite in
`src/test/`:

```
apps/api/src/
  attendance/attendance-status.calculator.spec.ts   # pure status logic
  rbac/rbac.service.spec.ts                         # role→permission map
  auth/auth.service.spec.ts                         # login/lockout (mocked repos)
  test/tenant-isolation.spec.ts                     # CRITICAL security test
```

## Running

```bash
pnpm test               # unit tests (jest --runInBand)
pnpm test:e2e           # e2e (requires running DB)
```

## Coverage expectations

- **Status calculator** — pure, exhaustive: PRESENT/LATE/EARLY/INVALID/
  PENDING_REVIEW for both check-in and check-out.
- **RBAC** — SUPER_ADMIN (all), TEACHER (self-service only), SCHOOL_ADMIN
  (tenant admin), unknown role (empty).
- **Auth service** — login success, unknown user, wrong password (counter),
  lockout, disabled account.
- **Tenant isolation** — cross-tenant read/update/disable are blocked; super
  admin can access any tenant by design.

## Critical security test

`src/test/tenant-isolation.spec.ts` is marked:

```
// CRITICAL SECURITY TEST — must pass before any release.
```

It verifies that a user from School A **cannot** read, update, or disable
resources belonging to School B at the application layer. This is the last line
of defense in addition to PostgreSQL RLS. It must be green before any release.

## CI

`.github/workflows/ci.yml` runs `pnpm lint`, `pnpm typecheck`, `pnpm test`,
and builds both API and web on every push/PR to `main`/`develop`.
