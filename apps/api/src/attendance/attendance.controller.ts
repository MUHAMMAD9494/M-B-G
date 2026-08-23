import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import {
  CheckInDto,
  SyncAttendanceDto,
  AttendanceQueryDto,
  CorrectAttendanceDto,
} from './dto/attendance.dto';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('attendance')
@ApiBearerAuth('bearer')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }

  @Post('check-in')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Record a real-time check-in or check-out' })
  async record(@CurrentUser() actor: AuthUser, @Body() dto: CheckInDto, @Req() req: Request) {
    return this.attendance.recordAttendance(actor, dto, this.meta(req));
  }

  @Post('sync')
  @Permissions('attendance.create')
  @ApiOperation({ summary: 'Sync offline-captured attendance events' })
  async sync(@CurrentUser() actor: AuthUser, @Body() dto: SyncAttendanceDto, @Req() req: Request) {
    return this.attendance.syncOffline(actor, dto, this.meta(req));
  }

  @Get()
  @Permissions('attendance.read')
  @ApiOperation({ summary: 'List attendance records (admin)' })
  async list(@CurrentUser() actor: AuthUser, @Query() query: AttendanceQueryDto) {
    return this.attendance.list(actor, query);
  }

  @Get('today-summary')
  @Permissions('attendance.read')
  @ApiOperation({ summary: "Today's attendance summary for dashboard" })
  async todaySummary(@CurrentUser() actor: AuthUser) {
    return this.attendance.todaySummary(actor);
  }

  @Patch(':id/correct')
  @Permissions('attendance.correct')
  @ApiOperation({ summary: 'Correct an attendance record with audit trail' })
  async correct(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CorrectAttendanceDto,
    @Req() req: Request,
  ) {
    return this.attendance.correct(actor, id, dto, this.meta(req));
  }
}
