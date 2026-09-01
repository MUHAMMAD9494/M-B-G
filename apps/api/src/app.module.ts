import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { entities } from './entities';
import { loadConfiguration } from './config/configuration';
import { RbacModule } from './rbac/rbac.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { BranchesModule } from './branches/branches.module';
import { TeachersModule } from './teachers/teachers.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GeofencingModule } from './geofencing/geofencing.module';
import { BiometricModule } from './biometric/biometric.module';
import { DevicesModule } from './devices/devices.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { HealthModule } from './health/health.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { DataSubjectModule } from './data-subject/data-subject.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], load: [loadConfiguration] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        const cfg = loadConfiguration();
        return {
          type: 'postgres' as const,
          // Runtime connection uses the non-owner role when provided (production)
          // so the application can never bypass RLS as the table owner.
          url: cfg.appDatabaseUrl ?? cfg.databaseUrl,
          entities,
          synchronize: false,
          logging: cfg.nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
          extra: { max: 10, idleTimeoutMillis: 30000 },
        };
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'standard',
        ttl: 60000,
        limit: 300,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    RbacModule,
    AuditModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    BranchesModule,
    TeachersModule,
    AttendanceModule,
    GeofencingModule,
    BiometricModule,
    DevicesModule,
    ReportsModule,
    SettingsModule,
    HealthModule,
    NotificationsModule,
    OnboardingModule,
    DataSubjectModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor },
  ],
})
export class AppModule {}
