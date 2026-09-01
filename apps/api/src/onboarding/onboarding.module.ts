import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from '../entities/school.entity';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { SystemSetting } from '../entities/system-setting.entity';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { PasswordService } from '../auth/password.service';
import { AuditModule } from '../audit/audit.module';

/**
 * Commercial onboarding + provisioning.
 *
 * Marked @Global() so the public self-registration route added to
 * SchoolsController (POST /schools) can inject OnboardingService without
 * SchoolsModule needing to import this module (schools.module.ts is owned by
 * another agent — kept untouched).
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([School, Branch, User, SystemSetting]),
    AuditModule,
  ],
  providers: [OnboardingService, PasswordService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}