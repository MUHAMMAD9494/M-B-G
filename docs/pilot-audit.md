# Phase 1 — Product/System Audit Report

**Date:** 2026-09-09  
**Scope:** Read-only inspection of repository, API, frontend, database, auth/RBAC  
**No files were modified during this audit.**

---

## Feature-by-Feature Classification

### 1. School Creation/Onboarding

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `POST /onboarding/schools` (public self-registration), `POST /schools` (alias), `GET /schools/me`, `PATCH /schools/me` |
| Database | IMPLEMENTED | `schools` table with name, logo, address, phone, email, timezone, working_days, late/early thresholds |
| Frontend | **MISSING** | No school profile/settings page. Admin cannot view or edit school configuration. |

### 2. Branch Management

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `GET /branches`, `POST /branches`, `PATCH /branches/:id` (requires `school.read` / `school.update`) |
| Database | IMPLEMENTED | `branches` table with school_id FK, name, address, lat/lng, timezone, status |
| Frontend | **MISSING** | No branch management UI. |

### 3. Teacher Management

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `GET /teachers`, `GET /teachers/:id`, `POST /teachers`, `PATCH /teachers/:id` — full CRUD with search, pagination, department/status filters |
| Database | IMPLEMENTED | `teachers` table with employee_id, name, phone, email, department, designation, employment_status, user_id FK |
| Frontend | **PARTIALLY IMPLEMENTED** | Read-only teacher list exists at `/teachers`. No add/edit/detail forms. No activate/deactivate. No assign-to-branch. |

### 4. User Management

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `GET /users`, `POST /users`, `PATCH /users/:id`, `POST /users/:id/disable`, `POST /users/:id/enable` — full CRUD with tenant scoping |
| Database | IMPLEMENTED | `users` table with email, password_hash, role, status, school_id, failed_login_attempts, locked_until |
| Frontend | **MISSING** | No user management page at all. |

### 5. Geofence Configuration

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `GET /geofences`, `POST /geofences`, `PATCH /geofences/:id` — creates deactivates existing on create |
| Database | IMPLEMENTED | `geofences` table with school_id, name, lat, lng, radius, active flag |
| Frontend | **MISSING** | No geofence configuration UI. Admin cannot set school location or radius. |

### 6. Teacher Attendance

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `POST /attendance/check-in`, `POST /attendance/sync`, `GET /attendance`, `GET /attendance/today-summary`, `PATCH /attendance/:id/correct` — full flow with GPS accuracy gate, geofence validation, duplicate prevention, risk scoring |
| Database | IMPLEMENTED | `attendance_records` + `attendance_events` tables with full check-in/out coordinates, geofence status, verification status |
| Frontend | IMPLEMENTED | Self-check-in at `/attendance`, mobile attendance at `/(mobile)/teacher/attendance`, offline sync engine |

### 7. Attendance Records/Events

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | Admin list with pagination, date/teacher/branch/status filters. Correction with audit trail. |
| Frontend | **PARTIALLY IMPLEMENTED** | Dashboard shows today-summary cards. No admin attendance table (list of who checked in/out). No correction UI. |

### 8. Reports

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | Daily, weekly, monthly, teacher history, CSV export — all tenant-scoped |
| Database | IMPLEMENTED | Uses attendance_records + teachers tables |
| Frontend | **PARTIALLY IMPLEMENTED** | Daily report only with basic 5-card summary. No weekly/monthly views. No teacher history view. CSV export button exists but opens raw URL (may not pass auth). |

### 9. School Settings

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `GET /settings`, `PATCH /settings` — key-value system_settings |
| Frontend | **MISSING** | No settings UI. |

### 10. Role Permissions

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `PermissionsGuard` with 20+ permissions. RBAC service maps roles → permissions. `@Permissions()` decorator on every endpoint. |
| Database | IMPLEMENTED | `roles`, `permissions`, `role_permissions`, `user_roles` tables. V2 seeded SUPER_ADMIN, SCHOOL_OWNER, SCHOOL_ADMIN, TEACHER roles. |
| Frontend | PARTIALLY IMPLEMENTED | Shell shows different nav for teacher vs admin. No fine-grained permission gating on UI elements. |

### 11. Offline Attendance Synchronization

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `POST /attendance/sync` — 48-hour window, idempotency via client_event_id, GPS accuracy gate, geofence check, honest verification semantics (offline = pending, not PASSED) |
| Frontend | IMPLEMENTED | `sync-engine.ts` with IDB queue, online/offline detection, retry. `sw.js` service worker. |
| Status | IMPLEMENTED | End-to-end offline sync works. |

### 12. Biometric Provider Abstraction

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | Provider interface with enroll/verify/liveness methods. Dev provider for V1. 6 endpoints. |
| Frontend | IMPLEMENTED | Enrollment page at `/teacher/enroll`. Liveness challenges. |
| Production | DEFERRED | Dev provider allowed in production for MVP. Gate re-enable needed before real biometric data. |

