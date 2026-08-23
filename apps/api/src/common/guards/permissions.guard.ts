import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../permissions.decorator';
import { AuthUser, Permission } from '@nexora/types';

/**
 * Enforces granular permissions server-side. A handler decorated with
 * @Permissions('teachers.read') is only reachable when the authenticated
 * user's role carries that permission. SUPER_ADMIN bypasses nothing: it holds
 * every permission in the map.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<(Permission | string)[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const user = request.user;
    if (!user) return false;

    const ok = required.every((permission) => user.permissions.includes(permission as Permission));
    if (!ok) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }
    return true;
  }
}
