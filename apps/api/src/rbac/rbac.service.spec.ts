import { RbacService } from './rbac.service';
import { Permission, RoleName } from '@nexora/types';

describe('RbacService', () => {
  const rbac = new RbacService();

  it('grants SUPER_ADMIN every permission', () => {
    const perms = rbac.permissionsForRole(RoleName.SUPER_ADMIN);
    expect(perms).toHaveLength(Object.values(Permission).length);
    expect(perms).toContain(Permission.AUDIT_READ);
    expect(perms).toContain(Permission.ATTENDANCE_CORRECT);
  });

  it('grants TEACHER only self-service attendance permissions', () => {
    const perms = rbac.permissionsForRole(RoleName.TEACHER);
    expect(perms).toContain(Permission.ATTENDANCE_CREATE);
    expect(perms).toContain(Permission.ATTENDANCE_READ);
    expect(perms).not.toContain(Permission.USERS_CREATE);
    expect(perms).not.toContain(Permission.AUDIT_READ);
    expect(perms).not.toContain(Permission.REPORTS_READ);
  });

  it('grants SCHOOL_ADMIN tenant-level admin permissions', () => {
    const perms = rbac.permissionsForRole(RoleName.SCHOOL_ADMIN);
    expect(perms).toContain(Permission.TEACHERS_CREATE);
    expect(perms).toContain(Permission.USERS_CREATE);
    expect(perms).toContain(Permission.REPORTS_READ);
    expect(perms).toContain(Permission.AUDIT_READ); // tenant admins can view their own audit log
  });

  it('returns empty for an unknown role', () => {
    expect(rbac.permissionsForRole('UNKNOWN' as RoleName)).toEqual([]);
  });
});
