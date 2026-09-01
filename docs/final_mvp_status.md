# Nexora Smart Edu (NSE) — Final MVP Status

**Date:** 2026-08-24
**Scope:** V1 — Teacher Attendance & Workforce Management (multi-tenant)
**Stack:** Next.js 14 (App Router) + NestJS modular monolith + PostgreSQL (TypeORM) + pnpm monorepo

---

## 1. Executive Summary

The V1 MVP is **buildable, runnable, and verified end-to-end**. Both servers compile and boot, the database is seeded and reachable, authentication returns a full permission set, and every protected data endpoint (users, teachers, attendance, branches, geofences, reports) returns real data from PostgreSQL. All five frontend pages serve HTTP 200 and call the real API — none are hardcoded demo pages.

The single most important honesty note: **biometric verification is a development adapter only.** It does *not* perform real facial recognition or liveness detection, and it must never be presented as such.

---

## 2. IMPLEMENTED (working, verified)

### Backend (NestJS modular monolith — 13 modules, 40+ routes)

| Area | Detail |
|---|---|
| **Auth** | Login, logout, refresh (rotation), `/auth/me`, change-password. JWT access + opaque refresh tokens (SHA-256 hash stored). HTTP-only cookies (`nse_access`/`nse_refresh`, SameSite=Lax) with Bearer fallback. bcrypt hashing. 5-failed-attempt lockout (15 min). |
| **Rate limiting** | `@nestjs/throttler` — 300/min standard, 10/min on auth. |
| **RBAC** | 8 roles (SUPER_ADMIN, SCHOOL_OWNER, SCHOOL_ADMIN, HR_ADMIN, PRINCIPAL, VICE_PRINCIPAL, TEACHER, STAFF), 20 granular permissions, 72 role↔permission mappings. `PermissionsGuard` enforces server-side (never frontend-only). |
| **Multi-tenancy** | PostgreSQL Row-Level Security via a least-privilege `nexora_app` role + `SET LOCAL app.school_id` per transaction (`TenantScopeService`). Every tenant entity carries `school_id`. Defense-in-depth with app-level checks. |
| **Database** | 17 tables, `V1__initial_schema.sql` migration (schema + RLS policies + app role), composite indexes, foreign keys, soft delete on teachers. |
| **Teachers** | Full CRUD + soft delete + branch/department/employment fields. |
| **Attendance** | Check-in/check-out, `/attendance/today-summary`, `/attendance/sync` (offline ingest), status calculator (pure/injectable, unit-tested), append-only event stream table. |
| **Geofencing** | Geofence CRUD (lat/lng/radius/active), haversine distance check, GPS accuracy recorded. |
| **Reports** | Daily / weekly / monthly roll-ups, teacher history, CSV export. |
| **Audit** | Append-oriented audit log (LOGIN, USER_*, TEACHER_*, ATTENDANCE_*, etc.). |
| **Devices / Settings / Notifications / Health** | Device identity, system settings, notification-preference stubs, `/health` + `/health/database`. |

### Frontend (Next.js 14, App Router, Tailwind)

| Page | Status |
|---|---|
| `/login` | Real login → cookie session → redirect. |
| `/dashboard` | Live today-summary (present/late/early/absent) from `/attendance/today-summary`. |
| `/attendance` | GPS capture + geofence status + offline queue (IndexedDB) + check-in/out. |
| `/teachers` | Teacher list from `/teachers`. |
| `/reports` | Daily report + CSV export from `/reports/*`. |

All pages use `lib/api.ts` (fetch wrapper) + `lib/auth.tsx` (AuthProvider) — **no hardcoded demo data**.

### Offline-first

`lib/idb.ts` implements an IndexedDB-backed attendance queue with sync states (PENDING/SYNCING/SYNCED/FAILED/CONFLICT) and a `/attendance/sync` ingestion endpoint.

### Tests

22 tests passing: attendance-status calculator (8), RBAC service (4), auth service (5), and the **critical tenant-isolation test** (5) proving School A cannot read School B data.

### Docs

ARCHITECTURE, DATABASE, API, SECURITY, DEPLOYMENT, OFFLINE_SYNC, BIOMETRIC, TESTING + README + this status doc.

---

## 3. PARTIALLY IMPLEMENTED

| Area | What exists | What's missing |
|---|---|---|
| **Biometric verification** | `BiometricProvider` interface + enrollment/verify/delete endpoints + `DevBiometricProvider` (SHA-256 of image bytes as a pseudo-embedding). | Real face embedding extraction, real matching threshold logic, production-grade storage. |
| **Liveness / anti-spoofing** | Provider abstraction (`livenessCheck()`), schema columns (`livenessStatus`). | Any actual liveness detection (blink/head-motion challenge, passive liveness model). |
| **Offline sync** | IndexedDB queue + sync endpoint + retry-able FAILED state. | Full conflict-resolution UX, encrypted local storage of sensitive data, automatic background sync worker. |
| **Dashboard** | Today-summary cards. | Trend charts, recent-events feed, exceptions list, pending-sync indicator (full spec). |
| **Admin attendance table** | Read/list endpoint exists. | Full server-side filtering/sorting/pagination UI (date/teacher/branch/status/verification/sync). |
| **Notifications** | Preference stubs + pluggable event abstraction. | Actual email/SMS/WhatsApp/push providers (intentionally deferred per V1 constraints). |

