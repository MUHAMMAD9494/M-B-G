import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Geofence } from '../entities/geofence.entity';
import { GeofencingService } from './geofencing.service';
import { GeofencingController } from './geofencing.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Geofence]), AuditModule],
  providers: [GeofencingService],
  controllers: [GeofencingController],
  exports: [GeofencingService],
})
export class GeofencingModule {}
