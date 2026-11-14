import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import type { Department, Course } from '@/types/database.types';
import {
  GraduationCap,
  Building2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export default async function StudentDashboardPage() {
  const { profile } = await requireAuth();
  const supabase = await createClient();

  // Fetch student's assigned department if present
  let studentDepartment: Department | null = null;
  if (profile.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('*')
      .eq('id', profile.department_id)
      .single();
    studentDepartment = dept as Department | null;
  }

  // Fetch courses belonging to the student's department or active courses
  let departmentCourses: Course[] = [];
  if (profile.department_id) {
    const { data: courses } = await supabase
      .from('courses')
      .select('*')
      .eq('department_id', profile.department_id)
      .eq('is_active', true)
      .order('code');
    departmentCourses = (courses || []) as Course[];
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            Undergraduate Student Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome back, {profile.full_name}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Prepare for your upcoming university exit examinations and course-level assessments. Explore academic departments and master curriculum concepts.
          </p>
        </div>
      </div>

      {/* Department Status Banner */}
      {!studentDepartment ? (
        <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">Academic Department Not Selected</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Please select your primary university department to filter curriculum courses and tailored exit exam modules.
              </p>
            </div>
          </div>
          <Link href="/student/departments">
            <Button size="sm" variant="primary">
              Select Department &rarr;
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-base border border-emerald-200 shrink-0">
              {studentDepartment.code}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Your Primary Department
                </span>
                <Badge variant={studentDepartment.is_active ? 'success' : 'warning'}>
                  {studentDepartment.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {studentDepartment.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/student/departments">
              <Button size="sm" variant="outline">
                Change Department
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Courses in Department */}
      <Card
        title={studentDepartment ? `Curriculum Courses (${studentDepartment.code})` : 'Curriculum Courses'}
        subtitle={
          studentDepartment
            ? `Active courses tested in ${studentDepartment.name}`
            : 'Select your department to view curriculum courses'
        }
        action={
          <Link
            href="/student/departments"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            Explore all departments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {departmentCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departmentCourses.map((course) => (
              <div
                key={course.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {course.code}
                    </span>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-sm">{course.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {course.description || 'Exit exam syllabus coverage.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Standardized
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">Exit Tested</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              {studentDepartment ? 'No courses active in your department yet' : 'No department selected'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Browse all participating departments to explore course structures across the university.
            </p>
            <div className="mt-4">
              <Link href="/student/departments">
                <Button size="sm" variant="outline">
                  Browse University Departments
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>

      {/* Examination Phase 1 Guidance */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-600 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-slate-800">Phase 1 Academic Structure Verification:</p>
          <p className="mt-0.5">
            Your student profile is linked securely to university records. As courses and departmental faculty are calibrated, standardized mock exams, question banks, and timed exit exam simulations will become available in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
