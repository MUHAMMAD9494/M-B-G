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
exports.TeachersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const teacher_entity_1 = require("../entities/teacher.entity");
const branch_entity_1 = require("../entities/branch.entity");
const audit_service_1 = require("../audit/audit.service");
const app_exception_1 = require("../common/app-exception");
const error_codes_1 = require("../common/error-codes");
const types_1 = require("@nexora/types");
let TeachersService = class TeachersService {
    teachers;
    branches;
    audit;
    constructor(teachers, branches, audit) {
        this.teachers = teachers;
        this.branches = branches;
        this.audit = audit;
    }
    async list(actor, query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(1, query.limit ?? 20));
        const qb = this.teachers.createQueryBuilder('t')
            .leftJoinAndSelect('t.branch', 'b')
            .leftJoinAndSelect('t.user', 'u')
            .orderBy('t.createdAt', 'DESC');
        if (actor.role !== types_1.RoleName.SUPER_ADMIN) {
            qb.andWhere('t.schoolId = :schoolId', { schoolId: actor.schoolId });
        }
        if (query.status)
            qb.andWhere('t.employmentStatus = :status', { status: query.status });
        if (query.department)
            qb.andWhere('t.department ILIKE :dept', { dept: `%${query.department}%` });
        if (query.search) {
            qb.andWhere('(t.firstName ILIKE :s OR t.lastName ILIKE :s OR t.employeeId ILIKE :s)', {
                s: `%${query.search}%`,
            });
        }
        const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
        return { data: rows.map(this.toDto), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    async create(actor, dto, meta) {
        if (dto.branchId) {
            const branch = await this.branches.findOne({ where: { id: dto.branchId } });
            if (!branch || (actor.role !== types_1.RoleName.SUPER_ADMIN && branch.schoolId !== actor.schoolId)) {
                throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Branch not found or access denied.', common_1.HttpStatus.NOT_FOUND);
            }
        }
        const schoolId = actor.role === types_1.RoleName.SUPER_ADMIN ? dto.schoolId : actor.schoolId;
        if (!schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.VALIDATION_FAILED, 'schoolId is required for this operation.', common_1.HttpStatus.BAD_REQUEST);
        }
        const teacher = this.teachers.create({
            schoolId,
            branchId: dto.branchId ?? null,
            employeeId: dto.employeeId,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            department: dto.department ?? null,
            designation: dto.designation ?? null,
            employmentStatus: types_1.EmploymentStatus.ACTIVE,
            attendanceStatus: true,
        });
        const saved = await this.teachers.save(teacher);
        await this.audit.record({
            action: 'TEACHER_CREATED',
            actorId: actor.id,
            schoolId: saved.schoolId,
            entityType: 'teacher',
            entityId: saved.id,
            newValue: { employeeId: saved.employeeId, name: `${saved.firstName} ${saved.lastName}` },
            ...meta,
        });
        return this.toDto(saved);
    }
    async update(actor, id, dto, meta) {
        const teacher = await this.teachers.findOne({ where: { id }, relations: ['branch'] });
        if (!teacher)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Teacher not found.', common_1.HttpStatus.NOT_FOUND);
        this.assertTenant(actor, teacher);
        if (dto.firstName !== undefined)
            teacher.firstName = dto.firstName;
        if (dto.lastName !== undefined)
            teacher.lastName = dto.lastName;
        if (dto.phone !== undefined)
            teacher.phone = dto.phone;
        if (dto.email !== undefined)
            teacher.email = dto.email;
        if (dto.department !== undefined)
            teacher.department = dto.department;
        if (dto.designation !== undefined)
            teacher.designation = dto.designation;
        if (dto.employmentStatus !== undefined)
            teacher.employmentStatus = dto.employmentStatus;
        if (dto.attendanceStatus !== undefined)
            teacher.attendanceStatus = dto.attendanceStatus;
        if (dto.branchId !== undefined) {
            if (dto.branchId) {
                const branch = await this.branches.findOne({ where: { id: dto.branchId } });
                if (!branch)
                    throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Branch not found.', common_1.HttpStatus.NOT_FOUND);
            }
            teacher.branchId = dto.branchId;
        }
        const saved = await this.teachers.save(teacher);
        await this.audit.record({
            action: 'TEACHER_UPDATED',
            actorId: actor.id,
            schoolId: saved.schoolId,
            entityType: 'teacher',
            entityId: saved.id,
            ...meta,
        });
        return this.toDto(saved);
    }
    async getOne(actor, id) {
        const teacher = await this.teachers.findOne({
            where: { id },
            relations: ['branch', 'user'],
        });
        if (!teacher)
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.NOT_FOUND, 'Teacher not found.', common_1.HttpStatus.NOT_FOUND);
        this.assertTenant(actor, teacher);
        return this.toDto(teacher);
    }
    assertTenant(actor, target) {
        if (actor.role === types_1.RoleName.SUPER_ADMIN)
            return;
        if (target.schoolId !== actor.schoolId) {
            throw new app_exception_1.AppException(error_codes_1.ErrorCodes.TENANT_ACCESS_DENIED, 'This resource belongs to another school.', common_1.HttpStatus.FORBIDDEN);
        }
    }
    toDto(t) {
        return {
            id: t.id,
            schoolId: t.schoolId,
            branchId: t.branchId,
            employeeId: t.employeeId,
            firstName: t.firstName,
            lastName: t.lastName,
            phone: t.phone,
            email: t.email,
            department: t.department,
            designation: t.designation,
            employmentStatus: t.employmentStatus,
            attendanceStatus: t.attendanceStatus,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
            branch: t.branch?.name ?? null,
        };
    }
};
exports.TeachersService = TeachersService;
exports.TeachersService = TeachersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(teacher_entity_1.Teacher)),
    __param(1, (0, typeorm_1.InjectRepository)(branch_entity_1.Branch)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        audit_service_1.AuditService])
], TeachersService);
//# sourceMappingURL=teachers.service.js.map