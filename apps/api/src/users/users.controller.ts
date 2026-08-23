import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ListUsersQueryDto } from './dto/users.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('users')
@ApiBearerAuth('bearer')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'List users (tenant-scoped)' })
  async list(@CurrentUser() actor: AuthUser, @Query() query: ListUsersQueryDto) {
    const result = await this.users.list(actor, query);
    return { data: result.data, meta: result.meta };
  }

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a user in own school (or any school for SUPER_ADMIN)' })
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateUserDto, @Req() req: Request) {
    return this.users.create(actor, dto, this.meta(req));
  }

  @Patch(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  async update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    return this.users.update(actor, id, dto, this.meta(req));
  }

  @Post(':id/disable')
  @Permissions('users.disable')
  @ApiOperation({ summary: 'Disable a user account' })
  async disable(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.users.setStatus(actor, id, 'DISABLED' as never, this.meta(req));
  }

  @Post(':id/enable')
  @Permissions('users.disable')
  @ApiOperation({ summary: 'Enable a disabled user account' })
  async enable(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.users.setStatus(actor, id, 'ACTIVE' as never, this.meta(req));
  }
}
