import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { ExamsListClient } from '@/components/exams/ExamsListClient';
import type { ExamWithDetails, Department } from '@/types/database.types';

export default async function AdminExamsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: examsData }, { data: deptsData }] = await Promise.all([
    supabase
      .from('exams')
      .select('*, department:departments(*), course:courses(*)')
      .order('created_at', { ascending: false }),
    supabase.from('departments').select('*').order('name'),
  ]);

  const exams = (examsData || []) as ExamWithDetails[];
  const departments = (deptsData || []) as Department[];

  return (
    <ExamsListClient
      initialExams={exams}
      departments={departments}
      isInstructor={false}
      basePath="/admin/exams"
    />
  );
}
