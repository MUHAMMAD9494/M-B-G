"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = __importStar(require("bcryptjs"));
const school_entity_1 = require("../entities/school.entity");
const branch_entity_1 = require("../entities/branch.entity");
const user_entity_1 = require("../entities/user.entity");
const teacher_entity_1 = require("../entities/teacher.entity");
const geofence_entity_1 = require("../entities/geofence.entity");
const types_1 = require("@nexora/types");
const SALT_ROUNDS = 12;
async function hash(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
}
async function seed() {
    const url = process.env.DATABASE_URL ?? 'postgres://nexora:Nexora@2024!@localhost:5433/nexora_attendance';
    const ds = new typeorm_1.DataSource({
        type: 'postgres',
        url,
        entities: [school_entity_1.School, branch_entity_1.Branch, user_entity_1.User, teacher_entity_1.Teacher, geofence_entity_1.Geofence],
        synchronize: false,
    });
    await ds.initialize();
    console.info('Connected to database.');
    const schoolRepo = ds.getRepository(school_entity_1.School);
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
    const branchRepo = ds.getRepository(branch_entity_1.Branch);
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
    const userRepo = ds.getRepository(user_entity_1.User);
    let superAdmin = await userRepo.findOne({ where: { email: 'super@nexora.dev' } });
    if (!superAdmin) {
        superAdmin = userRepo.create({
            schoolId: null,
            email: 'super@nexora.dev',
            phone: null,
            passwordHash: await hash('SuperAdmin@2024!'),
            firstName: 'Nexora',
            lastName: 'Super Admin',
            role: types_1.RoleName.SUPER_ADMIN,
            status: types_1.UserStatus.ACTIVE,
        });
        superAdmin = await userRepo.save(superAdmin);
        console.info('Created super admin:', superAdmin.id);
    }
    let schoolAdmin = await userRepo.findOne({ where: { email: 'admin@nexorademo.edu.ng' } });
    if (!schoolAdmin) {
        schoolAdmin = userRepo.create({
            schoolId: school.id,
            email: 'admin@nexorademo.edu.ng',
            phone: '+2348012345678',
            passwordHash: await hash('Admin@2024!'),
            firstName: 'Amina',
            lastName: 'Yusuf',
            role: types_1.RoleName.SCHOOL_ADMIN,
            status: types_1.UserStatus.ACTIVE,
        });
        schoolAdmin = await userRepo.save(schoolAdmin);
        console.info('Created school admin:', schoolAdmin.id);
    }
    const teacherRepo = ds.getRepository(teacher_entity_1.Teacher);
    const teacherData = [
        { firstName: 'Ibrahim', lastName: 'Mohammed', employeeId: 'NSE-001', department: 'Science', designation: 'Senior Teacher', phone: '+2348023456789', email: 'ibrahim@nexorademo.edu.ng' },
        { firstName: 'Fatima', lastName: 'Ali', employeeId: 'NSE-002', department: 'Mathematics', designation: 'Teacher', phone: '+2348034567890', email: 'fatima@nexorademo.edu.ng' },
        { firstName: 'Ahmad', lastName: 'Bala', employeeId: 'NSE-003', department: 'English', designation: 'Teacher', phone: '+2348045678901', email: 'ahmad@nexorademo.edu.ng' },
        { firstName: 'Hauwa', lastName: 'Khalid', employeeId: 'NSE-004', department: 'Social Studies', designation: 'Head of Department', phone: '+2348056789012', email: 'hauwa@nexorademo.edu.ng' },
        { firstName: 'Musa', lastName: 'Goni', employeeId: 'NSE-005', department: 'Science', designation: 'Teacher', phone: '+2348067890123', email: 'musa@nexorademo.edu.ng' },
    ];
    for (const td of teacherData) {
        const existing = await teacherRepo.findOne({ where: { employeeId: td.employeeId, schoolId: school.id } });
        if (!existing) {
            const email = td.email;
            const userExists = await userRepo.findOne({ where: { email } });
            let userId;
            if (!userExists) {
                const user = userRepo.create({
                    schoolId: school.id,
                    email,
                    phone: td.phone,
                    passwordHash: await hash('Teacher@2024!'),
                    firstName: td.firstName,
                    lastName: td.lastName,
                    role: types_1.RoleName.TEACHER,
                    status: types_1.UserStatus.ACTIVE,
                });
                const saved = await userRepo.save(user);
                userId = saved.id;
            }
            else {
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
                employmentStatus: types_1.EmploymentStatus.ACTIVE,
                attendanceStatus: true,
            });
            await teacherRepo.save(teacher);
            console.info('Created teacher:', td.employeeId);
        }
    }
    const geoRepo = ds.getRepository(geofence_entity_1.Geofence);
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
    await ds.query(`
    INSERT INTO system_settings (school_id, key, value)
    VALUES ($1, 'biometric.enabled', 'false'), ($1, 'liveness.required', 'false')
    ON CONFLICT DO NOTHING
  `, [school.id]);
    await ds.destroy();
    console.info('\nSeed completed successfully.');
    if (process.env.NODE_ENV !== 'production') {
        console.info('\nDemo credentials (dev only):');
        console.info('  Super Admin: super@nexora.dev / SuperAdmin@2024!');
        console.info('  School Admin: admin@nexorademo.edu.ng / Admin@2024!');
        console.info('  Teachers: ibrahim/fatima/ahmad/hauwa/musa@nexorademo.edu.ng / Teacher@2024!');
    }
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map