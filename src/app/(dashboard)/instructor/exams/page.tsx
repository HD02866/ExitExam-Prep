import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { ExamsListClient } from '@/components/exams/ExamsListClient';
import type { ExamWithDetails, Department } from '@/types/database.types';

export default async function InstructorExamsPage() {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  // 1. Fetch assigned departments
  const { data: assignments } = await supabase
    .from('instructor_departments')
    .select('department:departments(*)')
    .eq('instructor_id', profile.id);

  const assignedDepartments = (assignments || [])
    .map((a: any) => a.department)
    .filter(Boolean) as Department[];

  const deptIds = assignedDepartments.map((d) => d.id);

  // 2. Fetch exams belonging to instructor's assigned departments
  let exams: ExamWithDetails[] = [];
  if (deptIds.length > 0) {
    const { data: examsData } = await supabase
      .from('exams')
      .select('*, department:departments(*), course:courses(*)')
      .in('department_id', deptIds)
      .order('created_at', { ascending: false });

    exams = (examsData || []) as ExamWithDetails[];
  }

  return (
    <ExamsListClient
      initialExams={exams}
      departments={assignedDepartments}
      isInstructor={true}
      basePath="/instructor/exams"
    />
  );
}
