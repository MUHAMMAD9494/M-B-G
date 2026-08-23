/**
 * @nexora/types — shared domain types, enums and permission model.
 * Single source of truth consumed by both the API and the web client.
 */

// ---------------------------------------------------------------------------
// Identity / status enums
// ---------------------------------------------------------------------------

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  SUSPENDED = 'SUSPENDED',
}

export enum RoleName {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_OWNER = 'SCHOOL_OWNER',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  HR_ADMIN = 'HR_ADMIN',
  PRINCIPAL = 'PRINCIPAL',
  VICE_PRINCIPAL = 'VICE_PRINCIPAL',
  TEACHER = 'TEACHER',
  STAFF = 'STAFF',
}

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum EmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  TERMINATED = 'TERMINATED',
}

export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

// ---------------------------------------------------------------------------
// Attendance enums
// ---------------------------------------------------------------------------

export enum AttendanceType {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  LATE = 'LATE',
  EARLY = 'EARLY',
  ABSENT = 'ABSENT',
  INVALID = 'INVALID',
  PENDING_REVIEW = 'PENDING_REVIEW',
}

export enum GeofenceStatus {
  INSIDE = 'INSIDE',
  OUTSIDE = 'OUTSIDE',
  UNKNOWN = 'UNKNOWN',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum SyncStatus {
  PENDING = 'PENDING',
  SYNCING = 'SYNCING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

export enum VerificationMethod {
  GPS = 'GPS',
  GEOFENCE = 'GEOFENCE',
  FACE = 'FACE',
  LIVENESS = 'LIVENESS',
  DEVICE = 'DEVICE',
  NONE = 'NONE',
}

// ---------------------------------------------------------------------------
// Granular permission model
// ---------------------------------------------------------------------------

export enum Permission {
  SCHOOL_READ = 'school.read',
  SCHOOL_UPDATE = 'school.update',

  USERS_READ = 'users.read',
  USERS_CREATE = 'users.create',
  USERS_UPDATE = 'users.update',
  USERS_DISABLE = 'users.disable',

  TEACHERS_READ = 'teachers.read',
  TEACHERS_CREATE = 'teachers.create',
  TEACHERS_UPDATE = 'teachers.update',
  TEACHERS_DELETE = 'teachers.delete',

  ATTENDANCE_READ = 'attendance.read',
  ATTENDANCE_CREATE = 'attendance.create',
  ATTENDANCE_CORRECT = 'attendance.correct',
  ATTENDANCE_APPROVE = 'attendance.approve',
  ATTENDANCE_EXPORT = 'attendance.export',

  REPORTS_READ = 'reports.read',
  REPORTS_EXPORT = 'reports.export',

  SETTINGS_READ = 'settings.read',
  SETTINGS_UPDATE = 'settings.update',

  AUDIT_READ = 'audit.read',
}

export const ALL_PERMISSIONS: Permission[] = Object.values(Permission);

/** Tenant-admin permissions (everything within their own school). */
const TENANT_ADMIN_PERMISSIONS: Permission[] = [
  Permission.SCHOOL_READ,
  Permission.SCHOOL_UPDATE,
  Permission.USERS_READ,
  Permission.USERS_CREATE,
  Permission.USERS_UPDATE,
  Permission.USERS_DISABLE,
  Permission.TEACHERS_READ,
  Permission.TEACHERS_CREATE,
  Permission.TEACHERS_UPDATE,
  Permission.TEACHERS_DELETE,
  Permission.ATTENDANCE_READ,
  Permission.ATTENDANCE_CREATE,
  Permission.ATTENDANCE_CORRECT,
  Permission.ATTENDANCE_APPROVE,
  Permission.ATTENDANCE_EXPORT,
  Permission.REPORTS_READ,
  Permission.REPORTS_EXPORT,
  Permission.SETTINGS_READ,
  Permission.SETTINGS_UPDATE,
  Permission.AUDIT_READ,
];

export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.SUPER_ADMIN]: ALL_PERMISSIONS,
  [RoleName.SCHOOL_OWNER]: TENANT_ADMIN_PERMISSIONS,
  [RoleName.SCHOOL_ADMIN]: TENANT_ADMIN_PERMISSIONS,
  [RoleName.HR_ADMIN]: [
    Permission.SCHOOL_READ,
    Permission.USERS_READ,
    Permission.TEACHERS_READ,
    Permission.TEACHERS_CREATE,
    Permission.TEACHERS_UPDATE,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_CORRECT,
    Permission.ATTENDANCE_APPROVE,
    Permission.ATTENDANCE_EXPORT,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
    Permission.AUDIT_READ,
  ],
  [RoleName.PRINCIPAL]: [
    Permission.SCHOOL_READ,
    Permission.USERS_READ,
    Permission.TEACHERS_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_APPROVE,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
    Permission.AUDIT_READ,
  ],
  [RoleName.VICE_PRINCIPAL]: [
    Permission.SCHOOL_READ,
    Permission.USERS_READ,
    Permission.TEACHERS_READ,
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_APPROVE,
    Permission.REPORTS_READ,
    Permission.AUDIT_READ,
  ],
  [RoleName.TEACHER]: [
    Permission.ATTENDANCE_READ,
    Permission.ATTENDANCE_CREATE,
  ],
  [RoleName.STAFF]: [Permission.ATTENDANCE_READ, Permission.ATTENDANCE_CREATE],
};

// ---------------------------------------------------------------------------
// Shared DTO-ish shapes (client-facing)
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AuthUser {
  id: string;
  schoolId: string | null;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: RoleName;
  status: UserStatus;
  permissions: Permission[];
}

export interface GeofencePoint {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export type AttendanceEventInput = {
  localEventId: string;
  teacherId: string;
  attendanceType: AttendanceType;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  deviceId: string | null;
  createdOffline: boolean;
  verificationDataReference?: string | null;
};
