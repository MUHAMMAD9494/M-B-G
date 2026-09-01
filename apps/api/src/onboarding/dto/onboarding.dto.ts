import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { RoleName } from '@nexora/types';

/**
 * Public school self-registration payload (POST /onboarding/schools and
 * POST /schools). Used by commercial onboarding to provision a new tenant.
 */
export class RegisterSchoolDto {
  @ApiProperty({ example: 'Green Valley Academy' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(200)
  schoolName: string;

  @ApiProperty({ example: 'owner@greenvalley.edu.ng' })
  @IsEmail()
  @MaxLength(320)
  adminEmail: string;

  @ApiProperty({ example: 'Amina Yusuf' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  adminFullName: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  adminPhone?: string;

  @ApiProperty({ example: 'Teacher@123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(200)
  password: string;

  @ApiPropertyOptional({ description: 'Required only when the server has INVITE_CODE configured.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  inviteCode?: string;
}

/**
 * Invite a new school member (POST /onboarding/invites). Creates a `pending`
 * user record that cannot authenticate until activated.
 */
export class InviteUserDto {
  @ApiProperty({ example: 'teacher@greenvalley.edu.ng' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ enum: RoleName })
  @IsEnum(RoleName)
  role: RoleName;
}