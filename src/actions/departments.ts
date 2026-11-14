'use server';

import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';

export interface DepartmentActionResult {
  success?: boolean;
  error?: string;
}

export async function createDepartment(prevState: DepartmentActionResult | null, formData: FormData): Promise<DepartmentActionResult> {
  try {
    await requireAdmin();

    const name = formData.get('name')?.toString().trim();
    const code = formData.get('code')?.toString().trim().toUpperCase();
    const description = formData.get('description')?.toString().trim() || null;

    if (!name || !code) {
      return { error: 'Department name and department code are required.' };
    }

    const supabase = await createClient();

    const { error } = await supabase.from('departments').insert({
      name,
      code,
      description,
      is_active: true,
    });

    if (error) {
      if (error.code === '23505') {
        return { error: `Department code "${code}" already exists.` };
      }
      return { error: error.message };
    }

    revalidatePath('/admin/departments');
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
    await requireAdmin();

    const name = formData.get('name')?.toString().trim();
    const code = formData.get('code')?.toString().trim().toUpperCase();
    const description = formData.get('description')?.toString().trim() || null;
    const isActive = formData.get('isActive') === 'true';

    if (!name || !code) {
      return { error: 'Department name and code are required.' };
    }

    const supabase = await createClient();

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
        return { error: `Department code "${code}" is already in use.` };
      }
      return { error: error.message };
    }

    revalidatePath('/admin/departments');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function toggleDepartmentStatus(id: string, currentStatus: boolean): Promise<DepartmentActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('departments')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/departments');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}

export async function deleteDepartment(id: string): Promise<DepartmentActionResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/admin/departments');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An error occurred' };
  }
}
