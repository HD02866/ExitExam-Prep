'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

export interface InstructorActionResult {
  success?: boolean;
  error?: string;
}

export async function assignInstructorToDepartment(
  instructorId: string,
  departmentId: string
): Promise<InstructorActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    if (!instructorId || !departmentId) {
      return { error: 'Both instructor and department are required.' };
    }

    const supabase = await createClient();

    // Verify instructor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email, role, account_status')
      .eq('id', instructorId)
      .single();

    if (profileError || !profile) {
      return { error: 'Instructor profile not found.' };
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return { error: 'Selected user is not an authorized faculty member or instructor.' };
    }

    if (profile.account_status !== 'active') {
      return {
        error: `Cannot assign instructor: Account is currently "${profile.account_status}".`,
      };
    }

    // Verify department exists
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('name, code, is_active')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) {
      return { error: 'Academic department not found.' };
    }

    const { error } = await supabase.from('instructor_departments').insert({
      instructor_id: instructorId,
      department_id: departmentId,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: `Instructor is already assigned to ${dept.name} (${dept.code}).` };
      }
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'instructor_assign',
      entityType: 'instructor_assignment',
      entityId: `${instructorId}:${departmentId}`,
      details: {
        instructorName: profile.full_name,
        instructorEmail: profile.email,
        departmentName: dept.name,
        departmentCode: dept.code,
      },
    });

    revalidatePath('/admin/instructors');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function removeInstructorFromDepartment(
  instructorId: string,
  departmentId: string
): Promise<InstructorActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const supabase = await createClient();

    // Fetch details for logging
    const [{ data: instructor }, { data: dept }] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', instructorId).single(),
      supabase.from('departments').select('name, code').eq('id', departmentId).single(),
    ]);

    const { error } = await supabase
      .from('instructor_departments')
      .delete()
      .eq('instructor_id', instructorId)
      .eq('department_id', departmentId);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'instructor_remove',
      entityType: 'instructor_assignment',
      entityId: `${instructorId}:${departmentId}`,
      details: {
        instructorName: instructor?.full_name,
        instructorEmail: instructor?.email,
        departmentName: dept?.name,
        departmentCode: dept?.code,
      },
    });

    revalidatePath('/admin/instructors');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
