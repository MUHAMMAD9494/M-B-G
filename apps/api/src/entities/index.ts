import { School } from './school.entity';
import { Branch } from './branch.entity';
import { User } from './user.entity';
import { Role } from './role.entity';
import { PermissionEntity } from './permission.entity';
import { UserRole } from './user-role.entity';
import { Teacher } from './teacher.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AttendanceEvent } from './attendance-event.entity';
import { Geofence } from './geofence.entity';
import { BiometricProfile } from './biometric-profile.entity';
import { Device } from './device.entity';
import { AuditLog } from './audit-log.entity';
import { RefreshToken } from './refresh-token.entity';
import { NotificationPreference } from './notification-preference.entity';
import { SystemSetting } from './system-setting.entity';

/** Canonical entity list used by both TypeOrmModule.forRoot and the CLI DataSource. */
export const entities = [
  School,
  Branch,
  User,
  Role,
  PermissionEntity,
  UserRole,
  Teacher,
  AttendanceRecord,
  AttendanceEvent,
  Geofence,
  BiometricProfile,
  Device,
  AuditLog,
  RefreshToken,
  NotificationPreference,
  SystemSetting,
];

export {
  School,
  Branch,
  User,
  Role,
  PermissionEntity,
  UserRole,
  Teacher,
  AttendanceRecord,
  AttendanceEvent,
  Geofence,
  BiometricProfile,
  Device,
  AuditLog,
  RefreshToken,
  NotificationPreference,
  SystemSetting,
};
