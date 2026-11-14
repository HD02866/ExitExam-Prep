import React from 'react';
import type { UserRole, AccountStatus } from '@/types/database.types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  role?: UserRole;
  status?: AccountStatus;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant, role, status, size = 'sm' }) => {
  let resolvedVariant = variant || 'default';
  let content = children;

  if (role) {
    switch (role) {
      case 'admin':
        resolvedVariant = 'purple';
        content = content || 'Admin';
        break;
      case 'instructor':
        resolvedVariant = 'info';
        content = content || 'Instructor';
        break;
      case 'student':
        resolvedVariant = 'success';
        content = content || 'Student';
        break;
    }
  }

  if (status) {
    switch (status) {
      case 'active':
        resolvedVariant = 'success';
        content = content || 'Active';
        break;
      case 'inactive':
        resolvedVariant = 'warning';
        content = content || 'Inactive';
        break;
      case 'suspended':
        resolvedVariant = 'danger';
        content = content || 'Suspended';
        break;
    }
  }

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[resolvedVariant]} ${sizeStyles[size]}`}
    >
      {content}
    </span>
  );
};
