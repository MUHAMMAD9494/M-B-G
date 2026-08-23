import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto, UpdateTeacherDto, ListTeachersQueryDto } from './dto/teachers.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('teachers')
@ApiBearerAuth('bearer')
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Get()
  @Permissions('teachers.read')
  @ApiOperation({ summary: 'List teachers (tenant-scoped)' })
  async list(@CurrentUser() actor: AuthUser, @Query() query: ListTeachersQueryDto) {
    return this.teachers.list(actor, query);
  }

  @Get(':id')
  @Permissions('teachers.read')
  @ApiOperation({ summary: 'Get a single teacher by ID' })
  async getOne(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.teachers.getOne(actor, id);
  }

  @Post()
  @Permissions('teachers.create')
  @ApiOperation({ summary: 'Create a teacher' })
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateTeacherDto, @Req() req: Request) {
    return this.teachers.create(actor, dto, this.meta(req));
  }

  @Patch(':id')
  @Permissions('teachers.update')
  @ApiOperation({ summary: 'Update teacher profile' })
  async update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeacherDto, @Req() req: Request) {
    return this.teachers.update(actor, id, dto, this.meta(req));
  }
}