---

## 4. NOT IMPLEMENTED (deferred / future)

- **Real facial recognition / liveness** — only the dev adapter exists. See §5.
- **Real notification delivery** — no email/SMS/push providers wired.
- **PostGIS** — schema is migration-ready (lat/lng + radius columns) but distance is computed with a haversine abstraction, not PostGIS.
- **Redis** — **not in Docker Compose** (`infrastructure/docker/docker-compose.dev.yml` defines only a `postgres` service). A local `nexora-redis` container may exist on developer machines, but it is **not part of Compose** and is **not used** in V1 (per constraints).
- **PWA service worker** — deferred (constraint: "DO NOT install next-pwa during Phase 1").
- **PDF/Excel exports** — CSV only (Excel/PDF are future).
- **All non-attendance modules** — students, parents, fees, results, timetable, payroll, transport, etc. (explicitly out of V1 scope).

---

## 5. KNOWN LIMITATIONS

1. **Biometric is NOT production facial recognition.** The `DevBiometricProvider` hashes image bytes (SHA-256) to produce a pseudo-embedding and compares hashes. It is a **stand-in to exercise the enrollment/verification plumbing** and is clearly labeled for development only. A real provider (InsightFace / ONNX / edge hardware) must be integrated behind the existing `BiometricProvider` interface before any production claim of "face verification" or "liveness."

2. **Node version.** The project targets Node 20 LTS (`engines: node >=20`). Next.js 14 is only tested through Node 20. Running on **Node 24** caused `ERR_MEMORY_ALLOCATION_FAILED` crashes in webpack's cache/compression (resolved by repairing `node_modules` + a clean `next.config.js`). **Recommend pinning to Node 20 LTS.**

3. **Windows symlinks vs. standalone output.** `output: 'standalone'` was removed from `next.config.js` because the build's trace-copy step requires symlink creation, which Windows blocks without Developer Mode (`EPERM`). Local dev/build is unaffected. Container deployment (Docker/Function Compute) will need symlink-capable environments or a different packaging approach.

4. **Redis not in Compose.** `infrastructure/docker/docker-compose.dev.yml` defines only `postgres` (with the `nexora_pgdata` volume). A separately started local `nexora-redis` container can exist on some dev machines, but it is **NOT part of the Compose file** and nothing in V1 connects to it.

5. **Seed data is dev-only.** Credentials (`super@nexora.dev` / `SuperAdmin@2024!`, etc.) are documented for local development and must never be used in production.

6. **No destructive startup migrations.** The migration/seed scripts are run manually (`pnpm db:migrate`, `pnpm db:seed`); the app never drops/recreates tables on boot.

---

## 6. Verification Evidence (this run)

| Check | Result |
|---|---|
| `pnpm --filter @nexora/web build` | ✅ exit 0 — 7 routes (login/dashboard/attendance/teachers/reports + root + 404) |
| `pnpm --filter @nexora/api build` | ✅ `dist/main.js` produced |
| `GET /api/v1/health` | ✅ 200 `{"status":"ok"}` |
| `GET /api/v1/health/database` | ✅ 200 `{"database":"connected"}` |
| `POST /api/v1/auth/login` | ✅ 200 — SUPER_ADMIN, 20 permissions |
| `GET /api/v1/users` | ✅ 200 — 7 users |
| `GET /api/v1/teachers` | ✅ 200 — 5 teachers |
| `GET /api/v1/attendance/today-summary` | ✅ 200 — ABSENT:5 |
| `GET /api/v1/branches` / `/geofences` | ✅ 200 — 1 branch, 1 geofence |
| `GET /api/v1/reports/daily|weekly|monthly` | ✅ 200 — real aggregates |
| Frontend pages (5) | ✅ all HTTP 200 via `next start` |
| Unit tests (22) | ✅ passing (incl. tenant-isolation) |

---

## 7. Exact Commands to Run

```powershell
cd C:\Users\user\.openclaw-autoclaw\workspace\nexora-v1-g-ide

# 1. Dependencies (only after a fresh clone / node_modules corruption)
pnpm install --force

# 2. Start PostgreSQL (requires Docker Desktop running)
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# 3. Seed demo data (first time only)
pnpm db:seed

# 4. Run both servers (API :4000, Web :3000)
pnpm dev

# Or production-style
pnpm build
pnpm --filter @nexora/web start   # serves :3000
node apps/api/dist/main.js        # serves :4000
```

Demo login: `super@nexora.dev` / `SuperAdmin@2024!`
