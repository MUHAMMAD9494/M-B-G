import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM_KEY } from './skip-transform.decorator';

interface Envelope {
  success: boolean;
  data?: unknown;
  meta?: unknown;
  error?: unknown;
}

/**
 * Wraps successful controller results in `{ success:true, data, meta }`.
 * Handlers decorated with @SkipTransform() (e.g. CSV export) bypass wrapping.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload: unknown) => {
        if (payload && typeof payload === 'object' && 'success' in (payload as Envelope)) {
          return payload;
        }
        const meta =
          payload && typeof payload === 'object' && 'meta' in (payload as Envelope)
            ? (payload as Envelope).meta
            : undefined;
        const data =
          payload && typeof payload === 'object' && 'data' in (payload as Envelope)
            ? (payload as Envelope).data
            : payload;
        return { success: true, data, ...(meta ? { meta } : {}) };
      }),
    );
  }
}
