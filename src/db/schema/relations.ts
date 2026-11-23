import { relations } from 'drizzle-orm';
import { user, session, account } from './auth';
import { departments, profiles, courses, instructorDepartments } from './academic';
import { adminActivityLogs } from './audit';
import { exams, questions, questionOptions } from './exams';

// Better Auth User Relations
export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [user.id],
    references: [profiles.id],
  }),
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Departments Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  profiles: many(profiles),
  courses: many(courses),
  instructorDepartments: many(instructorDepartments),
  exams: many(exams),
}));

// Profiles Relations
export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(user, {
    fields: [profiles.id],
    references: [user.id],
  }),
  department: one(departments, {
    fields: [profiles.departmentId],
    references: [departments.id],
  }),
  instructorDepartments: many(instructorDepartments),
  createdExams: many(exams),
  activityLogs: many(adminActivityLogs),
}));

// Courses Relations
export const coursesRelations = relations(courses, ({ one, many }) => ({
  department: one(departments, {
    fields: [courses.departmentId],
    references: [departments.id],
  }),
  exams: many(exams),
}));

// Instructor Departments Relations
export const instructorDepartmentsRelations = relations(
  instructorDepartments,
  ({ one }) => ({
    instructor: one(profiles, {
      fields: [instructorDepartments.instructorId],
      references: [profiles.id],
    }),
    department: one(departments, {
      fields: [instructorDepartments.departmentId],
      references: [departments.id],
    }),
  })
);

// Admin Activity Logs Relations
export const adminActivityLogsRelations = relations(adminActivityLogs, ({ one }) => ({
  admin: one(profiles, {
    fields: [adminActivityLogs.adminId],
    references: [profiles.id],
  }),
}));

// Exams Relations
export const examsRelations = relations(exams, ({ one, many }) => ({
  department: one(departments, {
    fields: [exams.departmentId],
    references: [departments.id],
  }),
  course: one(courses, {
    fields: [exams.courseId],
    references: [courses.id],
  }),
  creator: one(profiles, {
    fields: [exams.createdBy],
    references: [profiles.id],
  }),
  questions: many(questions),
}));

// Questions Relations
export const questionsRelations = relations(questions, ({ one, many }) => ({
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id],
  }),
  options: many(questionOptions),
}));

// Question Options Relations
export const questionOptionsRelations = relations(questionOptions, ({ one }) => ({
  question: one(questions, {
    fields: [questionOptions.questionId],
    references: [questions.id],
  }),
}));
