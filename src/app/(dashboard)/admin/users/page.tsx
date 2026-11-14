import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { UsersClient } from './UsersClient';
import type { Profile, Department } from '@/types/database.types';

export default async function AdminUsersPage() {
  const { user: currentAdmin } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: departments }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, department:departments(name, code)')
      .order('created_at', { ascending: false }),
    supabase
      .from('departments')
      .select('*')
      .eq('is_active', true)
      .order('name'),
  ]);

  const rawProfiles = (profiles || []) as unknown as Array<
    Profile & { department?: { name: string; code: string } | null }
  >;

  return (
    <UsersClient
      initialProfiles={rawProfiles}
      departments={(departments || []) as Department[]}
      currentAdminId={currentAdmin.id}
    />
  );
}
