import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { ActivityLogsClient } from './ActivityLogsClient';
import type { AdminActivityLog } from '@/types/database.types';

export default async function AdminActivityLogsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('admin_activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return <ActivityLogsClient logs={(logs || []) as AdminActivityLog[]} />;
}
