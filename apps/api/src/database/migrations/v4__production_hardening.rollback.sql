-- V4__production_hardening.rollback.sql
-- NOTE: rollback is destructive (drops columns + index). Rehearse in a
-- scratch database before using on a live database.
BEGIN;

DROP INDEX IF EXISTS uq_att_events_client_event;
ALTER TABLE attendance_events DROP COLUMN IF EXISTS client_event_id;
ALTER TABLE attendance_events DROP CONSTRAINT IF EXISTS ck_att_events_verification_state;
ALTER TABLE attendance_events DROP COLUMN IF EXISTS verification_state;
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS ck_att_records_verification_state;
ALTER TABLE attendance_records DROP COLUMN IF EXISTS verification_state;
ALTER TABLE schools DROP CONSTRAINT IF EXISTS ck_schools_data_plane_type;
ALTER TABLE schools DROP COLUMN IF EXISTS data_plane_type;
ALTER TABLE schools DROP COLUMN IF EXISTS data_plane_ref;
ALTER TABLE schools DROP COLUMN IF EXISTS data_plane_config_ref;

COMMIT;