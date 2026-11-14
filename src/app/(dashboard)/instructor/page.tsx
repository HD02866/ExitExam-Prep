import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import type { Department, Course } from '@/types/database.types';
import {
  Building2,
  BookOpen,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

export default async function InstructorDashboardPage() {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  // Fetch departments assigned to this instructor
  const { data: assignments } = await supabase
    .from('instructor_departments')
    .select('*, department:departments(*)')
    .eq('instructor_id', profile.id);

  const assignedDepartments = (assignments || [])
    .map((a: any) => a.department)
    .filter(Boolean) as Department[];

  const deptIds = assignedDepartments.map((d) => d.id);

  // Fetch courses in these assigned departments
  let courses: Course[] = [];
  if (deptIds.length > 0) {
    const { data: deptCourses } = await supabase
      .from('courses')
      .select('*, department:departments(name, code)')
      .in('department_id', deptIds);
    courses = (deptCourses || []) as Course[];
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            Instructor Academic Faculty Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Oversee your authorized university departments, review curriculum courses, and prepare for upcoming exit exam question bank management.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Authorized Departments</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {assignedDepartments.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Academic faculties you are assigned to instruct
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500">Available Department Courses</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {courses.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Courses currently active under your departments
          </p>
        </div>
      </div>

      {/* Assigned Departments Preview */}
      <Card
        title="Your Assigned Departments"
        subtitle="Departments you have been assigned to by university administration"
        action={
          <Link
            href="/instructor/departments"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            View all courses <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {assignedDepartments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {assignedDepartments.map((dept) => {
              const deptCoursesCount = courses.filter((c) => c.department_id === dept.id).length;
              return (
                <div
                  key={dept.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {dept.code}
                      </span>
                      <Badge variant={dept.is_active ? 'success' : 'warning'}>
                        {dept.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">{dept.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {dept.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                    <span>{deptCoursesCount} Courses in curriculum</span>
                    <Link
                      href="/instructor/departments"
                      className="font-medium text-emerald-600 hover:underline"
                    >
                      Browse &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-800">No departments assigned yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Please contact your university administrator to be assigned to your academic department(s).
            </p>
          </div>
        )}
      </Card>

      {/* Phase 1 Academic Architecture Notice */}
      <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold">Academic Foundation Phase (Phase 1):</p>
          <p className="mt-0.5">
            You are viewing your authorized departmental scope. In accordance with university engineering milestones, examination authoring, question banks, and answer key curation will be introduced in subsequent phases once the academic structure is validated.
          </p>
        </div>
      </div>
    </div>
  );
}
