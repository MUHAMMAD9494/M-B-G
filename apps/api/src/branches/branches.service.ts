import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../entities/branch.entity';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/app-exception';
import { ErrorCodes } from '../common/error-codes';
import { CreateBranchDto, UpdateBranchDto } from './dto/branches.dto';
import { AuthUser, RoleName, BranchStatus } from '@nexora/types';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly audit: AuditService,
  ) {}

  async list(actor: AuthUser) {
    const qb = this.branches.createQueryBuilder('b').orderBy('b.name', 'ASC');
    if (actor.role !== RoleName.SUPER_ADMIN) qb.andWhere('b.schoolId = :sid', { sid: actor.schoolId });
    return qb.getMany();
  }

  async create(actor: AuthUser, dto: CreateBranchDto, meta: { ip: string | null; userAgent: string | null }) {
    const branch = this.branches.create({
      schoolId: actor.schoolId!,
      name: dto.name,
      address: dto.address ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      timezone: dto.timezone ?? null,
      status: BranchStatus.ACTIVE,
    });
    const saved = await this.branches.save(branch);
    await this.audit.record({
      action: 'SETTINGS_CHANGED', actorId: actor.id, schoolId: saved.schoolId,
      entityType: 'branch', entityId: saved.id,
      newValue: { name: saved.name }, ...meta,
    });
    return saved;
  }

  async update(actor: AuthUser, id: string, dto: UpdateBranchDto, meta: { ip: string | null; userAgent: string | null }) {
    const branch = await this.branches.findOne({ where: { id } });
    if (!branch) throw new AppException(ErrorCodes.NOT_FOUND, 'Branch not found.', HttpStatus.NOT_FOUND);
    if (actor.role !== RoleName.SUPER_ADMIN && branch.schoolId !== actor.schoolId)
      throw new AppException(ErrorCodes.TENANT_ACCESS_DENIED, '', HttpStatus.FORBIDDEN);
    Object.assign(branch, dto);
    const saved = await this.branches.save(branch);
    await this.audit.record({ action: 'SETTINGS_CHANGED', actorId: actor.id, schoolId: branch.schoolId, entityType: 'branch', entityId: id, ...meta });
    return saved;
  }
}