import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * Structured request logging: request id, timestamp, route, status, duration.
 * Never logs passwords, tokens, or personal data beyond route + actor id.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { id: string }; id?: string }>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          // Console logging keeps V1 dependency-free; a structured logger can replace it later.
          // eslint-disable-next-line no-console
          console.info(
            JSON.stringify({
              level: 'info',
              time: new Date().toISOString(),
              requestId: request.id ?? response.getHeader('x-request-id') ?? '-',
              method: request.method,
              route: request.originalUrl?.split('?')[0],
              status: response.statusCode,
              durationMs,
              actorId: request.user?.id ?? null,
            }),
          );
        },
      }),
    );
  }
}
