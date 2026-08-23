import { Controller, Get, Patch, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SettingsService } from './settings.service';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class SetSettingDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) key: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000) value: string;
}

@ApiTags('settings')
@ApiBearerAuth('bearer')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  private meta(req: Request) {
    return { ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Get system settings' })
  async get(@CurrentUser() actor: AuthUser, @Query('key') key?: string) {
    return this.settings.get(actor, key);
  }

  @Patch()
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Set a system setting' })
  async set(@CurrentUser() actor: AuthUser, @Body() dto: SetSettingDto, @Req() req: Request) {
    return this.settings.set(actor, dto.key, dto.value, this.meta(req));
  }
}