"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const crypto_1 = require("crypto");
const typeorm_1 = require("typeorm");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/http-exception.filter");
const tenant_interceptor_1 = require("./common/tenant.interceptor");
const transform_interceptor_1 = require("./common/transform.interceptor");
const csrf_origin_guard_1 = require("./common/csrf-origin.guard");
const configuration_1 = require("./config/configuration");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const cfg = (0, configuration_1.loadConfiguration)();
    app.set('trust proxy', cfg.trustProxy);
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }));
    app.use((0, cookie_parser_1.default)());
    app.use((req, res, next) => {
        const id = (0, crypto_1.randomUUID)();
        req.id = id;
        res.setHeader('x-request-id', id);
        next();
    });
    app.enableCors({
        origin: cfg.corsOrigin.split(',').map((o) => o.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    });
    const csrfGuard = new csrf_origin_guard_1.CsrfOriginGuard(cfg.corsOrigin.split(',').map((o) => o.trim()));
    app.use((req, res, next) => csrfGuard.use(req, res, next));
    app.setGlobalPrefix(cfg.apiPrefix);
    app.enableVersioning({ type: common_1.VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new tenant_interceptor_1.TenantInterceptor(app.get(typeorm_1.DataSource)), new transform_interceptor_1.TransformInterceptor(app.get(core_1.Reflector)));
    if (cfg.nodeEnv !== 'production') {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('Nexora Smart Edu API')
            .setDescription('Multi-tenant teacher attendance & workforce management platform. ' +
            'Authenticate via the login endpoint (HTTP-only cookies) and this UI will carry them.')
            .setVersion('1.0.0')
            .addCookieAuth('nse_access')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
        swagger_1.SwaggerModule.setup(`${cfg.apiPrefix}/docs`, app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
    }
    await app.listen(cfg.port, '0.0.0.0');
    logger.log(`NSE API listening on http://localhost:${cfg.port}/${cfg.apiPrefix}/v1`);
    logger.log(`Swagger UI: http://localhost:${cfg.port}/${cfg.apiPrefix}/docs`);
}
void bootstrap();
//# sourceMappingURL=main.js.map