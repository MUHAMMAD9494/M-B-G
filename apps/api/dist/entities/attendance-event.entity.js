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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceEvent = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@nexora/types");
const base_entity_1 = require("../common/base.entity");
const attendance_record_entity_1 = require("./attendance-record.entity");
const branch_entity_1 = require("./branch.entity");
const school_entity_1 = require("./school.entity");
const teacher_entity_1 = require("./teacher.entity");
let AttendanceEvent = class AttendanceEvent extends base_entity_1.BaseEntity {
    schoolId;
    school;
    branchId;
    branch;
    teacherId;
    teacher;
    recordId;
    record;
    attendanceType;
    timestamp;
    serverTimestamp;
    latitude;
    longitude;
    accuracy;
    geofenceStatus;
    identityVerificationStatus;
    livenessStatus;
    deviceId;
    offlineCreated;
    syncStatus;
    verificationMethod;
    verificationState;
    clientEventId;
    riskScore;
};
exports.AttendanceEvent = AttendanceEvent;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], AttendanceEvent.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], AttendanceEvent.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'branch_id' }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'teacher_id', type: 'uuid' }),
    __metadata("design:type", String)
], AttendanceEvent.prototype, "teacherId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'teacher_id' }),
    __metadata("design:type", teacher_entity_1.Teacher)
], AttendanceEvent.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'record_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "recordId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => attendance_record_entity_1.AttendanceRecord, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'record_id' }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "record", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attendance_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], AttendanceEvent.prototype, "attendanceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz' }),
    __metadata("design:type", Date)
], AttendanceEvent.prototype, "timestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'server_timestamp', type: 'timestamptz', default: () => 'NOW()' }),
    __metadata("design:type", Date)
], AttendanceEvent.prototype, "serverTimestamp", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "latitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "longitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "accuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'geofence_status', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "geofenceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'identity_verification_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "identityVerificationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'liveness_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "livenessStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'device_id', type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "deviceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'offline_created', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], AttendanceEvent.prototype, "offlineCreated", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sync_status', type: 'varchar', length: 20, default: types_1.SyncStatus.SYNCED }),
    __metadata("design:type", String)
], AttendanceEvent.prototype, "syncStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_method', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "verificationMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_state', type: 'varchar', length: 30, default: 'verified_online' }),
    __metadata("design:type", String)
], AttendanceEvent.prototype, "verificationState", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'client_event_id', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], AttendanceEvent.prototype, "clientEventId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_score', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AttendanceEvent.prototype, "riskScore", void 0);
exports.AttendanceEvent = AttendanceEvent = __decorate([
    (0, typeorm_1.Entity)('attendance_events'),
    (0, typeorm_1.Index)('idx_att_events_school', ['schoolId']),
    (0, typeorm_1.Index)('idx_att_events_teacher', ['teacherId']),
    (0, typeorm_1.Index)('idx_att_events_record', ['recordId'])
], AttendanceEvent);
//# sourceMappingURL=attendance-event.entity.js.map