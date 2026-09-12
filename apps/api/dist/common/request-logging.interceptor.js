"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
let RequestLoggingInterceptor = class RequestLoggingInterceptor {
    intercept(context, next) {
        const start = Date.now();
        const http = context.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        return next.handle().pipe((0, rxjs_1.tap)({
            next: () => {
                const durationMs = Date.now() - start;
                console.info(JSON.stringify({
                    level: 'info',
                    time: new Date().toISOString(),
                    requestId: request.id ?? response.getHeader('x-request-id') ?? '-',
                    method: request.method,
                    route: request.originalUrl?.split('?')[0],
                    status: response.statusCode,
                    durationMs,
                    actorId: request.user?.id ?? null,
                }));
            },
        }));
    }
};
exports.RequestLoggingInterceptor = RequestLoggingInterceptor;
exports.RequestLoggingInterceptor = RequestLoggingInterceptor = __decorate([
    (0, common_1.Injectable)()
], RequestLoggingInterceptor);
//# sourceMappingURL=request-logging.interceptor.js.map