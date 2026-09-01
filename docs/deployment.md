# Nexora Smart Edu — Deployment Runbook

> Reference target architecture. All hostnames, tokens, and credentials below
> are **placeholders** (`api.nexora.example`) — never commit real credentials.
> Source of truth for env keys: `.env.example` (repo root).

---

## 1. Reference architecture

| Layer | Choice (reference) | Notes |
|---|---|---|
| **Web client** | Next.js 14 on **Vercel** | `apps/web`, build via `pnpm --filter @nexora/web build` |
| **API** | NestJS on **Railway / Render / Fly.io** | `apps/api`, start `node apps/api/dist/main.js` or the platform's start command |
| **…or single VM** | Any Node 20 host (DigitalOcean, Hetzner, etc.) | Same artifact: `apps/api/dist/` + `apps/web/.next/standalone`-style build; systemd/pm2 to keep alive |
| **Database** | **Managed PostgreSQL 16** (Supabase, Neon recommended — **RLS support** required, see §6) | NSE multi-tenancy depends on PostgreSQL Row-Level Security; pick a provider that supports custom roles + RLS out of the box |
| **DNS / CDN / WAF** | **Cloudflare** | DNS, proxied CDN, TLS (Full strict), caching of static assets |
| **Secrets** | Platform env / a secrets manager | Never commit `.env`; rotate `JWT_SECRET` on breach suspicion |

Data flow: browser → Cloudflare (TLS, CDN) → Vercel (web) + API host (NestJS) →
managed Postgres. The API is stateless (JWT/cookie + DB-backed refresh tokens),
so it scales horizontally; Postgres remains the single source of truth.

**Placeholder hostnames used throughout this doc (replace with your real ones):**

| Placeholder | Meaning |
|---|---|
| `app.nexora.example` | Web client origin |
| `api.nexora.example` | API origin |
| `nexora.example` | Apex (redirect to app) |
| `admin.nexora.example` | (optional) future admin console |

---

## 2. DNS & TLS (Cloudflare)

1. **Add the zone** `nexora.example` to Cloudflare.
2. **DNS records:**

| Type | Name | Target | Proxy |
|---|---|---|---|
| A / AAAA | `app` | Vercel's assigned IP / CNAME to `cname.vercel-dns.com` | Proxied (orange cloud) |
| CNAME | `api` | Railway/Render/Fly assignment (or A record to VM IP) | Proxied |
| CNAME | `@` | redirect to `app` (Cloudflare Redirect / Vercel) | Proxied |
| TXT | `@` | SPF + DMARC `_dmarc` | — |

   For a single VM, use an A record for `app` + `api` pointing at the VM's
   public IP, both proxied.
3. **TLS**: SSL/TLS mode **Full (strict)**; enable "Always Use HTTPS";
   HSTS header is emitted by the app (helmet) and can also be set at Cloudflare.
4. **CDN**: leave the browser-fronting records proxied so static assets
   (Next.js `/_next/static/*`) are cached by Cloudflare; the API `api.*` record
   should **not** cache dynamic responses by default.
5. **Origin protection**: in a VM setup, firewall port 443 to Cloudflare IP
   ranges only (and SSH to your trusted IP).

---

## 3. TLS termination & TRUST_PROXY

Cloudflare terminates TLS and forwards plain HTTP to the origin over the
network. Set:

```
TRUST_PROXY=true        # NestJS trusts X-Forwarded-* from the proxy tier
```

- `TRUST_PROXY=false` in local dev (direct connections).
- `TRUST_PROXY=true` in staging + production **only when** a trusted reverse
  proxy (Cloudflare / ALB / nginx) is in front. Never enable it when the API is
  directly reachable from the internet — it would let clients forge
  `X-Forwarded-For` etc.
- When `NODE_ENV=production`, cookies are `Secure` (HTTPS-only). Keep that
  invariant: never serve prod over plain HTTP.

---

## 4. Cookies, CORS, origins

### Cookies (auth)

- Names: `nse_access`, `nse_refresh` (HTTP-only).
- Attributes in production:
  - `Secure` — automatic with `NODE_ENV=production` (HTTPS only).
  - `SameSite=Lax` — good default (CSRF-resistant, works with same-site
    navigations).
  - `Domain` — set `COOKIE_DOMAIN` (see env matrix) when cookies must be shared
    across subdomains (e.g. `app.nexora.example` → `api.nexora.example`).
    Example: `COOKIE_DOMAIN=nexora.example`. Leave empty if API and web share
    one origin (simplest and most secure).
  - Never set `SameSite=None` without both HTTPS **and** a cross-site
    justification.

