import { createClient } from '@/lib/supabase/server';
import { requireInstructor } from '@/lib/auth-helpers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Department, Course } from '@/types/database.types';
import { Building2, BookOpen, Clock, AlertCircle } from 'lucide-react';

export default async function InstructorDepartmentsPage() {
  const { profile } = await requireInstructor();
  const supabase = await createClient();

  // Fetch instructor assignments
  const { data: assignments } = await supabase
    .from('instructor_departments')
    .select('*, department:departments(*)')
    .eq('instructor_id', profile.id)
    .order('created_at', { ascending: false });

  const assignedDepartments = (assignments || [])
    .map((a: any) => a.department)
    .filter(Boolean) as Department[];

  const deptIds = assignedDepartments.map((d) => d.id);

  // Fetch courses under these departments
  let courses: Course[] = [];
  if (deptIds.length > 0) {
    const { data: deptCourses } = await supabase
      .from('courses')
      .select('*')
      .in('department_id', deptIds)
      .order('code');
    courses = (deptCourses || []) as Course[];
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assigned Academic Departments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review the university departments and authorized course curricula assigned to your faculty profile
        </p>
      </div>

      {assignedDepartments.length > 0 ? (
        <div className="space-y-6">
          {assignedDepartments.map((dept) => {
            const deptCourses = courses.filter((c) => c.department_id === dept.id);
            return (
              <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Department Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {dept.code}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{dept.name}</h3>
                      {dept.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={dept.is_active ? 'success' : 'warning'}>
                      {dept.is_active ? 'Active Department' : 'Inactive Department'}
                    </Badge>
                  </div>
                </div>

                {/* Courses in this Department */}
                <div className="p-5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" /> Department Courses ({deptCourses.length})
                  </h4>

                  {deptCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {deptCourses.map((course) => (
                        <div
                          key={course.id}
                          className="p-3.5 rounded-lg border border-slate-200/80 bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800">
                                {course.code}
                              </span>
                              <Badge variant={course.is_active ? 'success' : 'warning'}>
                                {course.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <h5 className="font-semibold text-slate-900 text-sm">
                              {course.title}
                            </h5>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {course.description || 'No course syllabus description.'}
                            </p>
                          </div>
                          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                            Course ID: {course.id.substring(0, 8)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500">
                      No courses have been registered under this department yet.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No departments assigned"
          description="You currently have no authorized academic departments. Your university administrator must assign you to a department."
          icon={<Building2 className="h-6 w-6" />}
        />
      )}
    </div>
  );
}
