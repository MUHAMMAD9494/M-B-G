-- ============================================================
-- V3 — Fix tenant policies (inline expressions)
--
-- V2 (like V1 before it) implemented policies via app.tenant_policy(), a
-- plpgsql SECURITY DEFINER function. plpgsql functions used in RLS policies
-- resolve unqualified column references (school_id) to NULL rather than to
-- the policy table's row, so the school-scope branch always evaluated to
-- NULL/false — with app.is_super unset, EVERY tenant row was invisible to
-- the app role. (Verified live: matching row + matching GUC still filtered.)
--
-- This migration rewrites every tenant_* policy with inline expressions,
-- which resolve table columns directly and are guaranteed to work. The
-- app.tenant_policy() function is kept (unused) for compatibility.
-- ============================================================

BEGIN;

-- The tenant scope check: session GUC app.is_super='true' bypasses;
-- otherwise the row's school_id must equal the session app.school_id GUC
-- (''/unset matches nothing; NULL school_id rows are platform-global and
-- only visible to super-admin contexts).
DO $$ DECLARE
  tables TEXT[] := ARRAY[
    'teachers', 'attendance_records', 'attendance_events',
    'biometric_profiles', 'geofences',
    'devices', 'notification_preferences', 'branches'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_select ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_select ON %I FOR SELECT USING (current_setting(''app.is_super'', true) = ''true'' OR (school_id IS NOT NULL AND NULLIF(current_setting(''app.school_id'', true), '''')::uuid = school_id))', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_insert ON %I FOR INSERT WITH CHECK (current_setting(''app.is_super'', true) = ''true'' OR (school_id IS NOT NULL AND NULLIF(current_setting(''app.school_id'', true), '''')::uuid = school_id))', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_update ON %I FOR UPDATE USING (current_setting(''app.is_super'', true) = ''true'' OR (school_id IS NOT NULL AND NULLIF(current_setting(''app.school_id'', true), '''')::uuid = school_id)) WITH CHECK (current_setting(''app.is_super'', true) = ''true'' OR (school_id IS NOT NULL AND NULLIF(current_setting(''app.school_id'', true), '''')::uuid = school_id))', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete ON %I', tbl);
    EXECUTE format('CREATE POLICY tenant_delete ON %I FOR DELETE USING (current_setting(''app.is_super'', true) = ''true'' OR (school_id IS NOT NULL AND NULLIF(current_setting(''app.school_id'', true), '''')::uuid = school_id))', tbl);
  END LOOP;
END $$;

-- audit_logs: append-only + tenant-scoped read.
DROP POLICY IF EXISTS tenant_select ON audit_logs;
CREATE POLICY tenant_select ON audit_logs FOR SELECT USING (current_setting('app.is_super', true) = 'true' OR (school_id IS NOT NULL AND NULLIF(current_setting('app.school_id', true), '')::uuid = school_id));
DROP POLICY IF EXISTS tenant_insert ON audit_logs;
CREATE POLICY tenant_insert ON audit_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS tenant_update ON audit_logs;
CREATE POLICY tenant_update ON audit_logs FOR UPDATE USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS tenant_delete ON audit_logs;
CREATE POLICY tenant_delete ON audit_logs FOR DELETE USING (false);

-- refresh_tokens / system_settings: permissive INSERT (written by
-- auth/onboarding flows before any tenant GUC is set), scoped reads.
DROP POLICY IF EXISTS tenant_insert ON refresh_tokens;
CREATE POLICY tenant_insert ON refresh_tokens FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS tenant_insert ON system_settings;
CREATE POLICY tenant_insert ON system_settings FOR INSERT WITH CHECK (true);

COMMIT;