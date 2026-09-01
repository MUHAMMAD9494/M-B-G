-- V4__production_hardening.sql
-- 1) Auditable verification state (verbatim requirement: "verified online /
--    verified locally / pending verification / failed verification").
-- 2) Server-side idempotency key for offline sync (client_event_id).
-- 3) Control-plane / data-plane routing metadata on the tenant registry
--    (schools) — refs only, NEVER credentials, NEVER school data.
BEGIN;

-- 1a. verification_state on attendance_events
ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS verification_state VARCHAR(30) NOT NULL DEFAULT 'verified_online',
  ADD CONSTRAINT ck_att_events_verification_state CHECK (
    verification_state IN ('verified_online','verified_local','pending_verification','failed_verification')
  );

-- Backfill: offline events whose liveness was deferred were tagged
-- verification_method = 'gps_offline_deferred' → they are pending verification.
UPDATE attendance_events
   SET verification_state = 'pending_verification'
 WHERE offline_created = TRUE
   AND verification_method = 'gps_offline_deferred';

UPDATE attendance_events
   SET verification_state = 'failed_verification'
 WHERE liveness_status = 'FAILED';

-- 1b. parity column on the rolled-up records view
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS verification_state VARCHAR(30),
  ADD CONSTRAINT ck_att_records_verification_state CHECK (
    verification_state IS NULL OR
    verification_state IN ('verified_online','verified_local','pending_verification','failed_verification')
  );

-- 2. Idempotency key: client_event_id is generated on the device and reused
--    on retries; (school_id, client_event_id) must be unique when present so
--    a replayed sync can never create a duplicate attendance event.
ALTER TABLE attendance_events
  ADD COLUMN IF NOT EXISTS client_event_id VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_att_events_client_event
  ON attendance_events (school_id, client_event_id)
  WHERE client_event_id IS NOT NULL;

-- 3. Control-plane registry routing metadata (refs only, no credentials).
ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS data_plane_type VARCHAR(20) NOT NULL DEFAULT 'shared',
  ADD COLUMN IF NOT EXISTS data_plane_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_plane_config_ref VARCHAR(255),
  ADD COLUMN IF NOT EXISTS data_plane_status VARCHAR(20) NOT NULL DEFAULT 'provisioned',
  ADD CONSTRAINT ck_schools_data_plane_type CHECK (data_plane_type IN ('shared','dedicated')),
  ADD CONSTRAINT ck_schools_data_plane_status CHECK (data_plane_status IN ('provisioned','provisioning','failed'));

COMMENT ON COLUMN attendance_events.verification_state IS
  'Auditable verification state: verified_online | verified_local | pending_verification | failed_verification';
COMMENT ON COLUMN attendance_events.client_event_id IS
  'Device-generated idempotency key; unique per school when present.';
COMMENT ON COLUMN schools.data_plane_ref IS
  'Opaque reference to the tenant data-plane endpoint (e.g. supabase project ref). NEVER credentials.';
COMMENT ON COLUMN schools.data_plane_config_ref IS
  'Opaque key into the platform secret store for this tenant DB connection. NEVER credentials in this table.';

COMMIT;