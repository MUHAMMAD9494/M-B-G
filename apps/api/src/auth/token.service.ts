import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { Permission, RoleName, UserStatus } from '@nexora/types';

export interface AccessTokenPayload {
  sub: string;
  schoolId: string | null;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: RoleName;
  status: UserStatus;
  permissions: Permission[];
  type: 'access';
}

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): Promise<string> {
    return this.jwt.signAsync({ ...payload, type: 'access' });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token);
  }

  /** Opaque, high-entropy refresh token. Only its SHA-256 hash is persisted. */
  generateRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, hash: this.hashToken(token) };
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
