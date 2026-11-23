import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  index,
  uniqueIndex,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { user } from './auth';

/**
 * Academic Departments Table
 * Represents university departments (e.g. Computer Science, Electrical Engineering).
 */
export const departments = pgTable(
  'departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull().unique(),
    description: text('description'),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_departments_active').on(table.isActive),
    uniqueIndex('uq_departments_name_lower').on(sql`lower(trim(${table.name}))`),
    uniqueIndex('uq_departments_code_upper').on(sql`upper(trim(${table.code}))`),
  ]
);

/**
 * User Profiles Table
 * Domain profile information linked 1:1 with Better Auth's user table.
 */
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    role: text('role').default('student').notNull(),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    accountStatus: text('account_status').default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_profiles_role').on(table.role),
    index('idx_profiles_dept').on(table.departmentId),
    index('idx_profiles_status').on(table.accountStatus),
    check('check_profile_role', sql`${table.role} IN ('admin', 'instructor', 'student')`),
    check(
      'check_profile_account_status',
      sql`${table.accountStatus} IN ('active', 'inactive', 'suspended')`
    ),
  ]
);

/**
 * Courses Table
 * Specific academic courses within departments.
 */
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: text('code').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_course_dept_code').on(table.departmentId, table.code),
    index('idx_courses_dept').on(table.departmentId),
    index('idx_courses_active').on(table.isActive),
    uniqueIndex('uq_courses_dept_code_upper').on(
      table.departmentId,
      sql`upper(trim(${table.code}))`
    ),
  ]
);

/**
 * Instructor Department Assignments Table (Many-to-Many)
 * Scopes instructor authorization to assigned academic departments.
 */
export const instructorDepartments = pgTable(
  'instructor_departments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    instructorId: uuid('instructor_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_instructor_dept').on(table.instructorId, table.departmentId),
    index('idx_inst_dept_inst').on(table.instructorId),
    index('idx_inst_dept_dept').on(table.departmentId),
  ]
);

export type Department = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type InstructorDepartment = typeof instructorDepartments.$inferSelect;
export type NewInstructorDepartment = typeof instructorDepartments.$inferInsert;
