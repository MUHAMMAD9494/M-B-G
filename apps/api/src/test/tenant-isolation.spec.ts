// CRITICAL SECURITY TEST — must pass before any release.
// Verifies that multi-tenant isolation is enforced at the application layer
// (defense-in-depth alongside PostgreSQL RLS). A user from School A must never
// read, update, or delete resources belonging to School B.
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from '../users/users.service';
import { TeachersService } from '../teachers/teachers.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { User } from '../entities/user.entity';
import { Teacher } from '../entities/teacher.entity';
import { Branch } from '../entities/branch.entity';
import { AppException } from '../common/app-exception';
import { RoleName, UserStatus, EmploymentStatus } from '@nexora/types';

const SCHOOL_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbbbbbb-0000-0000-0000-000000000002';

const adminA = {
  id: 'admin-a',
  schoolId: SCHOOL_A,
  email: 'a@a.edu.ng',
  phone: null,
  firstName: 'A',
  lastName: 'Admin',
  role: RoleName.SCHOOL_ADMIN,
  status: UserStatus.ACTIVE,
  permissions: [],
};

function teacherIn(schoolId: string, id: string): Teacher {
  return {
    id,
    schoolId,
    branchId: null,
    userId: null,
    employeeId: `EMP-${id}`,
    firstName: 'T',
    lastName: 'T',
    phone: null,
    email: null,
    department: null,
    designation: null,
    employmentStatus: EmploymentStatus.ACTIVE,
    attendanceStatus: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Teacher;
}

describe('Tenant isolation (application layer)', () => {
  let usersService: UsersService;
  let teachersService: TeachersService;

  const usersRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() };
  const teachersRepo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), createQueryBuilder: jest.fn() };
  const branchesRepo = { findOne: jest.fn() };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        TeachersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: getRepositoryToken(Teacher), useValue: teachersRepo },
        { provide: getRepositoryToken(Branch), useValue: branchesRepo },
        { provide: PasswordService, useValue: { hash: jest.fn(), verify: jest.fn() } },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    usersService = module.get(UsersService);
    teachersService = module.get(TeachersService);
    jest.clearAllMocks();
  });

  it('blocks updating a user from another school', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u-b', schoolId: SCHOOL_B } as User);
    await expect(
      usersService.update(adminA as never, 'u-b', { firstName: 'X' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });

  it('blocks disabling a user from another school', async () => {
    usersRepo.findOne.mockResolvedValue({ id: 'u-b', schoolId: SCHOOL_B } as User);
    await expect(
      usersService.setStatus(adminA as never, 'u-b', UserStatus.DISABLED, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });

  it('blocks reading a teacher from another school', async () => {
    teachersRepo.findOne.mockResolvedValue(teacherIn(SCHOOL_B, 't-b'));
    await expect(teachersService.getOne(adminA as never, 't-b')).rejects.toThrow(AppException);
  });

  it('blocks updating a teacher from another school', async () => {
    teachersRepo.findOne.mockResolvedValue(teacherIn(SCHOOL_B, 't-b'));
    await expect(
      teachersService.update(adminA as never, 't-b', { firstName: 'X' }, { ip: null, userAgent: null }),
    ).rejects.toThrow(AppException);
  });

  it('allows SUPER_ADMIN to access any tenant (by design)', async () => {
    const superAdmin = { ...adminA, id: 'super', schoolId: null, role: RoleName.SUPER_ADMIN };
    teachersRepo.findOne.mockResolvedValue(teacherIn(SCHOOL_B, 't-b'));
    await expect(teachersService.getOne(superAdmin as never, 't-b')).resolves.toBeDefined();
  });
});
