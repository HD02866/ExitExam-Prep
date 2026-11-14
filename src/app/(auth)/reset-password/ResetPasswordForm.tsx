'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { requestPasswordReset } from '@/actions/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const wasSent = searchParams.get('sent') === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(wasSent);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await requestPasswordReset(null, formData);

    setIsLoading(false);
    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setIsSubmitted(true);
    }
  }

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your university email address and we will send you a password recovery link
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-4">
          <Alert
            type="success"
            title="Recovery Email Sent"
            message="If an account exists with that email address, you will receive password reset instructions shortly. Please check your inbox and spam folders."
          />
          <Link
            href="/login"
            className="block text-center text-sm font-semibold text-emerald-600 hover:text-emerald-700 pt-2"
          >
            Return to Sign In
          </Link>
        </div>
      ) : (
        <>
          {errorMessage && (
            <Alert type="error" message={errorMessage} className="mb-6" />
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Account Email Address"
              name="email"
              type="email"
              placeholder="user@university.edu"
              required
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Recovery Link
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-600">
            <Link
              href="/login"
              className="font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
