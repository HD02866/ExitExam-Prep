'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { updateOwnProfile } from '@/actions/auth';
import type { Profile, Department } from '@/types/database.types';
import { UserCheck, Shield, KeyRound, Calendar, Mail, Building2 } from 'lucide-react';

interface ProfileFormProps {
  profile: Profile;
  departments?: Department[];
  allowDepartmentChange?: boolean;
}

export function ProfileForm({
  profile,
  departments = [],
  allowDepartmentChange = false,
}: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateOwnProfile(null, formData);

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Profile details successfully updated.');
      router.refresh();
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {success && <Alert type="success" message={success} />}
      {error && <Alert type="error" message={error} />}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Profile Card Header */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
              <p className="text-xs text-slate-500">{profile.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge role={profile.role} size="md" />
            <Badge status={profile.account_status} size="md" />
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              name="fullName"
              defaultValue={profile.full_name}
              required
            />

            <Input
              label="University Email (Fixed)"
              name="email"
              defaultValue={profile.email}
              disabled
              helperText="Institutional email addresses cannot be modified"
            />
          </div>

          {allowDepartmentChange && (
            <Select
              label="Primary Academic Department"
              name="departmentId"
              defaultValue={profile.department_id || ''}
              options={deptOptions}
              placeholder="Select your major department"
              helperText="Set or update your declared degree department"
            />
          )}

          {/* Read-Only System Security Metadata */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">System Role:</span>
              <span className="font-semibold text-slate-800 capitalize">{profile.role}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Account Status:</span>
              <span className="font-semibold text-slate-800 capitalize">{profile.account_status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">User Identification (UUID):</span>
              <span className="font-mono text-slate-700 text-[11px]">{profile.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-500">Account Enrolled Date:</span>
              <span>{new Date(profile.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
