import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { AttendanceEvent } from '../entities/attendance-event.entity';
import { Teacher } from '../entities/teacher.entity';
import { Geofence } from '../entities/geofence.entity';
import { School } from '../entities/school.entity';
import { AuditService } from '../audit/audit.service';
import { AttendanceStatusCalculator } from './attendance-status.calculator';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import {
  CheckInDto,
  SyncAttendanceDto,
  AttendanceQueryDto,
  CorrectAttendanceDto,
} from './dto/attendance.dto';
import {
  AuthUser,
  RoleName,
  AttendanceType,
  AttendanceStatus,
  SyncStatus,
  GeofenceStatus,
  VerificationStatus,
} from '@nexora/types';

const GPS_ACCURACY_THRESHOLD = 100; // meters
const SYNC_WINDOW_HOURS = 48;

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly records: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceEvent)
    private readonly events: Repository<AttendanceEvent>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(Geofence)
    private readonly geofences: Repository<Geofence>,
    @InjectRepository(School)
    private readonly schools: Repository<School>,
    private readonly audit: AuditService,
    private readonly statusCalc: AttendanceStatusCalculator,
  ) {}

  /** Real-time check-in or check-out from an online client. */
  async recordAttendance(actor: AuthUser, dto: CheckInDto, meta: { ip: string | null; userAgent: string | null }) {
    const teacher = await this.resolveTeacher(actor);
    const school = await this.schools.findOne({ where: { id: actor.schoolId! } });
    if (!school) throw new AppException(ErrorCodes.NOT_FOUND, 'School configuration not found.', HttpStatus.NOT_FOUND);

    // GPS accuracy gate
    if (dto.accuracy > GPS_ACCURACY_THRESHOLD) {
      throw new AppException(
        ErrorCodes.GPS_ACCURACY_LOW,
        `GPS accuracy (${dto.accuracy}m) exceeds threshold (${GPS_ACCURACY_THRESHOLD}m). Move to an area with better reception.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Geofence validation
    let geoStatus = GeofenceStatus.OUTSIDE;
    const geofence = await this.geofences.findOne({
      where: { schoolId: actor.schoolId!, active: true },
      order: { createdAt: 'DESC' },
    });
    if (geofence) {
      const dist = this.haversine(dto.latitude, dto.longitude, geofence.latitude, geofence.longitude);
      geoStatus = dist <= geofence.radius ? GeofenceStatus.INSIDE : GeofenceStatus.OUTSIDE;
    }

    if (geoStatus === GeofenceStatus.OUTSIDE) {
      throw new AppException(
        ErrorCodes.OUTSIDE_GEOFENCE,
        'You are outside the authorized attendance area.',
        HttpStatus.FORBIDDEN,
      );
    }

    const serverTime = new Date();
    const eventTime = serverTime;
    const dayOfWeek = serverTime.getDay() === 0 ? 7 : serverTime.getDay();
    const isWorkingDay = (school.workingDays ?? [1, 2, 3, 4, 5]).includes(dayOfWeek);

    const status = this.statusCalc.calculate({
      type: dto.attendanceType,
      serverTime,
      eventTime,
      isWorkingDay,
      lateThresholdMinutes: school.lateThresholdMinutes ?? 15,
      earlyDepartureThresholdMinutes: school.earlyDepartureThresholdMinutes ?? 30,
    });

    // Find or create today's record
    const todayStart = new Date(serverTime);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(serverTime);
    todayEnd.setHours(23, 59, 59, 999);

    let record = await this.records
      .createQueryBuilder('r')
      .where('r.teacherId = :tid AND r."date" BETWEEN :s AND :e', {
        tid: teacher.id,
        s: todayStart,
        e: todayEnd,
      })
      .getOne();

    if (!record) {
      record = this.records.create({
        schoolId: actor.schoolId!,
        branchId: teacher.branchId,
        teacherId: teacher.id,
        date: todayStart,
        status: AttendanceStatus.PRESENT,
        riskScore: 0,
      });
    }

    // Update record fields based on event type
    if (dto.attendanceType === AttendanceType.CHECK_IN) {
      if (record.checkInTime) {
        throw new AppException(
          ErrorCodes.ATTENDANCE_ALREADY_RECORDED,
          'Check-in already recorded for today.',
          HttpStatus.CONFLICT,
        );
      }
      record.checkInTime = serverTime;
      record.checkInLatitude = dto.latitude;
      record.checkInLongitude = dto.longitude;
      record.checkInAccuracy = dto.accuracy;
      record.checkInGeofenceStatus = geoStatus;
      record.checkInVerificationStatus = VerificationStatus.PASSED;
      record.status = status;
    } else {
      if (record.checkOutTime) {
        throw new AppException(
          ErrorCodes.ATTENDANCE_ALREADY_RECORDED,
          'Check-out already recorded for today.',
          HttpStatus.CONFLICT,
        );
      }
      record.checkOutTime = serverTime;
      record.checkOutLatitude = dto.latitude;
      record.checkOutLongitude = dto.longitude;
      record.checkOutAccuracy = dto.accuracy;
      record.checkOutGeofenceStatus = geoStatus;
      record.checkOutVerificationStatus = VerificationStatus.PASSED;
      if (status === AttendanceStatus.EARLY) record.status = AttendanceStatus.EARLY;
    }

    // Risk scoring (simple heuristic)
    record.riskScore = this.calculateRisk(dto, geoStatus, record);

    const savedRecord = await this.records.save(record);

    // Create the event
    const event = this.events.create({
      schoolId: actor.schoolId!,
      branchId: teacher.branchId,
      teacherId: teacher.id,
      recordId: savedRecord.id,
      attendanceType: dto.attendanceType,
      timestamp: serverTime,
      serverTimestamp: serverTime,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      geofenceStatus: geoStatus,
      identityVerificationStatus: VerificationStatus.PASSED,
      livenessStatus: 'NOT_CHECKED',
      deviceId: dto.deviceId ?? null,
      offlineCreated: false,
      syncStatus: SyncStatus.SYNCED,
      verificationMethod: dto.verificationMethod ?? 'gps_geofence',
      riskScore: record.riskScore,
    });
    await this.events.save(event);

    await this.audit.record({
      action: 'ATTENDANCE_CREATED',
      actorId: actor.id,
      schoolId: actor.schoolId!,
      entityType: 'attendance_record',
      entityId: savedRecord.id,
      newValue: { type: dto.attendanceType, status: savedRecord.status },
      ...meta,
    });

    return { record: savedRecord, event };
  }

  /** Batch sync of offline-captured events. */
  async syncOffline(actor: AuthUser, dto: SyncAttendanceDto, meta: { ip: string | null; userAgent: string | null }) {
    const teacher = await this.resolveTeacher(actor);
    const school = await this.schools.findOne({ where: { id: actor.schoolId! } });
    if (!school) throw new AppException(ErrorCodes.NOT_FOUND, 'School not found.', HttpStatus.NOT_FOUND);
    const geofence = await this.geofences.findOne({ where: { schoolId: actor.schoolId!, active: true } });
    const cutoff = new Date(Date.now() - SYNC_WINDOW_HOURS * 60 * 60 * 1000);
    const results = [];

    for (const evt of dto.events) {
      const eventTime = new Date(evt.timestamp);
      if (isNaN(eventTime.getTime()) || eventTime < cutoff) {
        results.push({ localEventId: evt.localEventId, status: 'REJECTED', reason: 'Invalid or expired timestamp.' });
        continue;
      }
      if (evt.accuracy > GPS_ACCURACY_THRESHOLD) {
        results.push({ localEventId: evt.localEventId, status: 'REJECTED', reason: `GPS accuracy ${evt.accuracy}m too low.` });
        continue;
      }

      let geoStatus = GeofenceStatus.UNKNOWN;
      if (geofence) {
        const dist = this.haversine(evt.latitude, evt.longitude, geofence.latitude, geofence.longitude);
        geoStatus = dist <= geofence.radius ? GeofenceStatus.INSIDE : GeofenceStatus.OUTSIDE;
      }

      const dayOfWeek = eventTime.getDay() === 0 ? 7 : eventTime.getDay();
      const isWorkingDay = (school.workingDays ?? [1, 2, 3, 4, 5]).includes(dayOfWeek);
      const status = this.statusCalc.calculate({
        type: evt.attendanceType,
        serverTime: new Date(),
        eventTime,
        isWorkingDay,
        lateThresholdMinutes: school.lateThresholdMinutes ?? 15,
        earlyDepartureThresholdMinutes: school.earlyDepartureThresholdMinutes ?? 30,
      });

      // Find or create the day's record
      const dayStart = new Date(eventTime); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(eventTime); dayEnd.setHours(23, 59, 59, 999);
      let record = await this.records
        .createQueryBuilder('r')
        .where('r.teacherId = :tid AND r."date" BETWEEN :s AND :e', { tid: teacher.id, s: dayStart, e: dayEnd })
        .getOne();
      if (!record) {
        record = this.records.create({
          schoolId: actor.schoolId!, branchId: teacher.branchId, teacherId: teacher.id,
          date: dayStart, status: AttendanceStatus.PRESENT, riskScore: 0,
        });
      }

      if (evt.attendanceType === AttendanceType.CHECK_IN && !record.checkInTime) {
        record.checkInTime = eventTime;
        record.checkInLatitude = evt.latitude;
        record.checkInLongitude = evt.longitude;
        record.checkInAccuracy = evt.accuracy;
        record.checkInGeofenceStatus = geoStatus;
        record.status = status;
      } else if (evt.attendanceType === AttendanceType.CHECK_OUT && !record.checkOutTime) {
        record.checkOutTime = eventTime;
        record.checkOutLatitude = evt.latitude;
        record.checkOutLongitude = evt.longitude;
        record.checkOutAccuracy = evt.accuracy;
        record.checkOutGeofenceStatus = geoStatus;
        if (status === AttendanceStatus.EARLY) record.status = AttendanceStatus.EARLY;
      } else {
        results.push({ localEventId: evt.localEventId, status: 'CONFLICT', reason: 'Duplicate event for this type today.' });
        continue;
      }

      record.riskScore = this.calculateRisk(evt, geoStatus, record);
      const savedRecord = await this.records.save(record);

      const event = this.events.create({
        schoolId: actor.schoolId!, branchId: teacher.branchId, teacherId: teacher.id,
        recordId: savedRecord.id, attendanceType: evt.attendanceType,
        timestamp: eventTime, serverTimestamp: new Date(),
        latitude: evt.latitude, longitude: evt.longitude, accuracy: evt.accuracy,
        geofenceStatus: geoStatus, identityVerificationStatus: VerificationStatus.PASSED,
        livenessStatus: 'NOT_CHECKED', deviceId: evt.deviceId ?? null,
        offlineCreated: true, syncStatus: SyncStatus.SYNCED,
        verificationMethod: evt.verificationMethod ?? 'offline_sync', riskScore: record.riskScore,
      });
      await this.events.save(event);

      results.push({ localEventId: evt.localEventId, status: 'ACCEPTED', recordId: savedRecord.id, serverStatus: savedRecord.status });
    }

    await this.audit.record({
      action: 'OFFLINE_SYNC',
      actorId: actor.id, schoolId: actor.schoolId!,
      entityType: 'attendance_record', entityId: actor.id,
      newValue: { total: dto.events.length, accepted: results.filter(r => r.status === 'ACCEPTED').length },
      ...meta,
    });

    return { results };
  }

  /** Admin: list attendance records with filters. */
  async list(actor: AuthUser, query: AttendanceQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const qb = this.records.createQueryBuilder('r')
      .leftJoinAndSelect('r.teacher', 't')
      .leftJoinAndSelect('r.branch', 'b')
      .orderBy('r.date', 'DESC').addOrderBy('r.checkInTime', 'DESC');

    if (actor.role !== RoleName.SUPER_ADMIN) {
      qb.andWhere('r.schoolId = :schoolId', { schoolId: actor.schoolId });
    }
    if (query.date) {
      const d = new Date(query.date);
      const s = new Date(d); s.setHours(0, 0, 0, 0);
      const e = new Date(d); e.setHours(23, 59, 59, 999);
      qb.andWhere('r."date" BETWEEN :ds AND :de', { ds: s, de: e });
    }
    if (query.teacherId) qb.andWhere('r.teacherId = :tid', { tid: query.teacherId });
    if (query.branchId) qb.andWhere('r.branchId = :bid', { bid: query.branchId });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /** Admin: correct an attendance record with audit trail. */
  async correct(actor: AuthUser, recordId: string, dto: CorrectAttendanceDto, meta: { ip: string | null; userAgent: string | null }) {
    const record = await this.records.findOne({ where: { id: recordId } });
    if (!record) throw new AppException(ErrorCodes.NOT_FOUND, 'Record not found.', HttpStatus.NOT_FOUND);
    if (actor.role !== RoleName.SUPER_ADMIN && record.schoolId !== actor.schoolId) {
      throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, 'Access denied.', HttpStatus.FORBIDDEN);
    }

    const oldValue = {
      checkInTime: record.checkInTime?.toISOString() ?? null,
      checkOutTime: record.checkOutTime?.toISOString() ?? null,
      status: record.status,
    };

    if (dto.newTimestamp) {
      const ts = new Date(dto.newTimestamp);
      if (record.checkInTime && !record.checkOutTime) {
        record.checkOutTime = ts;
      } else {
        record.checkInTime = ts;
      }
    }
    if (dto.newStatus) {
      record.status = dto.newStatus as AttendanceStatus;
    }

    const saved = await this.records.save(record);

    // Create correction event
    const correctionEvent = this.events.create({
      schoolId: record.schoolId, branchId: record.branchId, teacherId: record.teacherId,
      recordId: saved.id, attendanceType: AttendanceType.CHECK_IN,
      timestamp: new Date(), serverTimestamp: new Date(),
      latitude: 0, longitude: 0, accuracy: 0,
      geofenceStatus: GeofenceStatus.UNKNOWN,
      identityVerificationStatus: 'CORRECTED', livenessStatus: 'NOT_CHECKED',
      offlineCreated: false, syncStatus: SyncStatus.SYNCED,
      verificationMethod: 'admin_correction', riskScore: 0,
    });
    await this.events.save(correctionEvent);

    await this.audit.record({
      action: 'ATTENDANCE_CORRECTED',
      actorId: actor.id, schoolId: record.schoolId,
      entityType: 'attendance_record', entityId: saved.id,
      oldValue, newValue: {
        checkInTime: saved.checkInTime?.toISOString() ?? null,
        checkOutTime: saved.checkOutTime?.toISOString() ?? null,
        status: saved.status,
        reason: dto.reason,
      },
      ...meta,
    });
    return saved;
  }

  /** Get today's attendance summary for dashboard. */
  async todaySummary(actor: AuthUser) {
 const today = new Date();
    const s = new Date(today); s.setHours(0, 0, 0, 0);
    const e = new Date(today); e.setHours(23, 59, 59, 999);

    const qb = this.records.createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('r."date" BETWEEN :s AND :e', { s, e });
    if (actor.schoolId) qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
    qb.groupBy('r.status');
    const rows = await qb.getRawMany();

    const summary: Record<string, number> = { PRESENT: 0, LATE: 0, EARLY: 0, ABSENT: 0, PENDING_REVIEW: 0, INVALID: 0 };
    for (const row of rows) summary[row.status] = parseInt(row.count, 10);

    // Count total active teachers
    const teacherQb = this.teachers.createQueryBuilder('t').select('COUNT(*)', 'cnt');
    if (actor.schoolId) teacherQb.andWhere('t.schoolId = :sid', { sid: actor.schoolId });
    const { cnt: totalTeachers } = await teacherQb.getRawOne();

    summary.ABSENT = parseInt(totalTeachers, 10) - Object.values(summary).reduce((a, b) => a + b, 0);

    return summary;
  }

  private async resolveTeacher(actor: AuthUser): Promise<Teacher> {
    const teacher = await this.teachers.findOne({ where: { userId: actor.id } });
    if (!teacher) throw new AppException(ErrorCodes.NOT_FOUND, 'Teacher profile not found.', HttpStatus.NOT_FOUND);
    if (teacher.employmentStatus !== 'ACTIVE') throw new AppException(ErrorCodes.FORBIDDEN, 'Your teacher profile is not active.', HttpStatus.FORBIDDEN);
    return teacher;
  }

  /** Haversine distance in meters between two lat/lng points. */
  private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private calculateRisk(
    dto: { accuracy: number },
    geoStatus: string,
    _record: AttendanceRecord,
  ): number {
    let risk = 0;
    if (dto.accuracy > 50) risk += 20;
    if (dto.accuracy > 80) risk += 20;
    if (geoStatus === 'OUTSIDE') risk += 40;
    return Math.min(100, risk);
  }
}
