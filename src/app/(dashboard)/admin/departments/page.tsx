import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { DepartmentsClient } from './DepartmentsClient';
import type { Department } from '@/types/database.types';

export default async function AdminDepartmentsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: departments }, { data: courses }, { data: assignments }] = await Promise.all([
    supabase.from('departments').select('*').order('name'),
    supabase.from('courses').select('department_id'),
    supabase.from('instructor_departments').select('department_id'),
  ]);

  // Aggregate course and instructor counts
  const courseCounts: Record<string, number> = {};
  courses?.forEach((c: { department_id: string }) => {
    courseCounts[c.department_id] = (courseCounts[c.department_id] || 0) + 1;
  });

  const instructorCounts: Record<string, number> = {};
  assignments?.forEach((a: { department_id: string }) => {
    instructorCounts[a.department_id] = (instructorCounts[a.department_id] || 0) + 1;
  });

  const deptList = (departments || []) as Department[];
  const deptsWithCounts = deptList.map((d) => ({
    ...d,
    courseCount: courseCounts[d.id] || 0,
    instructorCount: instructorCounts[d.id] || 0,
  }));

  return <DepartmentsClient initialDepartments={deptsWithCounts} />;
}
