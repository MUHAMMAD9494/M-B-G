"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_record_entity_1 = require("../entities/attendance-record.entity");
const attendance_event_entity_1 = require("../entities/attendance-event.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const geofence_entity_1 = require("../entities/geofence.entity");
const school_entity_1 = require("../entities/school.entity");
const audit_service_1 = require("../audit/audit.service");
const attendance_status_calculator_1 = require("./attendance-status.calculator");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
const GPS_ACCURACY_THRESHOLD = 100;
const SYNC_WINDOW_HOURS = 48;
let AttendanceService = class AttendanceService {
    records;
    events;
    teachers;
    geofences;
    schools;
    audit;
    statusCalc;
    constructor(records, events, teachers, geofences, schools, audit, statusCalc) {
        this.records = records;
        this.events = events;
        this.teachers = teachers;
        this.geofences = geofences;
        this.schools = schools;
        this.audit = audit;
        this.statusCalc = statusCalc;
    }
    async recordAttendance(actor, dto, meta) {
        const teacher = await this.resolveTeacher(actor);
        const school = await this.schools.findOne({ where: { id: actor.schoolId } });
        if (!school)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'School configuration not found.', common_1.HttpStatus.NOT_FOUND);
        if (dto.accuracy > GPS_ACCURACY_THRESHOLD) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.GPS_ACCURACY_LOW, `GPS accuracy (${dto.accuracy}m) exceeds threshold (${GPS_ACCURACY_THRESHOLD}m). Move to an area with better reception.`, common_1.HttpStatus.BAD_REQUEST);
        }
        let geoStatus = types_1.GeofenceStatus.OUTSIDE;
        const geofence = await this.geofences.findOne({
            where: { schoolId: actor.schoolId, active: true },
            order: { createdAt: 'DESC' },
        });
        if (geofence) {
            const dist = this.haversine(dto.latitude, dto.longitude, geofence.latitude, geofence.longitude);
            geoStatus = dist <= geofence.radius ? types_1.GeofenceStatus.INSIDE : types_1.GeofenceStatus.OUTSIDE;
        }
        if (geoStatus === types_1.GeofenceStatus.OUTSIDE) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.OUTSIDE_GEOFENCE, 'You are outside the authorized attendance area.', common_1.HttpStatus.FORBIDDEN);
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
                schoolId: actor.schoolId,
                branchId: teacher.branchId,
                teacherId: teacher.id,
                date: todayStart,
                status: types_1.AttendanceStatus.PRESENT,
                riskScore: 0,
            });
        }
        if (dto.attendanceType === types_1.AttendanceType.CHECK_IN) {
            if (record.checkInTime) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.ATTENDANCE_ALREADY_RECORDED, 'Check-in already recorded for today.', common_1.HttpStatus.CONFLICT);
            }
            record.checkInTime = serverTime;
            record.checkInLatitude = dto.latitude;
            record.checkInLongitude = dto.longitude;
            record.checkInAccuracy = dto.accuracy;
            record.checkInGeofenceStatus = geoStatus;
            record.checkInVerificationStatus = types_1.VerificationStatus.PASSED;
            record.status = status;
        }
        else {
            if (record.checkOutTime) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.ATTENDANCE_ALREADY_RECORDED, 'Check-out already recorded for today.', common_1.HttpStatus.CONFLICT);
            }
            record.checkOutTime = serverTime;
            record.checkOutLatitude = dto.latitude;
            record.checkOutLongitude = dto.longitude;
            record.checkOutAccuracy = dto.accuracy;
            record.checkOutGeofenceStatus = geoStatus;
            record.checkOutVerificationStatus = types_1.VerificationStatus.PASSED;
            if (status === types_1.AttendanceStatus.EARLY)
                record.status = types_1.AttendanceStatus.EARLY;
        }
        record.riskScore = this.calculateRisk(dto, geoStatus, record);
        const savedRecord = await this.records.save(record);
        const event = this.events.create({
            schoolId: actor.schoolId,
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
            identityVerificationStatus: types_1.VerificationStatus.PASSED,
            livenessStatus: 'NOT_CHECKED',
            deviceId: dto.deviceId ?? null,
            offlineCreated: false,
            syncStatus: types_1.SyncStatus.SYNCED,
            verificationMethod: dto.verificationMethod ?? 'gps_geofence',
            verificationState: dto.verificationMethod === 'gps_offline_deferred' ? 'pending_verification' : 'verified_online',
            riskScore: record.riskScore,
        });
        await this.events.save(event);
        await this.audit.record({
            action: 'ATTENDANCE_CREATED',
            actorId: actor.id,
            schoolId: actor.schoolId,
            entityType: 'attendance_record',
            entityId: savedRecord.id,
            newValue: { type: dto.attendanceType, status: savedRecord.status },
            ...meta,
        });
        return { record: savedRecord, event };
    }
    async syncOffline(actor, dto, meta) {
        const teacher = await this.resolveTeacher(actor);
        const school = await this.schools.findOne({ where: { id: actor.schoolId } });
        if (!school)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'School not found.', common_1.HttpStatus.NOT_FOUND);
        const geofence = await this.geofences.findOne({ where: { schoolId: actor.schoolId, active: true } });
        const cutoff = new Date(Date.now() - SYNC_WINDOW_HOURS * 60 * 60 * 1000);
        const results = [];
        for (const evt of dto.events) {
            const eventTime = new Date(evt.timestamp);
            if (evt.localEventId) {
                const existing = await this.events.findOne({
                    where: { schoolId: actor.schoolId, clientEventId: evt.localEventId },
                });
                if (existing) {
                    results.push({
                        localEventId: evt.localEventId,
                        status: 'DEDUPLICATED',
                        recordId: existing.recordId,
                    });
                    continue;
                }
            }
            if (isNaN(eventTime.getTime()) || eventTime < cutoff) {
                results.push({ localEventId: evt.localEventId, status: 'REJECTED', reason: 'Invalid or expired timestamp.' });
                continue;
            }
            if (evt.accuracy > GPS_ACCURACY_THRESHOLD) {
                results.push({ localEventId: evt.localEventId, status: 'REJECTED', reason: `GPS accuracy ${evt.accuracy}m too low.` });
                continue;
            }
            let geoStatus = types_1.GeofenceStatus.UNKNOWN;
            if (geofence) {
                const dist = this.haversine(evt.latitude, evt.longitude, geofence.latitude, geofence.longitude);
                geoStatus = dist <= geofence.radius ? types_1.GeofenceStatus.INSIDE : types_1.GeofenceStatus.OUTSIDE;
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
            const dayStart = new Date(eventTime);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(eventTime);
            dayEnd.setHours(23, 59, 59, 999);
            let record = await this.records
                .createQueryBuilder('r')
                .where('r.teacherId = :tid AND r."date" BETWEEN :s AND :e', { tid: teacher.id, s: dayStart, e: dayEnd })
                .getOne();
            if (!record) {
                record = this.records.create({
                    schoolId: actor.schoolId, branchId: teacher.branchId, teacherId: teacher.id,
                    date: dayStart, status: types_1.AttendanceStatus.PRESENT, riskScore: 0,
                });
            }
            if (evt.attendanceType === types_1.AttendanceType.CHECK_IN && !record.checkInTime) {
                record.checkInTime = eventTime;
                record.checkInLatitude = evt.latitude;
                record.checkInLongitude = evt.longitude;
                record.checkInAccuracy = evt.accuracy;
                record.checkInGeofenceStatus = geoStatus;
                record.status = status;
            }
            else if (evt.attendanceType === types_1.AttendanceType.CHECK_OUT && !record.checkOutTime) {
                record.checkOutTime = eventTime;
                record.checkOutLatitude = evt.latitude;
                record.checkOutLongitude = evt.longitude;
                record.checkOutAccuracy = evt.accuracy;
                record.checkOutGeofenceStatus = geoStatus;
                if (status === types_1.AttendanceStatus.EARLY)
                    record.status = types_1.AttendanceStatus.EARLY;
            }
            else {
                results.push({ localEventId: evt.localEventId, status: 'CONFLICT', reason: 'Duplicate event for this type today.' });
                continue;
            }
            record.riskScore = this.calculateRisk(evt, geoStatus, record);
            const savedRecord = await this.records.save(record);
            const event = this.events.create({
                schoolId: actor.schoolId, branchId: teacher.branchId, teacherId: teacher.id,
                recordId: savedRecord.id, attendanceType: evt.attendanceType,
                timestamp: eventTime, serverTimestamp: new Date(),
                latitude: evt.latitude, longitude: evt.longitude, accuracy: evt.accuracy,
                geofenceStatus: geoStatus,
                identityVerificationStatus: evt.verificationMethod === 'gps_offline_deferred' || evt.verificationMethod === 'offline_sync'
                    ? types_1.VerificationStatus.PENDING
                    : types_1.VerificationStatus.PASSED,
                livenessStatus: evt.verificationMethod === 'gps_offline_deferred' || evt.verificationMethod === 'offline_sync'
                    ? 'DEFERRED'
                    : 'NOT_CHECKED',
                deviceId: evt.deviceId ?? null,
                offlineCreated: true, syncStatus: types_1.SyncStatus.SYNCED,
                verificationMethod: evt.verificationMethod ?? 'offline_sync',
                verificationState: evt.verificationMethod === 'gps_offline_deferred' || evt.verificationMethod === 'offline_sync'
                    ? 'pending_verification'
                    : 'verified_local',
                clientEventId: evt.localEventId ?? null,
                riskScore: record.riskScore,
            });
            await this.events.save(event);
            results.push({ localEventId: evt.localEventId, status: 'ACCEPTED', recordId: savedRecord.id, serverStatus: savedRecord.status });
        }
        await this.audit.record({
            action: 'OFFLINE_SYNC',
            actorId: actor.id, schoolId: actor.schoolId,
            entityType: 'attendance_record', entityId: actor.id,
            newValue: { total: dto.events.length, accepted: results.filter(r => r.status === 'ACCEPTED').length },
            ...meta,
        });
        return { results };
    }
    async list(actor, query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const qb = this.records.createQueryBuilder('r')
            .leftJoinAndSelect('r.teacher', 't')
            .leftJoinAndSelect('r.branch', 'b')
            .orderBy('r.date', 'DESC').addOrderBy('r.checkInTime', 'DESC');
        if (actor.role !== types_1.RoleName.SUPER_ADMIN) {
            qb.andWhere('r.schoolId = :schoolId', { schoolId: actor.schoolId });
        }
        if (query.date) {
            const d = new Date(query.date);
            const s = new Date(d);
            s.setHours(0, 0, 0, 0);
            const e = new Date(d);
            e.setHours(23, 59, 59, 999);
            qb.andWhere('r."date" BETWEEN :ds AND :de', { ds: s, de: e });
        }
        if (query.teacherId)
            qb.andWhere('r.teacherId = :tid', { tid: query.teacherId });
        if (query.branchId)
            qb.andWhere('r.branchId = :bid', { bid: query.branchId });
        if (query.status)
            qb.andWhere('r.status = :status', { status: query.status });
        const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data: rows, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    async correct(actor, recordId, dto, meta) {
        const record = await this.records.findOne({ where: { id: recordId } });
        if (!record)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Record not found.', common_1.HttpStatus.NOT_FOUND);
        if (actor.role !== types_1.RoleName.SUPER_ADMIN && record.schoolId !== actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, 'Access denied.', common_1.HttpStatus.FORBIDDEN);
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
            }
            else {
                record.checkInTime = ts;
            }
        }
        if (dto.newStatus) {
            record.status = dto.newStatus;
        }
        const saved = await this.records.save(record);
        const correctionEvent = this.events.create({
            schoolId: record.schoolId, branchId: record.branchId, teacherId: record.teacherId,
            recordId: saved.id, attendanceType: types_1.AttendanceType.CHECK_IN,
            timestamp: new Date(), serverTimestamp: new Date(),
            latitude: 0, longitude: 0, accuracy: 0,
            geofenceStatus: types_1.GeofenceStatus.UNKNOWN,
            identityVerificationStatus: 'CORRECTED', livenessStatus: 'NOT_CHECKED',
            offlineCreated: false, syncStatus: types_1.SyncStatus.SYNCED,
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
    async todaySummary(actor) {
        const today = new Date();
        const s = new Date(today);
        s.setHours(0, 0, 0, 0);
        const e = new Date(today);
        e.setHours(23, 59, 59, 999);
        const qb = this.records.createQueryBuilder('r')
            .select('r.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('r."date" BETWEEN :s AND :e', { s, e });
        if (actor.schoolId)
            qb.andWhere('r.schoolId = :sid', { sid: actor.schoolId });
        qb.groupBy('r.status');
        const rows = await qb.getRawMany();
        const summary = { PRESENT: 0, LATE: 0, EARLY: 0, ABSENT: 0, PENDING_REVIEW: 0, INVALID: 0 };
        for (const row of rows)
            summary[row.status] = parseInt(row.count, 10);
        const teacherQb = this.teachers.createQueryBuilder('t').select('COUNT(*)', 'cnt');
        if (actor.schoolId)
            teacherQb.andWhere('t.schoolId = :sid', { sid: actor.schoolId });
        const { cnt: totalTeachers } = await teacherQb.getRawOne();
        summary.ABSENT = parseInt(totalTeachers, 10) - Object.values(summary).reduce((a, b) => a + b, 0);
        return summary;
    }
    async resolveTeacher(actor) {
        const teacher = await this.teachers.findOne({ where: { userId: actor.id } });
        if (!teacher)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Teacher profile not found.', common_1.HttpStatus.NOT_FOUND);
        if (teacher.employmentStatus !== 'ACTIVE')
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.FORBIDDEN, 'Your teacher profile is not active.', common_1.HttpStatus.FORBIDDEN);
        return teacher;
    }
    haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const toRad = (d) => (d * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    calculateRisk(dto, geoStatus, _record) {
        let risk = 0;
        if (dto.accuracy > 50)
            risk += 20;
        if (dto.accuracy > 80)
            risk += 20;
        if (geoStatus === 'OUTSIDE')
            risk += 40;
        return Math.min(100, risk);
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attendance_record_entity_1.AttendanceRecord)),
    __param(1, (0, typeorm_1.InjectRepository)(attendance_event_entity_1.AttendanceEvent)),
    __param(2, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(3, (0, typeorm_1.InjectRepository)(geofence_entity_1.Geofence)),
    __param(4, (0, typeorm_1.InjectRepository)(school_entity_1.School)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService,
        attendance_status_calculator_1.AttendanceStatusCalculator])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map