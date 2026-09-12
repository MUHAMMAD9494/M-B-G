"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSetting = exports.NotificationPreference = exports.RefreshToken = exports.AuditLog = exports.Device = exports.BiometricProfile = exports.Geofence = exports.AttendanceEvent = exports.AttendanceRecord = exports.Teacher = exports.UserRole = exports.PermissionEntity = exports.Role = exports.User = exports.Branch = exports.School = exports.entities = void 0;
const school_entity_1 = require("./school.entity");
Object.defineProperty(exports, "School", { enumerable: true, get: function () { return school_entity_1.School; } });
const branch_entity_1 = require("./branch.entity");
Object.defineProperty(exports, "Branch", { enumerable: true, get: function () { return branch_entity_1.Branch; } });
const user_entity_1 = require("./user.entity");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return user_entity_1.User; } });
const role_entity_1 = require("./role.entity");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return role_entity_1.Role; } });
const permission_entity_1 = require("./permission.entity");
Object.defineProperty(exports, "PermissionEntity", { enumerable: true, get: function () { return permission_entity_1.PermissionEntity; } });
const user_role_entity_1 = require("./user-role.entity");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return user_role_entity_1.UserRole; } });
const teacher_entity_1 = require("./teacher.entity");
Object.defineProperty(exports, "Teacher", { enumerable: true, get: function () { return teacher_entity_1.Teacher; } });
const attendance_record_entity_1 = require("./attendance-record.entity");
Object.defineProperty(exports, "AttendanceRecord", { enumerable: true, get: function () { return attendance_record_entity_1.AttendanceRecord; } });
const attendance_event_entity_1 = require("./attendance-event.entity");
Object.defineProperty(exports, "AttendanceEvent", { enumerable: true, get: function () { return attendance_event_entity_1.AttendanceEvent; } });
const geofence_entity_1 = require("./geofence.entity");
Object.defineProperty(exports, "Geofence", { enumerable: true, get: function () { return geofence_entity_1.Geofence; } });
const biometric_profile_entity_1 = require("./biometric-profile.entity");
Object.defineProperty(exports, "BiometricProfile", { enumerable: true, get: function () { return biometric_profile_entity_1.BiometricProfile; } });
const device_entity_1 = require("./device.entity");
Object.defineProperty(exports, "Device", { enumerable: true, get: function () { return device_entity_1.Device; } });
const audit_log_entity_1 = require("./audit-log.entity");
Object.defineProperty(exports, "AuditLog", { enumerable: true, get: function () { return audit_log_entity_1.AuditLog; } });
const refresh_token_entity_1 = require("./refresh-token.entity");
Object.defineProperty(exports, "RefreshToken", { enumerable: true, get: function () { return refresh_token_entity_1.RefreshToken; } });
const notification_preference_entity_1 = require("./notification-preference.entity");
Object.defineProperty(exports, "NotificationPreference", { enumerable: true, get: function () { return notification_preference_entity_1.NotificationPreference; } });
const system_setting_entity_1 = require("./system-setting.entity");
Object.defineProperty(exports, "SystemSetting", { enumerable: true, get: function () { return system_setting_entity_1.SystemSetting; } });
exports.entities = [
    school_entity_1.School,
    branch_entity_1.Branch,
    user_entity_1.User,
    role_entity_1.Role,
    permission_entity_1.PermissionEntity,
    user_role_entity_1.UserRole,
    teacher_entity_1.Teacher,
    attendance_record_entity_1.AttendanceRecord,
    attendance_event_entity_1.AttendanceEvent,
    geofence_entity_1.Geofence,
    biometric_profile_entity_1.BiometricProfile,
    device_entity_1.Device,
    audit_log_entity_1.AuditLog,
    refresh_token_entity_1.RefreshToken,
    notification_preference_entity_1.NotificationPreference,
    system_setting_entity_1.SystemSetting,
];
//# sourceMappingURL=index.js.map