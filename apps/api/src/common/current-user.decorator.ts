import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from '@nexora/types';

/** Injects the authenticated user (attached by JwtAuthGuard) into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return request.user;
  },
);
