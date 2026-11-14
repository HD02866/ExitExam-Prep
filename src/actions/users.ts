'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import type { UserRole, AccountStatus } from '@/types/database.types';

export interface UserActionResult {
  success?: boolean;
  error?: string;
}

export async function createStaffAccount(
  prevState: UserActionResult | null,
  formData: FormData
): Promise<UserActionResult> {
  try {
    const { user: adminUser } = await requireAdmin();

    const fullName = formData.get('fullName')?.toString().trim();
    const email = formData.get('email')?.toString().trim().toLowerCase();
    const password = formData.get('password')?.toString();
    const role = (formData.get('role')?.toString().trim() || 'instructor') as UserRole;
    const departmentId = formData.get('departmentId')?.toString().trim() || null;

    if (!fullName || !email || !password) {
      return { error: 'Full name, email, and temporary password are required.' };
    }

    if (password.length < 6) {
      return { error: 'Temporary password must be at least 6 characters.' };
    }

    if (!['admin', 'instructor', 'student'].includes(role)) {
      return { error: 'Invalid role specified.' };
    }

    const adminClient = createAdminClient();

    // Use admin client to create user in Auth securely
    const { data: newUser, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role,
        department_id: departmentId,
        created_by_admin: 'true',
        admin_creator_id: adminUser.id,
      },
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!newUser.user) {
      return { error: 'Failed to create user account.' };
    }

    // Ensure the profile has the exact role and department specified by Admin
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        role,
        department_id: departmentId,
        full_name: fullName,
        account_status: 'active',
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      return { error: profileError.message };
    }

    // If an instructor was assigned an initial department, record it in instructor_departments
    if (role === 'instructor' && departmentId) {
      await adminClient.from('instructor_departments').insert({
        instructor_id: newUser.user.id,
        department_id: departmentId,
      });
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/instructors');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<UserActionResult> {
  try {
    const { user: currentAdmin } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'You cannot alter your own admin role.' };
    }

    if (!['admin', 'instructor', 'student'].includes(newRole)) {
      return { error: 'Invalid role.' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateUserStatus(userId: string, newStatus: AccountStatus): Promise<UserActionResult> {
  try {
    const { user: currentAdmin } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'You cannot change your own account status.' };
    }

    if (!['active', 'inactive', 'suspended'].includes(newStatus)) {
      return { error: 'Invalid account status.' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteUserAccount(userId: string): Promise<UserActionResult> {
  try {
    const { user: currentAdmin } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'You cannot delete your own admin account.' };
    }

    const adminClient = createAdminClient();

    // Deleting from auth.users cascades to public.profiles
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/instructors');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
