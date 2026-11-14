import React from 'react';
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
            ExitExam Prep
          </span>
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Official University Examination System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        {children}
      </div>
    </div>
  );
}
