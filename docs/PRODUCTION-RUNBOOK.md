# Nexora Smart Edu V1 — Production Deployment Runbook

> **Last updated**: 2026-09-01
> **Repo**: https://github.com/MUHAMMAD9494/M-B-G.git
> **Commit**: `f43359e` (main)
> **Status**: Code-ready, awaiting cloud deployment

---

## Architecture

```
Browser → Vercel (Next.js web) → API (NestJS) → PostgreSQL + Redis
```

| Component | Stack | Deploy Target |
|-----------|-------|---------------|
| Web Frontend | Next.js 14, React 18, Tailwind CSS | **Vercel** (recommended) |
| API Backend | NestJS, TypeORM, Passport JWT | **Railway** / **Fly.io** / **VPS** |
| Database | PostgreSQL 16 | **Neon** / **Supabase** / **Railway** |
| Cache | Redis 7 | **Upstash** / **Railway** |

---

## Step 1: Push to GitHub

The latest commit (`f43359e`) adds `vercel.json` but may not have pushed due to a credential issue.

```bash
cd nexora-v1-g-ide
git push origin main
```

If credentials fail, re-authenticate:
```bash
gh auth login
# or
echo "https://YOUR_GITHUB_PAT:x-oauth-basic@github.com" > ~/.git-credentials
```

---

## Step 2: Deploy Web to Vercel

### Option A: GitHub Integration (Recommended)

1. Go to <https://vercel.com/new>
2. Import the `M-B-G` repository
3. Vercel auto-detects the pnpm monorepo and Next.js in `apps/web`
4. Set **Root Directory** to `apps/web` (if prompted)
5. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-api-domain.com/api/v1`
   - `NEXT_PUBLIC_SHOW_DEMO_CREDS` = `false`
6. Click **Deploy**

### Option B: Vercel CLI

```bash
cd nexora-v1-g-ide
npx vercel --yes
# Set env vars:
npx vercel env add NEXT_PUBLIC_API_URL production
npx vercel env add NEXT_PUBLIC_SHOW_DEMO_CREDS production
# Production deploy:
npx vercel --prod
```

### Vercel Build Notes
- `transpilePackages` in `next.config.js` handles workspace deps (`@nexora/types`, `@nexora/config`, `@nexora/utils`)
- `output: standalone` is only enabled for Docker (`DOCKER_BUILD=1`), not for Vercel
- CSP header's `connect-src` is set at build time from `NEXT_PUBLIC_API_URL` — must be set before deploy
- Build requires ~2GB RAM (Vercel provides 8GB+)

---

## Step 3: Provision Production Database

### Recommended: Neon (Serverless PostgreSQL)
1. Create project at <https://neon.tech>
2. Copy the connection string
3. Run migrations:

```bash
# From your local machine or CI:
DATABASE_URL="postgres://neondb_owner:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" \
  npx ts-node apps/api/src/database/run-migrations.ts
```

4. Seed demo school:
```bash
DATABASE_URL="<prod-url>" npx ts-node apps/api/src/database/seed.ts
```

### Alternative: Railway PostgreSQL
1. Create a new PostgreSQL service in Railway
2. Use the `DATABASE_URL` provided by Railway
3. Run migrations and seed as above

---

## Step 4: Deploy API Backend

### Recommended: Railway

1. Create new project at <https://railway.app>
2. Connect GitHub repo `M-B-G`
3. Set **Root Directory** to `apps/api`
4. Add environment variables (see table below)
5. Add PostgreSQL and Redis services in Railway
6. Railway auto-deploys on push

### Environment Variables Required

| Variable | Example | Notes |
|----------|---------|-------|
| `NODE_ENV` | `production` | **Required** — blocks dev secrets |
| `DATABASE_URL` | `postgres://owner:pass@host:5432/db` | Owner role for migrations |
| `APP_DATABASE_URL` | `postgres://app_role:pass@host:5432/db` | Least-privilege role for runtime |
| `JWT_SECRET` | (32+ char random string) | Generate: `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | (32+ char random string) | Different from JWT_SECRET |
| `JWT_ACCESS_TTL` | `900` | 15 minutes |
| `JWT_REFRESH_TTL` | `604800` | 7 days |
| `CORS_ORIGIN` | `https://your-vercel-app.vercel.app` | Vercel domain |
| `TRUST_PROXY` | `true` | Required behind Railway proxy |
| `BIOMETRIC_PROVIDER` | `dev` | Change when integrating real biometrics |
| `REDIS_URL` | `redis://host:6379` | If using Redis for sessions/rate limiting |

