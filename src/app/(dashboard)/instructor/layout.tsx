import { redirect } from 'next/navigation';
import { requireInstructor } from '@/lib/auth-helpers';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { profile } = await requireInstructor();
    return <DashboardShell profile={profile}>{children}</DashboardShell>;
  } catch {
    redirect('/login?error=Instructor+access+required');
  }
}
