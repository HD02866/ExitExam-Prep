import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth-helpers';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { profile } = await requireAuth();

    if (profile.role !== 'student' && profile.role !== 'admin') {
      redirect(`/${profile.role}`);
    }

    return <DashboardShell profile={profile}>{children}</DashboardShell>;
  } catch {
    redirect('/login?error=Authentication+required');
  }
}
