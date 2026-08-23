import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuditModule } from '../audit/audit.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? 'dev_access_secret_change_me_00000000000000000000000000000000',
        signOptions: { expiresIn: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) },
      }),
    }),
    AuditModule,
    RbacModule,
  ],
  providers: [PasswordService, TokenService, AuthService],
  controllers: [AuthController],
  exports: [PasswordService, TokenService, JwtModule],
})
export class AuthModule {}
