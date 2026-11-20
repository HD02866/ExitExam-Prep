'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';
import type { OptionKey } from '@/types/database.types';

export interface QuestionOptionInput {
  id?: string;
  optionKey: OptionKey;
  optionText: string;
  isCorrect: boolean;
}

export interface QuestionInput {
  questionText: string;
  points: number;
  explanation?: string | null;
  options: QuestionOptionInput[];
}

export interface QuestionActionResult {
  success?: boolean;
  error?: string;
  questionId?: string;
}

/**
 * Helper: verify exam exists and user is authorized to manage its department.
 */
async function verifyExamAuthorization(userId: string, userRole: string, examId: string) {
  const supabase = await createClient();

  const { data: exam, error } = await supabase
    .from('exams')
    .select('id, title, department_id, status')
    .eq('id', examId)
    .single();

  if (error || !exam) {
    throw new Error('Examination not found.');
  }

  if (userRole === 'admin') {
    return exam;
  }

  if (userRole !== 'instructor') {
    throw new Error('Forbidden: Instructor or Admin permissions required.');
  }

  const { data: assignment } = await supabase
    .from('instructor_departments')
    .select('id')
    .eq('instructor_id', userId)
    .eq('department_id', exam.department_id)
    .maybeSingle();

  if (!assignment) {
    throw new Error('Unauthorized: You are not authorized to manage questions for this department.');
  }

  return exam;
}

/**
 * Validate question inputs: text, points, 4 options (A, B, C, D), exactly 1 correct answer.
 */
function validateQuestionData(data: QuestionInput): string | null {
  if (!data.questionText || data.questionText.trim().length === 0) {
    return 'Question text is required.';
  }

  if (isNaN(data.points) || data.points <= 0) {
    return 'Question points must be a positive number greater than 0.';
  }

  if (!Array.isArray(data.options) || data.options.length !== 4) {
    return 'Each question must have exactly four answer options (Options A, B, C, and D).';
  }

  const validKeys: OptionKey[] = ['A', 'B', 'C', 'D'];
  const presentKeys = new Set(data.options.map((o) => o.optionKey));

  for (const k of validKeys) {
    if (!presentKeys.has(k)) {
      return `Answer option ${k} is missing.`;
    }
  }

  for (const opt of data.options) {
    if (!opt.optionText || opt.optionText.trim().length === 0) {
      return `Answer text for Option ${opt.optionKey} cannot be empty.`;
    }
  }

  const correctCount = data.options.filter((o) => o.isCorrect === true).length;
  if (correctCount === 0) {
    return 'Exactly one answer option must be marked as the correct answer.';
  }
  if (correctCount > 1) {
    return 'Only one answer option can be marked as the correct answer.';
  }

  return null;
}

/**
 * Create a question with 4 answer options.
 */
export async function createQuestion(
  examId: string,
  data: QuestionInput
): Promise<QuestionActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const exam = await verifyExamAuthorization(user.id, profile.role, examId);

    const validationError = validateQuestionData(data);
    if (validationError) {
      return { error: validationError };
    }

    const supabase = await createClient();

    // Determine the next question order
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('question_order')
      .eq('exam_id', examId)
      .order('question_order', { ascending: false })
      .limit(1);

    const nextOrder = existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].question_order + 1
      : 1;

    // Insert Question record
    const { data: newQuestion, error: qError } = await supabase
      .from('questions')
      .insert({
        exam_id: examId,
        question_text: data.questionText.trim(),
        points: data.points,
        explanation: data.explanation?.trim() || null,
        question_order: nextOrder,
      })
      .select('id')
      .single();

    if (qError || !newQuestion) {
      return { error: qError?.message || 'Failed to create question.' };
    }

    // Insert 4 Question Options
    const optionsToInsert = data.options.map((opt) => ({
      question_id: newQuestion.id,
      option_key: opt.optionKey,
      option_text: opt.optionText.trim(),
      is_correct: opt.isCorrect,
    }));

    const { error: optError } = await supabase
      .from('question_options')
      .insert(optionsToInsert);

    if (optError) {
      // Rollback question if options fail
      await supabase.from('questions').delete().eq('id', newQuestion.id);
      return { error: `Failed to save options: ${optError.message}` };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'question_create',
        entityType: 'question',
        entityId: newQuestion.id,
        details: {
          examId,
          examTitle: exam.title,
          points: data.points,
          order: nextOrder,
        },
      });
    }

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    return { success: true, questionId: newQuestion.id };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Update an existing question and its 4 options.
 */
