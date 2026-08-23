import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TokenService, AccessTokenPayload } from '../../auth/token.service';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { AuthUser } from '@nexora/types';

/**
 * Global JWT guard. Reads the access token from the HTTP-only cookie or the
 * Authorization: Bearer header, verifies it, and attaches an AuthUser to the
 * request. Routes marked @Public() skip authentication.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.tokens.verifyAccessToken(token);
    } catch {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Session expired. Please sign in again.' });
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid token type.' });
    }

    request.user = {
      id: payload.sub,
      schoolId: payload.schoolId,
      email: payload.email,
      phone: payload.phone ?? null,
      firstName: payload.firstName,
      lastName: payload.lastName,
      role: payload.role,
      status: payload.status,
      permissions: payload.permissions,
    } satisfies AuthUser;

    return true;
  }

  private extractToken(request: { headers?: Record<string, string>; cookies?: Record<string, string> }): string | null {
    const header = request.headers?.authorization;
    if (header?.startsWith('Bearer ')) return header.slice(7);
    return request.cookies?.nse_access ?? null;
  }
}
