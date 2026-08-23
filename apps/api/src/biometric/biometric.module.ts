import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BiometricProfile } from '../entities/biometric-profile.entity';
import { BiometricService } from './biometric.service';
import { BiometricController } from './biometric.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([BiometricProfile]), AuditModule],
  providers: [BiometricService],
  controllers: [BiometricController],
  exports: [BiometricService],
})
export class BiometricModule {}