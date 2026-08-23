import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AppException } from './app-exception';
import { ErrorCodes } from './error-codes';

interface ErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

/**
 * Global exception handler. Guarantees a consistent, safe error envelope and
 * never leaks stack traces to clients. AppExceptions map to their stable code;
 * everything else becomes INTERNAL_ERROR (or a mapped HTTP status).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let body: ErrorBody = {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    };

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = { code: exception.code, message: exception.message, details: exception.details };
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message ?? exception.message;
      const code = status === HttpStatus.UNAUTHORIZED ? ErrorCodes.UNAUTHORIZED
        : status === HttpStatus.FORBIDDEN ? ErrorCodes.FORBIDDEN
        : status === HttpStatus.NOT_FOUND ? ErrorCodes.NOT_FOUND
        : status === HttpStatus.TOO_MANY_REQUESTS ? ErrorCodes.RATE_LIMITED
        : ErrorCodes.INTERNAL_ERROR;
      body = {
        code,
        message: Array.isArray(message) ? message.join('; ') : String(message),
      };
    } else {
      this.logger.error(
        exception instanceof Error ? `${exception.message}\n${exception.stack}` : String(exception),
      );
    }

    if (status >= 500) {
      this.logger.error(`HTTP ${status} ${body.code}: ${body.message}`);
    }

    response.status(status).json({ success: false, error: body });
  }
}
