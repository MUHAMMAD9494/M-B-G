import { pgTable, text, timestamp, uuid, boolean, index, varchar, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. TENANTS
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('tenants_slug_idx').on(table.slug),
}));

// 2. SCHOOLS
export const schools = pgTable('schools', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),
  geofenceRadius: integer('geofence_radius').default(100),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('schools_tenant_idx').on(table.tenantId),
}));

// 3. USERS
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantEmailIdx: index('users_tenant_email_idx').on(table.tenantId, table.email),
}));

// 4. TEACHER PROFILES
export const teacherProfiles = pgTable('teacher_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  schoolId: uuid('school_id').notNull().references(() => schools.id, { onDelete: 'cascade' }),
  employeeId: varchar('employee_id', { length: 50 }),
  phoneNumber: varchar('phone_number', { length: 20 }),
  biometricEnrolled: boolean('biometric_enrolled').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('teacher_profiles_user_idx').on(table.userId),
  schoolIdx: index('teacher_profiles_school_idx').on(table.schoolId),
}));

// 5. AUDIT LOGS
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  userId: uuid('user_id'),
  action: varchar('action', { length: 100 }).notNull(),
  resource: varchar('resource', { length: 100 }),
  resourceId: uuid('resource_id'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index('audit_logs_tenant_idx').on(table.tenantId),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

// RELATIONS (Fixed: removed oneToOne, used one() instead)
export const tenantRelations = relations(tenants, ({ many }) => ({
  schools: many(schools),
  users: many(users),
  auditLogs: many(auditLogs),
}));

export const schoolRelations = relations(schools, ({ one, many }) => ({
  tenant: one(tenants, { fields: [schools.tenantId], references: [tenants.id] }),
  teacherProfiles: many(teacherProfiles),
}));

export const userRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  // Use one() with the foreign key field to define 1:1
  teacherProfile: one(teacherProfiles, { fields: [users.id], references: [teacherProfiles.userId] }),
}));

export const teacherProfileRelations = relations(teacherProfiles, ({ one }) => ({
  user: one(users, { fields: [teacherProfiles.userId], references: [users.id] }),
  school: one(schools, { fields: [teacherProfiles.schoolId], references: [schools.id] }),
}));