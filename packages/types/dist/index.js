"use strict";
/**
 * @nexora/types — shared domain types, enums and permission model.
 * Single source of truth consumed by both the API and the web client.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ALL_PERMISSIONS = exports.Permission = exports.VerificationMethod = exports.SyncStatus = exports.VerificationStatus = exports.GeofenceStatus = exports.AttendanceStatus = exports.AttendanceType = exports.DeviceStatus = exports.EmploymentStatus = exports.BranchStatus = exports.RoleName = exports.UserStatus = void 0;
// ---------------------------------------------------------------------------
// Identity / status enums
// ---------------------------------------------------------------------------
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["DISABLED"] = "DISABLED";
    UserStatus["SUSPENDED"] = "SUSPENDED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var RoleName;
(function (RoleName) {
    RoleName["SUPER_ADMIN"] = "SUPER_ADMIN";
    RoleName["SCHOOL_OWNER"] = "SCHOOL_OWNER";
    RoleName["SCHOOL_ADMIN"] = "SCHOOL_ADMIN";
    RoleName["HR_ADMIN"] = "HR_ADMIN";
    RoleName["PRINCIPAL"] = "PRINCIPAL";
    RoleName["VICE_PRINCIPAL"] = "VICE_PRINCIPAL";
    RoleName["TEACHER"] = "TEACHER";
    RoleName["STAFF"] = "STAFF";
})(RoleName || (exports.RoleName = RoleName = {}));
var BranchStatus;
(function (BranchStatus) {
    BranchStatus["ACTIVE"] = "ACTIVE";
    BranchStatus["INACTIVE"] = "INACTIVE";
})(BranchStatus || (exports.BranchStatus = BranchStatus = {}));
var EmploymentStatus;
(function (EmploymentStatus) {
    EmploymentStatus["ACTIVE"] = "ACTIVE";
    EmploymentStatus["ON_LEAVE"] = "ON_LEAVE";
    EmploymentStatus["TERMINATED"] = "TERMINATED";
})(EmploymentStatus || (exports.EmploymentStatus = EmploymentStatus = {}));
var DeviceStatus;
(function (DeviceStatus) {
    DeviceStatus["ACTIVE"] = "ACTIVE";
    DeviceStatus["BLOCKED"] = "BLOCKED";
})(DeviceStatus || (exports.DeviceStatus = DeviceStatus = {}));
// ---------------------------------------------------------------------------
// Attendance enums
// ---------------------------------------------------------------------------
var AttendanceType;
(function (AttendanceType) {
    AttendanceType["CHECK_IN"] = "CHECK_IN";
    AttendanceType["CHECK_OUT"] = "CHECK_OUT";
})(AttendanceType || (exports.AttendanceType = AttendanceType = {}));
var AttendanceStatus;
(function (AttendanceStatus) {
    AttendanceStatus["PRESENT"] = "PRESENT";
    AttendanceStatus["LATE"] = "LATE";
    AttendanceStatus["EARLY"] = "EARLY";
    AttendanceStatus["ABSENT"] = "ABSENT";
    AttendanceStatus["INVALID"] = "INVALID";
    AttendanceStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
})(AttendanceStatus || (exports.AttendanceStatus = AttendanceStatus = {}));
var GeofenceStatus;
(function (GeofenceStatus) {
    GeofenceStatus["INSIDE"] = "INSIDE";
    GeofenceStatus["OUTSIDE"] = "OUTSIDE";
    GeofenceStatus["UNKNOWN"] = "UNKNOWN";
})(GeofenceStatus || (exports.GeofenceStatus = GeofenceStatus = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["PENDING"] = "PENDING";
    VerificationStatus["PASSED"] = "PASSED";
    VerificationStatus["FAILED"] = "FAILED";
    VerificationStatus["SKIPPED"] = "SKIPPED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var SyncStatus;
(function (SyncStatus) {
    SyncStatus["PENDING"] = "PENDING";
    SyncStatus["SYNCING"] = "SYNCING";
    SyncStatus["SYNCED"] = "SYNCED";
    SyncStatus["FAILED"] = "FAILED";
    SyncStatus["CONFLICT"] = "CONFLICT";
})(SyncStatus || (exports.SyncStatus = SyncStatus = {}));
var VerificationMethod;
(function (VerificationMethod) {
    VerificationMethod["GPS"] = "GPS";
    VerificationMethod["GEOFENCE"] = "GEOFENCE";
    VerificationMethod["FACE"] = "FACE";
    VerificationMethod["LIVENESS"] = "LIVENESS";
    VerificationMethod["DEVICE"] = "DEVICE";
    VerificationMethod["NONE"] = "NONE";
})(VerificationMethod || (exports.VerificationMethod = VerificationMethod = {}));
// ---------------------------------------------------------------------------
// Granular permission model
// ---------------------------------------------------------------------------
var Permission;
(function (Permission) {
    Permission["SCHOOL_READ"] = "school.read";
    Permission["SCHOOL_UPDATE"] = "school.update";
    Permission["USERS_READ"] = "users.read";
    Permission["USERS_CREATE"] = "users.create";
    Permission["USERS_UPDATE"] = "users.update";
    Permission["USERS_DISABLE"] = "users.disable";
    Permission["TEACHERS_READ"] = "teachers.read";
    Permission["TEACHERS_CREATE"] = "teachers.create";
    Permission["TEACHERS_UPDATE"] = "teachers.update";
    Permission["TEACHERS_DELETE"] = "teachers.delete";
    Permission["ATTENDANCE_READ"] = "attendance.read";
    Permission["ATTENDANCE_CREATE"] = "attendance.create";
    Permission["ATTENDANCE_CORRECT"] = "attendance.correct";
    Permission["ATTENDANCE_APPROVE"] = "attendance.approve";
    Permission["ATTENDANCE_EXPORT"] = "attendance.export";
    Permission["REPORTS_READ"] = "reports.read";
    Permission["REPORTS_EXPORT"] = "reports.export";
    Permission["SETTINGS_READ"] = "settings.read";
    Permission["SETTINGS_UPDATE"] = "settings.update";
    Permission["AUDIT_READ"] = "audit.read";
})(Permission || (exports.Permission = Permission = {}));
exports.ALL_PERMISSIONS = Object.values(Permission);
/** Tenant-admin permissions (everything within their own school). */
const TENANT_ADMIN_PERMISSIONS = [
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
exports.ROLE_PERMISSIONS = {
    [RoleName.SUPER_ADMIN]: exports.ALL_PERMISSIONS,
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
//# sourceMappingURL=index.js.map