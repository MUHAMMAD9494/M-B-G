import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Permissions } from '../common/permissions.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

@ApiTags('reports')
@ApiBearerAuth('bearer')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('daily')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Daily attendance report' })
  async daily(@CurrentUser() actor: AuthUser, @Query('date') date: string) {
    return this.reports.dailyReport(actor, date);
  }

  @Get('weekly')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Weekly attendance report' })
  async weekly(@CurrentUser() actor: AuthUser, @Query('date') date: string) {
    return this.reports.weeklyReport(actor, date);
  }

  @Get('monthly')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Monthly attendance report' })
  async monthly(
    @CurrentUser() actor: AuthUser,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.reports.monthlyReport(actor, parseInt(year, 10), parseInt(month, 10));
  }

  @Get('teacher/:teacherId/history')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Teacher attendance history' })
  async teacherHistory(@CurrentUser() actor: AuthUser, @Query('teacherId') teacherId: string) {
    return this.reports.teacherHistory(actor, teacherId);
  }

  @Get('export/csv')
  @Permissions('reports.export')
  @ApiOperation({ summary: 'Export attendance as CSV' })
  async exportCsv(
    @CurrentUser() actor: AuthUser,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const csv = await this.reports.exportCsv(actor, startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendance-${startDate}-${endDate}.csv`);
    res.send(csv);
  }
}