export async function updateQuestion(
  questionId: string,
  data: QuestionInput
): Promise<QuestionActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    // Fetch question to verify exam relationship
    const { data: existingQ, error: fetchQError } = await supabase
      .from('questions')
      .select('id, exam_id')
      .eq('id', questionId)
      .single();

    if (fetchQError || !existingQ) {
      return { error: 'Question not found.' };
    }

    const exam = await verifyExamAuthorization(user.id, profile.role, existingQ.exam_id);

    const validationError = validateQuestionData(data);
    if (validationError) {
      return { error: validationError };
    }

    // Update question metadata
    const { error: updateQError } = await supabase
      .from('questions')
      .update({
        question_text: data.questionText.trim(),
        points: data.points,
        explanation: data.explanation?.trim() || null,
      })
      .eq('id', questionId);

    if (updateQError) {
      return { error: updateQError.message };
    }

    // Delete existing options and insert updated options to maintain clean state & constraints
    const { error: deleteOptError } = await supabase
      .from('question_options')
      .delete()
      .eq('question_id', questionId);

    if (deleteOptError) {
      return { error: deleteOptError.message };
    }

    const optionsToInsert = data.options.map((opt) => ({
      question_id: questionId,
      option_key: opt.optionKey,
      option_text: opt.optionText.trim(),
      is_correct: opt.isCorrect,
    }));

    const { error: insertOptError } = await supabase
      .from('question_options')
      .insert(optionsToInsert);

    if (insertOptError) {
      return { error: insertOptError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'question_update',
        entityType: 'question',
        entityId: questionId,
        details: {
          examId: existingQ.exam_id,
          examTitle: exam.title,
          points: data.points,
        },
      });
    }

    revalidatePath(`/admin/exams/${existingQ.exam_id}`);
    revalidatePath(`/instructor/exams/${existingQ.exam_id}`);
    return { success: true, questionId };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Delete a question.
 */
export async function deleteQuestion(questionId: string): Promise<QuestionActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    const supabase = await createClient();

    const { data: existingQ, error: fetchError } = await supabase
      .from('questions')
      .select('id, exam_id')
      .eq('id', questionId)
      .single();

    if (fetchError || !existingQ) {
      return { error: 'Question not found.' };
    }

    const exam = await verifyExamAuthorization(user.id, profile.role, existingQ.exam_id);

    const { error: deleteError } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (deleteError) {
      return { error: deleteError.message };
    }

    if (profile.role === 'admin') {
      await logAdminActivity({
        adminId: user.id,
        adminEmail: profile.email,
        adminName: profile.full_name,
        actionType: 'question_delete',
        entityType: 'question',
        entityId: questionId,
        details: {
          examId: existingQ.exam_id,
          examTitle: exam.title,
        },
      });
    }

    revalidatePath(`/admin/exams/${existingQ.exam_id}`);
    revalidatePath(`/instructor/exams/${existingQ.exam_id}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

/**
 * Reorder questions within an examination.
 */
export async function reorderQuestions(
  examId: string,
  orderedQuestionIds: string[]
): Promise<QuestionActionResult> {
  try {
    const { user, profile } = await requireInstructor();
    await verifyExamAuthorization(user.id, profile.role, examId);

    const supabase = await createClient();

    // Update each question's order in parallel
    const updatePromises = orderedQuestionIds.map((id, index) =>
      supabase
        .from('questions')
        .update({ question_order: index + 1 })
        .eq('id', id)
        .eq('exam_id', examId)
    );

    await Promise.all(updatePromises);

    revalidatePath(`/admin/exams/${examId}`);
    revalidatePath(`/instructor/exams/${examId}`);
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
