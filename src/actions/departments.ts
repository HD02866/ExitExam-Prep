'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

export interface DepartmentActionResult {
  success?: boolean;
  error?: string;
}

export async function createDepartment(
  prevState: DepartmentActionResult | null,
  formData: FormData
): Promise<DepartmentActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const name = formData.get('name')?.toString().trim();
    const code = formData.get('code')?.toString().trim().toUpperCase();
    const description = formData.get('description')?.toString().trim() || null;

    if (!name || !code) {
      return { error: 'Department name and department code are required.' };
    }

    const supabase = await createClient();

    // Case-insensitive duplicate checks
    const { data: existingCode } = await supabase
      .from('departments')
      .select('id, code')
      .ilike('code', code)
      .maybeSingle();

    if (existingCode) {
      return { error: `Department code "${code}" already exists.` };
    }

    const { data: existingName } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle();

    if (existingName) {
      return { error: `Department with name "${name}" already exists.` };
    }

    const { data: newDept, error } = await supabase
      .from('departments')
      .insert({
        name,
        code,
        description,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: `Department code "${code}" or name already exists.` };
      }
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'department_create',
      entityType: 'department',
      entityId: newDept?.id,
      details: { name, code, description, is_active: true },
    });

    revalidatePath('/admin/departments');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateDepartment(
  id: string,
  prevState: DepartmentActionResult | null,
  formData: FormData
): Promise<DepartmentActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const name = formData.get('name')?.toString().trim();
    const code = formData.get('code')?.toString().trim().toUpperCase();
    const description = formData.get('description')?.toString().trim() || null;
    const isActive = formData.get('isActive') === 'true';

    if (!name || !code) {
      return { error: 'Department name and code are required.' };
    }

    const supabase = await createClient();

    // Check previous state for logging
    const { data: previousDept } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    // Case-insensitive duplicate checks excluding current department
    const { data: existingCode } = await supabase
      .from('departments')
      .select('id, code')
      .ilike('code', code)
      .neq('id', id)
      .maybeSingle();

    if (existingCode) {
      return { error: `Department code "${code}" is already in use by another department.` };
    }

    const { data: existingName } = await supabase
      .from('departments')
      .select('id, name')
      .ilike('name', name)
      .neq('id', id)
      .maybeSingle();

    if (existingName) {
      return { error: `Department name "${name}" is already in use by another department.` };
    }

    const { error } = await supabase
      .from('departments')
      .update({
        name,
        code,
        description,
        is_active: isActive,
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { error: `Department code "${code}" or name is already in use.` };
      }
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'department_update',
      entityType: 'department',
      entityId: id,
      details: {
        previous: previousDept
          ? { name: previousDept.name, code: previousDept.code, is_active: previousDept.is_active }
          : null,
        updated: { name, code, description, is_active: isActive },
      },
    });

    revalidatePath('/admin/departments');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function toggleDepartmentStatus(
  id: string,
  currentStatus: boolean
): Promise<DepartmentActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();
    const supabase = await createClient();

    const newStatus = !currentStatus;

    const { data: dept } = await supabase
      .from('departments')
      .select('name, code')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('departments')
      .update({ is_active: newStatus })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: newStatus ? 'department_activate' : 'department_deactivate',
      entityType: 'department',
      entityId: id,
      details: {
        departmentName: dept?.name,
        departmentCode: dept?.code,
        previousStatus: currentStatus,
        newStatus,
      },
    });

    revalidatePath('/admin/departments');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteDepartment(id: string): Promise<DepartmentActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();
    const supabase = await createClient();

    // Fetch department details first
    const { data: dept, error: fetchError } = await supabase
      .from('departments')
      .select('name, code')
      .eq('id', id)
      .single();

    if (fetchError || !dept) {
      return { error: 'Department not found.' };
    }

    // 1. Dependency check: Courses
    const { count: courseCount } = await supabase
      .from('courses')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id);

    if (courseCount && courseCount > 0) {
      return {
        error: `Cannot delete department: ${courseCount} course(s) are associated with "${dept.name}". Please delete or reassign the courses first, or deactivate the department instead.`,
      };
    }

    // 2. Dependency check: Instructor assignments
    const { count: instructorCount } = await supabase
      .from('instructor_departments')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id);

    if (instructorCount && instructorCount > 0) {
      return {
        error: `Cannot delete department: ${instructorCount} instructor(s) are assigned to "${dept.name}". Please remove their department assignments first.`,
      };
    }

    // 3. Dependency check: Enrolled students
    const { count: studentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id);

    if (studentCount && studentCount > 0) {
      return {
        error: `Cannot delete department: ${studentCount} student(s) belong to "${dept.name}". Please reassign them to another department first.`,
      };
    }

    // 4. Dependency check: Examinations
    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', id);

    if (examCount && examCount > 0) {
      return {
        error: `Cannot delete department: ${examCount} examination(s) exist for "${dept.name}". Please delete or reassign the examinations first.`,
      };
    }

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'department_delete',
      entityType: 'department',
      entityId: id,
      details: {
        deletedDepartmentName: dept.name,
        deletedDepartmentCode: dept.code,
      },
    });

    revalidatePath('/admin/departments');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
