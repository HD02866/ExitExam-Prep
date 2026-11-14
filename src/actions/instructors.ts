'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
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
    await requireAdmin();

    if (!instructorId || !departmentId) {
      return { error: 'Both instructor and department are required.' };
    }

    const supabase = await createClient();

    // Verify instructor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', instructorId)
      .single();

    if (profileError || !profile) {
      return { error: 'Instructor profile not found.' };
    }

    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return { error: 'Selected user is not an instructor.' };
    }

    const { error } = await supabase.from('instructor_departments').insert({
      instructor_id: instructorId,
      department_id: departmentId,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: 'Instructor is already assigned to this department.' };
      }
      return { error: error.message };
    }

    revalidatePath('/admin/instructors');
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
    await requireAdmin();

    const supabase = await createClient();

    const { error } = await supabase
      .from('instructor_departments')
      .delete()
      .eq('instructor_id', instructorId)
      .eq('department_id', departmentId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/instructors');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
