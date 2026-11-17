'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
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
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

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

    // Log administrative action
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'user_create',
      entityType: 'user',
      entityId: newUser.user.id,
      details: {
        createdUserEmail: email,
        createdUserName: fullName,
        assignedRole: role,
        departmentId,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin/instructors');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateUserAccount(
  userId: string,
  formData: FormData
): Promise<UserActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const fullName = formData.get('fullName')?.toString().trim();
    const departmentId = formData.get('departmentId')?.toString().trim() || null;

    if (!fullName) {
      return { error: 'User full name cannot be empty.' };
    }

    const supabase = await createClient();

    const { data: previousUser, error: fetchError } = await supabase
      .from('profiles')
      .select('full_name, email, department_id, role')
      .eq('id', userId)
      .single();

    if (fetchError || !previousUser) {
      return { error: 'Target user not found.' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        department_id: departmentId,
      })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'user_update',
      entityType: 'user',
      entityId: userId,
      details: {
        targetUserEmail: previousUser.email,
        previousFullName: previousUser.full_name,
        newFullName: fullName,
        previousDepartmentId: previousUser.department_id,
        newDepartmentId: departmentId,
      },
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateUserRole(userId: string, newRole: UserRole): Promise<UserActionResult> {
  try {
    const { user: currentAdmin, profile: adminProfile } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'Operation rejected: You cannot alter your own admin role.' };
    }

    if (!['admin', 'instructor', 'student'].includes(newRole)) {
      return { error: 'Invalid role.' };
    }

    const supabase = await createClient();

    // Fetch target user profile
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return { error: 'User not found.' };
    }

    // Safety guard: Prevent demoting the last active administrator
    if (targetUser.role === 'admin' && newRole !== 'admin') {
      const { count: activeAdminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('account_status', 'active');

      if ((activeAdminCount ?? 0) <= 1) {
        return {
          error: 'Security guard triggered: Cannot demote the last remaining active platform administrator.',
        };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: currentAdmin.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'user_role_change',
      entityType: 'user',
      entityId: userId,
      details: {
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.full_name,
        previousRole: targetUser.role,
        newRole,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateUserStatus(userId: string, newStatus: AccountStatus): Promise<UserActionResult> {
  try {
    const { user: currentAdmin, profile: adminProfile } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'Operation rejected: You cannot change or suspend your own account status.' };
    }

    if (!['active', 'inactive', 'suspended'].includes(newStatus)) {
      return { error: 'Invalid account status.' };
    }

    const supabase = await createClient();

    // Fetch target user profile
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('role, account_status, full_name, email')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return { error: 'User not found.' };
    }

    // Safety guard: Prevent deactivating or suspending the last active administrator
    if (targetUser.role === 'admin' && newStatus !== 'active') {
      const { count: activeAdminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('account_status', 'active');

      if ((activeAdminCount ?? 0) <= 1) {
        return {
          error: 'Security guard triggered: Cannot deactivate or suspend the last active platform administrator.',
        };
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ account_status: newStatus })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: currentAdmin.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'user_status_change',
      entityType: 'user',
      entityId: userId,
      details: {
        targetUserEmail: targetUser.email,
        targetUserName: targetUser.full_name,
        previousStatus: targetUser.account_status,
        newStatus,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteUserAccount(userId: string): Promise<UserActionResult> {
  try {
    const { user: currentAdmin, profile: adminProfile } = await requireAdmin();

    if (userId === currentAdmin.id) {
      return { error: 'Operation rejected: You cannot delete your own admin account.' };
    }

    const supabase = await createClient();

    // Fetch target user profile
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('role, full_name, email')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      return { error: 'User not found.' };
    }

    // Safety guard: Prevent deleting the last administrator
    if (targetUser.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin');

      if ((adminCount ?? 0) <= 1) {
        return {
          error: 'Security guard triggered: Cannot delete the last remaining platform administrator.',
        };
      }
    }

    const adminClient = createAdminClient();

    // Deleting from auth.users cascades to public.profiles and instructor_departments
    const { error } = await adminClient.auth.admin.deleteUser(userId);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: currentAdmin.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'user_delete',
      entityType: 'user',
      entityId: userId,
      details: {
        deletedUserEmail: targetUser.email,
        deletedUserName: targetUser.full_name,
        deletedUserRole: targetUser.role,
      },
    });

    revalidatePath('/admin/users');
    revalidatePath('/admin/instructors');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
