import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';
import helmet from 'helmet';

@Controller('api')
class HealthController {
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'nexora-smart-edu-api' };
  }
}

@Module({
  controllers: [HealthController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true });
  await app.listen(process.env.PORT_BACKEND || 3001);
  console.log(Backend running on port );
}
bootstrap();
