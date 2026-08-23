# Nexora Smart Edu — Architecture

## Overview

Nexora Smart Edu (NSE) is a **multi-tenant education technology platform** for Nigerian schools, focused on teacher attendance and workforce management. V1 is a **modular monolith**: a single NestJS application partitioned into feature modules, backed by PostgreSQL, with a Next.js web client.

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 (App Router)                 │
│   login · dashboard · attendance · teachers · reports        │
│   IndexedDB offline queue (idb)  ·  cookie-first auth        │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST (JSON)  /api/v1/*
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     NestJS modular monolith                  │
│  auth · users · schools · branches · teachers · attendance  │
│  geofencing · biometric · devices · reports · audit         │
│  settings · notifications · health                          │
│  Global: JwtAuthGuard · PermissionsGuard · ThrottlerGuard   │
│          TransformInterceptor · HttpExceptionFilter         │
└──────────────────────────┬──────────────────────────────────┘
                           │ TypeORM
                           ▼
              ┌──────────────────────────┐
              │  PostgreSQL 16           │
              │  Row-Level Security      │
              │  nexora_app role (least) │
              └──────────────────────────┘
```

## Module dependency graph

```
app.module
 ├─ ConfigModule (global)
 ├─ TypeOrmModule (PostgreSQL, entities[])
 ├─ ThrottlerModule (standard 300/min · auth 10/min)
 ├─ RbacModule        → role→permission resolution
 ├─ AuditModule       → append-only audit_logs
 ├─ AuthModule        → login/refresh/logout, TokenService, PasswordService
 ├─ UsersModule       → user CRUD (tenant-scoped)
 ├─ SchoolsModule     → school config (own school only)
 ├─ BranchesModule    → campus/branch management
 ├─ TeachersModule    → teacher profiles
 ├─ AttendanceModule  → check-in/out, offline sync, corrections
 ├─ GeofencingModule  → geofence CRUD + haversine validation
 ├─ BiometricModule   → dev-only provider abstraction
 ├─ DevicesModule     → device registration
 ├─ ReportsModule     → daily/weekly/monthly + CSV export
 ├─ SettingsModule    → key/value settings
 ├─ HealthModule      → liveness + DB connectivity
 └─ NotificationsModule → preference storage (V1)
```

## Why a modular monolith (not microservices)

1. **Team size & scope** — a single school-attendance MVP does not justify the
   operational cost of a service mesh, distributed tracing, and eventual
   consistency.
2. **Strong transactionality** — attendance + audit + records must commit
   atomically. A monolith gives us DB transactions for free.
3. **Clear module boundaries** — every feature is an isolated NestJS module with
   its own service/controller/DTO. Extracting a module into a service later is a
   mechanical refactor, not a rewrite.

## Cross-cutting concerns

| Concern | Mechanism |
|---------|-----------|
| Authentication | Global `JwtAuthGuard` (cookie or Bearer), `@Public()` opt-out |
| Authorization | `PermissionsGuard` + `@Permissions(...)` + `ROLE_PERMISSIONS` |
| Rate limiting | `ThrottlerGuard` (300/min standard, 10/min auth) |
| Response envelope | `TransformInterceptor` → `{ success, data, meta }` |
| Errors | `HttpExceptionFilter` → `{ success:false, error:{ code, message } }` |
| Logging | `RequestLoggingInterceptor` (JSON, no PII) |
| Tenant isolation | `TenantScopeService.withTenant()` + PostgreSQL RLS |

## Tenant isolation (defense in depth)

1. **Application layer** — every service checks `actor.schoolId` against the
   target entity (`assertTenant`) and scopes queries with `schoolId = actor.schoolId`.
2. **Database layer** — PostgreSQL RLS policies filter rows using
   `current_setting('app.school_id')`, set per-transaction by
   `TenantScopeService`. `SUPER_ADMIN` (schoolId `NULL`) bypasses via
   `app.is_super = true`.
3. **Least privilege** — the app connects as `nexora_app` (DML only, no DDL).
