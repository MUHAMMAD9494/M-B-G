import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class RegisterDeviceDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(255) deviceIdentifier: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) deviceType: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) platform: string;
}

@ApiTags('devices')
@ApiBearerAuth('bearer')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update a device' })
  async register(@CurrentUser() actor: AuthUser, @Body() dto: RegisterDeviceDto) {
    return this.devices.register(actor, dto);
  }

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'List devices' })
  async list(@CurrentUser() actor: AuthUser) {
    return this.devices.list(actor);
  }
}
