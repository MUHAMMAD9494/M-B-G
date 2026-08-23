import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

/**
 * Structured application exception. Carries a stable machine-readable code plus
 * a human-safe message. The global filter serializes these into the standard
 * `{ success:false, error:{ code, message } }` envelope.
 */
export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super(message, status);
  }
}
