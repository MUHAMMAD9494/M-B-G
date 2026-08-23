import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Teacher } from '../entities/teacher.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord, Teacher])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}