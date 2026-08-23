import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { SchoolsService } from './schools.service';
import { UpdateSchoolDto } from './dto/schools.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('schools')
@ApiBearerAuth('bearer')
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
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
