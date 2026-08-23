import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { RbacService } from '../rbac/rbac.service';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AppException } from '../common/app-exception';
import { RoleName, UserStatus } from '@nexora/types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    schoolId: 'school-1',
    email: 'teacher@school.edu.ng',
    phone: null,
    passwordHash: 'hashed',
    firstName: 'Ada',
    lastName: 'Obi',
    role: RoleName.TEACHER,
    status: UserStatus.ACTIVE,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

describe('AuthService.login', () => {
  let service: AuthService;
  const usersRepo = { findOne: jest.fn(), update: jest.fn() };
  const refreshRepo = { insert: jest.fn() };
  const password = { verify: jest.fn(), hash: jest.fn() };
  const tokens = {
    signAccessToken: jest.fn().mockResolvedValue('access'),
    generateRefreshToken: jest.fn().mockReturnValue({ token: 'rt', hash: 'h' }),
    hashToken: jest.fn().mockReturnValue('h'),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshRepo },
        { provide: PasswordService, useValue: password },
        { provide: TokenService, useValue: tokens },
        { provide: AuditService, useValue: audit },
        { provide: RbacService, useClass: RbacService },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  it('returns user + tokens on valid credentials', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    password.verify.mockResolvedValue(true);

    const result = await service.login(
      { email: 'teacher@school.edu.ng', password: 'secret' },
      { ip: null, userAgent: null },
    );
    expect(result.user.role).toBe(RoleName.TEACHER);
    expect(result.accessToken).toBe('access');
    expect(usersRepo.update).toHaveBeenCalled();
  });

  it('throws INVALID_CREDENTIALS when the user does not exist', async () => {
    usersRepo.findOne.mockResolvedValue(null);
    await expect(
      service.login({ email: 'ghost@x.com', password: 'x' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });

  it('increments failed-login counter and throws on wrong password', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser());
    password.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'teacher@school.edu.ng', password: 'bad' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
    expect(usersRepo.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ failedLoginAttempts: 1 }));
  });

  it('throws ACCOUNT_LOCKED when lockedUntil is in the future', async () => {
    const future = new Date(Date.now() + 60000);
    usersRepo.findOne.mockResolvedValue(makeUser({ lockedUntil: future }));
    await expect(
      service.login({ email: 'teacher@school.edu.ng', password: 'x' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });

  it('throws ACCOUNT_DISABLED for non-active users', async () => {
    usersRepo.findOne.mockResolvedValue(makeUser({ status: UserStatus.DISABLED }));
    await expect(
      service.login({ email: 'teacher@school.edu.ng', password: 'x' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });
});
