import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-helpers';
import { ExamForm } from '@/components/exams/ExamForm';
import type { Department, Course } from '@/types/database.types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function AdminNewExamPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: deptsData }, { data: coursesData }] = await Promise.all([
    supabase.from('departments').select('*').eq('is_active', true).order('name'),
    supabase.from('courses').select('*').eq('is_active', true).order('code'),
  ]);

  const departments = (deptsData || []) as Department[];
  const courses = (coursesData || []) as Course[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/exams"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Examinations
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
          Create New Examination
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Define university examination parameters and prepare question bank authoring
        </p>
      </div>

      <ExamForm
        departments={departments}
        courses={courses}
        isInstructor={false}
        basePath="/admin/exams"
      />
    </div>
  );
}
