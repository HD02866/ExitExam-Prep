'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginUser } from '@/actions/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LogIn, ArrowRight } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const initialMessage = searchParams.get('message');
  const initialError = searchParams.get('error');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(null, formData);

    if (result.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else if (result.redirectTo) {
      const destination = redirectPath || result.redirectTo;
      router.push(destination);
      router.refresh();
    }
  }

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Sign in to your account</h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your exams, courses, and department resources
        </p>
      </div>

      {initialMessage && !errorMessage && (
        <Alert type="success" message={initialMessage} className="mb-6" />
      )}

      {errorMessage && (
        <Alert type="error" message={errorMessage} className="mb-6" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="your.email@university.edu"
          required
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />

        <div className="flex items-center justify-between text-xs pt-1">
          <Link
            href="/reset-password"
            className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          size="lg"
          isLoading={isLoading}
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </form>

      <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
        <span>Are you a university student without an account? </span>
        <Link
          href="/register"
          className="font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
        >
          Register here <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
