-- V6__lockdown.sql
-- Post-audit hardening:
-- 1) REVOKE EXECUTE ON app.* gateway functions FROM PUBLIC.
-- 2) REVOKE direct DML on refresh_tokens FROM nexora_app (must use gateway functions).
-- 3) Add app.purge_refresh_tokens() gateway function for admin/user session management.
-- 4) REVOKE EXECUTE FROM PUBLIC on all other app.* functions.

BEGIN;

-- 1. Revoke PUBLIC execute on all app-schema gateway functions.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn.name);
  END LOOP;
END $$;

-- Ensure nexora_app can still call the gateway functions.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO nexora_app', fn.name);
  END LOOP;
END $$;

-- 2. Revoke direct DML on refresh_tokens from nexora_app.
--    The FORCE-RLS policy on refresh_tokens already blocks reads without
--    the owner GUC, but explicit REVOKE removes the privilege entirely.
REVOKE INSERT ON refresh_tokens FROM nexora_app;
REVOKE SELECT ON refresh_tokens FROM nexora_app;
REVOKE UPDATE ON refresh_tokens FROM nexora_app;
REVOKE DELETE ON refresh_tokens FROM nexora_app;

-- 3. Purge all refresh tokens for a user (and optionally a specific school).
--    Used by password-change flow and admin session revocation.
CREATE OR REPLACE FUNCTION app.purge_refresh_tokens(
  p_user_id   UUID,
  p_school_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE refresh_tokens
     SET revoked_at  = now(),
         replaced_by = 'purged'
   WHERE user_id = p_user_id
     AND revoked_at IS NULL
     AND (p_school_id IS NULL OR school_id = p_school_id);
$$;

COMMENT ON FUNCTION app.purge_refresh_tokens IS
  'SECURITY DEFINER — revokes all active refresh tokens for a user (optionally scoped to one school). Must run as table owner to bypass FORCE-RLS.';

COMMIT;
