import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { OnboardingService } from './onboarding.service';
import { InviteUserDto, RegisterSchoolDto } from './dto/onboarding.dto';
import { Public } from '../common/public.decorator';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('onboarding')
@ApiBearerAuth('bearer')
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('schools')
  @ApiOperation({ summary: 'Self-register a school: creates tenant, Main Branch, owner account and NDPA consent record.' })
  async registerSchool(@Body() dto: RegisterSchoolDto, @Req() req: Request) {
    return this.onboarding.registerSchool(dto, this.meta(req));
  }

  @Post('invites')
  @Permissions('school.update')
  @ApiOperation({ summary: 'Invite a school member (creates a pending user that cannot log in until activated).' })
  async inviteUser(@CurrentUser() actor: AuthUser, @Body() dto: InviteUserDto, @Req() req: Request) {
    return this.onboarding.inviteUser(actor, dto, this.meta(req));
  }
}