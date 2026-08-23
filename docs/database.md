# Nexora Smart Edu — Database

PostgreSQL 16. TypeORM with `synchronize: false` — the schema is owned by
versioned SQL migrations (`apps/api/src/database/migrations/`).

## Tables (17)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `schools` | Tenant boundary | name, timezone, working_days, late_threshold_minutes |
| `branches` | Campus/location | school_id, name, lat/lng, timezone |
| `roles` | Role catalog (seed) | name (unique) |
| `permissions` | Permission catalog (seed) | name (unique) |
| `role_permissions` | Role → permission join | role_id, permission_id |
| `users` | Login accounts | school_id, email (unique), password_hash, role, status |
| `user_roles` | User → role join (future custom roles) | user_id, role_id |
| `teachers` | Teacher profiles | school_id, branch_id, user_id, employee_id |
| `geofences` | Attendance zones | school_id, lat/lng, radius, active |
| `attendance_records` | Daily roll-up (one/teacher/day) | school_id, teacher_id, date, check_in/out_* |
| `attendance_events` | Append-only event stream | school_id, teacher_id, record_id, type, sync_status |
| `biometric_profiles` | Hashed template refs (never raw photos) | school_id, teacher_id, provider_type, embedding_hash |
| `devices` | Registered client devices | school_id, user_id, device_identifier |
| `audit_logs` | Immutable audit trail | school_id, actor_id, action, old/new_value |
| `refresh_tokens` | Opaque refresh token hashes | user_id, token_hash, expires_at, revoked_at |
| `notification_preferences` | Channel prefs (V1 storage only) | user_id, channel, enabled |
| `system_settings` | Key/value settings | school_id, key, value |

Every table carries `id UUID PRIMARY KEY`, `created_at`, `updated_at` (from the
shared `BaseEntity`). `teachers` additionally has `deleted_at` (soft delete).

## Row-Level Security

RLS is enabled on all tenant-owned tables. The `app.tenant_policy()` function
returns `true` when:

- `app.is_super = true` (super admin), **or**
- the row's `school_id IS NULL` (platform-global row), **or**
- `school_id = current_setting('app.school_id')` (current tenant).

```sql
CREATE OR REPLACE FUNCTION app.tenant_policy() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT is_super FROM app.is_super)
      OR (school_id IS NULL)
      OR (school_id = current_setting('app.school_id', true));
EXCEPTION WHEN OTHERS THEN
  RETURN (SELECT is_super FROM app.is_super) OR (school_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

Policies are applied to each table (`tenant_select`, `tenant_insert`,
`tenant_update`, `tenant_delete`) via a `DO` block in the migration.

## Least-privilege role

The application connects as `nexora_app` (created by the migration):

```sql
CREATE ROLE nexora_app WITH NOLOGIN NOINHERIT;
GRANT USAGE ON SCHEMA public TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexora_app;
```

`nexora_app` has **no DDL** and **no superuser** privileges. Migrations run as
the database owner (`nexora`), never as `nexora_app`.

## Per-transaction context

`TenantScopeService.withTenant()` wraps tenant queries in a transaction and sets:

```sql
SELECT set_config('app.school_id', $1, true);   -- the authenticated school
SELECT set_config('app.is_super', 'false', true);
```

For `SUPER_ADMIN` (`schoolId === null`), it instead sets `app.is_super = true`.

## Indexes

Key indexes: `idx_users_email` (unique), `idx_teachers_employee` (unique on
school_id+employee_id), `idx_att_records_school_date`,
`idx_att_events_record`, `idx_refresh_hash`, `idx_audit_school_time`.

## Migration strategy

- Schema is **SQL-first** (`V1__initial_schema.sql`), not TypeORM sync.
- New changes go into `V2__...sql`, `V3__...sql`, etc.
- Apply: `pnpm db:migrate` (uses `src/database/cli.ts`).
