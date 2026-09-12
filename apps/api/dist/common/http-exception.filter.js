"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const app_exception_1 = require("./app-exception");
const error_codes_1 = require("./error-codes");
const log_sanitizer_1 = require("./log-sanitizer");
let HttpExceptionFilter = class HttpExceptionFilter {
    logger = new common_1.Logger('ExceptionFilter');
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let body = {
            code: error_codes_1.ErrorCodes.INTERNAL_ERROR,
            message: 'An unexpected error occurred.',
        };
        if (exception instanceof app_exception_1.AppException) {
            status = exception.getStatus();
            body = { code: exception.code, message: exception.message, details: exception.details };
        }
        else if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            const message = typeof res === 'string'
                ? res
                : res.message ?? exception.message;
            const code = status === common_1.HttpStatus.UNAUTHORIZED ? error_codes_1.ErrorCodes.UNAUTHORIZED
                : status === common_1.HttpStatus.FORBIDDEN ? error_codes_1.ErrorCodes.FORBIDDEN
                    : status === common_1.HttpStatus.NOT_FOUND ? error_codes_1.ErrorCodes.NOT_FOUND
                        : status === common_1.HttpStatus.TOO_MANY_REQUESTS ? error_codes_1.ErrorCodes.RATE_LIMITED
                            : status === common_1.HttpStatus.BAD_REQUEST ? error_codes_1.ErrorCodes.VALIDATION_FAILED
                                : error_codes_1.ErrorCodes.INTERNAL_ERROR;
            body = {
                code,
                message: Array.isArray(message) ? message.join('; ') : String(message),
            };
        }
        else {
            this.logger.error((0, log_sanitizer_1.redactSensitiveString)(exception instanceof Error ? `${exception.message}\n${exception.stack}` : String(exception)));
        }
        if (status >= 500) {
            this.logger.error(`HTTP ${status} ${body.code}: ${(0, log_sanitizer_1.redactSensitiveString)(body.message)}`);
        }
        response.status(status).json({ success: false, error: body });
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map