# Nexora Smart Edu V1 — Production Pilot Handoff

**Date:** 2026-09-09
**Version:** V1 MVP (commit `1a6878f`)
**Status:** PILOT-READY

---

## 1. Live URLs

| Component | URL | Host |
|-----------|-----|------|
| Frontend | https://m-b-g-api.vercel.app | Vercel (Hobby) |
| Login | https://m-b-g-api.vercel.app/login | Vercel |
| API | https://m-b-g-production.up.railway.app | Railway |
| API Health | https://m-b-g-production.up.railway.app/api/v1/health | Railway |
| Database | Neon serverless PostgreSQL | Neon (Free) |
| Source Code | https://github.com/MUHAMMAD9494/M-B-G | GitHub |

---

## 2. Demo Accounts (for pilot testing only)

| Role | Email | Password | Use For |
|------|-------|----------|---------|
| Super Admin | `super@nexora.dev` | `SuperAdmin@2024!` | System-wide management |
| School Admin | `admin@nexorademo.edu.ng` | `Admin@2024!` | Single school management |
| Teacher | `ibrahim@nexorademo.edu.ng` | `Teacher@2024!` | Attendance, reports |

> Change these passwords before onboarding real users. See §7.

---

## 3. Verified Endpoints

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/api/v1/health` | GET | None | 200 |
| `/api/v1/health/database` | GET | None | 200 |
| `/api/v1/auth/login` | POST | None | 200 + JWT |
| `/api/v1/auth/me` | GET | Bearer | 200 |
| `/api/v1/auth/logout` | POST | Bearer | 200 |
| `/api/v1/schools` | GET | Bearer | 200 |
| `/api/v1/users` | GET | Bearer | 200 |
| Frontend `/login` | GET | None | 200 |
| Frontend `/dashboard` | GET | Client | 200 |

---

## 4. Architecture

```
Browser → Vercel (Next.js SSR) → Railway (NestJS API) → Neon (PostgreSQL)
                ↕                          ↕
         sessionStorage              app.store_refresh_token()
         Bearer token auth           RLS + SECURITY DEFINER
```

- **Auth flow:** Login → JWT accessToken + refreshToken → accessToken in sessionStorage → `Authorization: Bearer` header → `/auth/me` verifies on mount
- **CORS:** `CORS_ORIGIN=https://m-b-g-api.vercel.app` on Railway
- **RLS:** Row-Level Security on all tenant tables; super admin bypasses via session GUC

---

## 5. Environment Variables

### Vercel (Frontend)
| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | `https://m-b-g-production.up.railway.app/api/v1` |
| `NEXT_PUBLIC_SHOW_DEMO_CREDS` | *(not set — creds hidden by default)* |

### Railway (API)
| Variable | Notes |
|----------|-------|
| `NODE_ENV=production` | |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | Access token signing |
| `JWT_REFRESH_SECRET` | Refresh token signing |
| `CORS_ORIGIN` | `https://m-b-g-api.vercel.app` |

---

## 6. Pre-Pilot Checklist

### Critical (must do before pilot)
- [ ] **Change demo passwords** — Generate bcryptjs hash locally, UPDATE in Neon SQL Editor
- [ ] **Remove test users** (ahmad, fatima, hauwa, musa) — DELETE FROM users WHERE email IN (...)
- [ ] **Redeploy Railway** to pick up CORP header fix (commit `8243e0d`)

### Important (before scaling beyond 1 school)
- [ ] **Re-enable `APP_DATABASE_URL` production gate** (currently falls back to `DATABASE_URL`)
- [ ] **Re-enable `BIOMETRIC_PROVIDER` production gate** (currently allows dev provider)
- [ ] **Configure real biometric provider**

### Nice-to-have
- [ ] Reduce account lockout from 15 min to 5 min
- [ ] Add rate limiting on login endpoint
- [ ] Set up monitoring/alerting on Railway

---

## 7. Rollback Procedure

- **Frontend:** Vercel dashboard → Deployments → promote last known-good to Production
- **API:** Railway dashboard → Deployments → Redeploy previous version
- **Database:** Destructive — always backup first. Re-run migrations if schema corrupted.

---

## 8. Known Risks

| Issue | Severity | Mitigation |
|-------|----------|------------|
| Account lockout after 5 failed logins (15 min) | Low | Inform users; consider reducing to 5 min |
| No rate limiting on login | Medium | Add rate limiting middleware |
| Dev biometric provider in production | Medium | Re-enable gate after real provider configured |
| No password reset flow | Medium | Admin resets via Neon SQL Editor |
| CORP header `same-origin` (Railway not redeployed) | Low | Redeploy Railway for fix |

---

## 9. Cost

| Service | Cost |
|---------|------|
| Vercel (Hobby) | Free |
| Railway | ~$5/mo |
| Neon (Free) | Free |
| **Total** | **~$5/mo** |

---

## 10. Step-by-Step Verification

1. Visit https://m-b-g-api.vercel.app/login → should show Nexora form
2. Login as `super@nexora.dev` / `SuperAdmin@2024!` → reach dashboard
3. Refresh page → stay on dashboard (session persists)
4. Click sidebar items (Attendance, Teachers, Reports) → pages load
5. Sign out → login as `admin@nexorademo.edu.ng` / `Admin@2024!` → School Admin view
6. Sign out → login as `ibrahim@nexorademo.edu.ng` / `Teacher@2024!` → Teacher view
7. Resize to mobile width → bottom nav bar appears
8. Try wrong password → error message, not 500
9. Open DevTools Console → no red errors
10. Visit https://m-b-g-production.up.railway.app/api/v1/health → `{"status":"ok"}`
