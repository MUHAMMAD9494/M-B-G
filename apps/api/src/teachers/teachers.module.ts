import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from '../entities/teacher.entity';
import { User } from '../entities/user.entity';
import { Branch } from '../entities/branch.entity';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Teacher, User, Branch]), AuditModule],
  providers: [TeachersService],
  controllers: [TeachersController],
  exports: [TeachersService],
})
export class TeachersModule {}
