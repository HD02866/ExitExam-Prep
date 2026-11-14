import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from './RegisterForm';

export default async function RegisterPage() {
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return <RegisterForm departments={departments || []} />;
}
