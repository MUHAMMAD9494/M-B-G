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
exports.AttendanceRecord = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@nexora/types");
const base_entity_1 = require("../common/base.entity");
const branch_entity_1 = require("./branch.entity");
const school_entity_1 = require("./school.entity");
const teacher_entity_1 = require("./teacher.entity");
let AttendanceRecord = class AttendanceRecord extends base_entity_1.BaseEntity {
    schoolId;
    school;
    branchId;
    branch;
    teacherId;
    teacher;
    date;
    checkInTime;
    checkOutTime;
    checkInLatitude;
    checkInLongitude;
    checkInAccuracy;
    checkInGeofenceStatus;
    checkInVerificationStatus;
    checkOutLatitude;
    checkOutLongitude;
    checkOutAccuracy;
    checkOutGeofenceStatus;
    checkOutVerificationStatus;
    status;
    riskScore;
};
exports.AttendanceRecord = AttendanceRecord;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], AttendanceRecord.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'branch_id' }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'teacher_id', type: 'uuid' }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "teacherId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => teacher_entity_1.Teacher, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'teacher_id' }),
    __metadata("design:type", teacher_entity_1.Teacher)
], AttendanceRecord.prototype, "teacher", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date' }),
    __metadata("design:type", Date)
], AttendanceRecord.prototype, "date", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_time', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_time', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_accuracy', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_geofence_status', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInGeofenceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_in_verification_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkInVerificationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_latitude', type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutLatitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_longitude', type: 'decimal', precision: 10, scale: 7, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutLongitude", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_accuracy', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutAccuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_geofence_status', type: 'varchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutGeofenceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'check_out_verification_status', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], AttendanceRecord.prototype, "checkOutVerificationStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: types_1.AttendanceStatus.PRESENT }),
    __metadata("design:type", String)
], AttendanceRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_score', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], AttendanceRecord.prototype, "riskScore", void 0);
exports.AttendanceRecord = AttendanceRecord = __decorate([
    (0, typeorm_1.Entity)('attendance_records'),
    (0, typeorm_1.Index)('idx_att_records_school_date', ['schoolId', 'date']),
    (0, typeorm_1.Index)('idx_att_records_teacher', ['teacherId']),
    (0, typeorm_1.Index)('idx_att_records_branch', ['branchId'])
], AttendanceRecord);
//# sourceMappingURL=attendance-record.entity.js.map