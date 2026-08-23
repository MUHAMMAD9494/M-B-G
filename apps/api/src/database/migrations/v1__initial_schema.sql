-- ============================================================
-- NEXORA SMART EDU V1 — Schema Migration
-- Run as database owner (nexora), NOT nexora_app.
-- ============================================================

BEGIN;

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1b. Application helper schema (for RLS context variables)
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Create least-privilege application role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nexora_app') THEN
    CREATE ROLE nexora_app WITH NOLOGIN NOINHERIT;
  END IF;
END
$$;

-- 3. Helper: app.is_super flag (bypasses RLS for SUPER_ADMIN)
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS app.is_super (is_super boolean PRIMARY KEY);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
INSERT INTO app.is_super (is_super) VALUES (false)
ON CONFLICT DO NOTHING;
GRANT SELECT ON app.is_super TO nexora_app;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS app.school_id (school_id uuid PRIMARY KEY);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
GRANT SELECT ON app.school_id TO nexora_app;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  logo_url VARCHAR(500),
  address VARCHAR(300),
  phone VARCHAR(30),
  email VARCHAR(320),
  timezone VARCHAR(64) DEFAULT 'Africa/Lagos',
  working_days JSONB DEFAULT '[1,2,3,4,5]',
  late_threshold_minutes INTEGER DEFAULT 15,
  early_departure_threshold_minutes INTEGER DEFAULT 30,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name VARCHAR(200) NOT NULL,
  address VARCHAR(300),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  timezone VARCHAR(64),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE (role_id, permission_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  email VARCHAR(320) NOT NULL,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'TEACHER',
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_school ON users (school_id);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE (user_id, role_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES users(id),
  employee_id VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(320),
  department VARCHAR(100),
  designation VARCHAR(100),
  employment_status VARCHAR(20) DEFAULT 'ACTIVE',
  attendance_status BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_employee ON teachers (school_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers (school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user ON teachers (user_id);

CREATE TABLE IF NOT EXISTS geofences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_geofences_school ON geofences (school_id);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  branch_id UUID REFERENCES branches(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_latitude DECIMAL(10, 7),
  check_in_longitude DECIMAL(10, 7),
  check_in_accuracy DECIMAL(10, 2),
  check_in_geofence_status VARCHAR(20),
  check_in_verification_status VARCHAR(30),
  check_out_latitude DECIMAL(10, 7),
  check_out_longitude DECIMAL(10, 7),
  check_out_accuracy DECIMAL(10, 2),
  check_out_geofence_status VARCHAR(20),
  check_out_verification_status VARCHAR(30),
  status VARCHAR(20) DEFAULT 'PRESENT',
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_att_records_school_date ON attendance_records (school_id, date);
CREATE INDEX IF NOT EXISTS idx_att_records_teacher ON attendance_records (teacher_id);
CREATE INDEX IF NOT EXISTS idx_att_records_branch ON attendance_records (branch_id);

CREATE TABLE IF NOT EXISTS attendance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  branch_id UUID REFERENCES branches(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  record_id UUID REFERENCES attendance_records(id),
  attendance_type VARCHAR(20) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  accuracy DECIMAL(10, 2),
  geofence_status VARCHAR(20),
  identity_verification_status VARCHAR(30),
  liveness_status VARCHAR(30),
  device_id VARCHAR(255),
  offline_created BOOLEAN DEFAULT false,
  sync_status VARCHAR(20) DEFAULT 'SYNCED',
  verification_method VARCHAR(50),
  risk_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_att_events_school ON attendance_events (school_id);
CREATE INDEX IF NOT EXISTS idx_att_events_teacher ON attendance_events (teacher_id);
CREATE INDEX IF NOT EXISTS idx_att_events_record ON attendance_events (record_id);

CREATE TABLE IF NOT EXISTS biometric_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  teacher_id UUID NOT NULL REFERENCES teachers(id),
  provider_type VARCHAR(50) NOT NULL,
  embedding_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  enrolled_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_biometric_school ON biometric_profiles (school_id);
CREATE INDEX IF NOT EXISTS idx_biometric_teacher ON biometric_profiles (teacher_id);

CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  user_id UUID REFERENCES users(id),
  device_identifier VARCHAR(255) NOT NULL,
  device_type VARCHAR(50),
  platform VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (user_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID,
  actor_id UUID,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_school ON audit_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs (action);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id UUID,
  channel VARCHAR(30) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, channel)
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID,
  key VARCHAR(200) NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_key_school ON system_settings (key, school_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on tenant-owned tables
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Super-admin bypass: if app.is_super = true, see all rows.
-- Otherwise, filter to rows matching current_setting('app.school_id').

CREATE OR REPLACE FUNCTION app.tenant_policy() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT is_super FROM app.is_super)
      OR (school_id IS NULL)
      OR (school_id = current_setting('app.school_id', true));
EXCEPTION WHEN OTHERS THEN
  -- current_setting returns empty string if not set; treat as no-match
  RETURN (SELECT is_super FROM app.is_super)
      OR (school_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Apply policies (DO NOTHING on conflict with existing policy names)
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

-- ============================================================
-- GRANTS (least-privilege: nexora_app can only DML, no DDL)
-- ============================================================

GRANT USAGE ON SCHEMA public TO nexora_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexora_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexora_app;

-- Ensure future tables in public schema are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nexora_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO nexora_app;

-- ============================================================
-- SEED ROLES + PERMISSIONS
-- ============================================================

INSERT INTO roles (name, description) VALUES
  ('SUPER_ADMIN', 'Full platform access across all tenants'),
  ('SCHOOL_OWNER', 'School owner with full school access'),
  ('SCHOOL_ADMIN', 'School administrator'),
  ('HR_ADMIN', 'Human resources administrator'),
  ('PRINCIPAL', 'School principal'),
  ('VICE_PRINCIPAL', 'Vice principal'),
  ('TEACHER', 'Teacher with attendance capabilities'),
  ('STAFF', 'General staff member')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('school.read', 'View school configuration'),
  ('school.update', 'Update school configuration'),
  ('users.read', 'View users'),
  ('users.create', 'Create users'),
  ('users.update', 'Update users'),
  ('users.disable', 'Disable/enable users'),
  ('teachers.read', 'View teachers'),
  ('teachers.create', 'Create teachers'),
  ('teachers.update', 'Update teachers'),
  ('teachers.delete', 'Delete teachers'),
  ('attendance.read', 'View attendance records'),
  ('attendance.create', 'Record attendance (check-in/out)'),
  ('attendance.correct', 'Correct attendance records'),
  ('attendance.approve', 'Approve attendance corrections'),
  ('attendance.export', 'Export attendance data'),
  ('reports.read', 'View reports'),
  ('reports.export', 'Export reports'),
  ('settings.read', 'View settings'),
  ('settings.update', 'Update settings'),
  ('audit.read', 'View audit logs')
ON CONFLICT (name) DO NOTHING;

-- SUPER_ADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

-- SCHOOL_OWNER gets everything except audit.read (and has school-level scope)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.name = 'SCHOOL_OWNER' AND p.name != 'audit.read'
ON CONFLICT DO NOTHING;

-- SCHOOL_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'SCHOOL_ADMIN' AND p.name IN (
  'school.read', 'school.update', 'users.read', 'users.create', 'users.update', 'users.disable',
  'teachers.read', 'teachers.create', 'teachers.update', 'teachers.delete',
  'attendance.read', 'attendance.create', 'attendance.correct', 'attendance.approve',
  'reports.read', 'reports.export', 'settings.read', 'settings.update', 'audit.read'
)
ON CONFLICT DO NOTHING;

-- TEACHER gets attendance self-service + basic reads
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'TEACHER' AND p.name IN (
  'attendance.create', 'attendance.read', 'school.read'
)
ON CONFLICT DO NOTHING;

-- HR_ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name = 'HR_ADMIN' AND p.name IN (
  'school.read', 'users.read', 'users.create', 'users.update',
  'teachers.read', 'teachers.create', 'teachers.update',
  'attendance.read', 'reports.read', 'reports.export', 'settings.read'
)
ON CONFLICT DO NOTHING;

COMMIT;