### 13. Database Seeding / Demo Data

| Layer | Status | Details |
|-------|--------|---------|
| Seed script | IMPLEMENTED | `seed.ts` creates demo users with bcryptjs hashes |
| Production Neon | **BROKEN** | Has 7 user accounts but: **NO teacher profiles linked to users**, **NO geofences**, **NO attendance records**, **NO school configuration**. Dashboard and reports show zeros. |
| Demo credentials | IMPLEMENTED | 3 demo accounts (super, admin, teacher) with known passwords |

### 14. Password Change

| Layer | Status | Details |
|-------|--------|---------|
| API | IMPLEMENTED | `POST /auth/change-password` — validates current password, hashes new, revokes all refresh tokens |
| Frontend | **MISSING** | No change-password UI. |

---

## Complete API Endpoint Map

| Controller | Method | Path | Permission | Auth |
|-----------|--------|------|------------|------|
| auth | POST | /auth/login | Public | No |
| auth | POST | /auth/refresh | Public | No |
| auth | POST | /auth/logout | — | Yes |
| auth | GET | /auth/me | — | Yes |
| auth | POST | /auth/change-password | — | Yes |
| attendance | POST | /attendance/check-in | attendance.create | Yes |
| attendance | POST | /attendance/sync | attendance.create | Yes |
| attendance | GET | /attendance | attendance.read | Yes |
| attendance | GET | /attendance/today-summary | attendance.read | Yes |
| attendance | PATCH | /attendance/:id/correct | attendance.correct | Yes |
| audit | GET | /audit | audit.read | Yes |
| biometric | POST | /biometrics/enroll | settings.update | Yes |
| biometric | POST | /biometrics/verify/:teacherId | attendance.create | Yes |
| biometric | POST | /biometrics/liveness/challenge | attendance.create | Yes |
| biometric | POST | /biometrics/liveness/check | attendance.create | Yes |
| biometric | GET | /biometrics | settings.read | Yes |
| biometric | DELETE | /biometrics/:id | settings.update | Yes |
| branches | GET | /branches | school.read | Yes |
| branches | POST | /branches | school.update | Yes |
| branches | PATCH | /branches/:id | school.update | Yes |
| data-subject | GET | /data-subject/export | — | Yes |
| data-subject | POST | /data-subject/erasure | — | Yes |
| devices | POST | /devices/register | — | Yes |
| devices | GET | /devices | users.read | Yes |
| geofencing | GET | /geofences | settings.read | Yes |
| geofencing | POST | /geofences | settings.update | Yes |
| geofencing | PATCH | /geofences/:id | settings.update | Yes |
| health | GET | /health | Public | No |
| health | GET | /health/database | Public | No |
| notifications | GET | /notifications/preferences | — | Yes |
| notifications | PATCH | /notifications/preferences | — | Yes |
| onboarding | POST | /onboarding/schools | Public | No |
| onboarding | POST | /onboarding/invites | school.update | Yes |
| reports | GET | /reports/daily | reports.read | Yes |
| reports | GET | /reports/weekly | reports.read | Yes |
| reports | GET | /reports/monthly | reports.read | Yes |
| reports | GET | /reports/teacher/:teacherId/history | reports.read | Yes |
| reports | GET | /reports/export/csv | reports.export | Yes |
| schools | POST | /schools | Public | No |
| schools | GET | /schools/me | school.read | Yes |
| schools | PATCH | /schools/me | school.update | Yes |
| settings | GET | /settings | settings.read | Yes |
| settings | PATCH | /settings | settings.update | Yes |
| teachers | GET | /teachers | teachers.read | Yes |
| teachers | GET | /teachers/:id | teachers.read | Yes |
| teachers | POST | /teachers | teachers.create | Yes |
| teachers | PATCH | /teachers/:id | teachers.update | Yes |
| users | GET | /users | users.read | Yes |
| users | POST | /users | users.create | Yes |
| users | PATCH | /users/:id | users.update | Yes |
| users | POST | /users/:id/disable | users.disable | Yes |
| users | POST | /users/:id/enable | users.disable | Yes |

**Total: 51 endpoints**

---

## Frontend Route Map

| Route | Page | Status |
|-------|------|--------|
| `/login` | Login form | IMPLEMENTED |
| `/dashboard` | Today's attendance summary cards | IMPLEMENTED |
| `/attendance` | Teacher self-check-in | IMPLEMENTED |
| `/teachers` | Read-only teacher list | PARTIALLY IMPLEMENTED (no add/edit) |
| `/reports` | Daily report with date picker | PARTIALLY IMPLEMENTED (no weekly/monthly) |
| `/(mobile)/teacher/attendance` | Mobile attendance check-in | IMPLEMENTED |
| `/(mobile)/teacher/enroll` | Biometric enrollment | IMPLEMENTED |
| `/settings` | School settings | **MISSING** |
| `/users` | User management | **MISSING** |
| `/geofences` | Geofence configuration | **MISSING** |
| `/profile` | Profile / Change password | **MISSING** |
| `/school` | School profile/configuration | **MISSING** |

