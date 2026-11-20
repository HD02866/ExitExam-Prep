import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { ExamDetailManager } from '@/components/exams/ExamDetailManager';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import type {
  ExamWithDetails,
  QuestionWithOptions,
  Department,
  Course,
} from '@/types/database.types';

interface PageProps {
  params: { id: string };
}

export default async function InstructorExamDetailPage({ params }: PageProps) {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  const [{ data: examData, error: examError }, { data: questionsData }] =
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
    ]);

  if (examError || !examData) {
    notFound();
  }

  const exam = examData as ExamWithDetails;

  // Authorization check for Instructor: must belong to instructor's assigned departments
  if (profile.role !== 'admin') {
    const { data: assignment } = await supabase
      .from('instructor_departments')
      .select('id')
      .eq('instructor_id', profile.id)
      .eq('department_id', exam.department_id)
      .maybeSingle();

    if (!assignment) {
      return (
        <div className="max-w-xl mx-auto py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Department Access Forbidden</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            You are not authorized to manage examinations for{' '}
            <strong>{exam.department?.name || 'this department'}</strong>. Instructors are strictly
            restricted to their assigned departments.
          </p>
          <div className="pt-2">
            <Link
              href="/instructor/exams"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Authorized Examinations
            </Link>
          </div>
        </div>
      );
    }
  }

  // Fetch assigned departments and courses for settings tab
  const { data: assignments } = await supabase
    .from('instructor_departments')
    .select('department:departments(*)')
    .eq('instructor_id', profile.id);

  const assignedDepartments = (assignments || [])
    .map((a: any) => a.department)
    .filter(Boolean) as Department[];

  const deptIds = assignedDepartments.map((d) => d.id);
  let courses: Course[] = [];
  if (deptIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .in('department_id', deptIds)
      .order('code');
    courses = (coursesData || []) as Course[];
  }

  const questions = (questionsData || []) as QuestionWithOptions[];

  return (
    <ExamDetailManager
      exam={exam}
      initialQuestions={questions}
      departments={assignedDepartments}
      courses={courses}
      isInstructor={true}
      basePath="/instructor/exams"
    />
  );
}
