import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { AttendanceEvent } from '../entities/attendance-event.entity';
import { Teacher } from '../entities/teacher.entity';
import { Geofence } from '../entities/geofence.entity';
import { School } from '../entities/school.entity';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { AttendanceStatusCalculator } from './attendance-status.calculator';
import { AuditModule } from '../audit/audit.module';
import { GeofencingModule } from '../geofencing/geofencing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, AttendanceEvent, Teacher, Geofence, School]),
    AuditModule,
    GeofencingModule,
  ],
  providers: [AttendanceService, AttendanceStatusCalculator],
  controllers: [AttendanceController],
  exports: [AttendanceService],
})
export class AttendanceModule {}