---

## Database Tables (18 total)

| Table | RLS | Tenant Column | Records in Neon |
|-------|-----|---------------|-----------------|
| schools | No | id (tenant key) | 1 |
| branches | Yes | school_id | 0 |
| roles | No | — | 4 |
| permissions | No | — | 20+ |
| role_permissions | No | — | 80+ |
| users | No | school_id | 7 |
| user_roles | No | school_id | 7 |
| teachers | Yes | school_id | **0** |
| geofences | Yes | school_id | **0** |
| attendance_records | Yes | school_id | **0** |
| attendance_events | Yes | school_id | **0** |
| biometric_profiles | Yes | school_id | 0 |
| devices | Yes | school_id | 0 |
| audit_logs | Yes (append-only) | school_id | few (login events) |
| refresh_tokens | Yes | school_id | 0 |
| notification_preferences | Yes | school_id | 0 |
| system_settings | Yes | school_id | 0 |

**Critical gap: The Neon database has 7 users but 0 teachers, 0 geofences, and 0 attendance records. The system is structurally complete but data-empty — every dashboard and report will show zeros.**

---

## Security Assessment

| Aspect | Status | Details |
|--------|--------|---------|
| JWT authentication | IMPLEMENTED | Access + refresh tokens, rotation, reuse detection, family revocation |
| Password hashing | IMPLEMENTED | bcryptjs with salt rounds 12 |
| Account lockout | IMPLEMENTED | 5 failed attempts → 15 min lock |
| RBAC | IMPLEMENTED | 4 roles, 20+ permissions, @Permissions decorator on all endpoints |
| Tenant isolation (API) | IMPLEMENTED | TenantInterceptor sets `app.school_id` GUC per request |
| RLS (database) | IMPLEMENTED | V2 migration: tenant_policy() on 12 tables, super-admin bypass via GUC |
| CORS | IMPLEMENTED | Origin check against CORS_ORIGIN env var |
| Security headers | IMPLEMENTED | Helmet with CORP fix (pending Railway redeploy) |
| Input validation | IMPLEMENTED | class-validator on all DTOs |
| Audit logging | IMPLEMENTED | append-only audit_logs table |
| Refresh token security | IMPLEMENTED | Hashed storage, rotation, reuse detection, family revocation |
| Staleness re-validation | IMPLEMENTED | JWT guard re-checks DB status/role/school on every request |
| NDPA data-subject rights | IMPLEMENTED | Export + erasure endpoints |
| **Rate limiting** | **PARTIALLY IMPLEMENTED** | Only on login (10/min). Other endpoints unlimited. |
| **HTTPS** | **IMPLEMENTED** | Vercel + Railway + Neon all enforce TLS |

---

## Dependencies Between Features

```
School → Branch → Teacher → Attendance Record → Reports
  ↓         ↓         ↓           ↓
Settings  Geofence  User      Attendance Event
  ↓                   ↓
Password Change    Biometric Profile
```

- Teachers require a school_id (set from actor's school for non-super-admin)
- Attendance requires a teacher profile linked to the authenticated user (via user_id FK)
- Reports query attendance_records joined to teachers
- Geofence validation happens during check-in
- Change password requires current session

---

## Summary of Gaps

### P0 — CRITICAL (pilot cannot function without these)

1. **School Settings frontend page** — Admin cannot view or configure school name, address, timezone, attendance rules (late threshold, early departure threshold, working days)
2. **Teacher Add/Edit frontend** — Admin cannot add teachers. The read-only list is useless for onboarding.
3. **Admin Attendance Table frontend** — Admin can see summary cards but not WHO checked in/out. Need a table: Teacher | Status | Check-in | Check-out | Geofence | Actions
4. **Change Password frontend** — API exists, no UI. Users cannot change passwords.
5. **Production seed data** — Neon has 0 teachers, 0 geofences, 0 attendance records. Dashboard and reports are empty.

### P1 — IMPORTANT (pilot will be incomplete but usable)

6. **User Management frontend** — Admin cannot create users or manage roles.
7. **Geofence Configuration frontend** — Admin cannot set school location. Check-in will fail with "outside geofence" unless geofences exist.
8. **Enhanced Reports frontend** — Only daily view exists. Need weekly, monthly, date-range.

### P2 — NICE TO HAVE

9. **Branch Management UI** — Most pilot schools have one campus.
10. **School Self-Registration page** — `POST /onboarding/schools` works but no frontend form.
11. **Attendance Correction UI** — API exists, no frontend.
12. **Better role-based nav** — Teachers see admin nav items they can't access.
