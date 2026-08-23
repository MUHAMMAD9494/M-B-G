import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';
import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateNotifPrefDto {
  @ApiProperty() @IsString() @MaxLength(30) channel: string;
  @ApiProperty() @IsBoolean() enabled: boolean;
}

@ApiTags('notifications')
@ApiBearerAuth('bearer')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notif: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser() actor: AuthUser) {
    return this.notif.getPreferences(actor);
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update a notification channel preference' })
  async updatePreference(@CurrentUser() actor: AuthUser, @Body() dto: UpdateNotifPrefDto) {
    return this.notif.updatePreference(actor, dto.channel, dto.enabled);
  }
}
