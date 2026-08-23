import { Controller, Post, Get, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, requestMeta } from './auth.service';
import { LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { Public } from '../common/public.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthUser } from '@nexora/types';

const isProd = process.env.NODE_ENV === 'production';

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('nse_access', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: parseInt(process.env.JWT_ACCESS_TTL ?? '900', 10) * 1000,
    path: '/',
  });
  res.cookie('nse_refresh', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10) * 1000,
    path: '/',
  });
}

function clearAuthCookies(res: Response): void {
  res.cookie('nse_access', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
  res.cookie('nse_refresh', '', { httpOnly: true, sameSite: 'lax', maxAge: 0, path: '/' });
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.auth.login(dto, requestMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body?: { refreshToken?: string }) {
    const token = req.cookies?.nse_refresh ?? body?.refreshToken;
    const result = await this.auth.refresh(token, requestMeta(req));
    setAuthCookies(res, result.accessToken, result.refreshToken);
    return { accessToken: result.accessToken, expiresIn: result.expiresIn };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the refresh token and clear cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @CurrentUser() actor: AuthUser) {
    await this.auth.logout(req.cookies?.nse_refresh, actor, requestMeta(req));
    clearAuthCookies(res);
    return {};
  }

  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user with permissions' })
  async me(@CurrentUser() actor: AuthUser) {
    return actor;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change own password (revokes all sessions)' })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: Request, @CurrentUser() actor: AuthUser) {
    await this.auth.changePassword(actor, dto, requestMeta(req));
    return {};
  }
}
