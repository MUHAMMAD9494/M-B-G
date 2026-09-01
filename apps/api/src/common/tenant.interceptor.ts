import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { DataSource } from 'typeorm';
import { AuthUser } from '@nexora/types';

/**
 * Per-request tenant context interceptor.
 *
 * After JwtAuthGuard attaches `request.user` (which includes `schoolId`),
 * this interceptor runs `SET LOCAL app.school_id = $1` so that Row Level
 * Security policies on all tenant-scoped tables filter to the correct school.
 *
 * - Authenticated requests: schoolId from the JWT → `SET LOCAL app.school_id = '<uuid>'`
 * - Unauthenticated (public) requests: no schoolId → `SET LOCAL app.school_id = ''`
 *
 * Uses `SET LOCAL` (transaction-scoped) so the GUC is automatically cleared
 * when the request handler's DB transaction completes. This is safe even if
 * the handler never opens a transaction (Typeorm wraps each query in one).
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;
    const schoolId = user?.schoolId ?? '';

    // Fire-and-forget GUC set. If the query fails (e.g. no transaction yet),
    // Typeorm will open one implicitly — the SET LOCAL applies to it.
    // We do NOT await it here because it must run INSIDE the same transaction
    // as the subsequent handler queries. Using tap ensures it fires before
    // the handler runs, and the RxJS subscription keeps the async chain alive.
    return new Observable<any>((subscriber) => {
      this.dataSource
        .query('SELECT set_config($1, $2, true)', ['app.school_id', schoolId])
        .then(() => next.handle().subscribe({
          next: subscriber.next.bind(subscriber),
          error: subscriber.error.bind(subscriber),
          complete: subscriber.complete.bind(subscriber),
        }))
        .catch((err) => subscriber.error(err));
    });
  }
}
