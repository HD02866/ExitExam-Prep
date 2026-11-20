'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Profile } from '@/types/database.types';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  UserCheck,
  GraduationCap,
  UserCircle,
  ClipboardList,
  ClipboardCheck,
  X,
} from 'lucide-react';

interface SidebarProps {
  profile: Profile;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ profile, isOpen, onClose }) => {
  const pathname = usePathname();

  const adminNav = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/exams', label: 'Examinations', icon: ClipboardCheck },
    { href: '/admin/users', label: 'User Accounts', icon: Users },
    { href: '/admin/departments', label: 'Departments', icon: Building2 },
    { href: '/admin/courses', label: 'Courses', icon: BookOpen },
    { href: '/admin/instructors', label: 'Instructor Assignments', icon: UserCheck },
    { href: '/admin/activity', label: 'Activity Logs', icon: ClipboardList },
  ];

  const instructorNav = [
    { href: '/instructor', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/instructor/exams', label: 'Examinations', icon: ClipboardCheck },
    { href: '/instructor/departments', label: 'Assigned Departments', icon: Building2 },
    { href: '/instructor/profile', label: 'My Profile', icon: UserCircle },
  ];

  const studentNav = [
    { href: '/student', label: 'My Dashboard', icon: LayoutDashboard },
    { href: '/student/departments', label: 'Departments & Courses', icon: Building2 },
    { href: '/student/profile', label: 'My Profile', icon: UserCircle },
  ];

  let navItems = studentNav;
  if (profile.role === 'admin') navItems = adminNav;
  else if (profile.role === 'instructor') navItems = instructorNav;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-100 px-6">
          <Link href={`/${profile.role}`} className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base block leading-none">
                ExitExam Prep
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
                University System
              </span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 md:hidden p-1 rounded-md"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === `/${profile.role}`
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Academic Role Indicator */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="rounded-xl border border-slate-200/60 bg-white p-3 shadow-xs">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Signed in as
            </p>
            <p className="text-xs font-semibold text-slate-800 capitalize mt-0.5">
              {profile.role} Portal
            </p>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">{profile.email}</p>
          </div>
        </div>
      </aside>
    </>
  );
};
