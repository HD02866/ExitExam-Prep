import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { StudentDepartmentsClient } from './StudentDepartmentsClient';
import type { Department, Course } from '@/types/database.types';

export default async function StudentDepartmentsPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const [{ data: departments }, { data: courses }] = await Promise.all([
    supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('code'),
  ]);

  const deptList = (departments || []) as Department[];
  const courseList = (courses || []) as Course[];

  const deptsWithCourses = deptList.map((d) => ({
    ...d,
    courses: courseList.filter((c) => c.department_id === d.id),
  }));

  return (
    <StudentDepartmentsClient
      departments={deptsWithCourses}
      currentDepartmentId={profile.department_id}
    />
  );
}
