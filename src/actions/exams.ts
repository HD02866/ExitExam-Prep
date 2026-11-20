'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstructor, requireAuth } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import type { ExamType, ExamStatus } from '@/types/database.types';

export interface ExamActionResult {
  success?: boolean;
  error?: string;
  examId?: string;
  validationErrors?: string[];
}

export interface ExamValidationResult {
  isValid: boolean;
  errors: string[];
  questionCount: number;
  totalPoints: number;
}

/**
 * Helper: Verify if an instructor is authorized for a specific department.
 * Admins are always authorized for all departments.
 */
async function verifyDepartmentAuthorization(
  userId: string,
  userRole: string,
  departmentId: string
): Promise<boolean> {
  if (userRole === 'admin') return true;
  if (userRole !== 'instructor') return false;

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from('instructor_departments')
    .select('id')
    .eq('instructor_id', userId)
    .eq('department_id', departmentId)
    .maybeSingle();

  return Boolean(assignment);
}

/**
 * Validate an examination for publication against all 10 academic and architectural rules.
 */
export async function validateExamForPublication(examId: string): Promise<ExamValidationResult> {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  // 1. Fetch Exam details
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*, department:departments(*), course:courses(*)')
    .eq('id', examId)
    .single();

  if (examError || !exam) {
    return {
      isValid: false,
      errors: ['Examination record not found.'],
      questionCount: 0,
      totalPoints: 0,
    };
  }

  // Verify access authorization
  const isAuthorized = await verifyDepartmentAuthorization(
    profile.id,
    profile.role,
    exam.department_id
  );
  if (!isAuthorized) {
    return {
      isValid: false,
      errors: ['Unauthorized: You do not have permission to view or manage this examination.'],
      questionCount: 0,
      totalPoints: 0,
    };
  }

  const errors: string[] = [];

  // Check 1: Exam title
  if (!exam.title || exam.title.trim().length < 3) {
    errors.push('Examination title must be at least 3 characters long.');
  }

  // Check 2: Department exists and is active
  if (!exam.department) {
    errors.push('The associated academic department does not exist.');
  } else if (!exam.department.is_active) {
    errors.push(`The academic department "${exam.department.name}" is currently inactive.`);
  }

  // Check 3 & 4: Course relationship & validity
  if (exam.exam_type === 'course_exam') {
    if (!exam.course_id || !exam.course) {
      errors.push('Course examinations must be associated with a valid course.');
    } else {
      if (exam.course.department_id !== exam.department_id) {
        errors.push('The associated course does not belong to the selected academic department.');
      }
      if (!exam.course.is_active) {
        errors.push(`The associated course "${exam.course.code} — ${exam.course.title}" is inactive.`);
      }
    }
  } else if (exam.course_id && exam.course) {
    if (exam.course.department_id !== exam.department_id) {
      errors.push('The associated course does not belong to the selected academic department.');
    }
  }

  // Check 5: Duration positive
  if (exam.duration_minutes <= 0) {
    errors.push('Examination duration must be greater than 0 minutes.');
  }

  // Check Passing score
  if (exam.passing_score < 0 || exam.passing_score > 100) {
    errors.push('Passing score must be between 0% and 100%.');
  }

  // Check 6, 7, 8, 9, 10: Fetch questions and options
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*, options:question_options(*)')
    .eq('exam_id', examId)
    .order('question_order');

  if (qError) {
    errors.push(`Failed to retrieve examination questions: ${qError.message}`);
    return { isValid: false, errors, questionCount: 0, totalPoints: 0 };
  }

  const questionList = questions || [];
  const questionCount = questionList.length;
  let totalPoints = 0;

  if (questionCount === 0) {
    errors.push('At least one question is required before an examination can be published.');
  }

  questionList.forEach((q, idx) => {
    const qNum = idx + 1;
    totalPoints += Number(q.points) || 0;

    // Check points
    if (!q.points || Number(q.points) <= 0) {
      errors.push(`Question #${qNum} has invalid points (must be greater than 0).`);
    }

    // Check Question text
    if (!q.question_text || q.question_text.trim().length === 0) {
      errors.push(`Question #${qNum} question text is empty.`);
    }

    const options = (q.options || []) as Array<{
      id: string;
      option_key: string;
      option_text: string;
      is_correct: boolean;
    }>;

    // Check Exactly 4 options
    if (options.length !== 4) {
      errors.push(`Question #${qNum} has ${options.length} options (exactly 4 options A, B, C, D are required).`);
    } else {
      const keys = new Set(options.map((o) => o.option_key));
      ['A', 'B', 'C', 'D'].forEach((k) => {
        if (!keys.has(k)) {
          errors.push(`Question #${qNum} is missing Option ${k}.`);
        }
      });

      const emptyOptions = options.filter((o) => !o.option_text || o.option_text.trim().length === 0);
      if (emptyOptions.length > 0) {
        errors.push(`Question #${qNum} has ${emptyOptions.length} blank answer option(s).`);
      }
    }

    // Check Exactly 1 correct answer
    const correctCount = options.filter((o) => o.is_correct === true).length;
    if (correctCount === 0) {
      errors.push(`Question #${qNum} does not have a correct answer selected.`);
    } else if (correctCount > 1) {
      errors.push(`Question #${qNum} has multiple correct answers marked (${correctCount}). Exactly one must be correct.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    questionCount,
    totalPoints,
  };
}

/**
 * Create a new examination.
 * Admins can create exams for any department.
 * Instructors can ONLY create exams for their assigned departments.
 */
export async function createExam(
  prevState: ExamActionResult | null,
  formData: FormData
): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim();
    const examType = formData.get('examType')?.toString().trim() as ExamType;
    const courseId = formData.get('courseId')?.toString().trim() || null;
    const examYear = parseInt(formData.get('examYear')?.toString().trim() || new Date().getFullYear().toString(), 10);
    const durationMinutes = parseInt(formData.get('durationMinutes')?.toString().trim() || '60', 10);
    const maxAttempts = parseInt(formData.get('maxAttempts')?.toString().trim() || '1', 10);
    const passingScore = parseFloat(formData.get('passingScore')?.toString().trim() || '50.00');

    // Validation: Title
    if (!title || title.length < 3) {
      return { error: 'Examination title must be at least 3 characters long.' };
    }

    // Validation: Department
    if (!departmentId) {
      return { error: 'Academic department is required.' };
    }

    // Authorization: Check department assignment for instructors
    const isAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, departmentId);
    if (!isAuthorized) {
      return {
        error: 'Unauthorized: You are only permitted to create examinations within your assigned departments.',
      };
    }

    // Verify Department exists and is active
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code, is_active')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) {
      return { error: 'Selected academic department does not exist.' };
    }
    if (!dept.is_active) {
      return { error: `Department "${dept.name}" is currently inactive. Cannot create examinations.` };
    }

    // Validation: Exam type & Course
    if (examType !== 'exit_exam' && examType !== 'course_exam') {
      return { error: 'Invalid examination type selected.' };
    }

    if (examType === 'course_exam') {
      if (!courseId) {
        return { error: 'Course examinations require an associated academic course.' };
      }
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, code, title, department_id, is_active')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        return { error: 'Selected course does not exist.' };
      }
      if (course.department_id !== departmentId) {
        return { error: 'Selected course does not belong to the selected department.' };
      }
      if (!course.is_active) {
        return { error: `Selected course "${course.code} — ${course.title}" is inactive.` };
      }
    } else if (courseId) {
      // Optional course for exit exam must match department
      const { data: course } = await supabase
        .from('courses')
        .select('id, department_id')
        .eq('id', courseId)
        .single();

      if (course && course.department_id !== departmentId) {
        return { error: 'Selected course does not belong to the selected department.' };
      }
    }

    // Validation: Numbers
    if (isNaN(examYear) || examYear < 2000 || examYear > 2100) {
      return { error: 'Examination year must be a valid year between 2000 and 2100.' };
    }
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      return { error: 'Examination duration must be a positive number of minutes.' };
    }
    if (isNaN(maxAttempts) || maxAttempts < 1) {
      return { error: 'Maximum attempts must be at least 1.' };
    }
    if (isNaN(passingScore) || passingScore < 0 || passingScore > 100) {
      return { error: 'Passing score must be between 0% and 100%.' };
    }

    // Insert examination strictly in 'draft' status
    const { data: newExam, error: insertError } = await supabase
      .from('exams')
      .insert({
        title,
        description,
        department_id: departmentId,
        exam_type: examType,
        course_id: courseId,
        exam_year: examYear,
        duration_minutes: durationMinutes,
        total_questions: 0,
        max_attempts: maxAttempts,
        passing_score: passingScore,
        status: 'draft',
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    // Log admin activity if action performed by admin
    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_create',
        entityType: 'exam',
        entityId: newExam.id,
        details: {
          title,
          departmentId,
          departmentCode: dept.code,
          examType,
          courseId,
          status: 'draft',
        },
      });
    }

    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true, examId: newExam.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Update examination metadata and settings.
 */
export async function updateExam(
  examId: string,
  prevState: ExamActionResult | null,
  formData: FormData
): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    // Fetch existing exam
    const { data: existingExam, error: fetchError } = await supabase
      .from('exams')
      .select('*, department:departments(*)')
      .eq('id', examId)
      .single();

    if (fetchError || !existingExam) {
      return { error: 'Examination not found.' };
    }

    // Verify authorization
    const isAuthorized = await verifyDepartmentAuthorization(
      user.id,
      profile.role,
      existingExam.department_id
    );
    if (!isAuthorized) {
      return {
        error: 'Unauthorized: You are not authorized to modify examinations in this department.',
      };
    }

    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim() || existingExam.department_id;
    const examType = (formData.get('examType')?.toString().trim() || existingExam.exam_type) as ExamType;
    const courseId = formData.get('courseId')?.toString().trim() || null;
    const examYear = parseInt(formData.get('examYear')?.toString().trim() || String(existingExam.exam_year), 10);
    const durationMinutes = parseInt(formData.get('durationMinutes')?.toString().trim() || String(existingExam.duration_minutes), 10);
    const maxAttempts = parseInt(formData.get('maxAttempts')?.toString().trim() || String(existingExam.max_attempts), 10);
    const passingScore = parseFloat(formData.get('passingScore')?.toString().trim() || String(existingExam.passing_score));

    if (!title || title.length < 3) {
      return { error: 'Examination title must be at least 3 characters long.' };
    }

    // If department was changed, verify authorization for new department
    if (departmentId !== existingExam.department_id) {
      const isNewDeptAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, departmentId);
      if (!isNewDeptAuthorized) {
        return { error: 'Unauthorized: You cannot reassign an examination to an unassigned department.' };
      }
    }

    // Validate course when course_exam
    if (examType === 'course_exam') {
      if (!courseId) {
        return { error: 'Course examinations require an associated academic course.' };
      }
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, department_id, is_active')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        return { error: 'Selected course does not exist.' };
      }
      if (course.department_id !== departmentId) {
        return { error: 'Selected course does not belong to the selected department.' };
      }
    }

    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      return { error: 'Duration must be positive.' };
    }
    if (isNaN(maxAttempts) || maxAttempts < 1) {
      return { error: 'Maximum attempts must be at least 1.' };
    }
    if (isNaN(passingScore) || passingScore < 0 || passingScore > 100) {
      return { error: 'Passing score must be between 0% and 100%.' };
    }

    const { error: updateError } = await supabase
      .from('exams')
      .update({
        title,
        description,
        department_id: departmentId,
        exam_type: examType,
        course_id: courseId,
        exam_year: examYear,
        duration_minutes: durationMinutes,
        max_attempts: maxAttempts,
        passing_score: passingScore,
      })
      .eq('id', examId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_update',
        entityType: 'exam',
        entityId: examId,
        details: {
          title,
          departmentId,
          examType,
          courseId,
        },
      });
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Publish an examination after verifying all publication requirements.
 */
export async function publishExam(examId: string): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    // Fetch exam
    const { data: exam, error: fetchError } = await supabase
      .from('exams')
      .select('*, department:departments(*)')
      .eq('id', examId)
      .single();

    if (fetchError || !exam) {
      return { error: 'Examination not found.' };
    }

    // Verify authorization
    const isAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, exam.department_id);
    if (!isAuthorized) {
      return {
        error: 'Unauthorized: You do not have permission to publish examinations for this department.',
      };
    }

    // Run strict publication validation
    const validation = await validateExamForPublication(examId);
    if (!validation.isValid) {
      return {
        error: `Cannot publish examination: ${validation.errors.join(' ')}`,
        validationErrors: validation.errors,
      };
    }

    // Update status to 'published'
    const { error: updateError } = await supabase
      .from('exams')
      .update({ status: 'published' })
      .eq('id', examId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_publish',
        entityType: 'exam',
        entityId: examId,
        details: {
          title: exam.title,
          departmentId: exam.department_id,
          questionsCount: validation.questionCount,
          totalPoints: validation.totalPoints,
        },
      });
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Unpublish an examination (revert from published to draft).
 */
export async function unpublishExam(examId: string): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    const { data: exam, error: fetchError } = await supabase
      .from('exams')
      .select('title, department_id, status')
      .eq('id', examId)
      .single();

    if (fetchError || !exam) {
      return { error: 'Examination not found.' };
    }

    const isAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, exam.department_id);
    if (!isAuthorized) {
      return { error: 'Unauthorized: Access restricted to assigned departments.' };
    }

    const { error: updateError } = await supabase
      .from('exams')
      .update({ status: 'draft' })
      .eq('id', examId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_unpublish',
        entityType: 'exam',
        entityId: examId,
        details: { title: exam.title, previousStatus: exam.status, newStatus: 'draft' },
      });
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Archive an examination (status -> archived).
 */
export async function archiveExam(examId: string): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    const { data: exam, error: fetchError } = await supabase
      .from('exams')
      .select('title, department_id, status')
      .eq('id', examId)
      .single();

    if (fetchError || !exam) {
      return { error: 'Examination not found.' };
    }

    const isAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, exam.department_id);
    if (!isAuthorized) {
      return { error: 'Unauthorized: Access restricted to assigned departments.' };
    }

    const { error: updateError } = await supabase
      .from('exams')
      .update({ status: 'archived' })
      .eq('id', examId);

    if (updateError) {
      return { error: updateError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_archive',
        entityType: 'exam',
        entityId: examId,
        details: { title: exam.title, previousStatus: exam.status, newStatus: 'archived' },
      });
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Delete an examination.
 */
export async function deleteExam(examId: string): Promise<ExamActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    const { data: exam, error: fetchError } = await supabase
      .from('exams')
      .select('title, department_id, status')
      .eq('id', examId)
      .single();

    if (fetchError || !exam) {
      return { error: 'Examination not found.' };
    }

    const isAuthorized = await verifyDepartmentAuthorization(user.id, profile.role, exam.department_id);
    if (!isAuthorized) {
      return { error: 'Unauthorized: You cannot delete examinations outside your assigned departments.' };
    }

    const { error: deleteError } = await supabase
      .from('exams')
      .delete()
      .eq('id', examId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'exam_delete',
        entityType: 'exam',
        entityId: examId,
        details: { title: exam.title, departmentId: exam.department_id },
      });
    }

    revalidatePath('/admin/exams');
    revalidatePath('/instructor/exams');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
