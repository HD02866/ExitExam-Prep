import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  uuid,
  index,
  uniqueIndex,
  unique,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { departments, courses, profiles } from './academic';

/**
 * Examinations Table
 * Represents Exit Examinations and Course Examinations with lifecycle states and academic settings.
 */
export const exams = pgTable(
  'exams',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    departmentId: uuid('department_id')
      .notNull()
      .references(() => departments.id, { onDelete: 'restrict' }),
    examType: text('exam_type').notNull(), // 'exit_exam' | 'course_exam'
    courseId: uuid('course_id').references(() => courses.id, { onDelete: 'set null' }),
    examYear: integer('exam_year').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    totalQuestions: integer('total_questions').default(0).notNull(),
    maxAttempts: integer('max_attempts').default(1).notNull(),
    passingScore: numeric('passing_score', { precision: 5, scale: 2 }).default('50.00').notNull(),
    status: text('status').default('draft').notNull(), // 'draft' | 'published' | 'archived'
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_exams_department_id').on(table.departmentId),
    index('idx_exams_course_id').on(table.courseId),
    index('idx_exams_status').on(table.status),
    index('idx_exams_created_by').on(table.createdBy),
    index('idx_exams_exam_type').on(table.examType),
    index('idx_exams_exam_year').on(table.examYear),
    index('idx_exams_created_at').on(table.createdAt),
    check('check_exam_type', sql`${table.examType} IN ('exit_exam', 'course_exam')`),
    check('check_exam_status', sql`${table.status} IN ('draft', 'published', 'archived')`),
    check('check_exam_year', sql`${table.examYear} >= 2000 AND ${table.examYear} <= 2100`),
    check('check_exam_duration', sql`${table.durationMinutes} > 0`),
    check('check_exam_total_questions', sql`${table.totalQuestions} >= 0`),
    check('check_exam_max_attempts', sql`${table.maxAttempts} >= 1`),
    check(
      'check_exam_passing_score',
      sql`${table.passingScore} >= 0 AND ${table.passingScore} <= 100`
    ),
    check(
      'check_exam_type_course',
      sql`(${table.examType} = 'course_exam' AND ${table.courseId} IS NOT NULL) OR (${table.examType} = 'exit_exam')`
    ),
  ]
);

/**
 * Questions Table
 * Individual multiple choice questions belonging to an examination.
 */
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    examId: uuid('exam_id')
      .notNull()
      .references(() => exams.id, { onDelete: 'cascade' }),
    questionText: text('question_text').notNull(),
    questionOrder: integer('question_order').default(1).notNull(),
    explanation: text('explanation'),
    points: numeric('points', { precision: 5, scale: 2 }).default('1.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_questions_exam_id').on(table.examId),
    index('idx_questions_exam_order').on(table.examId, table.questionOrder),
    check('check_question_points', sql`${table.points} > 0`),
    check('check_question_order', sql`${table.questionOrder} >= 1`),
  ]
);

/**
 * Question Options Table
 * Stores exactly 4 answer options (A, B, C, D) per question with at most one correct answer.
 */
export const questionOptions = pgTable(
  'question_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    questionId: uuid('question_id')
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),
    optionKey: text('option_key').notNull(), // 'A' | 'B' | 'C' | 'D'
    optionText: text('option_text').notNull(),
    isCorrect: boolean('is_correct').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('uq_question_option_key').on(table.questionId, table.optionKey),
    uniqueIndex('uq_question_one_correct')
      .on(table.questionId)
      .where(sql`${table.isCorrect} = true`),
    index('idx_question_options_question_id').on(table.questionId),
    index('idx_question_options_is_correct').on(table.questionId, table.isCorrect),
    check('check_option_key', sql`${table.optionKey} IN ('A', 'B', 'C', 'D')`),
  ]
);

export type Exam = typeof exams.$inferSelect;
export type NewExam = typeof exams.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type QuestionOption = typeof questionOptions.$inferSelect;
export type NewQuestionOption = typeof questionOptions.$inferInsert;
