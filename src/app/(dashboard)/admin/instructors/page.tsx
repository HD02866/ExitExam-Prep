import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { InstructorsClient } from './InstructorsClient';
import type { Profile, Department } from '@/types/database.types';

export default async function AdminInstructorsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { data: assignments },
    { data: instructors },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from('instructor_departments')
      .select('*, instructor:profiles(*), department:departments(*)')
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'instructor')
      .order('full_name'),
    supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name'),
  ]);

  const rawList = (assignments || []) as unknown as Array<{
    id: string;
    instructor_id: string;
    department_id: string;
    created_at: string;
    instructor: Profile;
    department: Department;
  }>;

  const validAssignments = rawList.filter((a) => a.instructor && a.department);

  return (
    <InstructorsClient
      assignments={validAssignments}
      instructors={(instructors || []) as Profile[]}
      departments={(departments || []) as Department[]}
    />
  );
}
