import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types/database.types';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) return null;
  return profile;
}

export async function requireAuth(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; profile: Profile }> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error('Unauthorized: User profile not found.');
  }

  if (profile.account_status !== 'active') {
    throw new Error(`Forbidden: Account is ${profile.account_status}.`);
  }

  return { user, profile };
}

export async function requireAdmin(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; profile: Profile }> {
  const { user, profile } = await requireAuth();

  if (profile.role !== 'admin') {
    throw new Error('Forbidden: Admin access required.');
  }

  return { user, profile };
}

export async function requireInstructor(): Promise<{ user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; profile: Profile }> {
  const { user, profile } = await requireAuth();

  if (profile.role !== 'instructor' && profile.role !== 'admin') {
    throw new Error('Forbidden: Instructor access required.');
  }

  return { user, profile };
}
