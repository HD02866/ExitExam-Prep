import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';
import type { AdminActivityLog } from '@/types/database.types';
import {
  Users,
  Building2,
  BookOpen,
  UserCheck,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  ClipboardList,
  Clock,
  History,
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch metrics in parallel
  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalInstructors },
    { count: totalDepartments },
    { count: activeDepartments },
    { count: totalCourses },
    { count: totalAssignments },
    { count: totalActivityLogs },
    { data: recentLogsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
    supabase.from('departments').select('*', { count: 'exact', head: true }),
    supabase.from('departments').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('courses').select('*', { count: 'exact', head: true }),
    supabase.from('instructor_departments').select('*', { count: 'exact', head: true }),
    supabase.from('admin_activity_logs').select('*', { count: 'exact', head: true }),
    supabase.from('admin_activity_logs').select('*').order('created_at', { ascending: false }).limit(5),
  ]);

  const recentLogs = (recentLogsData || []) as AdminActivityLog[];

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
      title: 'Instructor Pairings',
      value: totalAssignments ?? 0,
      subtext: 'Department-faculty assignments',
      icon: UserCheck,
      color: 'bg-amber-50 text-amber-700',
      href: '/admin/instructors',
    },
  ];

  const getActionBadge = (actionType: string) => {
    if (actionType.includes('delete') || actionType.includes('remove') || actionType.includes('suspend')) {
      return <Badge variant="danger">{actionType.replace('_', ' ')}</Badge>;
    }
    if (actionType.includes('create') || actionType.includes('assign') || actionType.includes('activate')) {
      return <Badge variant="success">{actionType.replace('_', ' ')}</Badge>;
    }
    if (actionType.includes('deactivate')) {
      return <Badge variant="warning">{actionType.replace('_', ' ')}</Badge>;
    }
    return <Badge variant="info">{actionType.replace('_', ' ')}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 rounded-2xl p-6 sm:p-8 text-white shadow-sm border border-slate-700/50">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-500/30">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin Governance & Verification Console — Phase 2
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Academic Administration & Institutional Control
          </h1>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Manage faculties, academic curricula, staff authorizations, and examine cryptographic audit logs. All administrative operations are monitored and recorded.
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
        <Card title="Curricular Operations" subtitle="Establish academic structure and degree requirements">
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
                  <p className="text-xs text-slate-500">Create, edit, or deactivate university faculties</p>
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
                  <p className="text-xs text-slate-500">Assign curriculum courses and exit modules</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </Card>

        <Card title="Staffing & Governance" subtitle="User accounts, instructor assignments, and audit trails">
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
                  <p className="font-semibold text-slate-900">Instructor Department Assignments</p>
                  <p className="text-xs text-slate-500">Pair faculty instructors to multiple university departments</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/activity"
              className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200 transition-all text-sm font-medium text-slate-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">Administrative Activity Logs</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                      {totalActivityLogs ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Review complete audit trail of administrative modifications</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Activity Log Stream */}
      <Card
        title="Recent Administrative Operations"
        subtitle="Live audit trail of the latest actions executed by administrators"
        action={
          <Link
            href="/admin/activity"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            View all activity logs ({totalActivityLogs ?? 0}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {recentLogs.length > 0 ? (
          <div className="divide-y divide-slate-100 text-xs">
            {recentLogs.map((log) => {
              const detailsObj = (log.details as Record<string, unknown>) || {};
              return (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                      <History className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{log.admin_name}</span>
                        {getActionBadge(log.action_type)}
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        {detailsObj.targetUserEmail ? (
                          <span>Target user: {String(detailsObj.targetUserEmail)}</span>
                        ) : detailsObj.name ? (
                          <span>Department: {String(detailsObj.name)} ({String(detailsObj.code || '')})</span>
                        ) : detailsObj.title ? (
                          <span>Course: {String(detailsObj.code)} — {String(detailsObj.title)}</span>
                        ) : detailsObj.instructorName ? (
                          <span>Instructor: {String(detailsObj.instructorName)}</span>
                        ) : (
                          <span>Entity: {log.entity_type}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-[11px] shrink-0">
                    <Clock className="h-3 w-3" />
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 text-xs">
            No administrative actions recorded yet. All future operations will appear in this audit log.
          </div>
        )}
      </Card>

      {/* Security notice */}
      <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-3 text-xs text-emerald-900 shadow-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold">Security & Verification Active:</span> RLS policies and server-side cryptographic checks strictly enforce role boundaries. Admin deletion or suspension of self is prevented. Departments with active courses or instructors are protected against accidental deletion.
        </div>
      </div>
    </div>
  );
}
