import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { SchoolsService } from './schools.service';
import { UpdateSchoolDto } from './dto/schools.dto';
import { OnboardingService } from '../onboarding/onboarding.service';
import { RegisterSchoolDto } from '../onboarding/dto/onboarding.dto';
import { Permissions } from '../common/permissions.decorator';
import { Public } from '../common/public.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('schools')
@ApiBearerAuth('bearer')
@Controller('schools')
export class SchoolsController {
  constructor(
    private readonly schools: SchoolsService,
    private readonly onboarding: OnboardingService,
  ) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post()
  @ApiOperation({ summary: 'Self-register a school (public commercial onboarding): provisions tenant, branch, owner + consent.' })
  async selfRegister(@Body() dto: RegisterSchoolDto, @Req() req: Request) {
    return this.onboarding.registerSchool(dto, this.meta(req));
  }

  @Get('me')
  @Permissions('school.read')
  @ApiOperation({ summary: 'Get own school configuration' })
  async getMine(@CurrentUser() actor: AuthUser) {
    return this.schools.getMine(actor);
  }

  @Patch('me')
  @Permissions('school.update')
  @ApiOperation({ summary: 'Update own school configuration' })
  async updateMine(@CurrentUser() actor: AuthUser, @Body() dto: UpdateSchoolDto, @Req() req: Request) {
    return this.schools.updateMine(actor, dto, this.meta(req));
  }
}
