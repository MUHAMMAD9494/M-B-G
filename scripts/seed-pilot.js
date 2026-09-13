/**
 * Pilot seed script — populates a school with teachers and attendance data
 * via the REST API (no direct DB access needed).
 *
 * Usage:
 *   NODE_ENV=production node seed-pilot.js
 *
 * Requires environment variables:
 *   API_URL       — e.g. https://m-b-g-production.up.railway.app/api/v1
 *   ADMIN_EMAIL   — school admin email
 *   ADMIN_PASSWORD — school admin password
 *
 * This script is IDEMPOTENT: it checks for existing data before creating.
 * It does NOT modify production secrets or drop data.
 */

const API = process.env.API_URL || 'http://localhost:4000/api/v1';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nexorademo.edu.ng';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@2024!';

let token = '';

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = json.error || json;
    throw new Error(`${method} ${path} → ${res.status}: ${err.message || JSON.stringify(err)}`);
  }
  return json.data !== undefined ? json.data : json;
}

async function login() {
  const res = await req('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = res.accessToken;
  console.log(`✓ Logged in as ${ADMIN_EMAIL}`);
  return res.user;
}

async function ensureTeachers() {
  const { data: existing } = await req('GET', '/teachers?limit=100');
  if (existing.length >= 5) {
    console.log(`✓ ${existing.length} teachers already exist, skipping creation.`);
    return existing;
  }

  const teachers = [
    { employeeId: 'TCH-2024-001', firstName: 'Ibrahim', lastName: 'Mohammed', designation: 'Mathematics Teacher', department: 'Science', email: 'ibrahim@nexorademo.edu.ng' },
    { employeeId: 'TCH-2024-002', firstName: 'Ahmad', lastName: 'Bello', designation: 'English Teacher', department: 'Arts', email: 'ahmad@nexorademo.edu.ng' },
    { employeeId: 'TCH-2024-003', firstName: 'Fatima', lastName: 'Abdullahi', designation: 'Physics Teacher', department: 'Science', email: 'fatima@nexorademo.edu.ng' },
    { employeeId: 'TCH-2024-004', firstName: 'Hauwa', lastName: 'Garba', designation: 'Chemistry Teacher', department: 'Science', email: 'hauwa@nexorademo.edu.ng' },
    { employeeId: 'TCH-2024-005', firstName: 'Musa', lastName: 'Ibrahim', designation: 'Biology Teacher', department: 'Science', email: 'musa@nexorademo.edu.ng' },
    { employeeId: 'TCH-2024-006', firstName: 'Aisha', lastName: 'Sule', designation: 'Hausa Teacher', department: 'Languages', email: '' },
    { employeeId: 'TCH-2024-007', firstName: 'Yusuf', lastName: 'Dabo', designation: 'Islamic Studies Teacher', department: 'Religious Studies', email: '' },
    { employeeId: 'TCH-2024-008', firstName: 'Zainab', lastName: 'Wali', designation: 'Civic Education Teacher', department: 'Social Studies', email: '' },
  ];

  const created = [];
  for (const t of teachers) {
    try {
      const teacher = await req('POST', '/teachers', {
        ...t,
        email: t.email || undefined,
      });
      created.push(teacher);
      console.log(`  ✓ Created teacher: ${t.firstName} ${t.lastName} (${t.employeeId})`);
    } catch (e) {
      if (e.message.includes('CONFLICT') || e.message.includes('already exists')) {
        console.log(`  → Teacher ${t.employeeId} already exists, skipping.`);
      } else {
        console.log(`  ✗ Failed to create ${t.firstName}: ${e.message}`);
      }
    }
  }

  // Refresh full list
  const { data: all } = await req('GET', '/teachers?limit=100');
  return all;
}

async function ensureGeofence() {
  const geofences = await req('GET', '/geofences');
  if (Array.isArray(geofences) && geofences.length > 0) {
    console.log(`✓ ${geofences.length} geofence(s) already exist.`);
    return;
  }

  try {
    await req('POST', '/geofences', {
      name: 'Main Campus',
      latitude: 12.0022,
      longitude: 8.592,
      radius: 200,
    });
    console.log('✓ Created geofence: Main Campus (Kano, 200m radius)');
  } catch (e) {
    console.log(`✗ Failed to create geofence: ${e.message}`);
  }
}

async function ensureSchoolConfig() {
  try {
    const school = await req('GET', '/schools/me');
    console.log(`✓ School: ${school.name}`);
    if (!school.name || school.name === 'Nexora Demo School') {
      await req('PATCH', '/schools/me', {
        name: 'Government Day Secondary School Kano',
        address: 'Bompai Road, Nassarawa LGA, Kano',
        phone: '+2348012345678',
        email: 'info@gdsskano.edu.ng',
      });
      console.log('  ✓ Updated school profile with realistic data.');
    }
  } catch (e) {
    console.log(`✗ Failed to load/update school: ${e.message}`);
  }
}

async function main() {
  console.log('=== Nexora Pilot Seed ===\n');
  console.log(`API: ${API}\n`);

  try {
    const user = await login();
    console.log(`  Role: ${user.role}, School: ${user.schoolId || 'platform'}\n`);

    await ensureSchoolConfig();
    console.log('');
    await ensureGeofence();
    console.log('');
    await ensureTeachers();
    console.log('');

    console.log('=== Seed Complete ===');
    console.log('Next steps:');
    console.log('  1. Login as School Admin to see the dashboard');
    console.log('  2. Go to Teachers page to see your teachers');
    console.log('  3. Go to Geofences to verify the attendance zone');
    console.log('  4. Login as a teacher to test check-in');
  } catch (e) {
    console.error(`FATAL: ${e.message}`);
    process.exit(1);
  }
}

main();
