import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Body, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branches.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('branches')
@ApiBearerAuth('bearer')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  private meta(req: Request) {
    return { ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  @Get()
  @Permissions('school.read')
  @ApiOperation({ summary: 'List branches' })
  async list(@CurrentUser() actor: AuthUser) {
    return this.branches.list(actor);
  }

  @Post()
  @Permissions('school.update')
  @ApiOperation({ summary: 'Create a branch' })
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateBranchDto, @Req() req: Request) {
    return this.branches.create(actor, dto, this.meta(req));
  }

  @Patch(':id')
  @Permissions('school.update')
  @ApiOperation({ summary: 'Update a branch' })
  async update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto, @Req() req: Request) {
    return this.branches.update(actor, id, dto, this.meta(req));
  }
}