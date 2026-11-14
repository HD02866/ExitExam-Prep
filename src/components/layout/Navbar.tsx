'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { logoutUser } from '@/actions/auth';
import type { Profile } from '@/types/database.types';
import { LogOut, User, Menu } from 'lucide-react';

interface NavbarProps {
  profile: Profile;
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ profile, onMenuToggle }) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block">
            ExitExam Prep
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
            Academic Portal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900 leading-tight">{profile.full_name}</p>
            <p className="text-xs text-slate-500">{profile.email}</p>
          </div>
          <Badge role={profile.role} />
        </div>

        <form action={logoutUser}>
          <Button variant="ghost" size="sm" type="submit" className="text-slate-500 hover:text-rose-600">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </form>
      </div>
    </header>
  );
};
