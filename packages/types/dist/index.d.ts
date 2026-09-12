/**
 * @nexora/types — shared domain types, enums and permission model.
 * Single source of truth consumed by both the API and the web client.
 */
export declare enum UserStatus {
    ACTIVE = "ACTIVE",
    DISABLED = "DISABLED",
    SUSPENDED = "SUSPENDED"
}
export declare enum RoleName {
    SUPER_ADMIN = "SUPER_ADMIN",
    SCHOOL_OWNER = "SCHOOL_OWNER",
    SCHOOL_ADMIN = "SCHOOL_ADMIN",
    HR_ADMIN = "HR_ADMIN",
    PRINCIPAL = "PRINCIPAL",
    VICE_PRINCIPAL = "VICE_PRINCIPAL",
    TEACHER = "TEACHER",
    STAFF = "STAFF"
}
export declare enum BranchStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE"
}
export declare enum EmploymentStatus {
    ACTIVE = "ACTIVE",
    ON_LEAVE = "ON_LEAVE",
    TERMINATED = "TERMINATED"
}
export declare enum DeviceStatus {
    ACTIVE = "ACTIVE",
    BLOCKED = "BLOCKED"
}
export declare enum AttendanceType {
    CHECK_IN = "CHECK_IN",
    CHECK_OUT = "CHECK_OUT"
}
export declare enum AttendanceStatus {
    PRESENT = "PRESENT",
    LATE = "LATE",
    EARLY = "EARLY",
    ABSENT = "ABSENT",
    INVALID = "INVALID",
    PENDING_REVIEW = "PENDING_REVIEW"
}
export declare enum GeofenceStatus {
    INSIDE = "INSIDE",
    OUTSIDE = "OUTSIDE",
    UNKNOWN = "UNKNOWN"
}
export declare enum VerificationStatus {
    PENDING = "PENDING",
    PASSED = "PASSED",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED"
}
export declare enum SyncStatus {
    PENDING = "PENDING",
    SYNCING = "SYNCING",
    SYNCED = "SYNCED",
    FAILED = "FAILED",
    CONFLICT = "CONFLICT"
}
export declare enum VerificationMethod {
    GPS = "GPS",
    GEOFENCE = "GEOFENCE",
    FACE = "FACE",
    LIVENESS = "LIVENESS",
    DEVICE = "DEVICE",
    NONE = "NONE"
}
export declare enum Permission {
    SCHOOL_READ = "school.read",
    SCHOOL_UPDATE = "school.update",
    USERS_READ = "users.read",
    USERS_CREATE = "users.create",
    USERS_UPDATE = "users.update",
    USERS_DISABLE = "users.disable",
    TEACHERS_READ = "teachers.read",
    TEACHERS_CREATE = "teachers.create",
    TEACHERS_UPDATE = "teachers.update",
    TEACHERS_DELETE = "teachers.delete",
    ATTENDANCE_READ = "attendance.read",
    ATTENDANCE_CREATE = "attendance.create",
    ATTENDANCE_CORRECT = "attendance.correct",
    ATTENDANCE_APPROVE = "attendance.approve",
    ATTENDANCE_EXPORT = "attendance.export",
    REPORTS_READ = "reports.read",
    REPORTS_EXPORT = "reports.export",
    SETTINGS_READ = "settings.read",
    SETTINGS_UPDATE = "settings.update",
    AUDIT_READ = "audit.read"
}
export declare const ALL_PERMISSIONS: Permission[];
export declare const ROLE_PERMISSIONS: Record<RoleName, Permission[]>;
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
