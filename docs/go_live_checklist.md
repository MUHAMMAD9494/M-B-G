# NEXORA Smart Edu — Go-Live Checklist

Use this before switching a school (or the platform) to production traffic.
Every item links to the evidence/artifact that verifies it.

## A. Security & authentication

- [ ] All secrets live in the environment / secret manager — **never** committed.
      Check: `git grep -iE "(secret|password|token|key)\s*=\s*['\"][^'\"]{6,}"` returns nothing real.
- [ ] `JWT_SECRET` / `JWT_REFRESH_SECRET` are unique, long (>48 bytes), random.
      Check: app refuses to boot in production with dev-default secrets (config validation).
- [ ] HTTPS everywhere; cookies `HttpOnly` + `Secure` + `SameSite`; `COOKIE_DOMAIN` set behind proxy.
- [ ] `TRUST_PROXY=true` ONLY when the app runs behind your TLS-terminating proxy.
- [ ] CORS: `CORS_ORIGIN` lists only real web origins (no `*`).
- [ ] API is not reachable directly from the internet (proxy/WAF in front).
- [ ] Swagger `/api/docs` disabled in production (build-time gate — verified in `main.ts`).
- [ ] Rate limiting on: login (10/min bucket), onboarding, all API (global bucket).
- [ ] `pnpm audit --prod --audit-level high` → 0 high/critical findings (CI `security` job).

## B. Tenant isolation (multi-tenancy)

- [ ] `pnpm db:verify` passes: `FORCE ROW LEVEL SECURITY` on all tenant tables
      (attendance_events, attendance_records, audit_logs, biometric_profiles, branches,
      devices, geofences, notification_preferences, refresh_tokens, system_settings, teachers,
      user_roles, users).
- [ ] Application connects with a **non-owner, login-capable role** (`nexora_app` semantics)
      or owner role with RLS enforced — never rely on app-side filters alone.
- [ ] Cross-tenant probe passes live: A cannot read B's teachers (403 TENANT_ACCESS_DENIED),
      B cannot guess A's UUIDs (404 NOT_FOUND), direct `school_id` injection is ignored.
- [ ] Role ceiling enforced: tenant admins cannot mint SUPER_ADMIN (403 FORBIDDEN) — unit + live verified.

## C. Biometrics & attendance

- [ ] Production `BIOMETRIC_PROVIDER` = a real vendor adapter (dev SHA-256 provider
      **hard-blocked** at boot in production — this is intentional; verify the boot fails
      without a real provider).
- [ ] Consent captured and stored (`system_settings` consent receipt) before biometric use.
- [ ] Liveness challenge + geofence (Haversine) both enforced server-side; duplicate
      check-ins rejected (409) — verified under 20-way concurrency.
- [ ] Offline queue: clock-in works with no connectivity; queue syncs with idempotent
      `client_event_id`; deferred-verification events are tagged, not silently accepted.

## C. Data protection (NDPA 2023)

- [ ] Privacy policy published (`PRIVACY_POLICY.md` adapted to the school's identity).
- [ ] DPA in place between NEXORA (processor) and each school (controller).
- [ ] DSAR flows tested: `/data-subject/export` (access) and `/data-subject/erasure` (delete).
- [ ] Retention schedule enforced (attendance 5 y, biometric 12 mo post-employment / on
      erasure, audit 2 y, offline queue purged after sync).
- [ ] Breach response runbook available; 72-hour NDPC notification path documented.
- [ ] Legal review obtained for biometric processing (see `docs/ndpa.md`).

## D. Availability & operations

- [ ] Backups running: daily pg_dump via `backup.ps1` (Task Scheduler 03:00 / cron),
      retained 14+ cycles, offload copy off-host; `restore.ps1` **drill executed** in the
      last quarter (restore to scratch DB + `db:verify`).
- [ ] `/health` and `/health/database` monitored; alerting on failure (uptime provider /
      Sentry / PagerDuty per `docs/deployment.md`).
- [ ] Structured logs with `x-request-id` captured for support tracing.
- [ ] CI green on main: lint, typecheck, db:migrate, db:verify, tests, `pnpm -r build`, audit.
- [ ] Migrations are applied with a **human-approved** release step (no auto-migrate at boot)
      and the rollback/revert procedure is documented and rehearsed.
- [ ] Load verified for the school size: read burst + login + clock-in race (see report §Testing).

## E. Product & UX

- [ ] WCAG 2.1 AA fixes in place (skip links, landmarks, aria-current, contrast) —
      automated scan + screen-reader pass remains a pre-launch task for the design QA round.
- [ ] PWA installable (manifest + icons + service worker) on HTTPS.
- [ ] Demo credentials hidden in prod (`NEXT_PUBLIC_SHOW_DEMO_CREDS` unset).
- [ ] Teacher enrollment flow (camera enrollment / device pairing) works on target devices.

## F. Sign-off

- [ ] This checklist completed and stored with release notes.
- [ ] Known remaining risks (see report "Remaining risks") are accepted by the operator
      with named owners.
- [ ] Production readiness report accepted: `DELIVERY/NEXORA_PRODUCTION_READINESS_REPORT.md`.