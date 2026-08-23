import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { GeofencingService } from './geofencing.service';
import { CreateGeofenceDto, UpdateGeofenceDto } from './dto/geofencing.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('geofences')
@ApiBearerAuth('bearer')
@Controller('geofences')
export class GeofencingController {
  constructor(private readonly geofencing: GeofencingService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'List geofences for the school' })
  async list(@CurrentUser() actor: AuthUser) {
    return this.geofencing.list(actor);
  }

  @Post()
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Create a geofence (deactivates existing ones)' })
  async create(@CurrentUser() actor: AuthUser, @Body() dto: CreateGeofenceDto, @Req() req: Request) {
    return this.geofencing.create(actor, dto, this.meta(req));
  }

  @Patch(':id')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Update a geofence' })
  async update(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGeofenceDto, @Req() req: Request) {
    return this.geofencing.update(actor, id, dto, this.meta(req));
  }
}
