import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { School } from '../entities/school.entity';
import { Branch } from '../entities/branch.entity';
import { User } from '../entities/user.entity';
import { Teacher } from '../entities/teacher.entity';
import { Geofence } from '../entities/geofence.entity';
import { RoleName, UserStatus, EmploymentStatus } from '@nexora/types';

const SALT_ROUNDS = 12;

async function hash(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Run: npx ts-node -P apps/api/tsconfig.json apps/api/src/database/seed.ts
 * Requires DATABASE_URL env var or falls back to dev default.
 */
async function seed() {
  const url = process.env.DATABASE_URL ?? 'postgres://nexora:Nexora@2024!@localhost:5433/nexora';
  const ds = new DataSource({
    type: 'postgres',
    url,
    entities: [School, Branch, User, Teacher, Geofence],
    synchronize: false,
  });
  await ds.initialize();
  console.info('Connected to database.');

  // 1. School
  const schoolRepo = ds.getRepository(School);
  let school = await schoolRepo.findOne({ where: { name: 'Nexora Demo Academy' } });
  if (!school) {
    school = schoolRepo.create({
      name: 'Nexora Demo Academy',
      address: '12 Education Lane, Maiduguri, Borno State, Nigeria',
      phone: '+2348012345678',
      email: 'admin@nexorademo.edu.ng',
      timezone: 'Africa/Lagos',
      workingDays: [1, 2, 3, 4, 5],
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 30,
    });
    school = await schoolRepo.save(school);
    console.info('Created school:', school.id);
  }

  // 2. Branch
  const branchRepo = ds.getRepository(Branch);
  let branch = await branchRepo.findOne({ where: { schoolId: school.id, name: 'Main Campus' } });
  if (!branch) {
    branch = branchRepo.create({
      schoolId: school.id,
      name: 'Main Campus',
      address: '12 Education Lane',
      latitude: 11.8443,
      longitude: 13.1423,
      timezone: 'Africa/Lagos',
    });
    branch = await branchRepo.save(branch);
    console.info('Created branch:', branch.id);
  }

  // 3. Super Admin user
  const userRepo = ds.getRepository(User);
  let superAdmin = await userRepo.findOne({ where: { email: 'super@nexora.dev' } });
  if (!superAdmin) {
    superAdmin = userRepo.create({
      schoolId: null, // platform-level
      email: 'super@nexora.dev',
      phone: null,
      passwordHash: await hash('SuperAdmin@2024!'),
      firstName: 'Nexora',
      lastName: 'Super Admin',
      role: RoleName.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    });
    superAdmin = await userRepo.save(superAdmin);
    console.info('Created super admin:', superAdmin.id);
  }

  // 4. School Admin user
  let schoolAdmin = await userRepo.findOne({ where: { email: 'admin@nexorademo.edu.ng' } });
  if (!schoolAdmin) {
    schoolAdmin = userRepo.create({
      schoolId: school.id,
      email: 'admin@nexorademo.edu.ng',
      phone: '+2348012345678',
      passwordHash: await hash('Admin@2024!'),
      firstName: 'Amina',
      lastName: 'Yusuf',
      role: RoleName.SCHOOL_ADMIN,
      status: UserStatus.ACTIVE,
    });
    schoolAdmin = await userRepo.save(schoolAdmin);
    console.info('Created school admin:', schoolAdmin.id);
  }

  // 5. Teachers
  const teacherRepo = ds.getRepository(Teacher);
  const teacherData = [
    { firstName: 'Ibrahim', lastName: 'Mohammed', employeeId: 'NSE-001', department: 'Science', designation: 'Senior Teacher', phone: '+2348023456789', email: 'ibrahim@nexorademo.edu.ng' },
    { firstName: 'Fatima', lastName: 'Ali', employeeId: 'NSE-002', department: 'Mathematics', designation: 'Teacher', phone: '+2348034567890', email: 'fatima@nexorademo.edu.ng' },
    { firstName: 'Ahmad', lastName: 'Bala', employeeId: 'NSE-003', department: 'English', designation: 'Teacher', phone: '+2348045678901', email: 'ahmad@nexorademo.edu.ng' },
    { firstName: 'Hauwa', lastName: 'Khalid', employeeId: 'NSE-004', department: 'Social Studies', designation: 'Head of Department', phone: '+2348056789012', email: 'hauwa@nexorademo.edu.ng' },
    { firstName: 'Musa', lastName: 'Goni', employeeId: 'NSE-005', department: 'Science', designation: 'Teacher', phone: '+2348067890123', email: 'musa@nexorademo.edu.ng' },
  ];

  for (const td of teacherData) {
    let existing = await teacherRepo.findOne({ where: { employeeId: td.employeeId, schoolId: school.id } });
    if (!existing) {
      // Also create a user account for each teacher
      const email = td.email!;
      const userExists = await userRepo.findOne({ where: { email } });
      let userId: string;
      if (!userExists) {
        const user = userRepo.create({
          schoolId: school.id,
          email,
          phone: td.phone,
          passwordHash: await hash('Teacher@2024!'),
          firstName: td.firstName,
          lastName: td.lastName,
          role: RoleName.TEACHER,
          status: UserStatus.ACTIVE,
        });
        const saved = await userRepo.save(user);
        userId = saved.id;
      } else {
        userId = userExists.id;
      }

      const teacher = teacherRepo.create({
        schoolId: school.id,
        branchId: branch.id,
        userId,
        employeeId: td.employeeId,
        firstName: td.firstName,
        lastName: td.lastName,
        phone: td.phone,
        email: td.email,
        department: td.department,
        designation: td.designation,
        employmentStatus: EmploymentStatus.ACTIVE,
        attendanceStatus: true,
      });
      await teacherRepo.save(teacher);
      console.info('Created teacher:', td.employeeId);
    }
  }

  // 6. Geofence (main campus)
  const geoRepo = ds.getRepository(Geofence);
  let geo = await geoRepo.findOne({ where: { schoolId: school.id, active: true } });
  if (!geo) {
    geo = geoRepo.create({
      schoolId: school.id,
      name: 'Main Campus Perimeter',
      latitude: 11.8443,
      longitude: 13.1423,
      radius: 100,
      active: true,
    });
    geo = await geoRepo.save(geo);
    console.info('Created geofence:', geo.id);
  }

  // 7. System settings
  await ds.query(`
    INSERT INTO system_settings (school_id, key, value)
    VALUES ($1, 'biometric.enabled', 'false'), ($1, 'liveness.required', 'false')
    ON CONFLICT DO NOTHING
  `, [school.id]);

  await ds.destroy();
  console.info('\nSeed completed successfully.');
  console.info('\nDemo credentials:');
  console.info('  Super Admin: super@nexora.dev / SuperAdmin@2024!');
  console.info('  School Admin: admin@nexorademo.edu.ng / Admin@2024!');
  console.info('  Teachers: ibrahim/fatima/ahmad/hauwa/musa@nexorademo.edu.ng / Teacher@2024!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
