import { Controller, Get, Post, Param, ParseUUIDPipe, Delete, Body, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { BiometricService } from './biometric.service';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';
import { IsNotEmpty, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LivenessChallenge } from './providers/biometric.provider';

class EnrollDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100000) teacherId: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000000) imageData: string;
}

class VerifyDto {
  @ApiProperty() @IsString() @IsNotEmpty() imageData: string;
}

class LivenessDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000000) response: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(36) nonce: string;
  @ApiProperty() @IsIn(['blink', 'turn-left', 'turn-right', 'smile']) kind: string;
  @ApiProperty() @IsString() @IsNotEmpty() issuedAt: string;
}

@ApiTags('biometrics')
@ApiBearerAuth('bearer')
@Controller('biometrics')
export class BiometricController {
  constructor(private readonly biometric: BiometricService) {}

  private meta(req: Request) {
    return { ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
  }

  @Post('enroll')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Enroll a biometric profile (dev-only adapter in V1)' })
  async enroll(@CurrentUser() actor: AuthUser, @Body() dto: EnrollDto, @Req() req: Request) {
    return this.biometric.enroll(actor, dto.teacherId, dto.imageData, this.meta(req));
  }

  @Post('verify/:teacherId')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Verify identity against enrolled biometric (dev-only)' })
  async verify(@Param('teacherId', ParseUUIDPipe) teacherId: string, @Body() dto: VerifyDto) {
    return this.biometric.verify(teacherId, dto.imageData);
  }

  @Post('liveness/challenge')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Issue a randomized liveness micro-challenge' })
  async livenessChallenge(): Promise<LivenessChallenge> {
    return this.biometric.livenessChallenge();
  }

  @Post('liveness/check')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Submit a liveness response against a challenge' })
  async livenessCheck(@Body() dto: LivenessDto) {
    return this.biometric.livenessCheck(
      { kind: dto.kind as LivenessChallenge['kind'], nonce: dto.nonce, issuedAt: dto.issuedAt },
      dto.response,
    );
  }

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'List biometric profiles' })
  async list(@CurrentUser() actor: AuthUser) {
    return this.biometric.list(actor);
  }

  @Delete(':id')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Delete a biometric enrollment' })
  async remove(@CurrentUser() actor: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.biometric.delete(actor, id, this.meta(req));
  }
}