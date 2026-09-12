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
exports.Teacher = void 0;
const typeorm_1 = require("typeorm");
const types_1 = require("@nexora/types");
const base_entity_1 = require("../common/base.entity");
const branch_entity_1 = require("./branch.entity");
const school_entity_1 = require("./school.entity");
const user_entity_1 = require("./user.entity");
let Teacher = class Teacher extends base_entity_1.BaseEntity {
    schoolId;
    school;
    branchId;
    branch;
    userId;
    user;
    employeeId;
    firstName;
    lastName;
    phone;
    email;
    department;
    designation;
    employmentStatus;
    attendanceStatus;
    deletedAt;
};
exports.Teacher = Teacher;
__decorate([
    (0, typeorm_1.Column)({ name: 'school_id', type: 'uuid' }),
    __metadata("design:type", String)
], Teacher.prototype, "schoolId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => school_entity_1.School, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'school_id' }),
    __metadata("design:type", school_entity_1.School)
], Teacher.prototype, "school", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'branch_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "branchId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => branch_entity_1.Branch, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'branch_id' }),
    __metadata("design:type", Object)
], Teacher.prototype, "branch", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Object)
], Teacher.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'employee_id', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], Teacher.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'first_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Teacher.prototype, "firstName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_name', type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], Teacher.prototype, "lastName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 320, nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "designation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'employment_status', type: 'enum', enum: types_1.EmploymentStatus, default: types_1.EmploymentStatus.ACTIVE }),
    __metadata("design:type", String)
], Teacher.prototype, "employmentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'attendance_status', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Teacher.prototype, "attendanceStatus", void 0);
__decorate([
    (0, typeorm_1.DeleteDateColumn)({ name: 'deleted_at', type: 'timestamptz', nullable: true }),
    __metadata("design:type", Object)
], Teacher.prototype, "deletedAt", void 0);
exports.Teacher = Teacher = __decorate([
    (0, typeorm_1.Entity)('teachers'),
    (0, typeorm_1.Index)('idx_teachers_school', ['schoolId']),
    (0, typeorm_1.Index)('idx_teachers_employee', ['schoolId', 'employeeId'], { unique: true })
], Teacher);
//# sourceMappingURL=teacher.entity.js.map