### CORS (API)

```
CORS_ORIGIN=https://app.nexora.example
# multiple allowed origins (if supported by the config parser):
# comma-separated: https://app.nexora.example,https://staging-app.nexora.example
```

- Allow **only** the real web origin(s) — no `*` with credentials.
- The API is a cookie API: CORS + credentials must be aligned (`credentials:
  include` on the client, explicit `Access-Control-Allow-Origin` + `-Credentials`
  on the server).
- Restrict to HTTPS origins in staging/prod.

### Cross-origin summary (reference)

| From (web) | To (API) | Mode |
|---|---|---|
| `https://app.nexora.example` | `https://api.nexora.example` | cross-origin, cookie `Domain=nexora.example` |
| `https://app.nexora.example` | `https://app.nexora.example/api` (same origin, proxied by Next rewrites) | same-origin — simplest, no cookie domain, no CORS |

> Simplest secure default for V1: serve the web app and API under **one origin**,
> e.g. `app.nexora.example` → API via Vercel rewrites or an nginx
> `/api` `proxy_pass`. If you must split origins, set `COOKIE_DOMAIN` + CORS as
> above.

---

## 5. Environment matrix

Always edited per-environment in the platform UI / secrets manager. **Never**
commit real values. Base template: `.env.example`.

Legend: 🔴 secret — store in the platform's secrets manager.

| Key | Staging | Production | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` (or `test` in CI) | `production` | never `development` outside local |
| `API_PORT` | `8080` (platform-provided) | `8080` | Railway/Render inject their own port — read from `$PORT` if set |
| `API_PREFIX` | `api` | `api` | global prefix; health at `/api/v1/health` |
| `DATABASE_URL` 🔴 | managed PG URL (staging) | managed PG URL (prod) | `postgres://<app_role>:…@host:5432/nexora` — see §6 roles |
| `JWT_SECRET` 🔴 | long random ≥ 32 bytes | long random ≥ 32 bytes | rotate immediately on any leak |
| `JWT_REFRESH_SECRET` 🔴 | long random ≥ 32 bytes | long random ≥ 32 bytes | distinct from `JWT_SECRET` |
| `JWT_ACCESS_TTL` | `900` | `900` | seconds (15 min) |
| `JWT_REFRESH_TTL` | `604800` | `604800` | seconds (7 days); rotation is enforced |
| `CORS_ORIGIN` | `https://staging-app.nexora.example` | `https://app.nexora.example` | exact HTTPS origin(s) only |
| `TRUST_PROXY` | `true` | `true` | only with a trusted proxy in front (§3) |
| `NEXT_PUBLIC_API_URL` | `https://api.nexora.example/api/v1` | `https://api.nexora.example/api/v1` | build-time; **public** — must contain no secrets |
| `COOKIE_DOMAIN` | `nexora.example` (if cross-origin) | `nexora.example` (if cross-origin) | empty when web+API share one origin |
| `LOG_LEVEL` | `info` | `info` (warn/error in noisy prod tiers) | structured logs; `debug` only with log redaction in place |
| `BIOMETRIC_PROVIDER` | `dev` (staging: allowed, labeled) | **must be a real provider** — see note | selects `BiometricProvider` implementation; `dev` is **hard-blocked in production** |
| `STORAGE_PROVIDER` | `local`/`object-storage` | object storage (S3-compatible, encrypted) | templates/images live outside the DB; DB keeps only reference hashes |
| `EMAIL_PROVIDER` | `log` (no delivery) | real provider (SMTP/API) | notification delivery is deferred in V1 — keep `log` until wired |

> Keys marked "reserved/planned" (`BIOMETRIC_PROVIDER`, `STORAGE_PROVIDER`,
> `EMAIL_PROVIDER`, `COOKIE_DOMAIN`, `LOG_LEVEL`) may not yet be read by the
> committed code — wiring them into `@nexora/config` is a prerequisite for the
> corresponding feature. Do not set them in prod until the code consumes them.
> Keep `.env.example` updated in the same commit that wires each key.

