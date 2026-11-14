'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/auth-helpers';

export interface AuthActionResult {
  success?: boolean;
  error?: string;
  redirectTo?: string;
}

export async function registerStudent(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const fullName = formData.get('fullName')?.toString().trim();
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();
  const departmentId = formData.get('departmentId')?.toString().trim() || null;

  if (!fullName || !email || !password) {
    return { error: 'Please provide your full name, university email, and password.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  const supabase = await createClient();

  // Register user via Supabase Auth
  // Notice: Role is NOT set from client input. Database trigger forces 'student'.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        department_id: departmentId,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled or session is immediate
  if (data.session) {
    return { success: true, redirectTo: '/student' };
  }

  return {
    success: true,
    error: undefined,
    redirectTo: '/login?message=Registration+successful.+Please+log+in.',
  };
}

export async function loginUser(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim().toLowerCase();
  const password = formData.get('password')?.toString();

  if (!email || !password) {
    return { error: 'Please enter your email and password.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Invalid email or password. Please check your credentials.' };
  }

  if (!data.user) {
    return { error: 'Unable to retrieve user account.' };
  }

  // Fetch profile to verify role and status
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, account_status')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { error: 'User profile not found. Please contact administration.' };
  }

  if (profile.account_status !== 'active') {
    await supabase.auth.signOut();
    return {
      error: `Your account status is "${profile.account_status}". Access denied. Contact support.`,
    };
  }

  const destination = `/${profile.role}`;
  return { success: true, redirectTo: destination };
}

export async function logoutUser(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordReset(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const email = formData.get('email')?.toString().trim().toLowerCase();

  if (!email) {
    return { error: 'Please provide your account email address.' };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password/confirm`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: true,
    redirectTo: '/reset-password?sent=true',
  };
}

export async function updateStudentDepartment(departmentId: string): Promise<AuthActionResult> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: 'Unauthorized.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ department_id: departmentId })
    .eq('id', profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/student', 'layout');
  return { success: true };
}

export async function updateOwnProfile(prevState: AuthActionResult | null, formData: FormData): Promise<AuthActionResult> {
  const fullName = formData.get('fullName')?.toString().trim();
  const departmentId = formData.get('departmentId')?.toString().trim() || null;

  if (!fullName) {
    return { error: 'Full name cannot be empty.' };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  if (!profile) {
    return { error: 'Unauthorized.' };
  }

  const updatePayload: { full_name: string; department_id?: string | null } = {
    full_name: fullName,
  };

  // Only student can set department_id through own profile
  if (profile.role === 'student' && departmentId) {
    updatePayload.department_id = departmentId;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/${profile.role}/profile`, 'page');
  return { success: true };
}
