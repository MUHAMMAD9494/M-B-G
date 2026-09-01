import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Teacher } from '../entities/teacher.entity';
import { AttendanceEvent } from '../entities/attendance-event.entity';
import { BiometricProfile } from '../entities/biometric-profile.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { DataSubjectService } from './data-subject.service';
import { DataSubjectController } from './data-subject.controller';
import { TenantScopeService } from '../common/tenant-scope.service';
import { AuditModule } from '../audit/audit.module';

/**
 * NDPA 2023 data-subject rights: access/export + erasure.
 * Tenant-scoping via TenantScopeService (RLS context) + application-level
 * checks in DataSubjectService.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Teacher,
      AttendanceEvent,
      BiometricProfile,
      NotificationPreference,
      SystemSetting,
      RefreshToken,
    ]),
    AuditModule,
  ],
  providers: [DataSubjectService, TenantScopeService],
  controllers: [DataSubjectController],
})
export class DataSubjectModule {}