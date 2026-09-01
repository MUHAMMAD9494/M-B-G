# NEXORA Smart Edu — Quick Start

Get a local copy running end-to-end (PostgreSQL 16 in Docker + API + web) in ~10 minutes.

## Prerequisites

- Node.js 20+ and pnpm 9 (corepack: `corepack enable`)
- Docker Desktop (PostgreSQL 16 container)
- PowerShell 5.1+ (Windows) or bash (Linux/macOS) — scripts use `powershell`/`sh`

## 1. Install & configure

```bash
pnpm install
copy .env.example .env      # Windows   (Linux/macOS: cp .env.example .env)
docker compose -f docker-compose.dev.yml up -d
pnpm db:migrate             # applies V1..V3 migrations (creates schema_migrations)
pnpm db:verify              # checks RLS force + auth helper + grants
pnpm db:seed                # demo school, admin + 5 teachers + geofence
```

`.env.example` contains the working local-dev `DATABASE_URL` (localhost dev database —
never reuse these values in production).

## 2. Run

```bash
pnpm --filter @nexora/api start    # API on http://localhost:4000/api/v1 (Swagger /api/docs in dev)
pnpm --filter @nexora/web dev      # web on http://localhost:3000
```

Or production-style: build both (`pnpm build`) then `node apps/api/dist/main.js`
from `apps/api` and `npx next start -p 3000` (with `NEXT_PUBLIC_API_URL`) from
`apps/web`.

## 3. First run walkthrough (evidence trail)

1. **Sign in** as `super@nexora.dev` / `SuperAdmin@2024!` (dev seed only; never in prod).
2. **Onboard a school** — `POST /api/v1/onboarding/schools` (admin email, school name,
   password). One transaction creates school + Main Branch + SCHOOL_OWNER + consent
   record. Or use the UI after wiring the sign-up form.
3. **Log in as the new owner** and add teachers via `POST /api/v1/teachers`
   (branch must belong to your school).
4. **Teacher clock-in** — web `/teacher/attendance`: share location (must be inside the
   school geofence), camera liveness, check in. Offline: event queues in IndexedDB
   (state PENDING -> SYNCING -> SYNCED) and syncs later with `client_event_id` idempotency.

## 4. Verify the hard guarantees

```bash
pnpm test                        # 22 unit tests: auth, rbac, tenant isolation, attendance calc
pnpm typecheck && pnpm lint && pnpm build
psql "postgres://nexora:...@localhost:5433/nexora" -f apps/api/src/database/migrations/verify.sql   # or pnpm db:verify
```

Live cross-tenant proof (SQL-level, as the app role):

```bash
docker exec nexora-postgres psql -U nexora -d nexora -f /var/lib/postgresql/rls-proof.sql
# or: psql (as nexora_app) and follow infrastructure/db/rls-proof.sql
```

Expect: A sees own rows, B sees own rows, A never sees B, super sees all, no-GUC = no rows.

## 5. Backups (day 1)

```bash
powershell -File infrastructure/backups/backup.ps1            # gz dump + integrity check
powershell -File infrastructure/backups/restore.ps1 -WhatIf   # dry-run restore
```

See `infrastructure/backups/BACKUP_RUNBOOK.md` for scheduling (03:00 daily), RPO/RTO,
and the quarterly restore-drill checklist.

## 6. Production checklist

See `GO_LIVE_CHECKLIST.md` and `docs/deployment.md`. In short: real secrets in the
environment (never `.env` committed), `BIOMETRIC_PROVIDER` configured to a real vendor
in prod (dev SHA-256 provider is hard-blocked), Cloudflare DNS/CDN/TLS Full strict,
`TRUST_PROXY=true` behind a proxy, HTTPS-only cookies, monitoring + alerting wired,
and a restore drill executed.

## Support

- Deployment: `docs/deployment.md`
- Privacy: `docs/ndpa.md`, `PRIVACY_POLICY.md`
- Ops runbooks: `infrastructure/backups/BACKUP_RUNBOOK.md`