---

## Step 5: Configure CORS & CSP

1. Set `CORS_ORIGIN` on the API to your Vercel domain
2. Set `NEXT_PUBLIC_API_URL` on Vercel to your API domain
3. The CSP header in `next.config.js` auto-includes the API URL in `connect-src`

---

## Step 6: DNS & Custom Domain (Optional)

1. In Vercel: add custom domain (e.g. `app.nexora.edu.ng`)
2. Point DNS: CNAME to `cname.vercel-dns.com`
3. Update `CORS_ORIGIN` on API to match
4. Update `NEXT_PUBLIC_API_URL` on Vercel to match

---

## Verification Checklist

- [ ] API health: `GET /api/v1/health` → `{ "success": true }`
- [ ] DB health: `GET /api/v1/health/database` → `{ "database": "connected" }`
- [ ] Login: `POST /api/v1/auth/login` with demo credentials → 200 + tokens
- [ ] Auth: `GET /api/v1/auth/me` with Bearer token → user profile
- [ ] Web loads: Vercel URL shows login page
- [ ] Login→Dashboard: login redirects to `/dashboard`
- [ ] CSP: browser console shows no CSP violations

---

## Demo Credentials (for staging only)

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `super@nexora.dev` | `SuperAdmin@2024!` |
| School Admin | `admin@nexorademo.edu.ng` | `Admin@2024!` |
| Teacher | `ibrahim@nexorademo.edu.ng` | `Teacher@2024!` |

**Remove demo users and set `NEXT_PUBLIC_SHOW_DEMO_CREDS=false` before production.**

---

## Cost Estimate (Hobby Tier)

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Hobby | Free |
| Railway | Hobby | ~$5/mo (API + PG + Redis) |
| Neon | Free | Free (0.5 GB) |
| Custom Domain | ~$10/yr | Optional |
| **Total** | | **$0–5/mo** |

---

## Migrations Applied (v1–v6)

| Version | Description |
|---------|-------------|
| v1 | Initial schema (users, schools, attendance, etc.) |
| v2 | Harden RLS policies |
| v3 | Fix tenant policies |
| v4 | Production hardening (audit log, device tracking) |
| v5 | Auth token gateway (stored procedures for refresh tokens) |
| v6 | Security lockdown (revoke PUBLIC, purge function) |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | No | Login with email+password |
| POST | `/api/v1/auth/refresh` | Refresh token | Refresh access token |
| POST | `/api/v1/auth/logout` | Yes | Revoke refresh token |
| GET | `/api/v1/auth/me` | Yes | Get current user profile |
| POST | `/api/v1/auth/change-password` | Yes | Change password |
| GET | `/api/v1/users` | Yes | List users (school-scoped) |
| POST | `/api/v1/users` | Yes | Create user |
| PATCH | `/api/v1/users/:id` | Yes | Update user |
| GET | `/api/v1/schools/me` | Yes | Get current school |
| PATCH | `/api/v1/schools/me` | Yes | Update school |
| GET | `/api/v1/teachers` | Yes | List teachers |
| POST | `/api/v1/teachers` | Yes | Create teacher |
| POST | `/api/v1/attendance/check-in` | Yes | Record attendance |
| GET | `/api/v1/attendance` | Yes | List attendance records |
| GET | `/api/v1/attendance/today-summary` | Yes | Today's summary |
| GET | `/api/v1/reports/daily` | Yes | Daily report |
| GET | `/api/v1/reports/weekly` | Yes | Weekly report |
| GET | `/api/v1/reports/export/csv` | Yes | CSV export |
| GET | `/api/v1/geofences` | Yes | List geofences |
| POST | `/api/v1/geofences` | Yes | Create geofence |
| GET | `/api/v1/biometrics` | Yes | List biometric profiles |
| POST | `/api/v1/biometrics/enroll` | Yes | Enroll face template |
| POST | `/api/v1/onboarding/schools` | No | Self-register school |
| GET | `/api/v1/data-subject/export` | Yes | NDPA data export |
| POST | `/api/v1/data-subject/erasure` | Yes | NDPA data erasure |
| GET | `/api/v1/health` | No | Health check |
| GET | `/api/v1/health/database` | No | Database connectivity |

Full interactive docs: `http://localhost:4000/api/docs` (Swagger UI, dev only)
