import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default async function StudentProfilePage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your registered credentials, declared department, and academic account status
        </p>
      </div>

      <ProfileForm
        profile={profile}
        departments={departments || []}
        allowDepartmentChange={true}
      />
    </div>
  );
}
