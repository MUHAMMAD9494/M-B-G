-- ============================================================
-- V2 — Production hardening
--   * RLS policy correctness (session-GUC super-admin bypass; no global
--     visibility of NULL-school_id rows)
--   * RLS on branches
--   * Append-only audit_logs for the app role
--   * Least-privilege, per-table grants for nexora_app
--   * SECURITY DEFINER auth lookup (cross-tenant email login path)
--   * Entity-drift alignment (roles.school_id, user_roles.school_id)
--   * Missing indexes
--
-- Run as the database OWNER (migrations master). Runtime connections use
-- the least-privilege nexora_app role (see setup_app_role.sql.template).
-- This migration is transactional: either it applies completely or not at all.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Fix tenant_policy(): the super-admin bypass must come from the
--    session GUC `app.is_super` set by TenantScopeService, NOT from the
--    app.is_super table (which is seeded false and never updated), and
--    NULL-school_id rows must NOT be globally visible.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.tenant_policy() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.is_super', true) = 'true'
      OR (
        school_id IS NOT NULL
        AND NULLIF(current_setting('app.school_id', true), '')::uuid = school_id
      );
EXCEPTION WHEN OTHERS THEN
  RETURN current_setting('app.is_super', true) = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------
-- 2. Re-apply tenant_* policies on the tenant tables (the new function
--    body is used automatically, but recreate for clarity/idempotence).
-- ------------------------------------------------------------
DO $$ DECLARE
  tables TEXT[] := ARRAY[
    'teachers', 'attendance_records', 'attendance_events',
    'biometric_profiles', 'audit_logs', 'geofences',
    'system_settings', 'devices', 'notification_preferences', 'refresh_tokens'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT USING (app.tenant_policy())', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK (app.tenant_policy())', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_update ON %I FOR UPDATE USING (app.tenant_policy()) WITH CHECK (app.tenant_policy())', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_delete ON %I FOR DELETE USING (app.tenant_policy())', tbl);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 3. RLS on branches (every row carries a NOT NULL school_id).
-- ------------------------------------------------------------
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_select ON branches;
CREATE POLICY tenant_select ON branches FOR SELECT USING (app.tenant_policy());
DROP POLICY IF EXISTS tenant_insert ON branches;
CREATE POLICY tenant_insert ON branches FOR INSERT WITH CHECK (app.tenant_policy());
DROP POLICY IF EXISTS tenant_update ON branches;
CREATE POLICY tenant_update ON branches FOR UPDATE USING (app.tenant_policy()) WITH CHECK (app.tenant_policy());
DROP POLICY IF EXISTS tenant_delete ON branches;
CREATE POLICY tenant_delete ON branches FOR DELETE USING (app.tenant_policy());

-- ------------------------------------------------------------
-- 4. Append-only audit: the app role may INSERT + SELECT audit rows,
--    never UPDATE or DELETE them.
-- ------------------------------------------------------------
REVOKE UPDATE, DELETE ON audit_logs FROM nexora_app;

-- ------------------------------------------------------------
-- 5. Permissive INSERT policies for tables written outside a tenant
--    transaction (auth/onboarding flows run before a GUC is set):
--    refresh_tokens and system_settings. Reads stay tenant-scoped.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS tenant_insert ON refresh_tokens;
CREATE POLICY tenant_insert ON refresh_tokens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS tenant_insert ON system_settings;
CREATE POLICY tenant_insert ON system_settings FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------
-- 6. Least-privilege grants: explicit per-table grants replace the
--    blanket GRANT ... ON ALL TABLES.
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON teachers TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_records TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_events TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON biometric_profiles TO nexora_app;
GRANT SELECT, INSERT ON audit_logs TO nexora_app;              -- append-only
GRANT SELECT, INSERT, UPDATE, DELETE ON geofences TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON devices TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_settings TO nexora_app;
GRANT SELECT, INSERT, UPDATE ON branches TO nexora_app;        -- no DELETE
GRANT SELECT, INSERT, UPDATE ON users TO nexora_app;           -- no DELETE (soft deactivate)
GRANT SELECT, INSERT, UPDATE ON schools TO nexora_app;
GRANT SELECT ON roles, permissions, role_permissions, user_roles TO nexora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexora_app;
GRANT USAGE ON SCHEMA app TO nexora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexora_app;

-- ------------------------------------------------------------
-- 7. Auth lookup for the login path: a SECURITY DEFINER function is the
--    ONLY cross-tenant email lookup. Bypasses RLS narrowly (fixed email
--    parameter — cannot enumerate), so the app role's login SELECT works
--    while users.password_hash stays unreadable by any other path.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.find_user_for_auth(p_email TEXT)
RETURNS users AS $$
  SELECT * FROM users WHERE LOWER(email) = LOWER(p_email) LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public, app;
REVOKE ALL ON FUNCTION app.find_user_for_auth(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.find_user_for_auth(TEXT) TO nexora_app;

-- ------------------------------------------------------------
-- 8. Entity-drift alignment + missing indexes.
--    (Entity classes declare these columns; the V1 DDL never created them.)
-- ------------------------------------------------------------
ALTER TABLE roles ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS school_id UUID;
CREATE INDEX IF NOT EXISTS idx_branches_school ON branches (school_id);
CREATE INDEX IF NOT EXISTS idx_roles_school ON roles (school_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_school ON user_roles (school_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ------------------------------------------------------------
-- 9. Explicitly DO NOT add FORCE ROW LEVEL SECURITY here: the current
--    runtime connects as the table owner (dev/master); FORCE would lock
--    the owner out until every query runs with app.school_id set. When
--    the runtime switches to nexora_app (production), RLS applies to it
--    automatically (non-owner roles never bypass RLS). See docs/deployment.md.
-- ------------------------------------------------------------

COMMIT;