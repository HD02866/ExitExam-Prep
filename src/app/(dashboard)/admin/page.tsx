import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import {
  Users,
  Building2,
  BookOpen,
  UserCheck,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch counts in parallel
  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalInstructors },
    { count: totalDepartments },
    { count: activeDepartments },
    { count: totalCourses },
    { count: totalAssignments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('instructor_departments').select('*', { count: 'exact', head: true }),
  ]);

  const stats = [
    {
      title: 'Total Users',
      value: totalUsers ?? 0,
      subtext: `${totalStudents ?? 0} students, ${totalInstructors ?? 0} instructors`,
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      href: '/admin/users',
    },
    {
      title: 'Departments',
      value: totalDepartments ?? 0,
      subtext: `${activeDepartments ?? 0} active departments`,
      icon: Building2,
      color: 'bg-emerald-50 text-emerald-700',
      href: '/admin/departments',
    },
    {
      title: 'Academic Courses',
      value: totalCourses ?? 0,
      subtext: 'Across all departments',
      icon: BookOpen,
      color: 'bg-purple-50 text-purple-700',
      href: '/admin/courses',
    },
    {
      title: 'Instructor Assignments',
      value: totalAssignments ?? 0,
      subtext: 'Department-faculty pairings',
      icon: UserCheck,
      color: 'bg-amber-50 text-amber-700',
      href: '/admin/instructors',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-sm">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Authority Console — Phase 1
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Academic Administration & Governance
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Manage institutional departments, curriculum courses, user authentication statuses, and instructor faculty assignments across ExitExam Prep.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href} className="group">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all h-full flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500">{s.title}</span>
                  <div className={`p-2 rounded-lg ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {s.value}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{s.subtext}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Operations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Academic Operations" subtitle="Manage structure and curriculum">
          <div className="space-y-3">
            <Link
              href="/admin/departments"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all text-sm font-medium text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Manage Departments</p>
                  <p className="text-xs text-slate-500">Create, edit, or deactivate university departments</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/courses"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all text-sm font-medium text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-lg">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Manage Courses</p>
                  <p className="text-xs text-slate-500">Configure courses, course codes, and department ties</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </Card>

        <Card title="Personnel & Staffing" subtitle="User accounts and department faculty">
          <div className="space-y-3">
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all text-sm font-medium text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">User Account Management</p>
                  <p className="text-xs text-slate-500">Provision instructors, suspend accounts, and assign roles</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/instructors"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all text-sm font-medium text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Instructor Assignments</p>
                  <p className="text-xs text-slate-500">Pair faculty instructors to multiple university departments</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3 text-xs text-emerald-900">
        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Security Enforcement Active:</span> Row Level Security (RLS) is enforced at the database layer. Client role claims are never trusted; administrative procedures require server-side cryptographic verification.
        </div>
      </div>
    </div>
  );
}
