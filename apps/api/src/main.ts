import 'reflect-metadata';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { DataSource } from 'typeorm';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { TenantInterceptor } from './common/tenant.interceptor';
import { TransformInterceptor } from './common/transform.interceptor';
import { CsrfOriginGuard } from './common/csrf-origin.guard';
import { loadConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const cfg = loadConfiguration();
  app.set('trust proxy', cfg.trustProxy);

  app.use(helmet());
  app.use(cookieParser());

  // Request-ID middleware: every request gets a UUID logged with the
  // request-logging interceptor and echoed to clients as x-request-id for
  // log correlation and support diagnostics.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const id = randomUUID();
    (req as unknown as { id: string }).id = id;
    res.setHeader('x-request-id', id);
    next();
  });

  app.enableCors({
    origin: cfg.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // CSRF defense-in-depth for cookie-authenticated mutating requests:
  // reject state-changing requests whose Origin does not match the CORS
  // allow-list (SameSite=Lax cookies are the primary defense).
  const csrfGuard = new CsrfOriginGuard(cfg.corsOrigin.split(',').map((o) => o.trim()));
  app.use((req: Request, res: Response, next: NextFunction) => csrfGuard.use(req, res, next));

  app.setGlobalPrefix(cfg.apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TenantInterceptor(app.get(DataSource)), new TransformInterceptor(app.get(Reflector)));

  // Swagger docs are dev/staging tooling only — never exposed in production.
  if (cfg.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Nexora Smart Edu API')
      .setDescription(
        'Multi-tenant teacher attendance & workforce management platform. ' +
          'Authenticate via the login endpoint (HTTP-only cookies) and this UI will carry them.',
      )
      .setVersion('1.0.0')
      .addCookieAuth('nse_access')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'bearer')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${cfg.apiPrefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(cfg.port, '0.0.0.0');
  logger.log(`NSE API listening on http://localhost:${cfg.port}/${cfg.apiPrefix}/v1`);
  logger.log(`Swagger UI: http://localhost:${cfg.port}/${cfg.apiPrefix}/docs`);
}

void bootstrap();
