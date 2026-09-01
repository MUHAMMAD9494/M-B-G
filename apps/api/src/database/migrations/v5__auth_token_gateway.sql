-- V5__auth_token_gateway.sql
--
-- refresh_tokens is FORCE-RLS protected, but authentication is inherently a
-- PRE-TENANT-GUC flow (login/refresh run before app.school_id is set for the
-- session). Direct INSERT ... RETURNING / SELECT / UPDATE by the app role
-- therefore fails policy checks. Fix: route ALL refresh-token persistence
-- through SECURITY DEFINER gateway functions (owner-privileged, but the only
-- such surface beside app.find_user_for_auth). The app role retains NO direct
-- DML on refresh_tokens.
BEGIN;

-- Store a new refresh token; returns the row id.
CREATE OR REPLACE FUNCTION app.store_refresh_token(
  p_user_id uuid,
  p_school_id uuid,
  p_token_hash text,
  p_expires_at timestamptz,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO refresh_tokens (user_id, school_id, token_hash, expires_at, ip_address, user_agent)
  VALUES (p_user_id, p_school_id, p_token_hash, p_expires_at, p_ip_address, p_user_agent)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Look up a refresh token by its SHA-256 hash.
CREATE OR REPLACE FUNCTION app.find_refresh_token(p_token_hash text)
RETURNS SETOF refresh_tokens
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT * FROM refresh_tokens WHERE token_hash = p_token_hash;
END;
$$;

-- Revoke active tokens for a user (except p_except_id, if any).
CREATE OR REPLACE FUNCTION app.revoke_refresh_tokens(
  p_user_id uuid,
  p_except_id uuid DEFAULT NULL,
  p_replaced_by text DEFAULT 'revoked'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE refresh_tokens
     SET revoked_at = now(), replaced_by = p_replaced_by
   WHERE user_id = p_user_id
     AND revoked_at IS NULL
     AND (p_except_id IS NULL OR id <> p_except_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Revoke a token by its hash (logout path).
CREATE OR REPLACE FUNCTION app.revoke_refresh_token_by_hash(
  p_token_hash text,
  p_replaced_by text DEFAULT 'revoked'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE refresh_tokens
     SET revoked_at = now(), replaced_by = p_replaced_by
   WHERE token_hash = p_token_hash AND revoked_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION app.store_refresh_token(uuid, uuid, text, timestamptz, text, text) TO nexora_app;
GRANT EXECUTE ON FUNCTION app.find_refresh_token(text) TO nexora_app;
GRANT EXECUTE ON FUNCTION app.revoke_refresh_tokens(uuid, uuid, text) TO nexora_app;
GRANT EXECUTE ON FUNCTION app.revoke_refresh_token_by_hash(text, text) TO nexora_app;

COMMIT;