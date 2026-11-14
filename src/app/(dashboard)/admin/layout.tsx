import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-helpers';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const { profile } = await requireAdmin();
    return <DashboardShell profile={profile}>{children}</DashboardShell>;
  } catch {
    redirect('/login?error=Admin+access+required');
  }
}
