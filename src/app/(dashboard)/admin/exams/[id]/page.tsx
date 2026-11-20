import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { ExamDetailManager } from '@/components/exams/ExamDetailManager';
import type {
  ExamWithDetails,
  QuestionWithOptions,
  Department,
  Course,
} from '@/types/database.types';

interface PageProps {
  params: { id: string };
}

export default async function AdminExamDetailPage({ params }: PageProps) {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: examData, error: examError }, { data: questionsData }, { data: deptsData }, { data: coursesData }] =
    await Promise.all([
      supabase
        .from('exams')
        .select('*, department:departments(*), course:courses(*)')
        .eq('id', params.id)
        .single(),
      supabase
        .from('questions')
        .select('*, options:question_options(*)')
        .eq('exam_id', params.id)
        .order('question_order'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('courses').select('*').order('code'),
    ]);

  if (examError || !examData) {
    notFound();
  }

  const exam = examData as ExamWithDetails;
  const questions = (questionsData || []) as QuestionWithOptions[];
  const departments = (deptsData || []) as Department[];
  const courses = (coursesData || []) as Course[];

  return (
    <ExamDetailManager
      exam={exam}
      initialQuestions={questions}
      departments={departments}
      courses={courses}
      isInstructor={false}
      basePath="/admin/exams"
    />
  );
}
