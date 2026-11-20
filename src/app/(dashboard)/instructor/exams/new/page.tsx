import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { ExamForm } from '@/components/exams/ExamForm';
import type { Department, Course } from '@/types/database.types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function InstructorNewExamPage() {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  // Fetch only active departments assigned to this instructor
  const { data: assignments } = await supabase
    .from('instructor_departments')
    .select('department:departments(*)')
    .eq('instructor_id', profile.id);

  const assignedDepartments = (assignments || [])
    .map((a: any) => a.department)
    .filter((d: any) => d && d.is_active) as Department[];

  const deptIds = assignedDepartments.map((d) => d.id);

  let courses: Course[] = [];
  if (deptIds.length > 0) {
    const { data: coursesData } = await supabase
      .from('courses')
      .select('*')
      .in('department_id', deptIds)
      .eq('is_active', true)
      .order('code');

    courses = (coursesData || []) as Course[];
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/instructor/exams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examinations
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
          Author New Examination
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create an authorized Exit Exam or Course Exam for your assigned academic faculty
        </p>
      </div>

      <ExamForm
        departments={assignedDepartments}
        courses={courses}
        isInstructor={true}
        basePath="/instructor/exams"
      />
    </div>
  );
}
