import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from '../entities/teacher.entity';
import { Branch } from '../entities/branch.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { CreateTeacherDto, UpdateTeacherDto, ListTeachersQueryDto } from './dto/teachers.dto';
import { AuthUser, RoleName, EmploymentStatus } from '@nexora/types';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher) private readonly teachers: Repository<Teacher>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser, query: ListTeachersQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const qb = this.teachers.createQueryBuilder('t')
      .leftJoinAndSelect('t.branch', 'b')
      .leftJoinAndSelect('t.user', 'u')
      .orderBy('t.createdAt', 'DESC');

    if (actor.role !== RoleName.SUPER_ADMIN) {
      qb.andWhere('t.schoolId = :schoolId', { schoolId: actor.schoolId });
    }
    if (query.status) qb.andWhere('t.employmentStatus = :status', { status: query.status });
    if (query.department) qb.andWhere('t.department ILIKE :dept', { dept: `%${query.department}%` });
    if (query.search) {
      qb.andWhere('(t.firstName ILIKE :s OR t.lastName ILIKE :s OR t.employeeId ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }

    const [rows, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data: rows.map(this.toDto), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(actor: AuthUser, dto: CreateTeacherDto, meta: { ip: string | null; userAgent: string | null }) {
    // Verify branch belongs to same school.
    if (dto.branchId) {
      const branch = await this.branches.findOne({ where: { id: dto.branchId } });
      if (!branch || (actor.role !== RoleName.SUPER_ADMIN && branch.schoolId !== actor.schoolId)) {
        throw new AppException(ErrorCodes.NOT_FOUND, 'Branch not found or access denied.', HttpStatus.NOT_FOUND);
      }
    }

    const schoolId = actor.role === RoleName.SUPER_ADMIN ? dto.schoolId : actor.schoolId;
    if (!schoolId) {
      throw new AppException(ErrorCodes.VALIDATION_FAILED, 'schoolId is required for this operation.', HttpStatus.BAD_REQUEST);
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
      employmentStatus: EmploymentStatus.ACTIVE,
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

  async update(actor: AuthUser, id: string, dto: UpdateTeacherDto, meta: { ip: string | null; userAgent: string | null }) {
    const teacher = await this.teachers.findOne({ where: { id }, relations: ['branch'] });
    if (!teacher) throw new AppException(ErrorCodes.NOT_FOUND, 'Teacher not found.', HttpStatus.NOT_FOUND);
    this.assertTenant(actor, teacher);

    if (dto.firstName !== undefined) teacher.firstName = dto.firstName;
    if (dto.lastName !== undefined) teacher.lastName = dto.lastName;
    if (dto.phone !== undefined) teacher.phone = dto.phone;
    if (dto.email !== undefined) teacher.email = dto.email;
    if (dto.department !== undefined) teacher.department = dto.department;
    if (dto.designation !== undefined) teacher.designation = dto.designation;
    if (dto.employmentStatus !== undefined) teacher.employmentStatus = dto.employmentStatus;
    if (dto.attendanceStatus !== undefined) teacher.attendanceStatus = dto.attendanceStatus;
    if (dto.branchId !== undefined) {
      if (dto.branchId) {
        const branch = await this.branches.findOne({ where: { id: dto.branchId } });
        if (!branch) throw new AppException(ErrorCodes.NOT_FOUND, 'Branch not found.', HttpStatus.NOT_FOUND);
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

  async getOne(actor: AuthUser, id: string) {
    const teacher = await this.teachers.findOne({
      where: { id },
      relations: ['branch', 'user'],
    });
    if (!teacher) throw new AppException(ErrorCodes.NOT_FOUND, 'Teacher not found.', HttpStatus.NOT_FOUND);
    this.assertTenant(actor, teacher);
    return this.toDto(teacher);
  }

  private assertTenant(actor: AuthUser, target: Teacher): void {
    if (actor.role === RoleName.SUPER_ADMIN) return;
    if (target.schoolId !== actor.schoolId) {
      throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, 'This resource belongs to another school.', HttpStatus.FORBIDDEN);
    }
  }

  private toDto(t: Teacher) {
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
}
