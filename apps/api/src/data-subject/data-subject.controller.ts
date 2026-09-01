import { Controller, ForbiddenException, Get, HttpCode, HttpStatus, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DataSubjectService } from './data-subject.service';
import { DataSubjectQueryDto } from './dto/data-subject.dto';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser, Permission } from '@nexora/types';

/**
 * NDPA 2023 data-subject rights endpoints.
 *
 * The admin variant (targeting another user via `?user=<id>`) shares the same
 * route as the self-service variant (distinguished only by a query param), so
 * NestJS cannot register two handlers — the users.update requirement is
 * enforced manually here using the exact permission constant that
 * PermissionsGuard checks.
 */
@ApiTags('data-subject')
@ApiBearerAuth('bearer')
@Controller('data-subject')
export class DataSubjectController {
  constructor(private readonly dataSubject: DataSubjectService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Get('export')
  @ApiOperation({ summary: 'Export personal data (NDPA access request). ?user=<id> admin variant requires users.update.' })
  async exportData(@CurrentUser() actor: AuthUser, @Query() query: DataSubjectQueryDto) {
    if (query.user) {
      this.assertAdmin(actor);
      return this.dataSubject.exportFor(actor, query.user);
    }
    return this.dataSubject.exportSelf(actor);
  }

  @Post('erasure')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Erase personal data (NDPA deletion request). ?user=<id> admin variant requires users.update.' })
  async eraseData(@CurrentUser() actor: AuthUser, @Query() query: DataSubjectQueryDto, @Req() req: Request) {
    const meta = this.meta(req);
    if (query.user) {
      this.assertAdmin(actor);
      await this.dataSubject.eraseFor(actor, query.user, meta);
    } else {
      await this.dataSubject.eraseSelf(actor, meta);
    }
  }

  /** Mirrors PermissionsGuard semantics for the admin-only query variant. */
  private assertAdmin(actor: AuthUser): void {
    if (!actor.permissions.includes(Permission.USERS_UPDATE)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }
  }
}