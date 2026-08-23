import { SetMetadata } from '@nestjs/common';
import { Permission } from '@nexora/types';

export const PERMISSIONS_KEY = 'permissions';

/** Declares the permissions required to call a handler. Enforced by PermissionsGuard. */
export const Permissions = (...permissions: (Permission | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
