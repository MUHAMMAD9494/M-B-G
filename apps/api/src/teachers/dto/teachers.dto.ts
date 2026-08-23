import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { EmploymentStatus } from '@nexora/types';

export class CreateTeacherDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) employeeId: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
  @ApiPropertyOptional({ description: 'Only SUPER_ADMIN may set schoolId explicitly.' }) @IsOptional() @IsUUID() schoolId?: string;
}

export class UpdateTeacherDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) designation?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(EmploymentStatus) employmentStatus?: EmploymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() attendanceStatus?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string | null;
}

export class ListTeachersQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() page?: number = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20 }) @IsOptional() limit?: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: EmploymentStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() department?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
