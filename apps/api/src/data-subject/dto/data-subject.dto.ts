import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/**
 * Query params for the data-subject endpoints. When `user` is present the
 * route acts on behalf of another user and requires users.update permission
 * (admin variant). The id is ONLY used to look up a record — the target school
 * is always derived server-side from that record, never trusted from input.
 */
export class DataSubjectQueryDto {
  @ApiPropertyOptional({ description: 'Target user id (admin variant; requires users.update).' })
  @IsOptional()
  @IsUUID()
  user?: string;
}