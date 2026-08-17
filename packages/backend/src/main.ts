import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import helmet from 'helmet';
import { HealthController } from './health/health.controller';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [HealthController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env.PORT_BACKEND || 3001;
  await app.listen(port);

  console.log(`Backend running on port ${port}`);
  console.log(`Health: http://localhost:${port}/api/health`);
  console.log(`Auth Register: POST http://localhost:${port}/auth/register-school`);
  console.log(`Auth Login: POST http://localhost:${port}/auth/login`);
}

bootstrap();