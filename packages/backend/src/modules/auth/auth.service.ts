import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { db } from '../../db';
import { users, tenants, schools, teacherProfiles, auditLogs } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async registerSchoolOwner(data: { tenantName: string; schoolName: string; email: string; password: string; firstName: string; lastName: string }) {
    // 1. Create Tenant
    const [tenant] = await db.insert(tenants).values({
      id: uuidv4(),
      name: data.tenantName,
      slug: data.tenantName.toLowerCase().replace(/\s+/g, '-'),
    }).returning();

    // 2. Create School
    const [school] = await db.insert(schools).values({
      id: uuidv4(),
      tenantId: tenant.id,
      name: data.schoolName,
    }).returning();

    // 3. Hash Password
    const passwordHash = await hash(data.password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });

    // 4. Create User
    const [user] = await db.insert(users).values({
      id: uuidv4(),
      tenantId: tenant.id,
      email: data.email,
      passwordHash,
      role: 'SCHOOL_OWNER',
      firstName: data.firstName,
      lastName: data.lastName,
    }).returning();

    // 5. Audit Log
    await db.insert(auditLogs).values({
      id: uuidv4(),
      tenantId: tenant.id,
      userId: user.id,
      action: 'SCHOOL_CREATED',
      resource: 'tenants',
      resourceId: tenant.id,
      metadata: JSON.stringify({ schoolName: data.schoolName }),
    });

    return { user, tenant, school };
  }

  async login(email: string, password: string) {
    // Find user
    const foundUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    
    if (foundUsers.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = foundUsers[0];

    // Verify Password
    const isValid = await verify(user.passwordHash, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update Last Login
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Generate Tokens
    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return { accessToken, refreshToken, user };
  }
}