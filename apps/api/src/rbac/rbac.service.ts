import { Injectable } from '@nestjs/common';
import { Permission, RoleName, ROLE_PERMISSIONS } from '@nexora/types';

/**
 * Canonical role → permission resolution. V1 uses the built-in role map; the
 * `roles` / `permissions` tables exist so custom per-tenant roles can be added
 * later without a breaking change.
 */
@Injectable()
export class RbacService {
  permissionsForRole(role: RoleName): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  hasPermission(role: RoleName, permission: Permission): boolean {
    return this.permissionsForRole(role).includes(permission);
  }
}
