'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { logAdminActivity } from '@/lib/activity-logger';
import { revalidatePath } from 'next/cache';

export interface CourseActionResult {
  success?: boolean;
  error?: string;
}

export async function createCourse(
  prevState: CourseActionResult | null,
  formData: FormData
): Promise<CourseActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const code = formData.get('code')?.toString().trim().toUpperCase();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim();

    if (!code || !title || !departmentId) {
      return { error: 'Course code, title, and department are required.' };
    }

    const supabase = await createClient();

    // Verify department exists
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) {
      return { error: 'Selected academic department does not exist.' };
    }

    // Check duplicate code within department (case-insensitive)
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id, code')
      .eq('department_id', departmentId)
      .ilike('code', code)
      .maybeSingle();

    if (existingCourse) {
      return {
        error: `Course code "${code}" already exists in ${dept.name} (${dept.code}).`,
      };
    }

    const { data: newCourse, error } = await supabase
      .from('courses')
      .insert({
        code,
        title,
        description,
        department_id: departmentId,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: `Course code "${code}" already exists in this department.` };
      }
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'course_create',
      entityType: 'course',
      entityId: newCourse?.id,
      details: {
        code,
        title,
        departmentId,
        departmentCode: dept.code,
        departmentName: dept.name,
      },
    });

    revalidatePath('/admin/courses');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function updateCourse(
  id: string,
  prevState: CourseActionResult | null,
  formData: FormData
): Promise<CourseActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();

    const code = formData.get('code')?.toString().trim().toUpperCase();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim();
    const isActive = formData.get('isActive') === 'true';

    if (!code || !title || !departmentId) {
      return { error: 'Course code, title, and department are required.' };
    }

    const supabase = await createClient();

    // Verify department exists
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, name, code')
      .eq('id', departmentId)
      .single();

    if (deptError || !dept) {
      return { error: 'Selected academic department does not exist.' };
    }

    // Check duplicate code within department excluding current course
    const { data: existingCourse } = await supabase
      .from('courses')
      .select('id, code')
      .eq('department_id', departmentId)
      .ilike('code', code)
      .neq('id', id)
      .maybeSingle();

    if (existingCourse) {
      return {
        error: `Course code "${code}" is already in use in ${dept.name}.`,
      };
    }

    const { data: previousCourse } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('courses')
      .update({
        code,
        title,
        description,
        department_id: departmentId,
        is_active: isActive,
      })
      .eq('id', id);

    if (error) {
      if (error.code === '23505') {
        return { error: `Course code "${code}" already exists in this department.` };
      }
      return { error: error.message };
    }

    // Log admin activity
    await logAdminActivity({
      adminId: adminUser.id,
      adminEmail: adminProfile.email,
      adminName: adminProfile.full_name,
      actionType: 'course_update',
      entityType: 'course',
      entityId: id,
      details: {
        previous: previousCourse
          ? { code: previousCourse.code, title: previousCourse.title, departmentId: previousCourse.department_id, is_active: previousCourse.is_active }
          : null,
        updated: { code, title, departmentId, departmentCode: dept.code, is_active: isActive },
      },
    });

    revalidatePath('/admin/courses');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function toggleCourseStatus(
  id: string,
  currentStatus: boolean
): Promise<CourseActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();
    const supabase = await createClient();

    const newStatus = !currentStatus;

    const { data: course } = await supabase
      .from('courses')
      .select('code, title, department:departments(code)')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('courses')
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
      actionType: newStatus ? 'course_activate' : 'course_deactivate',
      entityType: 'course',
      entityId: id,
      details: {
        courseCode: course?.code,
        courseTitle: course?.title,
        previousStatus: currentStatus,
        newStatus,
      },
    });

    revalidatePath('/admin/courses');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteCourse(id: string): Promise<CourseActionResult> {
  try {
    const { user: adminUser, profile: adminProfile } = await requireAdmin();
    const supabase = await createClient();

    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('code, title, department_id, department:departments(name)')
      .eq('id', id)
      .single();

    if (fetchError || !course) {
      return { error: 'Course not found.' };
    }

    // Dependency check: Examinations referencing this course
    const { count: examCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', id);

    if (examCount && examCount > 0) {
      return {
        error: `Cannot delete course: ${examCount} examination(s) reference this course. Please delete or reassign the examinations first.`,
      };
    }

    const { error } = await supabase
      .from('courses')
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
      actionType: 'course_delete',
      entityType: 'course',
      entityId: id,
      details: {
        courseCode: course.code,
        courseTitle: course.title,
        departmentId: course.department_id,
      },
    });

    revalidatePath('/admin/courses');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
