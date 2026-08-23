import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceType } from '@nexora/types';

export class CheckInDto {
  @ApiProperty() @IsEnum(AttendanceType) attendanceType: AttendanceType;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(10000) accuracy: number;
  @ApiPropertyOptional() @IsOptional() @IsUUID() deviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(36) verificationMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) deviceInfo?: string;
}

export class OfflineEventDto {
  @ApiProperty() @IsString() @MaxLength(100) localEventId: string;
  @ApiProperty() @IsEnum(AttendanceType) attendanceType: AttendanceType;
  @ApiProperty() @IsString() timestamp: string;
  @ApiProperty() @IsNumber() latitude: number;
  @ApiProperty() @IsNumber() longitude: number;
  @ApiProperty() @IsNumber() accuracy: number;
  @ApiPropertyOptional() @IsOptional() @IsString() deviceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() verificationMethod?: string;
}

export class SyncAttendanceDto {
  @ApiProperty({ type: [OfflineEventDto] }) @ValidateNested({ each: true }) @Type(() => OfflineEventDto) events: OfflineEventDto[];
}

export class AttendanceQueryDto {
  @ApiPropertyOptional() @IsOptional() page?: number = 1;
  @ApiPropertyOptional() @IsOptional() limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() teacherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() syncStatus?: string;
}

export class CorrectAttendanceDto {
  @ApiProperty() @IsString() @MaxLength(500) reason: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newTimestamp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() newStatus?: string;
}