### Per-environment checklist

- [ ] Secrets exist only in the platform env / secrets manager (never in the repo, never in client bundles — anything `NEXT_PUBLIC_*` is public by definition)
- [ ] `DATABASE_URL` points to the right DB (staging/prod can't reach each other)
- [ ] `JWT_SECRET` ≠ `JWT_REFRESH_SECRET` ≠ any dev value
- [ ] `CORS_ORIGIN` is the exact web origin; `TRUST_PROXY=true`; cookies `Secure`
- [ ] `BIOMETRIC_PROVIDER=dev` is **not** set in production

---

## 6. Database: roles & migrations

**Postgres 16, RLS required.** NSE uses a least-privilege `nexora_app` runtime
role + tenant-scoped RLS policies; schema/RLS setup lives in the migration SQL
and is owned by the infra/db workstream (`infrastructure/db/**`).

### Role split (do not merge)

| Role | Used by | Rights |
|---|---|---|
| **DB owner** (e.g. `nexora_owner`) | migrations (`pnpm db:migrate`), `db:verify` | DDL on the app schema |
| **App role** (`nexora_app`) | the running API (`DATABASE_URL` points here) | DML only, RLS is active |

Runtime `DATABASE_URL` → `nexora_app`; migration runs → owner role. The API must
**never** run migrations itself (no auto-sync on boot; `synchronize: false`).

### Migration runbook

```bash
# 0. (staging) verify current state first
pnpm db:verify

# 1. pull latest main/develop, install, build
git pull && pnpm install --frozen-lockfile && pnpm -r build

# 2. run migrations AS THE OWNER role
DATABASE_URL=postgres://nexora_owner:***@<host>:5432/nexora pnpm db:migrate

# 3. verify schema parity
DATABASE_URL=postgres://nexora_owner:***@<host>:5432/nexora pnpm db:verify

# 4. smoke-test against the app role (runtime connectivity + RLS)
#    (db:verify owned by infra/db workstream — it validates owner-side schema)

# 5. ONLY THEN deploy the new app artifact (§7)
```

Rules:

- Migrations run **forward, one by one**; never edit an already-applied
  migration — add a new one.
- Revert: `pnpm db:migrate:revert` only when the last migration is known-bad and
  nothing else depends on it. Prefer fixing forward.
- Migrations are gated by the PR that also ships the schema change; CI runs
  `pnpm db:migrate` + `pnpm db:verify` against a fresh Postgres 16 on every push
  (see `.github/workflows/ci.yml`).
- Back up before any migration in prod (`docs/ndpa.md` retention + runbook; or
  provider PITR snapshot).

---

## 7. Deploy & rollback procedure

### Build & artifact

- CI builds the full workspace: `pnpm -r build` (packages → api → web). The
  CI-passing commit **is** the deployable artifact.
- API artifact: `apps/api/dist/main.js` (plus workspace `packages/*/dist`).
- Web artifact: `apps/web` production build (`.next`).

### Deploy (reference: web=Vercel, API=Railway/Render/Fly, DB=managed)

1. **Migrate first** (§6) — DB is always at least one version ahead of apps.
2. **Deploy API** — push/trigger from the CI-green commit (or `git push` if the
   platform builds from the repo). Start command:
   `node apps/api/dist/main.js`
3. **Health-gate the API**: poll until
   - `GET https://api.nexora.example/api/v1/health` → `{ status: "ok" }`, **and**
   - `GET https://api.nexora.example/api/v1/health/database` → `{ database: "connected" }`
   > (Exact paths per deployed code — if `/api/v1` prefix differs, adjust; the
   > liveness path is also documented in `readme.md`'s API module table.)
   If either stays red > 5 min → **rollback** (below).
4. **Deploy web** (Vercel): promote the production deployment; verify
   `GET https://app.nexora.example/login` returns 200 and the dashboard calls
   the API with cookies (`nse_access` set, `Secure`).
5. **Smoke test**: login as a tenant admin → check-in/check-out → offline sync
   → reports CSV. Tenant-isolation test suite passed in CI is your gate.
6. **Post-deploy**: confirm structured logs show request IDs; enable uptime
   checks on the new env (see §8).

### Single-VM variant

```bash
# build on the VM (or CI artifact download)
pnpm install --frozen-lockfile && pnpm -r build

# systemd unit (node 20): apps/api/dist/main.js
# web: next start (or serve the standalone build behind nginx)

# deploy = classic:
npm/pnpm scripts or rsync new dist → symlink flip → systemctl restart nexora-api
# keep N previous artifacts for instant rollback (see below)
```

### Rollback (production)

**Principle: rollback = redeploy the previous known-good artifact.** No
DB-downgrade is required when migrations are additive & deployed before the app.

| Situation | Action |
|---|---|
| API unhealthy after deploy | Redeploy previous CI-green API artifact; re-run health gates; keep DB as-is |
| Web regression after API deploy | Redeploy previous web artifact (Vercel instant rollback / previous release) |
| Bad migration already applied | Do **not** auto-revert. Revert only if isolated & understood (`db:migrate:revert`); else fix forward with a corrective migration |
| Data corruption | Restore from backup/PITR (§ backups runbook) — this is a DR event, not a code rollback |

**Rollback drill (quarterly):** verify you can redeploy artifact `N-1` and reach
healthy within **30 min** (well inside the 2 h DR target).

---

## 8. Monitoring, logging, alerting

### Uptime & health

- Cloudflare-free external uptime probes (UptimeRobot / BetterStack / Pingdom)
  against `GET /api/v1/health` every 1–5 min; alert on 2 consecutive failures.
- Same for `GET /app.nexora.example/login` (web reachability).
- Database health: watch `/api/v1/health/database`; if it turns red while
  liveness is green → DB/network issue, page the DB owner.

### Logs (structured, request-scoped)

- API logs go to stdout as JSON lines (`LOG_LEVEL=info`); do not log raw
  credentials, tokens, or biometric payloads.
- **Request IDs**: the API's request-logging interceptor attaches a per-request
  ID (`X-Request-Id` echoed in responses + logs). Correlate web → API → DB by
  forwarding the header from Vercel/nginx.
- Ship logs to a searchable sink (platform log drain, Papertrail/Logtail/Axiom).
- Index by: request id, school_id (tenant), user id, status, latency, route.

### Errors

- **Sentry (optional but recommended)** for the API (NestJS SDK) and web (Next
  SDK); set `SENTRY_DSN` per env; disable in local dev. Configure PII scrubbing
  before any biometric/location data could reach it.
- Alert on: 5xx rate > threshold, p95 latency > 2 s, failed logins spike,
  failed DB connections.

### Alerts (minimal set)

1. Uptime probe down (API / web) — P1.
2. Health/database red — P1.
3. Error rate spike (5xx) — P2.
4. Backup job failed / no backup in last 26 h — P2.
5. `pnpm audit` high-severity findings in CI — P2 (CI is the tripwire).

---

## 9. Production go-live checklist

- [ ] DNS + TLS verified (Full strict, HSTS, `app` + `api` live).
- [ ] Env matrix set per §5; `TRUST_PROXY=true`; cookies `Secure`, `SameSite=Lax`; `COOKIE_DOMAIN` correct for the chosen topology.
- [ ] `BIOMETRIC_PROVIDER` is a **real** provider — `dev` is hard-blocked in prod (see `readme.md` warning).
- [ ] Managed Postgres 16 with RLS-eligible roles; migrations ran as owner; runtime connects as `nexora_app`.
- [ ] Backups: provider PITR **and** weekly offsite dumps; a restore drill was completed this quarter (see `infrastructure/backups/BACKUP_RUNBOOK.md`).
- [ ] Deploy: CI green on main; API health-gated; web promoted; smoke test passed.
- [ ] Monitoring: uptime probes + structured logs + alerts wired; a rollback drill artifact exists.
- [ ] Compliance: NDPA alignment reviewed — consent capture, retention schedule, data-subject rights, breach procedure (`docs/ndpa.md`).
- [ ] Demo/seed accounts disabled or rotated (`super@nexora.dev` family must not exist in prod).

---

## 10. Related docs

- `readme.md` — quick start, demo creds (dev only), warning block
- `docs/ndpa.md` — Nigeria Data Protection Act 2023 alignment
- `infrastructure/backups/BACKUP_RUNBOOK.md` — backups, RPO/RTO, restore drills
- `infrastructure/db/**` — schema, migrations, `db:verify` (owned by db agent)
- `.env.example` — canonical env key template (do not commit real values)