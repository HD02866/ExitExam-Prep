import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import type { Department } from '@/types/database.types';
import { GraduationCap, BookOpen, Building2, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('departments')
    .select('id, name, code, description, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name');

  const departments = (data || []) as Department[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-lg leading-tight block">
                ExitExam Prep
              </span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                University Examination Platform
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Student Registration
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wide mb-6">
              <ShieldCheck className="h-3.5 w-3.5" />
              Accredited University Exit & Course Examination System
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto">
              Master Your University <span className="text-emerald-600">Exit Examinations</span> With Confidence
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              A comprehensive academic platform organized by department, course, and examination year. Built for students to practice and instructors to curate high-yield assessments.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-xl font-semibold shadow-md shadow-emerald-600/20 transition-all text-base"
              >
                Get Started as a Student
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 px-6 py-3 rounded-xl font-semibold shadow-sm transition-all text-base"
              >
                Access Portal
              </Link>
            </div>
          </div>
        </section>

        {/* System Pillars */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Structured Academic Excellence
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Rigorous role-based management ensuring standardized quality across all university faculties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Centralized Administration</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Platform-wide governance allowing university administrators to manage faculties, academic departments, courses, and authorized personnel securely.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Departmental Instruction</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Assigned professors and instructors maintain dedicated courses, oversee syllabi, and prepare standardized exit exam question banks.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                <GraduationCap className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Student Preparedness</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Undergraduates can access verified course directories and practice exam modules calibrated to their specific degree department.
              </p>
            </div>
          </div>
        </section>

        {/* Academic Departments Overview */}
        <section className="py-12 bg-white border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Participating Academic Departments</h3>
                <p className="text-sm text-slate-500">Currently active faculties offering exit exam preparation</p>
              </div>
              <Link
                href="/register"
                className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-700"
              >
                Join your department <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </div>

            {departments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold uppercase mb-2">
                      {dept.code}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">{dept.name}</h4>
                    {dept.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{dept.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                <Building2 className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm font-medium text-slate-700">Academic structure initialized</p>
                <p className="text-xs text-slate-500">Sign in as Admin to manage departments and courses.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            <span>&copy; {new Date().getFullYear()} ExitExam Prep Platform. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-slate-800">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-slate-800">
              Student Registration
            </Link>
            <Link href="/reset-password" className="hover:text-slate-800">
              Password Assistance
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
