import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { CoursesClient } from './CoursesClient';
import type { Course, Department } from '@/types/database.types';

export default async function AdminCoursesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: courses }, { data: departments }] = await Promise.all([
    supabase
      .from('courses')
      .select('*, department:departments(*)')
      .order('code'),
    supabase
      .from('departments')
      .select('*')
      .order('name'),
  ]);

  const rawCourses = (courses || []) as unknown as Array<
    Course & { department?: Department | null }
  >;

  return (
    <CoursesClient
      initialCourses={rawCourses}
      departments={(departments || []) as Department[]}
    />
  );
}
