'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerStudent } from '@/actions/auth';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { UserPlus, ArrowLeft, ShieldAlert } from 'lucide-react';
import type { Department } from '@/types/database.types';

interface RegisterFormProps {
  departments: Department[];
}

export function RegisterForm({ departments }: RegisterFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deptOptions = departments.map((d) => ({
    value: d.id,
    label: `${d.code} — ${d.name}`,
  }));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await registerStudent(null, formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else if (result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
    }
  }

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Student Registration</h2>
        <p className="text-xs text-slate-500 mt-1">
          Create your university student profile to prepare for exit exams
        </p>
      </div>

      <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-800">
        <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <span>
          <strong>Student notice:</strong> Public registration is strictly for students. Instructor and Admin accounts are provisioned directly by university administrators.
        </span>
      </div>

      {errorMessage && (
        <Alert type="error" message={errorMessage} className="mb-6" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full Legal Name"
          name="fullName"
          type="text"
          placeholder="e.g. Samuel Bekele"
          required
        />

        <Input
          label="University / Institutional Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="student@university.edu"
          required
        />

        <Input
          label="Create Password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          helperText="Use a secure password with letters and numbers"
          required
        />

        <Select
          label="Academic Department"
          name="departmentId"
          options={deptOptions}
          placeholder="Select your major department (optional)"
          helperText="You can also update your department later in your dashboard"
        />

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-4"
          size="lg"
          isLoading={isLoading}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Complete Registration
        </Button>
      </form>

      <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
        <span>Already have an account? </span>
        <Link
          href="/login"
          className="font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
