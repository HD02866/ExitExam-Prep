'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export interface CourseActionResult {
  success?: boolean;
  error?: string;
}

export async function createCourse(prevState: CourseActionResult | null, formData: FormData): Promise<CourseActionResult> {
  try {
    await requireAdmin();

    const code = formData.get('code')?.toString().trim().toUpperCase();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim();

    if (!code || !title || !departmentId) {
      return { error: 'Course code, title, and department are required.' };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('courses').insert({
      code,
      title,
      description,
      department_id: departmentId,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: `Course code "${code}" already exists in this department.` };
      }
      return { error: error.message };
    }

    revalidatePath('/admin/courses');
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
    await requireAdmin();

    const code = formData.get('code')?.toString().trim().toUpperCase();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || null;
    const departmentId = formData.get('departmentId')?.toString().trim();
    const isActive = formData.get('isActive') === 'true';

    if (!code || !title || !departmentId) {
      return { error: 'Course code, title, and department are required.' };
    }

    const supabase = await createClient();

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

    revalidatePath('/admin/courses');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function toggleCourseStatus(id: string, currentStatus: boolean): Promise<CourseActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('courses')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/courses');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteCourse(id: string): Promise<CourseActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/courses');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
