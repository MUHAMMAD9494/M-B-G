import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../common/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('database')
  @ApiOperation({ summary: 'Database connectivity check' })
  async database() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', database: 'connected' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { status: 'error', database: 'disconnected', message: msg };
    }
  }
}