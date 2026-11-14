import { requireInstructor } from '@/lib/auth-helpers';
import { ProfileForm } from '@/components/profile/ProfileForm';

export default async function InstructorProfilePage() {
  const { profile } = await requireInstructor();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Faculty Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your academic credentials and verified faculty identity
        </p>
      </div>

      <ProfileForm profile={profile} allowDepartmentChange={false} />
    </div>
  );
}
